<template>
  <view class="gallery-container">
    <view v-if="Object.keys(galleryData).length === 0" class="empty-state">
      <text class="empty-icon">🖼️</text>
      <text>暂无图片，快去聊天生图吧</text>
    </view>

    <!-- 遍历每个角色的相册 -->
    <view v-for="(item, roleId) in galleryData" :key="roleId" class="role-section">
      <view class="role-header">
        <view class="role-title">{{ item.name }}</view>
        <view class="role-count">{{ item.images.length }} 张</view>
      </view>
      
      <view class="grid-layout">
        <view 
          v-for="(img, index) in item.images" 
          :key="index" 
          class="grid-item" 
          @click="previewImg(item.images, index)"
          @longpress="deleteImg(roleId, index)"
        >
          <image :src="img.path" mode="aspectFill" class="grid-img"></image>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getGalleryData, deleteImage } from '@/utils/gallery-save.js';

const galleryData = ref({});

onShow(() => {
  refreshData();
});

const refreshData = () => {
  galleryData.value = getGalleryData();
};

const previewImg = (images, index) => {
  const urls = images.map(i => i.path);
  uni.previewImage({
    urls: urls,
    current: index
  });
};

const deleteImg = (roleId, index) => {
  uni.showModal({
    title: '删除图片',
    content: '确定要从本地永久删除这张图片吗？',
    confirmColor: '#ff4757',
    success: (res) => {
      if (res.confirm) {
        const success = deleteImage(roleId, index);
        if (success) {
           uni.showToast({ title: '已删除', icon: 'none' });
           refreshData();
        }
      }
    }
  });
};
</script>

<style lang="scss">
.gallery-container { min-height: 100vh; background-color: #1e1e1e; padding: 20rpx; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #666; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }

.role-section { margin-bottom: 40rpx; }
.role-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; padding: 0 10rpx; }
.role-title { color: #fff; font-size: 32rpx; font-weight: bold; border-left: 6rpx solid #007aff; padding-left: 16rpx; }
.role-count { color: #888; font-size: 24rpx; }

.grid-layout { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; }
.grid-item { position: relative; aspect-ratio: 1; border-radius: 8rpx; overflow: hidden; background-color: #333; }
.grid-img { width: 100%; height: 100%; }
</style>