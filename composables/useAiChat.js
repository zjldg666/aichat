import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { DB } from '@/utils/db.js';
import { LLM } from '@/services/llm.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';
import { useGameTime } from '@/composables/useGameTime.js';
import { useChatGallery } from '@/composables/useChatGallery.js';
import { useGameLocation } from '@/composables/useGameLocation.js';
import { useAgents } from '@/composables/useAgents.js';
import { useWorldScheduler } from '@/composables/useWorldScheduler.js';
import { 
    CORE_INSTRUCTION_LOGIC_MODE,
    TIME_SHIFT_PROMPT 
} from '@/utils/prompts.js';

export function useAiChat(initialChatId = null, options = {}) {
    const { isEmbedded = false } = options;

    // ==================================================================================
    // 1. 核心状态定义 (State)
    // ==================================================================================
    const chatName = ref('AI');
    const chatId = ref(initialChatId);
    const currentRole = ref(null);
    const messageList = ref([]);
    const inputText = ref('');
    const isLoading = ref(false);
    const scrollIntoView = ref('');
    
    // 角色状态
    const currentAction = ref('站立/闲逛'); 
    const userName = ref('你');
    const userAvatar = ref('/static/user-avatar.png');
    const userHome = ref('未知地址');
    const userAppearance = ref('');
    const charHome = ref('未知地址');
    const currentAffection = ref(0);
    const currentLust = ref(0);
    const currentLocation = ref('角色家');
    const interactionMode = ref('phone');
    const currentClothing = ref('默认服装');
    const currentActivity = ref('自由活动');
    const currentRelation = ref('初相识'); 
    const playerLocation = ref('加载中...');

    // 记忆与设置
    const currentSummary = ref('');
    const enableSummary = ref(false);
    const summaryFrequency = ref(20);
    const charHistoryLimit = ref(20);
    const wakeTime = ref('08:00');

    // UI 辅助状态
    const worldLocations = ref([]); 
    
    // 心理活动显示开关
    const showThought = ref(uni.getStorageSync('setting_show_thought') === true);

    const { tickWorldState } = useWorldScheduler();

    // ==================================================================================
    // 2. 基础方法 (Helpers)
    // ==================================================================================
    
    const scrollToBottom = () => {
        nextTick(() => {
            scrollIntoView.value = '';
            setTimeout(() => { scrollIntoView.value = 'scroll-bottom'; }, 100);
        });
    };

    const toggleThought = () => {
        showThought.value = !showThought.value;
        uni.setStorageSync('setting_show_thought', showThought.value);
        uni.showToast({ 
            title: showThought.value ? '已开启心声显示' : '已隐藏心声', 
            icon: 'none' 
        });
    };

    const getCurrentLlmConfig = () => {
        const schemes = uni.getStorageSync('app_llm_schemes') || [];
        const idx = uni.getStorageSync('app_current_scheme_index') || 0;
        return (schemes.length > 0 && schemes[idx]) ? schemes[idx] : uni.getStorageSync('app_api_config');
    };

    // ==================================================================================
    // 3. 数据持久化 (Storage & DB)
    // ==================================================================================

    const saveHistory = async (msg) => {
        if (!chatId.value) return;
        const targetMsg = msg || (messageList.value.length > 0 ? messageList.value[messageList.value.length - 1] : null);
        if (!targetMsg) return;
    
        // 🔥 计算模式逻辑
        // 如果是嵌入版(手机内)，强制为 device
        // 如果不是嵌入版，则看当前是 face 还是 phone
        let mode = 'device';
        if (!isEmbedded && interactionMode.value === 'face') {
            mode = 'reality';
        }
        
        // 同步到内存对象，确保发送后列表立即更新/过滤
        if (!targetMsg.source_mode) {
            targetMsg.source_mode = mode;
        }
    
        try {
            await DB.execute(
                `INSERT OR REPLACE INTO messages (id, chatId, role, content, type, isSystem, timestamp, source_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    targetMsg.id || (Date.now() + Math.random()),
                    String(chatId.value), 
                    targetMsg.role, 
                    targetMsg.content, 
                    targetMsg.type || 'text', 
                    targetMsg.isSystem ? 1 : 0, 
                    Date.now(),
                    mode
                ]
            );
            
            // 更新联系人列表预览
            let list = uni.getStorageSync('contact_list') || [];
            const index = list.findIndex(item => String(item.id) === String(chatId.value));
            if (index !== -1) {
                list[index].lastMsg = targetMsg.isSystem ? `[系统] ${targetMsg.content}` : targetMsg.content;
                list[index].lastTime = "刚刚"; 
                uni.setStorageSync('contact_list', list);
            }
            console.log(`💾 [DB] 消息已保存 (${mode})`);
        } catch (e) { console.error('❌ 数据库保存失败', e); }
    };

    const saveCharacterState = (newScore, newTime, newSummary, newLocation, newClothes, newMode, newLust) => {
        if (newScore !== undefined) currentAffection.value = Math.max(0, Math.min(100, newScore));
        if (newLust !== undefined) currentLust.value = Math.max(0, Math.min(100, newLust));
        if (newTime !== undefined) currentTime.value = newTime; 
        if (newSummary !== undefined) currentSummary.value = newSummary;
        if (newLocation !== undefined) currentLocation.value = newLocation;
        if (newClothes !== undefined) currentClothing.value = newClothes;
        
        if (newMode !== undefined) {
            if (isEmbedded) {
                interactionMode.value = 'phone';
            } else if (newMode === 'face' && playerLocation.value !== currentLocation.value) {
                interactionMode.value = 'phone'; 
            } else {
                interactionMode.value = newMode;
            }
        }

        if (chatId.value) {
            const list = uni.getStorageSync('contact_list') || [];
            const index = list.findIndex(item => String(item.id) === String(chatId.value));
            if (index !== -1) {
                const item = list[index];
                item.affection = currentAffection.value;
                item.lust = currentLust.value;
                item.lastTimeTimestamp = currentTime.value;
                item.summary = currentSummary.value;
                item.playerLocation = playerLocation.value;
                item.currentLocation = currentLocation.value;
                item.clothing = currentClothing.value;
                item.currentAction = currentAction.value;
                item.interactionMode = interactionMode.value; 
                item.lastActivity = currentActivity.value;
                item.relation = currentRelation.value;
                uni.setStorageSync('contact_list', list);
            }
        }
    };

    // ==================================================================================
    // 4. 子模块集成 (Sub-Composables)
    // ==================================================================================

    // 4.1 时间管理
    const { 
        currentTime, formattedTime, 
        timeRatio, tempTimeRatio,
        showTimePanel, showTimeSettingPanel, tempDateStr, tempTimeStr, customMinutes,
        startTimeFlow, stopTimeFlow, handleTimeSkip: _handleTimeSkip, 
        confirmManualTime: _confirmManualTime,
        initTimeSync 
    } = useGameTime(saveCharacterState);

    const timeParts = computed(() => {
        if (!formattedTime.value) return { week: '--', time: '--:--' };
        const parts = formattedTime.value.split(' ');
        return { week: parts[0] || '', time: parts[1] || '' };
    });

    const confirmManualTime = async () => {
        const newTime = _confirmManualTime();
        if (newTime) {
            messageList.value.push({
                role: 'system',
                content: `⏳ 时间现在为为 ${formattedTime.value}`,
                isSystem: true
            });
            scrollToBottom();
        } 
    };

    // 4.2 画廊与生图
    const { handleAsyncImageGeneration, retryGenerateImage } = useChatGallery({
        currentRole, interactionMode, userAppearance, 
        messageList, chatId, chatName, saveHistory, scrollToBottom
    });

    // 4.3 地点管理
    const { 
        showLocationPanel, customLocation, 
        locationList, checkIsWorking, calculateMoveResult 
    } = useGameLocation({ currentRole, userHome, charHome, currentTime, worldLocations, playerLocation });

    // 4.4 Agents
    const {
        runSceneCheck, runRelationCheck, runVisualDirectorCheck, runCameraManCheck, 
        checkAndRunSummary, runDayEndSummary, isArchiving,
        checkHistoryRecall, fetchActiveMemoryContext, retryAgentGeneration
    } = useAgents({
        chatId,
        messageList, currentRole, chatName, currentLocation, currentClothing, currentAction,
        interactionMode, currentRelation, currentAffection, 
        currentActivity, formattedTime, playerLocation,
        enableSummary, summaryFrequency, currentSummary,
        saveCharacterState, saveHistory, scrollToBottom, getCurrentLlmConfig, handleAsyncImageGeneration
    });

    // ==================================================================================
    // 5. 业务逻辑实现
    // ==================================================================================

    // --- 消息过滤 ---
    const visibleMessageList = computed(() => {
        if (!isEmbedded) return messageList.value;
        return messageList.value.filter(msg => msg.source_mode !== 'reality');
    });

    const relationshipStatus = computed(() => {
        const score = currentAffection.value;
        if (score < 20) return '礼貌疏离';
        if (score < 40) return '普通熟人';
        if (score < 60) return '暧昧萌芽';
        if (score < 80) return '恋人未满';
        return '热恋情侣';
    });

    // --- 睡觉逻辑 ---
    const getWakeUpTimestamp = (targetTimeStr) => {
        const now = new Date(currentTime.value); 
        const [targetHour, targetMinute] = targetTimeStr.split(':').map(Number);
        let targetDate = new Date(now);
        targetDate.setHours(targetHour, targetMinute, 0, 0);
        if (targetDate <= now) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        return targetDate.getTime();
    };

    const onSleepTimeChange = async (e) => {
        const selectedTime = e.detail.value;
        wakeTime.value = selectedTime;
        if (isLoading.value) return uni.showToast({ title: '剧情进行中...', icon: 'none' });
        
        const oldTimeStr = formattedTime.value; 
        const newTimestamp = getWakeUpTimestamp(selectedTime);
        const oldDate = new Date(currentTime.value).getDate();
        const newDate = new Date(newTimestamp).getDate();
        
        if (oldDate !== newDate) {
            console.log("🌙 检测到睡眠跨天，触发每日结算...");
            await runDayEndSummary();
        }
        
        currentTime.value = newTimestamp;
        if (currentRole.value && currentRole.value.worldId) {
            tickWorldState(currentTime.value, currentRole.value.worldId);
        }
        
        messageList.value.push({
            role: 'system',
            content: `💤 睡到了 ${selectedTime}... (体力已恢复)`,
            isSystem: true
        });
        await saveHistory(); 
        
        nextTick(() => {
            const transitionPrompt = TIME_SHIFT_PROMPT
                .replace('{{old_time}}', oldTimeStr)
                .replace('{{new_time}}', formattedTime.value) 
                .replace('{{current_location}}', currentLocation.value || "卧室");
            sendMessage(false, transitionPrompt);
        });
    };

    // --- 时间流逝 ---
    const handleTimeSkip = async (type) => {
        const isNextDay = _handleTimeSkip(type, messageList, scrollToBottom);
        if (currentRole.value && currentRole.value.worldId) {
            tickWorldState(currentTime.value, currentRole.value.worldId);
        }
        let skipDesc = "";
        switch(type) {
            case 'morning': skipDesc = "一上午过去了"; break;
            case 'afternoon': skipDesc = "一下午过去了"; break;
            case 'night': skipDesc = "一晚上过去了"; break;
            case 'day': skipDesc = "一天过去了"; break;
            case 'custom': skipDesc = `${customMinutes.value}分钟过去了`; break;
        }
        
        messageList.value.push({
            role: 'system',
            content: `⏳ ${skipDesc}... 当前时间为 ${formattedTime.value}`,
            isSystem: true
        });
        
        const timePrompt = `[SYSTEM EVENT: TIME_SKIP]\n**Action**: ${skipDesc}.\n**New Time**: ${formattedTime.value}.\n**Instruction**: 考虑到时间的流逝，请根据当前时间点（是否该吃饭、睡觉、上班等）自然地继续对话或发起新话题。`;
        sendMessage(false, timePrompt);
        
        if (isNextDay) {
            await runDayEndSummary();
        }
        scrollToBottom();
    };

    // --- 强制移动 (God Mode) ---
    const handleForceMove = (locObj) => {
        const targetName = typeof locObj === 'object' ? (locObj.detail || locObj.name || '') : locObj;
        if (!targetName) return uni.showToast({ title: '无效地点', icon: 'none' });
        
        playerLocation.value = targetName;
        console.log(`🛠️ [God Mode] 玩家位置强制修正为: ${targetName}`);
        
        if (playerLocation.value === currentLocation.value) {
            interactionMode.value = 'face';
        } else {
            interactionMode.value = 'phone';
        }
        saveCharacterState();
        uni.showToast({ title: `已修正为: ${targetName}`, icon: 'none' });
    };

    // --- 正常移动 ---
    const handleMoveTo = (locObj) => {
        if (isLoading.value) return uni.showToast({ title: '对话进行中...', icon: 'none' });
        const targetName = typeof locObj === 'object' ? (locObj.detail || locObj.name || '') : locObj;
        if (targetName === 'custom' && !customLocation.value) return uni.showToast({ title: '请输入地点', icon: 'none' });
        const finalLocationName = targetName === 'custom' ? customLocation.value : targetName;

        const result = calculateMoveResult({ name: finalLocationName, type: locObj.type });
        console.log(`📍 [私聊移动] 玩家目标: ${result.playerLocation}`);
        playerLocation.value = result.playerLocation;
        
        const pLoc = playerLocation.value || "";
        const cLoc = currentLocation.value || "";
        const isTogether = pLoc === cLoc || pLoc.includes(cLoc) || cLoc.includes(pLoc);
        
        if (isTogether) {
             interactionMode.value = 'face';
             console.log("📍 [移动判定] 位置重叠 -> 切换为 Face 模式");
        } else {
             interactionMode.value = 'phone';
             console.log("📍 [移动判定] 位置分离 -> 切换为 Phone 模式");
        }
        
        showLocationPanel.value = false;
        uni.vibrateShort();
        saveCharacterState();

        if (result.shouldNotifyAI) {
            let realSysMsg = isTogether ? `你抵达了 ${pLoc}。${chatName.value} 也在这一带。` : `你抵达了 ${pLoc}。${chatName.value} 目前在 ${cLoc}。`;
            messageList.value.push({ role: 'system', content: `🚗 ${realSysMsg}`, isSystem: true });
            const movePrompt = `[SYSTEM EVENT: PLAYER MOVE]\n**Player Action**: Moved to ${playerLocation.value}.\n**Your Location**: ${currentLocation.value} (STAY WHERE YOU ARE).\n**Current Mode**: ${interactionMode.value === 'face' ? 'FACE-TO-FACE' : 'PHONE'}.\n**Instruction**: Do not hallucinate that you moved. Continue current interaction naturally.`;
            sendMessage(false, movePrompt);
        } else {
            uni.showToast({ title: `已抵达 ${playerLocation.value}`, icon: 'none' });
        }
    };

    // --- AI 响应处理 ---
    const processAIResponse = async (rawText) => {
        if (!rawText) return;

        const currentMode = isEmbedded ? 'device' : (interactionMode.value === 'face' ? 'reality' : 'device');

        let thinkContent = "";
        let mainContent = rawText; 
        
        const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
        if (thinkMatch) {
            thinkContent = thinkMatch[1].trim(); 
            mainContent = rawText.replace(/<think>[\s\S]*?<\/think>/i, '').trim(); 
        }

        if (showThought.value && thinkContent) {
            const thinkMsg = {
                id: Date.now() + Math.random(),
                role: 'model',
                type: 'think', 
                content: `💭 ${thinkContent}`,
                isSystem: true,
                source_mode: currentMode
            };
            messageList.value.push(thinkMsg);
            await saveHistory(thinkMsg);
        } 

        if (mainContent) {
             let tempText = mainContent
                .replace(/\n\s*([”"’])/g, '$1')     
                .replace(/([“"‘])\s*\n/g, '$1')     
                .replace(/([（\(])/g, '|||$1')      
                .replace(/([）\)])/g, '$1|||')      
                .replace(/(\r\n|\n|\r)+/g, '|||')   
                .replace(/(?:\|\|\|)+/g, '|||');    
                
             const parts = tempText.split('|||');
             
             for (const part of parts) {
                 let cleanPart = part.trim();
                 if (cleanPart && (messageList.value.length === 0 || messageList.value[messageList.value.length - 1].content !== cleanPart)) {
                     const newMsg = {
                         id: Date.now() + Math.random(),
                         role: 'model', 
                         content: cleanPart,
                         source_mode: currentMode
                     };
                     
                     messageList.value.push(newMsg);
                     await saveHistory(newMsg);
                 }
             }
        }
        
        scrollToBottom();
        
        if (rawText) {
            let lastUserMsg = "";
            for (let i = messageList.value.length - 2; i >= 0; i--) {
                const m = messageList.value[i];
                if (m.role === 'user' || (m.isSystem && m.content.includes('拍'))) { 
                    lastUserMsg = m.content; 
                    break; 
                }
            }
            
            console.log('--- 💬 对话监控 ------------------------------------------');
            console.log(`🗣️ [玩家]: ${lastUserMsg}`);
            console.log(`🤖 [角色(RAW)]: ${rawText}`); 
            
            // 触发 Agent 检查
            setTimeout(() => {
                console.log('🚦 [后台导演] 全并行策略启动...');
                runRelationCheck(lastUserMsg, rawText); 
                checkAndRunSummary(); 
                runSceneCheck(lastUserMsg, rawText);
            
                const isSystemSnapshot = lastUserMsg.includes('SNAPSHOT') || lastUserMsg.includes('📷'); 
                
                if (isSystemSnapshot) {
                    runCameraManCheck(lastUserMsg, rawText);
                } else {
                    runVisualDirectorCheck(lastUserMsg, rawText);
                }
            }, 500);
        }
    };

    // --- 发送消息 ---
    const sendMessage = async (isContinue = false, systemOverride = '') => {
        if (!isContinue && !inputText.value.trim() && !systemOverride) return;
        if (isLoading.value) return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return uni.showToast({ title: '请配置模型', icon: 'none' });
        
        let userMsgForRecall = inputText.value;

        if (!isContinue) {
            if (inputText.value.trim()) { 
                console.log(`🚀 [发送消息]: ${inputText.value}`);
                
                const currentMode = isEmbedded ? 'device' : (interactionMode.value === 'face' ? 'reality' : 'device');

                const userMsg = { 
                     id: Date.now() + Math.random(),
                     role: 'user', 
                     content: inputText.value,
                     source_mode: currentMode
                };
                messageList.value.push(userMsg); 
                inputText.value = ''; 
                
                await saveHistory(userMsg);
            } 
            else if (systemOverride && (systemOverride.includes('SNAPSHOT') || systemOverride.includes('SHUTTER') || systemOverride.includes('快门'))) { 
                console.log(`⚙️ [系统触发]: ${systemOverride.slice(0, 50)}...`);
                
                const currentMode = isEmbedded ? 'device' : (interactionMode.value === 'face' ? 'reality' : 'device');

                const sysMsg = { 
                    role: 'system', 
                    content: '📷 (你举起手机拍了一张)', 
                    isSystem: true,
                    source_mode: currentMode
                };
                messageList.value.push(sysMsg); 
                await saveHistory(sysMsg);
            }
        }

        scrollToBottom(); 
        isLoading.value = true; 
        
        const appUser = uni.getStorageSync('app_user_info') || {};
        if (appUser.name) userName.value = appUser.name;

        // 记忆系统逻辑
        let recallDetail = null;
        if (!isContinue && !systemOverride && userMsgForRecall) {
            recallDetail = await checkHistoryRecall(userMsgForRecall);
        }

        let activeMemory = "";
        try {
            activeMemory = await fetchActiveMemoryContext();
            if (activeMemory) console.log("🧠 [Active Memory] 已注入短期记忆上下文");
        } catch (e) { console.error("Active memory error:", e); }

        const prompt = buildSystemPrompt({
            role: currentRole.value || {}, userName: userName.value, summary: currentSummary.value,
            formattedTime: formattedTime.value, location: currentLocation.value, mode: interactionMode.value,
            activity: currentActivity.value, clothes: currentClothing.value, relation: currentRelation.value
        });

        const historyLimit = charHistoryLimit.value; 
        let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
        if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
        
        const cleanHistoryForAI = contextMessages.map(item => ({ 
            role: item.role === 'user' ? 'user' : 'assistant', 
            content: item.content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\[.*?\]/gi, '').trim() 
        })).filter(m => m.content);

        if (activeMemory) {
            cleanHistoryForAI.unshift({
                role: 'system',
                content: activeMemory
            });
        }

        if (recallDetail) {
            cleanHistoryForAI.push({ 
                role: 'system', 
                content: `[Recall Detail]: The following is a detailed diary entry of the past event user mentioned: "${recallDetail}". Use this to answer correctly.` 
            });
        }

        if (systemOverride) cleanHistoryForAI.push({ role: 'user', content: systemOverride });
        
        try {
            const rawText = await LLM.chat({ 
                config, 
                messages: cleanHistoryForAI, 
                systemPrompt: prompt, 
                temperature: 0.8, 
                maxTokens: 1500
            });
       
            if (rawText) {
                await processAIResponse(rawText);
            } else {
                uni.showToast({ title: '无内容响应', icon: 'none' });
            }

        } catch (e) { 
            console.error(e); 
            uni.showToast({ title: '网络/API错误', icon: 'none' }); 
        } finally { 
            isLoading.value = false; 
            scrollToBottom(); 
        }
    };

    const triggerNextStep = () => {
        if (isLoading.value) return;
        sendMessage(true, `[System Command: NARRATIVE_CONTINUATION]\n**Status**: User waiting.\n**Task**: Finish msg or initiate action.\n**Rules**: No repeat.`);
    };

    const handleCameraSend = () => {
        if (interactionMode.value !== 'face') return uni.showToast({ title: '非见面模式无法抓拍', icon: 'none' });
        const cameraPrompt = `(你举起手机，寻找一个合适的角度，按下了快门。由于是在这种氛围下，她可能会注意到你的镜头并给出反应，也可能正专注于自己的事而完全没察觉。请根据当前情境自然衔接剧情。)`;
        sendMessage(false, cameraPrompt);
    };

    const checkProactiveGreeting = () => {
        if (!chatId.value || !currentRole.value || !currentRole.value.allowProactive) return;
        const now = Date.now();
        const lastActiveTime = uni.getStorageSync(`last_real_active_time_${chatId.value}`) || 0;
        const hoursSinceActive = (now - lastActiveTime) / (1000 * 60 * 60);
        if (hoursSinceActive < (currentRole.value.proactiveInterval || 4)) {
            uni.setStorageSync(`last_real_active_time_${chatId.value}`, now);
            return; 
        }
        const gameDate = new Date(currentTime.value);
        const gameHour = gameDate.getHours();
        let gameTimeDesc = "daytime";
        if (gameHour >= 6 && gameHour < 11) gameTimeDesc = "morning";
        else if (gameHour >= 22 || gameHour < 5) gameTimeDesc = "late night";
        const triggerPrompt = `[系统事件: 用户回归]\n**背景**: 用户离开 ${Math.floor(hoursSinceActive)} 小时。\n**游戏时间**: ${gameTimeDesc} (${gameHour}:00)。\n**任务**: 主动发起对话 (简体中文，简短，30字内)。`;
        sendMessage(false, triggerPrompt);
        uni.setStorageSync(`last_real_active_time_${chatId.value}`, now);
    };

    const handleRetry = async (msg) => {
        if (msg.content.includes('重试中') || msg.isRetrying) return;
        uni.vibrateShort();
        if (msg.isLogicError) {
            uni.showToast({ title: '正在重构思路...', icon: 'none' });
            await retryAgentGeneration(msg);
        } else if (msg.isError || msg.originalPrompt) {
            retryGenerateImage(msg);
        } else {
            try {
               await retryGenerateImage(msg);
            } catch (e) { console.error(e); }
        }
    };

    const loadRoleData = (id) => {
        const list = uni.getStorageSync('contact_list') || [];
        const target = list.find(item => String(item.id) === String(id));
        if (target) {
            currentRole.value = target;
            chatName.value = target.name;
            uni.setNavigationBarTitle({ title: target.name });
            currentLust.value = target.lust || 0;
            initTimeSync(target.lastTimeTimestamp || Date.now(), target.worldId);
            currentClothing.value = target.clothing || '便服';
            charHome.value = target.location || '角色家';
            
            // 🔥 核心修改：优先读取“世界观玩家档案”
            const worldProfiles = uni.getStorageSync('app_world_player_profiles') || {};
            const worldProfile = target.worldId ? worldProfiles[target.worldId] : null;

            if (worldProfile && worldProfile.name) {
                userName.value = worldProfile.name;
            } else if (target.settings?.userNameOverride) {
                userName.value = target.settings.userNameOverride;
            } else {
                const appUser = uni.getStorageSync('app_user_info');
                userName.value = appUser?.name || '你';
            }

            if (worldProfile && worldProfile.location) {
                userHome.value = worldProfile.location;
            } else {
                userHome.value = target.settings?.userLocation || '玩家家';
            }

            if (worldProfile && worldProfile.appearance) {
                userAppearance.value = worldProfile.appearance;
            } else {
                userAppearance.value = target.settings?.userAppearance || '';
            }

            playerLocation.value = target.playerLocation || userHome.value;
            currentLocation.value = target.currentLocation || charHome.value;
            
            if (isEmbedded) {
                interactionMode.value = 'phone';
            } else {
                if (!target.interactionMode || playerLocation.value === currentLocation.value) {
                    interactionMode.value = (playerLocation.value === currentLocation.value) ? 'face' : 'phone';
                } else {
                    interactionMode.value = target.interactionMode;
                }
            }
            
            currentAction.value = target.currentAction || '站立/闲逛';
            currentActivity.value = target.lastActivity || '自由活动';
            currentRelation.value = target.relation || '初相识';
            enableSummary.value = target.enableSummary || false;
            summaryFrequency.value = target.summaryFrequency || 20;
            currentSummary.value = target.summary || "";
            charHistoryLimit.value = target.historyLimit || 20;
            
            const allWorlds = uni.getStorageSync('app_world_settings') || [];
            const myWorld = allWorlds.find(w => String(w.id) === String(target.worldId));
            if (myWorld && myWorld.locations && myWorld.locations.length > 0) {
                worldLocations.value = myWorld.locations.map(loc => ({ name: loc, icon: '📍' }));
            } else {
                const globalLocs = uni.getStorageSync('app_world_locations');
                if (globalLocs) { worldLocations.value = globalLocs; } 
                else { worldLocations.value = [{ name: '学校', icon: '🏫' }, { name: '公司', icon: '🏢' }]; }
            }
        }
    };

    const clearHistoryAndReset = () => {
        uni.showModal({
            title: '彻底重置', 
            content: '确定要重置该角色吗？\n她将遗忘所有过往记忆，变为“陌生人”。',
            confirmColor: '#ff4d4f',
            success: (res) => {
                if (res.confirm) {
                    playerLocation.value = userHome.value;
                    currentLocation.value = charHome.value;
                    interactionMode.value = (playerLocation.value === currentLocation.value) ? 'face' : 'phone';
                    messageList.value = [];
                    if (chatId.value) {
                        const contacts = uni.getStorageSync('contact_list') || [];
                        const idx = contacts.findIndex(c => String(c.id) === String(chatId.value));
                        if (idx !== -1) {
                            contacts[idx].resetTime = Date.now(); 
                            contacts[idx].affection = 0;
                            contacts[idx].summary = ""; 
                            uni.setStorageSync('contact_list', contacts);
                        }
                        DB.execute(`DELETE FROM messages WHERE chatId = '${chatId.value}'`);
                        DB.execute(`DELETE FROM diaries WHERE roleId = '${chatId.value}'`);
                    }
                    saveCharacterState();
                    uni.showToast({ title: '角色已重置', icon: 'none' });
                    setTimeout(() => uni.navigateBack(), 800);
                }
            }
        });
    };

    const init = async (newId) => {
        if (!newId) return;
        chatId.value = newId;
        loadRoleData(newId);
        try {
            const history = await DB.select(
                `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC`,
                [String(newId)]
            );
            if (history && history.length > 0) {
                messageList.value = history.map(m => ({
                    ...m,
                    isSystem: !!m.isSystem
                }));
            } else {
                messageList.value = [];
            }
            scrollToBottom();
            
            startTimeFlow();
            setTimeout(() => checkProactiveGreeting(), 1000);
        } catch (e) { console.error('加载数据库历史失败', e); }
    };

    // ==================================================================================
    // 6. 辅助工具
    // ==================================================================================
    const previewImage = (url) => {
        if (!url) return;
        uni.previewImage({ urls: [url] });
    };

    // ==================================================================================
    // 7. 生命周期管理
    // ==================================================================================
    
    onMounted(() => {
        const appUser = uni.getStorageSync('app_user_info');
        if (appUser) {
            if (appUser.name) userName.value = appUser.name;
            if (appUser.avatar) userAvatar.value = appUser.avatar;
        }
        if (initialChatId) {
            init(initialChatId);
        }
    });

    onUnmounted(() => { 
        stopTimeFlow(); 
        saveCharacterState(); 
    });

    // ==================================================================================
    // 8. 返回 API
    // ==================================================================================
    return {
        // State
        chatId,
        chatName,
        currentRole,
        messageList,
        visibleMessageList, // 🔥 UI 应该主要使用这个
        inputText,
        isLoading,
        scrollIntoView,
        
        // Character State
        currentAction,
        userName,
        userAvatar,
        userHome,
        userAppearance,
        charHome,
        currentAffection,
        currentLust,
        currentLocation,
        interactionMode,
        currentClothing,
        currentActivity,
        currentRelation,
        playerLocation,
        relationshipStatus,
        isArchiving,
        
        // Time
        formattedTime,
        timeParts,
        wakeTime,
        tempDateStr,
        tempTimeStr,
        tempTimeRatio,
        customMinutes,
        
        // Settings & UI Flags
        showThought,
        showLocationPanel,
        showTimePanel,
        showTimeSettingPanel,
        customLocation,
        locationList,
        worldLocations,
        
        // Actions
        init,
        loadRoleData,
        sendMessage,
        handleRetry,
        handleCameraSend,
        triggerNextStep,
        clearHistoryAndReset,
        toggleThought,
        scrollToBottom,
        previewImage,
        
        // Time Actions
        onSleepTimeChange,
        handleTimeSkip,
        confirmManualTime,
        
        // Location Actions
        handleMoveTo,
        handleForceMove,
        
        // Helpers
        saveCharacterState
    };
}
