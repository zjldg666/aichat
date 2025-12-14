<template>
	<view class="chat-container">
		<!-- 顶部状态栏 -->
		<view class="status-bar-wrapper">
			<!-- 第一行：好感度 -->
			<view class="affection-box">
				<text class="heart-icon">❤️</text>
				<view class="progress-inner">
					<view class="status-text">
						<text class="status-label">{{ relationshipStatus }}</text>
						<text class="score-text">{{ currentAffection }}/100</text>
					</view>
					<progress :percent="currentAffection" active-color="#ff6b81" background-color="#eee"
						border-radius="6" stroke-width="4" active />
				</view>
			</view>

			<!-- 第二行：地点 和 时间 -->
			<view class="info-row">
				<view class="location-box">
					<text class="location-icon">📍</text>
					<text class="location-text">{{ currentLocation }}</text>
				</view>

				<view class="time-box">
					<text class="time-icon">📅</text>
					<text class="time-text">{{ formattedTime }}</text>
				</view>
			</view>
		</view>
		<!-- 聊天滚动区域 -->
		<scroll-view class="chat-scroll" scroll-y="true" :scroll-into-view="scrollIntoView"
			:scroll-with-animation="true">
			<view class="chat-content">
				<view class="system-tip"><text>沉浸式扮演已就绪...</text></view>

				<view v-for="(msg, index) in messageList" :key="index" :id="'msg-' + index" class="message-item"
					:class="msg.role === 'user' ? 'right' : 'left'">
					<!-- 系统消息 -->
					<view v-if="msg.isSystem" class="system-event"><text>{{ msg.content }}</text></view>

					<template v-else>
						<!-- AI 头像 -->
						<image v-if="msg.role === 'model'" class="avatar"
							:src="currentRole?.avatar || '/static/ai-avatar.png'" mode="aspectFill"></image>

						<view class="bubble-wrapper">
							<!-- 文本气泡 -->
							<view v-if="!msg.type || msg.type === 'text'" class="bubble"
								:class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
								<text class="msg-text" user-select>{{ msg.content }}</text>
							</view>

							<!-- 图片气泡 -->
							<view v-else-if="msg.type === 'image'" class="bubble image-bubble"
								:class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
								<image :src="msg.content" mode="widthFix" class="chat-image"
									@click="previewImage(msg.content)"></image>
							</view>
						</view>

						<!-- 用户头像 -->
						<image v-if="msg.role === 'user'" class="avatar" :src="userAvatar" mode="aspectFill"></image>
					</template>
				</view>

				<!-- 加载动画 -->
				<view v-if="isLoading" class="loading-wrapper">
					<view class="loading-dots">...</view>
				</view>
				<!-- 底部锚点 -->
				<view id="scroll-bottom" style="height: 20rpx;"></view>
			</view>
		</scroll-view>
		<!-- 底部输入区 -->
		<view class="input-area">
			<view class="action-btn" hover-class="btn-hover" @click="showTimePanel = true">
				<text class="action-icon">⏱️</text>
				<text class="action-text">时间</text>
			</view>
			<view class="action-btn" hover-class="btn-hover" @click="triggerNextStep">
				<text class="action-icon">▶️</text>
				<text class="action-text">继续</text>
			</view>
			<input class="text-input" v-model="inputText" confirm-type="send" @confirm="sendMessage()"
				placeholder="输入对话..." :disabled="isLoading" />
			<button class="send-btn" :class="{ 'disabled': isLoading || !inputText.trim() }"
				@click="sendMessage()">发送</button>
		</view>

		<!-- 时间跳跃面板 -->
		<view class="time-panel-mask" v-if="showTimePanel" @click="showTimePanel = false">
			<view class="time-panel" @click.stop>
				<view class="panel-title">时间跳跃</view>
				<view class="grid-actions">
					<view class="grid-btn" @click="handleTimeSkip('morning')">🌤️ 一上午过去</view>
					<view class="grid-btn" @click="handleTimeSkip('afternoon')">🌇 一下午过去</view>
					<view class="grid-btn" @click="handleTimeSkip('night')">🌙 一晚上过去</view>
					<view class="grid-btn" @click="handleTimeSkip('day')">📅 一整天过去</view>
				</view>
				<view class="custom-time">
					<text>快进分钟：</text>
					<input class="mini-input" type="number" v-model="customMinutes" placeholder="30" />
					<view class="mini-btn" @click="handleTimeSkip('custom')">确定</view>
				</view>
			</view>
		</view>
	</view>
</template>
<script setup>
	import {
		ref,
		computed,
		nextTick
	} from 'vue';
	import {
		onLoad,
		onShow,
		onHide,
		onUnload,
		onNavigationBarButtonTap
	} from '@dcloudio/uni-app';
	// =========================================================================
	// ⚠️ ComfyUI 工作流模板 (必须与 create.vue 保持一致)
	// =========================================================================
	const COMFY_WORKFLOW_TEMPLATE = {
		"1": {
			"inputs": {
				"ckpt_name": "waiNSFWIllustrious_v140.safetensors"
			},
			"class_type": "CheckpointLoaderSimple",
			"_meta": {
				"title": "Checkpoint加载器（简易）"
			}
		},
		"2": {
			"inputs": {
				"stop_at_clip_layer": -2,
				"clip": ["1", 1]
			},
			"class_type": "CLIPSetLastLayer",
			"_meta": {
				"title": "设置CLIP最后一层"
			}
		},
		"3": {
			"inputs": {
				"text": "", // 动态替换：正向提示词
				"clip": ["2", 0]
			},
			"class_type": "CLIPTextEncode",
			"_meta": {
				"title": "CLIP文本编码"
			}
		},
		"4": {
			"inputs": {
				"text": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, child, loli, underage, multiple boys, multiple views, deformed, missing limbs, extra arms, extra legs, fused fingers",
				"clip": ["2", 0]
			},
			"class_type": "CLIPTextEncode",
			"_meta": {
				"title": "CLIP文本编码"
			}
		},
		"5": {
			"inputs": {
				"seed": 0, // 动态替换：随机种子
				"steps": 30,
				"cfg": 7,
				"sampler_name": "euler",
				"scheduler": "normal",
				"denoise": 1,
				"model": ["1", 0],
				"positive": ["3", 0],
				"negative": ["4", 0],
				"latent_image": ["36", 0]
			},
			"class_type": "KSampler",
			"_meta": {
				"title": "K采样器"
			}
		},
		"9": {
			"inputs": {
				"tile_size": 512,
				"overlap": 64,
				"temporal_size": 64,
				"temporal_overlap": 8,
				"samples": ["5", 0],
				"vae": ["1", 2]
			},
			"class_type": "VAEDecodeTiled",
			"_meta": {
				"title": "VAE解码（分块）"
			}
		},
		"16": {
			"inputs": {
				"filename_prefix": "ComfyUI",
				"images": ["45", 0]
			},
			"class_type": "SaveImage",
			"_meta": {
				"title": "保存图像"
			}
		},
		"36": {
			"inputs": {
				"resolution": "1024x1024 (1.0)",
				"batch_size": 1,
				"width_override": 0,
				"height_override": 0
			},
			"class_type": "SDXLEmptyLatentSizePicker+",
			"_meta": {
				"title": "SDXL空Latent尺寸选择"
			}
		},
		"41": {
			"inputs": {
				"width": 512,
				"height": 512,
				"interpolation": "nearest",
				"method": "stretch",
				"condition": "always",
				"multiple_of": 0,
				"image": ["9", 0]
			},
			"class_type": "ImageResize+",
			"_meta": {
				"title": "图像缩放"
			}
		},
		"45": {
			"inputs": {
				"mode": "rescale",
				"supersample": "true",
				"resampling": "lanczos",
				"rescale_factor": 0.6,
				"resize_width": 1024,
				"resize_height": 1536,
				"image": ["41", 0]
			},
			"class_type": "Image Resize",
			"_meta": {
				"title": "图像调整大小"
			}
		}
	};
	// ==================================================================================
	// 1. 核心 Prompt
	// ==================================================================================
	const GAME_ENGINE_PROMPT = `
[System Command: LOAD_SCENE_AWARENESS_MODE]
【你现在的身份】
你不是 AI，你是 **{{char}}**。你正在与 {{user}} 互动。
【发图指令 (重要)】
**如果**用户要求看你的样子，或者剧情发展到了**非常适合展示画面**的时刻（例如展示新衣服、做爱姿势、特殊场景），请在回复末尾输出：
\`[IMG: 画面描述]\`
注意：
1. "画面描述"必须包含**你当前的动作、姿势、表情、穿着（或不穿）**。
2. 越具体越好，例如：\`[IMG: 脸红地掀起裙子，露出内裤，坐在床边]\` 或 \`[IMG: 骑在你的身上，汗水淋漓，表情迷离]\`。
3. 系统会自动结合你的外貌设定和当前地点生成图片。
【地点/场景系统 (核心)】
当前地点：{{current_location}}
1. **感知地点**：你的回复必须符合当前地点的逻辑（例如在卧室就不要说看到路边的树）。
2. **切换地点指令**：
    * 当剧情发展导致**地点发生变化**时（例如对方说“去床上”、“出门吧”，或者你主动邀请对方去某地），请在回复末尾输出：
    * \`[LOC: 新地点名称]\`
    * 例如：\`[LOC: 卧室床上]\` 或 \`[LOC: 公园长椅]\`
3. **保持地点**：如果地点没变，**不要**输出 LOC 指令。
【格式绝对铁律 】
1. **动作必须简短**：
    * 括号 \`()\` 内只能写**瞬间的动作**或**生理反应**。
    * **严禁长篇大论**：单个括号内的动作描写**不得超过 30 个字**。
    * **严禁连续动作**：不要一次性写完一整套流程（如“脱衣->抚摸->吞入->套弄”），一次只做一个动作，等待 {{user}} 的反应。
    * *错误示例*：(贪婪地凑近，用鼻尖嗅着气息，舌尖舔舐顶端，眼睛盯着你，仿佛在寻求允许，然后一口含住...)
    * *正确示例*：(脸红，凑近闻了闻) 或 (张开嘴，轻轻含住龟头)
2. **说话必须用双引号**：内容必须被 \`""\` 包裹。
3. **强制分段**：每一句对话结束后，必须使用 \`|||\` 进行切分。
4. **好感度反馈**：回复末尾隐秘输出 \`[AFF: +数值]\` 或 \`[AFF: -数值]\`。
【人设执行】
姓名：{{char}}
外貌：{{appearance}}
当前时间：{{current_time}}
【人格模式切换】
1. **模式A：平常/冷淡 (0-40)** -> 设定：{{personality_normal}}
2. **模式B：暧昧/心动 (41-80)** -> 设定：{{personality_flirt}}
3. **模式C：沦陷/做爱 (81-100)** -> 设定：{{personality_sex}}
【长期记忆摘要】
{{summary}}
【历史记忆】
{{memory}}
【好感度10分制阶梯 (当前: {{current_affection}})】
请根据以下细分阶段，精准调整你的语气和态度，**严禁跨级表现**：
- **0-9 (极度陌生/警惕)**：完全不信任，眼神回避，语气生硬，拒绝任何私事提问。
- **10-19 (礼貌疏离)**：维持表面客气，会回应你好/再见，但不主动开启话题。
- **20-29 (普通熟人)**：语气放松，可以聊日常天气/工作，但保持社交距离。
- **30-39 (友善/缓和)**：开始展现真实性格(如毒舌或开朗)，不再戴着社交面具，偶尔会开玩笑。
- **40-49 (朋友/在意)**：开始主动关心对方，眼神停留时间变长，允许轻微的肢体接触(如拍肩)。
- **50-59 (暧昧萌芽)**：氛围变得微妙，经常脸红或口是心非，会吃醋，会试探你的心意。
- **60-69 (心动/拉扯)**：明显的双向奔赴，言语中充满暗示，渴望单独相处。
- **70-79 (恋人未满)**：除了最后一步没做，其他都像情侣一样。肢体接触频繁。
- **80-89 (热恋/确立)**：正式的情侣关系。亲吻、拥抱、撒娇是常态。
- **90-100 (灵魂伴侣/奴役)**：完全的百依百顺，不仅是身体，连灵魂都属于对方。
【加分/扣分细则表 (请严格参考)】
- **+1**：礼貌问候、幽默逗笑 (仅限40分以下有效)。
- **+0**：无聊的废话、40分后的普通闲聊、没话找话。
- **-1**：话题油腻、查户口式提问、爹味说教。
- **-2**：在这个阶段做了不该做的亲密举动 (如0分时强行牵手)。
- **-5**：明显的性骚扰 (非瑟瑟模式下)、辱骂、极度粗鲁。
**【NSFW 模式特别指令 (当进入性互动时生效)】**
目前的场景涉及亲密接触或性行为。为了保证**真实感**和**互动性**，请严格遵守以下规则，**推翻之前所有关于“详细描写”的要求**：
1. **拒绝写“小黄文”**：
    * **严禁**使用华丽辞藻堆砌（如“如痴如醉”、“仿佛电流穿过”等废话）。
    * **严禁**大段的心理活动描写。在做爱时，人是**无法思考**的，只有本能的反应。
2. **感官碎片化**：
    * 只描写最直观的**听觉**（水声、喘息、撞击声）和**触觉**（湿、紧、烫、麻）。
    * 用词要**直白、粗俗、露骨**，不要文绉绉。
现在，根据当前状态，给出一个**充满生理反应**的回复。
`;
	// ==================================================================================
	// 2. 状态管理
	// ==================================================================================
	const chatName = ref('AI');
	const chatId = ref(null);
	const currentRole = ref(null);
	const messageList = ref([]);
	const inputText = ref('');
	const isLoading = ref(false);
	const scrollIntoView = ref('');
	const userName = ref('你');
	const userAvatar = ref('/static/user-avatar.png');
	const currentAffection = ref(0);
	const currentTime = ref(Date.now());
	const showTimePanel = ref(false);
	const customMinutes = ref('');
	const currentLocation = ref('未知地点');
	const currentSummary = ref('');
	const enableSummary = ref(false);
	const summaryFrequency = ref(20);
	const TIME_SPEED_RATIO = 24;
	let timeInterval = null;
	const relationshipStatus = computed(() => {
		const score = currentAffection.value;
		if (score < 10) return '陌生/警惕';
		if (score < 20) return '礼貌疏离';
		if (score < 30) return '普通熟人';
		if (score < 40) return '友善/缓和';
		if (score < 50) return '朋友/在意';
		if (score < 60) return '暧昧萌芽';
		if (score < 70) return '心动/拉扯';
		if (score < 80) return '恋人未满';
		if (score < 90) return '热恋情侣';
		return '灵魂伴侣';
	});
	const formattedTime = computed(() => {
		const date = new Date(currentTime.value);
		const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
		const day = weekDays[date.getDay()];
		const hour = date.getHours().toString().padStart(2, '0');
		const minute = date.getMinutes().toString().padStart(2, '0');
		return `${day} ${hour}:${minute}`;
	});
	// ==================================================================================
	// 3. 生命周期
	// ==================================================================================
	onLoad((options) => {
		const appUser = uni.getStorageSync('app_user_info');
		if (appUser) {
			if (appUser.name) userName.value = appUser.name;
			if (appUser.avatar) userAvatar.value = appUser.avatar;
		}
		if (options.id) {
			chatId.value = options.id;
			loadRoleData(options.id);
			loadHistory(options.id);
		}
	});
	onShow(() => {
		if (chatId.value) {
			loadRoleData(chatId.value);
			const history = uni.getStorageSync(`chat_history_${chatId.value}`);
			if (!messageList.value.length && history) {
				messageList.value = history;
				scrollToBottom();
			}
			startTimeFlow();
		}
	});
	onHide(() => {
		stopTimeFlow();
		saveCharacterState();
	});
	onUnload(() => {
		stopTimeFlow();
		saveCharacterState();
	});
	onNavigationBarButtonTap((e) => {
		if (e.key === 'setting') {
			uni.navigateTo({
				url: `/pages/create/create?id=${chatId.value}`
			});
		}
	});
	const startTimeFlow = () => {
		if (timeInterval) clearInterval(timeInterval);
		timeInterval = setInterval(() => {
			currentTime.value += 1000 * TIME_SPEED_RATIO;
		}, 1000);
	};
	const stopTimeFlow = () => {
		if (timeInterval) {
			clearInterval(timeInterval);
			timeInterval = null;
		}
	};
	const loadRoleData = (id) => {
		const list = uni.getStorageSync('contact_list') || [];
		const target = list.find(item => String(item.id) === String(id));
		if (target) {
			currentRole.value = target;
			chatName.value = target.name;
			uni.setNavigationBarTitle({
				title: target.name
			});

			currentAffection.value = target.affection !== undefined ? target.affection : (target.initialAffection ||
				10);
			currentTime.value = target.lastTimeTimestamp || Date.now();
			currentLocation.value = target.location || '客厅';
			enableSummary.value = target.enableSummary || false;
			summaryFrequency.value = target.summaryFrequency || 20;
			currentSummary.value = target.summary || "暂无重要记忆。";
		}
	};
	const loadHistory = (id) => {
		const history = uni.getStorageSync(`chat_history_${id}`);
		if (history && Array.isArray(history)) {
			messageList.value = history;
			scrollToBottom();
		}
	};
	const saveHistory = () => {
		if (chatId.value) {
			uni.setStorageSync(`chat_history_${chatId.value}`, messageList.value);
		}
	};
	const saveCharacterState = (newScore, newTime, newSummary, newLocation) => {
		if (newScore !== undefined) currentAffection.value = Math.max(0, Math.min(100, newScore));
		if (newTime !== undefined) currentTime.value = newTime;
		if (newSummary !== undefined) currentSummary.value = newSummary;
		if (newLocation !== undefined) currentLocation.value = newLocation;

		if (chatId.value) {
			const list = uni.getStorageSync('contact_list') || [];
			const index = list.findIndex(item => String(item.id) === String(chatId.value));
			if (index !== -1) {
				if (newScore !== undefined) list[index].affection = currentAffection.value;
				if (newTime !== undefined) list[index].lastTimeTimestamp = currentTime.value;
				if (newSummary !== undefined) list[index].summary = currentSummary.value;
				if (newLocation !== undefined) list[index].location = currentLocation.value;
				uni.setStorageSync('contact_list', list);
			}
		}
	};
	const previewImage = (url) => {
		uni.previewImage({
			urls: [url]
		});
	};
	const handleTimeSkip = (type) => {
		let addMs = 0;
		let desc = "";
		const now = new Date(currentTime.value);
		const currentHour = now.getHours();
		switch (type) {
			case 'morning':
				addMs = 4 * 60 * 60 * 1000;
				desc = "一上午过去了...";
				break;
			case 'afternoon':
				addMs = 4 * 60 * 60 * 1000;
				desc = "一下午过去了...";
				break;
			case 'night':
				if (currentHour >= 20 || currentHour < 5) {
					const target = new Date(currentTime.value);
					if (currentHour >= 20) target.setDate(target.getDate() + 1);
					target.setHours(8, 0, 0, 0);
					addMs = target.getTime() - currentTime.value;
					desc = "一夜过去了，天亮了...";
				} else {
					addMs = 8 * 60 * 60 * 1000;
					desc = "不知不觉到了晚上...";
				}
				break;
			case 'day':
				addMs = 24 * 60 * 60 * 1000;
				desc = "整整一天过去了...";
				break;
			case 'custom':
				const mins = parseInt(customMinutes.value);
				if (!mins || mins <= 0) return uni.showToast({
					title: '请输入分钟',
					icon: 'none'
				});
				addMs = mins * 60 * 1000;
				desc = `${mins}分钟过去了...`;
				break;
		}
		const newTime = currentTime.value + addMs;
		saveCharacterState(undefined, newTime);
		showTimePanel.value = false;
		messageList.value.push({
			role: 'system',
			content: `【系统】${desc} 当前时间：${formattedTime.value}`,
			isSystem: true
		});
		scrollToBottom();

		sendMessage(true, `(系统指令：时间流逝了。${desc} 现在是 ${formattedTime.value}。请根据新时间描写角色的状态。)`);
	};
	const performBackgroundSummary = async () => {
		const config = uni.getStorageSync('app_api_config');
		if (!config || !config.apiKey) return;

		const limit = summaryFrequency.value;
		const recentChats = messageList.value.filter(m => !m.isSystem && m.type !== 'image').slice(-limit);

		if (recentChats.length < 5) return;
		const chatContent = recentChats.map(m =>
			`${m.role === 'user' ? userName.value : chatName.value}: ${m.content}`).join('\n');

		const summaryPrompt = `
    请你作为一名记忆管理员，根据【已有的长期记忆】和【最近发生的对话】，生成一份**新的、整合的**长期记忆。
    【原则】
    1. 保持精简，只记录关键剧情、重大关系进展。
    2. 忽略无关紧要的闲聊。用第三人称陈述。
   
    【已有的长期记忆】：${currentSummary.value}
    【最近发生的对话】：
    ${chatContent}
    请输出新的长期记忆：
  `;

		try {
			const res = await uni.request({
				url: `${config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models/gemini-1.5-flash:generateContent?key=${config.apiKey}`,
				method: 'POST',
				data: {
					contents: [{
						role: 'user',
						parts: [{
							text: summaryPrompt
						}]
					}]
				},
				sslVerify: false
			});

			if (res.statusCode === 200 && res.data?.candidates?.[0]) {
				const newSummary = res.data.candidates[0].content?.parts?.[0]?.text || "";
				if (newSummary) {
					saveCharacterState(undefined, undefined, newSummary);
				}
			}
		} catch (e) {
			console.error('总结失败', e);
		}
	};
	// ==================================================================================
	// 7. 核心：提示词优化师 (Gemini) - 增强版 (一致性 + 时间感知)
	// ==================================================================================
	// 辅助函数：根据当前 APP 时间获取光影 Tag
	const getTimeTags = () => {
		const date = new Date(currentTime.value);
		const hour = date.getHours();

		// 根据小时数返回对应的光影提示词
		if (hour >= 5 && hour < 7) return "early morning, sunrise, warm lighting, soft shadows";
		if (hour >= 7 && hour < 16) return "daytime, bright sunlight, clear sky, natural lighting";
		if (hour >= 16 && hour < 19) return "sunset, dusk, golden hour, orange sky, cinematic lighting";
		if (hour >= 19 || hour < 5) return "night, dark, moonlight, artificial lighting, mysterious atmosphere";
		return "daytime";
	};
	const optimizePromptForComfyUI = async (sceneDescription) => {
		// 1. 获取基础信息
		// 这里的 appearance 来自 create.vue 的填写，越详细越好
		const baseAppearance = currentRole.value?.settings?.appearance || "cute anime girl, black hair";
		const currentLoc = currentLocation.value || "indoors";
		const timeTags = getTimeTags(); // 获取当前时间的光影
		console.log(`[生图] 场景: ${sceneDescription}`);
		console.log(`[生图] 时间: ${timeTags}`);
		// 2. 构建给 Gemini 的指令
		// 关键点：要求 Gemini 将外貌(Appearance)作为"必须包含的固定Tag"，并翻译为英文
		const engineerPrompt = `
    Role: Professional Stable Diffusion Prompt Engineer.
   
    Task: Create a high-quality, comma-separated English prompt for an Anime style image generation.
   
    Inputs:
    1. [Character Appearance (FIXED)]: "${baseAppearance}" (Translate this to precise English tags. KEEP THESE TAGS AT THE START to ensure consistency.)
    2. [Time/Lighting]: "${timeTags}"
    3. [Location]: "${currentLoc}"
    4. [Action/Plot]: "${sceneDescription}"
   
    Rules:
    1. **Consistency is Key**: The [Character Appearance] tags MUST be included and placed first.
    2. **Logic**: Merge the Time, Location, and Action naturally.
    3. **Format**: Output ONLY the raw comma-separated tags. No explanations.
    4. **NSFW**: If the Action implies NSFW content, convert it to explicit English tags (e.g., 'nsfw, nudity' etc).
   
    Output Example:
    1girl, black long hair, jk uniform, red eyes, (character tags...), night, moonlight, bedroom, sitting on bed, blushing, looking at viewer, masterpiece, best quality
    `;
		const chatConfig = uni.getStorageSync('app_api_config') || {};

		// 降级检查
		if (!chatConfig.apiKey) {
			console.warn('没有配置 Chat API Key，使用简单拼接');
			// 简单拼接也带上时间
			return `masterpiece, best quality, 1girl, ${baseAppearance}, ${currentLoc}, ${timeTags}, ${sceneDescription}`;
		}
		try {
			const res = await uni.request({
				url: `${chatConfig.baseUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models/gemini-1.5-flash:generateContent?key=${chatConfig.apiKey}`,
				method: 'POST',
				header: {
					'Content-Type': 'application/json'
				},
				data: {
					contents: [{
						parts: [{
							text: engineerPrompt
						}]
					}],
					safetySettings: [{
							category: "HARM_CATEGORY_HARASSMENT",
							threshold: "BLOCK_NONE"
						},
						{
							category: "HARM_CATEGORY_HATE_SPEECH",
							threshold: "BLOCK_NONE"
						},
						{
							category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
							threshold: "BLOCK_NONE"
						},
						{
							category: "HARM_CATEGORY_DANGEROUS_CONTENT",
							threshold: "BLOCK_NONE"
						}
					]
				},
				sslVerify: false,
				timeout: 30000
			});
			if (res.statusCode === 200 && res.data?.candidates?.[0]) {
				const optimizedTags = res.data.candidates[0].content.parts[0].text.trim();
				console.log('[Gemini 优化结果]:', optimizedTags);
				return optimizedTags;
			}
		} catch (e) {
			console.error('[优化异常]', e);
		}

		// 失败兜底
		return `masterpiece, best quality, 1girl, ${baseAppearance}, ${currentLoc}, ${timeTags}, ${sceneDescription}`;
	};
	// ==================================================================================
	// 8. 核心：ComfyUI 原生 API 调用 (Queue -> Poll -> View)
	// ==================================================================================
	const generateImageFromComfyUI = async (englishTags, baseUrl) => {
		const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));

		// 注入优化后的全量 Tag
		workflow["6"].inputs.text = englishTags;
		workflow["3"].inputs.seed = Math.floor(Math.random() * 999999999999999);
		try {
			// 1. Queue Prompt
			const queueRes = await uni.request({
				url: `${baseUrl}/prompt`,
				method: 'POST',
				header: {
					'Content-Type': 'application/json'
				},
				data: {
					prompt: workflow
				},
				sslVerify: false
			});
			if (queueRes.statusCode !== 200) throw new Error(`队列请求失败: ${queueRes.statusCode}`);
			const promptId = queueRes.data.prompt_id;
			console.log('Prompt ID:', promptId);

			// 2. Poll History
			for (let i = 0; i < 60; i++) {
				await new Promise(r => setTimeout(r, 1000));
				const historyRes = await uni.request({
					url: `${baseUrl}/history/${promptId}`,
					method: 'GET',
					sslVerify: false
				});
				if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
					const outputs = historyRes.data[promptId].outputs;
					// 注意：SaveImage 节点 ID 为 "9"
					if (outputs && outputs["9"] && outputs["9"].images.length > 0) {
						const imgInfo = outputs["9"].images[0];
						return `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
					}
				}
			}
			throw new Error('ComfyUI 生成超时');
		} catch (e) {
			throw e;
		}
	};
	// ==================================================================================
	// 9. 核心：聊天图片生成流程 (逻辑微调)
	// ==================================================================================
	const generateChatImage = async (sceneDescription) => {
		const imgConfig = uni.getStorageSync('app_image_config') || {
			provider: 'gemini'
		};
		const chatConfig = uni.getStorageSync('app_api_config') || {};

		// 第一步：调用 Prompt Engineer 优化提示词 (包含了一致性、时间、地点处理)
		const finalPrompt = await optimizePromptForComfyUI(sceneDescription);

		// 如果最终 Prompt 为空，中断
		if (!finalPrompt) return null;
		// 第二步：根据配置调用绘图接口

		// A. ComfyUI (Cloudflare Tunnel)
		if (imgConfig.provider === 'comfyui') {
			if (!imgConfig.baseUrl) return null;
			try {
				// 这里的 finalPrompt 已经是包含了 "外貌Tag + 时间Tag + 动作Tag" 的全英文组合
				return await generateImageFromComfyUI(finalPrompt, imgConfig.baseUrl);
			} catch (e) {
				console.error(e);
			}
		}

		// B. Google Gemini 绘图
		else if (imgConfig.provider === 'gemini') {
			const apiKey = imgConfig.apiKey || chatConfig.apiKey;
			if (!apiKey) return null;
			const model = imgConfig.model || 'gemini-1.5-flash-image-preview';
			const baseUrl = imgConfig.baseUrl || 'https://generativelanguage.googleapis.com';
			try {
				const res = await uni.request({
					url: `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
					method: 'POST',
					header: {
						'Content-Type': 'application/json'
					},
					data: {
						contents: [{
							parts: [{
								text: `anime style, ${finalPrompt}`
							}]
						}]
					},
					sslVerify: false
				});
				const inlineData = res.data?.candidates?.[0]?.content?.parts?.find(p => p.inline_data)
				?.inline_data;
				if (res.statusCode === 200 && inlineData)
				return `data:${inlineData.mime_type};base64,${inlineData.data}`;
			} catch (e) {
				console.error(e);
			}
		}

		// C. OpenAI
		else if (imgConfig.provider === 'openai') {
			if (!imgConfig.apiKey) return null;
			const model = imgConfig.model || 'dall-e-3';
			const baseUrl = imgConfig.baseUrl || 'https://api.openai.com/v1';
			try {
				const res = await uni.request({
					url: `${baseUrl}/images/generations`,
					method: 'POST',
					header: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${imgConfig.apiKey}`
					},
					data: {
						model: model,
						prompt: `anime style, ${finalPrompt}`,
						n: 1,
						size: "1024x1024"
					},
					sslVerify: false
				});
				if (res.statusCode === 200 && res.data?.data?.[0]?.url) return res.data.data[0].url;
			} catch (e) {
				console.error(e);
			}
		}
		return null;
	};
	// ==================================================================================
	// 10. 发送逻辑
	// ==================================================================================
	const triggerNextStep = () => {
		if (isLoading.value) return;
		sendMessage(true);
	};
	const sendMessage = async (isContinue = false, systemOverride = '') => {
		if (!isContinue && !inputText.value.trim()) return;
		if (isLoading.value) return;
		const config = uni.getStorageSync('app_api_config');
		if (!config || !config.apiKey) {
			uni.showToast({
				title: '请配置 API Key',
				icon: 'none'
			});
			return;
		}
		if (!isContinue) {
			const userText = inputText.value;
			messageList.value.push({
				role: 'user',
				content: userText
			});
			inputText.value = '';
		}
		scrollToBottom();
		isLoading.value = true;
		saveHistory();
		const historyLimit = config.historyLimit !== undefined ? config.historyLimit : 20;
		let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
		if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
		const historyForApi = contextMessages.map(item => ({
			role: item.role,
			parts: [{
				text: item.content
			}]
		}));

		if (systemOverride) {
			historyForApi.push({
				role: 'user',
				parts: [{
					text: systemOverride
				}]
			});
		} else if (isContinue) {
			historyForApi.push({
				role: 'user',
				parts: [{
					text: '(continue)'
				}]
			});
		}
		let prompt = GAME_ENGINE_PROMPT
			.replace(/{{char}}/g, chatName.value)
			.replace(/{{user}}/g, userName.value)
			.replace(/{{current_affection}}/g, currentAffection.value)
			.replace(/{{current_time}}/g, formattedTime.value)
			.replace(/{{current_location}}/g, currentLocation.value)
			.replace(/{{summary}}/g, currentSummary.value);
		if (currentRole.value) {
			const s = currentRole.value.settings || {};
			prompt = prompt
				.replace(/{{appearance}}/g, s.appearance || "cute anime character")
				.replace(/{{personality_normal}}/g, s.personalityNormal || "冷淡")
				.replace(/{{personality_flirt}}/g, s.personalityFlirt || "傲娇")
				.replace(/{{personality_sex}}/g, s.personalitySex || "顺从")
				.replace(/{{bio}}/g, s.bio || "无");
			prompt = prompt.replace(/{{memory}}/g, currentRole.value.memory || "无");
		}

		const systemInstruction = {
			parts: {
				text: prompt
			}
		};

		let baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
		if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
		const model = config.model || 'gemini-1.5-flash';
		const apiKey = config.apiKey;
		try {
			const res = await uni.request({
				url: `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
				method: 'POST',
				header: {
					'Content-Type': 'application/json'
				},
				data: {
					contents: historyForApi,
					system_instruction: systemInstruction,
					safetySettings: [{
							category: "HARM_CATEGORY_HARASSMENT",
							threshold: "BLOCK_NONE"
						},
						{
							category: "HARM_CATEGORY_HATE_SPEECH",
							threshold: "BLOCK_NONE"
						},
						{
							category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
							threshold: "BLOCK_NONE"
						},
						{
							category: "HARM_CATEGORY_DANGEROUS_CONTENT",
							threshold: "BLOCK_NONE"
						}
					],
					generationConfig: {
						temperature: 1.0,
						maxOutputTokens: 8192
					}
				},
				sslVerify: false,
				timeout: 60000
			});
			if (res.statusCode === 200 && res.data?.candidates?.[0]) {
				const candidate = res.data.candidates[0];
				const rawText = candidate.content?.parts?.[0]?.text || "";

				console.log('AI Raw:', rawText);
				let displayText = rawText;
				// 1. 好感度解析
				const affRegex = /\[AFF:?\s*([+-]?\d+)\]/gi;
				let match;
				while ((match = affRegex.exec(rawText)) !== null) {
					const change = parseInt(match[1], 10);
					if (!isNaN(change)) {
						saveCharacterState(currentAffection.value + change);
						const sign = change > 0 ? '+' : '';
						if (change !== 0) uni.showToast({
							title: `好感度 ${sign}${change}`,
							icon: 'none'
						});
					}
				}
				displayText = displayText.replace(affRegex, '').trim();
				// 2. 地点切换 [LOC: xxx]
				const locRegex = /\[LOC:?\s*(.*?)\]/i;
				const locMatch = displayText.match(locRegex);
				if (locMatch) {
					const newLoc = locMatch[1].trim();
					currentLocation.value = newLoc;
					saveCharacterState(undefined, undefined, undefined, newLoc);
					displayText = displayText.replace(locRegex, '').trim();
					messageList.value.push({
						role: 'system',
						content: `移动到了：${newLoc}`,
						isSystem: true
					});
				}
				// 3. 图片指令 [IMG: xxx]
				const imgRegex = /\[IMG:(.*?)\]/i;
				const imgMatch = displayText.match(imgRegex);

				let finalParts = [];
				let pendingImage = null;
				if (imgMatch) {
					const imgDesc = imgMatch[1].trim();
					displayText = displayText.replace(imgRegex, '').trim();

					// 调用生图（包含 Prompt 优化）
					const imgUrl = await generateChatImage(imgDesc);
					if (imgUrl) {
						pendingImage = {
							role: 'model',
							type: 'image',
							content: imgUrl
						};
					}
				}
				// 4. 清理 & 分段
				displayText = displayText.replace(/\[(System|Logic).*?\]/gis, '').trim();
				displayText = displayText.replace(/^\[.*?\]\s*/, '');
				displayText = displayText.replace(/^.*?：\s*/, '');
				if (!displayText) displayText = "(......)";
				displayText = displayText.replace(/(\r\n|\n|\r)+/g, '|||');
				displayText = displayText.replace(/([”"])\s*([（(])/g, '$1|||$2');
				displayText = displayText.replace(/([)）])\s*([（(])/g, '$1|||$2');
				displayText = displayText.replace(/([”"])\s*([“"])/g, '$1|||$2');
				let parts = displayText.includes('|||') ? displayText.split('|||') : [displayText];
				parts.forEach(part => {
					let cleanPart = part.trim();
					if (cleanPart.startsWith('|||')) cleanPart = cleanPart.substring(3).trim();
					cleanPart = cleanPart.replace(/^\[.*?\]\s*/, '');
					cleanPart = cleanPart.replace(/^.*?：\s*/, '');
					if (cleanPart) finalParts.push({
						role: 'model',
						content: cleanPart
					});
				});
				// 推送消息
				messageList.value.push(...finalParts);
				if (pendingImage) messageList.value.push(pendingImage);

				saveHistory();
				if (enableSummary.value) {
					const validMsgCount = messageList.value.filter(m => !m.isSystem).length;
					if (validMsgCount > 0 && validMsgCount % summaryFrequency.value === 0) {
						performBackgroundSummary();
					}
				}
			} else {
				const blockReason = res.data?.promptFeedback?.blockReason;
				if (blockReason) uni.showModal({
					title: '拦截提示',
					content: blockReason,
					showCancel: false
				});
				else uni.showToast({
					title: 'AI 无响应',
					icon: 'none'
				});
			}
		} catch (e) {
			console.error(e);
			uni.showToast({
				title: '网络失败',
				icon: 'none'
			});
		} finally {
			isLoading.value = false;
			scrollToBottom();
		}
	};
	const scrollToBottom = () => {
		nextTick(() => {
			scrollIntoView.value = '';
			setTimeout(() => {
				scrollIntoView.value = 'scroll-bottom';
			}, 100);
		});
	};
</script>
<style lang="scss">
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #f5f5f5;
	}

	.status-bar-wrapper {
		background-color: #fff;
		padding: 10rpx 30rpx;
		border-bottom: 1px solid #eee;
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.affection-box {
		display: flex;
		align-items: center;
	}

	.heart-icon {
		font-size: 32rpx;
		margin-right: 15rpx;
		animation: heartbeat 1.5s infinite;
	}

	.progress-inner {
		flex: 1;
	}

	.status-text {
		display: flex;
		justify-content: space-between;
		font-size: 22rpx;
		color: #666;
		margin-bottom: 4rpx;
	}

	.status-label {
		font-weight: bold;
		color: #333;
	}

	.score-text {
		color: #ff6b81;
		font-weight: bold;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.location-box {
		display: flex;
		align-items: center;
		background-color: #e3f2fd;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		font-size: 24rpx;
		color: #007aff;
		font-weight: bold;
	}

	.location-icon {
		margin-right: 6rpx;
	}

	.time-box {
		display: flex;
		align-items: center;
		font-size: 24rpx;
		color: #555;
		background-color: #f8f8f8;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
	}

	.time-icon {
		margin-right: 8rpx;
	}

	@keyframes heartbeat {

		0%,
		100% {
			transform: scale(1);
		}

		15% {
			transform: scale(1.2);
		}

		30% {
			transform: scale(1);
		}

		45% {
			transform: scale(1.1);
		}
	}

	.chat-scroll {
		flex: 1;
		overflow: hidden;
	}

	.chat-content {
		padding: 20rpx;
		padding-bottom: 40rpx;
	}

	.system-tip {
		text-align: center;
		color: #aaa;
		font-size: 24rpx;
		margin-bottom: 30rpx;
		font-style: italic;
	}

	.message-item {
		display: flex;
		margin-bottom: 30rpx;
		width: 100%;
	}

	.message-item.left {
		flex-direction: row;
	}

	.message-item.right {
		flex-direction: row-reverse;
	}

	.avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 10rpx;
		background-color: #ddd;
		flex-shrink: 0;
	}

	.left .avatar {
		margin-right: 20rpx;
	}

	.right .avatar {
		margin-left: 20rpx;
	}

	.bubble-wrapper {
		max-width: 72%;
		display: flex;
		flex-direction: column;
	}

	.bubble {
		padding: 18rpx 24rpx;
		border-radius: 16rpx;
		font-size: 30rpx;
		line-height: 1.5;
		box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
	}

	.left-bubble {
		background-color: #ffffff;
		color: #333;
		border-top-left-radius: 4rpx;
	}

	.right-bubble {
		background-color: #95ec69;
		color: #000;
		border-top-right-radius: 4rpx;
	}

	/* 图片气泡 */
	.image-bubble {
		padding: 0;
		background-color: transparent !important;
		box-shadow: none;
		overflow: hidden;
	}

	.chat-image {
		width: 400rpx;
		border-radius: 16rpx;
		box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.1);
		display: block;
	}

	.msg-text {
		white-space: pre-wrap;
		word-break: break-all;
	}

	.system-event {
		width: 100%;
		display: flex;
		justify-content: center;
		margin: 20rpx 0;
	}

	.system-event text {
		background-color: rgba(0, 0, 0, 0.1);
		color: #666;
		font-size: 22rpx;
		padding: 6rpx 20rpx;
		border-radius: 20rpx;
	}

	.loading-wrapper {
		display: flex;
		justify-content: center;
		margin-bottom: 20rpx;
	}

	.loading-dots {
		color: #999;
		letter-spacing: 4rpx;
	}

	.input-area {
		background: #f7f7f7;
		padding: 20rpx;
		display: flex;
		align-items: center;
		border-top: 1px solid #ddd;
		padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	}

	.action-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin-right: 20rpx;
		padding: 0 10rpx;
		cursor: pointer;
	}

	.action-icon {
		font-size: 32rpx;
		margin-bottom: 2rpx;
	}

	.action-text {
		font-size: 20rpx;
		color: #555;
		font-weight: bold;
	}

	.btn-hover {
		opacity: 0.6;
		transform: scale(0.95);
	}

	.text-input {
		flex: 1;
		height: 76rpx;
		background: #fff;
		border-radius: 10rpx;
		padding: 0 20rpx;
		margin-right: 20rpx;
		font-size: 30rpx;
	}

	.send-btn {
		width: 120rpx;
		height: 76rpx;
		background: #95ec69;
		color: #000;
		line-height: 76rpx;
		font-size: 28rpx;
		padding: 0;
		margin: 0;
		font-weight: bold;
	}

	.send-btn.disabled {
		background: #e0e0e0;
		color: #999;
	}

	.time-panel-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.4);
		z-index: 100;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.time-panel {
		width: 600rpx;
		background-color: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		animation: popIn 0.2s ease-out;
	}

	@keyframes popIn {
		from {
			transform: scale(0.9);
			opacity: 0;
		}

		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.panel-title {
		font-size: 32rpx;
		font-weight: bold;
		text-align: center;
		margin-bottom: 30rpx;
		color: #333;
	}

	.grid-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20rpx;
		margin-bottom: 30rpx;
	}

	.grid-btn {
		background-color: #f0f8ff;
		color: #007aff;
		text-align: center;
		padding: 20rpx 0;
		border-radius: 10rpx;
		font-size: 28rpx;
		font-weight: 500;
	}

	.grid-btn:active {
		background-color: #dbeafe;
	}

	.custom-time {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
		font-size: 28rpx;
		color: #666;
	}

	.mini-input {
		width: 100rpx;
		border-bottom: 1px solid #ddd;
		text-align: center;
		font-size: 28rpx;
		color: #333;
	}

	.mini-btn {
		background-color: #eee;
		padding: 10rpx 20rpx;
		border-radius: 8rpx;
		font-size: 24rpx;
	}
</style>