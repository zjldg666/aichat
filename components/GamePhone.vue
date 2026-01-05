<template>
  <view class="phone-overlay" :class="{ 'visible': visible }" @click.self="closePhone">
    <view class="phone-body" :class="{ 'slide-up': visible }">
      
      <view class="phone-status-bar">
        <text class="time">{{ time }}</text> 
        <view class="icons" style="display: flex; align-items: center; gap: 20rpx;">
          <view @click="closePhone" style="padding: 10rpx;">
            <text style="font-size: 32rpx; color: #fff;">关闭</text>
          </view>
          <text class="icon">5G</text>
          <text class="icon battery">🔋</text>
        </view>
      </view>

      <view class="screen-content">
        
        <view v-if="activeChatId" style="display: flex; flex-direction: column; height: 100%;">
            <view style="height: 80rpx; background: #fff; display: flex; align-items: center; padding: 0 30rpx; border-bottom: 1px solid #eee; flex-shrink: 0;">
                <text @click="backToList" style="font-size: 30rpx; color: #007aff; font-weight: bold;">‹ 返回列表</text>
                <text style="margin-left: 20rpx; font-weight: bold; font-size: 32rpx;">{{ activeChatName }}</text>
            </view>
            
			<view style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;">
			          <!-- ChatView 组件 -->
			          <ChatView 
			              :id="activeChatId" 
			              :isEmbedded="true"
			              :time="time"
			              style="height: 100%; width: 100%;" 
			          />
			</view>
        </view>

        <view v-else style="display: flex; flex-direction: column; height: 100%;">
            <view class="app-header">
              <text class="header-title">通讯录</text>
              <text class="header-subtitle">同一世界下的联系人</text>
            </view>
            
            <scroll-view scroll-y class="contact-list">
              <view v-if="loading" class="loading-tip">
                  <text>加载中...</text>
              </view>

              <view 
                v-else
                v-for="contact in worldContacts" 
                :key="contact.id" 
                class="contact-item"
                @click="handleContactClick(contact)"
              >
                <image :src="contact.avatar || '/static/ai-avatar.png'" class="head-img" mode="aspectFill"></image>
                
                <view class="info">
                  <view class="row-top">
                    <text class="name">{{ contact.name }}</text>
                    <text class="tag current" v-if="String(contact.id) === String(currentChatId)">当前</text>
                  </view>
                  <view class="row-bottom">
                    <text class="status-dot" :class="String(contact.id) === String(currentChatId) ? 'online' : 'idle'"></text>
                    <text class="location">📍 {{ contact.currentLocation || '未知位置' }}</text>
                  </view>
                </view>
                
                <view class="action-btn" v-if="String(contact.id) !== String(currentChatId)">
                  <text style="font-size:24rpx; color: #999;">›</text>
                </view>
              </view>
              
              <view class="empty-tip" v-if="!loading && worldContacts.length === 0">
                <text>暂无其他联系人</text>
              </view>
            </scroll-view>
        </view>

      </view>

      <view class="home-indicator" @click="closePhone"></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
// 2. 移除 useGameTime 引用，因为我们直接用 props 了
// import { useGameTime } from '@/composables/useGameTime.js'; 
import ChatView from './ChatView.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  worldId: { type: [String, Number], default: '' },      
  currentChatId: { type: [String, Number], default: '' },
  // 🔥 新增：接收父组件传来的世界时间
  time: { type: String, default: '00:00' }
});

const emit = defineEmits(['close']);

// 状态定义
const activeChatId = ref(null);   
const activeChatName = ref('');
const allContacts = ref([]);
const loading = ref(false);

const loadContacts = () => {
  if (allContacts.value.length > 0) return;
  loading.value = true;
  setTimeout(() => {
    try {
      const list = uni.getStorageSync('contact_list') || [];
      allContacts.value = list;
    } catch (e) {
      console.error('读取通讯录失败', e);
    } finally {
      loading.value = false;
    }
  }, 50);
};

watch(() => props.visible, (val) => {
  if (val) {
    loadContacts();
  }
});

const worldContacts = computed(() => {
  if (!props.worldId) return [];
  const targetWorldId = String(props.worldId);
  return allContacts.value.filter(c => c.worldId && String(c.worldId) === targetWorldId);
});

const closePhone = () => {
  emit('close');
};

const handleContactClick = (contact) => {
  if (String(contact.id) === String(props.currentChatId)) {
      return uni.showToast({ title: '她就在你面前', icon: 'none' });
  }
  activeChatId.value = contact.id;
  activeChatName.value = contact.name;
};

const backToList = () => {
    activeChatId.value = null;
    activeChatName.value = '';
};
</script>

<style lang="scss" scoped>
/* 保持你原有的样式不变 */
/* 遮罩 */
.phone-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6); z-index: 9999;
  display: flex; flex-direction: column; justify-content: flex-end;
  opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
  &.visible { opacity: 1; pointer-events: auto; }
}

/* 机身 */
.phone-body {
  width: 100%; height: 80vh; 
  background: #1c1c1e; 
  border-top-left-radius: 40rpx; border-top-right-radius: 40rpx;
  overflow: hidden; display: flex; flex-direction: column;
  transform: translate3d(0, 100%, 0);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 -10rpx 40rpx rgba(0,0,0,0.5);
  &.slide-up { transform: translate3d(0, 0, 0); }
}

/* 状态栏 */
.phone-status-bar {
  height: 60rpx; display: flex; justify-content: space-between; align-items: center;
  padding: 0 40rpx; color: #fff; font-size: 24rpx; font-weight: bold;
  background: rgba(255,255,255,0.05);
}
.icons { display: flex; gap: 10rpx; }

/* 屏幕 */
.screen-content { 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  background: #f2f2f7; 
  position: relative;
  /* 🔥 关键修复：添加这行，强制限制内部高度，让 scroll-view 知道边界 */
  overflow: hidden; 
}

.app-header {
  padding: 30rpx 40rpx;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
}
.header-title { font-size: 48rpx; font-weight: 700; color: #000; display: block; }
.header-subtitle { font-size: 24rpx; color: #888; margin-top: 4rpx; }

/* 列表 */
.contact-list { flex: 1; padding: 20rpx; box-sizing: border-box; }
.loading-tip { text-align: center; padding: 40rpx; color: #999; font-size: 24rpx; }

.contact-item {
  display: flex; align-items: center; 
  background: #fff; padding: 24rpx; margin-bottom: 20rpx; 
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02);
  &:active { background: #f9f9f9; transform: scale(0.98); }
  transition: all 0.1s;
}

.head-img { width: 100rpx; height: 100rpx; border-radius: 50%; margin-right: 24rpx; background: #eee; border: 2rpx solid #fff; }

.info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.row-top { display: flex; align-items: center; margin-bottom: 8rpx; }
.name { font-size: 32rpx; font-weight: 600; color: #333; margin-right: 12rpx; }
.tag { font-size: 20rpx; color: #fff; background: #007aff; padding: 4rpx 10rpx; border-radius: 8rpx; }

.row-bottom { display: flex; align-items: center; }
.status-dot { width: 12rpx; height: 12rpx; border-radius: 50%; margin-right: 8rpx; }
.online { background: #34c759; }
.idle { background: #8e8e93; }
.location { font-size: 24rpx; color: #8e8e93; }

.action-btn {
  background: #007aff; color: #fff; font-size: 24rpx; padding: 10rpx 24rpx; border-radius: 30rpx; font-weight: bold;
}

.empty-tip { text-align: center; color: #999; margin-top: 100rpx; font-size: 28rpx; }

/* 底部 Home 条 */
.home-indicator {
  height: 50rpx; width: 100%; background: #1c1c1e;
  display: flex; justify-content: center; align-items: center;
  &::after {
    content: ''; width: 200rpx; height: 10rpx; background: #fff; border-radius: 10rpx; opacity: 0.3;
  }
}
</style>