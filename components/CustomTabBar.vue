<template>
  <view class="tabbar-container">
    <view class="tabbar-placeholder"></view>
    
    <view class="tabbar">
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
  </view>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  current: {
    type: Number,
    default: 0
  }
});

const switchTab = (index, path) => {
  if (props.current === index) return;
  uni.reLaunch({
    url: path
  });
};
</script>

<style scoped>
.tabbar-container { width: 100%; }
.tabbar-placeholder { width: 100%; height: calc(100rpx + constant(safe-area-inset-bottom)); height: calc(100rpx + env(safe-area-inset-bottom)); }

.tabbar { 
  position: fixed; 
  bottom: 0; 
  left: 0; 
  width: 100%; 
  height: 100rpx; 
  /* 🔥 修改点：使用全局变量适配夜间模式 */
  background-color: var(--card-bg); 
  border-top: 1px solid var(--border-color); 
  
  display: flex; 
  align-items: center; 
  justify-content: space-around; 
  z-index: 999; 
  padding-bottom: constant(safe-area-inset-bottom); 
  padding-bottom: env(safe-area-inset-bottom); 
  box-sizing: content-box; 
  transition: background-color 0.3s;
}

.tab-item { 
  flex: 1; 
  height: 100%; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
}

.icon { width: 48rpx; height: 48rpx; margin-bottom: 6rpx; }

.text { 
  font-size: 20rpx; 
  /* 🔥 修改点：文字颜色也适配一下 */
  color: var(--text-sub); 
}

.text.active { color: #007AFF; }
</style>