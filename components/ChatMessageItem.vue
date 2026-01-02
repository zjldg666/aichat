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
    
      <image 
        v-if="msg.role === 'model'" 
        class="avatar" 
        :src="roleAvatar || '/static/ai-avatar.png'" 
        mode="aspectFill"
      ></image>

      <image 
        v-else-if="msg.role !== 'user'" 
        class="avatar" 
        :src="specificAvatar || roleAvatar || '/static/ai-avatar.png'" 
        mode="aspectFill"
      ></image>

      <image 
        v-else 
        class="avatar" 
        :src="userAvatar || '/static/user-avatar.png'" 
        mode="aspectFill"
      ></image>
    
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
            <text class="error-text">图片加载失败</text>
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
  showName: { type: Boolean, default: false },
  specificAvatar: { type: String, default: '' }
});

const emit = defineEmits(['longPress', 'toggleSelect', 'retry', 'preview']);

// 触摸逻辑
const touchTimer = ref(null);
const touchStartPosition = ref({ x: 0, y: 0 });

const handleTouchStart = (e) => {
  if (props.isEditMode || e.touches.length > 1) return;
  touchStartPosition.value = { x: e.touches[0].pageX, y: e.touches[0].pageY };
  touchTimer.value = setTimeout(() => { emit('longPress', props.msg); }, 800); 
};

const handleTouchMove = (e) => {
  if (!touchTimer.value) return;
  if (Math.abs(e.touches[0].pageX - touchStartPosition.value.x) > 10 || Math.abs(e.touches[0].pageY - touchStartPosition.value.y) > 10) {
    clearTimeout(touchTimer.value);
    touchTimer.value = null;
  }
};

const handleTouchEnd = () => {
  if (touchTimer.value) { clearTimeout(touchTimer.value); touchTimer.value = null; }
};

const handleClick = () => {
  if (props.isEditMode) emit('toggleSelect', props.msg);
};

const onImageError = () => {
  if (props.msg.content && !props.msg.hasError) {
    props.msg.hasError = true; 
  }
};
</script>

<style lang="scss" scoped>
/* 样式部分 */
.message-item { 
    display: flex; margin-bottom: 30rpx; width: 100%;
    &.left { flex-direction: row; .avatar { margin-right: 20rpx; } } 
    &.right { flex-direction: row-reverse; .avatar { margin-left: 20rpx; } .sender-name { text-align: right; margin-right: 4rpx; } } 
}

/* 🔥 头像增加 min-width 防止塌陷 */
.avatar { 
    width: 80rpx; height: 80rpx; min-width: 80rpx;
    border-radius: 10rpx; flex-shrink: 0; background-color: var(--border-color); 
}

.bubble-wrapper { max-width: 72%; display: flex; flex-direction: column; }

.bubble { 
    padding: 18rpx 24rpx; border-radius: 16rpx; font-size: 30rpx; line-height: 1.5; word-break: break-all;
    &.left-bubble { background-color: var(--card-bg); color: var(--text-color); border-top-left-radius: 4rpx; border: 1px solid var(--border-color); } 
    &.right-bubble { background-color: #95ec69; color: #000; border-top-right-radius: 4rpx; } 
    &.image-bubble { padding: 0; background: transparent; border: none; } 
}

/* 🔥 图片增加最小高度 */
.chat-image { display: block; width: 400rpx; max-width: 100%; min-height: 100rpx; border-radius: 16rpx; background-color: var(--tool-bg); }

.sender-name { font-size: 22rpx; color: var(--text-sub); margin-bottom: 6rpx; margin-left: 4rpx; }

.system-event { width: 100%; text-align: center; margin: 20rpx 0; text { background: var(--pill-bg); color: var(--text-sub); font-size: 22rpx; padding: 4rpx 20rpx; border-radius: 20rpx; } }
.error-system-msg text { background: #ffebee; color: #ff4757; border: 1px solid #ffcdd2; }
.think-bubble { margin: 10rpx 0; opacity: 0.9; }
.think-bubble text { background: transparent !important; color: var(--text-sub) !important; font-style: italic; padding: 8rpx 24rpx; border: 2rpx dashed var(--border-color); border-radius: 20rpx; display: inline-block; }

.image-error-box { width: 300rpx; height: 200rpx; background: var(--tool-bg); border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; .error-icon { font-size: 40rpx; } }
.not-selected { opacity: 0.3; filter: grayscale(80%); }
.is-selected .bubble { background-color: #007aff !important; color: #fff !important; transform: scale(1.05); }
.select-check-icon { display: flex; align-items: center; padding: 0 10rpx; .circle { width: 36rpx; height: 36rpx; border: 2rpx solid var(--text-sub); border-radius: 50%; display: flex; align-items: center; justify-content: center; &.checked { background: #007aff; border-color: #007aff; color: #fff; } } }
</style>