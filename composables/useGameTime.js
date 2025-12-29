// AiChat/composables/useGameTime.js

import { ref, computed,watch } from 'vue';

export function useGameTime(saveCallback) {
    // 基础状态
    const currentTime = ref(Date.now());
    const timeRatio = ref(6); // 时间流速：现实1秒 = 游戏60秒 (1分钟)
    
    // UI 控制状态
    const showTimePanel = ref(false);
    const showTimeSettingPanel = ref(false);
    const tempTimeRatio = ref(60);
    const tempDateStr = ref('');
    const tempTimeStr = ref('');
    const customMinutes = ref(30);

    // 内部定时器
    const timer = ref(null);
    
    // 🔥🔥🔥 新增：当前绑定的世界 ID
    const activeWorldId = ref(null);

    // 格式化时间 (周X HH:mm)
    const formattedTime = computed(() => {
        const date = new Date(currentTime.value);
        const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const week = weeks[date.getDay()];
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${week} ${hour}:${minute}`;
    });
	// 🔥🔥🔥 核心修复：监听面板打开，同步数据 🔥🔥🔥
	    watch(showTimeSettingPanel, (isOpen) => {
	        if (isOpen) {
	            const date = new Date(currentTime.value);
	            
	            // 1. 初始化日期 (YYYY-MM-DD)
	            const y = date.getFullYear();
	            const m = (date.getMonth() + 1).toString().padStart(2, '0');
	            const d = date.getDate().toString().padStart(2, '0');
	            tempDateStr.value = `${y}-${m}-${d}`;
	
	            // 2. 初始化时间 (HH:mm)
	            const hh = date.getHours().toString().padStart(2, '0');
	            const mm = date.getMinutes().toString().padStart(2, '0');
	            tempTimeStr.value = `${hh}:${mm}`;
	
	            // 3. 初始化流速 (同步当前的流速)
	            tempTimeRatio.value = timeRatio.value;
	        }
	    });

    // 🔥🔥🔥 新增：初始化并同步时间 (核心逻辑)
    // 如果传入了 worldId，优先使用世界时间
    const initTimeSync = (initialTime, worldId = null) => {
        activeWorldId.value = worldId;
        
        if (worldId) {
            try {
                const worlds = uni.getStorageSync('app_world_settings') || [];
                const world = worlds.find(w => String(w.id) === String(worldId));
                // 如果世界有时钟记录，使用世界时间
                if (world && world.currentTime) {
                    currentTime.value = world.currentTime;
                 
                    return;
                }
            } catch (e) {
                console.error('❌ 世界时间同步失败:', e);
            }
        }
        
        // 兜底：如果没有世界时间，或者不是世界模式，使用角色存档时间
        currentTime.value = initialTime || Date.now();
    };

    // 🔥🔥🔥 新增：内部辅助函数，保存到世界设置
    const _saveToWorld = () => {
        if (!activeWorldId.value) return;
        try {
            const worlds = uni.getStorageSync('app_world_settings') || [];
            const index = worlds.findIndex(w => String(w.id) === String(activeWorldId.value));
            if (index !== -1) {
                worlds[index].currentTime = currentTime.value;
                uni.setStorageSync('app_world_settings', worlds);
                // console.log('🌍 世界时间已更新');
            }
        } catch (e) { console.error(e); }
    };

    // 开始时间流动
    const startTimeFlow = () => {
        if (timer.value) return;
        let counter = 0;
        
        timer.value = setInterval(() => {
            // 增加时间
            currentTime.value += 1000 * timeRatio.value;
            
            // 每现实 10 秒保存一次
            if (++counter % 10 === 0) {
                // 1. 保存角色状态
                if (saveCallback) saveCallback(undefined, currentTime.value);
                // 2. 🔥 保存世界状态
                _saveToWorld();
            }
        }, 1000);
    };

    // 停止时间
    const stopTimeFlow = () => {
        if (timer.value) {
            clearInterval(timer.value);
            timer.value = null;
        }
    };

    // 时间跳跃
    const handleTimeSkip = (type, messageList, scrollToBottom) => {
        const oldDate = new Date(currentTime.value).getDate();
        
        let addMs = 0;
        if (type === 'custom') {
            addMs = (parseInt(customMinutes.value) || 0) * 60 * 1000;
        } else {
            // 简单跳跃逻辑
            switch(type) {
                case 'morning': addMs = 4 * 60 * 60 * 1000; break;
                case 'afternoon': addMs = 4 * 60 * 60 * 1000; break;
                case 'night': addMs = 8 * 60 * 60 * 1000; break;
                case 'day': addMs = 24 * 60 * 60 * 1000; break;
            }
        }
        
        currentTime.value += addMs;
        showTimePanel.value = false;
        
        // 🔥 立即保存变更
        if (saveCallback) saveCallback(undefined, currentTime.value);
        _saveToWorld();

        // 检查跨天
        const newDate = new Date(currentTime.value).getDate();
        const isNextDay = newDate !== oldDate;
        
        return isNextDay;
    };

    // 手动设定时间
    const confirmManualTime = () => {
        if (!tempDateStr.value || !tempTimeStr.value) return null;
        
        const dateParts = tempDateStr.value.split('-');
        const timeParts = tempTimeStr.value.split(':');
        
        const newDate = new Date(
            parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]),
            parseInt(timeParts[0]), parseInt(timeParts[1])
        );
        
        const oldTime = currentTime.value;
        currentTime.value = newDate.getTime();
        
        // 更新流速
        if (tempTimeRatio.value) timeRatio.value = parseInt(tempTimeRatio.value);
        
        showTimeSettingPanel.value = false;
        
        // 🔥 立即保存
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
        // 导出新函数
        initTimeSync
    };
}