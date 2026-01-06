<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    <view class="custom-navbar">
      <view class="status-bar"></view>
      <view class="nav-content">
        <text class="page-title">场景剧场</text>
        <view class="add-btn" @click="createNewScene">
          <text class="add-icon">+</text>
        </view>
      </view>
    </view>
    <view class="nav-placeholder"></view>

    <view class="scene-list">
      <view v-if="sceneList.length === 0" class="empty-tip">
        <text class="emoji">🎭</text>
        <view>点击右上角 + 创建第一个沉浸式场景</view>
      </view>

      <view 
        class="scene-item" 
        v-for="(item, index) in sceneList" 
        :key="item.id"
        @click="enterScene(item)"
        @longpress="showAction(item, index)"
      >
        <view class="scene-icon-box">
             <text class="default-icon">🎬</text>
        </view>
        
        <view class="content-box">
          <view class="row-top">
            <text class="name">{{ item.name }}</text>
            <text class="role-tag">身份: {{ item.playerIdentity || '路人' }}</text>
          </view>
          <view class="row-middle">
             <text class="npc-preview">
                 👥 {{ item.npcs ? item.npcs.map(n => n.name).join('、') : '暂无NPC' }}
             </text>
          </view>
          <view class="row-bottom">
            <text class="desc">{{ item.background || '暂无背景描述...' }}</text>
          </view>
        </view>
      </view>
    </view>

    <CustomTabBar :current="1" />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import CustomTabBar from '@/components/CustomTabBar.vue'; // 引入组件
import { useTheme } from '@/composables/useTheme.js'; // 引入主题

const { isDarkMode, applyNativeTheme } = useTheme();
const sceneList = ref([]);

onShow(() => {
  applyNativeTheme();
  // 🔥 从缓存读取场景列表 (key: app_scene_list)
  // 注意：这里用了新的 Key，完全不影响原本的 contact_list
  const list = uni.getStorageSync('app_scene_list');
  if (list) {
    sceneList.value = list;
  }
});

const createNewScene = () => {
  uni.navigateTo({ url: '/pages/scene/create' });
};

const enterScene = (item) => {
  uni.navigateTo({
    url: `/pages/scene/chat?id=${item.id}&name=${item.name}`
  });
};

const showAction = (item, index) => {
  uni.showActionSheet({
    itemList: ['删除场景'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showModal({
          title: '确认删除',
          content: '删除后场景内所有记忆将丢失',
          success: (mRes) => {
            if (mRes.confirm) {
              sceneList.value.splice(index, 1);
              uni.setStorageSync('app_scene_list', sceneList.value);
            }
          }
        });
      }
    }
  });
};
</script>

<style lang="scss" scoped>
/* 复用部分 index.css 的样式，但针对场景做微调 */
.container { background-color: var(--bg-color); min-height: 100vh; }
.custom-navbar { 
    position: fixed; top: 0; left: 0; width: 100%; 
    background-color: var(--bg-color); z-index: 999; padding-bottom: 10rpx;
    box-shadow: 0 1px 0 var(--border-color);
}
.status-bar { height: var(--status-bar-height); width: 100%; background-color: var(--bg-color); }
.nav-content { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx; }
.page-title { font-size: 36rpx; font-weight: bold; color: var(--text-color); }
.add-btn { 
    width: 60rpx; height: 60rpx; background-color: var(--card-bg); 
    border-radius: 10rpx; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);
}
.add-icon { font-size: 40rpx; color: var(--text-color); margin-top: -4rpx; }
.nav-placeholder { width: 100%; height: calc(var(--status-bar-height) + 88rpx); }

.empty-tip { 
    text-align: center; color: var(--text-sub); padding-top: 150rpx; font-size: 28rpx; 
    .emoji { font-size: 80rpx; display: block; margin-bottom: 20rpx; }
}

.scene-list { padding-bottom: 120rpx; }
.scene-item {
    display: flex; padding: 30rpx; border-bottom: 1px solid var(--border-color);
    background: var(--card-bg); transition: background-color 0.2s;
    &:active { background-color: var(--tool-bg); }
}

.scene-icon-box {
    width: 120rpx; height: 120rpx; border-radius: 16rpx; 
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex; align-items: center; justify-content: center; margin-right: 24rpx; flex-shrink: 0;
    .default-icon { font-size: 50rpx; }
}

.content-box { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 4rpx 0; }
.row-top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 34rpx; font-weight: bold; color: var(--text-color); }
.role-tag { font-size: 22rpx; background: rgba(0,122,255,0.1); color: #007aff; padding: 2rpx 10rpx; border-radius: 6rpx; }
.npc-preview { font-size: 24rpx; color: var(--text-sub); font-weight: 500; }
.desc { font-size: 26rpx; color: var(--text-sub); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; width: 450rpx; opacity: 0.8; }
</style>