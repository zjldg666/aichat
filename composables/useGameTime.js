// AiChat/composables/useGameTime.js
import { ref, computed, watch } from 'vue';

// 🔥🔥🔥 核心修复：所有状态变量移到函数外部！🔥🔥🔥
// 这样无论在 App.vue 还是 Chat.vue 调用，永远操作的是同一份数据
const currentTime = ref(Date.now());
const timeRatio = ref(60); // 默认流速

// UI 交互状态（也可以共享，保证弹窗状态一致）
const showTimePanel = ref(false);
const showTimeSettingPanel = ref(false);
const tempTimeRatio = ref(60);
const tempDateStr = ref('');
const tempTimeStr = ref('');
const customMinutes = ref(30);

// 定时器引用 & 世界ID
const timer = ref(null);
const activeWorldId = ref(null);

export function useGameTime(saveCallback) {

    // 格式化时间
    const formattedTime = computed(() => {
        const date = new Date(currentTime.value);
        const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const week = weeks[date.getDay()];
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${week} ${hour}:${minute}`;
    });

    // 监听面板打开，同步数据到临时变量
    watch(showTimeSettingPanel, (isOpen) => {
        if (isOpen) {
            const date = new Date(currentTime.value);
            const y = date.getFullYear();
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const d = date.getDate().toString().padStart(2, '0');
            
            tempDateStr.value = `${y}-${m}-${d}`;
            
            const hh = date.getHours().toString().padStart(2, '0');
            const mm = date.getMinutes().toString().padStart(2, '0');
            tempTimeStr.value = `${hh}:${mm}`;

            // 🔥 同步当前真实流速到弹窗输入框
            tempTimeRatio.value = timeRatio.value;
        }
    });

    // 初始化/同步时间
    const initTimeSync = (initialTime, worldId = null) => {
        activeWorldId.value = worldId;
        if (worldId) {
            try {
                const worlds = uni.getStorageSync('app_world_settings') || [];
                const world = worlds.find(w => String(w.id) === String(worldId));
                if (world && world.currentTime) {
                    // 如果世界有存档时间，直接应用到全局 currentTime
                    currentTime.value = world.currentTime;
                    return;
                }
            } catch (e) { console.error(e); }
        }
        // 如果没有世界时间，仅在从未初始化过时使用 initialTime
        // (或者你可以根据需求强制覆盖)
        if (!currentTime.value || worldId) {
            currentTime.value = initialTime || Date.now();
        }
    };

    // 保存到世界配置
    const _saveToWorld = () => {
        if (!activeWorldId.value) return;
        try {
            const worlds = uni.getStorageSync('app_world_settings') || [];
            const index = worlds.findIndex(w => String(w.id) === String(activeWorldId.value));
            if (index !== -1) {
                worlds[index].currentTime = currentTime.value;
                uni.setStorageSync('app_world_settings', worlds);
            }
        } catch (e) { console.error(e); }
    };

    // 🔥 启动时间流动
    const startTimeFlow = () => {
        if (timer.value) return; // 防止重复启动
        console.log('⏳ [GameTime] 时间流动开始，流速:', timeRatio.value);
        
        // 建议使用 1000ms 触发一次，每次增加 timeRatio * 1000 毫秒
        timer.value = setInterval(() => {
            // 时间推进
            currentTime.value += 1000 * timeRatio.value;
            
            // 每现实 10 秒保存一次 (计数器简化处理)
            if (Date.now() % 10000 < 1000) {
                if (saveCallback) saveCallback(undefined, currentTime.value);
                _saveToWorld();
            }
        }, 1000);
    };

    // 停止时间
    const stopTimeFlow = () => {
        if (timer.value) {
            clearInterval(timer.value);
            timer.value = null;
            console.log('⏸️ [GameTime] 时间停止');
        }
    };

    // 跳过时间
    const handleTimeSkip = (type, messageList, scrollToBottom) => {
        const oldDate = new Date(currentTime.value).getDate();
        let addMs = 0;
        
        if (type === 'custom') {
            addMs = (parseInt(customMinutes.value) || 0) * 60 * 1000;
        } else {
            switch(type) {
                case 'morning': addMs = 4 * 60 * 60 * 1000; break;
                case 'afternoon': addMs = 4 * 60 * 60 * 1000; break;
                case 'night': addMs = 8 * 60 * 60 * 1000; break;
                case 'day': addMs = 24 * 60 * 60 * 1000; break;
            }
        }
        
        currentTime.value += addMs;
        showTimePanel.value = false;
        
        if (saveCallback) saveCallback(undefined, currentTime.value);
        _saveToWorld();

        const newDate = new Date(currentTime.value).getDate();
        return newDate !== oldDate;
    };

    // 确认手动修改时间
    const confirmManualTime = () => {
        if (!tempDateStr.value || !tempTimeStr.value) return null;
        
        const dateParts = tempDateStr.value.split('-');
        const timeParts = tempTimeStr.value.split(':');
        
        const newDate = new Date(
            parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]),
            parseInt(timeParts[0]), parseInt(timeParts[1])
        );
        
        currentTime.value = newDate.getTime();
        
        // 🔥 修复流速设置：将临时变量赋值给全局 timeRatio
        const newRatio = parseFloat(tempTimeRatio.value);
        if (!isNaN(newRatio)) {
            timeRatio.value = newRatio;
            console.log('🚀 [GameTime] 流速已更新为:', newRatio);
        }
        
        showTimeSettingPanel.value = false;
        if (saveCallback) saveCallback(undefined, currentTime.value);
        _saveToWorld();

        return currentTime.value;
    };

    return {
        currentTime,
        formattedTime,
        timeRatio,
        tempTimeRatio,
        showTimePanel,
        showTimeSettingPanel,
        tempDateStr,
        tempTimeStr,
        customMinutes,
        startTimeFlow,
        stopTimeFlow,
        handleTimeSkip,
        confirmManualTime,
        initTimeSync
    };
}