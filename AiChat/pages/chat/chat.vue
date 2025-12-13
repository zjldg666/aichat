<template>
  <view class="chat-container">
    <!-- 顶部状态栏 -->
    <view class="status-bar-wrapper">
      <view class="affection-box">
        <text class="heart-icon">❤️</text>
        <view class="progress-inner">
          <view class="status-text">
            <text class="status-label">{{ relationshipStatus }}</text>
            <text class="score-text">{{ currentAffection }}/100</text>
          </view>
          <progress :percent="currentAffection" active-color="#ff6b81" background-color="#eee" border-radius="6" stroke-width="4" active />
        </view>
      </view>
     
      <!-- 场景与模式显示 -->
      <view class="info-row">
        <view class="location-box" :class="interactionMode === 'phone' ? 'phone-mode' : 'face-mode'">
          <template v-if="interactionMode === 'phone'">
            <text class="location-icon">📱</text>
            <text class="location-text">手机畅聊 (对方在: {{ currentLocation }})</text>
          </template>
          <template v-else>
            <text class="location-icon">📍</text>
            <text class="location-text">当前场景: {{ currentLocation }}</text>
          </template>
        </view>
       
        <!-- 点击时间区域触发设置面板 -->
        <view class="time-box" @click="showTimeSettingPanel = true">
          <text class="time-icon">📅</text>
          <text class="time-text">{{ formattedTime }} </text>
        </view>
      </view>

      <view class="activity-row">
          <view class="activity-badge">
              <text>当前状态: {{ currentActivity }}</text>
          </view>
      </view>
    </view>

    <!-- 聊天滚动区域 -->
    <scroll-view class="chat-scroll" scroll-y="true" :scroll-into-view="scrollIntoView" :scroll-with-animation="true">
      <view class="chat-content">
        <view class="system-tip"><text>沉浸式扮演已就绪...</text></view>
       
        <view v-for="(msg, index) in messageList" :key="index" :id="'msg-' + index" class="message-item" :class="msg.role === 'user' ? 'right' : 'left'">
          <view v-if="msg.isSystem" class="system-event">
            <text v-if="!msg.isError">{{ msg.content }}</text>
            <text v-else class="error-system-msg" @click="retryGenerateImage(msg)">
               {{ msg.content }} 🔄
            </text>
          </view>
          <template v-else>
            <image v-if="msg.role === 'model'" class="avatar" :src="currentRole?.avatar || '/static/ai-avatar.png'" mode="aspectFill"></image>
           
            <view class="bubble-wrapper">
              <view v-if="!msg.type || msg.type === 'text'" class="bubble" :class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
                <text class="msg-text" user-select>{{ msg.content }}</text>
              </view>
              <view v-else-if="msg.type === 'image'" class="bubble image-bubble" :class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
                 <image :src="msg.content" mode="widthFix" class="chat-image" @click="previewImage(msg.content)"></image>
              </view>
            </view>
           
            <image v-if="msg.role === 'user'" class="avatar" :src="userAvatar" mode="aspectFill"></image>
          </template>
        </view>
       
        <view v-if="isLoading" class="loading-wrapper"><view class="loading-dots">...</view></view>
        <view id="scroll-bottom" style="height: 20rpx;"></view>
      </view>
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="input-area">
      <view class="action-btn" hover-class="btn-hover" @click="showTimePanel = true">
        <text class="action-icon">⏱️</text>
        <text class="action-text">快进</text>
      </view>
      <view class="action-btn" hover-class="btn-hover" @click="triggerNextStep">
        <text class="action-icon">▶️</text>
        <text class="action-text">继续</text>
      </view>
      
      <input class="text-input" v-model="inputText" confirm-type="send" @confirm="sendMessage()" placeholder="输入对话..." :disabled="isLoading" />
      
      <!-- 新增：拍照按钮 -->
      <view class="camera-btn" hover-class="btn-hover" @click="handleCameraSend">
        <text>📷</text>
      </view>

      <button class="send-btn" :class="{ 'disabled': isLoading }" @click="sendMessage()">发送</button>
    </view>
   
    <!-- 时间快进面板 (原功能) -->
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

    <!-- 精确时间设置面板 -->
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
    import { GAME_ENGINE_PROMPT } from '@/utils/prompts.js';
    
    // 引入常量
    import { 
        STYLE_PROMPT_MAP, 
        NEGATIVE_PROMPTS, 
        COMFY_WORKFLOW_TEMPLATE 
    } from '@/utils/constants.js';

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
    const lastUpdateGameHour = ref(-1);
    const isBackgroundUpdating = ref(false);
    
    const showTimePanel = ref(false); 
    const showTimeSettingPanel = ref(false); 
    const customMinutes = ref('');
    const currentSummary = ref('');
    const enableSummary = ref(false);
    const summaryFrequency = ref(20);
    const charHistoryLimit = ref(20);
    
    const tempDateStr = ref('');
    const tempTimeStr = ref('');
    
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

    const cleanMessageForAI = (content) => {
        if (!content) return "";
        let text = content;
        text = text.replace(/\[Thought[\s\S]*?\]/gi, '');
        text = text.replace(/\[Logic[\s\S]*?\]/gi, '');
        text = text.replace(/\[ACT:.*?\]/gi, '');
        text = text.replace(/\[LOC:.*?\]/gi, '');
        text = text.replace(/\[IMG:.*?\]/gi, '');
        text = text.replace(/\[AFF:.*?\]/gi, '');
        text = text.replace(/\[LUST:.*?\]/gi, '');
        text = text.replace(/\[MODE:.*?\]/gi, '');
        text = text.replace(/\[CLOTHES:.*?\]/gi, '');
        text = text.replace(/\|\|\|/g, ' ');
        return text.trim();
    };

    const getCurrentLlmConfig = () => {
        const schemes = uni.getStorageSync('app_llm_schemes') || [];
        const idx = uni.getStorageSync('app_current_scheme_index') || 0;
        if (schemes.length > 0 && schemes[idx]) {
            return schemes[idx];
        }
        return uni.getStorageSync('app_api_config');
    };

    // ==================================================================================
    // 3. 生命周期
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
        } else {
            console.error('❌ [LifeCycle] No Chat ID provided in options');
        }
    });
    
    onShow(() => {
        console.log('👀 [LifeCycle] onShow');
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
        }
    });
    
    onHide(() => { 
        console.log('🙈 [LifeCycle] onHide - Stopping time flow & saving state.');
        stopTimeFlow(); 
        saveCharacterState(); 
    });
    
    onUnload(() => { 
        console.log('👋 [LifeCycle] onUnload - Cleaning up.');
        stopTimeFlow(); 
        saveCharacterState(); 
    });
    
    onNavigationBarButtonTap((e) => {
        if (e.key === 'setting') {
            console.log('⚙️ [Nav] Tapped setting button');
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
            console.log('👤 [Data] Loaded Role:', target.name);
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
            enableSummary.value = target.enableSummary || false;
            summaryFrequency.value = target.summaryFrequency || 20;
            currentSummary.value = target.summary || "暂无重要记忆。";
            charHistoryLimit.value = target.historyLimit !== undefined ? target.historyLimit : 20;
        } else {
            console.error('❌ [Data] Role not found for ID:', id);
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
                uni.setStorageSync('contact_list', list);
                console.log('💾 [System] State Saved to Storage');
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
        console.log('⏰ [Time] Manual set to:', fullStr);
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
        console.log(`⏭️ [Time] Skip ${type}, adding ${addMs}ms`);
        const newTime = currentTime.value + addMs;
        saveCharacterState(undefined, newTime);
        showTimePanel.value = false;
        messageList.value.push({ role: 'system', content: `【系统】${desc} 当前时间：${formattedTime.value}`, isSystem: true });
        scrollToBottom();
    };

    const performBackgroundSummary = async () => {
        console.log('🧠 [Memory] Starting background summary...');
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
        const limit = summaryFrequency.value;
        const recentChats = messageList.value.filter(m => !m.isSystem && m.type !== 'image').slice(-limit);
        if (recentChats.length < 5) return;
        const chatContent = recentChats.map(m => `${m.role === 'user' ? userName.value : chatName.value}: ${m.content}`).join('\n');
        const summaryPrompt = `作为记忆管理员，整合新旧记忆。保留关键剧情。\n旧记忆：${currentSummary.value}\n新对话：${chatContent}\n输出新记忆：`;
        
        let baseUrl = config.baseUrl || '';
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        
        try {
            let newSummary = '';
            if (config.provider === 'gemini') {
                const cleanBase = 'https://generativelanguage.googleapis.com';
                const res = await uni.request({
                    url: `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
                    method: 'POST', data: { contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }] }, sslVerify: false
                });
                if (res.statusCode === 200) newSummary = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            } 
            else {
                const res = await uni.request({
                    url: `${baseUrl}/chat/completions`,
                    method: 'POST',
                    header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                    data: { model: config.model, messages: [{ role: "user", content: summaryPrompt }], max_tokens: 500 }, sslVerify: false
                });
                let data = res.data;
                if (typeof data === 'string') try { data = JSON.parse(data); } catch(e){}
                if (res.statusCode === 200) newSummary = data?.choices?.[0]?.message?.content;
            }
            if (newSummary) {
                console.log('🧠 [Memory] Summary Updated:', newSummary.substring(0, 50) + '...');
                saveCharacterState(undefined, undefined, newSummary);
            }
        } catch (e) { console.error('❌ [Memory] Summary failed:', e); }
    };

    const getTimeTags = () => {
        const date = new Date(currentTime.value);
        const hour = date.getHours();
        if (hour >= 5 && hour < 7) return "early morning, sunrise, warm lighting";
        if (hour >= 7 && hour < 16) return "daytime, bright sunlight, natural lighting";
        if (hour >= 16 && hour < 19) return "sunset, dusk, golden hour";
        if (hour >= 19 || hour < 5) return "night, dark, moonlight, cinematic lighting";
        return "daytime";
    };
    
    // 【终极方案 V2】模块化 Prompt 组装 (AI 驱动暴露逻辑)
    const optimizePromptForComfyUI = async (actionAndSceneDescription) => {
        console.log('🎨 [Image] Optimizing Prompt, Raw Desc:', actionAndSceneDescription);
        
        const settings = currentRole.value?.settings || {};
        
        // 1. 获取基础素体 (Body Safe)
        // 兼容旧数据：如果没有 appearanceSafe，退回到 appearance
        const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl";
        
        // 2. 获取用户外貌
        const userDesc = userAppearance.value || "1boy, short hair"; 
        
        // 3. 处理场景与动作
        let cleanTagsFromAI = actionAndSceneDescription.replace(/COUPLE_ON/gi, '');
        const isDuo = actionAndSceneDescription.includes('COUPLE_ON');

        // 4. 服装与隐私特征 (核心逻辑变更)
        // 我们不再手动根据 naked 关键词注入隐私特征。
        // 现在，我们完全信任 AI 的 [CLOTHES] 输出。
        // AI 的 [CLOTHES] 指令里，如果它认为需要露，它就已经把 'pink nipples' 等词加进来了。
        const clothingAndNsfwTags = currentClothing.value;

        // 5. 获取环境与风格
        const compositionTag = isDuo ? "couple, 2people, 1boy, 1girl" : "solo, single view, looking at viewer";
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        const styleSetting = imgConfig.style || 'anime';
        const styleTags = STYLE_PROMPT_MAP[styleSetting] || STYLE_PROMPT_MAP['anime'];
        const timeTags = getTimeTags();

        // 6. 最终组装
        // 公式：[构图] + [风格] + [素体(Safe)] + [AI决定的衣服与暴露细节] + [动作场景]
        let finalPrompt = `${compositionTag}, masterpiece, best quality, ${styleTags}, ${appearanceSafe}, ${clothingAndNsfwTags}, ${cleanTagsFromAI}`;

        if (isDuo) {
            finalPrompt += `, ${userDesc}`;
        }

        finalPrompt += `, ${timeTags}`;

        // 7. 清理
        let cleanPrompt = finalPrompt.replace(/，/g, ',').replace(/[^\x00-\x7F]+/g, '');
        cleanPrompt = cleanPrompt.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').replace(/,+/g, ',');
        
        console.log('🎨 [ComfyUI Final Prompt]:', cleanPrompt);
        
        return cleanPrompt;
    };

    const generateImageFromComfyUI = async (englishTags, baseUrl) => {
        console.log('🎨 [ComfyUI] Requesting image...');
        const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));
        workflow["3"].inputs.text = englishTags;
        const isDuo = /couple|2people|1boy|multiple boys|kiss|sex|paizuri|doggystyle/i.test(englishTags);
        workflow["4"].inputs.text = isDuo ? NEGATIVE_PROMPTS.DUO : NEGATIVE_PROMPTS.SOLO;
        const seed = Math.floor(Math.random() * 999999999999999);
        workflow["5"].inputs.seed = seed;
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
                        const finalUrl = `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
                        console.log('✅ [ComfyUI] Image generated:', finalUrl);
                        return finalUrl;
                    }
                }
            }
            throw new Error('生成超时');
        } catch (e) { 
            console.error('❌ [ComfyUI] Error:', e);
            throw e; 
        }
    };

    const generateChatImage = async (sceneDescription) => {
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        if (!imgConfig.baseUrl) {
             console.warn('⚠️ [Image] No ComfyUI BaseURL configured');
             return null;
        }
        
        const finalPrompt = await optimizePromptForComfyUI(sceneDescription);
        if (!finalPrompt) return null;
        
        try {
            return await generateImageFromComfyUI(finalPrompt, imgConfig.baseUrl);
        } catch (e) { console.error(e); }
        return null;
    };
    
    const handleAsyncImageGeneration = async (imgDesc, placeholderId) => {
        console.log('🖼️ [Image] Handling async gen for:', imgDesc);
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
            console.error('❌ [Image] Async handling failed:', e);
            const idx = messageList.value.findIndex(m => m.id === placeholderId);
             if (idx !== -1) {
                 messageList.value[idx] = { role: 'system', content: '❌ 照片显影异常 (点击重试)', isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
                 saveHistory();
            }
        }
    };

    const retryGenerateImage = (msg) => {
        console.log('🔄 [Image] Retrying generation...');
        if (!msg.isError || !msg.originalPrompt) return;
        const idx = messageList.value.findIndex(m => m.id === msg.id);
        if (idx !== -1) {
            messageList.value[idx] = { role: 'system', content: '📷 影像显影中... (重试中)', isSystem: true, id: msg.id };
            handleAsyncImageGeneration(msg.originalPrompt, msg.id);
        }
    };

    const triggerNextStep = () => {
        if (isLoading.value) return;
        console.log('▶️ [Action] User triggered continue');
        sendMessage(true);
    };

    const handleCameraSend = () => {
        if (isLoading.value) return;
        console.log('📷 [Action] User triggered camera shot');
        const extraInstruction = `[SYSTEM EVENT: The user pressed the SHUTTER button. IMMEDIATE ACTION REQUIRED: The user is taking a photo of you RIGHT NOW. Do not ask for confirmation. Do not wait. You MUST output the [IMG:...] tag at the end of this response to generate the photo based on current visual context. If the user text is empty, just pose for the photo.]`;
        sendMessage(false, extraInstruction);
    };
    
    const sendMessage = async (isContinue = false, systemOverride = '') => {
        if (!isContinue && !inputText.value.trim() && !systemOverride) return;
        if (isLoading.value) return;
        
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
            uni.showToast({ title: '请配置模型', icon: 'none' });
            return;
        }
        
        if (!isContinue) {
            if (inputText.value.trim()) {
                 console.log('🗣️ [Chat] User sent:', inputText.value);
                 messageList.value.push({ role: 'user', content: inputText.value });
                 inputText.value = '';
            } else if (systemOverride && systemOverride.includes('SHUTTER')) {
                 messageList.value.push({ role: 'system', content: '📷 (你举起手机拍了一张)', isSystem: true });
            }
        }
        scrollToBottom();
        isLoading.value = true;
        saveHistory();
        
        const hiddenInstruction = `\n[System: Current status is '${currentActivity.value}'. If your activity changes due to time or action, append [ACT: new status] at the end.]`;
        let prompt = GAME_ENGINE_PROMPT + hiddenInstruction;
        
        // 【关键逻辑】 注入 NSFW 隐私数据，供 AI 决策时调用
        const nsfwData = currentRole.value?.settings?.appearanceNsfw || "pink nipples, pussy"; // 默认兜底
        
        prompt = prompt
            .replace(/{{char}}/g, chatName.value)
            .replace(/{{user}}/g, userName.value)
            .replace(/{{current_affection}}/g, currentAffection.value)
            .replace(/{{current_lust}}/g, currentLust.value)
            .replace(/{{current_time}}/g, formattedTime.value)
            .replace(/{{current_location}}/g, currentLocation.value)
            .replace(/{{current_activity}}/g, currentActivity.value) 
            .replace(/{{current_clothes}}/g, currentClothing.value)
            .replace(/{{appearance_nsfw}}/g, nsfwData) // 注入隐私特征库
            .replace(/{{summary}}/g, currentSummary.value)
            .replace(/{{char_home}}/g, charHome.value)
            .replace(/{{user_home}}/g, userHome.value)
            .replace(/{{interaction_mode}}/g, interactionMode.value === 'phone' ? 'Phone (手机通讯)' : 'Face (面对面)');

        if (currentRole.value) {
            const s = currentRole.value.settings || {};
            let dynamicPersonality = `[Base Bio: ${s.bio || "普通人"}]\n` +
                                     `[Reaction at Low Affection]: ${s.personalityNormal || "冷淡"}\n` +
                                     `[Reaction at Mid Affection]: ${s.personalityFlirt || "友好"}\n` +
                                     `[Reaction at High Affection]: ${s.personalitySex || "亲密"}\n`;

            let activeExample = "";
            const score = currentAffection.value;
            if (score <= 40) activeExample = s.exampleNormal || s.example || "语气生硬。";
            else if (score <= 80) activeExample = s.exampleFlirt || s.example || "语气柔和。";
            else activeExample = s.exampleSex || s.example || "语气亲密。";

            prompt = prompt
                .replace(/{{appearance}}/g, s.appearance || "cute anime character")
                .replace(/{{personality}}/g, dynamicPersonality)
                .replace(/{{occupation}}/g, s.occupation || "未知职业")
                .replace(/{{memory}}/g, s.bio || "无")
                .replace(/{{example}}/g, activeExample);
        }

        const historyLimit = charHistoryLimit.value; 
        let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
        if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
        
        console.log('📝 [LLM] System Prompt (Snippet):', prompt.substring(0, 200) + '...');
        
        let targetUrl = '';
        let requestBody = {};
        
        let baseUrl = config.baseUrl || '';
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        if (config.provider === 'gemini') {
            const cleanBase = 'https://generativelanguage.googleapis.com';
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            
            const geminiContents = contextMessages.map(item => {
                const cleanText = item.role === 'model' ? cleanMessageForAI(item.content) : item.content;
                return { role: item.role === 'user' ? 'user' : 'model', parts: [{ text: cleanText }] };
            }).filter(item => item.parts[0].text.trim() !== '');
            
            if (systemOverride) geminiContents.push({ role: 'user', parts: [{ text: systemOverride }] });
            else if (isContinue) geminiContents.push({ role: 'user', parts: [{ text: '(continue generation)' }] });
            
            requestBody = {
                contents: geminiContents,
                system_instruction: { parts: { text: prompt } },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            };
            
        } else {
            targetUrl = `${baseUrl}/chat/completions`;
            
            const openAIMessages = [
                { role: "system", content: prompt }
            ];
            contextMessages.forEach(item => {
                const cleanText = item.role === 'model' ? cleanMessageForAI(item.content) : item.content;
                if (cleanText.trim()) {
                    openAIMessages.push({ role: item.role === 'model' ? 'assistant' : 'user', content: cleanText });
                }
            });
            
            if (systemOverride) openAIMessages.push({ role: 'user', content: systemOverride });
            else if (isContinue) openAIMessages.push({ role: 'user', content: '(continue generation)' });
            
            requestBody = {
                model: config.model,
                messages: openAIMessages,
                max_tokens: 1500, 
                stream: false
            };
        }
        
        console.log('📡 [LLM] Requesting:', targetUrl);
        
        try {
            const header = { 'Content-Type': 'application/json' };
            if (config.provider !== 'gemini') header['Authorization'] = `Bearer ${config.apiKey}`;
            
            const res = await uni.request({
                url: targetUrl, method: 'POST', header: header, data: requestBody, sslVerify: false
            });

            if (res.statusCode === 200) {
                let rawText = "";
                if (config.provider === 'gemini') {
                    rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                } else {
                    let data = res.data;
                    if (typeof data === 'string') try { data = JSON.parse(data); } catch(e){}
                    rawText = data?.choices?.[0]?.message?.content || "";
                }

                if (rawText) {
                    console.log('📥 [LLM] Raw Response:', rawText.substring(0, 100) + (rawText.length > 100 ? '...' : ''));
                    processAIResponse(rawText);
                } else {
                    console.warn('⚠️ [LLM] Empty response or Blocked');
                    const blockReason = res.data?.promptFeedback?.blockReason;
                    if (blockReason) uni.showModal({ title: 'AI 拒绝', content: blockReason, showCancel: false });
                    else uni.showToast({ title: '无内容响应', icon: 'none' });
                }
            } else {
                console.error("❌ [LLM] API Error", res);
                if (res.statusCode === 429) uni.showToast({ title: '请求太快 (429)', icon: 'none' });
                else uni.showToast({ title: `API错误 ${res.statusCode}`, icon: 'none' });
            }
        } catch (e) {
            console.error('❌ [Network] Request failed:', e);
            uni.showToast({ title: '网络错误', icon: 'none' });
        } finally {
            isLoading.value = false;
            scrollToBottom();
        }
    };
    
    const processAIResponse = (rawText) => {
        let displayText = rawText.replace(/\[Thought[\s\S]*?\]/gi, '').trim()
                                 .replace(/\[Logic[\s\S]*?\]/gi, '').trim();
        let systemMsgs = [];

        const affRegex = /\[AFF:?\s*([+-]?\d+)\]/gi;
        let match;
        while ((match = affRegex.exec(displayText)) !== null) {
            let change = parseInt(match[1], 10);
            if (!isNaN(change)) {
                if (change > 3) change = 3; 
                console.log(`❤️ [Status] Affection change: ${change}`);
                saveCharacterState(currentAffection.value + change);
                if (change !== 0) uni.showToast({ title: `好感 ${change > 0 ? '+' : ''}${change}`, icon: 'none' });
            }
        }
        displayText = displayText.replace(affRegex, '');

        const lustRegex = /\[LUST:?\s*([+-]?\d+)\]/gi;
        let lustMatch;
        while ((lustMatch = lustRegex.exec(displayText)) !== null) {
            let change = parseInt(lustMatch[1], 10);
            if (!isNaN(change)) {
                console.log(`🔥 [Status] Lust change: ${change}`);
                saveCharacterState(undefined, undefined, undefined, undefined, undefined, undefined, currentLust.value + change);
            }
        }
        displayText = displayText.replace(lustRegex, '');

        const modeRegex = /\[MODE:?\s*(.*?)\]/i;
        const modeMatch = displayText.match(modeRegex);
        if (modeMatch) {
            const newModeVal = modeMatch[1].trim().toLowerCase();
            let newMode = 'phone';
            if (newModeVal.includes('face') || newModeVal.includes('见') || newModeVal.includes('面')) newMode = 'face';
            if (newMode !== interactionMode.value) {
                console.log(`📡 [Status] Mode switch to: ${newMode}`);
                interactionMode.value = newMode;
                saveCharacterState(undefined, undefined, undefined, undefined, undefined, newMode);
                const modeText = newMode === 'face' ? '见面了' : '分开了';
                systemMsgs.push(`状态更新：${modeText}`);
            }
            displayText = displayText.replace(modeRegex, '');
        }

        const locRegex = /\[LOC:?\s*(.*?)\]/i;
        const locMatch = displayText.match(locRegex);
        if (locMatch) {
            const newLoc = locMatch[1].trim();
            console.log(`📍 [Status] Moved to: ${newLoc}`);
            currentLocation.value = newLoc;
            saveCharacterState(undefined, undefined, undefined, newLoc);
            systemMsgs.push(`移动到：${newLoc}`);
            displayText = displayText.replace(locRegex, '');
        }
        
        const clothesRegex = /\[CLOTHES:?\s*(.*?)\]/i;
        const clothesMatch = displayText.match(clothesRegex);
        if (clothesMatch) {
            const newClothes = clothesMatch[1].trim();
            console.log(`👗 [Status] Clothes changed to: ${newClothes}`);
            currentClothing.value = newClothes;
            saveCharacterState(undefined, undefined, undefined, undefined, newClothes);
            systemMsgs.push(`换装：${newClothes}`);
            displayText = displayText.replace(clothesRegex, '');
        }
        
        const actRegex = /\[ACT:?\s*(.*?)\]/i;
        const actMatch = displayText.match(actRegex);
        if (actMatch) {
            const newAct = actMatch[1].trim();
            console.log(`🎬 [Status] Activity update: ${newAct}`);
            currentActivity.value = newAct; 
            saveCharacterState(); 
            displayText = displayText.replace(actRegex, '');
        }

        const imgRegex = /\[IMG:(.*?)\]/i;
        const imgMatch = displayText.match(imgRegex);
        let pendingImagePlaceholder = null;
        if (imgMatch) {
            const imgDesc = imgMatch[1].trim();
            console.log(`🖼️ [Status] Image trigger detected: ${imgDesc}`);
            displayText = displayText.replace(imgRegex, '');
            const placeholderId = `img-loading-${Date.now()}`;
            pendingImagePlaceholder = { role: 'system', content: '📷 影像显影中... (请稍候)', isSystem: true, id: placeholderId };
            handleAsyncImageGeneration(imgDesc, placeholderId);
        }

        displayText = displayText.replace(/\[(System|Logic).*?\]/gis, '').trim();
        displayText = displayText.replace(/^\[.*?\]\s*/, '');
        displayText = displayText.replace(/^.*?：\s*/, '');
        
        systemMsgs.forEach(txt => { messageList.value.push({ role: 'system', content: txt, isSystem: true }); });
        
        if (displayText) {
            displayText = displayText.replace(/(\r\n|\n|\r)+/g, '|||');
            displayText = displayText.replace(/([”"])\s*([（(])/g, '$1|||$2');
            displayText = displayText.replace(/([)）])\s*([（(])/g, '$1|||$2');
            const parts = displayText.split('|||');
            parts.forEach(part => {
                let cleanPart = part.trim();
                const isJunk = /^[\s\.,;!?:'"()[\]``{}<>\\\/|@#$%^&*_\-+=，。、！？；：“”‘’（）《》…—~]+$/.test(cleanPart) || /^["“”'‘’]+$/.test(cleanPart) || cleanPart === '...' || cleanPart.length === 0;
                if (!isJunk) messageList.value.push({ role: 'model', content: cleanPart });
            });
        }
        if (pendingImagePlaceholder) messageList.value.push(pendingImagePlaceholder);
        saveHistory();
        if (enableSummary.value) {
            const validMsgCount = messageList.value.filter(m => !m.isSystem).length;
            if (validMsgCount > 0 && validMsgCount % summaryFrequency.value === 0) performBackgroundSummary();
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
.chat-container { display: flex; flex-direction: column; height: 100vh; background-color: #f5f5f5; }
.status-bar-wrapper { background-color: #fff; padding: 10rpx 30rpx; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 12rpx; }
.affection-box { display: flex; align-items: center; }
.heart-icon { font-size: 32rpx; margin-right: 15rpx; animation: heartbeat 1.5s infinite; }
.progress-inner { flex: 1; }
.status-text { display: flex; justify-content: space-between; font-size: 22rpx; color: #666; margin-bottom: 4rpx; }
.status-label { font-weight: bold; color: #333; }
.score-text { color: #ff6b81; font-weight: bold; }
.info-row { display: flex; justify-content: space-between; align-items: center; }
.location-box { display: flex; align-items: center; padding: 6rpx 16rpx; border-radius: 20rpx; font-size: 24rpx; font-weight: bold; transition: all 0.3s; }
.phone-mode { background-color: #f0f3f5; color: #555; }
.face-mode { background-color: #e3f2fd; color: #007aff; }
.location-icon { margin-right: 6rpx; }
.time-box { display: flex; align-items: center; font-size: 24rpx; color: #555; background-color: #f8f8f8; padding: 6rpx 16rpx; border-radius: 20rpx; }
.time-icon { margin-right: 8rpx; }
.activity-row { display: flex; justify-content: center; margin-top: 4rpx; }
.activity-badge { background-color: #fff8e1; border: 1px solid #ffe0b2; color: #f57c00; font-size: 22rpx; padding: 4rpx 20rpx; border-radius: 30rpx; font-weight: bold; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.02); }
@keyframes heartbeat { 0%, 100% { transform: scale(1); } 15% { transform: scale(1.2); } 30% { transform: scale(1); } 45% { transform: scale(1.1); } }
.chat-scroll { flex: 1; overflow: hidden; }
.chat-content { padding: 20rpx; padding-bottom: 40rpx; }
.system-tip { text-align: center; color: #aaa; font-size: 24rpx; margin-bottom: 30rpx; font-style: italic;}
.message-item { display: flex; margin-bottom: 30rpx; width: 100%; }
.message-item.left { flex-direction: row; }
.message-item.right { flex-direction: row-reverse; }
.avatar { width: 80rpx; height: 80rpx; border-radius: 10rpx; background-color: #ddd; flex-shrink: 0; }
.left .avatar { margin-right: 20rpx; }
.right .avatar { margin-left: 20rpx; }
.bubble-wrapper { max-width: 72%; display: flex; flex-direction: column; }
.bubble { padding: 18rpx 24rpx; border-radius: 16rpx; font-size: 30rpx; line-height: 1.5; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05); }
.left-bubble { background-color: #ffffff; color: #333; border-top-left-radius: 4rpx; }
.right-bubble { background-color: #95ec69; color: #000; border-top-right-radius: 4rpx; }
.image-bubble { padding: 0; background-color: transparent !important; box-shadow: none; overflow: hidden; }
.chat-image { width: 400rpx; border-radius: 16rpx; box-shadow: 0 4rpx 8rpx rgba(0,0,0,0.1); display: block; }
.msg-text { white-space: pre-wrap; word-break: break-all; }
.system-event { width: 100%; display: flex; justify-content: center; margin: 20rpx 0; }
.system-event text { background-color: rgba(0,0,0,0.1); color: #666; font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 20rpx; }
.loading-wrapper { display: flex; justify-content: center; margin-bottom: 20rpx; }
.loading-dots { color: #999; letter-spacing: 4rpx; }
.input-area { background: #f7f7f7; padding: 20rpx; display: flex; align-items: center; border-top: 1px solid #ddd; padding-bottom: calc(20rpx + constant(safe-area-inset-bottom)); padding-bottom: calc(20rpx + env(safe-area-inset-bottom));}
.action-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; margin-right: 20rpx; padding: 0 10rpx; cursor: pointer; }
.action-icon { font-size: 32rpx; margin-bottom: 2rpx; }
.action-text { font-size: 20rpx; color: #555; font-weight: bold; }
.btn-hover { opacity: 0.6; transform: scale(0.95); }
.text-input { flex: 1; height: 76rpx; background: #fff; border-radius: 10rpx; padding: 0 20rpx; margin-right: 20rpx; font-size: 30rpx; }
.camera-btn { width: 76rpx; height: 76rpx; background: #ffffff; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; margin-right: 20rpx; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05); }
.camera-btn:active { background-color: #f0f0f0; transform: scale(0.95); }
.send-btn { width: 120rpx; height: 76rpx; background: #95ec69; color: #000; line-height: 76rpx; font-size: 28rpx; padding: 0; margin: 0; font-weight: bold; }
.send-btn.disabled { background: #e0e0e0; color: #999; }
.time-panel-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.4); z-index: 100; display: flex; justify-content: center; align-items: center; }
.time-panel { width: 600rpx; background-color: #fff; border-radius: 20rpx; padding: 30rpx; animation: popIn 0.2s ease-out; }
@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.panel-title { font-size: 32rpx; font-weight: bold; text-align: center; margin-bottom: 30rpx; color: #333; }
.grid-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; margin-bottom: 30rpx; }
.grid-btn { background-color: #f0f8ff; color: #007aff; text-align: center; padding: 20rpx 0; border-radius: 10rpx; font-size: 28rpx; font-weight: 500; }
.grid-btn:active { background-color: #dbeafe; }
.custom-time { display: flex; align-items: center; justify-content: center; gap: 10rpx; font-size: 28rpx; color: #666; }
.mini-input { width: 100rpx; border-bottom: 1px solid #ddd; text-align: center; font-size: 28rpx; color: #333; }
.mini-btn { background-color: #eee; padding: 10rpx 20rpx; border-radius: 8rpx; font-size: 24rpx; }
.error-system-msg { background-color: #ffebee !important; color: #ff4757 !important; font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 20rpx; border: 1px solid #ffcdd2; }
.error-system-msg:active { opacity: 0.7; transform: scale(0.95); }
.setting-row { display: flex; align-items: center; margin-bottom: 30rpx; justify-content: center; }
.setting-label { width: 100rpx; font-size: 30rpx; color: #666; text-align: right; }
.picker-display { border: 1px solid #ddd; padding: 10rpx 30rpx; border-radius: 10rpx; min-width: 240rpx; text-align: center; background-color: #f8f8f8; color: #333; font-size: 30rpx; }
.confirm-time-btn { background-color: #007aff; color: #fff; width: 100%; border-radius: 40rpx; margin-top: 20rpx; }
</style>