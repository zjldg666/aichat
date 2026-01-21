<template>
  <view class="chat-container" :class="{ 'in-edit-mode': isEditMode, 'dark-mode': isDarkMode }">
    <view v-if="isArchiving" class="archiving-bar">
            <text class="archiving-text">🌙 整理中... 请勿退出</text>
        </view>
    
    <!-- 1. 顶部状态栏 -->
    <ChatHeader 
      :interactionMode="interactionMode"
      :currentLocation="currentLocation"
      :currentActivity="currentActivity"
      :playerLocation="playerLocation"
      :timeParts="timeParts"
      @clickPlayer="showForceLocationPanel = true"
      @clickTime="showTimeSettingPanel = true"
    />

    <!-- 2. 聊天内容区 -->
    <scroll-view 
      class="chat-scroll" 
      scroll-y="true" 
      :scroll-into-view="scrollIntoView" 
      :scroll-with-animation="true"
    >
      <view class="chat-content">
        <view class="system-tip"><text>长按对话内容可进入多选删除模式</text></view>
        
        <ChatMessageItem 
          v-for="(msg, index) in messageList" 
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

    <!-- 3. 底部工具栏 -->
    <ChatFooter 
      :isEditMode="isEditMode"
      :selectedCount="selectedIds.length"
      :isToolbarOpen="isToolbarOpen"
      v-model="inputText"
      :wakeTime="wakeTime"
      :showThought="showThought"
      @cancelEdit="cancelEdit"
      @confirmDelete="confirmDelete"
      @toggleToolbar="toggleToolbar"
      @send="sendMessage(false)"
      @clickTime="showTimePanel = true"
      @clickLocation="showLocationPanel = true"
      @sleepTimeChange="onSleepTimeChange"
      @clickCamera="handleCameraSend"
	  @clickStealthCamera="handleStealthCameraSend"
      @clickContinue="triggerNextStep"
      @toggleThought="toggleThought"
      @clickWardrobe="showWardrobePanel = true"
    />
    
    <!-- 4. 弹窗面板 -->
    <ChatModals 
      :visibleModal="activeModal"
      :locationList="locationList"
      :wardrobeList="wardrobeList"
      
      :currentRole="currentRole"
      
      v-model:tempDateStr="tempDateStr"
      v-model:tempTimeStr="tempTimeStr"
      v-model:tempTimeRatio="tempTimeRatio"
      @close="closeModal"
      @timeSkip="handleTimeSkip"
      @confirmTime="confirmManualTime"
      @moveTo="handleMoveTo"
      @forceMove="handleForceMove"
      @update:wardrobeList="handleWardrobeUpdate"
      @applyOutfit="handleApplyOutfit"
    />
	
  </view>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { onLoad, onShow, onHide, onUnload, onNavigationBarButtonTap } from '@dcloudio/uni-app';
import { DB } from '@/utils/db.js';
import { LLM } from '@/services/llm.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';

import { useGameTime } from '@/composables/useGameTime.js';
import { useChatGallery } from '@/composables/useChatGallery.js';
import { useGameLocation } from '@/composables/useGameLocation.js';
import { useAgents } from '@/composables/useAgents.js';
import { useTheme } from '@/composables/useTheme.js';
import { useEvolution } from '@/composables/useEvolution.js'; // ✨ 新增

// 引入新组件
import ChatHeader from '@/components/ChatHeader.vue';
import ChatMessageItem from '@/components/ChatMessageItem.vue';
import ChatFooter from '@/components/ChatFooter.vue';
import ChatModals from '@/components/ChatModals.vue';

import { 
    CORE_INSTRUCTION_LOGIC_MODE,
    TIME_SHIFT_PROMPT,
	CAMERA_REACTION_PROMPT
} from '@/utils/prompts.js';

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

// 角色状态
const currentAction = ref('站立/闲逛'); 
const userName = ref('你');
const userAvatar = ref('/static/user-avatar.png');
const userHome = ref('未知地址');
const userAppearance = ref('');
const charHome = ref('未知地址');

const currentLocation = ref('角色家');
const interactionMode = ref('phone');
const currentClothing = ref('默认服装');
const currentActivity = ref('自由活动');
const currentRelation = ref('初相识'); 
// 🌟 新增：玩家当前位置
const playerLocation = ref('加载中...');

// 记忆与设置
const currentSummary = ref('');
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

const toggleToolbar = () => { isToolbarOpen.value = !isToolbarOpen.value; };

// ==================================================================================
// 2. 基础辅助函数
// ==================================================================================
const scrollToBottom = () => {
    nextTick(() => {
        scrollIntoView.value = '';
        setTimeout(() => { scrollIntoView.value = 'scroll-bottom'; }, 100);
    });
};
// --- 变量定义 ---
const showForceLocationPanel = ref(false);
const showWardrobePanel = ref(false); // ✨ 新增：衣柜面板开关
const wardrobeList = ref([]); // ✨ 新增：衣柜数据
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
 * 触发器：当时间选择器改变时调用
 */
const onSleepTimeChange = async (e) => {
    // e.detail.value 是 uni-app picker 返回的 "HH:mm" 字符串
    const selectedTime = e.detail.value;
    wakeTime.value = selectedTime;
    
    if (isLoading.value) return uni.showToast({ title: '剧情进行中...', icon: 'none' });

    // 1. 保存旧时间字符串用于 Prompt
    const oldTimeStr = formattedTime.value; 

    // 2. 计算目标时间戳
    const newTimestamp = getWakeUpTimestamp(selectedTime);
    
    // 3. 判断是否跨天 (如果跨天，触发日记结算)
    const oldDate = new Date(currentTime.value).getDate();
    const newDate = new Date(newTimestamp).getDate();
    if (oldDate !== newDate) {
        console.log("🌙 检测到睡眠跨天，触发每日结算...");
        await runDayEndSummary();
    }

    // 4. 更新核心游戏时间 (这会自动更新 formattedTime)
    currentTime.value = newTimestamp;
    
    // 5. 界面显示系统消息
    messageList.value.push({
        role: 'system',
        content: `💤 睡到了 ${selectedTime}... (体力已恢复)`,
        isSystem: true
    });
    await saveHistory(); // 保存这条系统消息

    // 6. 核心：构建 TIME_SHIFT Prompt 告诉 AI 醒来
    // 使用 nextTick 确保 formattedTime 已经更新
    nextTick(() => {
        const transitionPrompt = TIME_SHIFT_PROMPT
            .replace('{{old_time}}', oldTimeStr)
            .replace('{{new_time}}', formattedTime.value) // 此时已是新时间
            .replace('{{current_location}}', currentLocation.value || "卧室");

        // 发送隐性指令给 AI (true 代表这是指令，不是用户说的话)
        sendMessage(false, transitionPrompt);
    });
};
const handleForceMove = (locObj) => {

    const targetName = typeof locObj === 'object' 
        ? (locObj.detail || locObj.name || '') 
        : locObj;
    
    if (!targetName) return uni.showToast({ title: '无效地点', icon: 'none' });

    // 2. 静默更新玩家位置
    playerLocation.value = targetName;
    console.log(`🛠️ [God Mode] 玩家位置强制修正为: ${targetName}`);

    // 3. 智能模式纠错
    // 逻辑：如果修正后的位置与角色当前位置一致 -> 强制 Face 模式
    if (playerLocation.value === currentLocation.value) {
        interactionMode.value = 'face';
    } else {
        interactionMode.value = 'phone';
    }

    // 4. 保存到数据库
    saveCharacterState();

    // 5. 关闭弹窗
    showForceLocationPanel.value = false;
    uni.showToast({ title: `已修正为: ${targetName}`, icon: 'none' });
};

const saveHistory = async (msg) => {
    if (!chatId.value) return;
    
    // 🛠️ 兼容性处理：如果没有传 msg，则自动取 messageList 的最后一条
    const targetMsg = msg || (messageList.value.length > 0 ? messageList.value[messageList.value.length - 1] : null);
    if (!targetMsg) return;

    try {
        // 1. 物理保存到 SQLite 数据库
        await DB.execute(
            `INSERT OR REPLACE INTO messages (id, chatId, role, content, type, isSystem, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                targetMsg.id || (Date.now() + Math.random()), // 确保有ID
                String(chatId.value), 
                targetMsg.role, 
                targetMsg.content, 
                targetMsg.type || 'text', 
                targetMsg.isSystem ? 1 : 0, 
                Date.now()
            ]
        );

        // 2. 🌟 同步更新列表页预览 (Index 页面显示用)
        let list = uni.getStorageSync('contact_list') || [];
        const index = list.findIndex(item => String(item.id) === String(chatId.value));
        if (index !== -1) {
            // 设置预览文字
            list[index].lastMsg = targetMsg.isSystem ? `[系统] ${targetMsg.content}` : targetMsg.content;
            list[index].lastTime = "刚刚"; 
            uni.setStorageSync('contact_list', list);
        }
        
        // console.log('💾 [DB] 消息已保存且预览已更新');
    } catch (e) {
        console.error('❌ 数据库保存失败', e);
    }
};

const getCurrentLlmConfig = () => {
    const schemes = uni.getStorageSync('app_llm_schemes') || [];
    const idx = uni.getStorageSync('app_current_scheme_index') || 0;
    return (schemes.length > 0 && schemes[idx]) ? schemes[idx] : uni.getStorageSync('app_api_config');
};

const saveCharacterState = (newTime, newSummary, newLocation, newClothes, newMode)=> {

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
            // 🗑️ 移除: 好感度/欲望值 (已废弃)
            // item.affection = currentAffection.value;
            // item.lust = currentLust.value;
            item.lastTimeTimestamp = currentTime.value;
            item.summary = currentSummary.value;
            // 🌟 核心改动：保存玩家位置
            item.playerLocation = playerLocation.value;
            item.currentLocation = currentLocation.value;
            item.clothing = currentClothing.value;
			item.currentAction = currentAction.value;
            item.interactionMode = interactionMode.value;
            item.lastActivity = currentActivity.value;
            item.relation = currentRelation.value;
            // ✨ 保存进化状态
            if (!item.settings) item.settings = {};
            item.settings.evolutionLevel = evolutionLevel.value;

            uni.setStorageSync('contact_list', list);
        }
    }
};


const previewImage = (url) => { uni.previewImage({ urls: [url] }); };
const onDateChange = (e) => { tempDateStr.value = e.detail.value; }; 
const onTimeChange = (e) => { tempTimeStr.value = e.detail.value; }; 


// --- 变量定义 ---
const isEditMode = ref(false);
const selectedIds = ref([]);

// --- 逻辑方法 ---

// 进入编辑模式并默认选中当前长按的消息
const enterEditMode = (msg) => {
    if (isLoading.value) return;
    isEditMode.value = true;
    selectedIds.value = [msg.id];
    uni.vibrateShort(); // 震动反馈
};

// 切换选择
const toggleSelect = (msg) => {
    const index = selectedIds.value.indexOf(msg.id);
    if (index > -1) {
        selectedIds.value.splice(index, 1);
        if (selectedIds.value.length === 0) isEditMode.value = false; // 选完了自动退出
    } else {
        selectedIds.value.push(msg.id);
    }
};

// 取消编辑
const cancelEdit = () => {
    isEditMode.value = false;
    selectedIds.value = [];
};

// 执行删除
const confirmDelete = () => {
    uni.showModal({
        title: '物理删除',
        content: '确定要从数据库中永久抹除这些记忆吗？',
        success: async (res) => {
            if (res.confirm) {
                // 1. 内存删除
                messageList.value = messageList.value.filter(m => !selectedIds.value.includes(m.id));
                // 2. 数据库删除
                const ids = selectedIds.value.map(id => `'${id}'`).join(',');
                await DB.execute(`DELETE FROM messages WHERE id IN (${ids})`);
                
                cancelEdit();
                uni.showToast({ title: '已物理抹除', icon: 'success' });
            }
        }
    });
};
// ==================================================================================
// 3. 🧩 初始化各大逻辑模块
// ==================================================================================
const { 
    currentTime, formattedTime, 
    timeRatio, tempTimeRatio,
    showTimePanel, showTimeSettingPanel, tempDateStr, tempTimeStr, customMinutes,
    startTimeFlow, stopTimeFlow, handleTimeSkip: _handleTimeSkip, 
    confirmManualTime: _confirmManualTime  // 👈 改这里：重命名
} = useGameTime(saveCharacterState);
// ✨ 新增：在UI层拆分时间，不改动 useGameTime.js 底层逻辑
const timeParts = computed(() => {
    if (!formattedTime.value) return { week: '--', time: '--:--' };
    // 假设 formattedTime 格式为 "周X HH:mm"
    const parts = formattedTime.value.split(' ');
    return { week: parts[0] || '', time: parts[1] || '' };
});

const { handleAsyncImageGeneration, retryGenerateImage } = useChatGallery({
    currentRole, interactionMode, userAppearance, 
    messageList, chatId, chatName, saveHistory, scrollToBottom
});

const confirmManualTime = async () => {
    // 1. 调用底层修改时间
    const newTime = _confirmManualTime();

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
    showLocationPanel, customLocation, 
    locationList, checkIsWorking, calculateMoveResult 
} = useGameLocation({ currentRole, userHome, charHome, currentTime, worldLocations });

// ✨ 修复顺序：先定义 Evolution，再传给 Agents
const { executeEvolution, isEvolving } = useEvolution(); 

const {
    runSceneCheck, runRelationCheck, runVisualDirectorCheck, runCameraManCheck, 
    checkAndRunSummary, runDayEndSummary,isArchiving,
    checkHistoryRecall ,fetchActiveMemoryContext,retryAgentGeneration,isSceneAnalyzing
} = useAgents({chatId,
    messageList, currentRole, chatName, currentLocation, currentClothing, currentAction,
    interactionMode, currentRelation, 
    currentActivity, formattedTime, playerLocation,
    enableSummary, summaryFrequency, currentSummary,
    saveCharacterState, saveHistory, scrollToBottom, getCurrentLlmConfig, handleAsyncImageGeneration,userAppearance,
    executeEvolution // ✨ 现在可以安全传入了
});

const handleTimeSkip = async (type, customVal) => {
    // 适配 ChatModals 回传的 customVal
    if (type === 'custom' && customVal) {
        customMinutes.value = customVal;
    }

    // 1. 调用底层时间逻辑修改时间
    const isNextDay = _handleTimeSkip(type, messageList, scrollToBottom);
    
    // 2. 构建给 AI 的提示语
    let skipDesc = "";
    switch(type) {
        case 'morning': skipDesc = "一上午过去了"; break;
        case 'afternoon': skipDesc = "一下午过去了"; break;
        case 'night': skipDesc = "一晚上过去了"; break;
        case 'day': skipDesc = "一天过去了"; break;
        case 'custom': skipDesc = `${customMinutes.value}分钟过去了`; break;
    }

    // 3. 将时间流逝上屏（系统消息）
    messageList.value.push({
        role: 'system',
        content: `⏳ ${skipDesc}... 当前时间为 ${formattedTime.value}`,
        isSystem: true
    });

    // 4. 通知 AI 时间变化，让它根据新时间点产生反应
    const timePrompt = `[SYSTEM EVENT: TIME_SKIP]\n**Action**: ${skipDesc}.\n**New Time**: ${formattedTime.value}.\n**Instruction**: 考虑到时间的流逝，请根据当前时间点（是否该吃饭、睡觉、上班等）自然地继续对话或发起新话题。`;
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
    if (isLoading.value) return uni.showToast({ title: '对话进行中...', icon: 'none' });
    if (locObj.type === 'custom' && !locObj.name) return uni.showToast({ title: '请输入地点', icon: 'none' });

    const result = calculateMoveResult(locObj);
    
    console.log('🚶 [移动监控] -------------------------------------------------');
    console.log(`📍 玩家地点: "${result.playerLocation}"`);
    console.log(`📍 角色地点: "${result.aiLocation}"`);
    console.log(`🔄 模式切换: ${result.newMode === 'face' ? '🥰 当面' : '📱 手机'}`);
    if (result.shouldNotifyAI) console.log(`🤖 触发剧情: "${result.promptAction}"`);
    console.log('-----------------------------------------------------------');

    // 🌟 核心改动：更新双方地点
    playerLocation.value = result.playerLocation;
    currentLocation.value = result.aiLocation;
    
    interactionMode.value = result.newMode;
    showLocationPanel.value = false;
    uni.vibrateShort();
    saveCharacterState();

    if (result.shouldNotifyAI) {
        messageList.value.push({ role: 'system', content: `🚗 ${result.sysMsgUser}`, isSystem: true });
        // 🌟 核心改动：在 Prompt 中明确双地点
        const movePrompt = `[SYSTEM EVENT: SCENE CHANGE]\n**Action**: ${result.promptAction}\n**Character Location**: ${result.aiLocation}\n**Player Location**: ${result.playerLocation}\n**New Mode**: ${result.newMode === 'face' ? 'FACE-TO-FACE' : 'PHONE'}.\n**Time**: ${formattedTime.value}.\n**Instruction**: React naturally to this movement logic.`;
        sendMessage(false, movePrompt);
    } else {
        uni.showToast({ title: result.sysMsgUser, icon: 'none', duration: 2500 });
    }
};
// AiChat/pages/chat/chat.vue

const handleRetry = async (msg) => {
    // 1. 防抖：防止重复点击
    if (msg.content.includes('重试中') || msg.isRetrying) return;
    
    uni.vibrateShort();

    // 2. 分流处理
    if (msg.isLogicError) {
        // 情况 A: 逻辑/Agent 重试
        uni.showToast({ title: '正在重构思路...', icon: 'none' });
        await retryAgentGeneration(msg);
    } else if (msg.isError || msg.originalPrompt) {

        retryGenerateImage(msg);
    } else {
        // 旧的图片加载失败重试逻辑
        try {
           await retryGenerateImage(msg);
        } catch (e) { console.error(e); }
    }
};

// --- 新增: 图片加载失败兜底 (可选) ---
// 如果 ComfyUI 返回了 URL 但图片实际无法加载，也视为失败
const handleImageLoadError = (msg) => {
    // 只有当不是本地临时路径且没报错时才标记
    if (msg.content && !msg.hasError) {
        msg.hasError = true; 
        // 强制更新视图
        messageList.value = [...messageList.value];
    }
};
// ==================================================================================
// 5. 核心：消息发送与 AI 处理
// ==================================================================================

const processAIResponse = async (rawText) => {
    // 基础判空
    if (!rawText) return;

    // =========================================================================
    // 🧠 1. 心理活动提取与分流逻辑 (新增)
    // =========================================================================
    let thinkContent = "";
    let mainContent = rawText; // 默认为原始内容
    
    // 正则提取 <think>...</think>
    const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) {
        thinkContent = thinkMatch[1].trim(); 
        // 移除思考标签，保留纯正文给后续气泡处理
        mainContent = rawText.replace(/<think>[\s\S]*?<\/think>/i, '').trim(); 
    }

    // 🚦【开关判断】
    if (showThought.value && thinkContent) {
        // [方案二]: 如果开关开启，且有心声，则显示为特殊气泡
        const thinkMsg = {
            id: Date.now() + Math.random(),
            role: 'model',
            type: 'think', // ✨ 标记为思考类型
            content: `💭 ${thinkContent}`,
            isSystem: true // 复用系统消息的布局基础
        };
        messageList.value.push(thinkMsg);
        await saveHistory(thinkMsg);
    } 

    if (mainContent) {
            // ✨✨✨ 【智能粘合逻辑】 ✨✨✨
            
            // 🧬 进化系统：不再通过进度条积累，完全依赖 Gatekeeper
            // const progressDelta = calculateProgress(messageList.value);
            // evolutionProgress.value = ... 
            
            saveCharacterState(); // 保存进度

            let formattedText = mainContent
                // 步骤1：先标准化换行符
                .replace(/(\r\n|\r)/g, '\n')
                
              
                .replace(/([）\)])\s*\n\s*([“"‘])/g, '$1\n$2')
                
                // 步骤3：处理剩下的孤立换行符 (把连续换行合并为一个切割符)
                .replace(/\n+/g, '|||');
                
            // 步骤4：切割
            const parts = formattedText.split('|||');
             
            for (const part of parts) {
                 let cleanPart = part.trim();
                 // 过滤空消息
                 if (cleanPart && (messageList.value.length === 0 || messageList.value[messageList.value.length - 1].content !== cleanPart)) {
                     const newMsg = {
                         id: Date.now() + Math.random(),
                         role: 'model', 
                         content: cleanPart 
                     };
                     messageList.value.push(newMsg);
                     await saveHistory(newMsg);
                 }
            }
        }
        
        scrollToBottom();
    
    // =========================================================================
    // 📊 3. 对话与状态监控日志 (完全保留原逻辑，使用 rawText 供 Agent 分析)
    // =========================================================================
    if (rawText) {
        let lastUserMsg = "";
        for (let i = messageList.value.length - 2; i >= 0; i--) {
            // 兼容识别 role 为 user 的消息或包含“拍”字的 system 消息
            const m = messageList.value[i];
            if (m.role === 'user' || (m.isSystem && m.content.includes('拍'))) { 
                lastUserMsg = m.content; 
                break; 
            }
        }
        
        console.log('--- 💬 对话监控 ------------------------------------------');
        // console.log(`🗣️ [玩家]: ${lastUserMsg}`);
        // console.log(`🤖 [角色(RAW)]: ${rawText}`); // 这里打印包含 <think> 的原始内容，方便调试
        console.log('--- 📊 角色状态快照 ---------------------------------------');
        // console.log(`📍 地点: ${currentLocation.value}`);
        console.log(`💃 动作: ${currentAction.value}`);
        console.log(`👗 服装: ${currentClothing.value}`);
        console.log(`❤️ 关系: ${currentRelation.value} `);
        console.log(`📅 时间: ${formattedTime.value}`);
        console.log(`📱 模式: ${interactionMode.value === 'phone' ? '手机聊天' : '当面互动'}`);
        console.log('-----------------------------------------------------------');
		// 👇👇👇 【新增】纯净版剧本日志 👇👇👇
		console.log('\n📖 ================= [ 当前剧本回放 ] ================= 📖');
		messageList.value.forEach((msg, index) => {
		    // 1. 跳过不想看的系统提示（比如生图的loading，或者时间流逝提示），只看对话
		    // 如果你想看所有系统消息，注释掉下面这行
		    // if (msg.isSystem && msg.content.includes('显影中')) return;
		
		    // 2. 格式化角色名
		    let roleName = '';
		    let emoji = '';
		    
		    if (msg.role === 'user') {
		        roleName = '我';
		        emoji = '🗣️';
		    } else if (msg.role === 'model' || msg.role === 'assistant') {
		        roleName = chatName.value; // AI名字
		        emoji = '🌸';
		    } else {
		        roleName = '系统';
		        emoji = '⚙️';
		    }
		
		    // 3. 格式化内容 (去除 <think> 标签，让阅读更流畅)
		    let cleanContent = msg.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
		    if (!cleanContent) cleanContent = "(心理活动/空)";
		
		    // 4. 打印一行
		    // console.log(`${emoji} [${roleName}]: ${cleanContent}`);
		});
		console.log('📖 ======================================================\n');

    
        
                setTimeout(() => {
                    console.log('🚦 [后台导演] 并行流水线启动...');
        
                    // 轨道 A: 关系与记忆
                    runRelationCheck(lastUserMsg, rawText); 
                    checkAndRunSummary(); 
        
                    // 轨道 B: 场景与生图 (并行化)
                    // 1. 启动场景分析 (并不再阻塞)
                    const sceneCheckPromise = runSceneCheck(lastUserMsg, rawText);

                    if (lastUserMsg.includes('快门已按下') || lastUserMsg.includes('User took a photo')) {
                        console.log('🛑 [导演] 检测到手动快门的回响，跳过自动生图。');
                        return;
                    }
                    // =========================================================
        
                    // 2. 启动生图判定
                    let isCameraAction = lastUserMsg.includes('SNAPSHOT') || lastUserMsg.includes('SHUTTER') || lastUserMsg.includes('快门');
                    
                    if (isCameraAction) {
                        // 手动拍照：为了保证地点/服装准确，我们最好还是等待场景分析完成
                        // 但我们可以选择让用户感觉更快，或者保证准确性。
                        // 这里选择等待，因为手动拍照没有 Gatekeeper 耗时可以抵消。
                        sceneCheckPromise.then(() => {
                             runCameraManCheck(lastUserMsg, rawText);
                        });
                    } else {
                        // 自动生图：将场景分析的 Promise 传递进去，实现并行 Gatekeeper
                        runVisualDirectorCheck(lastUserMsg, rawText, null, sceneCheckPromise);
                    }
                    
                }, 500);
    }
};

const sendMessage = async (isContinue = false, systemOverride = '') => {
    // 1. 基础校验 (保持不变)
    if (!isContinue && !inputText.value.trim() && !systemOverride) return;
    if (isLoading.value) return;
    const config = getCurrentLlmConfig();
    if (!config || !config.apiKey) return uni.showToast({ title: '请配置模型', icon: 'none' });
    
    let userMsgForRecall = inputText.value;

    // 2. 处理用户输入与系统指令上屏 (保持不变)
    if (!isContinue) {
        if (inputText.value.trim()) { 
            console.log(`🚀 [发送消息]: ${inputText.value}`);
            const userMsg = { 
                 id: Date.now() + Math.random(),
                 role: 'user', 
                 content: inputText.value 
            };
            messageList.value.push(userMsg); 
            inputText.value = ''; 
            
            // ✅ 关键修复：用户发消息也要 await 保存，防止发完立刻退出导致用户消息丢失
            await saveHistory(userMsg);
        } 
        else if (systemOverride && (systemOverride.includes('SNAPSHOT') || systemOverride.includes('SHUTTER') || systemOverride.includes('快门'))) { 
            // 🛠️ 只要系统指令包含 '快门'，就会触发图标上屏
            console.log(`⚙️ [系统触发]: ${systemOverride.slice(0, 50)}...`);
            const sysMsg = { 
                role: 'system', 
                content: '📷 (你举起手机拍了一张)', 
                isSystem: true 
            };
            messageList.value.push(sysMsg); 
            
            // ✅ 关键修复：系统动作也要 await 保存
            await saveHistory(sysMsg);
        }
    }

    scrollToBottom(); 
    isLoading.value = true; 
    // saveHistory(); ❌ [已删除] 删掉这行，因为上面已经针对性存过了
    
    const appUser = uni.getStorageSync('app_user_info') || {};
    if (appUser.name) userName.value = appUser.name;

    // 3. ✨✨✨ 记忆系统逻辑 (双轨制) ✨✨✨
    
    // 轨道 A: 被动检索 (Passive - 针对特定关键词的往事)
    let recallDetail = null;
    if (!isContinue && !systemOverride && userMsgForRecall) {
        recallDetail = await checkHistoryRecall(userMsgForRecall);
    }

    // 轨道 B: 主动显性记忆 (Active - 注入最近几天的印象)
    // 🆕 新增逻辑
    let activeMemory = "";
    try {
        activeMemory = await fetchActiveMemoryContext();
        if (activeMemory) console.log("🧠 [Active Memory] 已注入短期记忆上下文");
    } catch (e) { console.error("Active memory error:", e); }

    // 4. 构建 Prompt (保持不变)
    const prompt = buildSystemPrompt({
        role: currentRole.value || {}, userName: userName.value, summary: currentSummary.value,
        formattedTime: formattedTime.value, location: currentLocation.value, mode: interactionMode.value,
        activity: currentActivity.value, clothes: currentClothing.value, relation: currentRelation.value
    });
	
	// // 🔥🔥🔥【新增】打印 System Prompt 到控制台 🔥🔥🔥
	//     console.log('============== [System Prompt 搅拌日志] ==============');
	//     console.log('📍 [动态状态]');
	//     console.log(`- 时间: ${formattedTime.value}`);
	//     console.log(`- 地点: ${currentLocation.value}`);
	//     console.log(`- 关系: ${currentRelation.value}`);
	//     console.log('📜 [最终生成的 Prompt]');
	//     console.log(prompt); 
	//     console.log('====================================================');
	//     // 🔥🔥🔥【新增结束】🔥🔥🔥
		
    const historyLimit = charHistoryLimit.value; 
    let contextMessages = messageList.value.filter(msg => !msg.isSystem && msg.type !== 'image');
    if (historyLimit > 0) contextMessages = contextMessages.slice(-historyLimit);
    
    // 基础消息清洗
    const cleanHistoryForAI = contextMessages.map(item => ({ 
        role: item.role === 'user' ? 'user' : 'assistant', 
        content: item.content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\[.*?\]/gi, '').trim() 
    })).filter(m => m.content);

    // ✨ 注入: 短期显性记忆 (放在历史记录最前面，作为背景知识)
    if (activeMemory) {
        cleanHistoryForAI.unshift({
            role: 'system',
            content: activeMemory
        });
    }

    // ✨ 注入: 检索到的日记细节 (放在最后，作为针对性提示)
    if (recallDetail) {
        cleanHistoryForAI.push({ 
            role: 'system', 
            content: `[Recall Detail]: The following is a detailed diary entry of the past event user mentioned: "${recallDetail}". Use this to answer correctly.` 
        });
    }

    if (systemOverride) cleanHistoryForAI.push({ role: 'user', content: systemOverride });
    
    // =========================================================================
    // 🔥 核心逻辑：稳定版并行请求 (保持不变)
    // =========================================================================
    try {
        // 1. 发起请求
        const rawText = await LLM.chat({ 
            config, 
            messages: cleanHistoryForAI, 
            systemPrompt: prompt, 
            temperature: 0.8, 
            maxTokens: 1500
        });
   
        if (rawText) {
            // ✅ 关键修复：这里必须加 await，等待 processAIResponse 里的数据库写入全部完成
            // 只有这样，finally 里的 isLoading = false 才会等到数据存完才执行
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




// pages/chat/chat.vue

// 📸 1. 明拍模式 (100% 有快门声，强交互)
const handleCameraSend = async () => {
    if (interactionMode.value !== 'face') return uni.showToast({ title: '非见面模式无法拍照', icon: 'none' });

    // UI 反馈
    messageList.value.push({ role: 'system', content: '📸 咔嚓！(你大方地按下了快门)', isSystem: true });
    scrollToBottom();
    
    // 动作同步等待 (复用之前的逻辑)
    await waitForActionSync(); 

    // 调用摄影师
    await runCameraManCheck("System: Shutter Pressed", "");

    // ⚡️ 核心差异：强制有声
    const soundContext = "(随着“咔嚓”一声清晰的快门声，你大方地拍了一张照片，她肯定听到了)";
    
    // 发送剧本
    sendCameraReactionPrompt(soundContext);
};

// 👁️ 2. 偷拍模式 (静音，观察视角)
const handleStealthCameraSend = async () => {
    if (interactionMode.value !== 'face') return uni.showToast({ title: '非见面模式无法偷拍', icon: 'none' });

    // UI 反馈 (提示词不同)
    messageList.value.push({ role: 'system', content: '👁️ (你悄悄按下了拍摄键...)', isSystem: true });
    scrollToBottom();

    // 动作同步等待
    await waitForActionSync();

    // 调用摄影师
    await runCameraManCheck("System: Shutter Pressed", "");

    // ⚡️ 核心差异：强制静音 + 强调未察觉
    const soundContext = "(你趁她不注意，完全静音地抓拍了一张。她似乎完全没有察觉，依然沉浸在自己的事情中)";
    
    // 发送剧本
    sendCameraReactionPrompt(soundContext);
};

// 🛠️ 提取出来的公共等待函数 (保持代码整洁)
const waitForActionSync = async () => {
    if (isSceneAnalyzing && isSceneAnalyzing.value) {
        console.log('🚧 [Camera] 动作分析未完成，挂起...');
        let timeout = 50; 
        while (isSceneAnalyzing.value && timeout > 0) {
            await new Promise(r => setTimeout(r, 200));
            timeout--;
        }
    }
};

// 🛠️ 提取出来的公共发送函数
const sendCameraReactionPrompt = (soundContext) => {
    const cameraPrompt = CAMERA_REACTION_PROMPT
        .replace('{{current_action}}', currentAction.value || "站立")
        .replace('{{sound_context}}', soundContext)
        .replace('{{current_relation}}', currentRelation.value || "普通关系");
    
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
   
        currentTime.value = target.lastTimeTimestamp || Date.now();
        currentClothing.value = target.clothing || '便服';
        charHome.value = target.location || '角色家';
        userHome.value = target.settings?.userLocation || '玩家家';
        userAppearance.value = target.settings?.userAppearance || '';

        // 1. 加载双方位置
        playerLocation.value = target.playerLocation || userHome.value;
        currentLocation.value = target.currentLocation || charHome.value;

        // 🌟 核心修复逻辑 🌟
        // 判定条件：如果“没有存模式” OR “两人位置完全相同”，则重新计算模式
        if (!target.interactionMode || playerLocation.value === currentLocation.value) {
            // 如果位置相同，强制 face；否则默认为 phone
            interactionMode.value = (playerLocation.value === currentLocation.value) ? 'face' : 'phone';
        } else {
            // 位置不同且有存档，才信任存档
            interactionMode.value = target.interactionMode;
        }
		currentAction.value = target.currentAction || '站立/闲逛';
        currentActivity.value = target.lastActivity || '自由活动';
        currentRelation.value = target.relation || '初相识';
        enableSummary.value = target.enableSummary || false;
        summaryFrequency.value = target.summaryFrequency || 20;
        currentSummary.value = target.summary || "";
        charHistoryLimit.value = target.historyLimit || 20;
        
        // ✨ 加载进化状态
        if (target.settings) {
            evolutionLevel.value = target.settings.evolutionLevel || 1;
        }

        // 加载世界观地点
        const allWorlds = uni.getStorageSync('app_world_settings') || [];
        const myWorld = allWorlds.find(w => String(w.id) === String(target.worldId));
        
        if (myWorld && myWorld.locations && myWorld.locations.length > 0) {
            worldLocations.value = myWorld.locations.map(loc => ({
                name: loc,
                icon: '📍'
            }));
            console.log(`🌍 [Worldview] 已加载世界 "${myWorld.name}" 的 ${worldLocations.value.length} 个地点`);
        } else {
            const globalLocs = uni.getStorageSync('app_world_locations');
            if (globalLocs) {
                worldLocations.value = globalLocs;
            } else {
                worldLocations.value = [{ name: '学校', icon: '🏫' }, { name: '公司', icon: '🏢' }];
            }
        }
		// 👇👇👇【新增：加载衣柜数据】👇👇👇
		        const savedWardrobe = uni.getStorageSync(`wardrobe_data_${id}`);
		        if (savedWardrobe && Array.isArray(savedWardrobe)) {
		            wardrobeList.value = savedWardrobe;
		            console.log(`👗 已加载衣柜数据: ${savedWardrobe.length} 套`);
		        } else {
		            wardrobeList.value = [];
		        }
    }
};

onShow(() => {
	applyNativeTheme();
    // 修正：不再在 onShow 里直接覆盖 worldLocations，全部逻辑交由 loadRoleData 处理
    if (chatId.value) {
        loadRoleData(chatId.value);
        scrollToBottom();
        startTimeFlow();
        setTimeout(() => checkProactiveGreeting(), 1000);
    }
});

onLoad(async(options) => {
    const appUser = uni.getStorageSync('app_user_info');
    if (appUser) {
        if (appUser.name) userName.value = appUser.name;
        if (appUser.avatar) userAvatar.value = appUser.avatar;
    }
    if (options.id) {
            chatId.value = options.id;
            loadRoleData(options.id);
            
            // ❌ 旧代码：const history = uni.getStorageSync(...)
            // ✅ 新代码：从 SQLite 异步加载该角色的历史消息
            try {
                const history = await DB.select(
                    `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC`,
                    [String(options.id)]
                );
                if (history && history.length > 0) {
                    // 将数据库的 0/1 转回布尔值
                    messageList.value = history.map(m => ({
                        ...m,
                        isSystem: !!m.isSystem
                    }));
                }
            } catch (e) {
                console.error('加载数据库历史失败', e);
            }
        }
});
const clearHistoryAndReset = () => {
    uni.showModal({
        title: '彻底重置', content: '确定重置对话与位置吗？',
        success: (res) => {
            if (res.confirm) {
                // 🌟 核心改动：重置为初始家宅位置
                playerLocation.value = userHome.value;
                currentLocation.value = charHome.value;
                // 自动判定重置后的模式
                interactionMode.value = (playerLocation.value === currentLocation.value) ? 'face' : 'phone';

                messageList.value = [];
                saveCharacterState();
                uni.removeStorageSync(`chat_history_${chatId.value}`);
                uni.navigateBack();
            }
        }
    });
};


onHide(() => { stopTimeFlow(); saveCharacterState(); });
onUnload(() => { stopTimeFlow(); saveCharacterState(); });

onNavigationBarButtonTap((e) => {
    if (e.key === 'setting') uni.navigateTo({ url: `/pages/create/create?id=${chatId.value}` });
});

// --- 新增：Modal 统一管理 ---
const activeModal = computed(() => {
  if (showTimePanel.value) return 'timeSkip';
  if (showTimeSettingPanel.value) return 'timeSetting';
  if (showLocationPanel.value) return 'location';
  if (showForceLocationPanel.value) return 'forceLocation';
  if (showWardrobePanel.value) return 'wardrobe'; // ✨ 新增
  return '';
});

const closeModal = () => {
  showTimePanel.value = false;
  showTimeSettingPanel.value = false;
  showLocationPanel.value = false;
  showForceLocationPanel.value = false;
  showWardrobePanel.value = false; // ✨ 新增
};

// --- 衣柜逻辑 ---
const handleWardrobeUpdate = (newList) => {
    wardrobeList.value = newList;
    // 持久化保存
    if (chatId.value) {
        uni.setStorageSync(`wardrobe_data_${chatId.value}`, newList);
    }
};

const handleApplyOutfit = (outfit) => {
    if (!outfit) return;
    
    // 1. 生成描述字符串
    const items = outfit.items || {};
    const parts = [];
    if (items.head) parts.push(`头饰: ${items.head}`);
    if (items.top) parts.push(`上装: ${items.top}`);
    if (items.bottom) parts.push(`下装: ${items.bottom}`);
    if (items.socks) parts.push(`袜子: ${items.socks}`);
    if (items.shoes) parts.push(`鞋子: ${items.shoes}`);
    if (items.accessory) parts.push(`配饰: ${items.accessory}`);
    
    const desc = `${outfit.name} (${parts.join(', ')})`;
    
    // 2. 更新当前状态
    currentClothing.value = desc;
    
    // ✨ 保存英文 Tags (如果有)
    if (outfit.tags) {
        if (!currentRole.value.settings) currentRole.value.settings = {};
        currentRole.value.settings.clothingTags = outfit.tags;
    } else {
        // 如果没有 Tags，清空旧的防止混淆
        if (currentRole.value.settings) delete currentRole.value.settings.clothingTags;
    }

    saveCharacterState();
    
    // 3. 构造玩家建议 (而非强制系统指令)
    // 这样既增加了代入感，又避免了系统指令可能触发的奇怪逻辑(如自动拍照)
    // 注意：不包含"拍"等关键词，避免触发 runCameraManCheck
    const suggestion = `(你从衣柜中找出${outfit.name}递给她) "试试这套衣服怎么样？"`;
    inputText.value = suggestion;

    // 4. 发送消息 (false代表不是continue，由sendMessage内部处理inputText)
    sendMessage(false);
    
    // 5. 关闭面板
    showWardrobePanel.value = false;
    // uni.showToast({ title: `已建议换装`, icon: 'none' });
};

</script>

<style lang="scss" scoped>
/* 
   重构后：大部分样式已移至子组件
   仅保留页面级布局和全局变量容器
*/

.chat-container { 
    display: flex; 
    flex-direction: column; 
    height: 100vh; 
    background-color: var(--bg-color); /* 全局背景 */
    overflow: hidden; 
}

/* 聊天滚动区 */
.chat-scroll { flex: 1; overflow: hidden; }
.chat-content { padding: 20rpx; padding-bottom: 240rpx; }

.system-tip { 
    text-align: center; 
    color: var(--text-sub); 
    font-size: 24rpx; margin-bottom: 30rpx; 
}

.loading-wrapper { display: flex; justify-content: center; margin-bottom: 20rpx; }
.loading-dots { color: var(--text-sub); font-weight: bold; }

/* 归档中提示条 */
.archiving-bar {
  position: absolute; top: 0; left: 0; right: 0;
  background: rgba(0,0,0,0.7);
  color: #fff;
  z-index: 9999;
  text-align: center;
  padding: 10rpx;
  font-size: 24rpx;
}
</style>