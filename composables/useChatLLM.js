// AiChat/composables/useChatLLM.js
// 专门负责大模型对话请求、系统 Prompt 拼接、返回文本清洗与拦截
import { LLM } from '@/services/llm.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';

export function useChatLLM(context) {
    const {
        // 状态变量
        messageList, inputText, isLoading, chatName, chatId, userName,
        currentRole, interactionMode, currentLocation, playerLocation,
        currentActivity, currentClothing, currentRelation, formattedTime,
        currentSummary, charHistoryLimit, showThought,
        // 方法
        charStore, saveHistory, scrollToBottom, getCurrentLlmConfig,
        checkHistoryRecall, fetchActiveMemoryContext, saveCharacterState,
        runRelationCheck, checkAndRunSummary, runSceneCheck,
        runCameraManCheck, runVisualDirectorCheck, retryAgentGeneration,
        retryGenerateImage
    } = context;

    const processAIResponse = async (rawText) => {
        if (!rawText) return;

        let thinkContent = "";
        let mainContent = rawText; 

        const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
        if (thinkMatch) {
            thinkContent = thinkMatch[1].trim();
            mainContent = rawText.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
        } else {
            const mdThinkMatch = rawText.match(/(?:\*\*思考\*\*|思考)[\s]*[:：]\s*([\s\S]*?)(?=(?:\*\*回复\*\*|回复|Response)[\s]*[:：]|$)/i);
            if (mdThinkMatch) {
                thinkContent = mdThinkMatch[1].trim();
            }
        }

        const replyRegex = /(?:\*\*回复\*\*|回复|Response)[\s]*[:：]\s*([\s\S]*)$/i;
        const replyMatch = mainContent.match(replyRegex);

        if (replyMatch) {
            mainContent = replyMatch[1].trim();
        } else {
            mainContent = mainContent.replace(/\[.*?\][\s]*[:：][^\n]*\n/g, '');
            mainContent = mainContent.replace(/\*\*.*?\*\*[\s]*[:：][^\n]*\n/g, '');
            mainContent = mainContent.trim();
        }

        if (showThought.value && thinkContent) {
            const thinkMsg = {
                id: Date.now() + Math.random(),
                role: 'model',
                type: 'think', 
                content: `💭 ${thinkContent}`,
                isSystem: true 
            };
            messageList.value.push(thinkMsg);
            await saveHistory(thinkMsg);
        }

        if (mainContent) {
            saveCharacterState(); 

            let formattedText = mainContent
                .replace(/(\r\n|\r)/g, '\n')
                .replace(/([）\)])\s*\n\s*([“"‘])/g, '$1\n$2')
                .replace(/\n+/g, '|||');

            const parts = formattedText.split('|||');
            let hasAddedVoicePrefix = false; 

            for (const part of parts) {
                let cleanPart = part.trim();
                if (cleanPart && (messageList.value.length === 0 || messageList.value[messageList.value.length - 1].content !== cleanPart)) {

                    if (!hasAddedVoicePrefix && interactionMode.value === 'face' && playerLocation.value !== currentLocation.value) {
                        const sysNotice = {
                            id: Date.now() + Math.random(),
                            role: 'system',
                            content: `【声音从${currentLocation.value}传出】`,
                            isSystem: true
                        };
                        messageList.value.push(sysNotice);
                        await saveHistory(sysNotice);
                        hasAddedVoicePrefix = true;
                    }

                    const newMsg = {
                        id: Date.now() + Math.random(),
                        role: 'model',
                        content: cleanPart
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
            console.log('--- 📊 角色状态快照 ---------------------------------------');
            console.log(`📍 地点: ${currentLocation.value}`);
            console.log(`📱 模式: ${interactionMode.value === 'phone' ? '手机聊天' : '当面互动'}`);
            console.log('-----------------------------------------------------------');

            setTimeout(() => {
                console.log('🚦 [后台导演] 并行流水线启动...');
                const recentMsgs = messageList.value.slice(-6);

                runRelationCheck(lastUserMsg, rawText, recentMsgs);
                checkAndRunSummary();

                const sceneCheckPromise = runSceneCheck(lastUserMsg, rawText);

                if (lastUserMsg.includes('快门已按下') || lastUserMsg.includes('User took a photo')) {
                    console.log('🛑 [导演] 检测到手动快门的回响，跳过自动生图。');
                    return;
                }

                let isCameraAction = lastUserMsg.includes('SNAPSHOT') || lastUserMsg.includes('SHUTTER') || lastUserMsg.includes('快门');

                if (isCameraAction) {
                    sceneCheckPromise.then(() => { runCameraManCheck(lastUserMsg, rawText); });
                } else {
                    if (interactionMode.value === 'phone') {
                        runVisualDirectorCheck(lastUserMsg, rawText, null, sceneCheckPromise);
                    } else {
                        console.log('🛑 [流程] Face模式，跳过自动生图步骤');
                    }
                }
            }, 500);
        }
    };

    const sendMessage = async (isContinue = false, systemOverride = '') => {
        if (!isContinue && !inputText.value.trim() && !systemOverride) return;
        if (isLoading.value) return;
        
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return uni.showToast({ title: '请配置模型', icon: 'none' });

        let userMsgForRecall = inputText.value;

        if (!isContinue) {
            if (inputText.value.trim()) {
                const userMsg = { id: Date.now() + Math.random(), role: 'user', content: inputText.value };
                messageList.value.push(userMsg);
                inputText.value = '';
                await saveHistory(userMsg);
            } else if (systemOverride && (systemOverride.includes('SNAPSHOT') || systemOverride.includes('SHUTTER') || systemOverride.includes('快门'))) {
                const sysMsg = { role: 'system', content: '📷 (你举起手机拍了一张)', isSystem: true };
                messageList.value.push(sysMsg);
                await saveHistory(sysMsg);
            }
        }

        scrollToBottom();
        isLoading.value = true;

        const appUser = uni.getStorageSync('app_user_info') || {};
        if (appUser.name) userName.value = appUser.name;

        let recallDetail = null;
        if (!isContinue && !systemOverride && userMsgForRecall) {
            recallDetail = await checkHistoryRecall(userMsgForRecall);
        }

        let activeMemory = "";
        try {
            activeMemory = await fetchActiveMemoryContext();
        } catch (e) {
            console.error("Active memory error:", e);
        }

        const prompt = buildSystemPrompt({
            role: currentRole.value || {},
            userName: userName.value,
            summary: currentSummary.value,
            formattedTime: formattedTime.value,
            location: currentLocation.value,
            mode: interactionMode.value,
            activity: currentActivity.value,
            clothes: currentClothing.value,
            relation: currentRelation.value
        });

        const historyLimit = charHistoryLimit.value;
        let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
        if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);

        const cleanHistoryForAI = contextMessages.map(item => ({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\[.*?\]/gi, '').trim()
        })).filter(m => m.content);

        if (activeMemory) cleanHistoryForAI.unshift({ role: 'system', content: activeMemory });
        
        if (recallDetail) cleanHistoryForAI.push({
            role: 'system',
            content: `[Recall Detail]: The following is a detailed diary entry of the past event user mentioned: "${recallDetail}". Use this to answer correctly.`
        });

        if (systemOverride) cleanHistoryForAI.push({ role: 'user', content: systemOverride });
        
        if (interactionMode.value === 'face') {
            const roomContainers = currentRole.value?.economy?.containers?.[currentLocation.value];
            if (roomContainers) {
                let envDesc = `[物理环境感知]: 你们现在在【${currentLocation.value}】。`;
                for (const cName in roomContainers) {
                    const items = roomContainers[cName].map(i => i.name).join('、');
                    envDesc += items ? `${cName}里目前有：${items}。` : `${cName}里是空的。`;
                }
                cleanHistoryForAI.push({ role: 'system', content: envDesc });
            }
        }
        
        if (interactionMode.value === 'face' && playerLocation.value !== currentLocation.value) {
            cleanHistoryForAI.push({
                role: 'system',
                content: `[Spatial Context]: 玩家当前在【${playerLocation.value}】，而你当前在【${currentLocation.value}】。你们在同一个屋檐下的不同房间，正在隔空对话。你的回复应当符合这种空间距离感（比如大声喊话）。如果你想走过去找玩家，可以在回复中加入动作描写，如：(走出${currentLocation.value}，来到${playerLocation.value})。`
            });
        }

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

    const handleRetry = async (msg) => {
        if (msg.content.includes('重试中') || msg.isRetrying) return;
        uni.vibrateShort();

        if (msg.isLogicError) {
            uni.showToast({ title: '正在重构思路...', icon: 'none' });
            await retryAgentGeneration(msg);
        } else if (msg.isError || msg.originalPrompt) {
            retryGenerateImage(msg);
        } else {
            try { await retryGenerateImage(msg); } catch (e) { console.error(e); }
        }
    };

    return {
        processAIResponse, sendMessage, triggerNextStep, handleRetry
    };
}