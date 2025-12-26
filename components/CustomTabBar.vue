<template>
  <view class="tab-bar" :class="{ 'dark-mode': isDarkMode }">
    <view class="tab-item" @click="switchTab(0, '/pages/index/index')">
      <image 
        class="icon" 
        :src="current === 0 ? '/static/msg-active.png' : '/static/msg.png'" 
        mode="aspectFit"
      ></image>
      <text class="text" :class="{ active: current === 0 }">消息</text>
    </view>

    <view class="tab-item" @click="switchTab(1, '/pages/scene/index')">
      <image 
        class="icon" 
        :src="current === 1 ? '/static/scene-active.png' : '/static/scene.png'" 
        mode="aspectFit"
      ></image>
      <text class="text" :class="{ active: current === 1 }">场景</text>
    </view>

    <view class="tab-item" @click="switchTab(2, '/pages/mine/mine')">
      <image 
        class="icon" 
        :src="current === 2 ? '/static/me-active.png' : '/static/me.png'" 
        mode="aspectFit"
      ></image>
      <text class="text" :class="{ active: current === 2 }">我的</text>
    </view>
  </view>
</template>

<script setup>
import { defineProps } from 'vue';
import { useTheme } from '@/composables/useTheme.js';

const props = defineProps({
  current: {
    type: Number,
    default: 0
  }
});

const { isDarkMode } = useTheme();

const switchTab = (index, path) => {
  if (props.current === index) return;
  
  // 使用 reLaunch 关闭所有页面打开新页面，模拟 TabBar 行为
  uni.reLaunch({
    url: path,
    fail: (err) => {
        console.error('跳转失败:', err);
        // 如果 reLaunch 失败（有时候在某些页面栈深处），尝试 redirectTo
        uni.redirectTo({ url: path });
    }
  });
};
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 110rpx; /* 稍微调高一点，适应现在的手机 */
  background-color: #ffffff;
  border-top: 1px solid #eeeeee;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
  
  /* 暗黑模式适配 */
  &.dark-mode {
    background-color: #191919;
    border-top: 1px solid #333;
    
    .text { color: #666; }
    .text.active { color: #007aff; }
  }
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.icon {
  width: 50rpx;
  height: 50rpx;
  margin-bottom: 6rpx;
}

.text {
  font-size: 20rpx;
  color: #999999;
  
  &.active {
    color: #007aff;
    font-weight: bold;
  }
}
</style>