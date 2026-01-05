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

    <view class="tab-item" @click="switchTab(1, '/pages/mine/mine')">
      <image 
        class="icon" 
        :src="current === 1 ? '/static/me-active.png' : '/static/me.png'" 
        mode="aspectFit"
      ></image>
      <text class="text" :class="{ active: current === 1 }">我的</text>
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
  
  uni.reLaunch({
    url: path,
    fail: (err) => {
        console.error('跳转失败:', err);
        uni.redirectTo({ url: path });
    }
  });
};
</script>

<style lang="scss" scoped>
/* 样式保持不变，flex 布局会自动适应 2 个项目 */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 110rpx;
  background-color: #ffffff;
  border-top: 1px solid #eeeeee;
  display: flex;
  justify-content: space-around; /* 两个图标会自动平分间距 */
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
  
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