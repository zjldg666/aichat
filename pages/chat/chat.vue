<template>
  <view class="chat-container" :class="{ 'in-edit-mode': isEditMode, 'dark-mode': isDarkMode }">
    <view v-if="isArchiving" class="archiving-bar">
            <text class="archiving-text">🌙 整理中... 请勿退出</text>
        </view>
	<ChatHeader 
      :interactionMode="interactionMode"
      :currentLocation="currentLocation"
      :currentActivity="currentActivity"
      :playerLocation="playerLocation"
      :timeParts="timeParts"
	  @clickPlayer="activeModal = 'forceLocation'"
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

	<ChatFooter
		v-model="inputText"
		:isEditMode="isEditMode"
		:selectedCount="selectedIds.length"
		:isToolbarOpen="isToolbarOpen"
		:wakeTime="wakeTime"
		:showThought="showThought"
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
		
    <view class="phone-fab" @click="showPhone = true">
          <text class="fab-icon">📱</text>
        </view>
    
        <GamePhone 
          :visible="showPhone"
          :world-id="currentRole?.worldId"
          :current-chat-id="chatId"
          @close="showPhone = false"
        />
		
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
import { ref, computed, nextTick, watch } from 'vue';
import { onLoad, onShow, onHide, onUnload, onNavigationBarButtonTap } from '@dcloudio/uni-app';
import { DB } from '@/utils/db.js';
import { LLM } from '@/services/llm.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';
import GamePhone from '@/components/GamePhone.vue';
import { useGameTime } from '@/composables/useGameTime.js';
import { useChatGallery } from '@/composables/useChatGallery.js';
import { useGameLocation } from '@/composables/useGameLocation.js';
import { useAgents } from '@/composables/useAgents.js';
// ... existing imports
import { useTheme } from '@/composables/useTheme.js'; // 导入
// 在 <script setup> 顶部引入
import { useWorldScheduler } from '@/composables/useWorldScheduler.js';
import ChatHeader from '@/components/ChatHeader.vue';
import ChatFooter from '@/components/ChatFooter.vue';
import ChatModals from '@/components/ChatModals.vue';
import ChatMessageItem from '@/components/ChatMessageItem.vue';
// 在 setup 内部初始化
const { tickWorldState } = useWorldScheduler();

const { isDarkMode, applyNativeTheme } = useTheme();
import { 
    CORE_INSTRUCTION_LOGIC_MODE,
    TIME_SHIFT_PROMPT // 👈 新增引入这个
} from '@/utils/prompts.js';
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
// 角色状态
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
// 🌟 新增：玩家当前位置
const playerLocation = ref('加载中...');

// 记忆与设置
const currentSummary = ref('');
const enableSummary = ref(false);
const summaryFrequency = ref(20);
const charHistoryLimit = ref(20);
// --- 🛌 睡觉相关状态 ---
const wakeTime = ref('08:00'); // 默认睡到早上 8 点

// UI 状态

const isToolbarOpen = ref(false); 
const worldLocations = ref([]); 
const activeModal = ref('');
// 🔥🔥🔥 插入这段代码：联动修复时间弹窗空白问题 🔥🔥🔥
watch(() => activeModal.value, (val) => {
    // 当 UI 打开时间设置弹窗时，告诉 useGameTime 准备数据
    if (val === 'timeSetting') {
        showTimeSettingPanel.value = true;
    }
});
const toggleToolbar = () => { isToolbarOpen.value = !isToolbarOpen.value; };


// --- 🔧 手动实现长按防误触逻辑 ---
const touchTimer = ref(null);
const touchStartPosition = ref({ x: 0, y: 0 });
const isLongPressTriggered = ref(false); // 标记是否已经触发了长按

// 1. 手指按下
const handleTouchStart = (msg, e) => {
    if (isEditMode.value) return; // 如果已经是编辑模式，不处理
    if (e.touches.length > 1) return; // 忽略多指触控

    // 记录起始位置
    touchStartPosition.value = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY
    };
    isLongPressTriggered.value = false;

    // 开启计时器：设定 800ms 后触发 (比默认的 500ms 长，防误触效果好)
    touchTimer.value = setTimeout(() => {
        enterEditMode(msg);
        isLongPressTriggered.value = true; // 标记已触发，防止松手时触发点击或其他逻辑
    }, 800); 
};

// 2. 手指移动
const handleTouchMove = (e) => {
    if (!touchTimer.value) return;

    // 计算移动距离
    const moveX = e.touches[0].pageX;
    const moveY = e.touches[0].pageY;
    const diffX = Math.abs(moveX - touchStartPosition.value.x);
    const diffY = Math.abs(moveY - touchStartPosition.value.y);

    // 阈值设定为 10px。如果移动超过 10px，说明用户是在“滑动”而不是“长按”
    if (diffX > 10 || diffY > 10) {
        clearTimeout(touchTimer.value);
        touchTimer.value = null;
    }
};

// 3. 手指离开
const handleTouchEnd = () => {
    // 清除计时器
    if (touchTimer.value) {
        clearTimeout(touchTimer.value);
        touchTimer.value = null;
    }
};

const onTimeSkip = (type, customMin) => {
    // 如果是自定义时间，更新 useGameTime 里的 customMinutes 变量
    if (type === 'custom' && customMin) {
        customMinutes.value = customMin; 
    }
    // 调用原本的逻辑
    handleTimeSkip(type);
    // 关闭弹窗
    activeModal.value = ''; 
};
const scrollToBottom = () => {
    nextTick(() => {
        scrollIntoView.value = '';
        setTimeout(() => { scrollIntoView.value = 'scroll-bottom'; }, 100);
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

	// 4. 更新核心游戏时间
    currentTime.value = newTimestamp;

    // 🔥🔥🔥【新增代码开始】🔥🔥🔥
    // 睡醒了，世界变了！驱动所有 NPC 按照作息移动
    if (currentRole.value && currentRole.value.worldId) {
        tickWorldState(currentTime.value, currentRole.value.worldId);
    }
    
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
        
        console.log('💾 [DB] 消息已保存且预览已更新');
    } catch (e) {
        console.error('❌ 数据库保存失败', e);
    }
};

const getCurrentLlmConfig = () => {
    const schemes = uni.getStorageSync('app_llm_schemes') || [];
    const idx = uni.getStorageSync('app_current_scheme_index') || 0;
    return (schemes.length > 0 && schemes[idx]) ? schemes[idx] : uni.getStorageSync('app_api_config');
};

// AiChat/pages/chat/chat.vue

const saveCharacterState = (newScore, newTime, newSummary, newLocation, newClothes, newMode, newLust) => {
    if (newScore !== undefined) currentAffection.value = Math.max(0, Math.min(100, newScore));
    if (newLust !== undefined) currentLust.value = Math.max(0, Math.min(100, newLust));
    if (newTime !== undefined) currentTime.value = newTime; 
    if (newSummary !== undefined) currentSummary.value = newSummary;
    if (newLocation !== undefined) currentLocation.value = newLocation;
    if (newClothes !== undefined) currentClothing.value = newClothes;

    // 🔥🔥🔥 核心修复：给互动模式加“物理锁” 🔥🔥🔥
    if (newMode !== undefined) {
        // 逻辑校验：如果此时两人的位置不一致，绝对不许变成 face 模式
        // 这能防止后台 Agent 因为 AI 写了句 "回头看你" 就错误地把异地改成当面
        if (newMode === 'face' && playerLocation.value !== currentLocation.value) {
            console.warn(`🛡️ [物理锁] 拦截非法模式变更: 异地(${playerLocation.value} vs ${currentLocation.value}) 不允许 Face 模式`);
            interactionMode.value = 'phone'; // 强制矫正为手机
        } else {
            interactionMode.value = newMode;
        }
    }
    // ------------------------------------------------

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
            item.interactionMode = interactionMode.value; // 保存被锁修正后的值
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

const { 
    currentTime, formattedTime, 
    timeRatio, tempTimeRatio,
    showTimePanel, showTimeSettingPanel, tempDateStr, tempTimeStr, customMinutes,
    startTimeFlow, stopTimeFlow, handleTimeSkip: _handleTimeSkip, 
    confirmManualTime: _confirmManualTime,
    initTimeSync // 🔥🔥🔥 必须加这个
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

const {
    runSceneCheck, runRelationCheck, runVisualDirectorCheck, runCameraManCheck, 
    checkAndRunSummary, runDayEndSummary,isArchiving,
    checkHistoryRecall ,fetchActiveMemoryContext,retryAgentGeneration
} = useAgents({chatId,
    messageList, currentRole, chatName, currentLocation, currentClothing, currentAction,
    interactionMode, currentRelation, currentAffection, // ✨ 确保这里传了好感度 Ref
    currentActivity, formattedTime, playerLocation,
    enableSummary, summaryFrequency, currentSummary,
    saveCharacterState, saveHistory, scrollToBottom, getCurrentLlmConfig, handleAsyncImageGeneration
});

const handleTimeSkip = async (type) => {
    // 1. 调用底层时间逻辑修改时间
    const isNextDay = _handleTimeSkip(type, messageList, scrollToBottom);
    
	// 🔥🔥🔥【新增代码开始】🔥🔥🔥
	    // 时间流逝了，驱动世界运转
	    if (currentRole.value && currentRole.value.worldId) {
	        tickWorldState(currentTime.value, currentRole.value.worldId);
	    }
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
    
    // 1. 获取目标地点名称
    const targetName = typeof locObj === 'object' 
        ? (locObj.detail || locObj.name || '') 
        : locObj;
        
    if (targetName === 'custom' && !customLocation.value) return uni.showToast({ title: '请输入地点', icon: 'none' });
    const finalLocationName = targetName === 'custom' ? customLocation.value : targetName;

    // =================================================================
    // 🔥 A. 实体场景跳转逻辑 (保持你现在的样子，这部分是对的)
    // =================================================================
    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const targetScene = allScenes.find(s => s.name.includes(finalLocationName) || finalLocationName.includes(s.name));

    if (targetScene) {
            console.log(`🌌 [传送] 检测到实体场景 [${targetScene.name}]，准备跳转...`);
            
            uni.showModal({
                title: '前往场景',
                content: `确定前往【${targetScene.name}】吗？`,
                success: (res) => {
                    if (res.confirm) {
                        // 1. 更新玩家位置
                        playerLocation.value = targetScene.name;

                        // 2. 重新计算互动模式 (Mode Recalculation)
                        // 只有当“我去的地方”和“她在的地方”一致时，才是 face
                        if (playerLocation.value === currentLocation.value) {
                             interactionMode.value = 'face';
                             console.log("📍 [模式校准] 同地 -> Face模式");
                        } else {
                             interactionMode.value = 'phone';
                             console.log("📍 [模式校准] 异地 -> Phone模式");
                        }

                        // 3. 保存状态
                        saveCharacterState(); 

                        console.log(`📍 [玩家移动] 玩家已更新位置至: ${targetScene.name} (NPC保持原位)`);

                        // 4. 跳转
                        uni.redirectTo({
                            url: `/pages/scene/chat?id=${targetScene.id}&visitorId=${chatId.value}`
                        });
                        
                        showLocationPanel.value = false;
                    }
                }
            });
            return; 
        }

	// =================================================================
    // 🔥 B. 没找到实体场景 -> 保持私聊模式
    // =================================================================
    const result = calculateMoveResult({ name: finalLocationName, type: locObj.type });
    
    console.log(`📍 [私聊移动] 玩家目标: ${result.playerLocation}`);

    // 1. 更新玩家位置
    playerLocation.value = result.playerLocation;

    // ❌ 删掉这行: currentLocation.value = result.aiLocation; 

    // 2. 手动重新计算模式
    const pLoc = playerLocation.value || "";
    const cLoc = currentLocation.value || "";
    // 模糊匹配判断是否在一起
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
        
        // 🔥🔥🔥 核心修复：根据真实情况生成文案，而不是用 result.sysMsgUser 🔥🔥🔥
        let realSysMsg = "";
        if (isTogether) {
            // 如果在一起
            realSysMsg = `你抵达了 ${pLoc}。${chatName.value} 也在这一带。`;
        } else {
            // 如果异地
            realSysMsg = `你抵达了 ${pLoc}。${chatName.value} 目前在 ${cLoc}。`;
        }

        // 上屏系统消息
        messageList.value.push({ role: 'system', content: `🚗 ${realSysMsg}`, isSystem: true });
        
        // 构建强指令
        const movePrompt = `[SYSTEM EVENT: PLAYER MOVE]\n**Player Action**: Moved to ${playerLocation.value}.\n**Your Location**: ${currentLocation.value} (STAY WHERE YOU ARE).\n**Current Mode**: ${interactionMode.value === 'face' ? 'FACE-TO-FACE' : 'PHONE'}.\n**Instruction**: Do not hallucinate that you moved. Continue current interaction naturally.`;
        
        sendMessage(false, movePrompt);
    } else {
        // 如果只是普通移动且不需要通知 AI（极少情况），还是弹个 Toast 吧
        uni.showToast({ title: `已抵达 ${playerLocation.value}`, icon: 'none' });
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
    // [方案一]: 如果开关关闭 (else)，这里什么都不做，thinkContent 直接被丢弃，mainContent 也不包含它

    // =========================================================================
    // 💬 2. 正文上屏逻辑 (保留你原本的切割与保存逻辑)
    // =========================================================================
    // ⚠️ 注意：这里使用 mainContent (已去除think)，而不是 rawText
    if (mainContent) {
         // 直接对文本进行格式化处理，使其能拆分成多个气泡
         let tempText = mainContent
            .replace(/\n\s*([”"’])/g, '$1')     // 处理引号前的换行
            .replace(/([“"‘])\s*\n/g, '$1')     // 处理引号后的换行
            .replace(/([（\(])/g, '|||$1')      // 在左括号前加切割符
            .replace(/([）\)])/g, '$1|||')      // 在右括号后加切割符
            .replace(/(\r\n|\n|\r)+/g, '|||')   // 将普通换行符转为切割符
            .replace(/(?:\|\|\|)+/g, '|||');    // 合并连续的切割符
            
         // 使用 for...of 循环来支持 await 顺序执行
         const parts = tempText.split('|||');
         
         for (const part of parts) {
             let cleanPart = part.trim();
             // 防止重复添加和空消息
             if (cleanPart && (messageList.value.length === 0 || messageList.value[messageList.value.length - 1].content !== cleanPart)) {
                 const newMsg = {
                     id: Date.now() + Math.random(),
                     role: 'model', 
                     content: cleanPart 
                 };
                 
                 messageList.value.push(newMsg);
                 
                 // ✅ 关键修复：每生成一个气泡，就立即显式保存这一条
                 await saveHistory(newMsg);
             }
         }
    }
    
    // 基础维护 (滚动到底部)
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
        console.log(`🗣️ [玩家]: ${lastUserMsg}`);
        console.log(`🤖 [角色(RAW)]: ${rawText}`); // 这里打印包含 <think> 的原始内容，方便调试
        console.log('--- 📊 角色状态快照 ---------------------------------------');
        console.log(`📍 地点: ${currentLocation.value}`);
        console.log(`💃 动作: ${currentAction.value}`);
        console.log(`👗 服装: ${currentClothing.value}`);
        console.log(`❤️ 关系: ${currentRelation.value} `);
        console.log(`📅 时间: ${formattedTime.value}`);
        console.log(`📱 模式: ${interactionMode.value === 'phone' ? '手机聊天' : '当面互动'}`);
        console.log('-----------------------------------------------------------');

        // 4. 触发 Agent 检查 (混合并行策略)
        // ... (保留上面的 console.log 代码)
        
        // 4. 触发 Agent 检查 (混合并行策略)
        setTimeout(() => {
            console.log('🚦 [后台导演] 全并行策略启动...');
        
            // 轨道 A: 关系与记忆 (保持不变)
            runRelationCheck(lastUserMsg, rawText); 
            checkAndRunSummary(); 
        
            // 轨道 B: 场景与生图 (🔥🔥 改为并行 🔥🔥)
            // 原逻辑：runSceneCheck(...).then(...) -> 导致了等待
            // 新逻辑：同时触发，互不阻塞
            
            // 1. 启动场景分析 (让它自己在后台跑，更新地点/衣服)
            runSceneCheck(lastUserMsg, rawText);
        
            const isSystemSnapshot = lastUserMsg.includes('SNAPSHOT') || lastUserMsg.includes('📷'); 
            
            if (isSystemSnapshot) {
                // 这是真正的“物理快门”（点击了按钮）
                runCameraManCheck(lastUserMsg, rawText);
            } else {
                // 这是普通对话（可能包含"拍"字，也可能不包含）
                // 交给导演去判断意图（它会看 allowSelfImage 开关，也会看上下文）
                runVisualDirectorCheck(lastUserMsg, rawText);
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

const handleCameraSend = () => {
    if (interactionMode.value !== 'face') return uni.showToast({ title: '非见面模式无法抓拍', icon: 'none' });
    
    // 🛠️ 修改这里的 Prompt，从系统指令改为描述性动作
    // 这样 AI 会根据当前氛围决定是“发现你拍照并害羞/配合”还是“完全没发现继续手头的动作”
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

        // 加载世界观地点
        const allWorlds = uni.getStorageSync('app_world_settings') || [];
        const myWorld = allWorlds.find(w => String(w.id) === String(target.worldId));
        
        if (myWorld && myWorld.locations && myWorld.locations.length > 0) {
            worldLocations.value = myWorld.locations.map(loc => ({
                name: loc,
                icon: '📍'
            }));
            
        } else {
            const globalLocs = uni.getStorageSync('app_world_locations');
            if (globalLocs) {
                worldLocations.value = globalLocs;
            } else {
                worldLocations.value = [{ name: '学校', icon: '🏫' }, { name: '公司', icon: '🏢' }];
            }
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
// [修改前]: 只删了缓存和 messageList
// [修改后]: 增加了 resetTime 的记录到 contact_list

const clearHistoryAndReset = () => {
    uni.showModal({
        title: '彻底重置', 
        content: '确定要重置该角色吗？\n她将遗忘所有过往记忆，变为“陌生人”。',
        confirmColor: '#ff4d4f',
        success: (res) => {
            if (res.confirm) {
                // 1. 物理位置重置
                playerLocation.value = userHome.value;
                currentLocation.value = charHome.value;
                interactionMode.value = (playerLocation.value === currentLocation.value) ? 'face' : 'phone';

                // 2. 只有 UI 清空 (数据库可以选择保留或删除，这里为了彻底重置建议物理删除)
                messageList.value = [];
                
                // 3. 💾 关键步骤：更新 contact_list 里的 resetTime
                if (chatId.value) {
                    const contacts = uni.getStorageSync('contact_list') || [];
                    const idx = contacts.findIndex(c => String(c.id) === String(chatId.value));
                    if (idx !== -1) {
                        contacts[idx].resetTime = Date.now(); // ⏰ 记录重生时间戳
                        // 清空好感度等状态
                        contacts[idx].affection = 0;
                        contacts[idx].summary = ""; 
                        uni.setStorageSync('contact_list', contacts);
                    }
                    
                    // 物理删除该角色的私聊记录
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


onHide(() => { stopTimeFlow(); saveCharacterState(); });
onUnload(() => { stopTimeFlow(); saveCharacterState(); });

onNavigationBarButtonTap((e) => {
    if (e.key === 'setting') uni.navigateTo({ url: `/pages/create/create?id=${chatId.value}` });
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
.chat-scroll { flex: 1; overflow: hidden; }
.chat-content { padding: 20rpx; padding-bottom: 240rpx; }

.system-tip { 
    text-align: center; 
    color: var(--text-sub); /* 适配 */
    font-size: 24rpx; margin-bottom: 30rpx; 
}



.loading-wrapper { display: flex; justify-content: center; margin-bottom: 20rpx; }
.loading-dots { color: var(--text-sub); font-weight: bold; }

/* 🔥🔥🔥 新增：悬浮按钮样式 🔥🔥🔥 */
.phone-fab {
  position: fixed;
  right: 30rpx;
  bottom: 260rpx; /* 放在输入框上方，高度可自己微调 */
  width: 90rpx;
  height: 90rpx;
  background: rgba(255, 255, 255, 0.9); /* 浅色背景 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900; /* 保证在 scroll-view 之上，但在弹窗之下 */
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

</style>