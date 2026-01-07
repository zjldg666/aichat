<template>
  <!-- 直接复用 ChatView，传入 chatID -->
  <view class="page-container">
      <ChatView ref="chatViewRef" :id="chatId" />
      
      <!-- 只有在主页面才显示的手机悬浮球 -->
      <view class="phone-fab" @click="showPhone = true">
        <text class="fab-icon">📱</text>
      </view>
  
      <GamePhone 
        :visible="showPhone"
        :world-id="currentWorldId"
        :current-chat-id="chatId"
        :time="formattedTime"    
        @close="showPhone = false"
      />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onLoad, onNavigationBarButtonTap } from '@dcloudio/uni-app';
import ChatView from '@/components/ChatView.vue';
import GamePhone from '@/components/GamePhone.vue';

const chatId = ref(null);
const chatViewRef = ref(null);
const showPhone = ref(false);

// 为了给 GamePhone 传参，我们需要从 ChatView 获取一些状态
// 但由于 ChatView 封装了 useAiChat，我们可以直接通过 ref 访问暴露出来的状态
// 或者更简单的，我们也调用一次 useAiChat (共享状态模式)，但这会创建新的实例
// 更好的方式是：让 ChatView 暴露我们需要的数据，或者只传递必要的

// 方案：通过 ref 访问 ChatView 暴露的数据
const currentWorldId = computed(() => {
    return chatViewRef.value?.currentRole?.worldId || '';
});

const formattedTime = computed(() => {
    return chatViewRef.value?.formattedTime || '00:00';
});

onLoad((options) => {
    if (options.id) {
        chatId.value = options.id;
    }
});

onNavigationBarButtonTap((e) => {
    if (e.key === 'setting' && chatViewRef.value) {
        chatViewRef.value.openSettings();
    }
});

</script>

<style lang="scss" scoped>
.page-container {
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-color);
}

/* 悬浮按钮样式 */
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

/* 简单的暗色适配，具体由 ChatView 内部处理 */
@media (prefers-color-scheme: dark) {
  .phone-fab {
    background: rgba(40, 40, 40, 0.9);
    border-color: rgba(255,255,255,0.1);
    box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.5);
  }
}
</style>
