<template>
  <view 
    class="message-item" 
    :class="[
      msg.role === 'user' ? 'right' : 'left',
      isEditMode && isSelected ? 'is-selected' : '',
      isEditMode && !isSelected ? 'not-selected' : ''
    ]"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @click="handleClick"
  >
    <view v-if="msg.type === 'think'" class="system-event think-bubble">
       <text>{{ msg.content }}</text>
    </view>

    <view v-else-if="msg.isSystem" 
      class="system-event" 
      :class="{ 'error-system-msg': msg.isError }"
      @click="msg.isError ? $emit('retry', msg) : null"
    >
      <text>{{ msg.content }}</text>
    </view>
    
    <template v-else>
      <view v-if="isEditMode" class="select-check-icon">
        <view class="circle" :class="{ 'checked': isSelected }">
          <text v-if="isSelected">✓</text>
        </view>
      </view>
    
      <image v-if="msg.role === 'model'" class="avatar" :src="roleAvatar || '/static/ai-avatar.png'" mode="aspectFill"></image>
      <image 
        v-if="msg.role !== 'user' && msg.role !== 'model'" 
        class="avatar" 
        :src="specificAvatar || roleAvatar || '/static/ai-avatar.png'" 
        mode="aspectFill"
      ></image>
      <image v-if="msg.role === 'user'" class="avatar" :src="userAvatar || '/static/user-avatar.png'" mode="aspectFill"></image>
    
      <view class="bubble-wrapper">
        <view v-if="showName && msg.role !== 'user'" class="sender-name">{{ msg.role }}</view>
      
        <view v-if="!msg.type || msg.type === 'text'" class="bubble" :class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
          <text class="msg-text" user-select>{{ msg.content }}</text>
        </view>

        <view v-else-if="msg.type === 'image'" class="bubble image-bubble" :class="msg.role === 'user' ? 'right-bubble' : 'left-bubble'">
          <image 
            v-if="!msg.hasError" 
            :src="msg.content" 
            mode="widthFix" 
            class="chat-image" 
            @click.stop="$emit('preview', msg.content)"
            @error="onImageError" 
          ></image>
      
          <view v-else class="image-error-box" @click.stop="$emit('retry', msg)">
            <text class="error-icon">⚠️</text>
            <text class="error-text">图片生成失败</text>
            <view class="retry-btn">
              <text class="retry-icon">↻</text> 点击重试
            </view>
          </view>
        </view>
      </view> 
      </template>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  msg: { type: Object, required: true },
  isEditMode: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
  roleAvatar: { type: String, default: '' },
  userAvatar: { type: String, default: '' },
  showName: { type: Boolean, default: false }, // 是否显示名字
    specificAvatar: { type: String, default: '' } // 指定显示的头像 URL
});

const emit = defineEmits(['longPress', 'toggleSelect', 'retry', 'preview']);

// --- 触摸长按逻辑封装 ---
const touchTimer = ref(null);
const touchStartPosition = ref({ x: 0, y: 0 });

const handleTouchStart = (e) => {
  if (props.isEditMode) return; // 编辑模式下不触发长按
  if (e.touches.length > 1) return;

  touchStartPosition.value = { x: e.touches[0].pageX, y: e.touches[0].pageY };
  
  touchTimer.value = setTimeout(() => {
    emit('longPress', props.msg);
  }, 800); 
};

const handleTouchMove = (e) => {
  if (!touchTimer.value) return;
  const moveX = e.touches[0].pageX;
  const moveY = e.touches[0].pageY;
  if (Math.abs(moveX - touchStartPosition.value.x) > 10 || Math.abs(moveY - touchStartPosition.value.y) > 10) {
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

// 点击处理：编辑模式下切换选中，否则无操作（普通点击由气泡内的 click.stop 处理了）
const handleClick = () => {
  if (props.isEditMode) {
    emit('toggleSelect', props.msg);
  }
};

// 图片加载失败处理 (本地逻辑，不用麻烦父组件)
const onImageError = () => {
  if (props.msg.content && !props.msg.hasError) {
    props.msg.hasError = true; 
  }
};
</script>

<style lang="scss" scoped>
/* 直接迁移原 chat.vue 中 .message-item 及其子元素的样式 
*/

.message-item { 
    display: flex; margin-bottom: 30rpx; 
    &.left { flex-direction: row; .avatar { margin-right: 20rpx; } } 
    &.right { flex-direction: row-reverse; .avatar { margin-left: 20rpx; } } 
}

.avatar { 
    width: 80rpx; height: 80rpx; border-radius: 10rpx; flex-shrink: 0; 
    background-color: var(--border-color); 
}

.bubble-wrapper { max-width: 72%; }

/* 聊天气泡 */
.bubble { 
    padding: 18rpx 24rpx; border-radius: 16rpx; font-size: 30rpx; line-height: 1.5; 
    
    &.left-bubble { 
        background-color: var(--card-bg); 
        color: var(--text-color); 
        border-top-left-radius: 4rpx; 
        border: 1px solid var(--border-color);
    } 
    
    &.right-bubble { 
        background-color: #95ec69; 
        color: #000; 
        border-top-right-radius: 4rpx; 
    } 
    
    &.image-bubble { padding: 0; background: transparent; box-shadow: none; border: none; } 
}

.chat-image { width: 400rpx; border-radius: 16rpx; }

/* 系统事件 */
.system-event { 
    width: 100%; text-align: center; margin: 20rpx 0; 
    text { 
        background: var(--pill-bg); 
        color: var(--text-sub); 
        font-size: 22rpx; padding: 4rpx 20rpx; border-radius: 20rpx; 
    } 
}

.error-system-msg text { 
    background: #ffebee; color: #ff4757; border: 1px solid #ffcdd2; 
}

/* 🧠 心理活动 */
.think-bubble { margin: 10rpx 0; opacity: 0.9; }
.think-bubble text {
    background: transparent !important;
    color: var(--text-sub) !important;
    font-size: 24rpx; font-style: italic; font-family: serif;
    padding: 8rpx 24rpx;
    border: 2rpx dashed var(--border-color); 
    border-radius: 20rpx;
    display: inline-block;
}

/* 图片失败 */
.image-error-box {
    width: 400rpx; height: 300rpx;
    background-color: var(--tool-bg);
    border: 2rpx dashed #ff4d4f;
    border-radius: 16rpx;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx;
    
    .error-icon { font-size: 48rpx; }
    .error-text { font-size: 26rpx; color: #ff4d4f; }
    
    .retry-btn {
        display: flex; align-items: center;
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 8rpx 24rpx; border-radius: 30rpx;
        font-size: 24rpx; color: var(--text-color);
        box-shadow: var(--shadow);
        
        .retry-icon { font-size: 24rpx; margin-right: 8rpx; font-weight: bold; }
        &:active { background-color: var(--bg-color); transform: scale(0.98); }
    }
}

/* 编辑模式选中状态 */
.not-selected { opacity: 0.3; filter: grayscale(80%); }

.is-selected .bubble {
    background-color: #007aff !important; 
    color: #fff !important;
    transform: scale(1.05); 
    border: 2rpx solid #0056b3 !important;
}

.select-check-icon {
    display: flex; align-items: center; padding: 0 10rpx;
    .circle {
        width: 36rpx; height: 36rpx; 
        border: 2rpx solid var(--text-sub); 
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center; font-size: 24rpx;
        &.checked { background: #007aff; border-color: #007aff; color: #fff; }
    }
}
/* 🔥 新增：名字样式 */
.sender-name {
    font-size: 22rpx; 
    color: var(--text-sub); 
    margin-bottom: 6rpx;
    margin-left: 4rpx; /* 微调对齐 */
}
</style>