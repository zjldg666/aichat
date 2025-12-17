<template>
  <view class="chat-container">
    <view class="status-bar-wrapper">
      
     
      <view class="info-row">
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
       
        <view class="time-box" @click="showTimeSettingPanel = true">
          <text class="time-icon">📅</text>
          <text class="time-text">{{ formattedTime }}</text>
        </view>
      </view>
    </view>

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

    <view class="suggestion-bar" v-if="suggestionList.length > 0">
        <view class="suggestion-chip" 
              v-for="(text, index) in suggestionList" 
              :key="index"
              @click="applySuggestion(text)">
            {{ text }}
        </view>
        <view class="close-suggestion" @click="suggestionList = []">×</view>
    </view>

    <view class="input-area">
      <view class="action-btn" hover-class="btn-hover" @click="showTimePanel = true">
        <text class="action-icon">⏱️</text>
        <text class="action-text">快进</text>
      </view>
      
      <view class="action-btn" hover-class="btn-hover" @click="triggerNextStep">
        <text class="action-icon">▶️</text>
        <text class="action-text">继续</text>
      </view>
      
      <view class="action-btn" hover-class="btn-hover" @click="getReplySuggestions">
        <text class="action-icon">💡</text>
        <text class="action-text">提示</text>
      </view>
      
      <input class="text-input" v-model="inputText" confirm-type="send" @confirm="sendMessage()" placeholder="输入对话..." :disabled="isLoading" />
      
      <view class="camera-btn" hover-class="btn-hover" @click="handleCameraSend">
        <text>📷</text>
      </view>

      <button class="send-btn" :class="{ 'disabled': isLoading }" @click="sendMessage()">发送</button>
    </view>
   
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
    
    // 引入 Prompt
    import { 
        CORE_INSTRUCTION_LOGIC_MODE, 
        SCENE_KEEPER_PROMPT, 
        RELATIONSHIP_PROMPT, 
        VISUAL_DIRECTOR_PROMPT,
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

    const triggerNextStep = () => {
        if (isLoading.value) return;
        sendMessage(true);
    };

    const handleCameraSend = () => {
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
    
    // =============================================================================
    // 🏠 Scene Keeper (物理状态管理：模式/地点/衣服)
    // =============================================================================
    const runSceneCheck = async (lastUserMsg, aiResponseText) => {
        if (!aiResponseText || aiResponseText.length < 3) return;

        console.log('🏠 [Scene Keeper] Checking physical state...');
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;

        const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;

        const prompt = SCENE_KEEPER_PROMPT
            .replace('{{location}}', currentLocation.value)
            .replace('{{clothes}}', currentClothing.value)
            .replace('{{mode}}', interactionMode.value)
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
                requestBody = { model: config.model, messages: [{ role: "user", content: prompt }], max_tokens: 150, temperature: 0.1 };
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
            console.log('🏠 [Scene Keeper] Verdict:', state);

            let hasChange = false;
            if (state.mode && ['phone', 'face'].includes(state.mode) && state.mode !== interactionMode.value) {
                console.log(`🔄 Mode Switch: ${interactionMode.value} -> ${state.mode}`);
                interactionMode.value = state.mode;
                hasChange = true;
                if(state.mode === 'face') uni.vibrateShort();
            }
            if (state.location && state.location.length < 20 && state.location !== currentLocation.value) {
                currentLocation.value = state.location;
                hasChange = true;
            }
            if (state.clothes && state.clothes.length < 30 && state.clothes !== currentClothing.value) {
                currentClothing.value = state.clothes;
                hasChange = true;
            }

            if (hasChange) saveCharacterState();

        } catch (e) {
            console.warn('Scene check failed:', e);
        }
    };

    // =============================================================================
    // ❤️ Relationship Tracker (心理状态管理：关系/活动)
    // =============================================================================
    const runRelationCheck = async (lastUserMsg, aiResponseText) => {
        if (!aiResponseText || aiResponseText.length < 5) return;

        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;

        const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;

        const prompt = RELATIONSHIP_PROMPT
            .replace('{{relation}}', currentRelation.value || "初相识")
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
                requestBody = { model: config.model, messages: [{ role: "user", content: prompt }], max_tokens: 150, temperature: 0.3 };
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
            console.log('❤️ [Relation Tracker] Verdict:', state);

            let hasChange = false;
            if (state.relation && state.relation.length < 50 && state.relation !== currentRelation.value) {
                console.log(`❤️ Relation Update: ${currentRelation.value} -> ${state.relation}`);
                currentRelation.value = state.relation;
                hasChange = true;
            }
            if (state.activity && state.activity.length < 20 && state.activity !== currentActivity.value) {
                currentActivity.value = state.activity;
                hasChange = true;
            }

            if (hasChange) saveCharacterState();

        } catch (e) {
            console.warn('Relation check failed:', e);
        }
    };

    // =============================================================================
    // 📸 Visual Director Agent (生图管理 - 带冷却锁)
    // =============================================================================
    const runVisualDirectorCheck = async (lastUserMsg, aiResponseText) => {
        if (!aiResponseText || aiResponseText.length < 5) return;

        const now = Date.now();
        if (now - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) {
            console.log('📸 [Visual Director] Cooldown active (Skipping).');
            return;
        }

        console.log('📸 [Visual Director] Scouting...');
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;

        const contextSummary = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;

        const prompt = VISUAL_DIRECTOR_PROMPT
            .replace('{{clothes}}', currentClothing.value || "Casual clothes") 
            + `\n\n【Context】\nMode: ${interactionMode.value}\nLocation: ${currentLocation.value}\nUser: ${userName.value}\nCharacter: ${chatName.value}`
            + `\n\n【Dialogue】\n${contextSummary}`;

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
                requestBody = { model: config.model, messages: [{ role: "user", content: prompt }], max_tokens: 150, temperature: 0.3 };
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

            const cleanJson = resultText.replace(/```json|```/g, '').trim();
            const result = JSON.parse(cleanJson);

            console.log('📸 [Visual Director] Verdict:', result);

            if (result.shouldGenerate === true && result.description && result.description.length > 5) {
                if (Date.now() - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) {
                     console.log('📸 [Visual Director] Cooldown hit right before generation. Aborting.');
                     return;
                }
                console.log('📸 [Action] Generating:', result.description);
                lastImageGenerationTime.value = Date.now();
                const placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
                messageList.value.push({ role: 'system', content: '📷 (抓拍中...)', isSystem: true, id: placeholderId });
                scrollToBottom();
                saveHistory();
                handleAsyncImageGeneration(result.description, placeholderId);
            }
        } catch (e) {
            console.warn('Visual Director check failed:', e);
        }
    };

    // =============================================================================
    // 🚀 核心发送函数 (Multi-Agent 架构 - 完整无省略版)
    // =============================================================================
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
                 messageList.value.push({ role: 'user', content: inputText.value });
                 inputText.value = '';
            } else if (systemOverride && systemOverride.includes('SHUTTER')) {
                 messageList.value.push({ role: 'system', content: '📷 (你举起手机拍了一张)', isSystem: true });
            }
        }
        scrollToBottom();
        isLoading.value = true;
        saveHistory();
        
        const role = currentRole.value || {};
        const s = role.settings || {};
        const appUser = uni.getStorageSync('app_user_info') || {};
        const myName = userName.value || appUser.name || 'User';
        const myProfile = `[User Profile]\nName: ${myName}\nAppearance: ${s.userAppearance || appUser.appearance || "Unknown"}`;

        const charName = chatName.value;
        const charBio = s.bio || "No bio provided.";
        const charLogic = s.personalityNormal || "React naturally based on your bio.";
        
        const dynamicLogic = `${charLogic}\n\n【当前关系状态 (Relationship Status)】\n${currentRelation.value || '初相识'}`;

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

        const historyLimit = charHistoryLimit.value; 
        let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
        if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
        
        console.log('=== 🎭 Roleplay AI Input ===');
        console.log('Mode:', interactionMode.value, '| Relation:', currentRelation.value);
        
        let targetUrl = '';
        let requestBody = {};
        let baseUrl = config.baseUrl || '';
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        const cleanHistoryForAI = contextMessages.map(item => {
            let cleanText = item.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            cleanText = cleanText.replace(/\[.*?\]/gi, ''); 
            return { role: item.role === 'user' ? 'user' : (item.role === 'model' ? 'assistant' : 'system'), content: cleanText };
        }).filter(m => m.content.trim() !== '');

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
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
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
    // 🧠 响应处理器 (流水线启动器)
    // =============================================================================
    // =============================================================================
        // 🧠 响应处理器 (流水线启动器)
        // =============================================================================
        const processAIResponse = (rawText) => {
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
            if (cleanDisplayText) {
                let processedText = cleanDisplayText.replace(/\n\s*([”"’])/g, '$1'); 
                processedText = processedText.replace(/([“"‘])\s*\n/g, '$1');   
                let tempText = processedText.replace(/(\r\n|\n|\r)+/g, '|||');
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
                // 倒序查找最近的一条用户消息，确保获取的是用户刚刚发送的那句
                for (let i = messageList.value.length - 2; i >= 0; i--) {
                    if (messageList.value[i].role === 'user') {
                        lastUserMsg = messageList.value[i].content;
                        break;
                    }
                }
                
                // 🔍【关键调试日志】这里能看到 Agent 到底基于什么上下文在判断
                console.log('📝 [Context Debug] =========================================');
                console.log('👤 User Input (用户说了啥):', lastUserMsg);
                console.log('🤖 AI Reply   (AI回了啥):', cleanDisplayText);
                console.log('==========================================================');
                
                console.log('🤖 [Multi-Agent] Starting pipeline...');
                
                setTimeout(async () => {
                    try {
                        const scenePromise = runSceneCheck(lastUserMsg, cleanDisplayText);
                        const relationPromise = runRelationCheck(lastUserMsg, cleanDisplayText);
                        await scenePromise;
                        await runVisualDirectorCheck(lastUserMsg, cleanDisplayText);
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

/* 建议栏样式 */
.suggestion-bar {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 15rpx;
    padding: 15rpx 20rpx;
    background-color: #f0f3f5;
    border-top: 1px solid #e1e1e1;
    white-space: nowrap;
}
.suggestion-chip {
    background-color: #fff;
    color: #333;
    padding: 10rpx 24rpx;
    border-radius: 30rpx;
    font-size: 26rpx;
    border: 1px solid #ddd;
    box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05);
    flex-shrink: 0;
}
.suggestion-chip:active {
    background-color: #e3f2fd;
    color: #007aff;
    border-color: #007aff;
}
.close-suggestion {
    padding: 10rpx 20rpx;
    color: #999;
    font-size: 30rpx;
    display: flex; align-items: center;
}

.info-row { 
    display: flex; 
    justify-content: space-between; 
    align-items: stretch; /* 让高度拉伸对齐 */
    margin-top: 10rpx;
}

.location-box { 
    flex: 1; 
    display: flex; 
    align-items: center; 
    padding: 8rpx 20rpx; 
    border-radius: 16rpx; 
    margin-right: 20rpx;
    transition: all 0.3s; 
}

.phone-mode { background-color: #f0f3f5; color: #555; border: 1px solid #e1e4e8; }
.face-mode { background-color: #e3f2fd; color: #007aff; border: 1px solid #bbdefb; }

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

.time-box { 
    display: flex; 
    align-items: center; 
    font-size: 24rpx; 
    color: #555; 
    background-color: #f8f8f8; 
    padding: 0 20rpx; /* 调整内边距 */
    border-radius: 16rpx; 
    border: 1px solid #eee;
}
</style>