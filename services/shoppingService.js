// AiChat/services/shoppingService.js
import {
	DEFAULT_SHOP_CATALOG
} from '@/utils/shop-data.js';

export const ShoppingService = {
	/**
	 * 1. 处理购买指令：完成扣款、发快递、清洗文本
	 * @returns { cleanContent, wantsToShop, sysMsgs }
	 */
	processBuyCommands(mainContent, currentRole, charStore) {
		let wantsToShop = false;
		let cleanContent = mainContent;
		let sysMsgs = [];

		if (/\[OPEN_SHOP\]/i.test(cleanContent)) {
			wantsToShop = true;
			cleanContent = cleanContent.replace(/\[BUY:\s*(.+?)\s*,\s*(\d+)\s*,\s*(ai|player)\s*\]/gi, '').trim();
		}

		const buyRegex = /\[BUY:\s*(.+?)\s*,\s*([^,\]]+)\s*,\s*(ai|player)\s*\]/gi;
		let match;
		const char = currentRole.value;

		while ((match = buyRegex.exec(cleanContent)) !== null) {
			const itemName = match[1].trim();
			const itemPrice = parseInt(match[2].replace(/[^\d]/g, ''), 10);
			const payer = match[3].trim();

			if (char && char.economy) {
				let eco = char.economy;
				let buySuccess = false;
				let sysMsg = '';

				if (eco.isSharedWallet) {
					// 共享钱包扣款逻辑
					let totalMoney = (Number(eco.userWallet) || 0) + (Number(eco.charWallet) || 0);
					if (totalMoney >= itemPrice) {
						let remainCost = itemPrice;
						if (eco.userWallet >= remainCost) {
							eco.userWallet -= remainCost;
						} else {
							remainCost -= eco.userWallet;
							eco.userWallet = 0;
							eco.charWallet -= remainCost;
						}
						buySuccess = true;
						sysMsg = payer === 'player' ? `💰 (你用共同财产为她支付了 ¥${itemPrice} 购买【${itemName}】)` :
							`💰 (她用共同财产支付了 ¥${itemPrice} 购买【${itemName}】)`;
					} else {
						sysMsg = `❌ (想买【${itemName}】，但你们的共同财产不够了...)`;
					}
				} else {
					// 各付各的扣款逻辑
					if (payer === 'player') {
						if (eco.userWallet >= itemPrice) {
							eco.userWallet -= itemPrice;
							buySuccess = true;
							sysMsg = `💰 (你自掏腰包支付了 ¥${itemPrice} 为她购买【${itemName}】)`;
						} else {
							sysMsg = `❌ (她想让你买【${itemName}】，但你钱包里的钱不够了...)`;
						}
					} else if (payer === 'ai') {
						if (eco.charWallet >= itemPrice) {
							eco.charWallet -= itemPrice;
							buySuccess = true;
							sysMsg = `💰 (她自己花 ¥${itemPrice} 购买了【${itemName}】)`;
						} else {
							sysMsg = `❌ (她想自己买【${itemName}】，但她的小金库没钱了...)`;
						}
					}
				}

				if (buySuccess) {
					// 查阅超市目录获取图标和耐久度
					let maxUses = 1,
						icon = '🛍️',
						type = 'custom',
						desc = '网购送达的物品';
					try {
						const storedCatalog = uni.getStorageSync('shop_catalog') || [];
						for (const cat of storedCatalog) {
							const found = cat.items.find(i => i.name === itemName);
							if (found) {
								maxUses = found.maxUses || 1;
								icon = found.icon || '🛍️';
								type = found.type || 'custom';
								desc = found.desc || '';
								break;
							}
						}
					} catch (e) {}

					if (!eco.courierBox) eco.courierBox = [];
					eco.courierBox.push({
						id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
						name: itemName,
						icon: icon,
						type: type,
						desc: desc,
						price: itemPrice,
						maxUses: maxUses,
						usesLeft: maxUses
					});
					eco.wallet = eco.isSharedWallet ? (eco.userWallet + eco.charWallet) : eco.userWallet;
					charStore.saveCharacterData({
						economy: eco
					});
				}
				if (sysMsg) sysMsgs.push(sysMsg);
			}
		}

		// 终极清洗
		cleanContent = cleanContent.replace(/\[BUY:\s*(.+?)\s*,\s*([^,\]]+)\s*,\s*(ai|player)\s*\]/gi, '').replace(
			/\[OPEN_SHOP\]/gi, '').trim();

		return {
			cleanContent,
			wantsToShop,
			sysMsgs
		};
	},

	/**
	 * 2. 生成超市与库存的系统提示词
	 */
	generateShopContext(currentRole) {
		let homeInventoryStr = "【家里目前的物品状态】\n";
		const charData = currentRole.value;
		if (charData && charData.economy && charData.economy.containers) {
			let hasItem = false;
			for (const room in charData.economy.containers) {
				for (const container in charData.economy.containers[room]) {
					const items = charData.economy.containers[room][container];
					if (items && items.length > 0) {
						hasItem = true;
						const countMap = {};
						items.forEach(i => countMap[i.name] = (countMap[i.name] || 0) + 1);
						const itemStrs = Object.entries(countMap).map(([name, count]) => `${name}x${count}`).join(
							'、');
						homeInventoryStr += `- ${room}的${container}：包含 ${itemStrs}。\n`;
					}
				}
			}
			if (!hasItem) homeInventoryStr += "家里现在空空如也，什么都没有。\n";
		} else {
			homeInventoryStr += "家里现在空空如也，什么都没有。\n";
		}

		let shopCatalogText = "";
		try {
			let storedCatalog = uni.getStorageSync('shop_catalog');
			if (!storedCatalog || storedCatalog.length === 0) {
				storedCatalog = DEFAULT_SHOP_CATALOG;
			}
			let catalogList = [];
			storedCatalog.forEach(cat => {
				cat.items.forEach(item => {
					catalogList.push(`- ${item.name} (¥${item.price})`);
				});
			});
			shopCatalogText = catalogList.join('\n');
		} catch (e) {
			shopCatalogText = "暂无商品数据";
		}

		return `[System Hidden Context: 你拿出了手机打开超市APP。
${homeInventoryStr}

【当前超市在售商品及价格】
${shopCatalogText}

【行动指令】
1. 请对比家里的库存，看看缺什么，然后挑选你想买的商品。
2. 决定买什么后，你**必须**在回复的最末尾单独起一行输出 [BUY:商品名,价格,ai或player]，否则购买不会生效！
3. ⚠️绝对警告：[BUY] 指令里的价格必须与上述清单中的标价【一模一样】，严禁根据你的常识自行修改价格！
4. 如果你们还在纠结谁付钱，你可以直接默认自己付(ai)或让玩家付(player)。]`;
	}
};