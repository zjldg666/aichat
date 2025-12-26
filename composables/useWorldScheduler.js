// 文件路径: composables/useWorldScheduler.js

export function useWorldScheduler() {

    /**
     * 🌍 世界心跳函数
     * 遍历通讯录，根据每个人的作息设定，强制刷新他们的位置和状态
     * @param {Number} timestamp 当前游戏时间戳
     * @param {String} currentWorldId 当前所处的世界ID (用于隔离不同世界)
     */
    const tickWorldState = (timestamp, currentWorldId) => {
        if (!currentWorldId) return;

        const date = new Date(timestamp);
        const currentHour = date.getHours(); // 0-23
        const currentDay = date.getDay();    // 0(周日) - 6(周六)
        
        // 读取所有角色数据
        const contacts = uni.getStorageSync('contact_list') || [];
        let hasChange = false;

        console.log(`🌍 [世界调度] 周${currentDay} ${currentHour}点 | 正在同步世界: ${currentWorldId}`);

        contacts.forEach(npc => {
            // 1. 世界隔离：只更新当前世界的角色
            if (String(npc.worldId) !== String(currentWorldId)) return;

            // 2. 读取配置 (create.vue 里保存的数据)
            const s = npc.settings || {};
            
            // 如果没填工作地点，或者没勾选任何工作日，视为无业/自由职业，不做强制调度
            if (!s.workplace || !s.workDays || s.workDays.length === 0) {
                return; 
            }

            // 3. 判断今天是否工作日 (workDays 存的是 [1,2,3...])
            const isWorkDay = s.workDays.includes(currentDay);
            
            // 默认状态：在家休息
            // 注意：优先读 userLocation，没有则用 location，再没有则用 '角色家'
            let targetLocation = s.userLocation || npc.location || '角色家'; 
            let status = '休息中';
            
            if (isWorkDay) {
                // 4. 判断具体时刻
                const start = parseInt(s.workStartHour) || 9;
                const end = parseInt(s.workEndHour) || 18;
                
                let isWorkTime = false;
                
                // 处理跨天夜班 (比如 22:00 - 06:00)
                if (start < end) {
                    // 白班: 9 <= now < 18
                    isWorkTime = (currentHour >= start && currentHour < end);
                } else {
                    // 夜班: (now >= 22) 或 (now < 6)
                    isWorkTime = (currentHour >= start || currentHour < end);
                }

                if (isWorkTime) {
                    targetLocation = s.workplace; // 去上班
                    status = '工作中';
                }
            }

            // 5. 执行移动 (如果位置真的变了)
            if (npc.currentLocation !== targetLocation) {
                console.log(`   📍 ${npc.name}: ${npc.currentLocation} -> ${targetLocation} (${status})`);
                npc.currentLocation = targetLocation;
                npc.currentAction = status; 
                hasChange = true;
            }
        });

        // 6. 批量保存变更
        if (hasChange) {
            uni.setStorageSync('contact_list', contacts);
        }
    };

    return {
        tickWorldState
    };
}