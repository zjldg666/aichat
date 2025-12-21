<template>
  <view class="container">
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

const goToChat = (item) => {
  item.unread = 0;
  uni.setStorageSync('contact_list', contactList.value);
  // 传递 ID 和 Name
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
.container { background-color: #ededed; min-height: 100vh; }
.custom-navbar { position: fixed; top: 0; left: 0; width: 100%; background-color: #ededed; z-index: 999; padding-bottom: 10rpx; }
.status-bar { height: var(--status-bar-height); width: 100%; background-color: #ededed; }
.nav-content { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; }
.page-title { font-size: 36rpx; font-weight: bold; color: #000; }
.add-btn { width: 60rpx; height: 60rpx; background-color: #ddd; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; }
.add-icon { font-size: 40rpx; color: #333; margin-top: -4rpx; }
.nav-placeholder { width: 100%; height: calc(var(--status-bar-height) + 88rpx); }
.empty-tip { text-align: center; color: #999; padding-top: 100rpx; font-size: 28rpx; }

.chat-list { background-color: #fff; padding-bottom: 120rpx; }
.chat-item { display: flex; padding: 24rpx 30rpx; border-bottom: 1px solid #f0f0f0; background: #fff;}
.chat-item:active { background-color: #f5f5f5; }
.avatar-box { position: relative; margin-right: 24rpx; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 10rpx; background: #ddd; }
.badge { position: absolute; top: -6rpx; right: -6rpx; background: #fa5151; color: #fff; font-size: 22rpx; padding: 0 10rpx; border-radius: 16rpx; }
.content-box { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.row-top { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.name { font-size: 34rpx; font-weight: 500; color: #333; }
.time { font-size: 24rpx; color: #b2b2b2; }
.last-msg { font-size: 28rpx; color: #999; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; width: 500rpx; }
</style>