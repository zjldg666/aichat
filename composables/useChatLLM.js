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

		// 1. 先安全提取思考内容 (只提取，不替换)
		const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
		if (thinkMatch) {
			thinkContent = thinkMatch[1].trim();
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

			// ==============================
			// ✨ 第一处修改：在这里拦截并清洗 [OPEN_SHOP]
			// ==============================
			let wantsToShop = false;
			if (/\[OPEN_SHOP\]/i.test(mainContent)) {
				wantsToShop = true;
				// 把暗号从对话里清洗掉，不给玩家看到
				mainContent = mainContent.replace(/\[BUY:\s*(.+?)\s*,\s*(\d+)\s*,\s*(ai|player)\s*\]/gi, '')
					.trim();
			}
			// ✨ 修改 1：容忍价格带有 ¥、$、元 等符号
			const buyRegex = /\[BUY:\s*(.+?)\s*,\s*([^,\]]+)\s*,\s*(ai|player)\s*\]/gi;
			let match;
			const char = currentRole.value;
			let sysMsgs = [];
			while ((match = buyRegex.exec(mainContent)) !== null) {
				const itemName = match[1].trim();
				// ✨ 修改 2：强行剔除价格里的非数字符号（比如把 "¥30" 变成 "30"）
				const itemPrice = parseInt(match[2].replace(/[^\d]/g, ''), 10);
				const payer = match[3].trim();

				if (char && char.economy) {
					let eco = char.economy;
					let buySuccess = false;
					let sysMsg = '';

					if (eco.isSharedWallet) {
						// 共享钱包
						let totalMoney = (Number(eco.userWallet) || 0) + (Number(eco.charWallet) || 0);
						if (totalMoney >= itemPrice) {
							let remainCost = itemPrice;
							if (eco.userWallet >= remainCost) {
								eco.userWallet -= remainCost;
							} else {
								remainCost -= eco.userWallet;
								eco.userWallet = 0;
								eco.charWallet -= remainCost;
							}
							buySuccess = true;
							sysMsg = payer === 'player' ? `💰 (你用共同财产为她支付了 ¥${itemPrice} 购买【${itemName}】)` :
								`💰 (她用共同财产支付了 ¥${itemPrice} 购买【${itemName}】)`;
						} else {
							sysMsg = `❌ (想买【${itemName}】，但你们的共同财产不够了...)`;
						}
					} else {
						// 各付各的
						if (payer === 'player') {
							if (eco.userWallet >= itemPrice) {
								eco.userWallet -= itemPrice;
								buySuccess = true;
								sysMsg = `💰 (你自掏腰包支付了 ¥${itemPrice} 为她购买【${itemName}】)`;
							} else {
								sysMsg = `❌ (她想让你买【${itemName}】，但你钱包里的钱不够了...)`;
							}
						} else if (payer === 'ai') {
							if (eco.charWallet >= itemPrice) {
								eco.charWallet -= itemPrice;
								buySuccess = true;
								sysMsg = `💰 (她自己花 ¥${itemPrice} 购买了【${itemName}】)`;
							} else {
								sysMsg = `❌ (她想自己买【${itemName}】，但她的小金库没钱了...)`;
							}
						}
					}

					if (buySuccess) {
						// ✨ 新增：去超市大本营里查一下该物品的属性，补全图标和耐久度
						let maxUses = 1,
							icon = '🛍️',
							type = 'custom',
							desc = '网购送达的物品';
						try {
							const storedCatalog = uni.getStorageSync('shop_catalog') || [];
							for (const cat of storedCatalog) {
								const found = cat.items.find(i => i.name === itemName);
								if (found) {
									maxUses = found.maxUses || 1;
									icon = found.icon || '🛍️';
									type = found.type || 'custom';
									desc = found.desc || '';
									break;
								}
							}
						} catch (e) {}

						if (!eco.courierBox) eco.courierBox = [];
						eco.courierBox.push({
							id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
							name: itemName,
							icon: icon, // 继承真实图标
							type: type,
							desc: desc,
							price: itemPrice,
							maxUses: maxUses, // ✨ 继承耐久度
							usesLeft: maxUses // ✨ 初始化可用次数
						});
						// 同步一下旧版wallet
						eco.wallet = eco.isSharedWallet ? (eco.userWallet + eco.charWallet) : eco.userWallet;
						charStore.saveCharacterData({
							economy: eco
						});
					}
					sysMsgs.push(sysMsg);
				}
			}

			// 清洗掉文本中的 [BUY:xxx] 指令，不要展示给玩家
			mainContent = mainContent.replace(/\[BUY:\s*(.+?)\s*,\s*([^,\]]+)\s*,\s*(ai|player)\s*\]/gi, '')
				.trim();

			// 立即将产生的系统扣款消息推送到屏幕
			for (const msg of sysMsgs) {
				const newMsg = {
					id: Date.now() + Math.random(),
					role: 'system',
					content: msg,
					isSystem: true
				};
				messageList.value.push(newMsg);
				await saveHistory(newMsg);
			}
			// ✨✨✨ 拦截逻辑结束 ✨✨✨

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
			// ==============================
			// ✨ 第二处修改：截获 [OPEN_SHOP] 后，统计家里物品并发送清单
			// ==============================
			if (wantsToShop) {
				// 1. 扫描家里所有容器的库存 (计算缺什么)
				let homeInventoryStr = "【家里目前的物品状态】\n";
				const charData = currentRole.value;
				if (charData && charData.economy && charData.economy.containers) {
					let hasItem = false;
					for (const room in charData.economy.containers) {
						for (const container in charData.economy.containers[room]) {
							const items = charData.economy.containers[room][container];
							if (items && items.length > 0) {
								hasItem = true;
								// 统计同名物品数量
								const countMap = {};
								items.forEach(i => countMap[i.name] = (countMap[i.name] || 0) + 1);
								const itemStrs = Object.entries(countMap).map(([name, count]) =>
									`${name}x${count}`).join('、');
								homeInventoryStr += `- ${room}的${container}：包含 ${itemStrs}。\n`;
							}
						}
					}
					if (!hasItem) {
						homeInventoryStr += "家里现在空空如也，什么都没有。\n";
					}
				} else {
					homeInventoryStr += "家里现在空空如也，什么都没有。\n";
				}

				// 2. 获取超市商品清单
				let shopCatalogText = "";
				try {
					let storedCatalog = uni.getStorageSync('shop_catalog');
					if (!storedCatalog || storedCatalog.length === 0) {
						storedCatalog = DEFAULT_SHOP_CATALOG;
					}
					let catalogList = [];
					storedCatalog.forEach(cat => {
						cat.items.forEach(item => {
							catalogList.push(`- ${item.name} (¥${item.price})`);
						});
					});
					shopCatalogText = catalogList.join('\n');
				} catch (e) {
					shopCatalogText = "暂无商品数据";
				}

				// 延迟 1.5 秒，模拟 AI 正在拿手机看超市的时间差
				setTimeout(() => {
					// 将家里库存和超市清单一并告诉 AI
					const sysOverride = `[System Hidden Context: 你拿出了手机打开超市APP。
			${homeInventoryStr}
			
			【当前超市在售商品及价格】
			${shopCatalogText}
			
			【行动指令】
			1. 请对比家里的库存，看看缺什么，然后挑选你想买的商品。
			2. 决定买什么后，你**必须**在回复的最末尾单独起一行输出 [BUY:商品名,价格,ai或player]，否则购买不会生效！
			3. ⚠️绝对警告：[BUY] 指令里的价格必须与上述清单中的标价【一模一样】，严禁根据你的常识自行修改价格！
			4. 如果你们还在纠结谁付钱，你可以直接默认自己付(ai)或让玩家付(player)。]`;
					sendMessage(true, sysOverride);
				}, 1500);
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
			content: cleanAiResponse(item.content).replace(/\[.*?\]/gi, '').trim()
		})).filter(m => m.content);

		if (activeMemory) cleanHistoryForAI.unshift({
			role: 'system',
			content: activeMemory
		});
		// 🌟 1. 创建一个动态上下文收集器
		let dynamicContext = "";

		if (recallDetail) {
			dynamicContext +=
				`\n[Recall Detail]: The following is a detailed diary entry of the past event user mentioned: "${recallDetail}". Use this to answer correctly.\n`;
		}

		if (interactionMode.value === 'face') {
			dynamicContext +=
				`\n[🏡 空间认知修正]: 针对同居设定的特别提醒：如果你们的设定是住在一起的亲密关系，请务必牢记家里的【卧室】是你们**两人共同的主卧（同睡一张床）**。绝对不要在心理活动或台词中产生“他回他自己房间”、“他怎么来我房间了”这种分居或疏离的错觉！\n`;
			const roomContainers = currentRole.value?.economy?.containers?.[currentLocation.value];
			if (roomContainers) {
				dynamicContext +=
					`\n[SYSTEM HIDDEN DATA: ENVIRONMENT STATE]\n当前房间【${currentLocation.value}】内的物品状态如下（仅供你作为背景参考）：\n`;
				for (const cName in roomContainers) {
					const items = roomContainers[cName].map(i => i.name).join('、');
					dynamicContext += items ? `- ${cName}状态：包含 ${items}。\n` : `- ${cName}状态：空的。\n`;
				}
				dynamicContext +=
					`⚠️ 绝对禁令：以上是系统底层数据！你在回复时【绝对禁止】像旁白一样复述这些环境和物品状态！你只能通过(动作)去与它们交互（比如拿起草莓），绝不允许把列表念出来！\n[/SYSTEM HIDDEN DATA]\n`;
			}
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