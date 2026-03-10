// AiChat/composables/useWorkActions.js
// 专门负责打工赚钱、时间流逝与自动回家的逻辑
import { ref, nextTick } from 'vue';

export function useWorkActions(context) {
    const {
        currentTime, formattedTime, playerLocation, interactionMode, currentLocation,
        currentRole, charStore, messageList, saveHistory, sendMessage, userHome
    } = context;

    // 触发打工面板
    const handleWork = () => {
        const date = new Date(currentTime.value);
        const currentHour = date.getHours();

        const options = [];
        // ✨ 核心限制：当前小时 + 工作时长 不能超过 20 (晚上8点)
        if (currentHour + 4 <= 20) options.push('☕ 半天兼职 (4小时/赚¥200)');
        if (currentHour + 8 <= 20) options.push('🏢 全职加班 (8小时/赚¥500)');

        // 如果连 4 小时都干不了了，直接强行下班
        if (options.length === 0) {
            uni.showToast({ title: '公司关门啦，明天赶早吧！(最晚20:00下班)', icon: 'none', duration: 2500 });
            // 如果玩家还在公司，就把他踢回家
            if (playerLocation.value === '公司') {
                goHome(formattedTime.value); 
            }
            return;
        }

        uni.showActionSheet({
            itemList: options,
            success: (res) => {
                const isFullDay = options[res.tapIndex].includes('8小时');
                startWork(isFullDay ? 8 : 4, isFullDay ? 500 : 200);
            }
        });
    };

    // 开始工作
    const startWork = async (hours, wage) => {
        // 1. 强制离家，前往公司
        playerLocation.value = '公司';
        if (currentLocation.value !== '公司') {
            interactionMode.value = 'phone';
        }
        charStore.saveCharacterData({ playerLocation: playerLocation.value, interactionMode: interactionMode.value });

        // 2. UI 反馈
        messageList.value.push({ role: 'system', content: `💼 (你离开了家，前往公司开始 ${hours} 小时的辛勤工作...)`, isSystem: true });
        await saveHistory();
        
        // 3. 播放全屏Loading，模拟正在工作 (1.5秒)
        uni.showLoading({ title: '努力打工中...', mask: true });

        setTimeout(() => {
            uni.hideLoading();
            finishWork(hours, wage);
        }, 1500); 
    };

    // 工作结束结算
    const finishWork = async (hours, wage) => {
        const oldTimeStr = formattedTime.value;

        // 1. 发工资
        const char = currentRole.value;
        if (!char.economy) char.economy = { wallet: 0, courierBox: [], containers: {} };
        char.economy.wallet += wage;
        charStore.saveCharacterData({ economy: char.economy });

        // 2. 时间流逝 (毫秒换算)
        currentTime.value += hours * 3600 * 1000;

        // 3. 结算提示
        messageList.value.push({ role: 'system', content: `💸 (工作结束！赚取了 ¥${wage}，当前余额: ¥${char.economy.wallet}。时间来到了 ${formattedTime.value})`, isSystem: true });
        await saveHistory();

        // 4. 询问是否继续工作
        setTimeout(() => {
            uni.showModal({
                title: '打工结束',
                content: `已经辛苦工作了${hours}小时，赚得 ¥${wage}。\n是否继续留在公司加班？`,
                confirmText: '继续加班(是)',
                cancelText: '下班回家(否)',
                success: (res) => {
                    if (res.confirm) {
                        handleWork(); // 选“是” -> 重新走判定逻辑
                    } else {
                        goHome(oldTimeStr); // 选“否” -> 回家
                    }
                }
            });
        }, 300);
    };

    // 回家逻辑与剧情触发
    const goHome = async (oldTimeStr) => {
        // 1. 回到玩家自己的家
        playerLocation.value = userHome.value || '玩家家'; 
        const isSame = playerLocation.value === currentLocation.value;
        interactionMode.value = isSame ? 'face' : 'phone';
        charStore.saveCharacterData({ playerLocation: playerLocation.value, interactionMode: interactionMode.value });

        messageList.value.push({ role: 'system', content: `🏠 (你结束了疲惫的工作，回到了家中)`, isSystem: true });
        await saveHistory();

        // 2. 发送剧情指令给大模型 (异地微信问候 or 当面迎接)
        nextTick(() => {
            const workPrompt = `[SYSTEM EVENT: BACK FROM WORK] 玩家刚才去公司辛苦打工了，现在终于下班回到了家(${playerLocation.value})。时间从 ${oldTimeStr} 跳转到了 ${formattedTime.value}。请结合你们现在的关系和时间，对辛苦赚钱回家的玩家说一句极其自然、贴心的话（可以问问他累不累，或者聊聊晚饭吃什么）。`;
            sendMessage(false, workPrompt);
        });
    };

    return { handleWork };
}