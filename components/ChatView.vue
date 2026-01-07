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
import { ref, watch, onMounted } from 'vue';
import { useTheme } from '@/composables/useTheme.js'; 
import { useAiChat } from '@/composables/useAiChat.js';
import { DB } from '@/utils/db.js'; // 依然需要 DB 用于删除操作
import ChatHeader from '@/components/ChatHeader.vue';
import ChatFooter from '@/components/ChatFooter.vue';
import ChatModals from '@/components/ChatModals.vue';
import ChatMessageItem from '@/components/ChatMessageItem.vue';

// --- Props ---
const props = defineProps({
  id: {
    type: [String, Number],
    default: null
  },
  // 标记是否嵌入在手机里
  isEmbedded: {
    type: Boolean,
    default: false
  },
  // 兼容 GamePhone 传入的时间 prop
  time: {
    type: String,
    default: ''
  }
});

const { isDarkMode, applyNativeTheme } = useTheme();

// ==================================================================================
// 1. 初始化核心逻辑 (Core Logic)
// ==================================================================================
// 使用 useAiChat 接管所有 AI 逻辑
const {
    // State
    chatId,
    chatName,
    currentRole,
    messageList,
    visibleMessageList,
    inputText,
    isLoading,
    scrollIntoView,
    
    // Character State
    currentAction,
    userName,
    userAvatar,
    userHome,
    userAppearance,
    charHome,
    currentAffection,
    currentLust,
    currentLocation,
    interactionMode,
    currentClothing,
    currentActivity,
    currentRelation,
    playerLocation,
    relationshipStatus,
    isArchiving,
    
    // Time
    formattedTime,
    timeParts,
    wakeTime,
    tempDateStr,
    tempTimeStr,
    tempTimeRatio,
    customMinutes, // 需要在 useAiChat 中暴露，或者在这里处理
    
    // Settings & UI Flags
    showThought,
    showLocationPanel,
    showTimePanel,
    showTimeSettingPanel,
    customLocation,
    locationList,
    worldLocations,
    
    // Actions
    init,
    loadRoleData,
    sendMessage,
    handleRetry,
    handleCameraSend,
    triggerNextStep,
    clearHistoryAndReset,
    toggleThought,
    scrollToBottom,
    previewImage,
    
    // Time Actions
    onSleepTimeChange,
    handleTimeSkip,
    confirmManualTime,
    
    // Location Actions
    handleMoveTo,
    handleForceMove
} = useAiChat(props.id, { isEmbedded: props.isEmbedded });

// ==================================================================================
// 2. UI 状态与交互 (UI State & Interaction)
// ==================================================================================

const isToolbarOpen = ref(false); 
const activeModal = ref('');

// 联动修复时间弹窗空白问题
watch(() => activeModal.value, (val) => {
    if (val === 'timeSetting') {
        showTimeSettingPanel.value = true;
    }
});

const toggleToolbar = () => { isToolbarOpen.value = !isToolbarOpen.value; };

// --- 长按编辑/删除逻辑 (这部分属于 UI 交互，留在 View 层比较合适) ---
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
                // 更新 messageList (需要 Core 提供修改 messageList 的能力，或者直接操作引用)
                // 由于 useAiChat 返回的是 ref，我们可以直接修改 .value
                messageList.value = messageList.value.filter(m => !selectedIds.value.includes(m.id));
                const ids = selectedIds.value.map(id => `'${id}'`).join(',');
                await DB.execute(`DELETE FROM messages WHERE id IN (${ids})`);
                cancelEdit();
                uni.showToast({ title: '已物理抹除', icon: 'success' });
            }
        }
    });
};

// --- 弹窗辅助方法 ---
const onTimeSkip = (type, customMin) => {
    // customMinutes 需要从 useAiChat 暴露出来，或者我们直接在这里处理
    // 假设 useAiChat 内部处理了 customMinutes 引用
    // 如果没有暴露，可能需要去 useAiChat 补一下
    if (type === 'custom' && customMin && customMinutes) {
        customMinutes.value = customMin; 
    }
    handleTimeSkip(type);
    activeModal.value = ''; 
};

// --- 监听 ID 变化 ---
watch(() => props.id, (newId) => {
    if (newId) {
        init(newId);
    }
}, { immediate: true });

onMounted(() => {
    applyNativeTheme();
});

// 对外公开的方法
defineExpose({
    openSettings: () => {
        uni.navigateTo({ url: `/pages/create/create?id=${chatId.value}` });
    },
    // 暴露给父组件用的状态
    currentRole,
    formattedTime
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

/* 在最后添加 */
.chat-container.embedded-view {
    height: 100% !important; /* 强制填满手机组件的高度，而不是 100vh */
    background-color: #f2f2f7; /* 配合手机背景色 */
}
</style>
