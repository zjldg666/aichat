// AiChat/composables/useChatLLM.js
// 专门负责大模型对话请求、系统 Prompt 拼接、返回文本清洗与拦截
import {
	LLM
} from '@/services/llm.js';
import {
	cleanAiResponse
} from '@/utils/textUtils.js';
import {
	buildSystemPrompt
} from '@/core/prompt-builder.js';
import {
	DEFAULT_SHOP_CATALOG
} from '@/utils/shop-data.js';
import {
	ToolRegistry
} from '@/services/agentTools.js';
import {
	ShoppingService
} from '@/services/shoppingService.js';
import {
	ActionService
} from '@/services/actionService.js';
export function useChatLLM(context) {
	const {
		toolLoadingMsg,
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

		// 1. 先安全提取思考内容 (只提取，不替换)
		const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
		let tMatch;
		const thoughts = [];

		// 循环抓取所有的 <think> 块
		while ((tMatch = thinkRegex.exec(rawText)) !== null) {
			if (tMatch[1].trim()) {
				thoughts.push(tMatch[1].trim());
			}
		}

		if (thoughts.length > 0) {
			// ✨ 核心优化：如果大模型思考了多次（比如触发了技能拦截），就把它们拼起来
			// 中间加一个自然的过渡提示，让心声剧情更连贯
			thinkContent = thoughts.join('\n\n(查阅记忆/环境后)...\n\n');
		} else {
			const mdThinkMatch = rawText.match(
				/(?:\*\*思考\*\*|思考)[\s]*[:：]\s*([\s\S]*?)(?=(?:\*\*回复\*\*|回复|Response)[\s]*[:：]|$)/i);
			if (mdThinkMatch) {
				thinkContent = mdThinkMatch[1].trim();
			}
		}

		// ✨ 2. 直接调用工具函数，把 rawText 洗得干干净净！
		mainContent = cleanAiResponse(rawText);

		// 3. 抹除前缀（兼容有些大模型喜欢加“**回复**：”的毛病）
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

			const shopResult = ShoppingService.processBuyCommands(mainContent, currentRole, charStore);
			mainContent = shopResult.cleanContent;
			let wantsToShop = shopResult.wantsToShop;

			// 立即将产生的系统扣款消息推送到屏幕
			for (const msg of shopResult.sysMsgs) {
				const newMsg = {
					id: Date.now() + Math.random(),
					role: 'system',
					content: msg,
					isSystem: true
				};
				messageList.value.push(newMsg);
				await saveHistory(newMsg);
			}
			// ✨ 新增：将物品消耗动作，外包给动作服务站
			const actionResult = ActionService.processActions(mainContent, currentRole, charStore);
			mainContent = actionResult.cleanContent;

			// 将消耗提示推送到屏幕
			for (const msg of actionResult.sysMsgs) {
				const newMsg = {
					id: Date.now() + Math.random(),
					role: 'system',
					content: msg,
					isSystem: true
				};
				messageList.value.push(newMsg);
				await saveHistory(newMsg);
			}

			// 🌟 终极气泡拆分大法 (纯净版，无延迟)
			let formattedText = mainContent
				.replace(/(\r\n|\r)/g, '\n')
				    // 拆分A：(动作) / *动作* / [动作] 后面跟引号 -> 强制切开
				    .replace(/([）\)\*\]])\s*(?=[“"‘])/g, '$1|||')
				    // 拆分B：引号后面跟 (动作) / *动作* / [动作] -> 强制切开
				    .replace(/([”"’])\s*(?=[（\(\*\[])/g, '$1|||')
				    // 拆分C：动作结尾后直接跟普通文字 -> 强行切开
				    .replace(/([）\)\*\]])\s*(?=[^\s（\(\*\[])/g, '$1|||')
				    .replace(/\n+/g, '|||');

			// 过滤掉空字符串
			const parts = formattedText.split('|||').filter(p => p.trim());
			let hasAddedVoicePrefix = false;


			for (const part of parts) {
				let cleanPart = part.trim();
				if (cleanPart && (messageList.value.length === 0 || messageList.value[messageList.value.length -
						1].content !== cleanPart)) {

					if (!hasAddedVoicePrefix && interactionMode.value === 'face' && playerLocation.value !==
						currentLocation.value) {
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
			// =========================================================
			// ✨ 重构：动态抓取超市目录，发射系统隐秘指令
			// =========================================================
			if (wantsToShop) {
				const sysOverride = ShoppingService.generateShopContext(currentRole);

				// 延迟 1.5 秒，模拟 AI 正在拿手机看超市的时间差
				setTimeout(() => {
					sendMessage(true, sysOverride);
				}, 1500);
			}
			// =====================================
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
				const recentMsgs = messageList.value.slice(-6);
				console.log('🚦 [调度总线] 启动：按依赖顺序调度特工...');

				// 将调度过程封装在一个不阻塞主 UI 的异步自执行函数中
				(async () => {
					try {
						// =========================================================
						// 🥇 阶段一：并行状态抽取 (高优先级，且必须等待完成)
						// =========================================================
						console.log('⏳ [调度总线-阶段1] 并行抽取场景与关系...');

						// Promise.allSettled 确保即使某个特工网络超时报错，也不会阻塞整个生图流程
						await Promise.allSettled([
							runSceneCheck(lastUserMsg, rawText),
							runRelationCheck(lastUserMsg, rawText, recentMsgs)
						]);

						console.log('✅ [调度总线-阶段1] 状态更新完毕，数据环境已就绪！');

						// =========================================================
						// 🥈 阶段二：串行生图 (必须等待阶段一的衣服/动作更新完毕)
						// =========================================================
						console.log('⏳ [调度总线-阶段2] 开始生图决策...');

						// 🚨 1. 扩大屏蔽词库：把合照/偷拍时系统注入的内心OS关键词加进去，防止误触生图
						const isManualPhotoEcho =
							lastUserMsg.includes('快门已按下') ||
							lastUserMsg.includes('User took a photo') ||
							lastUserMsg.includes('听到快门声') || // 👈 核心修复：精准屏蔽那句“刚刚听到快门声”的OS
							lastUserMsg.includes('偷拍我了');

						if (isManualPhotoEcho) {
							console.log('🛑 [导演] 检测到手动快门的回响或内心OS，跳过自动生图。');
						} else {
							// 🚨 2. 优化触发规则：建议给快门加上括号，防止普通聊天时带了这两个字被误伤
							let isCameraAction =
								lastUserMsg.includes('SNAPSHOT') ||
								lastUserMsg.includes('SHUTTER') ||
								lastUserMsg.includes(
								'[快门]'); // 如果你原本没有括号，建议保留原本的 includes('快门') 也可以，但最好统一用暗号

							// 兼容你原有的规则
							if (!isCameraAction && lastUserMsg.includes('快门') && !lastUserMsg
								.includes('听到快门声')) {
								isCameraAction = true;
							}

							if (isCameraAction) {
								// 等待场景分析完后，才让摄影师拍照
								await runCameraManCheck(lastUserMsg, rawText);
							} else {
								if (interactionMode.value === 'phone') {
									console.log('📸 [流程] Phone模式，启动自动生图...');
									await runVisualDirectorCheck(lastUserMsg, rawText, null,
										Promise.resolve());
								} else {
									console.log('🛑 [流程] Face模式，跳过自动生图步骤');
								}
							}
						}

						console.log('✅ [调度总线-阶段2] 生图决策/派发结束！');

						setTimeout(async () => {
							console.log('⏳ [调度总线-阶段3] 启动闲时后勤任务...');
							try {
								await checkAndRunSummary();
							} catch (e) {
								console.error('⚠️ 后勤任务报错:', e);
							}
						}, 3000);

					} catch (error) {
						console.error('⚠️ [调度总线] 严重崩溃:', error);
					}
				})();
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
			content: cleanAiResponse(item.content).replace(/\[.*?\]/gi, '').trim()
		})).filter(m => m.content);

		if (activeMemory) cleanHistoryForAI.unshift({
			role: 'system',
			content: activeMemory
		});
		// 🌟 1. 创建一个动态上下文收集器
		let dynamicContext = "";

		if (interactionMode.value === 'face') {
			dynamicContext +=
				`\n[🏡 空间认知修正]: 针对同居设定的特别提醒：如果你们的设定是住在一起的亲密关系，请务必牢记家里的【卧室】是你们**两人共同的主卧（同睡一张床）**。绝对不要在心理活动或台词中产生“他回他自己房间”、“他怎么来我房间了”这种分居或疏离的错觉！\n`;
		}

		if (interactionMode.value === 'face' && playerLocation.value !== currentLocation.value) {
			dynamicContext +=
				`\n[Spatial Context]: 玩家当前在【${playerLocation.value}】，而你当前在【${currentLocation.value}】。你们在同一个屋檐下的不同房间，正在隔空对话。你的回复应当符合这种空间距离感（比如大声喊话）。如果你想走过去找玩家，可以在回复中加入动作描写，如：(走出${currentLocation.value}，来到${playerLocation.value})。\n`;
		}

		if (systemOverride) {
			dynamicContext += `\n${systemOverride}\n`;
		}

		// 🌟 2. 将收集到的所有上下文，悄悄塞进玩家的最后一条消息里！
		if (dynamicContext) {
			if (cleanHistoryForAI.length > 0 && cleanHistoryForAI[cleanHistoryForAI.length - 1].role ===
				'user') {
				// 如果最后一条是玩家发的话，直接追加在后面
				cleanHistoryForAI[cleanHistoryForAI.length - 1].content += `\n\n${dynamicContext}`;
			} else {
				// 如果没有玩家消息，则伪装成一条新的 user 消息发过去
				cleanHistoryForAI.push({
					role: 'user',
					content: dynamicContext
				});
			}
		}

		try {
			console.log('==================================================');
			console.log('📚 [前端完整的原始消息列表 (含系统提示)]: ', JSON.parse(JSON.stringify(messageList.value)));
			console.log('📜 [即将发送给大模型的完整上下文]: ', JSON.parse(JSON.stringify(cleanHistoryForAI)));
			console.log('==================================================');
			const rawText = await LLM.chat({
				config,
				messages: cleanHistoryForAI,
				systemPrompt: prompt,
				temperature: 0.8,
				maxTokens: 1500
			});
			// ✨✨✨ 在这里添加日志！第一时间打印大模型的原始回复 ✨✨✨
			console.log("👽 [大模型最原始的返回内容]:\n", rawText);

			let finalText = rawText; // 默认情况下，最终显示的文本就是第一次请求的结果

			// 1. 检查是否触发了技能调用
			const callMatch = rawText.match(/\[CALL:\s*([^,\]]+)(?:,\s*([^\]]+))?\]/i);

			if (callMatch) {
				const skillName = callMatch[1].trim().toUpperCase();
				const skillParam = callMatch[2] ? callMatch[2].trim() : "";

				console.log(`🛠️ [技能触发] 大模型请求调用: ${skillName}, 参数: ${skillParam}`);

				// =========================================================
				// ✨ UX 掩眼法：给玩家展现极具沉浸感的动态提示
				// =========================================================
				if (toolLoadingMsg) {
					if (skillName === 'ENV') {
						toolLoadingMsg.value = `👀 ${currentRole.value?.name || '角色'}正在查看周围环境...`;
					} else if (skillName === 'WALLET') {
						toolLoadingMsg.value = `💰 ${currentRole.value?.name || '角色'}正在盘算钱包余额...`;
					} else if (skillName === 'MEMORY') {
						toolLoadingMsg.value = `💭 ${currentRole.value?.name || '角色'}正在努力回忆往事...`;
					} else {
						toolLoadingMsg.value = `⚙️ 正在执行复杂操作...`;
					}
				}

				let toolResult = "";

				// ✨✨ 核心重构：打包上下文，动态呼叫技能字典 ✨✨
				const toolContext = {
					currentRole,
					checkHistoryRecall
				};

				if (ToolRegistry[skillName]) {
					// 动态执行对应的技能函数
					toolResult = await ToolRegistry[skillName](skillParam, toolContext);
				} else {
					console.warn(`⚠️ 拦截到未知的技能调用: ${skillName}`);
				}
				// 3. 静默喂养：带着查到的结果，发起第二次请求！
				if (toolResult) {
					console.log("📡 [静默喂养] 发送技能结果给大模型...");

					// 提取出大模型调用技能前说的那半句话（包含 <think> 思考过程）
					let textBeforeCall = rawText.substring(0, callMatch.index).trim();

					// 🚨 核心修复：如果切断文本导致 <think> 标签没闭合，强行补齐！防止第二次思考格式崩溃
					const openThinks = (textBeforeCall.match(/<think>/gi) || []).length;
					const closeThinks = (textBeforeCall.match(/<\/think>/gi) || []).length;
					if (openThinks > closeThinks) {
						textBeforeCall += "\n</think>";
					}

					if (!textBeforeCall) {
						textBeforeCall = "(闭上眼睛，在脑海中快速回想...)";
					}

					cleanHistoryForAI.push({
						role: 'assistant',
						content: textBeforeCall
					});

					cleanHistoryForAI.push({
						role: 'user',
						content: `[SYSTEM TOOL RESULT (上帝视角隐秘反馈)]：\n${toolResult}\n\n(注意：以上数据仅供你参考，请直接用你的角色口吻和设定继续刚才的话题，绝对不要暴露你查询了数据！)`
					});

					// 发起第二次请求 (回旋闭环)
					const secondRawText = await LLM.chat({
						config,
						messages: cleanHistoryForAI,
						systemPrompt: prompt, // 保持初始 prompt 不变
						temperature: 0.8,
						maxTokens: 1000
					});

					console.log("🎯 [大模型拿到数据后的最终回复]:\n", secondRawText);

					// 最终展示给玩家的文本 = 技能调用前的半句话 + 拿到数据后的后半句话
					finalText = textBeforeCall + "\n" + secondRawText;
				}
			}

			if (finalText) {
				await processAIResponse(finalText);
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

			// ✨ 新增：重置动态提示词，干干净净迎接下一回合
			if (toolLoadingMsg) {
				toolLoadingMsg.value = '';
			}

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