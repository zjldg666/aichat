// AiChat/composables/useGameTime.js
// 时间系统
import { ref, computed, watch, onUnmounted } from 'vue';

export function useGameTime(saveCharacterState) {
    const currentTime = ref(Date.now());
    const lastUpdateGameHour = ref(-1);
    
    // 🛠️ 修改 1：将写死的常量改为响应式变量，并尝试从本地缓存读取，默认值为 6
    const timeRatio = ref(uni.getStorageSync('app_game_time_ratio') || 6); 
    
    let timeInterval = null;

    // 面板控制
    const showTimePanel = ref(false); 
    const showTimeSettingPanel = ref(false);
    const tempDateStr = ref('');
    const tempTimeStr = ref('');
    
    // 🛠️ 修改 2：新增用于弹窗输入框绑定的临时流速变量
    const tempTimeRatio = ref(6); 
    
    const customMinutes = ref('');

    const formattedTime = computed(() => {
        const date = new Date(currentTime.value);
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const day = weekDays[date.getDay()];
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${day} ${hour}:${minute}`;
    });

    const startTimeFlow = () => {
        if (timeInterval) clearInterval(timeInterval);
        lastUpdateGameHour.value = new Date(currentTime.value).getHours();
        timeInterval = setInterval(() => {
            // 🛠️ 修改 3：使用动态流速 (现实 1s = 游戏 timeRatio.value 秒)
            currentTime.value += 1000 * timeRatio.value;
            const currentHour = new Date(currentTime.value).getHours();
            if (currentHour !== lastUpdateGameHour.value) {
                lastUpdateGameHour.value = currentHour;
            }
        }, 1000);
    };

    const stopTimeFlow = () => {
        if (timeInterval) { clearInterval(timeInterval); timeInterval = null; }
    };

    const handleTimeSkip = (type, messageList, scrollToBottom) => {
        const now = new Date(currentTime.value);
        const oldDay = now.getDate(); 
        let targetDate = new Date(currentTime.value);
        let desc = "";
    
        switch (type) {
            case 'morning':
                targetDate.setHours(11, 30, 0, 0);
                if (targetDate.getTime() <= currentTime.value) {
                    targetDate.setDate(targetDate.getDate() + 1);
                }
                desc = "一上午过去了，快到中午了...";
                break;
    
            case 'afternoon':
                targetDate.setHours(17, 30, 0, 0);
                if (targetDate.getTime() <= currentTime.value) {
                    targetDate.setDate(targetDate.getDate() + 1);
                }
                desc = "一下午过去了，黄昏降临...";
                break;
    
            case 'night':
            case 'day':
                targetDate.setDate(targetDate.getDate() + 1);
                targetDate.setHours(8, 0, 0, 0);
                desc = type === 'night' ? "一夜过去了，晨光微露..." : "整整一天过去了...";
                break;
    
            case 'custom':
                const mins = parseInt(customMinutes.value);
                if (!mins || mins <= 0) return uni.showToast({ title: '请输入分钟', icon: 'none' });
                targetDate.setTime(currentTime.value + mins * 60 * 1000);
                desc = `${mins}分钟过去了...`;
                break;
        }
    
        const newTime = targetDate.getTime();
        const isNextDay = targetDate.getDate() !== oldDay;
    
        currentTime.value = newTime;
        saveCharacterState(undefined, newTime); 
        showTimePanel.value = false;
    
        // 🛠️ 修改 4：补上 ID，防止你刚修好的“多选删除”功能在此处失效
        messageList.value.push({ 
            id: Date.now() + Math.random(),
            role: 'system', 
            content: `【系统】${desc} 当前时间：${formattedTime.value}`, 
            isSystem: true 
        });
        
        scrollToBottom();
    
        return isNextDay;
    };
	
    watch(showTimeSettingPanel, (val) => {
        if (val) {
            const now = new Date(currentTime.value);
            const y = now.getFullYear();
            const m = (now.getMonth() + 1).toString().padStart(2, '0');
            const d = now.getDate().toString().padStart(2, '0');
            tempDateStr.value = `${y}-${m}-${d}`;
            tempTimeStr.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            // 🛠️ 修改 5：打开设置面板时，将当前流速同步到输入框变量
            tempTimeRatio.value = timeRatio.value;
        }
    });
    
    const confirmManualTime = () => {
        const fullStr = `${tempDateStr.value} ${tempTimeStr.value}`;
        const newTimestamp = new Date(fullStr.replace(/-/g, '/')).getTime();
    
        if (isNaN(newTimestamp)) {
            uni.showToast({ title: '时间格式错误', icon: 'none' });
            return null;
        }

        // 🛠️ 修改 6：在此处应用并保存新的流速设置
        timeRatio.value = Number(tempTimeRatio.value) || 6;
        uni.setStorageSync('app_game_time_ratio', timeRatio.value);
    
        if (newTimestamp === currentTime.value) {
            uni.showToast({ title: '流速已更新', icon: 'none' });
            showTimeSettingPanel.value = false;
            startTimeFlow(); // 重启定时器以应用新速率
            return currentTime.value;
        }
    
        currentTime.value = newTimestamp;
        saveCharacterState(undefined, newTimestamp);
        showTimeSettingPanel.value = false;
        uni.showToast({ title: '时间已调整', icon: 'none' });
        
        startTimeFlow(); // 调整后重新启动时间流

        return newTimestamp;
    };

    onUnmounted(() => {
        stopTimeFlow();
    });

    return {
        currentTime, formattedTime, 
        timeRatio, tempTimeRatio, // 🛠️ 修改 7：暴露流速相关变量给页面
        showTimePanel, showTimeSettingPanel, tempDateStr, tempTimeStr, customMinutes,
        startTimeFlow, stopTimeFlow, handleTimeSkip, confirmManualTime
    };
}