// AiChat/composables/useChatLLM.js
// 专门负责大模型对话请求、系统 Prompt 拼接、返回文本清洗与拦截
import {
	LLM
} from '@/services/llm.js';
import {
	buildSystemPrompt
} from '@/core/prompt-builder.js';

export function useChatLLM(context) {
	const {
		// 状态变量
		messageList,
		inputText,
		isLoading,
		chatName,
		chatId,
		userName,
		currentRole,
		interactionMode,
		currentLocation,
		playerLocation,
		currentActivity,
		currentClothing,
		currentRelation,
		formattedTime,
		currentSummary,
		charHistoryLimit,
		showThought,
		// 方法
		charStore,
		saveHistory,
		scrollToBottom,
		getCurrentLlmConfig,
		checkHistoryRecall,
		fetchActiveMemoryContext,
		saveCharacterState,
		runRelationCheck,
		checkAndRunSummary,
		runSceneCheck,
		runCameraManCheck,
		runVisualDirectorCheck,
		retryAgentGeneration,
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
			const mdThinkMatch = rawText.match(
				/(?:\*\*思考\*\*|思考)[\s]*[:：]\s*([\s\S]*?)(?=(?:\*\*回复\*\*|回复|Response)[\s]*[:：]|$)/i);
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
		
		            // 🌟 终极气泡拆分大法 (纯净版，无延迟)
		            let formattedText = mainContent
		                .replace(/(\r\n|\r)/g, '\n')
		                // 拆分A：(动作) "台词" -> 强制切开
		                .replace(/([）\)])\s*(?=[“"‘])/g, '$1|||') 
		                // 拆分B："台词" (动作) -> 强制切开
		                .replace(/([”"’])\s*(?=[（\(])/g, '$1|||')
		                // 拆分C：(动作) 喂？ -> 如果动作后面直接跟没引号的文字，也强行切开！
		                .replace(/([）\)])\s*(?=[^\s（\(])/g, '$1|||')
		                // 拆分D：换行符切开
		                .replace(/\n+/g, '|||');
		
		            // 过滤掉空字符串
		            const parts = formattedText.split('|||').filter(p => p.trim());
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

				let isCameraAction = lastUserMsg.includes('SNAPSHOT') || lastUserMsg.includes(
					'SHUTTER') || lastUserMsg.includes('快门');

				if (isCameraAction) {
					sceneCheckPromise.then(() => {
						runCameraManCheck(lastUserMsg, rawText);
					});
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
		if (!config || !config.apiKey) return uni.showToast({
			title: '请配置模型',
			icon: 'none'
		});

		let userMsgForRecall = inputText.value;

		if (!isContinue) {
			if (inputText.value.trim()) {
				const userMsg = {
					id: Date.now() + Math.random(),
					role: 'user',
					content: inputText.value
				};
				messageList.value.push(userMsg);
				inputText.value = '';
				await saveHistory(userMsg);
			} else if (systemOverride && (systemOverride.includes('SNAPSHOT') || systemOverride.includes(
					'SHUTTER') || systemOverride.includes('快门'))) {
				const sysMsg = {
					role: 'system',
					content: '📷 (你举起手机拍了一张)',
					isSystem: true
				};
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
			content: item.content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\[.*?\]/gi, '')
				.trim()
		})).filter(m => m.content);

		if (activeMemory) cleanHistoryForAI.unshift({
			role: 'system',
			content: activeMemory
		});
	// 🌟 1. 创建一个动态上下文收集器
        let dynamicContext = "";

        if (recallDetail) {
            dynamicContext += `\n[Recall Detail]: The following is a detailed diary entry of the past event user mentioned: "${recallDetail}". Use this to answer correctly.\n`;
        }

        if (interactionMode.value === 'face') {
            const roomContainers = currentRole.value?.economy?.containers?.[currentLocation.value];
            if (roomContainers) {
                dynamicContext += `\n[SYSTEM HIDDEN DATA: ENVIRONMENT STATE]\n当前房间【${currentLocation.value}】内的物品状态如下（仅供你作为背景参考）：\n`;
                for (const cName in roomContainers) {
                    const items = roomContainers[cName].map(i => i.name).join('、');
                    dynamicContext += items ? `- ${cName}状态：包含 ${items}。\n` : `- ${cName}状态：空的。\n`;
                }
                dynamicContext += `⚠️ 绝对禁令：以上是系统底层数据！你在回复时【绝对禁止】像旁白一样复述这些环境和物品状态！你只能通过(动作)去与它们交互（比如拿起草莓），绝不允许把列表念出来！\n[/SYSTEM HIDDEN DATA]\n`;
            }
        }

        if (interactionMode.value === 'face' && playerLocation.value !== currentLocation.value) {
            dynamicContext += `\n[Spatial Context]: 玩家当前在【${playerLocation.value}】，而你当前在【${currentLocation.value}】。你们在同一个屋檐下的不同房间，正在隔空对话。你的回复应当符合这种空间距离感（比如大声喊话）。如果你想走过去找玩家，可以在回复中加入动作描写，如：(走出${currentLocation.value}，来到${playerLocation.value})。\n`;
        }

        if (systemOverride) {
            dynamicContext += `\n${systemOverride}\n`;
        }

        // 🌟 2. 将收集到的所有上下文，悄悄塞进玩家的最后一条消息里！
        if (dynamicContext) {
            if (cleanHistoryForAI.length > 0 && cleanHistoryForAI[cleanHistoryForAI.length - 1].role === 'user') {
                // 如果最后一条是玩家发的话，直接追加在后面
                cleanHistoryForAI[cleanHistoryForAI.length - 1].content += `\n\n${dynamicContext}`;
            } else {
                // 如果没有玩家消息，则伪装成一条新的 user 消息发过去
                cleanHistoryForAI.push({ role: 'user', content: dynamicContext });
            }
        }

		try {
			const rawText = await LLM.chat({
				config,
				messages: cleanHistoryForAI,
				systemPrompt: prompt,
				temperature: 0.8,
				maxTokens: 1500
			});
			// ✨✨✨ 在这里添加日志！第一时间打印大模型的原始回复 ✨✨✨
			console.log("👽 [大模型最原始的返回内容]:\n", rawText);
			if (rawText) {
				await processAIResponse(rawText);
			} else {
				uni.showToast({
					title: '无内容响应',
					icon: 'none'
				});
			}

		} catch (e) {
			console.error(e);
			uni.showToast({
				title: '网络/API错误',
				icon: 'none'
			});
		} finally {
			isLoading.value = false;
			scrollToBottom();
		}
	};

	const triggerNextStep = () => {
		if (isLoading.value) return;
		sendMessage(true,
			`[System Command: NARRATIVE_CONTINUATION]\n**Status**: User waiting.\n**Task**: Finish msg or initiate action.\n**Rules**: No repeat.`
			);
	};

	const handleRetry = async (msg) => {
		if (msg.content.includes('重试中') || msg.isRetrying) return;
		uni.vibrateShort();

		if (msg.isLogicError) {
			uni.showToast({
				title: '正在重构思路...',
				icon: 'none'
			});
			await retryAgentGeneration(msg);
		} else if (msg.isError || msg.originalPrompt) {
			retryGenerateImage(msg);
		} else {
			try {
				await retryGenerateImage(msg);
			} catch (e) {
				console.error(e);
			}
		}
	};

	return {
		processAIResponse,
		sendMessage,
		triggerNextStep,
		handleRetry
	};
}