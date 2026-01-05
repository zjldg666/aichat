// AiChat/composables/useGameLocation.js
// 地点和工作逻辑
import { ref, computed } from 'vue';

export function useGameLocation(context) {
    const { 
        currentRole, userHome, charHome, currentTime, worldLocations,playerLocation
    } = context;
    
    const showLocationPanel = ref(false);
    const customLocation = ref('');

    // 检查角色当前是否处于工作时间
    const checkIsWorking = () => {
        const s = currentRole.value?.settings || {};
        if (!s.workplace || s.workplace.trim() === '') return false;
        const workDays = s.workDays || []; 
        if (workDays.length === 0) return false;
        const date = new Date(currentTime.value);
        const day = date.getDay(); 
        const hour = date.getHours(); 
        const start = s.workStartHour !== undefined ? s.workStartHour : 9;
        const end = s.workEndHour !== undefined ? s.workEndHour : 18;
        return (workDays.includes(day) && hour >= start && hour < end);
    };

    // 检查是否同居
    const isCohabitation = () => {
        const u = (userHome.value || '').trim();
        const c = (charHome.value || '').trim();
        if (!u || !c || u === '未知地址' || c === '未知地址' || u === '角色家' || u === '玩家家') return false;
        return u === c || u.includes(c) || c.includes(u);
    };

    // 动态生成地点列表
    // 动态生成地点列表
        const locationList = computed(() => {
            const list = [];
            
            // 0. ✨ 核心修改：优先检查是否在自定义的大场景内
            const customScenes = uni.getStorageSync('app_world_scenes_custom') || [];
            const currentPLoc = playerLocation.value || '';
    
            // 查找玩家当前是否在某个大场景，或者该场景的某个房间里
            const currentSceneCtx = customScenes.find(scene => 
                scene.name === currentPLoc || 
                (scene.nodes && scene.nodes.includes(currentPLoc)) ||
                currentPLoc.includes(scene.name) 
            );
    
            // 🔥 如果确实在场景里，就只显示这个场景的房间！
            if (currentSceneCtx) {
                // A. 列出所有子房间
                if (currentSceneCtx.nodes) {
                    currentSceneCtx.nodes.forEach(nodeName => {
                        list.push({
                            name: nodeName, 
                            type: 'scene_node', // ✨ 新类型：子场景节点
                            icon: '🚪', 
                            mode: 'face', 
                            detail: `${currentSceneCtx.name} 内部`
                        });
                    });
                }
    
                // B. 增加一个“离开”选项
                list.push({
                    name: '离开这里',
                    type: 'leave_scene', // ✨ 新类型：离开
                    icon: '🏃', 
                    mode: 'phone',
                    detail: '返回街道/大地图'
                });
    
                return list; // 🚀 直接返回，不显示下面的通用地点了
            }
    
            // =========================================================
            // 下面是原有的逻辑 (不在场景里时，显示通用的大地点)
            // =========================================================
            const isTogether = isCohabitation();
            const s = currentRole.value?.settings || {}; // 获取当前角色设定
            
            // 1. 处理“家”的逻辑
            if (isTogether) {
                list.push({
                    name: '我们的家', detail: charHome.value, type: 'shared_home', icon: '🏡', mode: 'face', 
                    style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
                });
            } else {
                list.push({
                    name: '她的家', detail: charHome.value || '角色家', type: 'char_home', icon: '🏠', mode: 'face', 
                    style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
                });
                list.push({
                    name: '我的家', detail: userHome.value || '我家', type: 'user_home', icon: '🏡', mode: 'phone',
                    style: 'background-color:#e3f2fd; color:#1565c0; border:1px solid #bbdefb;'
                });
            }
    
            // 2. 动态注入：工作地点
            if (s.workplace) {
                list.push({
                    name: s.workplace, type: 'common', icon: '💼', mode: 'phone',
                    style: 'background-color:#fff3e0; color:#ef6c00; border:1px solid #ffe0b2;'
                });
            }
    
            // 3. 动态注入：角色设定中的自定义地点
            if (s.customLocations && Array.isArray(s.customLocations)) {
                s.customLocations.forEach(loc => {
                    const name = typeof loc === 'string' ? loc : loc.name;
                    const icon = loc.icon || '📍';
                    list.push({
                        name: name, type: 'common', icon: icon, mode: 'phone',
                        style: 'background-color:#f5f5f5; color:#333; border:1px solid #eee;'
                    });
                });
            }
    
            // 4. 处理全局公共地点
            worldLocations.value.forEach(item => {
                const name = typeof item === 'string' ? item : item.name;
                if (name === s.workplace) return;
                const icon = item.icon || '📍';
                list.push({
                    name: name, type: 'common', icon: icon, mode: 'phone', 
                    style: 'background-color:#f5f5f5; color:#333; border:1px solid #eee;' 
                });
            });
    
            return list;
        });

    // ✨ 核心修改：计算移动后的双位置结果
    // ✨ 核心修改：计算移动后的双位置结果
        const calculateMoveResult = (locObj) => {
            const playerDestination = locObj.detail || locObj.name; // 玩家目标位置
            const s = currentRole.value?.settings || {};
            const workplaceName = s.workplace || "单位";
            const isWorking = checkIsWorking();
            
            // A. 实时计算角色此时此刻应该在哪里
            let aiActualLocation = isWorking ? workplaceName : (charHome.value || '角色家');
            
            let newMode = 'phone'; 
            let shouldNotifyAI = false; 
            let sysMsgUser = "";   
            let promptAction = ""; 
    
            // =========================================================
            // 🔥 新增：处理场景内移动逻辑 (房间切换 & 离开)
            // =========================================================
            
            // 情况 1: 在场景内切换房间 (比如 客厅 -> 卧室)
            if (locObj.type === 'scene_node') {
                const roomName = locObj.name;
                
                // 判定 AI 在哪 (模糊判定)
                const isAIHere = aiActualLocation.includes(roomName) || roomName.includes(aiActualLocation);
    
                if (isAIHere) {
                    newMode = 'face';
                    shouldNotifyAI = true;
                    sysMsgUser = `你走进了${roomName}，她果然在这里。`;
                    promptAction = `Player entered the ${roomName}. You are here. Interaction mode: FACE-TO-FACE.`;
                } else {
                    newMode = 'phone'; 
                    shouldNotifyAI = true;
                    sysMsgUser = `你来到了${roomName}，这里没人。(她在${aiActualLocation})`;
                    promptAction = `Player moved to ${roomName}. You are at ${aiActualLocation}. You are in different rooms.`;
                }
    
                return { 
                    targetName: roomName,
                    playerLocation: roomName, // 更新为具体房间名
                    aiLocation: aiActualLocation,
                    newMode, shouldNotifyAI, sysMsgUser, promptAction 
                };
            }
    
            // 情况 2: 离开场景 (返回大地图)
            if (locObj.type === 'leave_scene') {
                const streetName = '街道'; 
                newMode = 'phone';
                shouldNotifyAI = true;
                sysMsgUser = `你走出了屋子，来到了${streetName}。`;
                promptAction = `Player left the house/building. Player is now outside. Mode: PHONE.`;
    
                return { 
                    targetName: streetName,
                    playerLocation: streetName, 
                    aiLocation: aiActualLocation,
                    newMode, shouldNotifyAI, sysMsgUser, promptAction 
                };
            }
            
            // =========================================================
    
            const isTogether = isCohabitation();
    
            // B. 分情况讨论详细的逻辑分支
            if (isTogether) {
                // 同居模式下的移动逻辑
                if (locObj.type === 'shared_home') {
                    if (isWorking) {
                        newMode = 'phone'; shouldNotifyAI = true;
                        sysMsgUser = `你回到了家，但她正在【${workplaceName}】上班，家里空荡荡的。`;
                        promptAction = `Player returned to the shared home, but you are currently at work (${workplaceName}). Player is alone at home. Describe being at work and receiving a notification.`;
                    } else {
                        newMode = 'face'; shouldNotifyAI = true;
                        sysMsgUser = `你回到了家，她正在客厅里。`;
                        promptAction = `Player returned to the shared home. You are off work and at home. Describe the greeting.`;
                    }
                } else {
                    // 玩家离开了共有的家
                    newMode = 'phone'; shouldNotifyAI = true;
                    sysMsgUser = `你离开了家，前往${playerDestination}。`;
                    promptAction = `Player left home and went to ${playerDestination}. You are at ${aiActualLocation}. Mode switched to PHONE.`;
                }
            } else {
                // 非同居模式下的移动逻辑
                if (locObj.type === 'char_home') {
                    if (isWorking) {
                        newMode = 'phone'; shouldNotifyAI = true;
                        sysMsgUser = `你来到她家门口，但没人在家。她应该在【${workplaceName}】上班。`;
                        promptAction = `Player visited your home, but you are at work (${workplaceName}). You are NOT there. Describe getting a text about the visit.`;
                    } else {
                        newMode = 'face'; shouldNotifyAI = true;
                        sysMsgUser = `你来到了${playerDestination}（拜访）。`;
                        promptAction = `Player arrived at your house. You are at home. Mode: FACE. Describe opening the door.`;
                    }
                } else if (locObj.type === 'user_home') {
                    // 玩家回自己家
                    newMode = 'phone'; 
                    shouldNotifyAI = true;
                    sysMsgUser = `你告别了她，回到了自己家。`;
                    promptAction = `Player went back to their own home. Mode: PHONE. Describe the distance/parting feeling.`;
                } else {
                    // 访问其他地点或工作单位
                    const isVisitingWork = workplaceName && playerDestination.includes(workplaceName);
                    if (isVisitingWork && isWorking) {
                        newMode = 'face'; shouldNotifyAI = true;
                        sysMsgUser = `你来到了【${playerDestination}】，正好看到她在认真工作。`;
                        promptAction = `Player visited your workplace (${playerDestination}) while you are working! Mode: FACE. Describe your reaction.`;
                    } else if (isVisitingWork && !isWorking) {
                        newMode = 'phone'; shouldNotifyAI = false; 
                        sysMsgUser = `你来到了【${playerDestination}】，但她已经下班了。`;
                        promptAction = "";
                    } else {
                        // 普通公共地点移动
                        if (playerDestination === aiActualLocation) {
                            newMode = 'face'; shouldNotifyAI = true;
                            sysMsgUser = `你抵达了${playerDestination}，巧合的是，她也在这里。`;
                            promptAction = `Player arrived at ${playerDestination}. You happen to be there too! Mode: FACE.`;
                        } else {
                            newMode = 'phone'; shouldNotifyAI = false; 
                            sysMsgUser = `已抵达${playerDestination}。`;
                            promptAction = "";
                        }
                    }
                }
            }
    
            // C. 返回完整的结果集，供 chat.vue 更新状态
            return { 
                targetName: playerDestination,
                playerLocation: playerDestination, // 玩家新位置
                aiLocation: aiActualLocation,     // 角色当前位置
                newMode, 
                shouldNotifyAI, 
                sysMsgUser, 
                promptAction 
            };
        };

    return { 
        showLocationPanel, customLocation, 
        locationList, checkIsWorking, calculateMoveResult 
    };
}