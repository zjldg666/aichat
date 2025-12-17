<template>
  <view class="chat-container">
    
    <!-- 1. 顶部状态栏 -->
    <view class="status-bar-wrapper">
      <view class="info-row">
        <!-- 地点与模式状态 -->
        <view class="location-box" :class="interactionMode === 'phone' ? 'phone-mode' : 'face-mode'">
          <text class="location-icon">{{ interactionMode === 'phone' ? '📱' : '📍' }}</text>
          
          <view class="status-content">
            <text class="location-text">
              {{ interactionMode === 'phone' ? '对方在' : '当前' }}: {{ currentLocation }}
            </text>
            <text class="activity-text">
              状态: {{ currentActivity }}
            </text>
          </view>
        </view>
       
        <!-- 时间显示与设置 -->
        <view class="time-box" @click="showTimeSettingPanel = true">
          <text class="time-icon">📅</text>
          <text class="time-text">{{ formattedTime }}</text>
        </view>
      </view>
    </view>

    <!-- 2. 聊天内容滚动区 -->
    <scroll-view class="chat-scroll" scroll-y="true" :scroll-into-view="scrollIntoView" :scroll-with-animation="true">
      <view class="chat-content">
        <view class="system-tip"><text>沉浸式扮演已就绪...</text></view>
       
        <view v-for="(msg, index) in messageList" :key="index" :id="'msg-' + index" class="message-item" :class="msg.role === 'user' ? 'right' : 'left'">
          
          <!-- 系统消息 / 错误重试 -->
          <view v-if="msg.isSystem" class="system-event">
            <text v-if="!msg.isError">{{ msg.content }}</text>
            <text v-else class="error-system-msg" @click="retryGenerateImage(msg)">
               {{ msg.content }} 🔄
            </text>
          </view>
          
          <!-- 对话消息 -->
          <template v-else>
            <!-- 角色头像 -->
            <image v-if="msg.role === 'model'" class="avatar" :src="currentRole?.avatar || '/static/ai-avatar.png'" mode="aspectFill"></image>
           
            <view class="bubble-wrapper">
              <!-- 文本气泡 -->
              <view v-if="!msg.type || msg.type === 'text'" class="bubble" :class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
                <text class="msg-text" user-select>{{ msg.content }}</text>
              </view>
              <!-- 图片气泡 -->
              <view v-else-if="msg.type === 'image'" class="bubble image-bubble" :class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
                 <image :src="msg.content" mode="widthFix" class="chat-image" @click="previewImage(msg.content)"></image>
              </view>
            </view>
           
            <!-- 用户头像 -->
            <image v-if="msg.role === 'user'" class="avatar" :src="userAvatar" mode="aspectFill"></image>
          </template>
        </view>
       
        <!-- Loading 动画 -->
        <view v-if="isLoading" class="loading-wrapper"><view class="loading-dots">...</view></view>
        <!-- 滚动锚点 -->
        <view id="scroll-bottom" style="height: 20rpx;"></view>
      </view>
    </scroll-view>

    <!-- 3. 底部交互区域 (重构版) -->
    <view class="footer-area">
        
        <!-- 3.1 建议气泡条 -->
        <view class="suggestion-bar" v-if="suggestionList.length > 0">
            <view class="suggestion-chip" 
                  v-for="(text, index) in suggestionList" 
                  :key="index"
                  @click="applySuggestion(text)">
                {{ text }}
            </view>
            <view class="close-suggestion" @click="suggestionList = []">×</view>
        </view>

        <!-- 3.2 功能工具栏 (可折叠层) -->
        <view class="tool-bar" v-if="isToolbarOpen">
            <!-- 快进 -->
            <view class="tool-item" hover-class="btn-hover" @click="showTimePanel = true">
                <view class="tool-icon">⏱️</view>
                <text class="tool-text">快进</text>
            </view>

            <!-- 继续 -->
            <view class="tool-item" hover-class="btn-hover" @click="triggerNextStep">
                <view class="tool-icon">▶️</view>
                <text class="tool-text">继续</text>
            </view>

            <!-- 提示 -->
            <view class="tool-item" hover-class="btn-hover" @click="getReplySuggestions">
                <view class="tool-icon">💡</view>
                <text class="tool-text">提示</text>
            </view>

            <!-- 拍照 (根据 interactionMode 变化) -->
            <view class="tool-item" 
                  :class="{ 'disabled-tool': interactionMode !== 'face' }"
                  hover-class="btn-hover" 
                  @click="handleCameraSend">
                <view class="tool-icon">
                    <text>{{ interactionMode === 'face' ? '📷' : '🚫' }}</text>
                </view>
                <text class="tool-text">{{ interactionMode === 'face' ? '抓拍' : '禁用' }}</text>
            </view>
        </view>

        <!-- 3.3 输入行 (常驻层) -->
        <view class="input-row">
            <!-- 切换工具栏按钮 (➕) -->
            <view class="toggle-btn" hover-class="btn-hover" @click="toggleToolbar">
                <text class="toggle-icon" :class="{ 'rotated': isToolbarOpen }">➕</text>
            </view>

            <!-- 文本输入框 -->
            <input class="text-input" 
                   v-model="inputText" 
                   confirm-type="send" 
                   @confirm="sendMessage()" 
                   placeholder="与她对话..." 
                   :disabled="isLoading" 
                   :adjust-position="true"
                   cursor-spacing="20" />

            <!-- 发送按钮 -->
            <button class="send-btn" :class="{ 'disabled': isLoading }" @click="sendMessage()">发送</button>
        </view>
        
        <!-- 底部安全区适配 -->
        <view class="safe-area-bottom"></view>
    </view>
   
    <!-- 4. 弹窗：时间跳跃面板 -->
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
          <input class="mini-input" type="number" v-model="customMinutes" placeholder="30"/>
          <view class="mini-btn" @click="handleTimeSkip('custom')">确定</view>
        </view>
      </view>
    </view>

    <!-- 5. 弹窗：具体时间设置面板 -->
    <view class="time-panel-mask" v-if="showTimeSettingPanel" @click="showTimeSettingPanel = false">
      <view class="time-panel" @click.stop>
        <view class="panel-title">设定具体时间</view>
        <view class="setting-row">
            <text class="setting-label">日期：</text>
            <picker mode="date" :value="tempDateStr" @change="onDateChange">
                <view class="picker-display">{{ tempDateStr }}</view>
            </picker>
        </view>
        <view class="setting-row">
            <text class="setting-label">时间：</text>
            <picker mode="time" :value="tempTimeStr" @change="onTimeChange">
                <view class="picker-display">{{ tempTimeStr }}</view>
            </picker>
        </view>
        <button class="confirm-time-btn" @click="confirmManualTime">确认修改</button>
      </view>
    </view>

  </view>
</template>

<script setup>
    import { ref, computed, nextTick, watch } from 'vue';
    import { onLoad, onShow, onHide, onUnload, onNavigationBarButtonTap } from '@dcloudio/uni-app';
    import { saveToGallery } from '@/utils/gallery-save.js';
    

    import { 
        CORE_INSTRUCTION_LOGIC_MODE, 
        SCENE_KEEPER_PROMPT, 
        RELATIONSHIP_PROMPT, 
        SNAPSHOT_TRIGGER_PROMPT, // <--- 新增：门卫
        IMAGE_GENERATOR_PROMPT,  // <--- 新增：导演
        CAMERA_MAN_PROMPT, 
        PERSONALITY_TEMPLATE, 
        NSFW_STYLE 
    } from '@/utils/prompts.js';
    
    // 引入常量
    import { 
        STYLE_PROMPT_MAP, 
        NEGATIVE_PROMPTS, 
        COMFY_WORKFLOW_TEMPLATE 
    } from '@/utils/constants.js';

    // ==================================================================================
    // 1. 状态管理
    // ==================================================================================
    const chatName = ref('AI');
    const chatId = ref(null);
    const currentRole = ref(null);
    const messageList = ref([]);
    const inputText = ref('');
    const isLoading = ref(false);
    const scrollIntoView = ref('');
    const currentAction = ref('站立/闲逛'); // 新增状态
    const userName = ref('你');
    const userAvatar = ref('/static/user-avatar.png');
    const userHome = ref('未知地址');
    const userAppearance = ref('');
    
    const charHome = ref('未知地址');
    const currentAffection = ref(0);
    const currentLust = ref(0);
    const currentTime = ref(Date.now());
    
    const currentLocation = ref('角色家');
    const interactionMode = ref('phone');
    const currentClothing = ref('默认服装');
    
    const currentActivity = ref('自由活动');
    const currentRelation = ref('初相识'); // 关系状态
    
    const lastUpdateGameHour = ref(-1);
    
    const showTimePanel = ref(false); 
    const showTimeSettingPanel = ref(false); 
    const customMinutes = ref('');
    const currentSummary = ref('');
    const enableSummary = ref(false);
    const summaryFrequency = ref(20);
    const charHistoryLimit = ref(20);
    
    const tempDateStr = ref('');
    const tempTimeStr = ref('');
    
    const suggestionList = ref([]); 
    const isToolbarOpen = ref(false); // 控制工具栏展开/收起
    
    const toggleToolbar = () => {
        isToolbarOpen.value = !isToolbarOpen.value;
    };
    // 生图冷却锁
    const lastImageGenerationTime = ref(0); 
    const IMAGE_COOLDOWN_MS = 15000; 

    const TIME_SPEED_RATIO = 6; 
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

    watch(showTimeSettingPanel, (val) => {
        if (val) {
            const now = new Date(currentTime.value);
            const y = now.getFullYear();
            const m = (now.getMonth() + 1).toString().padStart(2, '0');
            const d = now.getDate().toString().padStart(2, '0');
            const hh = now.getHours().toString().padStart(2, '0');
            const mm = now.getMinutes().toString().padStart(2, '0');
            tempDateStr.value = `${y}-${m}-${d}`;
            tempTimeStr.value = `${hh}:${mm}`;
        }
    });

    const getCurrentLlmConfig = () => {
        const schemes = uni.getStorageSync('app_llm_schemes') || [];
        const idx = uni.getStorageSync('app_current_scheme_index') || 0;
        if (schemes.length > 0 && schemes[idx]) {
            return schemes[idx];
        }
        return uni.getStorageSync('app_api_config');
    };

    // ==================================================================================
    // 2. 生命周期
    // ==================================================================================
    onLoad((options) => {
        console.log('🚀 [LifeCycle] onLoad - ChatID:', options.id);
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
            if (!history || history.length === 0) {
                messageList.value = [];
            } else {
                messageList.value = history;
                scrollToBottom();
            }
            startTimeFlow();
            setTimeout(() => { checkProactiveGreeting(); }, 1000);
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
            uni.navigateTo({ url: `/pages/create/create?id=${chatId.value}` });
        }
    });

    const startTimeFlow = () => {
        if (timeInterval) clearInterval(timeInterval);
        lastUpdateGameHour.value = new Date(currentTime.value).getHours();

        timeInterval = setInterval(() => {
            currentTime.value += 1000 * TIME_SPEED_RATIO;
            const date = new Date(currentTime.value);
            const currentHour = date.getHours();
            if (currentHour !== lastUpdateGameHour.value) {
                lastUpdateGameHour.value = currentHour;
            }
        }, 1000);
    };
    
    const stopTimeFlow = () => {
        if (timeInterval) { clearInterval(timeInterval); timeInterval = null; }
    };

    const loadRoleData = (id) => {
        const list = uni.getStorageSync('contact_list') || [];
        const target = list.find(item => String(item.id) === String(id));
        if (target) {
    
            currentRole.value = target;
            chatName.value = target.name;
            uni.setNavigationBarTitle({ title: target.name });
            currentAffection.value = target.affection !== undefined ? target.affection : (target.initialAffection || 10);
            currentLust.value = target.lust !== undefined ? target.lust : (target.initialLust || 0);
            
            currentTime.value = target.lastTimeTimestamp || Date.now();
            currentClothing.value = target.clothing || '便服';
            charHome.value = target.location || target.settings?.location || '角色家';
            userHome.value = target.settings?.userLocation || '玩家家';
            userAppearance.value = target.settings?.userAppearance || '1boy, short hair';
            currentLocation.value = target.currentLocation || charHome.value;
            interactionMode.value = target.interactionMode || 'phone';
            currentActivity.value = target.lastActivity || '自由活动';
            currentRelation.value = target.relation || '初相识';
            
            enableSummary.value = target.enableSummary || false;
            summaryFrequency.value = target.summaryFrequency || 20;
            currentSummary.value = target.summary || "暂无重要记忆。";
            charHistoryLimit.value = target.historyLimit !== undefined ? target.historyLimit : 20;
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
    
    const saveCharacterState = (newScore, newTime, newSummary, newLocation, newClothes, newMode, newLust) => {
        if (newScore !== undefined) currentAffection.value = Math.max(0, Math.min(100, newScore));
        if (newLust !== undefined) currentLust.value = Math.max(0, Math.min(100, newLust));
        if (newTime !== undefined) currentTime.value = newTime;
        if (newSummary !== undefined) currentSummary.value = newSummary;
        if (newLocation !== undefined) currentLocation.value = newLocation;
        if (newClothes !== undefined) currentClothing.value = newClothes;
        if (newMode !== undefined) interactionMode.value = newMode;

        if (chatId.value) {
            const list = uni.getStorageSync('contact_list') || [];
            const index = list.findIndex(item => String(item.id) === String(chatId.value));
            if (index !== -1) {
                const item = list[index];
                item.affection = currentAffection.value;
                item.lust = currentLust.value;
                item.lastTimeTimestamp = currentTime.value;
                item.summary = currentSummary.value;
                item.currentLocation = currentLocation.value;
                item.clothing = currentClothing.value;
                item.interactionMode = interactionMode.value;
                item.lastActivity = currentActivity.value;
                item.relation = currentRelation.value;
                
                uni.setStorageSync('contact_list', list);
            }
        }
    };
    
    const previewImage = (url) => { uni.previewImage({ urls: [url] }); };
    const onDateChange = (e) => { tempDateStr.value = e.detail.value; };
    const onTimeChange = (e) => { tempTimeStr.value = e.detail.value; };

    const confirmManualTime = () => {
        const fullStr = `${tempDateStr.value} ${tempTimeStr.value}`;
        const newTimestamp = new Date(fullStr).getTime();
        if (isNaN(newTimestamp)) return uni.showToast({title: '时间格式错误', icon: 'none'});
        currentTime.value = newTimestamp;
        saveCharacterState(undefined, newTimestamp);
        showTimeSettingPanel.value = false;
        uni.showToast({ title: '时间已调整', icon: 'none' });
    };

    const handleTimeSkip = (type) => {
        let addMs = 0;
        let desc = "";
        const now = new Date(currentTime.value);
        const currentHour = now.getHours();
        switch (type) {
            case 'morning': addMs = 4 * 60 * 60 * 1000; desc = "一上午过去了..."; break;
            case 'afternoon': addMs = 4 * 60 * 60 * 1000; desc = "一下午过去了..."; break;
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
            case 'day': addMs = 24 * 60 * 60 * 1000; desc = "整整一天过去了..."; break;
            case 'custom':
                const mins = parseInt(customMinutes.value);
                if (!mins || mins <= 0) return uni.showToast({ title: '请输入分钟', icon: 'none' });
                addMs = mins * 60 * 1000;
                desc = `${mins}分钟过去了...`;
                break;
        }
        const newTime = currentTime.value + addMs;
        saveCharacterState(undefined, newTime);
        showTimePanel.value = false;
        messageList.value.push({ role: 'system', content: `【系统】${desc} 当前时间：${formattedTime.value}`, isSystem: true });
        scrollToBottom();
    };

    const applySuggestion = (text) => {
        inputText.value = text;
        suggestionList.value = []; 
    };

    // =========================================================================
    // 🧠 军师建议 (完整版)
    // =========================================================================
    const getReplySuggestions = async () => {
        if (isLoading.value) return;
        
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
            uni.showToast({ title: '请先配置API', icon: 'none' });
            return;
        }

        uni.showLoading({ title: '军师正在分析局势...', mask: true });

        const recentContext = messageList.value
            .slice(-10)
            .filter(m => m.type !== 'image' && (!m.isSystem || m.content.includes('系统') || m.content.includes('过去了'))) 
            .map(m => {
                if (m.isSystem) return `[System Event]: ${m.content}`;
                return `${m.role === 'user' ? 'Me' : 'Her'}: ${m.content}`;
            })
            .join('\n');

        const score = currentAffection.value;
        const role = currentRole.value || {};
        const s = role.settings || {};
        
        const herJob = role.occupation || s.occupation || "Unknown";
        const myJob = s.userOccupation || "Unknown";
        const myName = userName.value || 'Me';

        const coachPrompt = `
        [System: Text Completion]
        You are a dating assistant.
        
        **Current Status**:
        - Time: ${formattedTime.value}  (CRITICAL: Notice the time change!)
        - Mode: ${interactionMode.value === 'phone' ? 'Phone Chat' : 'Face-to-Face'} @ ${currentLocation.value}
        - Relation: ${currentRelation.value}
        
        **Profiles**:
        - HER: ${chatName.value} (${herJob}).
        - ME: ${myName} (${myJob}).
        - Relation Score: ${score}/100.
        
        **Context (Recent 10 messages)**:
        ${recentContext}
        
        **Task**:
        Provide 3 short, natural, Simplified Chinese responses for "Me" to continue the conversation.
        If [System Event] indicates time passed, acknowledge it (e.g. "Good morning").
        
        **Output Rules**:
        1. Return ONLY a raw JSON Array. 
        2. NO markdown.
        3. Example: ["早安，昨晚睡得好吗？", "起床了吗？", "新的一天开始了。"]
        `;

        try {
            let baseUrl = config.baseUrl || '';
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            
            let requestBody = {};
            let targetUrl = '';
            let header = { 'Content-Type': 'application/json' };

            if (config.provider === 'gemini') {
                const cleanBase = 'https://generativelanguage.googleapis.com';
                targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
                requestBody = { 
                    contents: [{ parts: [{ text: coachPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                };
            } else {
                targetUrl = `${baseUrl}/chat/completions`;
                header['Authorization'] = `Bearer ${config.apiKey}`;
                requestBody = {
                    model: config.model,
                    messages: [{ role: "user", content: coachPrompt }],
                    max_tokens: 200,
                    temperature: 0.7,
                };
            }

            const res = await uni.request({ url: targetUrl, method: 'POST', header, data: requestBody, sslVerify: false });
            
            let rawContent = "";
            if (config.provider === 'gemini') {
                rawContent = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            } else {
                let data = res.data;
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e){} }
                rawContent = data?.choices?.[0]?.message?.content;
            }

            if (rawContent) {
                let suggestions = [];
                try {
                    const cleanStr = rawContent.replace(/```json|```/g, '').trim();
                    if (cleanStr.startsWith('[')) {
                         suggestions = JSON.parse(cleanStr);
                    } else {
                         throw new Error('Not JSON');
                    }
                } catch (e) {
                    const regex = /"([^"]*?)"/g;
                    let match;
                    while ((match = regex.exec(rawContent)) !== null) {
                        if (match[1].length > 1 && !match[1].includes('Example')) suggestions.push(match[1]);
                    }
                }
                
                if (suggestions.length > 0) {
                    suggestionList.value = suggestions.slice(0, 3);
                } else {
                    uni.showToast({ title: '军师暂无计策', icon: 'none' });
                }
            }
        } catch (e) {
            console.error(e);
            uni.showToast({ title: '网络波动', icon: 'none' });
        } finally {
            uni.hideLoading();
        }
    };

    const optimizePromptForComfyUI = async (actionAndSceneDescription) => {
            let aiTags = actionAndSceneDescription || "";
            
            const settings = currentRole.value?.settings || {};
            // 获取角色外貌，如果没有则兜底 1girl
            const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl"; 
            
            console.log("🎨 [Prompt Debug] 1. Loaded Appearance:", appearanceSafe);
    
            const isPhone = interactionMode.value === 'phone';
            let isDuo = false;
            
            // --- 1. 模式判定 (基础逻辑) ---
            if (isPhone) {
                isDuo = false;
                console.log("📡 [生图模式] 电话聊天中 -> 强制单人 (Solo)");
                // 电话模式：为了防止 AI 幻觉，还是得过滤掉“男人”和“性行为”词汇，否则会变成第三人称视角
                aiTags = aiTags.replace(/\b(1boy|boys|man|men|male|couple|2people|multiple|penis|testicles|cum)\b/gi, "");
                aiTags = aiTags.replace(/\bdoggystyle\b/gi, "all fours, kneeling, from behind");
            } else {
                // 见面模式：包含亲密互动均视为双人
                const duoKeywords = /\b(couple|2people|1boy|boys|man|men|male|holding|straddling|sex|fuck|penis|insertion|fellatio|paizuri|kiss|kissing|hug|hugging)\b/i;
                isDuo = duoKeywords.test(aiTags);
                // 如果判定为双人，删掉 solo 防止冲突
                if (isDuo) aiTags = aiTags.replace(/\bsolo\b/gi, ""); 
                console.log(`📍 [生图模式] -> ${isDuo ? '双人 (Duo)' : '单人 (Solo)'}`);
            }
    
            // ❌ 【已移除】智能镜头清洗逻辑
            // 这里不再检测 close-up 并删除 skirt/legs，完全信任 LLM 输出的 Tag。
            
            let parts = [];
            
            // 2. 拼接 Prompt 结构
            
            // A. 人数
            parts.push(isDuo ? "couple, 2people" : "solo");
            
            // B. 画质 (使用之前的“去油腻二次元版”)
            parts.push("masterpiece, best quality, anime style, flat color, cel shading, vibrant colors, clean lines, highres");
            
            // C. 画风配置
            const imgConfig = uni.getStorageSync('app_image_config') || {};
            const styleSetting = imgConfig.style || 'anime';
            parts.push(STYLE_PROMPT_MAP[styleSetting] || STYLE_PROMPT_MAP['anime']);
            
            // D. 角色固定外貌
            parts.push(appearanceSafe);
    
            // E. 用户/男主外貌 (如果是双人，自动追加)
            if (isDuo) {
                parts.push(userAppearance.value || "1boy, male focus");
            }
            
            // F. 动作与场景 (直接使用 LLM 的原话，不删减)
            if (aiTags) parts.push(`(${aiTags}:1.2)`);
            
            // 去重并输出
            let rawPrompt = parts.join(', ');
            let uniqueTags = [...new Set(rawPrompt.split(/[,，]/).map(t => t.replace(/[^\x00-\x7F]+/g, '').trim()).filter(t => t))];
            const finalPrompt = uniqueTags.join(', ');
    
            console.log("🚀 [Prompt Debug] 3. Final Prompt (Free Mode):", finalPrompt);
            return finalPrompt;
        };
		
    const generateImageFromComfyUI = async (englishTags, baseUrl) => {
        const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));
        workflow["3"].inputs.text = englishTags;
        const isDuo = /couple|2people|1boy|multiple boys|kiss|sex|paizuri|doggystyle/i.test(englishTags);
        workflow["4"].inputs.text = isDuo ? NEGATIVE_PROMPTS.DUO : NEGATIVE_PROMPTS.SOLO;
        workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999999);
        try {
            const queueRes = await uni.request({
                url: `${baseUrl}/prompt`, method: 'POST', header: { 'Content-Type': 'application/json' },
                data: { prompt: workflow }, sslVerify: false
            });
            if (queueRes.statusCode !== 200) throw new Error(`队列失败: ${queueRes.statusCode}`);
            const promptId = queueRes.data.prompt_id;
            console.log('⏳ [ComfyUI] Queued ID:', promptId);

            for (let i = 0; i < 120; i++) {
                await new Promise(r => setTimeout(r, 1000));
                const historyRes = await uni.request({ url: `${baseUrl}/history/${promptId}`, method: 'GET', sslVerify: false });
                if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
                    const outputs = historyRes.data[promptId].outputs;
                    if (outputs && outputs["16"] && outputs["16"].images.length > 0) {
                        const imgInfo = outputs["16"].images[0];
                        return `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
                    }
                }
            }
            throw new Error('生成超时');
        } catch (e) { throw e; }
    };

    const generateChatImage = async (sceneDescription) => {
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        if (!imgConfig.baseUrl) return null;
        
        const finalPrompt = await optimizePromptForComfyUI(sceneDescription);
        if (!finalPrompt) return null;
        
        try {
            return await generateImageFromComfyUI(finalPrompt, imgConfig.baseUrl);
        } catch (e) { console.error(e); }
        return null;
    };
    
    const handleAsyncImageGeneration = async (imgDesc, placeholderId) => {
        try {
            const imgUrl = await generateChatImage(imgDesc);
            const idx = messageList.value.findIndex(m => m.id === placeholderId);
            if (idx !== -1 && imgUrl) {
                const localPath = await saveToGallery(imgUrl, chatId.value, chatName.value, imgDesc);
                messageList.value[idx] = { role: 'model', type: 'image', content: localPath, id: placeholderId };
                saveHistory();
                scrollToBottom();
            } else if (idx !== -1) {
                 messageList.value[idx] = { role: 'system', content: '❌ 照片显影失败 (点击重试)', isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
                 saveHistory();
            }
        } catch(e) {
            const idx = messageList.value.findIndex(m => m.id === placeholderId);
             if (idx !== -1) {
                 messageList.value[idx] = { role: 'system', content: '❌ 照片显影异常 (点击重试)', isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
                 saveHistory();
            }
        }
    };

    const retryGenerateImage = (msg) => {
        if (!msg.isError || !msg.originalPrompt) return;
        const idx = messageList.value.findIndex(m => m.id === msg.id);
        if (idx !== -1) {
            messageList.value[idx] = { role: 'system', content: '📷 影像显影中... (重试中)', isSystem: true, id: msg.id };
            handleAsyncImageGeneration(msg.originalPrompt, msg.id);
        }
    };

    // =============================================================================
        // 🔽 修改后的 triggerNextStep (继续按钮逻辑)
        // =============================================================================
        const triggerNextStep = () => {
            if (isLoading.value) return;
            
            // 核心修改：不仅仅是 isContinue=true，还附带了一条强制指令
            // 这条指令不会显示在聊天气泡里，但 AI 能看到。
            const drivePrompt = `[System Command: NARRATIVE_CONTINUATION]
            **User Status**: Silent/Waiting.
            **Task**: The user is waiting for you to continue.
            1. If previous output was cut off, finish the sentence.
            2. If previous interaction finished, initiate a NEW action or topic based on current mood.
            3. DO NOT output "..." or silence. MAKE SOMETHING HAPPEN.`;
    
            // 调用 sendMessage，传入 true (继续模式) 和 驱动指令
            sendMessage(true, drivePrompt);
        };

    const handleCameraSend = () => {
		    // 拦截：非见面模式禁止
		    if (interactionMode.value !== 'face') {
		        uni.showToast({ title: '非见面模式无法抓拍', icon: 'none' });
		        return;
		    }
			
        if (isLoading.value) return;
        const extraInstruction = `[SYSTEM EVENT: SNAPSHOT TRIGGERED] 用户正在对你进行**抓拍 (Candid Shot)**。**执行死命令 (CRITICAL)**：1. **禁止互动**：在生成的 [IMG] 中，**绝对禁止**回头看镜头、摆姿势或对快门声做出反应。2. **时间冻结**：照片必须**100% 还原**上一条消息中描述的动作和状态。3. **优先输出**：请优先输出 [IMG: ...] 描述当下的画面，然后再进行后续的对话反应。4. **英文Tag**：[IMG] 内容必须使用英文。`;
        sendMessage(false, extraInstruction);
    };
    
    const checkProactiveGreeting = () => {
        if (!chatId.value || !currentRole.value) return;
        if (!currentRole.value.allowProactive) return;

        const now = Date.now();
        const lastActiveTime = uni.getStorageSync(`last_real_active_time_${chatId.value}`) || 0;
        const lastProactiveTime = uni.getStorageSync(`last_proactive_lock_${chatId.value}`) || 0;
        
        const hoursSinceActive = (now - lastActiveTime) / (1000 * 60 * 60);
        const hoursSinceLastGreet = (now - lastProactiveTime) / (1000 * 60 * 60);
        const userInterval = currentRole.value.proactiveInterval || 4; 

        if (isLoading.value) return;
        if (messageList.value.length > 0) {
            const lastMsg = messageList.value[messageList.value.length - 1];
            if (lastMsg.role === 'user') return; 
        }

        if (hoursSinceActive < userInterval || hoursSinceLastGreet < userInterval) {
            uni.setStorageSync(`last_real_active_time_${chatId.value}`, now);
            return; 
        }
        
        const gameDate = new Date(currentTime.value);
        const gameHour = gameDate.getHours();
        let gameTimeDesc = "daytime";
        if (gameHour >= 6 && gameHour < 11) gameTimeDesc = "morning";
        else if (gameHour >= 22 || gameHour < 5) gameTimeDesc = "late night";
        else if (gameHour >= 18 && gameHour < 22) gameTimeDesc = "evening";

        const triggerPrompt = `
        [系统事件: 用户回归]
        **背景**: 用户已经离开 APP 约 ${Math.floor(hoursSinceActive)} 小时。
        **游戏内时间**: 现在是 ${gameTimeDesc} (${gameHour}:00)。
        **当前任务**: 根据你的人设，主动发起对话。
        **关键要求 (CRITICAL)**:
        1. **语言锁死**: 必须使用**简体中文**回复。
        2. **保持人设**: 不要像个机器人。
        3. **话题**: 对“时间过去了多久”或“现在的天色”做出反应。
        4. **长度**: 简短自然 (30字以内)。
        `;
        
        sendMessage(false, triggerPrompt);
        uni.setStorageSync(`last_proactive_lock_${chatId.value}`, now);
        uni.setStorageSync(`last_real_active_time_${chatId.value}`, now);
    };
    

        const runSceneCheck = async (lastUserMsg, aiResponseText) => {
            if (!aiResponseText || aiResponseText.length < 3) return;
    
            console.log('🏠 [Scene Keeper] Checking physical state...');
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) return;
    
            const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;
    
            // 注入 currentAction (旧状态) 供 AI 参考
            const prompt = SCENE_KEEPER_PROMPT
                .replace('{{location}}', currentLocation.value)
                .replace('{{clothes}}', currentClothing.value)
                .replace('{{mode}}', interactionMode.value)
                .replace('{{current_action}}', currentAction.value || "站立/闲逛") 
                + `\n\n【Interaction】\n${conversationContext}`;
    
            try {
                let targetUrl = '';
                let requestBody = {};
                let header = { 'Content-Type': 'application/json' };
                let baseUrl = config.baseUrl || '';
                if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
                if (config.provider === 'gemini') {
                    const cleanBase = 'https://generativelanguage.googleapis.com';
                    targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
                    requestBody = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                } else {
                    targetUrl = `${baseUrl}/chat/completions`;
                    header['Authorization'] = `Bearer ${config.apiKey}`;
                    requestBody = { model: config.model, messages: [{ role: "user", content: prompt }], max_tokens: 200, temperature: 0.1 };
                }
    
                const res = await uni.request({ url: targetUrl, method: 'POST', header, data: requestBody, sslVerify: false });
                
                let resultText = "";
                if (config.provider === 'gemini') {
                    resultText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                } else {
                    let data = res.data;
                    if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e){} }
                    resultText = data?.choices?.[0]?.message?.content || "{}";
                }
    
                // 🌟🌟🌟【修复核心：强力清洗 JSON】🌟🌟🌟
                // 1. 去除 Markdown 标记
                let cleanJson = resultText.replace(/```json|```/g, '').trim();
                
                // 2. 提取最外层的 {}，丢弃所有外部的 * 或文字
                const firstOpen = cleanJson.indexOf('{');
                const lastClose = cleanJson.lastIndexOf('}');
                
                if (firstOpen !== -1 && lastClose !== -1) {
                    cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
                }
                // 🌟🌟🌟 修复结束 🌟🌟🌟
    
                const state = JSON.parse(cleanJson);
                console.log('🏠 [Scene Keeper] Verdict:', state);
    
                let hasChange = false;
                
                // 1. 更新模式
                if (state.mode && ['phone', 'face'].includes(state.mode) && state.mode !== interactionMode.value) {
                    console.log(`🔄 Mode Switch: ${interactionMode.value} -> ${state.mode}`);
                    interactionMode.value = state.mode;
                    hasChange = true;
                    if(state.mode === 'face') uni.vibrateShort();
                }
                // 2. 更新地点
                if (state.location && state.location.length < 20 && state.location !== currentLocation.value) {
                    currentLocation.value = state.location;
                    hasChange = true;
                }
                // 3. 更新服装
                if (state.clothes && state.clothes.length < 50 && state.clothes !== currentClothing.value) {
                    currentClothing.value = state.clothes;
                    hasChange = true;
                }
                // 4. 更新动作 (Action)
                if (state.action && state.action !== currentAction.value) {
                    console.log(`💃 Action Update: ${currentAction.value} -> ${state.action}`);
                    currentAction.value = state.action;
                }
    
                if (hasChange) saveCharacterState();
    
            } catch (e) {
                // 这里为了调试方便，把原始文本打印出来，方便看 AI 到底回了什么鬼东西
                console.warn('Scene check failed. Raw text was:', e); 
            }
        };
    

	
	// =============================================================================
	    // 📷 Camera Man Check (物理抓拍 - 环境感知完整版)
	    // =============================================================================
	    // =============================================================================
	        // 📷 Camera Man Check (物理抓拍 - 瞬时定格完整版)
	        // =============================================================================
	        // =============================================================================
	            // 📷 Camera Man Check (物理抓拍 - 集大成完整版)
	            // =============================================================================
	            const runCameraManCheck = async (lastUserMsg, aiResponseText) => {
	                // 1. 冷却检查
	                const now = Date.now();
	                if (now - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) {
	                    console.log('📷 [Camera Man] Shutter jammed (Cooldown).');
	                    return;
	                }
	        
	                // =====================================================================
	                // 🌟 核心修正：时光回溯 (Time Freeze Logic)
	                // =====================================================================
	                // 逻辑：此时 messageList 已经包含了 AI 最新的回复 (即被快门声吓到的反应)。
	                // 为了拍到 "按下快门那一刻" 的画面，我们需要找 "倒数第2条" AI 消息。
	                
	                let targetAction = ""; // 对话细节
	                const len = messageList.value.length;
	                let aiMsgCount = 0;
	                
	                // 倒序遍历历史记录
	                for (let i = len - 1; i >= 0; i--) {
	                    const msg = messageList.value[i];
	                    // 只看 AI (model) 的文本消息
	                    if (msg.role === 'model' && (!msg.type || msg.type === 'text')) {
	                        aiMsgCount++;
	                        if (aiMsgCount === 2) { 
	                            // 找到倒数第2条 AI 消息 (即快门前的那一刻状态)
	                            targetAction = msg.content;
	                            break;
	                        }
	                    }
	                }
	                
	                // 兜底：如果是刚开局，或者找不到上一条，就只能用当前的
	                if (!targetAction) targetAction = aiResponseText;
	        
	                console.log('📷 [Camera Man] Capturing MOMENT:', targetAction.substring(0, 50) + '...');
	                console.log('📷 [Camera Man] Physical Action:', currentAction.value); // 打印当前 Scene Keeper 确定的动作
	                // =====================================================================
	        
	                console.log('📷 [Camera Man] Shutter pressed! Capturing reality...');
	                const config = getCurrentLlmConfig();
	                if (!config || !config.apiKey) return;
	        
	                // 2. 构建 Prompt (注入所有核心参数)
	                const prompt = CAMERA_MAN_PROMPT
	                    .replace('{{current_action}}', currentAction.value || "维持当前动作") // 🌟 注入 Scene Keeper 的动作结论
	                    .replace('{{ai_response}}', targetAction) // 🌟 注入时光回溯后的对话
	                    .replace('{{clothes}}', currentClothing.value || "Casual clothes")
	                    .replace('{{location}}', currentLocation.value || "Unknown Indoor")
	                    .replace('{{time}}', formattedTime.value);
	        
	                try {
	                    let targetUrl = '';
	                    let requestBody = {};
	                    let header = { 'Content-Type': 'application/json' };
	                    let baseUrl = config.baseUrl || '';
	                    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
	        
	                    // 3. 适配不同 API
	                    if (config.provider === 'gemini') {
	                        const cleanBase = 'https://generativelanguage.googleapis.com';
	                        targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
	                        requestBody = { 
	                            contents: [{ role: 'user', parts: [{ text: prompt }] }], 
	                            generationConfig: { responseMimeType: "application/json" } 
	                        };
	                    } else {
	                        targetUrl = `${baseUrl}/chat/completions`;
	                        header['Authorization'] = `Bearer ${config.apiKey}`;
	                        requestBody = { 
	                            model: config.model, 
	                            messages: [{ role: "user", content: prompt }], 
	                            max_tokens: 300, 
	                            temperature: 0.3 
	                        };
	                    }
	        
	                    // 4. 发起请求
	                    const res = await uni.request({ 
	                        url: targetUrl, 
	                        method: 'POST', 
	                        header, 
	                        data: requestBody, 
	                        sslVerify: false 
	                    });
	                    
	                    // 5. 解析响应
	                    let resultText = "";
	                    if (config.provider === 'gemini') {
	                        resultText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
	                    } else {
	                        let data = res.data;
	                        if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e){} }
	                        resultText = data?.choices?.[0]?.message?.content || "{}";
	                    }
	        
	                    const cleanJson = resultText.replace(/```json|```/g, '').trim();
	                    
	                    // 容错 JSON 解析
	                    let result = {};
	                    try {
	                        result = JSON.parse(cleanJson);
	                    } catch (jsonErr) {
	                        console.warn('Camera Man JSON error:', jsonErr);
	                        return;
	                    }
	        
	                    console.log('📷 [Camera Man] Developed Film:', result);
	        
	                    // 6. 执行生图
	                    // Camera Man 是物理触发，不需要 check shouldGenerate，只要有 description 就拍
	                    if (result.description && result.description.length > 5) {
	                        console.log('📷 [Action] Developing photo:', result.description);
	                        
	                        lastImageGenerationTime.value = Date.now();
	                        const placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
	                        
	                        // 提示语：定格瞬间
	                        messageList.value.push({ 
	                            role: 'system', 
	                            content: '📸 (定格刚才的瞬间...)', 
	                            isSystem: true, 
	                            id: placeholderId 
	                        });
	                        
	                        scrollToBottom();
	                        saveHistory();
	                        
	                        handleAsyncImageGeneration(result.description, placeholderId);
	                    }
	                } catch (e) {
	                    console.warn('Camera Man failed:', e);
	                }
	            };
		
		
    const runRelationCheck = async (lastUserMsg, aiResponseText) => {
        if (!aiResponseText || aiResponseText.length < 5) return;
    
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
    
        const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;
    
        // 使用新的 Prompt 结构
        const prompt = RELATIONSHIP_PROMPT
            .replace('{{relation}}', currentRelation.value || "初相识，还没有具体印象")
            .replace('{{activity}}', currentActivity.value)
            + `\n\n【Interaction】\n${conversationContext}`;
    
        try {
            let targetUrl = '';
            let requestBody = {};
            let header = { 'Content-Type': 'application/json' };
            let baseUrl = config.baseUrl || '';
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
            if (config.provider === 'gemini') {
                const cleanBase = 'https://generativelanguage.googleapis.com';
                targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
                requestBody = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
            } else {
                targetUrl = `${baseUrl}/chat/completions`;
                header['Authorization'] = `Bearer ${config.apiKey}`;
                requestBody = { model: config.model, messages: [{ role: "user", content: prompt }], max_tokens: 300, temperature: 0.5 }; // 增加 tokens，提高 temperature 增加分析的灵活性
            }
    
            const res = await uni.request({ url: targetUrl, method: 'POST', header, data: requestBody, sslVerify: false });
            
            let resultText = "";
            if (config.provider === 'gemini') {
                resultText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            } else {
                let data = res.data;
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e){} }
                resultText = data?.choices?.[0]?.message?.content || "{}";
            }
    
            const state = JSON.parse(resultText.replace(/```json|```/g, '').trim());
            console.log('❤️ [Psychology Tracker] Verdict:', state);
    
            let hasChange = false;
            
            // 修改点：只要内容有效且不同，就更新，不再限制字数长度，允许深度描写
            if (state.relation && state.relation !== currentRelation.value) {
                console.log(`❤️ Psychology Update: ${state.relation}`);
                currentRelation.value = state.relation;
                hasChange = true;
            }
            
            if (state.activity && state.activity !== currentActivity.value) {
                currentActivity.value = state.activity;
                hasChange = true;
            }
    
            if (hasChange) saveCharacterState();
    
        } catch (e) {
            console.warn('Relation check failed:', e);
        }
    };

        // =============================================================================
            // 📸 Visual Director Agent (生图管理 - 环境感知完整版)
            // =============================================================================
            // =============================================================================
                // 📸 Visual Director Agent (生图管理 - 分离版：门卫+导演+UI预判)
                // =============================================================================
                const runVisualDirectorCheck = async (lastUserMsg, aiResponseText) => {
                    // 1. 基础校验
                    if (!aiResponseText || aiResponseText.length < 2) return;
                    
                    // 2. 冷却检查
                    const now = Date.now();
                    if (now - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) {
                        console.log('📸 [Visual Director] Cooldown active (Skipping check).');
                        return;
                    }
            
                    const config = getCurrentLlmConfig();
                    if (!config || !config.apiKey) return;
            
                    // =================================================================
                    // 🚀 第一阶段：门卫快速检查 (Gatekeeper)
                    // =================================================================
                    console.log('👀 [Gatekeeper] Checking visual intent...');
                    
                    // 准备门卫 Prompt
                    const gatekeeperPrompt = SNAPSHOT_TRIGGER_PROMPT
                        .replace('{{user_msg}}', lastUserMsg)
                        .replace('{{ai_msg}}', aiResponseText);
            
                    let shouldGenerate = false;
            
                    try {
                        // --- 门卫 API 请求开始 ---
                        let targetUrl = '';
                        let requestBody = {};
                        let header = { 'Content-Type': 'application/json' };
                        let baseUrl = config.baseUrl || '';
                        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            
                        if (config.provider === 'gemini') {
                            const cleanBase = 'https://generativelanguage.googleapis.com';
                            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
                            requestBody = { 
                                contents: [{ role: 'user', parts: [{ text: gatekeeperPrompt }] }], 
                                generationConfig: { responseMimeType: "application/json" } 
                            };
                        } else {
                            targetUrl = `${baseUrl}/chat/completions`;
                            header['Authorization'] = `Bearer ${config.apiKey}`;
                            requestBody = { 
                                model: config.model, 
                                messages: [{ role: "user", content: gatekeeperPrompt }], 
                                max_tokens: 100, // 门卫只需要很少的 Token
                                temperature: 0.1 // 需要精确判断
                            };
                        }
            
                        const res = await uni.request({ url: targetUrl, method: 'POST', header, data: requestBody, sslVerify: false });
                        
                        let resultText = "";
                        if (config.provider === 'gemini') {
                            resultText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                        } else {
                            let data = res.data;
                            if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e){} }
                            resultText = data?.choices?.[0]?.message?.content || "{}";
                        }
            
                        // 清洗 JSON
                        let cleanJson = resultText.replace(/```json|```/g, '').trim();
                        const firstOpen = cleanJson.indexOf('{');
                        const lastClose = cleanJson.lastIndexOf('}');
                        if (firstOpen !== -1 && lastClose !== -1) {
                            cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
                        }
            
                        const gateResult = JSON.parse(cleanJson);
                        shouldGenerate = gateResult.result === true;
                        // --- 门卫 API 请求结束 ---
            
                    } catch (e) {
                        console.warn('Gatekeeper check failed:', e);
                        return; // 门卫出错则终止
                    }
            
                    if (!shouldGenerate) {
                        console.log('🛑 [Gatekeeper] No visual intent. Stop.');
                        return; 
                    }
            
                    // =================================================================
                    // ⏳ UI 补位：立即告诉用户“我在做了”
                    // =================================================================
                    console.log('✅ [Gatekeeper] Intent detected! Starting UI placeholder...');
                    
                    // 生成占位 ID
                    const placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
                    
                    // 立即上屏：告诉用户正在构图
                    messageList.value.push({ 
                        role: 'system', 
                        content: '📷 正在调整镜头... (构图中)', 
                        isSystem: true, 
                        id: placeholderId 
                    });
                    scrollToBottom();
                    saveHistory(); 
            
                    // =================================================================
                    // 🎨 第二阶段：导演深度生成 (Director)
                    // =================================================================
                    console.log('🎨 [Director] Composing scene with FULL context...');
                    
                    // 准备导演 Prompt (包含所有细节)
                    const directorPrompt = IMAGE_GENERATOR_PROMPT
                        .replace('{{clothes}}', currentClothing.value || "Casual clothes") 
                        .replace('{{location}}', currentLocation.value || "Unknown Indoor") 
                        .replace('{{time}}', formattedTime.value)
                        .replace('{{user_msg}}', lastUserMsg)
                        .replace('{{ai_msg}}', aiResponseText);
            
                    try {
                        // --- 导演 API 请求开始 ---
                        let targetUrl = '';
                        let requestBody = {};
                        let header = { 'Content-Type': 'application/json' };
                        let baseUrl = config.baseUrl || '';
                        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            
                        if (config.provider === 'gemini') {
                            const cleanBase = 'https://generativelanguage.googleapis.com';
                            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
                            requestBody = { 
                                contents: [{ role: 'user', parts: [{ text: directorPrompt }] }], 
                                generationConfig: { responseMimeType: "application/json" } 
                            };
                        } else {
                            targetUrl = `${baseUrl}/chat/completions`;
                            header['Authorization'] = `Bearer ${config.apiKey}`;
                            requestBody = { 
                                model: config.model, 
                                messages: [{ role: "user", content: directorPrompt }], 
                                max_tokens: 300, // 导演需要更多 Token 写 Tag
                                temperature: 0.3 
                            };
                        }
            
                        const res = await uni.request({ url: targetUrl, method: 'POST', header, data: requestBody, sslVerify: false });
                        
                        let resultText = "";
                        if (config.provider === 'gemini') {
                            resultText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                        } else {
                            let data = res.data;
                            if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e){} }
                            resultText = data?.choices?.[0]?.message?.content || "{}";
                        }
            
                        // 清洗 JSON
                        let cleanJson = resultText.replace(/```json|```/g, '').trim();
                        const firstOpen = cleanJson.indexOf('{');
                        const lastClose = cleanJson.lastIndexOf('}');
                        if (firstOpen !== -1 && lastClose !== -1) {
                            cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
                        }
                        
                        const directorResult = JSON.parse(cleanJson);
                        console.log('🎨 [Director] Result:', directorResult);
                        // --- 导演 API 请求结束 ---
            
                        // 检查是否有内容
                        if (directorResult.description && directorResult.description.length > 5) {
                            console.log('📸 [Action] Director generated prompt. Starting ComfyUI...');
                            
                            // 更新冷却时间
                            lastImageGenerationTime.value = Date.now();
            
                            // 更新 UI：从“构图中”变为“显影中”
                            const msgIdx = messageList.value.findIndex(m => m.id === placeholderId);
                            if (msgIdx !== -1) {
                                messageList.value[msgIdx].content = '📷 捕捉瞬间... (显影中)';
                                // 强制更新视图
                                messageList.value = [...messageList.value];
                            }
                            
                            // 执行生图逻辑 (ComfyUI)
                            handleAsyncImageGeneration(directorResult.description, placeholderId);
                        } else {
                            // 极少情况：门卫说要画，导演说没东西画。删除占位符。
                            console.log('⚠️ [Director] Returned empty description. Removing placeholder.');
                            messageList.value = messageList.value.filter(m => m.id !== placeholderId);
                        }
            
                    } catch (e) {
                        console.warn('Visual Director pipeline failed:', e);
                        // 出错处理：把占位符改成错误提示
                        const msgIdx = messageList.value.findIndex(m => m.id === placeholderId);
                        if (msgIdx !== -1) {
                            messageList.value[msgIdx].content = '❌ 构图失败 (系统繁忙)';
                            messageList.value[msgIdx].isError = true;
                            messageList.value[msgIdx].originalPrompt = ""; // 无法重试，因为没有 Prompt
                            saveHistory();
                        }
                    }
                };

// =============================================================================
    // 🚀 核心发送函数 (完整无省略版)
    // =============================================================================
    const sendMessage = async (isContinue = false, systemOverride = '') => {
        // 1. 校验与防抖
        if (!isContinue && !inputText.value.trim() && !systemOverride) return;
        if (isLoading.value) return;
        
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
            uni.showToast({ title: '请配置模型', icon: 'none' });
            return;
        }
        
        // 2. 处理用户输入上屏
        if (!isContinue) {
            if (inputText.value.trim()) {
                 messageList.value.push({ role: 'user', content: inputText.value });
                 inputText.value = '';
            } 
            // 📸 确保拍照指令上屏，作为后续判断依据
            else if (systemOverride && (systemOverride.includes('SHUTTER') || systemOverride.includes('SNAPSHOT'))) {
                 messageList.value.push({ role: 'system', content: '📷 (你举起手机拍了一张)', isSystem: true });
            }
        }

        scrollToBottom();
        isLoading.value = true;
        saveHistory();
        
        // 3. 准备 Prompt 数据
        const role = currentRole.value || {};
        const s = role.settings || {};
        const appUser = uni.getStorageSync('app_user_info') || {};
        const myName = userName.value || appUser.name || 'User';
        const myProfile = `[User Profile]\nName: ${myName}\nAppearance: ${s.userAppearance || appUser.appearance || "Unknown"}`;

        const charName = chatName.value;
        const charBio = s.bio || "No bio provided.";
        const charLogic = s.personalityNormal || "React naturally based on your bio.";
        
        // 注入心理状态
        const dynamicLogic = `${charLogic}\n\n【当前心理状态与对玩家印象 (Current Psychology)】\n${currentRelation.value || '初相识，还没有具体印象'}`;

        // 4. 组装 System Prompt
        let prompt = CORE_INSTRUCTION_LOGIC_MODE
            .replace(/{{char}}/g, charName)
            .replace(/{{bio}}/g, charBio)
            .replace(/{{logic}}/g, dynamicLogic)
            .replace(/{{likes}}/g, s.likes || "Unknown")
            .replace(/{{dislikes}}/g, s.dislikes || "Unknown")
            .replace(/{{speaking_style}}/g, s.speakingStyle || "Normal")
            .replace(/{{current_time}}/g, formattedTime.value)
            .replace(/{{current_location}}/g, currentLocation.value)
            .replace(/{{interaction_mode}}/g, interactionMode.value)
            .replace(/{{current_activity}}/g, currentActivity.value)
            .replace(/{{current_clothes}}/g, currentClothing.value)
            .replace(/{{user_profile}}/g, myProfile);

        // 5. 截取历史记录
        const historyLimit = charHistoryLimit.value; 
        let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
        if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
        
        console.log('=== 🎭 Roleplay AI Input ===');
        
        let targetUrl = '';
        let requestBody = {};
        let baseUrl = config.baseUrl || '';
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        const cleanHistoryForAI = contextMessages.map(item => {
            let cleanText = item.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            cleanText = cleanText.replace(/\[.*?\]/gi, ''); 
            return { role: item.role === 'user' ? 'user' : (item.role === 'model' ? 'assistant' : 'system'), content: cleanText };
        }).filter(m => m.content.trim() !== '');

        // 6. 构造 API 请求
        if (config.provider === 'gemini') {
            const cleanBase = 'https://generativelanguage.googleapis.com';
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            const geminiContents = cleanHistoryForAI.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
            if (systemOverride) geminiContents.push({ role: 'user', parts: [{ text: systemOverride }] });
            
            requestBody = {
                contents: geminiContents,
                system_instruction: { parts: { text: prompt } },
            };
        } else {
            targetUrl = `${baseUrl}/chat/completions`;
            const openAIMessages = [{ role: "system", content: prompt }, ...cleanHistoryForAI];
            if (systemOverride) openAIMessages.push({ role: 'user', content: systemOverride });
            
            requestBody = {
                model: config.model,
                messages: openAIMessages,
                max_tokens: 1500,
                stream: false
            };
        }
        
        try {
            const header = { 'Content-Type': 'application/json' };
            if (config.provider !== 'gemini') header['Authorization'] = `Bearer ${config.apiKey}`;
            
            const res = await uni.request({ url: targetUrl, method: 'POST', header: header, data: requestBody, sslVerify: false });

            if (res.statusCode === 200) {
                let rawText = "";
                if (config.provider === 'gemini') rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                else { let data = res.data; if (typeof data === 'string') try { data = JSON.parse(data); } catch(e){} rawText = data?.choices?.[0]?.message?.content || ""; }

                console.log('=== 📥 Roleplay AI Output ===', rawText.substring(0, 50) + '...');
                if (rawText) processAIResponse(rawText);
                else uni.showToast({ title: '无内容响应', icon: 'none' });
            } else {
                console.error("API Error", res);
                uni.showToast({ title: `API错误 ${res.statusCode}`, icon: 'none' });
            }
        } catch (e) {
            console.error('Request failed:', e);
            uni.showToast({ title: '网络错误', icon: 'none' });
        } finally {
            isLoading.value = false;
            scrollToBottom();
        }
    };
	
	// =============================================================================
	    // 🧠 响应处理器 (完整无省略版)
	    // =============================================================================
	    // =============================================================================
	        // 🧠 响应处理器 (完整无省略版)
	        // =============================================================================
	        const processAIResponse = (rawText) => {
	            // 1. 基础清洗
	            let displayText = rawText.replace(/^\[(model|assistant|user)\]:\s*/i, '').replace(/^\[SYSTEM.*?\]\s*/i, '').trim();
	            const thinkMatch = displayText.match(/<think>([\s\S]*?)<\/think>/i);
	            if (thinkMatch) console.log('🧠 [Thought]:', thinkMatch[1].trim());
	    
	            const genericTagRegex = /<([^\s>]+)[^>]*>[\s\S]*?<\/\1>/gi;
	            displayText = displayText.replace(genericTagRegex, '');
	            const endTagRegex = /<\/[^>]+>/i;
	            if (endTagRegex.test(displayText)) displayText = displayText.split(endTagRegex).pop().trim();
	            displayText = displayText.replace(/\[(LOC|ACT|IMG|MODE|AFF).*?\]/gi, '');
	            displayText = displayText.replace(/^\s*\*\*.*?\*\*\s*/i, ''); 
	    
	            const cleanDisplayText = displayText.trim();
	            
	            // 2. 气泡切分 (括号分镜)
	            if (cleanDisplayText) {
	                 let processedText = cleanDisplayText.replace(/\n\s*([”"’])/g, '$1'); 
	                 processedText = processedText.replace(/([“"‘])\s*\n/g, '$1');   
	                 processedText = processedText.replace(/([（\(])/g, '|||$1');
	                 processedText = processedText.replace(/([）\)])/g, '$1|||');
	                 let tempText = processedText.replace(/(\r\n|\n|\r)+/g, '|||');
	                 tempText = tempText.replace(/(?:\|\|\|)+/g, '|||');
	                 
	                 const rawParts = tempText.split('|||');
	                 rawParts.forEach(part => {
	                     let cleanPart = part.trim();
	                     if (!cleanPart) return;
	                     const historyLen = messageList.value.length;
	                     const lastMsg = historyLen > 0 ? messageList.value[historyLen - 1].content : '';
	                     if (cleanPart !== lastMsg) {
	                         messageList.value.push({ role: 'model', content: cleanPart });
	                     }
	                 });
	            }
	            
	            saveHistory();
	            scrollToBottom();
	    
	            // =========================================================
	            // 🚀 多智能体协作流水线 (Agent Orchestration)
	            // =========================================================
	            if (cleanDisplayText) {
	                let lastUserMsg = "";
	                let isCameraAction = false; 
	    
	                // 检查最近的消息，判断是否是拍照触发的
	                for (let i = messageList.value.length - 2; i >= 0; i--) {
	                    if (messageList.value[i].role === 'user') {
	                        lastUserMsg = messageList.value[i].content;
	                        break;
	                    }
	                    if (messageList.value[i].role === 'system' && messageList.value[i].content.includes('举起手机拍了一张')) {
	                        lastUserMsg = messageList.value[i].content;
	                        isCameraAction = true;
	                        break;
	                    }
	                }
	                
	                if (!isCameraAction && (lastUserMsg.includes('SNAPSHOT') || lastUserMsg.includes('拍'))) {
	                    isCameraAction = true;
	                }
	                
	                console.log('📝 [Context Debug] =========================================');
	                console.log('👤 User Input:', lastUserMsg);
	                console.log('📸 Is Camera Action:', isCameraAction);
	                console.log('🤖 AI Reply:', cleanDisplayText);
	                console.log('==========================================================');
	                
	                console.log('🤖 [Multi-Agent] Starting pipeline...');
	                
	                setTimeout(async () => {
	                    try {
	                        // 1. 场景和心理检查
	                        const scenePromise = runSceneCheck(lastUserMsg, cleanDisplayText);
	                        const relationPromise = runRelationCheck(lastUserMsg, cleanDisplayText);
	                        await scenePromise;
	                        
	                        // 2. 视觉分流逻辑 (Dual Track)
	                        if (isCameraAction) {
	                            // 🔴 路由 A：拍照指令 -> 相机 AI (无视反应，强制出图)
	                            console.log('🔀 Route: Handing over to Camera Man.');
	                            await runCameraManCheck(lastUserMsg, cleanDisplayText);
	                        } else {
	                            // 🔵 路由 B：普通对话 -> 视觉导演 (仅在特定条件下出图)
	                            console.log('🔀 Route: Handing over to Visual Director.');
	                            await runVisualDirectorCheck(lastUserMsg, cleanDisplayText);
	                        }
	    
	                        await relationPromise;
	                    } catch (e) {
	                        console.error('Agent pipeline error:', e);
	                    }
	                }, 500); 
	            }
	        };
		
    const scrollToBottom = () => {
        nextTick(() => {
            scrollIntoView.value = '';
            setTimeout(() => { scrollIntoView.value = 'scroll-bottom'; }, 100);
        });
    };
</script>

<style lang="scss" scoped>
/* ==========================================================================
   1. 全局容器与布局
   ========================================================================== */
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #f5f5f5;
    overflow: hidden; /* 防止页面整体滚动 */
}

/* ==========================================================================
   2. 顶部状态栏
   ========================================================================== */
.status-bar-wrapper {
    background-color: #fff;
    padding: 10rpx 30rpx;
    border-bottom: 1px solid #eee;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    flex-shrink: 0; /* 防止被挤压 */
    z-index: 10;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    margin-top: 10rpx;
}

/* 地点/模式状态盒 */
.location-box {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 8rpx 20rpx;
    border-radius: 16rpx;
    margin-right: 20rpx;
    transition: all 0.3s;
    border: 1px solid transparent;

    &.phone-mode {
        background-color: #f0f3f5;
        color: #555;
        border-color: #e1e4e8;
    }

    &.face-mode {
        background-color: #e3f2fd;
        color: #007aff;
        border-color: #bbdefb;
    }
}

.location-icon {
    font-size: 36rpx;
    margin-right: 16rpx;
}

.status-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.location-text {
    font-size: 22rpx;
    font-weight: bold;
    opacity: 0.9;
}

.activity-text {
    font-size: 20rpx;
    opacity: 0.7;
    margin-top: 2rpx;
}

/* 时间显示盒 */
.time-box {
    display: flex;
    align-items: center;
    font-size: 24rpx;
    color: #555;
    background-color: #f8f8f8;
    padding: 0 24rpx;
    border-radius: 16rpx;
    border: 1px solid #eee;
}

.time-icon {
    margin-right: 8rpx;
}

/* ==========================================================================
   3. 聊天内容区域
   ========================================================================== */
.chat-scroll {
    flex: 1;
    overflow: hidden;
    background-color: #f5f5f5;
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

    &.left {
        flex-direction: row;
        .avatar { margin-right: 20rpx; }
    }

    &.right {
        flex-direction: row-reverse;
        .avatar { margin-left: 20rpx; }
    }
}

.avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 10rpx;
    background-color: #ddd;
    flex-shrink: 0;
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

    &.left-bubble {
        background-color: #ffffff;
        color: #333;
        border-top-left-radius: 4rpx;
    }

    &.right-bubble {
        background-color: #95ec69;
        color: #000;
        border-top-right-radius: 4rpx;
    }
    
    &.image-bubble {
        padding: 0;
        background-color: transparent !important;
        box-shadow: none;
        overflow: hidden;
    }
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

/* 系统事件/错误消息 */
.system-event {
    width: 100%;
    display: flex;
    justify-content: center;
    margin: 20rpx 0;

    text {
        background-color: rgba(0, 0, 0, 0.1);
        color: #666;
        font-size: 22rpx;
        padding: 6rpx 20rpx;
        border-radius: 20rpx;
    }
}

.error-system-msg {
    background-color: #ffebee !important;
    color: #ff4757 !important;
    border: 1px solid #ffcdd2;
    cursor: pointer;

    &:active {
        opacity: 0.7;
        transform: scale(0.95);
    }
}

.loading-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 20rpx;
}

.loading-dots {
    color: #999;
    letter-spacing: 4rpx;
    font-weight: bold;
}

/* ==========================================================================
   4. 底部交互区域 (Footer Area) - 新版
   ========================================================================== */
.footer-area {
    background-color: #f7f7f7;
    border-top: 1px solid #e5e5e5;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 99;
    flex-shrink: 0;
}

/* 建议气泡栏 */
.suggestion-bar {
    display: flex;
    gap: 15rpx;
    padding: 15rpx 20rpx;
    background-color: #fff;
    border-bottom: 1px solid #f0f0f0;
    white-space: nowrap;
    overflow-x: auto;
}

.suggestion-chip {
    background-color: #f0f8ff;
    color: #007aff;
    padding: 8rpx 24rpx;
    border-radius: 30rpx;
    font-size: 24rpx;
    border: 1px solid #dbeafe;
    flex-shrink: 0;
    
    &:active {
        background-color: #dbeafe;
    }
}

.close-suggestion {
    padding: 0 15rpx;
    color: #999;
    font-size: 32rpx;
    display: flex;
    align-items: center;
}

/* 工具栏 (可折叠) */
.tool-bar {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 20rpx 10rpx;
    background-color: #fcfcfc;
    border-bottom: 1px solid #eee;
    animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(10rpx); }
    to { opacity: 1; transform: translateY(0); }
}

.tool-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 120rpx;
}

.tool-icon {
    font-size: 40rpx;
    margin-bottom: 6rpx;
    width: 80rpx;
    height: 80rpx;
    background: #fff;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
}

.tool-text {
    font-size: 22rpx;
    color: #666;
}

.disabled-tool {
    opacity: 0.5;
    filter: grayscale(100%);
}

/* 输入行 (Input Row) */
.input-row {
    display: flex;
    align-items: center;
    padding: 16rpx 20rpx;
    background-color: #f7f7f7;
}

.toggle-btn {
    width: 70rpx;
    height: 70rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
}

.toggle-icon {
    font-size: 44rpx;
    color: #666;
    transition: transform 0.3s ease;
    
    &.rotated {
        transform: rotate(45deg);
        color: #333;
    }
}

.text-input {
    flex: 1;
    height: 76rpx;
    background: #fff;
    border-radius: 10rpx;
    padding: 0 20rpx;
    font-size: 30rpx;
    margin-right: 16rpx;
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
    border-radius: 10rpx;

    &.disabled {
        background: #e0e0e0;
        color: #999;
    }
}

.btn-hover {
    opacity: 0.7;
    transform: scale(0.96);
}

.safe-area-bottom {
    height: constant(safe-area-inset-bottom);
    height: env(safe-area-inset-bottom);
    background-color: #f7f7f7;
}

/* ==========================================================================
   5. 弹窗面板 (时间设置等)
   ========================================================================== */
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
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
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
    
    &:active {
        background-color: #dbeafe;
    }
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

.setting-row {
    display: flex;
    align-items: center;
    margin-bottom: 30rpx;
    justify-content: center;
}

.setting-label {
    width: 100rpx;
    font-size: 30rpx;
    color: #666;
    text-align: right;
}

.picker-display {
    border: 1px solid #ddd;
    padding: 10rpx 30rpx;
    border-radius: 10rpx;
    min-width: 240rpx;
    text-align: center;
    background-color: #f8f8f8;
    color: #333;
    font-size: 30rpx;
}

.confirm-time-btn {
    background-color: #007aff;
    color: #fff;
    width: 100%;
    border-radius: 40rpx;
    margin-top: 20rpx;
    font-size: 30rpx;
    line-height: 88rpx;
}
</style>