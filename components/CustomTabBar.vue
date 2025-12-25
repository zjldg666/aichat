<template>
  <view class="tabbar-container">
    <view class="tabbar-placeholder"></view>
    
    <view class="tabbar">
      <view 
        v-for="(item, index) in tabList" 
        :key="index" 
        class="tab-item" 
        @click="switchTab(index, item.pagePath)"
      >
        <image 
          class="icon" 
          :src="current === index ? item.selectedIconPath : item.iconPath" 
          mode="aspectFit"
        ></image>
        <text class="text" :class="{ active: current === index }">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, defineProps } from 'vue';

const props = defineProps({
  current: {
    type: Number,
    default: 0
  }
});

// ✨✨✨ 将配置数据提取到 script 中 ✨✨✨
const tabList = ref([
  {
    pagePath: '/pages/index/index',
    text: '消息',
    iconPath: '/static/msg.png',
    selectedIconPath: '/static/msg-active.png'
  },
  {
    pagePath: '/pages/scenario/scenario',
    text: '小剧场',
    // 暂时用 logo 图标，等你有了 static/scenario.png 后可以在这里改
    iconPath: '/static/logo.png', 
    selectedIconPath: '/static/logo.png' 
  },
  {
    pagePath: '/pages/mine/mine',
    text: '我的',
    iconPath: '/static/me.png',
    selectedIconPath: '/static/me-active.png'
  }
]);

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
  color: var(--text-sub); 
}

.text.active { color: #007AFF; }
</style>