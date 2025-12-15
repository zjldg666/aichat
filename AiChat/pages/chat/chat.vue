<template>
  <view class="chat-container">
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
    
    // 引入 Prompt 模块
    import { 
        CORE_INSTRUCTION, 
        PERSONALITY_TEMPLATE, 
        AFFECTION_LOGIC, 
        NSFW_STYLE 
    } from '@/utils/prompts.js';
    
    // 引入常量
    import { 
        STYLE_PROMPT_MAP, 
        NEGATIVE_PROMPTS, 
        COMFY_WORKFLOW_TEMPLATE 
    } from '@/utils/constants.js';

    // ==================================================================================
    // 状态管理
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
    
    const showTimePanel = ref(false); 
    const showTimeSettingPanel = ref(false); 
    const customMinutes = ref('');
    const currentSummary = ref('');
    const enableSummary = ref(false);
    const summaryFrequency = ref(20);
    const charHistoryLimit = ref(20);
    
    const tempDateStr = ref('');
    const tempTimeStr = ref('');
    
    const suggestionList = ref([]); // 【新增】建议列表
    
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

    // =========================================================================
    // 【新增】智能回复建议功能
    // =========================================================================
    const applySuggestion = (text) => {
        inputText.value = text;
        suggestionList.value = []; 
    };

    // ↓↓↓↓↓↓↓↓↓ 复制此代码，替换原有的 getReplySuggestions 函数 ↓↓↓↓↓↓↓↓↓
    
        const getReplySuggestions = async () => {
                if (isLoading.value) return;
                
                const config = getCurrentLlmConfig();
                if (!config || !config.apiKey) {
                    uni.showToast({ title: '请先配置API', icon: 'none' });
                    return;
                }
        
                uni.showLoading({ title: '军师正在分析局势...', mask: true });
        
                // 【关键修改 1】上下文获取逻辑：不再无脑过滤 System 消息
                // 必须让军师看到 "【系统】一夜过去了..." 这种提示，它才知道时间变了
                const recentContext = messageList.value
                    .slice(-10) // 取最近 10 条
                    .filter(m => m.type !== 'image' && (!m.isSystem || m.content.includes('系统') || m.content.includes('过去了'))) 
                    .map(m => {
                        if (m.isSystem) return `[System Event]: ${m.content}`; // 标记系统事件
                        return `${m.role === 'user' ? 'Me' : 'Her'}: ${m.content}`;
                    })
                    .join('\n');
        
                // 2. 准备基础数据
                const score = currentAffection.value;
                const role = currentRole.value || {};
                const s = role.settings || {};
                
                const herJob = role.occupation || s.occupation || "Unknown";
                const myJob = s.userOccupation || "Unknown";
                const myName = userName.value || 'Me';
        
                // 【关键修改 2】Prompt 注入当前时间和状态
                // 明确告诉 AI 现在几点了，在哪里
                const coachPrompt = `
                [System: Text Completion]
                You are a dating assistant.
                
                **Current Status**:
                - Time: ${formattedTime.value}  (CRITICAL: Notice the time change!)
                - Mode: ${interactionMode.value === 'phone' ? 'Phone Chat' : 'Face-to-Face'} @ ${currentLocation.value}
                
                **Profiles**:
                - HER: ${chatName.value} (${herJob}).
                - ME: ${myName} (${myJob}).
                - Relation: Affection ${score}/100.
                
                **Context (Recent 10 messages)**:
                ${recentContext}
                
                **Task**:
                Provide 3 short, natural, Simplified Chinese responses for "Me" to continue the conversation.
                If [System Event] indicates time passed (e.g., Morning arrived), say "Good morning".
                
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
			
    const performBackgroundSummary = async () => {
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) return;
            
            // 1. 准备数据
            const limit = summaryFrequency.value;
            const recentChats = messageList.value
                .filter(m => !m.isSystem && m.type !== 'image')
                .slice(-limit); // 取最近 N 条
                
            if (recentChats.length < 5) return; // 条数太少不总结
    
            const chatContent = recentChats.map(m => `${m.role === 'user' ? userName.value : chatName.value}: ${m.content}`).join('\n');
            
            // 2. 构建“事实提取” Prompt
            const summaryPrompt = `
            [System: Memory Consolidation]
            Task: Update the long-term memory for user "${userName.value}".
            
            【Old Memory】:
            ${currentSummary.value || "None"}
            
            【Recent Conversation】:
            ${chatContent}
            
            【Instructions】:
            Merge Old Memory and Recent Conversation into a concise **Fact Sheet**.
            Discard trivial chitchat (hello, bye). Keep CRITICAL details:
            1. **User Facts**: Name, job, hobbies, likes/dislikes revealed.
            2. **Key Events**: What happened? (e.g. "Confessed love", "Had a fight").
            3. **Promises/Plans**: Any upcoming dates or tasks? (e.g. "Meeting at 8pm").
            4. **Relationship Status**: Current vibe (e.g. "Secretly dating", "Cold war").
            
            【Output Format】:
            Directly output the summarized text in Simplified Chinese (100 words max).
            Example: "用户喜欢吃辣。两人约定周六去游乐园。目前关系暧昧，但用户惹她生气了。"
            `;
            
            console.log('🧠 [Memory] Summarizing background...');
            
            let baseUrl = config.baseUrl || '';
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            
            try {
                let newSummary = '';
                // Gemini
                if (config.provider === 'gemini') {
                    const cleanBase = 'https://generativelanguage.googleapis.com';
                    const res = await uni.request({
                        url: `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
                        method: 'POST', 
                        data: { contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }] }, 
                        sslVerify: false
                    });
                    if (res.statusCode === 200) newSummary = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                } 
                // OpenAI Compatible
                else {
                    const res = await uni.request({
                        url: `${baseUrl}/chat/completions`,
                        method: 'POST',
                        header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                        data: { 
                            model: config.model, 
                            messages: [{ role: "user", content: summaryPrompt }], 
                            max_tokens: 300 
                        }, 
                        sslVerify: false
                    });
                    let data = res.data;
                    if (typeof data === 'string') try { data = JSON.parse(data); } catch(e){}
                    if (res.statusCode === 200) newSummary = data?.choices?.[0]?.message?.content;
                }
                
                if (newSummary) {
                    const cleanSummary = newSummary.trim();
                    console.log('💾 [Memory] Updated:', cleanSummary);
                    // 保存摘要，不改变其他状态
                    saveCharacterState(undefined, undefined, cleanSummary);
                }
            } catch (e) { 
                console.error('Memory summary failed:', e); 
            }
        };

const getTimeTags = () => {
        const date = new Date(currentTime.value);
        const hour = date.getHours();
        // 已移除 warm lighting, cinematic lighting 等光影词，仅保留时间
        if (hour >= 5 && hour < 7) return "early morning";
        if (hour >= 7 && hour < 16) return "daytime";
        if (hour >= 16 && hour < 19) return "sunset";
        if (hour >= 19 || hour < 5) return "night";
        return "daytime";
    };
    
    // pages/chat/chat.vue
    
        // pages/chat/chat.vue
        
        const optimizePromptForComfyUI = async (actionAndSceneDescription) => {
            // 1. 获取 AI 的描述 (这是最宝贵的)
            let aiTags = actionAndSceneDescription;
            
            // 2. 获取系统保底数据
            const settings = currentRole.value?.settings || {};
            const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl";
            const storedClothes = currentClothing.value || "";
            
            // =========================================================
            // 🔍 智能分析 AI 的意图
            // =========================================================
            
            // A. 构图判断：完全信任 AI 的标签
            // 如果 AI 说了 1boy/couple，那就是双人；如果没说，系统再根据模式判断一下作为保底
            let isDuo = /\b(couple|2people|1boy|multiple boys)\b/i.test(aiTags);
            
            // 只有在 AI 没明确说构图，且系统处于非电话模式时，才允许系统补救
            if (!isDuo && interactionMode.value !== 'phone') {
                // 只有这种模棱两可的情况，才允许正则去猜
                isDuo = /\b(sex|fuck|penis)\b/i.test(aiTags); 
            }
            
            // B. 衣服判断：AI 是否已经描述了衣服？
            // 如果 AI 的描述里包含了当前衣服的关键词（比如 sweater），系统就别重复加了
            const aiDescribedClothes = storedClothes.split(/[\s,]+/).some(word => 
                word.length > 3 && aiTags.toLowerCase().includes(word.toLowerCase())
            );
            
            // 裸体或换装检测
            const isNaked = /\b(nude|naked|no clothes)\b/i.test(aiTags);
            const isChanging = /\b(wearing|dressed in)\b/i.test(aiTags);
        
            // =========================================================
            // 🛠️ 组装 Prompt (AI 优先)
            // =========================================================
            
            let parts = [];
            
            // 1. 构图 (Solo/Duo)
            parts.push(isDuo ? "couple, 2people" : "solo");
            parts.push("masterpiece, best quality, anime style"); // 基础画质
            
            // 2. 角色长相 (这个还是建议加系统保底，防止 AI 忘了画红眼睛)
            parts.push(appearanceSafe);
            
            // 3. 衣服 (最关键的修改：AI 说过了，系统就闭嘴)
            if (isNaked || isChanging || aiDescribedClothes) {
                console.log("👗 采用 AI 描述的服装/状态");
            } else {
                console.log("👗 AI 未提及衣服，使用系统保底");
                parts.push(storedClothes);
            }
            
            // 4. AI 的描述 (核心)
            parts.push(aiTags);
            
            // 5. 男主 (只在双人时加)
            if (isDuo) parts.push(userAppearance.value || "1boy");
            
            // 6. 环境光影
            parts.push(getTimeTags());
        
            // =========================================================
            // 🧹 清洗与去重 (最后一道防线)
            // =========================================================
            let rawPrompt = parts.join(', ');
            
            // 分割 -> 去空格 -> Set去重 -> 过滤空项
            let uniqueTags = [...new Set(
                rawPrompt.split(/[,，]/)
                .map(t => t.replace(/[^\x00-\x7F]+/g, '').trim()) // 过滤非英文
                .filter(t => t)
            )];
            
            let finalPrompt = uniqueTags.join(', ');
            console.log('🚀 [ComfyUI] Final Prompt:', finalPrompt);
            
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
    
    const getActiveExample = (score, s) => {
        if (score <= 40) return s.exampleNormal || s.example || "语气生硬。";
        if (score <= 80) return s.exampleFlirt || s.example || "语气柔和。";
        return s.exampleSex || s.example || "语气亲密。";
    };


            // =========================================================================
                        // 发送消息核心 (Token监控 + 世界观 + 5阶段人设 + 身份注入)
                        // =========================================================================
                        const sendMessage = async (isContinue = false, systemOverride = '') => {
                            // 1. 基础校验
                            if (!isContinue && !inputText.value.trim() && !systemOverride) return;
                            if (isLoading.value) return;
                            
                            const config = getCurrentLlmConfig();
                            if (!config || !config.apiKey) {
                                uni.showToast({ title: '请配置模型', icon: 'none' });
                                return;
                            }
                            
                            // 2. 消息上屏
                            if (!isContinue) {
                                if (inputText.value.trim()) {
                                     // console.log('🗣️ [Chat] User sent:', inputText.value); // 旧日志，已合并到下方
                                     messageList.value.push({ role: 'user', content: inputText.value });
                                     inputText.value = '';
                                } else if (systemOverride && systemOverride.includes('SHUTTER')) {
                                     messageList.value.push({ role: 'system', content: '📷 (你举起手机拍了一张)', isSystem: true });
                                }
                            }
                            scrollToBottom();
                            isLoading.value = true;
                            saveHistory();
                            
                            // 3. 准备数据
                            const score = currentAffection.value;
                            const lust = currentLust.value;
                            const role = currentRole.value || {};
                            const s = role.settings || {};
                            
                            // 3.1 获取玩家档案 (补全 User Profile)
                            const appUser = uni.getStorageSync('app_user_info') || {};
                            const myJob = s.userOccupation || appUser.occupation || "未知职业";
                            const myLoc = s.userLocation || appUser.location || "未知地点";
                            const myLook = s.userAppearance || appUser.appearance || "普通外貌";
                            const myName = userName.value || appUser.name || 'User';
                        
                            // 3.2 获取角色档案 (补全 Char Profile)
                            const charJob = role.occupation || s.occupation || "未知职业";
                            const charLoc = role.location || s.location || "未知地点";
                            const charPersonality = s.personality || "未知性格";
                            
                            // 3.3 计算当前性格阶段 (5阶段升级版)
                            let personalityLabel = "";
                            let activePersonality = "";
                            let activeExample = "";
                            
                            // 0-20, 21-40, 41-60, 61-80, 81+
                            if (score <= 20) {
                                personalityLabel = "阶段1: 陌生/警惕 (Stranger)";
                                activePersonality = s.personalityNormal || "高冷，保持距离。";
                                activeExample = s.exampleNormal || "";
                            } else if (score <= 40) {
                                personalityLabel = "阶段2: 熟人/朋友 (Friend)";
                                // 如果没填 stage2，回退到 stage1
                                activePersonality = s.personalityFriend || s.personalityNormal || "友善，放松，像普通朋友一样聊天。";
                                activeExample = s.exampleFriend || s.exampleNormal || "";
                            } else if (score <= 60) {
                                personalityLabel = "阶段3: 暧昧/心动 (Crush)";
                                activePersonality = s.personalityFlirt || "害羞，试探，言语间带有暗示。";
                                activeExample = s.exampleFlirt || "";
                            } else if (score <= 80) {
                                personalityLabel = "阶段4: 热恋/深爱 (Lover)";
                                // 如果没填 stage4，回退到 stage3
                                activePersonality = s.personalityLover || s.personalityFlirt || "亲密无间，直球表达爱意，粘人。";
                                activeExample = s.exampleLover || s.exampleFlirt || "";
                            } else {
                                personalityLabel = "阶段5: 灵魂伴侣/痴迷 (Soulmate)";
                                activePersonality = s.personalitySex || "完全依恋，身心交付，无条件配合。";
                                activeExample = s.exampleSex || "";
                            }
                        
                            activePersonality = `[当前阶段: ${personalityLabel}]\n行为逻辑: ${activePersonality}`;
                        
                            // 3.4 欲望与特殊规则 (增强版)
                            let activeRules = "";
                            // 注入 XP 和雷点，让 AI 知道什么能加 Lust
                            activeRules += `- 你的XP/兴奋点是: "${s.likes || "未知"}" (击中大幅增加 Lust)。\n`;
                            activeRules += `- 你的雷点/厌恶点是: "${s.dislikes || "未知"}" (踩雷大幅扣减 Affection)。\n`;
                        
                            if (lust > 80 && score < 60) {
                                activeRules += `**【特殊状态：Lust Paradox (身心博弈)】**\n虽然好感度不高(${score})，但欲望极高(${lust})。面对玩家，必须表现出“理智上想拒绝/辱骂，但身体本能地迎合/发情”的极致反差感。`;
                            } else if (lust < 30) {
                                activeRules += `当前欲望较低(${lust})。面对调情会感到害羞、迟钝或不知所措，需要更多前戏或氛围铺垫才能提升 Lust。`;
                            } else {
                                activeRules += `根据人设 (${charPersonality}) 反应：纯情感交流优先加 Affection；肢体接触/色气话题优先加 Lust。`;
                            }
                        
                            let nsfwInstruction = "";
                            const isIntimate = lust > 60 || score > 80 || currentActivity.value.match(/性|爱|床|吻|摸/);
                            if (isIntimate) nsfwInstruction = NSFW_STYLE; 
                            
                            const hiddenInstruction = `\n[System: Current status is '${currentActivity.value}'. Location: '${currentLocation.value}'. Mode: '${interactionMode.value}'. If activity changes, append [ACT: new status].]`;
                            
                            // 4. 构建 Prompt
                            let prompt = CORE_INSTRUCTION + 
                                         PERSONALITY_TEMPLATE + 
                                         AFFECTION_LOGIC + 
                                         nsfwInstruction + 
                                         hiddenInstruction;
                            
                            const nsfwData = s.appearanceNsfw || "pink nipples, pussy";
                            const worldLoreData = s.worldLore || "现代都市背景，无特殊超能力，遵循现实物理法则。";
                        
                            prompt = prompt
                                // --- 世界观与基础 ---
                                .replace(/{{world_lore}}/g, worldLoreData) 
                                .replace(/{{current_time}}/g, formattedTime.value)
                                .replace(/{{current_location}}/g, currentLocation.value)
                                .replace(/{{current_activity}}/g, currentActivity.value)
                                .replace(/{{current_clothes}}/g, currentClothing.value)
                                .replace(/{{interaction_mode}}/g, interactionMode.value === 'phone' ? 'Phone (手机通讯)' : 'Face (面对面)')
                                
                                // --- 角色信息 ---
                                .replace(/{{char}}/g, chatName.value)
                                .replace(/{{occupation}}/g, charJob)
                                .replace(/{{char_location}}/g, charLoc)
                                .replace(/{{appearance_nsfw}}/g, nsfwData)
                                .replace(/{{appearance}}/g, s.appearance || "anime character")
                                .replace(/{{memory}}/g, s.bio || "无")
                                // 【新增字段注入】
                                .replace(/{{speaking_style}}/g, s.speakingStyle || "正常说话")
                                .replace(/{{likes}}/g, s.likes || "未知")
                                .replace(/{{dislikes}}/g, s.dislikes || "未知")
                                
                                // --- 玩家信息 ---
                                .replace(/{{user}}/g, myName)
                                .replace(/{{user_occupation}}/g, myJob)
                                .replace(/{{user_location}}/g, myLoc)
                                .replace(/{{user_appearance}}/g, myLook)
                                
                                // --- 性格与逻辑 ---
                                .replace(/{{personality_label}}/g, personalityLabel)
                                .replace(/{{personality_logic}}/g, activePersonality) 
                                .replace(/{{example}}/g, activeExample)
                                .replace(/{{current_affection}}/g, currentAffection.value)
                                .replace(/{{current_lust}}/g, currentLust.value)
                                .replace(/{{affection_rules}}/g, activeRules); 
                        
                            // 5. 截取历史记录
                            const historyLimit = charHistoryLimit.value; 
                            let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
                            if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
                            
                            // =========================================================================
                            // 📝 【新增】 完整对话日志打印 (Debug Log) - 看这里排查问题！
                            // =========================================================================
                            console.log('============== 📜 DIALOGUE DEBUG LOG ==============');
                            console.log('1. 🎭 User Profile:', { name: myName, job: myJob, loc: myLoc });
                            console.log('2. 💃 Char Profile:', { name: chatName.value, job: charJob, loc: charLoc, status: personalityLabel });
                            console.log('3. 💬 Recent Context (Sent to AI):', contextMessages.map(m => `[${m.role}]: ${m.content}`).join('\n'));
                            
                            console.log('5. 📥 Current Input:', isContinue ? '[Auto-Drive/Continue]' : (inputText.value || systemOverride));
                            console.log('===================================================');
                        
                            // 6. 自动驾驶指令
                            const continuePrompt = `
                            [System Command: AUTO-DRIVE MODE]
                            **Situation**: The user is silent/waiting. You need to drive the conversation forward.
                            **Decision Logic**:
                            1. **IF your last message was incomplete**: Finish it.
                            2. **IF complete**: Start a new topic or action based on current mood (Affection: ${currentAffection.value}).
                            **Output Requirement**: 
                            You MUST start with [Thought: ...], then output the content.
                            `;
                            
                            // 7. 发起网络请求
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
                                else if (isContinue) geminiContents.push({ role: 'user', parts: [{ text: continuePrompt }] });
                                
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
                                
                                const openAIMessages = [{ role: "system", content: prompt }];
                                
                                contextMessages.forEach(item => {
                                    const cleanText = item.role === 'model' ? cleanMessageForAI(item.content) : item.content;
                                    if (cleanText.trim()) openAIMessages.push({ role: item.role === 'model' ? 'assistant' : 'user', content: cleanText });
                                });
                                
                                if (systemOverride) openAIMessages.push({ role: 'user', content: systemOverride });
                                else if (isContinue) openAIMessages.push({ role: 'user', content: continuePrompt });
                                
                                openAIMessages.push({
                                    role: 'user',
                                    content: `[SYSTEM ENFORCEMENT] Stop. Before you reply, you MUST execute the [Thought] protocol.
                                Step 1: Write [Thought: (状态: 好感 ${score} | 欲望 ${lust}) ... analysis ...].
                                Step 2: Write your response.
                                If you skip Step 1, the system will error.`
                                });
                                
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
                                    let tokenLog = "";
                        
                                    if (config.provider === 'gemini') {
                                        rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                                        const usage = res.data?.usageMetadata;
                                        if (usage) tokenLog = `📊 [Token Usage] Input: ${usage.promptTokenCount} | Output: ${usage.candidatesTokenCount} | Total: ${usage.totalTokenCount}`;
                                    } else {
                                        let data = res.data;
                                        if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e){} }
                                        rawText = data?.choices?.[0]?.message?.content || "";
                                        const usage = data?.usage;
                                        if (usage) tokenLog = `📊 [Token Usage] Input: ${usage.prompt_tokens} | Output: ${usage.completion_tokens} | Total: ${usage.total_tokens}`;
                                    }
                        
                                    // 【新增】打印 AI 返回的原始数据，方便看是否包含了指令
                                    console.log('============== 📥 RAW RESPONSE ==============');
                                    console.log(rawText);
                                    console.log('=============================================');
                        
                                    if (tokenLog) console.log(tokenLog);
                        
                                    if (rawText) {
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
    
    // ↓↓↓↓↓↓↓↓↓ 复制此代码，替换原有的 processAIResponse 函数 ↓↓↓↓↓↓↓↓↓
    
        const processAIResponse = (rawText) => {
                let displayText = rawText.trim();
        
                // =================================================================
                // 🧠 1. 思维链处理 (智能嵌套解析版)
                // =================================================================
                // 解决 [Thought: [状态:...] ...] 嵌套括号导致正则截断的问题
                const thoughtStart = displayText.indexOf('[Thought');
                
                if (thoughtStart !== -1) {
                    let bracketCount = 0;
                    let thoughtEnd = -1;
                    
                    // 从 [Thought 开始遍历，寻找对应的闭合 ]
                    for (let i = thoughtStart; i < displayText.length; i++) {
                        if (displayText[i] === '[') bracketCount++;
                        else if (displayText[i] === ']') bracketCount--;
                        
                        // 当计数器归零时，说明找到了最外层的闭合括号
                        if (bracketCount === 0) {
                            thoughtEnd = i;
                            break;
                        }
                    }
                    
                    if (thoughtEnd !== -1) {
                        // 提取完整的思维链
                        const fullThought = displayText.substring(thoughtStart, thoughtEnd + 1);
                        // 提取内容用于日志 (去掉 [Thought: 和最后的 ])
                        const logContent = fullThought.replace(/^\[Thought:?/, '').slice(0, -1).trim();
                        
                        console.log(`🧠 [AI心声]: ${logContent}`);
                        
                        // 从正文中彻底移除思维链
                        displayText = displayText.replace(fullThought, '').trim();
                    }
                }
        
                // =================================================================
                // 🚨 2. 指令清洗
                // =================================================================
                
                // 修复 AI 自创的 LINTYAHOT_IMG
                displayText = displayText.replace(/LINTYAHOT_IMG/gi, 'IMG');
                
                // 修复圆括号包裹指令
                displayText = displayText.replace(/\((IMG|CLOTHES|LOC|ACT|AFF|LUST|MODE|MOOD):\s*(.*?)\)/gi, '[$1:$2]');
        
                // 修复半括号
                displayText = displayText.replace(/\(IMG:/gi, '[IMG:');
                displayText = displayText.replace(/\(CLOTHES:/gi, '[CLOTHES:');
        
                // 修复中文括号
                displayText = displayText.replace(/【/g, '[').replace(/】/g, ']');
                
                // 去除残留逻辑标记
                displayText = displayText.replace(/\[Logic[\s\S]*?\]/gi, '').trim();
        
                // =================================================================
                // 📥 3. 状态提取
                // =================================================================
        
                let systemMsgs = [];
        
                // [AFF] 好感度
                const affRegex = /\[AFF:?\s*([+-]?\d+)\]/gi;
                let match;
                while ((match = affRegex.exec(displayText)) !== null) {
                    let change = parseInt(match[1], 10);
                    if (!isNaN(change)) {
                        if (change > 5) change = 5; 
                        console.log(`❤️ [Status] Affection change: ${change}`);
                        saveCharacterState(currentAffection.value + change);
                        if (change !== 0) uni.showToast({ title: `好感 ${change > 0 ? '+' : ''}${change}`, icon: 'none' });
                    }
                }
                displayText = displayText.replace(affRegex, '');
        
                // [LUST] 欲望值
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
        
                // [MOOD] 情绪
                const moodRegex = /\[MOOD:?\s*(.*?)\]/i;
                const moodMatch = displayText.match(moodRegex);
                if (moodMatch) {
                    const newMood = moodMatch[1].trim();
                    console.log(`😊 [Status] Mood update: ${newMood}`);
                    // systemMsgs.push(`心情：${newMood}`); 
                    displayText = displayText.replace(moodRegex, '');
                }
        
                // [MODE] 交互模式
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
        
                // [LOC] 地点
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
                
                // [CLOTHES] 换装
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
                
                // [ACT] 活动
                const actRegex = /\[ACT:?\s*(.*?)\]/i;
                const actMatch = displayText.match(actRegex);
                if (actMatch) {
                    const newAct = actMatch[1].trim();
                    console.log(`🎬 [Status] Activity update: ${newAct}`);
                    currentActivity.value = newAct; 
                    saveCharacterState(); 
                    displayText = displayText.replace(actRegex, '');
                }
        
                // [IMG] 生图
                const imgRegex = /\[IMG:(.*?)\]/i;
                const imgMatch = displayText.match(imgRegex);
                let pendingImagePlaceholder = null;
                
                if (imgMatch) {
                    const imgDesc = imgMatch[1].trim();
                    console.log(`🖼️ [Status] Image trigger detected: ${imgDesc}`);
                    displayText = displayText.replace(imgRegex, '');
                    
                    const placeholderId = `img-loading-${Date.now()}`;
                    pendingImagePlaceholder = { 
                        role: 'system', 
                        content: '📷 影像显影中... (请稍候)', 
                        isSystem: true, 
                        id: placeholderId 
                    };
                    
                    handleAsyncImageGeneration(imgDesc, placeholderId);
                }
        
                // =================================================================
                // 💬 4. 文本上屏 (包含 ||| 分隔处理)
                // =================================================================
        
                // 清理残留标签
                displayText = displayText.replace(/\[(System|Logic).*?\]/gis, '').trim();
                displayText = displayText.replace(/^\[.*?\]\s*/, '');
                displayText = displayText.replace(/^.*?：\s*/, '');
                
                systemMsgs.forEach(txt => { 
                    messageList.value.push({ role: 'system', content: txt, isSystem: true }); 
                });
                
                if (displayText) {
                    // 兼容性处理：如果AI没有使用 |||，尝试用换行符分割
                    // 但如果使用了 |||，则主要依靠 |||
                    
                    // 1. 先把换行符转为 ||| (兼容没有遵守规则的情况)
                    let tempText = displayText.replace(/(\r\n|\n|\r)+/g, '|||');
                    
                    // 2. 强制在引号和括号间加 ||| (这是你原版逻辑的精华，防止气泡过长)
                    tempText = tempText.replace(/([”"])\s*([（(])/g, '$1|||$2');
                    tempText = tempText.replace(/([)）])\s*([（(])/g, '$1|||$2');
                    
                    const parts = tempText.split('|||');
                    parts.forEach(part => {
                        let cleanPart = part.trim();
                        const isJunk = /^[\s\.,;!?:'"()[\]``{}<>\\\/|@#$%^&*_\-+=，。、！？；：“”‘’（）《》…—~]+$/.test(cleanPart) || 
                                       /^["“”'‘’]+$/.test(cleanPart) || 
                                       cleanPart === '...' || 
                                       cleanPart.length === 0;
                                       
                        if (!isJunk) {
                            messageList.value.push({ role: 'model', content: cleanPart });
                        }
                    });
                }
                
                if (pendingImagePlaceholder) {
                    messageList.value.push(pendingImagePlaceholder);
                }
                
                saveHistory();
                
                if (enableSummary.value) {
                    const validMsgCount = messageList.value.filter(m => !m.isSystem).length;
                    if (validMsgCount > 0 && validMsgCount % summaryFrequency.value === 0) {
                        performBackgroundSummary();
                    }
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
</style>