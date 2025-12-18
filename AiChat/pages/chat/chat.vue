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

    <view class="footer-area">
        
        <view class="suggestion-bar" v-if="suggestionList.length > 0">
            <view class="suggestion-chip" 
                  v-for="(text, index) in suggestionList" 
                  :key="index"
                  @click="applySuggestion(text)">
                {{ text }}
            </view>
            <view class="close-suggestion" @click="suggestionList = []">×</view>
        </view>

        <view class="tool-bar" v-if="isToolbarOpen">
            <view class="tool-item" hover-class="btn-hover" @click="showTimePanel = true">
                <view class="tool-icon">⏱️</view>
                <text class="tool-text">快进</text>
            </view>

            <view class="tool-item" hover-class="btn-hover" @click="triggerNextStep">
                <view class="tool-icon">▶️</view>
                <text class="tool-text">继续</text>
            </view>

            <view class="tool-item" hover-class="btn-hover" @click="getReplySuggestions">
                <view class="tool-icon">💡</view>
                <text class="tool-text">提示</text>
            </view>
			
			<view class="tool-item" hover-class="btn-hover" @click="showLocationPanel = true">
			                <view class="tool-icon">🚪</view>
			                <text class="tool-text">串门</text>
			</view>
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

        <view class="input-row">
            <view class="toggle-btn" hover-class="btn-hover" @click="toggleToolbar">
                <text class="toggle-icon" :class="{ 'rotated': isToolbarOpen }">➕</text>
            </view>

            <input class="text-input" 
                   v-model="inputText" 
                   confirm-type="send" 
                   @confirm="sendMessage()" 
                   placeholder="与她对话..." 
                   :disabled="isLoading" 
                   :adjust-position="true"
                   cursor-spacing="20" />

            <button class="send-btn" :class="{ 'disabled': isLoading }" @click="sendMessage()">发送</button>
        </view>
        
        <view class="safe-area-bottom"></view>
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
	<view class="time-panel-mask" v-if="showLocationPanel" @click="showLocationPanel = false">
	      <view class="time-panel" @click.stop>
	        <view class="panel-title">前往哪里？</view>
	        
	        <view class="grid-actions">
	          <view 
	            class="grid-btn" 
	            v-for="(loc, index) in locationList" 
	            :key="index"
	            @click="handleMoveTo(loc)"
	            :style="loc.style || ''"
	          >
	             <text>{{ loc.icon }} {{ loc.name }}</text>
	             <span v-if="loc.detail" style="font-size:20rpx; opacity:0.7;">{{ loc.detail }}</span>
	          </view>
	        </view>
	
	        <view class="custom-time">
	          <text>自定义地点：</text>
	          <input class="mini-input" v-model="customLocation" placeholder="输入地点 (如: 图书馆)"/>
	          <view class="mini-btn" @click="handleMoveTo({name: customLocation, type: 'custom'})">出发</view>
	        </view>
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
        SNAPSHOT_TRIGGER_PROMPT, 
        IMAGE_GENERATOR_PROMPT, 
        CAMERA_MAN_PROMPT, 
        PERSONALITY_TEMPLATE, 
        NSFW_STYLE 
    } from '@/utils/prompts.js';
    
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
    
    // 核心状态
    const currentAction = ref('站立/闲逛'); 
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
    const currentRelation = ref('初相识'); 
    
    const lastUpdateGameHour = ref(-1);
    
    // 面板控制
    const showTimePanel = ref(false); 
    const showTimeSettingPanel = ref(false); 
    const showLocationPanel = ref(false); 
    const customMinutes = ref('');
    const customLocation = ref('');
    
    // 记忆与设置
    const currentSummary = ref('');
    const enableSummary = ref(false);
    const summaryFrequency = ref(20);
    const charHistoryLimit = ref(20);
    
    const tempDateStr = ref('');
    const tempTimeStr = ref('');
    
    const suggestionList = ref([]); 
    const isToolbarOpen = ref(false); 
    const worldLocations = ref([]); 
    
    const toggleToolbar = () => {
        isToolbarOpen.value = !isToolbarOpen.value;
    };
    
    const lastImageGenerationTime = ref(0); 
    const IMAGE_COOLDOWN_MS = 15000; 

    const TIME_SPEED_RATIO = 6; 
    let timeInterval = null;

    // ==================================================================================
    // 2. 计算属性
    // ==================================================================================
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

    const isCohabitation = () => {
        const u = (userHome.value || '').trim();
        const c = (charHome.value || '').trim();
        if (!u || !c || u === '未知地址' || c === '未知地址' || u === '角色家' || u === '玩家家') {
            return false;
        }
        return u === c || u.includes(c) || c.includes(u);
    };

    const locationList = computed(() => {
        const list = [];
        const isTogether = isCohabitation();
        
        // 1. 家的处理
        if (isTogether) {
            list.push({
                name: '我们的家',
                detail: charHome.value,
                type: 'shared_home',
                icon: '🏡',
                mode: 'face', 
                style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
            });
        } else {
            list.push({
                name: '她的家',
                detail: charHome.value || '角色家',
                type: 'char_home',
                icon: '🏠',
                mode: 'face', 
                style: 'background-color:#fff0f5; color:#d81b60; border:1px solid #ffcdd2;'
            });
            list.push({
                name: '我的家',
                detail: userHome.value || '我家',
                type: 'user_home',
                icon: '🏡',
                mode: 'phone',
                style: 'background-color:#e3f2fd; color:#1565c0; border:1px solid #bbdefb;'
            });
        }

        // 2. 通用地点
        worldLocations.value.forEach(item => {
            const name = typeof item === 'string' ? item : item.name;
            const icon = item.icon || '📍';
            list.push({
                name: name,
                type: 'common',
                icon: icon,
                mode: 'phone', // 默认去外面是 Phone
                style: 'background-color:#f5f5f5; color:#333; border:1px solid #eee;' 
            });
        });

        return list;
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
        const appUser = uni.getStorageSync('app_user_info');
        if (appUser) {
            if (appUser.name) userName.value = appUser.name;
            if (appUser.avatar) userAvatar.value = appUser.avatar;
        }

        const cachedLocs = uni.getStorageSync('app_world_locations');
        if (cachedLocs && Array.isArray(cachedLocs) && cachedLocs.length > 0) {
            worldLocations.value = cachedLocs;
        } else {
            worldLocations.value = [
                { name: '学校', icon: '🏫' },
                { name: '公司', icon: '🏢' },
                { name: '酒店', icon: '🏩' },
                { name: '公园', icon: '🌳' },
                { name: '商场', icon: '🛍️' }
            ];
        }

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

    // ==================================================================================
    // 4. 辅助函数
    // ==================================================================================
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

	// 🕒 同样的辅助函数：兜底用
	    const getInitialGameTime = () => {
	        const now = new Date();
	        now.setHours(8, 0, 0, 0); 
	        return now.getTime();
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
            
            currentTime.value = target.lastTimeTimestamp || getInitialGameTime();
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

    // ==================================================================================
    // 5. 核心：地点与工作状态检测逻辑
    // ==================================================================================
    
    // 🔍 检查角色是否正在工作
    const checkIsWorking = () => {
        const s = currentRole.value?.settings || {};
        
        // 1. 如果没有工作地点，视为“家庭主妇/自由职业”，全天在家
        if (!s.workplace || s.workplace.trim() === '') return false;
        
        // 2. 如果没有勾选任何工作日，也视为全天在家
        const workDays = s.workDays || []; // [1,2,3,4,5]
        if (workDays.length === 0) return false;
        
        // 3. 时间判断
        const date = new Date(currentTime.value);
        const day = date.getDay(); // 0-6 (0是周日)
        const hour = date.getHours(); // 0-23
        
        const start = s.workStartHour !== undefined ? s.workStartHour : 9;
        const end = s.workEndHour !== undefined ? s.workEndHour : 18;
        
        // 必须是工作日，且在工作时间内
        if (workDays.includes(day) && hour >= start && hour < end) {
            return true; // 正在上班！
        }
        
        return false; // 下班了/休息日
    };

    // 🚪 串门/移动处理函数
    const handleMoveTo = (locObj) => {
        if (isLoading.value) {
            uni.showToast({ title: '对话进行中...', icon: 'none' });
            return;
        }
        
        if (locObj.type === 'custom' && !locObj.name) {
            return uni.showToast({ title: '请输入地点', icon: 'none' });
        }

        let targetName = locObj.name;
        if (locObj.detail) targetName = locObj.detail;
        
        // --- 核心变量初始化 ---
        let newMode = 'phone'; 
        let shouldNotifyAI = false; 
        let sysMsgUser = "";   
        let promptAction = ""; 
        
        const isTogether = isCohabitation(); 
        const isWorking = checkIsWorking(); // 🔥 此时此刻她是否在上班？
        const s = currentRole.value?.settings || {};
        const workplaceName = s.workplace || "单位";

        // =========================================================
        // 🚦 逻辑分支
        // =========================================================

        // --- A. 如果我们同居 (Shared Home) ---
        if (isTogether) {
            if (locObj.type === 'shared_home') {
                // 回家
                if (isWorking) {
                    // 我回家了，但她在上班 -> 扑空 -> Phone
                    newMode = 'phone';
                    shouldNotifyAI = true;
                    sysMsgUser = `你回到了家，但她正在【${workplaceName}】上班，家里空荡荡的。`;
                    promptAction = `Player returned to the shared home, but you are currently at work (${workplaceName}). Player is alone at home. Describe being at work and receiving a text/call.`;
                } else {
                    // 我回家了，她也在家 -> 见面
                    newMode = 'face';
                    shouldNotifyAI = true;
                    sysMsgUser = `你回到了家（${targetName}）。`;
                    promptAction = `Player returned to the shared home. You are off work and at home. Describe the greeting.`;
                }
            } else {
                // 去其他地方 -> 出门离开她 -> Phone
                newMode = 'phone';
                shouldNotifyAI = true;
                sysMsgUser = `你离开了家，前往${targetName}。`;
                promptAction = `Player left home and went to <${targetName}>. Mode switched to PHONE. Describe the parting/texting.`;
            }
        } 
        
        // --- B. 如果分居 (Separate Homes) ---
        else {
            if (locObj.type === 'char_home') {
                // 去她家
                if (isWorking) {
                    // 她在上班 -> 扑空 -> Phone
                    newMode = 'phone';
                    shouldNotifyAI = true;
                    sysMsgUser = `你来到她家门口，但没人在家。她应该在【${workplaceName}】上班。`;
                    promptAction = `Player visited your home, but you are at work (${workplaceName}). You are NOT there. Switch to PHONE mode. Describe getting a notification that player visited your empty house.`;
                } else {
                    // 她在家 -> 拜访 -> Face
                    newMode = 'face';
                    shouldNotifyAI = true;
                    sysMsgUser = `你来到了${targetName}（拜访）。`;
                    promptAction = `Player arrived at your door/house. You are at home. Mode switched to FACE. Describe hearing the knock or opening the door.`;
                }
            } 
            else if (locObj.type === 'user_home') {
                // 回我家 -> 辞别 -> Phone
                newMode = 'phone';
                shouldNotifyAI = true;
                sysMsgUser = `你告别了她，回到了自己家。`;
                promptAction = `Player said goodbye and left your place to go home. Mode switched to PHONE. Describe the farewell.`;
            } 
            else {
                // 去公共场所 (学校/公司/自定义)
                // 🔥 探班逻辑：如果我去的地方 恰好是 她的工作地点
                const isVisitingWork = workplaceName && targetName.includes(workplaceName);
                
                if (isVisitingWork && isWorking) {
                    // 探班成功 -> Face
                    newMode = 'face';
                    shouldNotifyAI = true;
                    sysMsgUser = `你来到了【${targetName}】，正好看到她在工作。`;
                    promptAction = `Player visited your workplace (${targetName}) while you are working! Mode switched to FACE. Describe your reaction to seeing the player at your job.`;
                } 
                else if (isVisitingWork && !isWorking) {
                    // 探班扑空 -> Phone
                    newMode = 'phone';
                    shouldNotifyAI = false; // 没见到人，静默切换即可，或者通知也行
                    sysMsgUser = `你来到了【${targetName}】，但她已经下班了。`;
                }
                else {
                    // 纯路人地点 -> 静默切换
                    newMode = 'phone';
                    shouldNotifyAI = false; 
                    sysMsgUser = `已抵达${targetName} (手机通讯)`;
                }
            }
        }

        // =========================================================
        // 💾 执行状态更新
        // =========================================================
        currentLocation.value = targetName;
        interactionMode.value = newMode;
        showLocationPanel.value = false;
        uni.vibrateShort();
        saveCharacterState();

        // =========================================================
        // 🚀 发送指令 (或静默)
        // =========================================================
        if (shouldNotifyAI) {
            messageList.value.push({ 
                role: 'system', 
                content: `🚗 ${sysMsgUser}`, 
                isSystem: true 
            });
            
            const movePrompt = `
            [SYSTEM EVENT: SCENE CHANGE]
            **Action**: ${promptAction}
            **New Location**: ${targetName}
            **New Mode**: ${newMode === 'face' ? 'FACE-TO-FACE' : 'PHONE'}.
            **Time**: ${formattedTime.value}.
            **Instruction**: React naturally to this movement logic.
            `;
            
            sendMessage(false, movePrompt);
        } else {
            uni.showToast({ title: sysMsgUser, icon: 'none', duration: 2500 });
        }
    };

    const applySuggestion = (text) => {
        inputText.value = text;
        suggestionList.value = []; 
    };

    // =========================================================================
    // 6. 智能体逻辑 (Agents & API)
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
            const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl"; 
            
            // console.log("🎨 [Prompt Debug] 1. Loaded Appearance:", appearanceSafe); 
    
            const isPhone = interactionMode.value === 'phone';
            let isDuo = false;
            
            if (isPhone) {
                isDuo = false;
                // console.log("📡 [生图模式] 电话聊天中 -> 强制单人 (Solo)"); 
                aiTags = aiTags.replace(/\b(1boy|boys|man|men|male|couple|2people|multiple|penis|testicles|cum)\b/gi, "");
                aiTags = aiTags.replace(/\bdoggystyle\b/gi, "all fours, kneeling, from behind");
            } else {
                const duoKeywords = /\b(couple|2people|1boy|boys|man|men|male|holding|straddling|sex|fuck|penis|insertion|fellatio|paizuri|kiss|kissing|hug|hugging)\b/i;
                isDuo = duoKeywords.test(aiTags);
                if (isDuo) aiTags = aiTags.replace(/\bsolo\b/gi, ""); 
                // console.log(`📍 [生图模式] -> ${isDuo ? '双人 (Duo)' : '单人 (Solo)'}`);
            }
    
            let parts = [];
            parts.push(isDuo ? "couple, 2people" : "solo");
            parts.push("masterpiece, best quality, anime style, flat color, cel shading, vibrant colors, clean lines, highres");
            
            const imgConfig = uni.getStorageSync('app_image_config') || {};
            const styleSetting = imgConfig.style || 'anime';
            parts.push(STYLE_PROMPT_MAP[styleSetting] || STYLE_PROMPT_MAP['anime']);
            parts.push(appearanceSafe);
    
            if (isDuo) {
                parts.push(userAppearance.value || "1boy, male focus");
            }
            
            if (aiTags) parts.push(`(${aiTags}:1.2)`);
            
            let rawPrompt = parts.join(', ');
            let uniqueTags = [...new Set(rawPrompt.split(/[,，]/).map(t => t.replace(/[^\x00-\x7F]+/g, '').trim()).filter(t => t))];
            const finalPrompt = uniqueTags.join(', ');
    
            // console.log("🚀 [Prompt Debug] 3. Final Prompt (Free Mode):", finalPrompt);
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
            // console.log('⏳ [ComfyUI] Queued ID:', promptId);

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
        // 🌟 修正：更强力的驱动指令，防复读
        const drivePrompt = `[System Command: NARRATIVE_CONTINUATION]
        **Status**: The user is waiting for you to continue the scene.
        **Task**: 
        1. If your last message was incomplete, finish it.
        2. If the scene paused, INITIATE a new action or dialogue based on the current mood.
        3. **FORBIDDEN**: Do NOT repeat your last message. Do NOT ask "What's wrong?". 
        4. **ACTION**: Make the character move, touch, or speak to advance the plot immediately.`;
        
        sendMessage(true, drivePrompt);
    };

    const handleCameraSend = () => {
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

        // console.log('🏠 [Scene Keeper] Checking physical state...');
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;

        const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;

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

            let cleanJson = resultText.replace(/```json|```/g, '').trim();
            const firstOpen = cleanJson.indexOf('{');
            const lastClose = cleanJson.lastIndexOf('}');
            
            if (firstOpen !== -1 && lastClose !== -1) {
                cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
            }

            const state = JSON.parse(cleanJson);
            // console.log('🏠 [Scene Keeper] Verdict:', state);

            let hasChange = false;
            
            if (state.mode && ['phone', 'face'].includes(state.mode) && state.mode !== interactionMode.value) {
                interactionMode.value = state.mode;
                hasChange = true;
                if(state.mode === 'face') uni.vibrateShort();
            }
            if (state.location && state.location.length < 20 && state.location !== currentLocation.value) {
                currentLocation.value = state.location;
                hasChange = true;
            }
            if (state.clothes && state.clothes.length < 50 && state.clothes !== currentClothing.value) {
                currentClothing.value = state.clothes;
                hasChange = true;
            }
            if (state.action && state.action !== currentAction.value) {
                currentAction.value = state.action;
            }

            if (hasChange) saveCharacterState();

        } catch (e) {
            console.warn('Scene check failed:', e); 
        }
    };

    const runCameraManCheck = async (lastUserMsg, aiResponseText) => {
        const now = Date.now();
        if (now - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) {
            return;
        }

        let targetAction = ""; 
        const len = messageList.value.length;
        let aiMsgCount = 0;
        
        for (let i = len - 1; i >= 0; i--) {
            const msg = messageList.value[i];
            if (msg.role === 'model' && (!msg.type || msg.type === 'text')) {
                aiMsgCount++;
                if (aiMsgCount === 2) { 
                    targetAction = msg.content;
                    break;
                }
            }
        }
        if (!targetAction) targetAction = aiResponseText;

        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;

        const prompt = CAMERA_MAN_PROMPT
            .replace('{{current_action}}', currentAction.value || "维持当前动作") 
            .replace('{{ai_response}}', targetAction)
            .replace('{{clothes}}', currentClothing.value || "Casual clothes")
            .replace('{{location}}', currentLocation.value || "Unknown Indoor")
            .replace('{{time}}', formattedTime.value);

        try {
            let targetUrl = '';
            let requestBody = {};
            let header = { 'Content-Type': 'application/json' };
            let baseUrl = config.baseUrl || '';
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

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
            let result = {};
            try {
                result = JSON.parse(cleanJson);
            } catch (jsonErr) {
                console.warn('Camera Man JSON error:', jsonErr);
                return;
            }

            if (result.description && result.description.length > 5) {
                // console.log('📷 [Action] Developing photo:', result.description);
                
                lastImageGenerationTime.value = Date.now();
                const placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
                
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
                requestBody = { model: config.model, messages: [{ role: "user", content: prompt }], max_tokens: 300, temperature: 0.5 }; 
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
            
            // 🟢【保留】心理状态日志 - 方便你查看 AI 心态
            console.log(`❤️ [心态变化] 印象: ${state.relation} | 状态: ${state.activity}`);
    
            let hasChange = false;
            
            if (state.relation && state.relation !== currentRelation.value) {
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

    const runVisualDirectorCheck = async (lastUserMsg, aiResponseText) => {
        // 1. 基础校验
        if (!aiResponseText || aiResponseText.length < 2) return;
        
        // 2. 冷却检查
        const now = Date.now();
        if (now - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) {
            return;
        }

        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;

        // =================================================================
        // 🚀 第一阶段：门卫快速检查 (Gatekeeper)
        // =================================================================
        // console.log('👀 [Gatekeeper] Checking visual intent...');
        
        const gatekeeperPrompt = SNAPSHOT_TRIGGER_PROMPT
            .replace('{{user_msg}}', lastUserMsg)
            .replace('{{ai_msg}}', aiResponseText);

        let shouldGenerate = false;

        try {
            // --- 门卫 API 请求 ---
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
                    max_tokens: 100, 
                    temperature: 0.1 
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

            let cleanJson = resultText.replace(/```json|```/g, '').trim();
            const firstOpen = cleanJson.indexOf('{');
            const lastClose = cleanJson.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) {
                cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
            }

            const gateResult = JSON.parse(cleanJson);
            shouldGenerate = gateResult.result === true;

        } catch (e) {
            console.warn('Gatekeeper check failed:', e);
            return; 
        }

        if (!shouldGenerate) {
            return; 
        }

        // =================================================================
        // ⏳ UI 补位
        // =================================================================
        // console.log('✅ [Gatekeeper] Intent detected! Starting UI placeholder...');
        
        const placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
        
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
        // console.log('🎨 [Director] Composing scene with FULL context...');
        
        const directorPrompt = IMAGE_GENERATOR_PROMPT
            .replace('{{clothes}}', currentClothing.value || "Casual clothes") 
            .replace('{{location}}', currentLocation.value || "Unknown Indoor") 
            .replace('{{time}}', formattedTime.value)
            .replace('{{user_msg}}', lastUserMsg)
            .replace('{{ai_msg}}', aiResponseText);

        try {
            // --- 导演 API 请求 ---
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
                    max_tokens: 300, 
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

            let cleanJson = resultText.replace(/```json|```/g, '').trim();
            const firstOpen = cleanJson.indexOf('{');
            const lastClose = cleanJson.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) {
                cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
            }
            
            const directorResult = JSON.parse(cleanJson);
            // console.log('🎨 [Director] Result:', directorResult);

            if (directorResult.description && directorResult.description.length > 5) {
                // console.log('📸 [Action] Director generated prompt. Starting ComfyUI...');
                
                lastImageGenerationTime.value = Date.now();

                const msgIdx = messageList.value.findIndex(m => m.id === placeholderId);
                if (msgIdx !== -1) {
                    messageList.value[msgIdx].content = '📷 捕捉瞬间... (显影中)';
                    messageList.value = [...messageList.value];
                }
                
                handleAsyncImageGeneration(directorResult.description, placeholderId);
            } else {
                messageList.value = messageList.value.filter(m => m.id !== placeholderId);
            }

        } catch (e) {
            console.warn('Visual Director pipeline failed:', e);
            const msgIdx = messageList.value.findIndex(m => m.id === placeholderId);
            if (msgIdx !== -1) {
                messageList.value[msgIdx].content = '❌ 构图失败 (系统繁忙)';
                messageList.value[msgIdx].isError = true;
                messageList.value[msgIdx].originalPrompt = ""; 
                saveHistory();
            }
        }
    };

    const sendMessage = async (isContinue = false, systemOverride = '') => {
        // 1. 基础校验
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
            else if (systemOverride && (systemOverride.includes('SHUTTER') || systemOverride.includes('SNAPSHOT'))) {
                 messageList.value.push({ role: 'system', content: '📷 (你举起手机拍了一张)', isSystem: true });
            }
        }

        scrollToBottom();
        isLoading.value = true;
        saveHistory();
        
        // 3. 准备 Prompt 数据
        // 🌟 修正：每次发送前强制刷新用户信息
        const appUser = uni.getStorageSync('app_user_info') || {};
        if (appUser.name) userName.value = appUser.name;

        const role = currentRole.value || {};
        const s = role.settings || {};
        
        // 优先使用角色专属昵称，否则用全局昵称
        const myName = s.userNameOverride || userName.value || appUser.name || 'User';
        
        // 构建玩家画像
        let myProfile = `[User Profile]\nName: ${myName}`;
        if (s.userOccupation) myProfile += `\nOccupation: ${s.userOccupation}`;
        if (s.userRelation) myProfile += `\nRelation to Char: ${s.userRelation}`; 
        if (s.userPersona) myProfile += `\nPersonality: ${s.userPersona}`;       
        if (s.userAppearance || appUser.appearance) myProfile += `\nAppearance: ${s.userAppearance || appUser.appearance}`;

        const charName = chatName.value;
        const charBio = s.bio || "No bio provided.";
        const charLogic = s.personalityNormal || "React naturally based on your bio.";
        
        // 🌟 修正：注入长期记忆摘要 (Memory Injection)
        const memoryBlock = currentSummary.value ? `\n\n【长期记忆摘要 (Long-term Memory)】\n${currentSummary.value}` : "";
        
        // 将记忆拼接到逻辑块中
        const dynamicLogic = `${charLogic}${memoryBlock}\n\n【当前心理状态与对玩家印象 (Current Psychology)】\n${currentRelation.value || '初相识，还没有具体印象'}`;

        // 4. 组装最终 System Prompt
        let prompt = CORE_INSTRUCTION_LOGIC_MODE
            .replace(/{{char}}/g, charName)
            .replace(/{{bio}}/g, charBio)
            .replace(/{{logic}}/g, dynamicLogic) // 包含记忆和心理状态
            .replace(/{{likes}}/g, s.likes || "Unknown")
            .replace(/{{dislikes}}/g, s.dislikes || "Unknown")
            .replace(/{{speaking_style}}/g, s.speakingStyle || "Normal")
            .replace(/{{current_time}}/g, formattedTime.value)
            .replace(/{{current_location}}/g, currentLocation.value)
            .replace(/{{interaction_mode}}/g, interactionMode.value)
            .replace(/{{current_activity}}/g, currentActivity.value)
            .replace(/{{current_clothes}}/g, currentClothing.value)
            .replace(/{{user_profile}}/g, myProfile);

        // 5. 截取历史记录 (Short-term Context)
        const historyLimit = charHistoryLimit.value; 
        let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
        if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
        
        // 6. 构造 API 请求
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
                // 🌟 修正：增加防复读参数
                generationConfig: { 
                    responseMimeType: "application/json", 
                    temperature: 0.9,       
                    frequencyPenalty: 0.5,  
                    presencePenalty: 0.3    
                }
            };
        } else {
            targetUrl = `${baseUrl}/chat/completions`;
            const openAIMessages = [{ role: "system", content: prompt }, ...cleanHistoryForAI];
            if (systemOverride) openAIMessages.push({ role: 'user', content: systemOverride });
            
            requestBody = {
                model: config.model,
                messages: openAIMessages,
                max_tokens: 1500,
                stream: false,
                // 🌟 修正：增加防复读参数
                temperature: 0.8,
                frequency_penalty: 0.5, 
                presence_penalty: 0.3
            };
        }
        
        // 7. 发送请求
        try {
            const header = { 'Content-Type': 'application/json' };
            if (config.provider !== 'gemini') header['Authorization'] = `Bearer ${config.apiKey}`;
            
            const res = await uni.request({ url: targetUrl, method: 'POST', header: header, data: requestBody, sslVerify: false });

            if (res.statusCode === 200) {
                let rawText = "";
                if (config.provider === 'gemini') rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                else { 
                    let data = res.data; 
                    if (typeof data === 'string') try { data = JSON.parse(data); } catch(e){} 
                    rawText = data?.choices?.[0]?.message?.content || ""; 
                }

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
    
    const processAIResponse = (rawText) => {
        // 1. 基础清洗
        let displayText = rawText.replace(/^\[(model|assistant|user)\]:\s*/i, '').replace(/^\[SYSTEM.*?\]\s*/i, '').trim();
        
        const thinkMatch = displayText.match(/<think>([\s\S]*?)<\/think>/i);
        const thinkContent = thinkMatch ? thinkMatch[1].trim() : "";
        
        // 🟢【保留】思维链日志 - 观察 AI 思考过程
        if (thinkContent) console.log('🧠 [思考过程]:', thinkContent);

        const genericTagRegex = /<([^\s>]+)[^>]*>[\s\S]*?<\/\1>/gi;
        displayText = displayText.replace(genericTagRegex, '');
        const endTagRegex = /<\/[^>]+>/i;
        if (endTagRegex.test(displayText)) displayText = displayText.split(endTagRegex).pop().trim();
        displayText = displayText.replace(/\[(LOC|ACT|IMG|MODE|AFF).*?\]/gi, '');
        displayText = displayText.replace(/^\s*\*\*.*?\*\*\s*/i, ''); 

        const cleanDisplayText = displayText.trim();
        
        // 2. 气泡切分
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
        // 🚀 多智能体协作流水线
        // =========================================================
        if (cleanDisplayText) {
            let lastUserMsg = "";
            let isCameraAction = false; 

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
            
            // 🟢【保留】对话日志 - 方便判断质量
            console.log('📝 [对话监控] -------------------------------------------------');
            console.log('👤 用户:', lastUserMsg);
            if (thinkContent) console.log('🧠 思考:', thinkContent);
            console.log('🤖 回复:', cleanDisplayText);
            console.log('-----------------------------------------------------------');
            
            setTimeout(async () => {
                try {
                    // 1. 场景和心理检查
                    const scenePromise = runSceneCheck(lastUserMsg, cleanDisplayText);
                    const relationPromise = runRelationCheck(lastUserMsg, cleanDisplayText);
                    await scenePromise;
                    
                    // 2. 视觉分流
                    if (isCameraAction) {
                        await runCameraManCheck(lastUserMsg, cleanDisplayText);
                    } else {
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