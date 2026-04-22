<template>
	<view class="chat-container" :class="{ 'in-edit-mode': isEditMode, 'dark-mode': isDarkMode }">
		<view v-if="isArchiving" class="archiving-bar">
			<text class="archiving-text">🌙 整理中... 请勿退出</text>
		</view>

		<!-- 1. 顶部状态栏 -->
		<ChatHeader :wallet="wallet" :currentLocation="currentLocation"
			:currentActivity="currentActivity" :playerLocation="playerLocation" :timeParts="timeParts"
			@clickPlayer="showForceLocationPanel = true" @clickTime="showTimeSettingPanel = true"
			@clickWallet="showShopPanel = true" @clickCourier="handleOpenContainer('快递箱')"
			@clickContainer="handleOpenContainer" />

		<ShopPanel :visible="showShopPanel" :wallet="wallet" :currentRole="currentRole" @close="showShopPanel = false"
			@buy="handleBuyItem" />

		<!-- 2. 聊天内容区 -->
		<scroll-view class="chat-scroll" scroll-y="true" :scroll-into-view="scrollIntoView"
			:scroll-with-animation="true">
			<view class="chat-content">
				<view class="system-tip"><text>长按对话内容可进入多选删除模式</text></view>

				<ChatMessageItem v-for="(msg, index) in messageList" :key="msg.id || index" :id="'msg-' + index"
					:msg="msg" :isEditMode="isEditMode" :isSelected="selectedIds.includes(msg.id)"
					:roleAvatar="currentRole?.avatar" :userAvatar="userAvatar" @longPress="enterEditMode"
					@toggleSelect="toggleSelect" @retry="handleRetry" @preview="previewImage" />

				<view v-if="isLoading" class="loading-wrapper">
					<view class="loading-dots">{{ toolLoadingMsg || '正在思考中...' }}</view>
				</view>
				<view id="scroll-bottom" style="height: 20rpx;"></view>
			</view>
		</scroll-view>
		<!-- 3. 底部工具栏 -->
		<ChatFooter :isEditMode="isEditMode" :selectedCount="selectedIds.length" :isToolbarOpen="isToolbarOpen"
			v-model="inputText" :wakeTime="wakeTime" :showThought="showThought"
			:showInviteAction="showResidentInviteAction" @cancelEdit="cancelEdit"
			@confirmDelete="confirmDelete" @toggleToolbar="toggleToolbar" @send="sendMessage(false)"
			@clickInvite="handleInviteAction"
			@clickTime="showTimePanel = true" @clickLocation="showLocationPanel = true"
			@sleepTimeChange="onSleepTimeChange" @clickCamera="handleCameraSend"
			@clickStealthCamera="handleStealthCameraSend" @clickGroupCamera="handleGroupCameraSend"
			@clickGodView="handleGodViewSend" @clickContinue="triggerNextStep" @toggleThought="toggleThought" />

		<!-- 4. 弹窗面板 -->
		<ChatModals :visibleModal="activeModal" :locationList="locationList" :currentRole="currentRole"
			v-model:tempDateStr="tempDateStr" v-model:tempTimeStr="tempTimeStr" v-model:tempTimeRatio="tempTimeRatio"
			@close="closeModal" @timeSkip="handleTimeSkip" @confirmTime="confirmManualTime" @moveTo="handleMoveTo"
			@forceMove="handleForceMove" />
		<ContainerPanel :visible="showContainerPanel" :containerName="activeContainerName"
			:economy="currentRole?.economy" @close="showContainerPanel = false" @transfer="handleTransferItem"
			@use="handleUseItem" />

		<view v-if="showUseModal" class="custom-modal-mask" @click="showUseModal = false">
			<view class="custom-modal" @click.stop>
				<text class="modal-title">✨ 拿起【{{ pendingUseItem?.item?.name }}】</text>
				<text class="modal-desc">请描述你打算怎么使用它（动作会直接发给AI）：</text>
				<textarea class="modal-textarea" v-model="useItemAction"
					placeholder="例：挤满沐浴露，从背后温柔地帮她擦洗肩膀..."></textarea>
				<view class="modal-btns">
					<button class="btn-cancel" @click="showUseModal = false">取消</button>
					<button class="btn-confirm" @click="confirmUseItem">执行动作</button>
				</view>
			</view>
		</view>

	</view>
</template>

<script setup>
	import {
		LLM
	} from '@/services/llm.js';

	import {
		useCameraActions
	} from '@/composables/useCameraActions.js';
	import {
		useCharacterState
	} from '@/composables/useCharacterState.js';
	import {
		useChatLLM
	} from '@/composables/useChatLLM.js';
	import {
		useEconomy
	} from '@/composables/useEconomy.js';
	import {
		ref,
		computed,
		nextTick,
		watch
	} from 'vue';
	import ContainerPanel from '@/components/ContainerPanel.vue';
	import {
		onLoad,
		onShow,
		onHide,
		onUnload,
		onNavigationBarButtonTap
	} from '@dcloudio/uni-app';

	import {
		useGameTime
	} from '@/composables/useGameTime.js';
	import {
		useChatGallery
	} from '@/composables/useChatGallery.js';
	import {
		useGameLocation
	} from '@/composables/useGameLocation.js';
	import {
		useAgents
	} from '@/composables/useAgents.js';
	import {
		useTheme
	} from '@/composables/useTheme.js';
	import {
		useTownStore
	} from '@/stores/useTownStore.js';
	import {
		useEvolution
	} from '@/composables/useEvolution.js'; // ✨ 新增
	import {
		useCharacterStore
	} from '@/stores/useCharacterStore';
	import {
		messageService
	} from '@/services/messageService.js';
	import {
		buildEncounterContext,
		buildPlayerRelationshipFocusContext,
		buildPlayerResidentActivityJoinContext,
		buildPlayerResidentHomeVisitContext,
		buildPlayerResidentInvitationContext,
		buildWorldLocationOptions,
		resolveChatSessionTime
	} from '@/utils/town/town-view-models.js';
	import {
		buildChatResidentInviteOptions,
		shouldShowResidentInviteAction
	} from '@/utils/town/town-chat-invite-actions.js';
	import { resolveLocationAccessState } from '@/utils/town/town-location-access.js';
	import {
		buildPlayerIntentFollowUpPayload,
		createPlayerIntentSession
	} from '@/utils/town/town-player-intent-followups.js';
	const characterStore = useCharacterStore();
	import ShopPanel from '@/components/ShopPanel.vue';
	// 引入新组件
	import ChatHeader from '@/components/ChatHeader.vue';
	import ChatMessageItem from '@/components/ChatMessageItem.vue';
	import ChatFooter from '@/components/ChatFooter.vue';
	import ChatModals from '@/components/ChatModals.vue';
	import {
		useMessageEdit
	} from '@/composables/useMessageEdit.js';
	import {
		CORE_INSTRUCTION_LOGIC_MODE,
		TIME_SHIFT_PROMPT,
	} from '@/utils/prompts.js';

	const {
		isDarkMode,
		applyNativeTheme
	} = useTheme();
	const townStore = useTownStore();
	const charStore = useCharacterStore();
	const currentRole = computed(() => charStore.currentCharacter);
	const activeWorldTemplate = computed(() => townStore.activeWorld || {});
	// ==================================================================================
	// 1. 核心状态定义 (State)
	// ==================================================================================
	const chatName = ref('AI');
	const chatId = ref(null);
	const chatRouteOptions = ref({});
	// 新增：特工执行动作时的动态提示词
	const toolLoadingMsg = ref('');
	const messageList = ref([]);
	const inputText = ref('');
	const isLoading = ref(false);
	const scrollIntoView = ref('');
	const activePlayerIntentSession = ref(null);
	const FACE_TO_FACE_MODE = 'face';


	// 角色状态
	const userName = ref('你');
	const userAvatar = ref('/static/user-avatar.png');
	const userHome = ref('未知地址');
	const userAppearance = ref('');
	const charHome = ref('未知地址');
	// 记忆与设置
	const enableSummary = ref(false);
	const summaryFrequency = ref(20);
	const charHistoryLimit = ref(20);
	// --- 🧬 进化相关状态 ---
	const evolutionLevel = ref(1);
	// --- 🛌 睡觉相关状态 ---
	const wakeTime = ref('08:00'); // 默认睡到早上 8 点

	// UI 状态
	const isToolbarOpen = ref(false);
	const worldLocations = ref([]);

	const toggleToolbar = () => {
		isToolbarOpen.value = !isToolbarOpen.value;
	};
	// 引入并初始化角色状态树
	const {
		currentAction,
		currentLocation,
		interactionMode,
		currentClothing,
		currentActivity,
		currentRelation,
		playerLocation,
		currentSummary
	} = useCharacterState({
		charStore
	});
	const showResidentInviteAction = computed(() => shouldShowResidentInviteAction({
		interactionMode: interactionMode.value,
		routeOptions: chatRouteOptions.value,
		residentId: currentRole.value?.id || chatId.value || ''
	}));
	const residentInviteOptions = computed(() => (
		showResidentInviteAction.value
			? buildChatResidentInviteOptions({
				worldTemplate: activeWorldTemplate.value || {},
				resident: currentRole.value || {},
				townEvents: townStore.townEvents
			})
			: []
	));
	// ==================================================================================
	// 2. 基础辅助函数
	// ==================================================================================
	const scrollToBottom = () => {
		nextTick(() => {
			scrollIntoView.value = '';
			setTimeout(() => {
				scrollIntoView.value = 'scroll-bottom';
			}, 100);
		});
	};
	// --- 变量定义 ---
	const showForceLocationPanel = ref(false);

	const forceCustomLocation = ref('');

	// 🧠 心理活动显示开关 (默认关闭，或从缓存读取)
	const showThought = ref(uni.getStorageSync('setting_show_thought') === true);

	// 切换开关
	const toggleThought = () => {
		showThought.value = !showThought.value;
		uni.setStorageSync('setting_show_thought', showThought.value);
		uni.showToast({
			title: showThought.value ? '已开启心声显示' : '已隐藏心声',
			icon: 'none'
		});
	};
	// --- 🛌 睡觉逻辑实现 ---

	/**
	 * 辅助函数：根据 "HH:mm" 计算目标时间戳
	 */
	const getWakeUpTimestamp = (targetTimeStr) => {
		const now = new Date(currentTime.value); // 使用当前游戏时间
		const [targetHour, targetMinute] = targetTimeStr.split(':').map(Number);

		let targetDate = new Date(now);
		targetDate.setHours(targetHour, targetMinute, 0, 0);

		// 逻辑判定：
		// 如果设定时间比当前晚（比如现在 23:00，设为 23:30），就是今天
		// 如果设定时间比当前早（比如现在 23:00，设为 08:00），就是明天
		if (targetDate <= now) {
			targetDate.setDate(targetDate.getDate() + 1);
		}

		return targetDate.getTime();
	};
	/**
	 * 触发器：当时间选择器改变时调用 (智能睡眠裁判系统)
	 */
	const onSleepTimeChange = async (e) => {
		const selectedTime = e.detail.value;
		if (isLoading.value) return uni.showToast({
			title: '剧情进行中...',
			icon: 'none'
		});

		// 1. 开启裁判等待状态
		isLoading.value = true;
		uni.showLoading({
			title: '夜幕降临...'
		});

		try {
			stopTimeFlow();
			const isSameRoom = playerLocation.value === currentLocation.value;
			const config = getCurrentLlmConfig();
			if (!config || !config.apiKey) throw new Error("API_KEY_MISSING");

			// ✨✨✨ 2. 核心：构建给“睡眠裁判 AI”的判定剧本 ✨✨✨
			const judgePrompt = `你是一个恋爱模拟游戏的逻辑判定引擎。
	【当前动态输入】
	- 两人当前关系标签：${currentRelation.value || '普通关系'}
	- 角色当前心情/动作：${currentActivity.value || '平静'}
	- 玩家位置：${playerLocation.value}
	- 角色位置：${currentLocation.value}
	- 是否同处一室：${isSameRoom}
	
	【判定规则（严格遵守）】
	1. 如果同处一室，但关系不够亲密（如普通室友），或角色心情极差（生气/厌恶/防备），判定为 "reject"（赶出去）。
	2. 如果同处一室，关系已经足够亲密且心情正常，判定为 "co_sleep"（正常同床共枕）。
	3. 如果不在同一房间，但关系非常亲密（情侣/夫妻）且心情良好，判定为 "invite"（主动叫玩家过来，或自己跑去玩家房间）。
	4. 如果不在同一房间，且关系未到同床地步，判定为 "solo_sleep"（各自安睡）。
	
	【输出格式】请仅输出纯 JSON 格式，不要包含其他任何分析字符：
	{"decision": "reject"|"co_sleep"|"invite"|"solo_sleep", "reason": "判定理由，用于后续生成互动剧本"}`;

			// 🧠 发起隐秘的后台判定请求 (将温度调极低，确保输出稳定的逻辑和JSON)
			const judgeResult = await LLM.chat({
				config,
				messages: [{
					role: 'user',
					content: judgePrompt
				}],
				systemPrompt: "你是一个只输出JSON的逻辑引擎，绝不输出其他对话。",
				temperature: 0.1
			});

			// 3. 解析裁判的决定
			let decision = "solo_sleep";
			let reason = "默认逻辑";
			try {
				const match = judgeResult.match(/\{[\s\S]*\}/);
				if (match) {
					const parsed = JSON.parse(match[0]);
					decision = parsed.decision;
					reason = parsed.reason;
				}
			} catch (err) {
				console.error("💤 睡眠裁判解析失败，降级为默认睡觉", err);
			}

			console.log(`⚖️ [睡眠裁判] 判定结果: ${decision}, 理由: ${reason}`);

			// ✨✨✨ 4. 根据裁判结果，执行四个完全不同的剧情分支 ✨✨✨

			if (decision === 'reject') {
				// ❌ 分支 A：被赶出去 (同房，但关系不够或心情差)
				messageList.value.push({
					role: 'system',
					content: `🚫 (你试图在${playerLocation.value}过夜，但气氛似乎不对...)`,
					isSystem: true
				});
				const rejectPrompt =
					`[System Action: 玩家大半夜想在你的房间睡觉，但你拒绝了。因为裁判引擎判定：${reason}。请根据你的性格，自然地把他赶回他自己的房间。]`;
				sendMessage(false, rejectPrompt);
				return; // 终止时间流逝，今晚别想睡！
			} else if (decision === 'invite') {
				// 💕 分支 B：主动逆推/撒娇 (异地，但感情极好)
				messageList.value.push({
					role: 'system',
					content: `💕 (你正准备在${playerLocation.value}独自入睡，但事情似乎有了变数...)`,
					isSystem: true
				});
				const invitePrompt =
					`[System Action: 玩家在${playerLocation.value}准备睡觉了。但你们关系非常亲密，且裁判判定：${reason}。请主动发消息叫他来你的房间陪你，或者直接抱着枕头跑去他的房间找他一起睡。]`;
				sendMessage(false, invitePrompt);
				return; // 终止时间流逝，触发睡前亲密互动剧情！
			}

			// ✅ 下方为成功进入梦乡的分支 (co_sleep 或 solo_sleep)
			let sleepSysMsg = decision === 'co_sleep' ?
				`🌙 (你们相拥而眠，度过了一个甜蜜的夜晚... 睡到了 ${selectedTime})` :
				`🌙 (你们互道晚安，各自休息... 睡到了 ${selectedTime})`;

			let wakeUpPromptAction = decision === 'co_sleep' ?
				`[SYSTEM EVENT: WAKE UP TOGETHER] 昨晚你们同床共枕。新的一天开始了，请结合你们当前的关系(${currentRelation.value})和昨晚的心情(${currentActivity.value})，给身边刚醒来的玩家一个亲昵的早安问候。` :
				`[SYSTEM EVENT: WAKE UP ALONE] 昨晚你们是分房睡的。新的一天开始了，你刚起床，请自然地跟玩家打个早安招呼。`;


			// --- 5. 执行硬核的时间流逝引擎 ---
			wakeTime.value = selectedTime;
			const oldTimeStr = formattedTime.value;
			const newTimestamp = getWakeUpTimestamp(selectedTime);

			const oldDate = new Date(currentTime.value).getDate();
			const newDate = new Date(newTimestamp).getDate();
			if (oldDate !== newDate) {
				console.log("🌙 检测到睡眠跨天，触发每日结算...");
				await runDayEndSummary();
			}

			await townStore.advanceTimeTo(newTimestamp);

			// 上屏显示
			messageList.value.push({
				role: 'system',
				content: sleepSysMsg,
				isSystem: true
			});
			await saveHistory();
			scrollToBottom();

			// 呼叫大模型执行起床剧本
			nextTick(() => {
				const transitionPrompt =
					`[TIME SHIFT] 时间从 ${oldTimeStr} 跳转到了 ${formattedTime.value}。\n${wakeUpPromptAction}`;
				sendMessage(false, transitionPrompt);
			});

		} catch (error) {
			uni.showToast({
				title: '睡眠判定失败',
				icon: 'none'
			});
			console.error(error);
		} finally {
			void startTimeFlow();
			isLoading.value = false;
			uni.hideLoading();
		}
	};

	const handleForceMove = (locObj) => {

		const targetName = typeof locObj === 'object' ?
			(locObj.detail || locObj.name || '') :
			locObj;

		if (!targetName) return uni.showToast({
			title: '无效地点',
			icon: 'none'
		});

		// 2. 静默更新玩家位置
		playerLocation.value = targetName;
		console.log(`🛠️ [God Mode] 玩家位置强制修正为: ${targetName}`);

		// 面对面聊天页里，手动纠正位置时保持双方处于同一现场。
		currentLocation.value = targetName;
		interactionMode.value = FACE_TO_FACE_MODE;

		// 4. 保存到数据库
		saveCharacterState();

		// 5. 关闭弹窗
		showForceLocationPanel.value = false;
		uni.showToast({
			title: `已修正为: ${targetName}`,
			icon: 'none'
		});
	};

	const startPlayerIntentSession = (sessionOptions = {}) => {
		activePlayerIntentSession.value = createPlayerIntentSession({
			playerName: activeWorldTemplate.value?.playerIdentityTemplates?.[0]?.name || userName.value || '玩家',
			...sessionOptions
		});
	};

	const settlePlayerIntentFollowUpFromMessage = async (message) => {
		if (!activePlayerIntentSession.value) return;

		const payload = buildPlayerIntentFollowUpPayload({
			session: activePlayerIntentSession.value,
			message
		});
		if (!payload) return;

		activePlayerIntentSession.value = null;
		await townStore.createPlayerResidentConversationFollowUp({
			...payload,
			sourceIntent: payload.intentType,
			happenedAt: currentTime.value
		});

		if (payload.intentType === 'resident_home_visit_request' && payload.visitDecision === 'accepted') {
			const accessResult = await townStore.grantPlayerResidenceAccess({
				residenceLocationId: payload.locationId || '',
				hostResidentId: payload.residentId || '',
				hostResidentName: payload.residentName || currentRole.value?.name || '',
				hostResident: currentRole.value || null,
				requestAlreadyRecorded: true
			});

			if (accessResult?.approved) {
				const runtimePatch = {
					playerLocation: payload.locationName || '',
					currentLocation: payload.locationName || '',
					interactionMode: 'face'
				};

				playerLocation.value = runtimePatch.playerLocation;
				currentLocation.value = runtimePatch.currentLocation;
				interactionMode.value = runtimePatch.interactionMode;
				charStore.saveCharacterData(runtimePatch);

				const systemMessage = {
					id: `home-visit-accepted-${Date.now()}`,
					role: 'system',
					content: `【拜访已通过】${payload.residentName || currentRole.value?.name || '对方'}同意你进入${payload.locationName || '她家'}。`,
					isSystem: true
				};
				messageList.value.push(systemMessage);
				await saveHistory(systemMessage);
			}
		}
	};

	const saveHistory = async (msg) => {
		if (!chatId.value) return;

		const targetMsg = msg || (messageList.value.length > 0 ? messageList.value[messageList.value.length - 1] :
			null);
		if (!targetMsg) return;

		// 1. 呼叫服务站：把消息存进数据库
		await messageService.saveMessage(chatId.value, targetMsg);

		// 2. 呼叫管家：更新列表页的“最后一条消息”预览
		characterStore.saveCharacterData({
			lastMsg: targetMsg.isSystem ? `[系统] ${targetMsg.content}` : targetMsg.content,
			lastTime: "刚刚"
		});
		await settlePlayerIntentFollowUpFromMessage(targetMsg);
	};

	const getCurrentLlmConfig = () => {
		const schemes = uni.getStorageSync('app_llm_schemes') || [];
		const idx = uni.getStorageSync('app_current_scheme_index') || 0;
		return (schemes.length > 0 && schemes[idx]) ? schemes[idx] : uni.getStorageSync('app_api_config');
	};

	// --- 旧的数百行存取逻辑不要了，直接交给管家批量处理 ---
	const saveCharacterState = (newScore, newTime, newSummary, newLocation, newClothes, newMode, newLust) => {
		const payload = {};
		
		if (newTime !== undefined) {
			payload.lastTimeTimestamp = newTime;
		}
		if (newSummary !== undefined) payload.summary = newSummary;
		if (newLocation !== undefined) payload.currentLocation = newLocation;
		if (newClothes !== undefined) payload.clothing = newClothes;
		if (Object.keys(payload).length > 0) {
			payload.interactionMode = FACE_TO_FACE_MODE;
			charStore.saveCharacterData(payload);
		}
	};


	const previewImage = (url) => {
		uni.previewImage({
			urls: [url]
		});
	};
	const onDateChange = (e) => {
		tempDateStr.value = e.detail.value;
	};
	const onTimeChange = (e) => {
		tempTimeStr.value = e.detail.value;
	};
	// ==================================================================================
	// 3. 🧩 初始化各大逻辑模块
	// ==================================================================================
	const {
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
		handleTimeSkip: _handleTimeSkip,
		confirmManualTime: _confirmManualTime // 👈 改这里：重命名
	} = useGameTime(saveCharacterState);
	// ✨ 新增：在UI层拆分时间，不改动 useGameTime.js 底层逻辑
	const timeParts = computed(() => {
		if (!formattedTime.value) return {
			week: '--',
			time: '--:--'
		};
		// 假设 formattedTime 格式为 "周X HH:mm"
		const parts = formattedTime.value.split(' ');
		return {
			week: parts[0] || '',
			time: parts[1] || ''
		};
	});

	const {
		handleAsyncImageGeneration,
		retryGenerateImage
	} = useChatGallery({
		currentRole,
		interactionMode,
		userAppearance,
		messageList,
		chatId,
		chatName,
		saveHistory,
		scrollToBottom
	});

	const confirmManualTime = async () => {
		// 1. 调用底层修改时间
		const newTime = await _confirmManualTime();

		if (newTime) {
			messageList.value.push({
				role: 'system',
				content: `⏳ 时间现在为为 ${formattedTime.value}`,
				isSystem: true
			});
			scrollToBottom();

		}
		// 如果 newTime 为 null，这里什么都不做，AI 就不会收到那条“逻辑冲突”的消息
	};

	const {
		showLocationPanel,
		customLocation,
		locationList,
		checkIsWorking,
		calculateMoveResult
	} = useGameLocation({
		currentRole,
		userHome,
		charHome,
		currentTime,
		worldLocations,
		playerLocation,
		worldTemplate: activeWorldTemplate
	});

	// ✨ 修复顺序：先定义 Evolution，再传给 Agents
	const {
		executeEvolution,
		isEvolving
	} = useEvolution();

	const {
		runSceneCheck,
		runRelationCheck,
		runVisualDirectorCheck,
		runCameraManCheck,
		checkAndRunSummary,
		runDayEndSummary,
		isArchiving,
		checkHistoryRecall,
		fetchActiveMemoryContext,
		retryAgentGeneration,
		isSceneAnalyzing,
		runGroupCameraCheck,
		runGodViewCheck
	} = useAgents({
		chatId,
		messageList,
		currentRole,
		chatName,
		currentLocation,
		currentClothing,
		currentAction,
		interactionMode,
		currentRelation,
		currentActivity,
		formattedTime,
		playerLocation,
		enableSummary,
		summaryFrequency,
		currentSummary,
		saveCharacterState,
		saveHistory,
		scrollToBottom,
		getCurrentLlmConfig,
		handleAsyncImageGeneration,
		userAppearance,
		executeEvolution // ✨ 现在可以安全传入了
	});


	const handleTimeSkip = async (type, customVal) => {
		// 适配 ChatModals 回传的 customVal
		if (type === 'custom' && customVal) {
			customMinutes.value = customVal;
		}

		// 1. 调用底层时间逻辑修改时间
		const isNextDay = await _handleTimeSkip(type, messageList, scrollToBottom);

		// 2. 构建给 AI 的提示语
		let skipDesc = "";
		switch (type) {
			case 'morning':
				skipDesc = "一上午过去了";
				break;
			case 'afternoon':
				skipDesc = "一下午过去了";
				break;
			case 'night':
				skipDesc = "一晚上过去了";
				break;
			case 'day':
				skipDesc = "一天过去了";
				break;
			case 'custom':
				skipDesc = `${customMinutes.value}分钟过去了`;
				break;
		}

		// 3. 将时间流逝上屏（系统消息）
		messageList.value.push({
			role: 'system',
			content: `⏳ ${skipDesc}... 当前时间为 ${formattedTime.value}`,
			isSystem: true
		});

		// 4. 通知 AI 时间变化，让它根据新时间点产生反应
		const timePrompt =
			`[SYSTEM EVENT: TIME_SKIP]\n**Action**: ${skipDesc}.\n**New Time**: ${formattedTime.value}.\n**Instruction**: 考虑到时间的流逝，请根据当前时间点（是否该吃饭、睡觉、上班等）自然地继续对话或发起新话题。`;
		sendMessage(false, timePrompt);

		// 5. 如果跨天，触发每日结算
		if (isNextDay) {
			await runDayEndSummary();
		}

		scrollToBottom();
	};

	// 专门的睡觉按钮处理函数
	const handleSleep = () => {
		handleTimeSkip('night');
	};

	const handleMoveTo = (locObj) => {
		if (isLoading.value) return uni.showToast({
			title: '对话进行中...',
			icon: 'none'
		});
		if (locObj.type === 'custom' && !locObj.name) return uni.showToast({
			title: '请输入地点',
			icon: 'none'
		});

		const result = calculateMoveResult(locObj);

		if (result.blocked) {
			showLocationPanel.value = false;
			uni.showToast({
				title: result.sysMsgUser || '暂时不能去那里',
				icon: 'none',
				duration: 2500
			});
			return;
		}

		if (result.newMode !== FACE_TO_FACE_MODE) {
			showLocationPanel.value = false;
			uni.showToast({
				title: '离开现场后，请回首页用手机联系她',
				icon: 'none',
				duration: 2500
			});
			return;
		}

		console.log('🚶 [移动监控] -------------------------------------------------');
		console.log(`📍 玩家地点: "${result.playerLocation}"`);
		console.log(`📍 角色地点: "${result.aiLocation}"`);
		console.log('🔄 会话模式: 🥰 当面');
		if (result.shouldNotifyAI) console.log(`🤖 触发剧情: "${result.promptAction}"`);
		console.log('-----------------------------------------------------------');

		// 🌟 核心改动：更新双方地点
		playerLocation.value = result.playerLocation;
		currentLocation.value = result.aiLocation;

		interactionMode.value = FACE_TO_FACE_MODE;
		showLocationPanel.value = false;
		uni.vibrateShort();
		saveCharacterState();

		if (result.shouldNotifyAI) {
			messageList.value.push({
				role: 'system',
				content: `🚗 ${result.sysMsgUser}`,
				isSystem: true
			});
			// 🌟 核心改动：在 Prompt 中明确双地点
			const movePrompt =
				`[SYSTEM EVENT: SCENE CHANGE]\n**Action**: ${result.promptAction}\n**Character Location**: ${result.aiLocation}\n**Player Location**: ${result.playerLocation}\n**New Mode**: FACE-TO-FACE.\n**Time**: ${formattedTime.value}.\n**Instruction**: React naturally to this movement logic.`;
			sendMessage(false, movePrompt);
		} else {
			uni.showToast({
				title: result.sysMsgUser,
				icon: 'none',
				duration: 2500
			});
		}
	};

	const handleImageLoadError = (msg) => {
		// 只有当不是本地临时路径且没报错时才标记
		if (msg.content && !msg.hasError) {
			msg.hasError = true;
			// 强制更新视图
			messageList.value = [...messageList.value];
		}
	};

	// ✨✨✨ 新增：引入大模型大脑管家 ✨✨✨
	const {
		processAIResponse,
		sendMessage,
		triggerNextStep,
		handleRetry
	} = useChatLLM({
		toolLoadingMsg,
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
		// 传递方法
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
	});

	const {
		showShopPanel,
		showContainerPanel,
		activeContainerName,
		showUseModal,
		pendingUseItem,
		useItemAction,
		handleOpenContainer,
		handleTransferItem,
		handleUseItem,
		confirmUseItem,
		handleBuyItem,
		wallet
	} = useEconomy({
		currentRole,
		charStore,
		messageList,
		saveHistory,
		sendMessage
	});

	// ✨✨✨ 新增：引入并初始化相机与摄影控制中心 ✨✨✨
	const {
		handleCameraSend,
		handleStealthCameraSend,
		handleGroupCameraSend,
		handleGodViewSend
	} = useCameraActions({
		interactionMode,
		messageList,
		scrollToBottom,
		isSceneAnalyzing,
		runCameraManCheck,
		runGroupCameraCheck,
		runGodViewCheck,
		currentAction,
		currentRelation,
		sendMessage
	});

	// ✨✨✨ 新增：引入并初始化消息编辑与删除控制中心 ✨✨✨
	const {
		isEditMode,
		selectedIds,
		enterEditMode,
		toggleSelect,
		cancelEdit,
		confirmDelete
	} = useMessageEdit({
		messageList,
		isLoading
	});


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
		const triggerPrompt =
			`[系统事件: 用户回归]\n**背景**: 用户离开 ${Math.floor(hoursSinceActive)} 小时。\n**游戏时间**: ${gameTimeDesc} (${gameHour}:00)。\n**任务**: 主动发起对话 (简体中文，简短，30字内)。`;
		sendMessage(false, triggerPrompt);
		uni.setStorageSync(`last_real_active_time_${chatId.value}`, now);
	};

	const loadRoleData = async (id) => {
		// 1. 让管家加载列表并锁定当前聊天对象
		await charStore.initContacts();
		charStore.setCurrentId(id);

		const target = charStore.currentCharacter;
		if (target) {
			if (target.worldId && String(target.worldId) !== String(townStore.activeWorldId)) {
				await townStore.setActiveWorld(target.worldId);
			}

			chatName.value = target.name;
			uni.setNavigationBarTitle({
				title: target.name
			});

			currentTime.value = resolveChatSessionTime(townStore.currentTime);
			charHome.value = target.location || '角色家';
			userHome.value = target.settings?.userLocation || '玩家家';
			userAppearance.value = target.settings?.userAppearance || '';

			// 🌟 核心修复逻辑：判定见面模式 🌟
			// 判断是否同居
			const isCohabitation = () => {
				const u = (userHome.value || '').trim();
				const c = (charHome.value || '').trim();
				if (!u || !c || u === '未知地址' || c === '未知地址' || u === '角色家' || u === '玩家家') return false;
				return u === c || u.includes(c) || c.includes(u);
			};
			const isTogether = isCohabitation();

			// 获取存档中的位置，如果没有则赋予默认值
			let pLoc = target.playerLocation;
			let cLoc = target.currentLocation || target.location || '卧室'; // 默认角色在卧室

			// 根据同居状态初始化玩家的默认位置
			if (!pLoc) {
				if (isTogether) {
					pLoc = cLoc; // 同居：直接进入角色的房间
				} else {
					pLoc = userHome.value; // 不同居：在玩家自己家
				}
			}

			// ✨ 获取所有的室内场景名称（包含房间和宏观地址）
			const s = target.settings || {};
			const customRooms = s.homeRooms || ['客厅', '卧室', '厨房', '卫生间'];
			const indoorRooms = [
				...customRooms,
				'角色家', '玩家家', '我们的家', '她的家', '我的家',
				charHome.value, userHome.value
			];

			// 判断玩家和角色是否都在家中（无论是在具体房间还是宏观地址）
			const isPlayerIndoor = indoorRooms.includes(pLoc);
			const isCharIndoor = indoorRooms.includes(cLoc);

			// 面对面聊天页进入时，如旧数据仍指向分离位置，就把玩家拉回当前现场。
			if (!(pLoc === cLoc || (isTogether && isPlayerIndoor && isCharIndoor))) {
				pLoc = cLoc;
			}

			// 2. 将计算出的纠错数据一次性存回管家兜底
			charStore.saveCharacterData({
				playerLocation: pLoc,
				currentLocation: cLoc,
				interactionMode: FACE_TO_FACE_MODE
			});
			// 这三个非角色动态数据的变量保留手动赋值
			enableSummary.value = target.enableSummary || false;
			summaryFrequency.value = target.summaryFrequency || 20;
			charHistoryLimit.value = target.historyLimit || 20;

			worldLocations.value = buildWorldLocationOptions(townStore.activeWorld || {});

		}
	};

	const appendEncounterContext = (options = {}) => {
		if (options.encounter !== '1' || !options.scene || !currentRole.value) return;
		const sceneName = decodeURIComponent(options.scene);
		const accessState = resolveLocationAccessState({
			worldTemplate: activeWorldTemplate.value,
			locationName: sceneName,
			hostResident: currentRole.value
		});

		if (accessState.isPrivateResidence && !accessState.canPlayerEnter) {
			uni.showToast({
				title: '还没获得住户同意，不能直接去她家见面',
				icon: 'none'
			});
			return;
		}

		const context = buildEncounterContext(
			currentRole.value,
			sceneName,
			formattedTime.value,
			townStore.socialLinks,
			townStore.townEvents
		);

		playerLocation.value = context.runtimePatch.playerLocation;
		currentLocation.value = context.runtimePatch.currentLocation;
		interactionMode.value = context.runtimePatch.interactionMode;
		charStore.saveCharacterData(context.runtimePatch);

		messageList.value.push({
			id: `encounter-${Date.now()}`,
			role: 'system',
			content: context.systemMessage,
			isSystem: true
		});
	};

	const appendResidentInvitationIntent = async (options = {}) => {
		if (options.intent !== 'resident_invitation' || !currentRole.value) return;

		const targetLocationName = decodeURIComponent(options.inviteLocationName || '');
		if (!targetLocationName) return;
		const worldPlayerName = activeWorldTemplate.value?.playerIdentityTemplates?.[0]?.name || '';

		const context = buildPlayerResidentInvitationContext({
			playerName: worldPlayerName || userName.value || '玩家',
			residentName: currentRole.value?.name || decodeURIComponent(options.name || ''),
			currentLocationName: decodeURIComponent(options.inviteFrom || currentRole.value?.currentLocation || currentRole.value?.townRuntime?.currentLocationName || ''),
			targetLocationName
		});
		const systemMessage = {
			id: `resident-invitation-${Date.now()}`,
			role: 'system',
			content: context.systemMessage,
			isSystem: true
		};
		startPlayerIntentSession({
			intentType: 'resident_invitation',
			residentId: currentRole.value?.id || decodeURIComponent(options.id || ''),
			residentName: currentRole.value?.name || decodeURIComponent(options.name || ''),
			currentLocationId: currentRole.value?.townRuntime?.currentLocationId || '',
			currentLocationName: decodeURIComponent(
				options.inviteFrom
				|| currentRole.value?.currentLocation
				|| currentRole.value?.townRuntime?.currentLocationName
				|| ''
			),
			targetLocationId: decodeURIComponent(options.inviteLocationId || ''),
			targetLocationName
		});

		messageList.value.push(systemMessage);
		await saveHistory(systemMessage);

		setTimeout(() => {
			if (!isLoading.value) {
				sendMessage(true, context.systemOverride);
			}
		}, 80);
	};

	const handleInviteAction = () => {
		if (isLoading.value) {
			uni.showToast({
				title: '剧情进行中...',
				icon: 'none'
			});
			return;
		}

		if (residentInviteOptions.value.length === 0) {
			uni.showToast({
				title: '暂时还没有合适的邀请地点',
				icon: 'none'
			});
			return;
		}

		uni.showActionSheet({
			itemList: residentInviteOptions.value.map((item) => item.label),
			success: async ({ tapIndex }) => {
				const option = residentInviteOptions.value[tapIndex];
				if (!option) return;

				try {
					const result = await townStore.createPlayerResidentInvitation({
						residentId: currentRole.value?.id || chatId.value || '',
						residentName: currentRole.value?.name || chatName.value || '',
						currentLocationName: currentLocation.value || currentRole.value?.townRuntime?.currentLocationName || '',
						targetLocationId: option.locationId || '',
						targetLocationName: option.locationName || ''
					});

					if (!result?.created) {
						uni.showToast({
							title: '暂时还不能发起这个邀约',
							icon: 'none'
						});
						return;
					}

					await appendResidentInvitationIntent({
						intent: 'resident_invitation',
						id: currentRole.value?.id || chatId.value || '',
						name: currentRole.value?.name || chatName.value || '',
						inviteFrom: currentLocation.value || currentRole.value?.townRuntime?.currentLocationName || '',
						inviteLocationId: option.locationId || '',
						inviteLocationName: option.locationName || ''
					});
				} catch (error) {
					console.error('[chat] failed to create resident invitation', error);
					uni.showToast({
						title: '邀约没有发出去，请稍后再试',
						icon: 'none'
					});
				}
			}
		});
	};

	const appendResidentActivityJoinIntent = async (options = {}) => {
		if (options.intent !== 'resident_activity_join' || !currentRole.value) return;

		const activityLocationName = decodeURIComponent(options.activityLocationName || '');
		if (!activityLocationName) return;

		const accessState = resolveLocationAccessState({
			worldTemplate: activeWorldTemplate.value,
			locationId: decodeURIComponent(options.activityLocationId || ''),
			locationName: activityLocationName,
			hostResident: currentRole.value
		});

		if (accessState.isPrivateResidence && !accessState.canPlayerEnter) {
			uni.showToast({
				title: '还没获得住户同意，不能直接加入这个现场',
				icon: 'none'
			});
			return;
		}

		const worldPlayerName = activeWorldTemplate.value?.playerIdentityTemplates?.[0]?.name || '';
		const runtimePatch = {
			playerLocation: activityLocationName,
			currentLocation: activityLocationName,
			interactionMode: 'face'
		};
		const context = buildPlayerResidentActivityJoinContext({
			playerName: worldPlayerName || userName.value || '玩家',
			residentName: currentRole.value?.name || decodeURIComponent(options.name || ''),
			locationName: activityLocationName,
			currentAction: decodeURIComponent(
				options.activityCurrentAction
				|| currentRole.value?.currentAction
				|| currentRole.value?.townRuntime?.currentAction
				|| ''
			)
		});
		const systemMessage = {
			id: `resident-activity-join-${Date.now()}`,
			role: 'system',
			content: context.systemMessage,
			isSystem: true
		};
		startPlayerIntentSession({
			intentType: 'resident_activity_join',
			residentId: currentRole.value?.id || decodeURIComponent(options.id || ''),
			residentName: currentRole.value?.name || decodeURIComponent(options.name || ''),
			currentLocationId: decodeURIComponent(options.activityLocationId || '') || currentRole.value?.townRuntime?.currentLocationId || '',
			currentLocationName: activityLocationName,
			currentAction: decodeURIComponent(
				options.activityCurrentAction
				|| currentRole.value?.currentAction
				|| currentRole.value?.townRuntime?.currentAction
				|| ''
			)
		});

		playerLocation.value = runtimePatch.playerLocation;
		currentLocation.value = runtimePatch.currentLocation;
		interactionMode.value = runtimePatch.interactionMode;
		charStore.saveCharacterData(runtimePatch);

		messageList.value.push(systemMessage);
		await saveHistory(systemMessage);

		setTimeout(() => {
			if (!isLoading.value) {
				sendMessage(true, context.systemOverride);
			}
		}, 80);
	};

	const appendResidentHomeVisitIntent = async (options = {}) => {
		if (options.intent !== 'resident_home_visit_request' || !currentRole.value) return;

		const residenceLocationName = decodeURIComponent(options.visitResidenceLocationName || '');
		if (!residenceLocationName) return;

		const worldPlayerName = activeWorldTemplate.value?.playerIdentityTemplates?.[0]?.name || '';
		const context = buildPlayerResidentHomeVisitContext({
			playerName: worldPlayerName || userName.value || '玩家',
			residentName: currentRole.value?.name || decodeURIComponent(options.name || ''),
			residenceLocationName,
			currentAction: decodeURIComponent(
				options.visitCurrentAction
				|| currentRole.value?.currentAction
				|| currentRole.value?.townRuntime?.currentAction
				|| ''
			)
		});
		const systemMessage = {
			id: `resident-home-visit-${Date.now()}`,
			role: 'system',
			content: context.systemMessage,
			isSystem: true
		};
		startPlayerIntentSession({
			intentType: 'resident_home_visit_request',
			residentId: currentRole.value?.id || decodeURIComponent(options.id || ''),
			residentName: currentRole.value?.name || decodeURIComponent(options.name || ''),
			currentLocationId: decodeURIComponent(options.visitResidenceLocationId || '')
				|| currentRole.value?.townRuntime?.currentLocationId
				|| '',
			currentLocationName: residenceLocationName,
			currentAction: decodeURIComponent(
				options.visitCurrentAction
				|| currentRole.value?.currentAction
				|| currentRole.value?.townRuntime?.currentAction
				|| ''
			)
		});

		messageList.value.push(systemMessage);
		await saveHistory(systemMessage);

		setTimeout(() => {
			if (!isLoading.value) {
				sendMessage(true, context.systemOverride);
			}
		}, 80);
	};

	const appendResidentRelationshipFocusIntent = async (options = {}) => {
		if (options.intent !== 'relationship_focus' || !currentRole.value) return;

		const worldPlayerName = activeWorldTemplate.value?.playerIdentityTemplates?.[0]?.name || '';
		const context = buildPlayerRelationshipFocusContext({
			playerName: worldPlayerName || userName.value || '玩家',
			residentName: currentRole.value?.name || decodeURIComponent(options.name || ''),
			relationshipStage: decodeURIComponent(
				options.relationshipStage
				|| currentRole.value?.relation
				|| currentRole.value?.settings?.relation
				|| ''
			),
			relationshipSummary: decodeURIComponent(
				options.relationshipSummary
				|| currentRole.value?.settings?.userRelation
				|| currentRole.value?.userRelation
				|| currentRole.value?.relation
				|| ''
			),
			focusSummary: decodeURIComponent(options.relationshipFocus || ''),
			currentLocationName: decodeURIComponent(
				options.relationshipLocationName
				|| currentRole.value?.currentLocation
				|| currentRole.value?.townRuntime?.currentLocationName
				|| ''
			),
			currentAction: decodeURIComponent(
				options.relationshipCurrentAction
				|| currentRole.value?.currentAction
				|| currentRole.value?.townRuntime?.currentAction
				|| ''
			)
		});
		const systemMessage = {
			id: `relationship-focus-${Date.now()}`,
			role: 'system',
			content: context.systemMessage,
			isSystem: true
		};
		startPlayerIntentSession({
			intentType: 'relationship_focus',
			residentId: currentRole.value?.id || decodeURIComponent(options.id || ''),
			residentName: currentRole.value?.name || decodeURIComponent(options.name || ''),
			currentLocationId: currentRole.value?.townRuntime?.currentLocationId || '',
			currentLocationName: decodeURIComponent(
				options.relationshipLocationName
				|| currentRole.value?.currentLocation
				|| currentRole.value?.townRuntime?.currentLocationName
				|| ''
			),
			currentAction: decodeURIComponent(
				options.relationshipCurrentAction
				|| currentRole.value?.currentAction
				|| currentRole.value?.townRuntime?.currentAction
				|| ''
			),
			relationshipStage: decodeURIComponent(
				options.relationshipStage
				|| currentRole.value?.relation
				|| currentRole.value?.settings?.relation
				|| ''
			)
		});

		messageList.value.push(systemMessage);
		await saveHistory(systemMessage);

		setTimeout(() => {
			if (!isLoading.value) {
				sendMessage(true, context.systemOverride);
			}
		}, 80);
	};

	onShow(async () => {
		applyNativeTheme();
		if (chatId.value) {
			await loadRoleData(chatId.value);
			scrollToBottom();
			startTimeFlow();
			setTimeout(() => checkProactiveGreeting(), 1000);
		}
	});

	onLoad(async (options) => {
		await townStore.initialize();
		activePlayerIntentSession.value = null;
		chatRouteOptions.value = { ...options };

		const appUser = uni.getStorageSync('app_user_info');
		if (appUser) {
			if (appUser.name) userName.value = appUser.name;
			if (appUser.avatar) userAvatar.value = appUser.avatar;
		}
		if (options.id) {
			chatId.value = options.id;
			await loadRoleData(options.id);

			// 呼叫服务站：拿历史记录
			const history = await messageService.getMessages(options.id);
			if (history.length > 0) {
				messageList.value = history.map(m => ({
					...m,
					isSystem: !!m.isSystem
				}));
			}

			appendEncounterContext(options);
			await appendResidentInvitationIntent(options);
			await appendResidentActivityJoinIntent(options);
			await appendResidentHomeVisitIntent(options);
			await appendResidentRelationshipFocusIntent(options);
		}
	});
	const clearHistoryAndReset = () => {
		uni.showModal({
			title: '彻底重置',
			content: '确定重置对话与位置吗？',
			success: (res) => {
				if (res.confirm) {
					// 🌟 核心改动：重置为初始家宅位置
					const resetMeetingLocation = charHome.value || userHome.value || currentLocation.value;
					playerLocation.value = resetMeetingLocation;
					currentLocation.value = resetMeetingLocation;
					interactionMode.value = FACE_TO_FACE_MODE;

					messageList.value = [];
					saveCharacterState();
					uni.removeStorageSync(`chat_history_${chatId.value}`);
					uni.navigateBack();
				}
			}
		});
	};

	onHide(() => {
		stopTimeFlow();
		// 显式传入 undefined 占位前几个参数，确保第二位的时间参数被正确传递
		saveCharacterState(undefined, currentTime.value);
	});
	onUnload(() => {
		stopTimeFlow();
		// 同上，确保退出时记录最后一秒的时间
		saveCharacterState(undefined, currentTime.value);
	});

	onNavigationBarButtonTap((e) => {
		if (e.key === 'setting') uni.navigateTo({
			url: `/pages/create/create?id=${chatId.value}`
		});
	});

	// --- 新增：Modal 统一管理 ---
	const activeModal = computed(() => {
		if (showTimePanel.value) return 'timeSkip';
		if (showTimeSettingPanel.value) return 'timeSetting';
		if (showLocationPanel.value) return 'location';
		if (showForceLocationPanel.value) return 'forceLocation';
		return '';
	});

	const closeModal = () => {
		showTimePanel.value = false;
		showTimeSettingPanel.value = false;
		showLocationPanel.value = false;
		showForceLocationPanel.value = false;
	};
</script>

<style lang="scss" scoped>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: var(--bg-color);
		/* 全局背景 */
		overflow: hidden;
	}

	/* 聊天滚动区 */
	.chat-scroll {
		flex: 1;
		overflow: hidden;
	}

	.chat-content {
		padding: 20rpx;
		padding-bottom: 240rpx;
	}

	.system-tip {
		text-align: center;
		color: var(--text-sub);
		font-size: 24rpx;
		margin-bottom: 30rpx;
	}

	.loading-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20rpx;
	}

	.loading-dots {
		color: var(--text-sub);
		font-weight: bold;
	}

	/* 归档中提示条 */
	.archiving-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.7);
		color: #fff;
		z-index: 9999;
		text-align: center;
		padding: 10rpx;
		font-size: 24rpx;
	}

	/* 自定义动作弹窗 */
	.custom-modal-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.custom-modal {
		width: 80%;
		background: var(--card-bg);
		border-radius: 20rpx;
		padding: 40rpx;
		display: flex;
		flex-direction: column;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #007aff;
		margin-bottom: 10rpx;
	}

	.modal-desc {
		font-size: 24rpx;
		color: var(--text-sub);
		margin-bottom: 20rpx;
	}

	.modal-textarea {
		width: 100%;
		height: 160rpx;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 12rpx;
		padding: 20rpx;
		font-size: 26rpx;
		box-sizing: border-box;
		margin-bottom: 30rpx;
		color: var(--text-color);
	}

	.modal-btns {
		display: flex;
		justify-content: space-between;
		gap: 20rpx;
	}

	.modal-btns button {
		flex: 1;
		height: 70rpx;
		line-height: 70rpx;
		font-size: 28rpx;
		border-radius: 35rpx;
		margin: 0;
	}

	.btn-cancel {
		background: var(--tool-bg);
		color: var(--text-color);
	}

	.btn-confirm {
		background: #007aff;
		color: #fff;
	}

</style>
