// AiChat/composables/useEconomy.js
// 专门处理商店购买、容器收纳、物品使用的逻辑
import { ref } from 'vue';

export function useEconomy(context) {
    const { currentRole, charStore, messageList, saveHistory, sendMessage } = context;

    const showShopPanel = ref(false);
    const showContainerPanel = ref(false);
    const activeContainerName = ref('');
    
    const showUseModal = ref(false);
    const pendingUseItem = ref(null);
    const useItemAction = ref('');

    // 1. 监听顶部横幅，打开容器面板
    const handleOpenContainer = (cName) => {
        activeContainerName.value = cName;
        showContainerPanel.value = true;
    };

    // 2. 转移物品 (从快递箱到具体家具)
    const handleTransferItem = ({ item, targetContainer, roomName }) => {
        const char = currentRole.value;
        const boxIndex = char.economy.courierBox.findIndex(i => i.id === item.id);
        if (boxIndex > -1) char.economy.courierBox.splice(boxIndex, 1);
        
        if (!char.economy.containers[roomName][targetContainer]) {
            char.economy.containers[roomName][targetContainer] = [];
        }
        char.economy.containers[roomName][targetContainer].push(item);
        
        charStore.saveCharacterData({ economy: char.economy });
        uni.showToast({ title: '已收纳至 ' + targetContainer, icon: 'none' });
    };

    // 3. 准备使用物品 (弹出输入框)
    const handleUseItem = (item, containerName, idx) => {
        let roomName = '';
        for (const r in currentRole.value.economy.containers) {
            if (currentRole.value.economy.containers[r][containerName]) {
                roomName = r; break;
            }
        }
        pendingUseItem.value = { item, containerName, roomName, idx };
        useItemAction.value = ''; 
        showContainerPanel.value = false; 
        showUseModal.value = true;
    };

    // 4. 确认执行动作 (通知大模型)
    const confirmUseItem = async () => {
        if (!useItemAction.value.trim()) return uni.showToast({title: '请描述你的动作', icon:'none'});
        const { item, containerName, roomName, idx } = pendingUseItem.value;
        const char = currentRole.value;
        
        const sysMsg = {
            id: Date.now() + Math.random(),
            role: 'system',
            content: `✨ (你使用了 [${containerName}] 里的【${item.name}】：${useItemAction.value})`,
            isSystem: true
        };
        messageList.value.push(sysMsg);
        await saveHistory(sysMsg);

        const prompt = `[System Action: 玩家从${containerName}拿出了【${item.name}】(${item.desc})，并执行了互动："${useItemAction.value}"。请根据当前环境和你们的关系，做出非常自然、沉浸的反应。]`;
        sendMessage(false, prompt);
        
        if (item.type === 'food' || item.type === 'drink' || item.type === 'gift') {
            char.economy.containers[roomName][containerName].splice(idx, 1);
            charStore.saveCharacterData({ economy: char.economy });
        }
        showUseModal.value = false;
    };

    // 5. 商店购买逻辑
    const handleBuyItem = (item) => {
        const char = currentRole.value;
        if (!char || !char.economy) return uni.showToast({ title: '财产系统异常', icon: 'none' });
        if (char.economy.wallet < item.price) return uni.showToast({ title: '余额不足', icon: 'none' });

        char.economy.wallet -= item.price;
        if (!char.economy.courierBox) char.economy.courierBox = [];
        char.economy.courierBox.push({
            id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000), 
            name: item.name, icon: item.icon, type: item.type, desc: item.desc
        });

        charStore.saveCharacterData({ economy: char.economy });
        uni.showToast({ title: `成功购买【${item.name}】\n包裹已送达客厅快递箱！`, icon: 'none', duration: 2500 });
    };

    return {
        showShopPanel, showContainerPanel, activeContainerName, showUseModal, pendingUseItem, useItemAction,
        handleOpenContainer, handleTransferItem, handleUseItem, confirmUseItem, handleBuyItem
    };
}