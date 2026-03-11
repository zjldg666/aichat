// AiChat/composables/useEconomy.js
// 专门处理商店购买、容器收纳、物品使用的逻辑
import {
	ref,
	computed
} from 'vue';

export function useEconomy(context) {
	const {
		currentRole,
		charStore,
		messageList,
		saveHistory,
		sendMessage
	} = context;

	const showShopPanel = ref(false);
	const showContainerPanel = ref(false);
	const activeContainerName = ref('');

	const showUseModal = ref(false);
	const pendingUseItem = ref(null);
	const useItemAction = ref('');

	// ✨ 1. 新增：将钱包余额改为动态计算属性
	const wallet = computed(() => {
		const eco = currentRole.value?.economy || {};
		// 如果开启了共享钱包，显示两人总和
		if (eco.isSharedWallet) {
			return (Number(eco.userWallet) || 0) + (Number(eco.charWallet) || 0);
		}
		// 不共享则只显示玩家自己的钱（兼容旧版存档的 wallet 字段）
		return eco.userWallet !== undefined ? Number(eco.userWallet) : (Number(eco.wallet) || 0);
	});

	// 1. 监听顶部横幅，打开容器面板
	const handleOpenContainer = (cName) => {
		activeContainerName.value = cName;
		showContainerPanel.value = true;
	};

	// 2. 转移物品 (从快递箱到具体家具 / 布置新家具)
	const handleTransferItem = ({
		item,
		targetContainer,
		roomName
	}) => {
		const char = currentRole.value;
		const boxIndex = char.economy.courierBox.findIndex(i => i.id === item.id);
		if (boxIndex > -1) char.economy.courierBox.splice(boxIndex, 1);

		// ✨ 新增：如果是布置新家具，则创建一个新容器
		if (targetContainer === 'NEW_FURNITURE') {
			if (!char.economy.containers[roomName][item.name]) {
				// 以家具的名字，在对应房间下创建一个空数组（新容器）
				char.economy.containers[roomName][item.name] = [];
			}
			uni.showToast({
				title: `已将【${item.name}】布置在 ${roomName}`,
				icon: 'none'
			});
		} else {
			// 常规：放入现有的容器
			if (!char.economy.containers[roomName][targetContainer]) {
				char.economy.containers[roomName][targetContainer] = [];
			}
			char.economy.containers[roomName][targetContainer].push(item);
			uni.showToast({
				title: '已收纳至 ' + targetContainer,
				icon: 'none'
			});
		}

		charStore.saveCharacterData({
			economy: char.economy
		});
	};

	// 3. 准备使用物品 (弹出输入框)
	const handleUseItem = (item, containerName) => {
		let roomName = '';
		for (const r in currentRole.value.economy.containers) {
			if (currentRole.value.economy.containers[r][containerName]) {
				roomName = r;
				break;
			}
		}
		pendingUseItem.value = {
			item,
			containerName,
			roomName
		};
		useItemAction.value = '';
		showContainerPanel.value = false;
		showUseModal.value = true;
	};

	// 4. 确认执行动作 (通知大模型)
	// 4. 确认执行动作 (通知大模型)
	const confirmUseItem = async () => {
		if (!useItemAction.value.trim()) return uni.showToast({
			title: '请描述你的动作',
			icon: 'none'
		});
		const {
			item,
			containerName,
			roomName
		} = pendingUseItem.value;
		const char = currentRole.value;

		// 发送消息和大模型历史逻辑不变
		const sysMsg = {
			id: Date.now() + Math.random(),
			role: 'system',
			content: `✨ (你使用了 [${containerName}] 里的【${item.name}】：${useItemAction.value})`,
			isSystem: true
		};
		messageList.value.push(sysMsg);
		await saveHistory(sysMsg);

		const prompt =
			`[System Action: 玩家从${containerName}拿出了【${item.name}】(${item.desc})，并执行了互动："${useItemAction.value}"。请根据当前环境和你们的关系，做出非常自然、沉浸的反应。]`;
		sendMessage(false, prompt);

		// ✨ 修改：物品消耗与耐久度扣除逻辑
		const containerArr = char.economy.containers[roomName][containerName];
		const targetIndex = containerArr.findIndex(i => i.id === item.id);

		if (targetIndex > -1) {
			let targetItem = containerArr[targetIndex];

			// 兼容老数据，如果没有 usesLeft，就赋予它的默认值或 1
			if (targetItem.usesLeft === undefined) {
				targetItem.usesLeft = targetItem.maxUses || 1;
			}

			// 扣除一次耐久度
			targetItem.usesLeft -= 1;

			if (targetItem.usesLeft <= 0) {
				// 如果用完了，从容器中彻底删除
				containerArr.splice(targetIndex, 1);
				uni.showToast({
					title: `【${item.name}】已用完`,
					icon: 'none'
				});
			} else {
				uni.showToast({
					title: `【${item.name}】还剩 ${targetItem.usesLeft} 次`,
					icon: 'none'
				});
			}
			charStore.saveCharacterData({
				economy: char.economy
			});
		}
		showUseModal.value = false;
	};

	// 5. 商店购买逻辑
	const handleBuyItem = (item) => {
		const char = currentRole.value;
		if (!char || !char.economy) return uni.showToast({
			title: '财产系统异常',
			icon: 'none'
		});

		// ✨ 2. 修改：判断计算后的总金额是否足够
		if (wallet.value < item.price) return uni.showToast({
			title: '余额不足',
			icon: 'none'
		});

		const eco = char.economy;
		const price = item.price;

		// ✨ 3. 修改：执行混合扣款逻辑
		if (eco.isSharedWallet) {
			let remainCost = price;
			// 优先扣玩家的钱
			if (eco.userWallet >= remainCost) {
				eco.userWallet -= remainCost;
			} else {
				remainCost -= eco.userWallet;
				eco.userWallet = 0;
				eco.charWallet -= remainCost; // 不够的扣角色的钱
			}
		} else {
			// 不共享，只扣玩家自己的钱
			if (eco.userWallet !== undefined) {
				eco.userWallet -= price;
			} else {
				eco.wallet -= price; // 兼容旧版
			}
		}

		// 同步旧版 wallet 字段，防止页面上其他没改到的地方显示错误
		eco.wallet = eco.isSharedWallet ?
			(eco.userWallet + eco.charWallet) :
			(eco.userWallet !== undefined ? eco.userWallet : eco.wallet);

		if (!eco.courierBox) eco.courierBox = [];
		// ✨ 修改：放入快递箱时，注入 maxUses 和 usesLeft
		eco.courierBox.push({
			id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
			name: item.name,
			icon: item.icon,
			type: item.type,
			desc: item.desc,
			maxUses: item.maxUses || 1, // 最大耐久
			usesLeft: item.maxUses || 1 // 当前剩余次数
		});

		charStore.saveCharacterData({
			economy: eco
		});
		uni.showToast({
			title: `成功购买【${item.name}】\n包裹已送达客厅快递箱！`,
			icon: 'none',
			duration: 2500
		});
	};

	return {
		showShopPanel,
		showContainerPanel,
		activeContainerName,
		showUseModal,
		pendingUseItem,
		useItemAction,
		handleOpenContainer,
		handleTransferItem,
		handleUseItem,
		confirmUseItem,
		handleBuyItem,
		wallet // ✨ 4. 新增：将动态计算的 wallet 导出
	};
}