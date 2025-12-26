<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="status-bar"></view>
      <view class="nav-content">
        <text class="page-title">消息</text>
        <view class="add-btn" @click="createNewContact">
          <text class="add-icon">+</text>
        </view>
      </view>
    </view>
    <view class="nav-placeholder"></view>

    <!-- 消息列表 -->
    <view class="chat-list">
      <view v-if="contactList.length === 0" class="empty-tip">
        点击右上角 + 创建你的第一个 AI 角色
      </view>

      <view 
        class="chat-item" 
        v-for="(item, index) in contactList" 
        :key="item.id"
        @click="goToChat(item)"
        @longpress="showAction(item, index)"
      >
        <view class="avatar-box">
          <image :src="item.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="avatar"></image>
          <view v-if="item.unread > 0" class="badge">{{ item.unread }}</view>
        </view>
        <view class="content-box">
          <view class="row-top">
            <text class="name">{{ item.name }}</text>
            <text class="time">{{ item.lastTime }}</text>
          </view>
          <view class="row-bottom">
            <text class="last-msg">{{ item.lastMsg }}</text>
          </view>
        </view>
      </view>
    </view>

    <CustomTabBar :current="0" />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow,onReady } from '@dcloudio/uni-app';
import CustomTabBar from '@/components/CustomTabBar.vue';
import checkUpdate from '@/uni_modules/uni-upgrade-center-app/utils/check-update'
import { useTheme } from '@/composables/useTheme.js'; // 1. 引入
const { isDarkMode } = useTheme(); // 2. 获取状态
const contactList = ref([]);

// 每次显示页面时，刷新列表数据
onShow(() => {
  const list = uni.getStorageSync('contact_list');
  if (list) {
    contactList.value = list;
  }
});

// 3. 在 onReady 生命周期中调用检查更新
onReady(() => {
  checkUpdate();
})

const createNewContact = () => {
  // 跳转到创建页面 (新建模式)
  uni.navigateTo({
    url: '/pages/create/create'
  });
};

// AiChat/pages/index/index.vue

const goToChat = (item) => {
  // 1. 清除未读
  item.unread = 0;
  uni.setStorageSync('contact_list', contactList.value);

  // 🔥🔥🔥 核心逻辑：路由分发 🔥🔥🔥
  // 检查玩家是否“肉身”在这个角色所在的场景里
  if (item.playerInSceneId) {
      console.log(`🚀 检测到玩家还在场景 [${item.playerInSceneId}]，正在恢复现场...`);
      
      // 强制跳转到场景页 (带上 visitorId，告诉场景我是来找这个人的)
      uni.navigateTo({
          url: `/pages/scene/chat?id=${item.playerInSceneId}&visitorId=${item.id}`
      });
      return; // ⛔️ 阻止进入私聊页面
  }

  // 2. 默认情况：玩家不在现场，正常进入私聊 (手机/远程模式)
  uni.navigateTo({
    url: `/pages/chat/chat?id=${item.id}&name=${item.name}`
  });
};

const showAction = (item, index) => {
  uni.showActionSheet({
    itemList: ['编辑角色', '删除角色'],
    success: (res) => {
      if (res.tapIndex === 0) {
        // 编辑：跳转到 create 页面并带上 ID
        uni.navigateTo({
          url: `/pages/create/create?id=${item.id}`
        });
      } else if (res.tapIndex === 1) {
        // 删除
        uni.showModal({
          title: '确认删除',
          content: '删除后无法恢复，确定吗？',
          success: (modalRes) => {
            if (modalRes.confirm) {
              contactList.value.splice(index, 1);
              uni.setStorageSync('contact_list', contactList.value);
            }
          }
        });
      }
    }
  });
};
</script>

<style lang="scss">
/* --- 1. 基础容器 --- */
.container { 
    /* 使用全局背景色 (#f5f5f5 / #121212) */
    background-color: var(--bg-color); 
    min-height: 100vh; 
}

/* --- 2. 自定义导航栏 --- */
.custom-navbar { 
    position: fixed; top: 0; left: 0; width: 100%; 
    /* 导航栏背景跟随全局背景 */
    background-color: var(--bg-color); 
    z-index: 999; 
    padding-bottom: 10rpx; 
    /* 增加阴影，让它在白色背景下也有层次感，夜间模式更明显 */
    box-shadow: 0 1px 0 var(--border-color);
}

.status-bar { 
    height: var(--status-bar-height); 
    width: 100%; 
    background-color: var(--bg-color); 
}

.nav-content { 
    height: 88rpx; 
    display: flex; align-items: center; justify-content: space-between; 
    padding: 0 30rpx; 
}

.page-title { 
    font-size: 36rpx; font-weight: bold; 
    color: var(--text-color); /* 适配文字颜色 */
}

.add-btn { 
    width: 60rpx; height: 60rpx; 
    /* 按钮背景：白天用白色卡片色，夜间用深灰 */
    background-color: var(--card-bg); 
    border-radius: 10rpx; 
    display: flex; align-items: center; justify-content: center; 
    /* 加一点边框让它在浅色背景下明显 */
    border: 1px solid var(--border-color);
}

.add-icon { 
    font-size: 40rpx; 
    color: var(--text-color); /* 图标变色 */
    margin-top: -4rpx; 
}

.nav-placeholder { 
    width: 100%; 
    height: calc(var(--status-bar-height) + 88rpx); 
}

.empty-tip { 
    text-align: center; 
    color: var(--text-sub); /* 适配灰色文字 */
    padding-top: 100rpx; 
    font-size: 28rpx; 
}

/* --- 3. 聊天列表 --- */
.chat-list { 
    background-color: var(--bg-color); /* 列表底色 */
    padding-bottom: 120rpx; 
}

.chat-item { 
    display: flex; padding: 24rpx 30rpx; 
    border-bottom: 1px solid var(--border-color); /* 适配分割线 */
    background: var(--card-bg); /* 列表项背景 (白/深灰) */
    transition: background-color 0.2s;
}

.chat-item:active { 
    background-color: var(--tool-bg); /* 点击态变深一点 */
}

.avatar-box { position: relative; margin-right: 24rpx; }

.avatar { 
    width: 96rpx; height: 96rpx; border-radius: 10rpx; 
    background: var(--border-color); /* 头像占位色 */
}

.badge { 
    position: absolute; top: -6rpx; right: -6rpx; 
    background: #fa5151; /* 红色保持不变 */
    color: #fff; font-size: 22rpx; padding: 0 10rpx; border-radius: 16rpx; 
}

.content-box { flex: 1; display: flex; flex-direction: column; justify-content: center; }

.row-top { display: flex; justify-content: space-between; margin-bottom: 8rpx; }

.name { 
    font-size: 34rpx; font-weight: 500; 
    color: var(--text-color); /* 名字变色 */
}

.time { 
    font-size: 24rpx; 
    color: var(--text-sub); /* 时间变灰 */
}

.last-msg { 
    font-size: 28rpx; 
    color: var(--text-sub); /* 消息预览变灰 */
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis; width: 500rpx; 
}
</style>