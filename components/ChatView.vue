<template>
  <view 
      class="chat-container" 
      :class="{ 'in-edit-mode': isEditMode, 'dark-mode': isDarkMode, 'embedded-view': isEmbedded }"
      :style="isEmbedded ? 'height: 100%; overflow: hidden;' : ''"
    >
    <view v-if="isArchiving" class="archiving-bar">
      <text class="archiving-text">🌙 整理中... 请勿退出</text>
    </view>
    <ChatHeader 
          :interactionMode="interactionMode"
          :currentLocation="currentLocation"
          :currentActivity="currentActivity"
          :playerLocation="playerLocation"
          :timeParts="timeParts"
          
          :isEmbedded="isEmbedded"  @clickPlayer="activeModal = 'forceLocation'"
          @clickTime="activeModal = 'timeSetting'"
        />

    <scroll-view 
      class="chat-scroll" 
      scroll-y="true" 
      :scroll-into-view="scrollIntoView" 
      :scroll-with-animation="true"
    >
      <view class="chat-content">
        <view class="system-tip"><text>长按对话内容可进入多选删除模式</text></view>
        
        <ChatMessageItem
          v-for="(msg, index) in visibleMessageList" 
            :key="msg.id || index"
          :id="'msg-' + index"
          :msg="msg"
          :isEditMode="isEditMode"
          :isSelected="selectedIds.includes(msg.id)"
          :roleAvatar="currentRole?.avatar"
          :userAvatar="userAvatar"
          @longPress="enterEditMode"
          @toggleSelect="toggleSelect"
          @retry="handleRetry"
          @preview="previewImage"
        />
        
        <view v-if="isLoading" class="loading-wrapper"><view class="loading-dots">...</view></view>
        <view id="scroll-bottom" style="height: 20rpx;"></view>
      </view>
    </scroll-view>

    <ChatFooter
          v-model="inputText"
          :isEditMode="isEditMode"
          :selectedCount="selectedIds.length"
          :isToolbarOpen="isToolbarOpen"
          :wakeTime="wakeTime"
          :showThought="showThought"
          
          :isEmbedded="isEmbedded" 
          
          @cancelEdit="cancelEdit"
          @confirmDelete="confirmDelete"
          @toggleToolbar="toggleToolbar"
          @send="sendMessage(false)"
          @clickTime="activeModal = 'timeSkip'"
          @clickLocation="activeModal = 'location'"
          @sleepTimeChange="onSleepTimeChange"
          @clickCamera="handleCameraSend"
          @clickContinue="triggerNextStep"
          @toggleThought="toggleThought"
        />
    
<!--    <view class="phone-fab" @click="showPhone = true">
      <text class="fab-icon">📱</text>
    </view>
    
    <GamePhone 
      :visible="showPhone"
      :world-id="currentRole?.worldId"
      :current-chat-id="chatId"
      @close="showPhone = false"
    />
		 -->
    <ChatModals
      :visibleModal="activeModal"
      :locationList="locationList"
      v-model:tempDateStr="tempDateStr"
      v-model:tempTimeStr="tempTimeStr"
      v-model:tempTimeRatio="tempTimeRatio"
      @close="activeModal = ''"
      @timeSkip="onTimeSkip"
      @confirmTime="confirmManualTime(); activeModal = ''"
      @moveTo="(loc) => { handleMoveTo(loc); activeModal = '' }"
      @forceMove="(loc) => { handleForceMove(loc); activeModal = '' }"
    />
  </view>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { DB } from '@/utils/db.js';
import { LLM } from '@/services/llm.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';
import GamePhone from '@/components/GamePhone.vue';
import { useGameTime } from '@/composables/useGameTime.js';
import { useChatGallery } from '@/composables/useChatGallery.js';
import { useGameLocation } from '@/composables/useGameLocation.js';
import { useAgents } from '@/composables/useAgents.js';
import { useTheme } from '@/composables/useTheme.js'; 
import { useWorldScheduler } from '@/composables/useWorldScheduler.js';
import ChatHeader from '@/components/ChatHeader.vue';
import ChatFooter from '@/components/ChatFooter.vue';
import ChatModals from '@/components/ChatModals.vue';
import ChatMessageItem from '@/components/ChatMessageItem.vue';
import { 
    CORE_INSTRUCTION_LOGIC_MODE,
    TIME_SHIFT_PROMPT 
} from '@/utils/prompts.js';

// --- Props ---
const props = defineProps({
  id: {
    type: [String, Number],
    default: null
  },
  // ✨ 新增：标记是否嵌入在手机里
    isEmbedded: {
      type: Boolean,
      default: false
    }
});

const { tickWorldState } = useWorldScheduler();
const { isDarkMode, applyNativeTheme } = useTheme();

// ==================================================================================
// 1. 核心状态定义 (State)
// ==================================================================================
const chatName = ref('AI');
const chatId = ref(null);
const currentRole = ref(null);
const messageList = ref([]);
const inputText = ref('');
const isLoading = ref(false);
const scrollIntoView = ref('');
const showPhone = ref(false);
const currentAction = ref('站立/闲逛'); 
const userName = ref('你');
const userAvatar = ref('/static/user-avatar.png');
const userHome = ref('未知地址');
const userAppearance = ref('');
const charHome = ref('未知地址');
const currentAffection = ref(0);
const currentLust = ref(0);
const currentLocation = ref('角色家');
const interactionMode = ref('phone');
const currentClothing = ref('默认服装');
const currentActivity = ref('自由活动');
const currentRelation = ref('初相识'); 
const playerLocation = ref('加载中...');

const currentSummary = ref('');
const enableSummary = ref(false);
const summaryFrequency = ref(20);
const charHistoryLimit = ref(20);
const wakeTime = ref('08:00');

const isToolbarOpen = ref(false); 
const worldLocations = ref([]); 
const activeModal = ref('');

watch(() => activeModal.value, (val) => {
    if (val === 'timeSetting') {
        showTimeSettingPanel.value = true;
    }
});
const toggleToolbar = () => { isToolbarOpen.value = !isToolbarOpen.value; };

const touchTimer = ref(null);
const touchStartPosition = ref({ x: 0, y: 0 });
const isLongPressTriggered = ref(false);

const handleTouchStart = (msg, e) => {
    if (isEditMode.value) return; 
    if (e.touches.length > 1) return; 
    touchStartPosition.value = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY
    };
    isLongPressTriggered.value = false;
    touchTimer.value = setTimeout(() => {
        enterEditMode(msg);
        isLongPressTriggered.value = true; 
    }, 800); 
};

const handleTouchMove = (e) => {
    if (!touchTimer.value) return;
    const moveX = e.touches[0].pageX;
    const moveY = e.touches[0].pageY;
    const diffX = Math.abs(moveX - touchStartPosition.value.x);
    const diffY = Math.abs(moveY - touchStartPosition.value.y);
    if (diffX > 10 || diffY > 10) {
        clearTimeout(touchTimer.value);
        touchTimer.value = null;
    }
};

const handleTouchEnd = () => {
    if (touchTimer.value) {
        clearTimeout(touchTimer.value);
        touchTimer.value = null;
    }
};

const onTimeSkip = (type, customMin) => {
    if (type === 'custom' && customMin) {
        customMinutes.value = customMin; 
    }
    handleTimeSkip(type);
    activeModal.value = ''; 
};

const scrollToBottom = () => {
    nextTick(() => {
        scrollIntoView.value = '';
        setTimeout(() => { scrollIntoView.value = 'scroll-bottom'; }, 100);
    });
};

const showForceLocationPanel = ref(false);
const forceCustomLocation = ref('');
const showThought = ref(uni.getStorageSync('setting_show_thought') === true);

const toggleThought = () => {
    showThought.value = !showThought.value;
    uni.setStorageSync('setting_show_thought', showThought.value);
    uni.showToast({ 
        title: showThought.value ? '已开启心声显示' : '已隐藏心声', 
        icon: 'none' 
    });
};

const getWakeUpTimestamp = (targetTimeStr) => {
    const now = new Date(currentTime.value); 
    const [targetHour, targetMinute] = targetTimeStr.split(':').map(Number);
    let targetDate = new Date(now);
    targetDate.setHours(targetHour, targetMinute, 0, 0);
    if (targetDate <= now) {
        targetDate.setDate(targetDate.getDate() + 1);
    }
    return targetDate.getTime();
};

// ✨✨✨ 核心过滤逻辑：决定显示哪些消息 ✨✨✨
const visibleMessageList = computed(() => {
    // 1. 如果不是嵌入模式 (即作为独立主界面使用)，显示所有消息
    // 这样保证了非手机模式下，玩家能看到完整的记忆
    if (!props.isEmbedded) return messageList.value;

    // 2. 如果是嵌入手机模式 (isEmbedded = true)，只显示 'device' 来源的消息
    return messageList.value.filter(msg => {
        // 过滤规则：
        // 保留 source_mode 为 'device' 的消息
        // 保留 source_mode 为 null/undefined 的消息 (兼容旧数据)
        // ❌ 剔除明确标记为 'reality' (当面) 的消息
        return msg.source_mode !== 'reality';
    });
});
const onSleepTimeChange = async (e) => {
    const selectedTime = e.detail.value;
    wakeTime.value = selectedTime;
    if (isLoading.value) return uni.showToast({ title: '剧情进行中...', icon: 'none' });
    const oldTimeStr = formattedTime.value; 
    const newTimestamp = getWakeUpTimestamp(selectedTime);
    const oldDate = new Date(currentTime.value).getDate();
    const newDate = new Date(newTimestamp).getDate();
    if (oldDate !== newDate) {
        console.log("🌙 检测到睡眠跨天，触发每日结算...");
        await runDayEndSummary();
    }
    currentTime.value = newTimestamp;
    if (currentRole.value && currentRole.value.worldId) {
        tickWorldState(currentTime.value, currentRole.value.worldId);
    }
    messageList.value.push({
        role: 'system',
        content: `💤 睡到了 ${selectedTime}... (体力已恢复)`,
        isSystem: true
    });
    await saveHistory(); 
    nextTick(() => {
        const transitionPrompt = TIME_SHIFT_PROMPT
            .replace('{{old_time}}', oldTimeStr)
            .replace('{{new_time}}', formattedTime.value) 
            .replace('{{current_location}}', currentLocation.value || "卧室");
        sendMessage(false, transitionPrompt);
    });
};

const handleForceMove = (locObj) => {
    const targetName = typeof locObj === 'object' ? (locObj.detail || locObj.name || '') : locObj;
    if (!targetName) return uni.showToast({ title: '无效地点', icon: 'none' });
    playerLocation.value = targetName;
    console.log(`🛠️ [God Mode] 玩家位置强制修正为: ${targetName}`);
    if (playerLocation.value === currentLocation.value) {
        interactionMode.value = 'face';
    } else {
        interactionMode.value = 'phone';
    }
    saveCharacterState();
    showForceLocationPanel.value = false;
    uni.showToast({ title: `已修正为: ${targetName}`, icon: 'none' });
};

// 文件路径：components/ChatView.vue

const saveHistory = async (msg) => {
    if (!chatId.value) return;
    const targetMsg = msg || (messageList.value.length > 0 ? messageList.value[messageList.value.length - 1] : null);
    if (!targetMsg) return;

    // 🔥 计算模式逻辑
    // 如果是嵌入版(手机内)，强制为 device
    // 如果不是嵌入版，则看当前是 face 还是 phone
    let mode = 'device';
    if (!props.isEmbedded && interactionMode.value === 'face') {
        mode = 'reality';
    }
    
    // 同步到内存对象，确保发送后列表立即更新/过滤
    if (!targetMsg.source_mode) {
        targetMsg.source_mode = mode;
    }

    try {
        // 🔥 SQL 增加第8个参数 source_mode
        await DB.execute(
            `INSERT OR REPLACE INTO messages (id, chatId, role, content, type, isSystem, timestamp, source_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                targetMsg.id || (Date.now() + Math.random()),
                String(chatId.value), 
                targetMsg.role, 
                targetMsg.content, 
                targetMsg.type || 'text', 
                targetMsg.isSystem ? 1 : 0, 
                Date.now(),
                mode // ✨ 插入 source_mode
            ]
        );
        let list = uni.getStorageSync('contact_list') || [];
        const index = list.findIndex(item => String(item.id) === String(chatId.value));
        if (index !== -1) {
            list[index].lastMsg = targetMsg.isSystem ? `[系统] ${targetMsg.content}` : targetMsg.content;
            list[index].lastTime = "刚刚"; 
            uni.setStorageSync('contact_list', list);
        }
        console.log(`💾 [DB] 消息已保存 (${mode}) 且预览已更新`);
    } catch (e) { console.error('❌ 数据库保存失败', e); }
};

const getCurrentLlmConfig = () => {
    const schemes = uni.getStorageSync('app_llm_schemes') || [];
    const idx = uni.getStorageSync('app_current_scheme_index') || 0;
    return (schemes.length > 0 && schemes[idx]) ? schemes[idx] : uni.getStorageSync('app_api_config');
};

const saveCharacterState = (newScore, newTime, newSummary, newLocation, newClothes, newMode, newLust) => {
    if (newScore !== undefined) currentAffection.value = Math.max(0, Math.min(100, newScore));
    if (newLust !== undefined) currentLust.value = Math.max(0, Math.min(100, newLust));
    if (newTime !== undefined) currentTime.value = newTime; 
    if (newSummary !== undefined) currentSummary.value = newSummary;
    if (newLocation !== undefined) currentLocation.value = newLocation;
    if (newClothes !== undefined) currentClothing.value = newClothes;
    if (newMode !== undefined) {
        if (props.isEmbedded) {
                    interactionMode.value = 'phone';
                } else if (newMode === 'face' && playerLocation.value !== currentLocation.value) {
                     interactionMode.value = 'phone'; 
                } else {
                     interactionMode.value = newMode;
                }
    }
    if (chatId.value) {
        const list = uni.getStorageSync('contact_list') || [];
        const index = list.findIndex(item => String(item.id) === String(chatId.value));
        if (index !== -1) {
            const item = list[index];
            item.affection = currentAffection.value;
            item.lust = currentLust.value;
            item.lastTimeTimestamp = currentTime.value;
            item.summary = currentSummary.value;
            item.playerLocation = playerLocation.value;
            item.currentLocation = currentLocation.value;
            item.clothing = currentClothing.value;
            item.currentAction = currentAction.value;
            item.interactionMode = interactionMode.value; 
            item.lastActivity = currentActivity.value;
            item.relation = currentRelation.value;
            uni.setStorageSync('contact_list', list);
        }
    }
};

const relationshipStatus = computed(() => {
    const score = currentAffection.value;
    if (score < 20) return '礼貌疏离';
    if (score < 40) return '普通熟人';
    if (score < 60) return '暧昧萌芽';
    if (score < 80) return '恋人未满';
    return '热恋情侣';
});

const previewImage = (url) => { uni.previewImage({ urls: [url] }); };
const onDateChange = (e) => { tempDateStr.value = e.detail.value; }; 
const onTimeChange = (e) => { tempTimeStr.value = e.detail.value; }; 

const isEditMode = ref(false);
const selectedIds = ref([]);

const enterEditMode = (msg) => {
    if (isLoading.value) return;
    isEditMode.value = true;
    selectedIds.value = [msg.id];
    uni.vibrateShort(); 
};

const toggleSelect = (msg) => {
    const index = selectedIds.value.indexOf(msg.id);
    if (index > -1) {
        selectedIds.value.splice(index, 1);
        if (selectedIds.value.length === 0) isEditMode.value = false; 
    } else {
        selectedIds.value.push(msg.id);
    }
};

const cancelEdit = () => {
    isEditMode.value = false;
    selectedIds.value = [];
};

const confirmDelete = () => {
    uni.showModal({
        title: '物理删除',
        content: '确定要从数据库中永久抹除这些记忆吗？',
        success: async (res) => {
            if (res.confirm) {
                messageList.value = messageList.value.filter(m => !selectedIds.value.includes(m.id));
                const ids = selectedIds.value.map(id => `'${id}'`).join(',');
                await DB.execute(`DELETE FROM messages WHERE id IN (${ids})`);
                cancelEdit();
                uni.showToast({ title: '已物理抹除', icon: 'success' });
            }
        }
    });
};

const { 
    currentTime, formattedTime, 
    timeRatio, tempTimeRatio,
    showTimePanel, showTimeSettingPanel, tempDateStr, tempTimeStr, customMinutes,
    startTimeFlow, stopTimeFlow, handleTimeSkip: _handleTimeSkip, 
    confirmManualTime: _confirmManualTime,
    initTimeSync 
} = useGameTime(saveCharacterState);

const timeParts = computed(() => {
    if (!formattedTime.value) return { week: '--', time: '--:--' };
    const parts = formattedTime.value.split(' ');
    return { week: parts[0] || '', time: parts[1] || '' };
});

const { handleAsyncImageGeneration, retryGenerateImage } = useChatGallery({
    currentRole, interactionMode, userAppearance, 
    messageList, chatId, chatName, saveHistory, scrollToBottom
});

const confirmManualTime = async () => {
    const newTime = _confirmManualTime();
    if (newTime) {
        messageList.value.push({
            role: 'system',
            content: `⏳ 时间现在为为 ${formattedTime.value}`,
            isSystem: true
        });
        scrollToBottom();
    } 
};

const { 
    showLocationPanel, customLocation, 
    locationList, checkIsWorking, calculateMoveResult 
} = useGameLocation({ currentRole, userHome, charHome, currentTime, worldLocations });

const {
    runSceneCheck, runRelationCheck, runVisualDirectorCheck, runCameraManCheck, 
    checkAndRunSummary, runDayEndSummary,isArchiving,
    checkHistoryRecall ,fetchActiveMemoryContext,retryAgentGeneration
} = useAgents({chatId,
    messageList, currentRole, chatName, currentLocation, currentClothing, currentAction,
    interactionMode, currentRelation, currentAffection, 
    currentActivity, formattedTime, playerLocation,
    enableSummary, summaryFrequency, currentSummary,
    saveCharacterState, saveHistory, scrollToBottom, getCurrentLlmConfig, handleAsyncImageGeneration
});

const handleTimeSkip = async (type) => {
    const isNextDay = _handleTimeSkip(type, messageList, scrollToBottom);
    if (currentRole.value && currentRole.value.worldId) {
        tickWorldState(currentTime.value, currentRole.value.worldId);
    }
    let skipDesc = "";
    switch(type) {
        case 'morning': skipDesc = "一上午过去了"; break;
        case 'afternoon': skipDesc = "一下午过去了"; break;
        case 'night': skipDesc = "一晚上过去了"; break;
        case 'day': skipDesc = "一天过去了"; break;
        case 'custom': skipDesc = `${customMinutes.value}分钟过去了`; break;
    }
    messageList.value.push({
        role: 'system',
        content: `⏳ ${skipDesc}... 当前时间为 ${formattedTime.value}`,
        isSystem: true
    });
    const timePrompt = `[SYSTEM EVENT: TIME_SKIP]\n**Action**: ${skipDesc}.\n**New Time**: ${formattedTime.value}.\n**Instruction**: 考虑到时间的流逝，请根据当前时间点（是否该吃饭、睡觉、上班等）自然地继续对话或发起新话题。`;
    sendMessage(false, timePrompt);
    if (isNextDay) {
        await runDayEndSummary();
    }
    scrollToBottom();
};

const handleSleep = () => {
    handleTimeSkip('night');
};

const handleMoveTo = (locObj) => {
    if (isLoading.value) return uni.showToast({ title: '对话进行中...', icon: 'none' });
    const targetName = typeof locObj === 'object' ? (locObj.detail || locObj.name || '') : locObj;
    if (targetName === 'custom' && !customLocation.value) return uni.showToast({ title: '请输入地点', icon: 'none' });
    const finalLocationName = targetName === 'custom' ? customLocation.value : targetName;

    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const targetScene = allScenes.find(s => s.name.includes(finalLocationName) || finalLocationName.includes(s.name));

    if (targetScene) {
            console.log(`🌌 [传送] 检测到实体场景 [${targetScene.name}]，准备跳转...`);
            uni.showModal({
                title: '前往场景',
                content: `确定前往【${targetScene.name}】吗？`,
                success: (res) => {
                    if (res.confirm) {
                        playerLocation.value = targetScene.name;
                        if (playerLocation.value === currentLocation.value) {
                             interactionMode.value = 'face';
                             console.log("📍 [模式校准] 同地 -> Face模式");
                        } else {
                             interactionMode.value = 'phone';
                             console.log("📍 [模式校准] 异地 -> Phone模式");
                        }
                        saveCharacterState(); 
                        console.log(`📍 [玩家移动] 玩家已更新位置至: ${targetScene.name} (NPC保持原位)`);
                        uni.redirectTo({
                            url: `/pages/scene/chat?id=${targetScene.id}&visitorId=${chatId.value}`
                        });
                        showLocationPanel.value = false;
                    }
                }
            });
            return; 
        }

    const result = calculateMoveResult({ name: finalLocationName, type: locObj.type });
    console.log(`📍 [私聊移动] 玩家目标: ${result.playerLocation}`);
    playerLocation.value = result.playerLocation;
    const pLoc = playerLocation.value || "";
    const cLoc = currentLocation.value || "";
    const isTogether = pLoc === cLoc || pLoc.includes(cLoc) || cLoc.includes(pLoc);
    if (isTogether) {
         interactionMode.value = 'face';
         console.log("📍 [移动判定] 位置重叠 -> 切换为 Face 模式");
    } else {
         interactionMode.value = 'phone';
         console.log("📍 [移动判定] 位置分离 -> 切换为 Phone 模式");
    }
    showLocationPanel.value = false;
    uni.vibrateShort();
    saveCharacterState();

    if (result.shouldNotifyAI) {
        let realSysMsg = isTogether ? `你抵达了 ${pLoc}。${chatName.value} 也在这一带。` : `你抵达了 ${pLoc}。${chatName.value} 目前在 ${cLoc}。`;
        messageList.value.push({ role: 'system', content: `🚗 ${realSysMsg}`, isSystem: true });
        const movePrompt = `[SYSTEM EVENT: PLAYER MOVE]\n**Player Action**: Moved to ${playerLocation.value}.\n**Your Location**: ${currentLocation.value} (STAY WHERE YOU ARE).\n**Current Mode**: ${interactionMode.value === 'face' ? 'FACE-TO-FACE' : 'PHONE'}.\n**Instruction**: Do not hallucinate that you moved. Continue current interaction naturally.`;
        sendMessage(false, movePrompt);
    } else {
        uni.showToast({ title: `已抵达 ${playerLocation.value}`, icon: 'none' });
    }
};

const handleRetry = async (msg) => {
    if (msg.content.includes('重试中') || msg.isRetrying) return;
    uni.vibrateShort();
    if (msg.isLogicError) {
        uni.showToast({ title: '正在重构思路...', icon: 'none' });
        await retryAgentGeneration(msg);
    } else if (msg.isError || msg.originalPrompt) {
        retryGenerateImage(msg);
    } else {
        try {
           await retryGenerateImage(msg);
        } catch (e) { console.error(e); }
    }
};

const handleImageLoadError = (msg) => {
    if (msg.content && !msg.hasError) {
        msg.hasError = true; 
        messageList.value = [...messageList.value];
    }
};

// 文件路径：components/ChatView.vue

const processAIResponse = async (rawText) => {
    // 基础判空
    if (!rawText) return;

    // 计算当前的 source_mode，确保 AI 的回复也能被 visibleMessageList 正确过滤/显示
    const currentMode = props.isEmbedded ? 'device' : (interactionMode.value === 'face' ? 'reality' : 'device');

    // 1. 心理活动提取与分流逻辑
    let thinkContent = "";
    let mainContent = rawText; 
    
    const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
        thinkContent = thinkMatch[1].trim(); 
        mainContent = rawText.replace(/<think>[\s\S]*?<\/think>/i, '').trim(); 
    }

    if (showThought.value && thinkContent) {
        const thinkMsg = {
            id: Date.now() + Math.random(),
            role: 'model',
            type: 'think', 
            content: `💭 ${thinkContent}`,
            isSystem: true,
            source_mode: currentMode // ✨ 标记心理活动
        };
        messageList.value.push(thinkMsg);
        await saveHistory(thinkMsg);
    } 

    // 2. 正文上屏逻辑
    if (mainContent) {
         let tempText = mainContent
            .replace(/\n\s*([”"’])/g, '$1')     
            .replace(/([“"‘])\s*\n/g, '$1')     
            .replace(/([（\(])/g, '|||$1')      
            .replace(/([）\)])/g, '$1|||')      
            .replace(/(\r\n|\n|\r)+/g, '|||')   
            .replace(/(?:\|\|\|)+/g, '|||');    
            
         const parts = tempText.split('|||');
         
         for (const part of parts) {
             let cleanPart = part.trim();
             if (cleanPart && (messageList.value.length === 0 || messageList.value[messageList.value.length - 1].content !== cleanPart)) {
                 const newMsg = {
                     id: Date.now() + Math.random(),
                     role: 'model', 
                     content: cleanPart,
                     source_mode: currentMode // ✨ 标记 AI 回复
                 };
                 
                 messageList.value.push(newMsg);
                 await saveHistory(newMsg);
             }
         }
    }
    
    // 基础维护
    scrollToBottom();
    
    // 3. 对话与状态监控日志
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
        console.log(`💃 动作: ${currentAction.value}`);
        console.log(`👗 服装: ${currentClothing.value}`);
        console.log(`❤️ 关系: ${currentRelation.value} `);
        console.log(`📅 时间: ${formattedTime.value}`);
        console.log(`📱 模式: ${interactionMode.value === 'phone' ? '手机聊天' : '当面互动'}`);
        console.log('-----------------------------------------------------------');

        // 4. 触发 Agent 检查
        setTimeout(() => {
            console.log('🚦 [后台导演] 全并行策略启动...');
        
            runRelationCheck(lastUserMsg, rawText); 
            checkAndRunSummary(); 
        
            runSceneCheck(lastUserMsg, rawText);
        
            const isSystemSnapshot = lastUserMsg.includes('SNAPSHOT') || lastUserMsg.includes('📷'); 
            
            if (isSystemSnapshot) {
                runCameraManCheck(lastUserMsg, rawText);
            } else {
                runVisualDirectorCheck(lastUserMsg, rawText);
            }
            
        }, 500);
    }
};

// 文件路径：components/ChatView.vue

const sendMessage = async (isContinue = false, systemOverride = '') => {
    // 1. 基础校验
    if (!isContinue && !inputText.value.trim() && !systemOverride) return;
    if (isLoading.value) return;
    const config = getCurrentLlmConfig();
    if (!config || !config.apiKey) return uni.showToast({ title: '请配置模型', icon: 'none' });
    
    let userMsgForRecall = inputText.value;

    // 2. 处理用户输入与系统指令上屏
    if (!isContinue) {
        if (inputText.value.trim()) { 
            console.log(`🚀 [发送消息]: ${inputText.value}`);
            
            // 🔥 计算当前的模式，以便立即赋值给 source_mode
            const currentMode = props.isEmbedded ? 'device' : (interactionMode.value === 'face' ? 'reality' : 'device');

            const userMsg = { 
                 id: Date.now() + Math.random(),
                 role: 'user', 
                 content: inputText.value,
                 source_mode: currentMode // ✨ 立即标记，确保 computed 能立即识别显示
            };
            messageList.value.push(userMsg); 
            inputText.value = ''; 
            
            // ✅ 关键修复：用户发消息也要 await 保存
            await saveHistory(userMsg);
        } 
        else if (systemOverride && (systemOverride.includes('SNAPSHOT') || systemOverride.includes('SHUTTER') || systemOverride.includes('快门'))) { 
            console.log(`⚙️ [系统触发]: ${systemOverride.slice(0, 50)}...`);
            
            // 系统消息通常跟随当前环境
            const currentMode = props.isEmbedded ? 'device' : (interactionMode.value === 'face' ? 'reality' : 'device');

            const sysMsg = { 
                role: 'system', 
                content: '📷 (你举起手机拍了一张)', 
                isSystem: true,
                source_mode: currentMode // ✨ 立即标记
            };
            messageList.value.push(sysMsg); 
            
            // ✅ 关键修复：系统动作也要 await 保存
            await saveHistory(sysMsg);
        }
    }

    scrollToBottom(); 
    isLoading.value = true; 
    
    const appUser = uni.getStorageSync('app_user_info') || {};
    if (appUser.name) userName.value = appUser.name;

    // 3. 记忆系统逻辑
    
    // 轨道 A: 被动检索
    let recallDetail = null;
    if (!isContinue && !systemOverride && userMsgForRecall) {
        recallDetail = await checkHistoryRecall(userMsgForRecall);
    }

    // 轨道 B: 主动显性记忆
    let activeMemory = "";
    try {
        activeMemory = await fetchActiveMemoryContext();
        if (activeMemory) console.log("🧠 [Active Memory] 已注入短期记忆上下文");
    } catch (e) { console.error("Active memory error:", e); }

    // 4. 构建 Prompt
    const prompt = buildSystemPrompt({
        role: currentRole.value || {}, userName: userName.value, summary: currentSummary.value,
        formattedTime: formattedTime.value, location: currentLocation.value, mode: interactionMode.value,
        activity: currentActivity.value, clothes: currentClothing.value, relation: currentRelation.value
    });

    const historyLimit = charHistoryLimit.value; 
    let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
    if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
    
    // 基础消息清洗
    const cleanHistoryForAI = contextMessages.map(item => ({ 
        role: item.role === 'user' ? 'user' : 'assistant', 
        content: item.content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\[.*?\]/gi, '').trim() 
    })).filter(m => m.content);

    if (activeMemory) {
        cleanHistoryForAI.unshift({
            role: 'system',
            content: activeMemory
        });
    }

    if (recallDetail) {
        cleanHistoryForAI.push({ 
            role: 'system', 
            content: `[Recall Detail]: The following is a detailed diary entry of the past event user mentioned: "${recallDetail}". Use this to answer correctly.` 
        });
    }

    if (systemOverride) cleanHistoryForAI.push({ role: 'user', content: systemOverride });
    
    // 5. 发起请求
    try {
        const rawText = await LLM.chat({ 
            config, 
            messages: cleanHistoryForAI, 
            systemPrompt: prompt, 
            temperature: 0.8, 
            maxTokens: 1500
        });
   
        if (rawText) {
            await processAIResponse(rawText);
        } else {
            uni.showToast({ title: '无内容响应', icon: 'none' });
        }

    } catch (e) { 
        console.error(e); 
        uni.showToast({ title: '网络/API错误', icon: 'none' }); 
    } finally { 
        isLoading.value = false; 
        scrollToBottom(); 
    }
};

const triggerNextStep = () => {
    if (isLoading.value) return;
    sendMessage(true, `[System Command: NARRATIVE_CONTINUATION]\n**Status**: User waiting.\n**Task**: Finish msg or initiate action.\n**Rules**: No repeat.`);
};

const handleCameraSend = () => {
    if (interactionMode.value !== 'face') return uni.showToast({ title: '非见面模式无法抓拍', icon: 'none' });
    const cameraPrompt = `(你举起手机，寻找一个合适的角度，按下了快门。由于是在这种氛围下，她可能会注意到你的镜头并给出反应，也可能正专注于自己的事而完全没察觉。请根据当前情境自然衔接剧情。)`;
    sendMessage(false, cameraPrompt);
};

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
    const triggerPrompt = `[系统事件: 用户回归]\n**背景**: 用户离开 ${Math.floor(hoursSinceActive)} 小时。\n**游戏时间**: ${gameTimeDesc} (${gameHour}:00)。\n**任务**: 主动发起对话 (简体中文，简短，30字内)。`;
    sendMessage(false, triggerPrompt);
    uni.setStorageSync(`last_real_active_time_${chatId.value}`, now);
};

const loadRoleData = (id) => {
    const list = uni.getStorageSync('contact_list') || [];
    const target = list.find(item => String(item.id) === String(id));
    if (target) {
        currentRole.value = target;
        chatName.value = target.name;
        uni.setNavigationBarTitle({ title: target.name });
        currentLust.value = target.lust || 0;
        initTimeSync(target.lastTimeTimestamp || Date.now(), target.worldId);
        currentClothing.value = target.clothing || '便服';
        charHome.value = target.location || '角色家';
        userHome.value = target.settings?.userLocation || '玩家家';
        userAppearance.value = target.settings?.userAppearance || '';
        playerLocation.value = target.playerLocation || userHome.value;
        currentLocation.value = target.currentLocation || charHome.value;
        if (props.isEmbedded) {
                    interactionMode.value = 'phone';
                } else {
                    // 原有位置判断逻辑
                    if (!target.interactionMode || playerLocation.value === currentLocation.value) {
                        interactionMode.value = (playerLocation.value === currentLocation.value) ? 'face' : 'phone';
                    } else {
                        interactionMode.value = target.interactionMode;
                    }
                }
        currentAction.value = target.currentAction || '站立/闲逛';
        currentActivity.value = target.lastActivity || '自由活动';
        currentRelation.value = target.relation || '初相识';
        enableSummary.value = target.enableSummary || false;
        summaryFrequency.value = target.summaryFrequency || 20;
        currentSummary.value = target.summary || "";
        charHistoryLimit.value = target.historyLimit || 20;
        const allWorlds = uni.getStorageSync('app_world_settings') || [];
        const myWorld = allWorlds.find(w => String(w.id) === String(target.worldId));
        if (myWorld && myWorld.locations && myWorld.locations.length > 0) {
            worldLocations.value = myWorld.locations.map(loc => ({ name: loc, icon: '📍' }));
        } else {
            const globalLocs = uni.getStorageSync('app_world_locations');
            if (globalLocs) { worldLocations.value = globalLocs; } 
            else { worldLocations.value = [{ name: '学校', icon: '🏫' }, { name: '公司', icon: '🏢' }]; }
        }
    }
};

const clearHistoryAndReset = () => {
    uni.showModal({
        title: '彻底重置', 
        content: '确定要重置该角色吗？\n她将遗忘所有过往记忆，变为“陌生人”。',
        confirmColor: '#ff4d4f',
        success: (res) => {
            if (res.confirm) {
                playerLocation.value = userHome.value;
                currentLocation.value = charHome.value;
                interactionMode.value = (playerLocation.value === currentLocation.value) ? 'face' : 'phone';
                messageList.value = [];
                if (chatId.value) {
                    const contacts = uni.getStorageSync('contact_list') || [];
                    const idx = contacts.findIndex(c => String(c.id) === String(chatId.value));
                    if (idx !== -1) {
                        contacts[idx].resetTime = Date.now(); 
                        contacts[idx].affection = 0;
                        contacts[idx].summary = ""; 
                        uni.setStorageSync('contact_list', contacts);
                    }
                    DB.execute(`DELETE FROM messages WHERE chatId = '${chatId.value}'`);
                    DB.execute(`DELETE FROM diaries WHERE roleId = '${chatId.value}'`);
                }
                saveCharacterState();
                uni.showToast({ title: '角色已重置', icon: 'none' });
                setTimeout(() => uni.navigateBack(), 800);
            }
        }
    });
};



// 映射 onLoad 逻辑
watch(() => props.id, async (newId) => {
  if (newId) {
    chatId.value = newId;
    loadRoleData(newId);
    try {
      const history = await DB.select(
        `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC`,
        [String(newId)]
      );
      if (history && history.length > 0) {
        messageList.value = history.map(m => ({
          ...m,
          isSystem: !!m.isSystem
        }));
      } else {
        messageList.value = [];
      }
      scrollToBottom();
    } catch (e) { console.error('加载数据库历史失败', e); }
  }
}, { immediate: true });

onMounted(() => {
    const appUser = uni.getStorageSync('app_user_info');
    if (appUser) {
        if (appUser.name) userName.value = appUser.name;
        if (appUser.avatar) userAvatar.value = appUser.avatar;
    }
    applyNativeTheme();
    if (chatId.value) {
        loadRoleData(chatId.value);
        scrollToBottom();
        startTimeFlow();
        setTimeout(() => checkProactiveGreeting(), 1000);
    }
});

onUnmounted(() => { 
    stopTimeFlow(); 
    saveCharacterState(); 
});

// 对外公开的方法
defineExpose({
    openSettings: () => {
        uni.navigateTo({ url: `/pages/create/create?id=${chatId.value}` });
    }
});

</script>

<style lang="scss" scoped>
/* ==========================================================================
   1. 基础容器 & 全局变量应用
   ========================================================================== */
.chat-container { 
    display: flex; 
    flex-direction: column; 
    height: 100vh; 
    background-color: var(--bg-color); /* 全局背景 */
    overflow: hidden; 
}

/* ==========================================================================
   3. 聊天内容区
   ========================================================================== */
/* components/ChatView.vue */
.chat-scroll { 
    flex: 1; 
    overflow: hidden; 
    height: 0; /* 👈 这行代码必须存在！这是滑动的核心 */
    /* min-height: 0; 如果 height: 0 不行，试试加这个，但通常 height: 0 就够了 */
}
.chat-content { padding: 20rpx; padding-bottom: 240rpx; }

.system-tip { 
    text-align: center; 
    color: var(--text-sub); /* 适配 */
    font-size: 24rpx; margin-bottom: 30rpx; 
}

.loading-wrapper { display: flex; justify-content: center; margin-bottom: 20rpx; }
.loading-dots { color: var(--text-sub); font-weight: bold; }

/* 🔥🔥🔥 悬浮按钮样式 🔥🔥🔥 */
.phone-fab {
  position: fixed;
  right: 30rpx;
  bottom: 260rpx; 
  width: 90rpx;
  height: 90rpx;
  background: rgba(255, 255, 255, 0.9); 
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900; 
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.2);
  border: 1px solid rgba(0,0,0,0.05);
  transition: transform 0.1s;
}

.phone-fab:active {
  transform: scale(0.9);
  background: #f0f0f0;
}

.fab-icon {
  font-size: 40rpx;
}

/* 夜间模式适配 */
.dark-mode .phone-fab {
  background: rgba(40, 40, 40, 0.9);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.5);
}
/* 在最后添加 */
.chat-container.embedded-view {
    height: 100% !important; /* 强制填满手机组件的高度，而不是 100vh */
    background-color: #f2f2f7; /* 配合手机背景色 */
}
</style>