<template>
  <view class="gallery-container">
    
    <view class="nav-header" v-if="isSelectMode">
      <text class="nav-title">已选择 {{ selectedCount }} 张</text>
      <text class="nav-btn" @click="exitSelectMode">取消</text>
    </view>
    <view class="nav-header-placeholder" v-if="isSelectMode"></view>

    <view v-if="Object.keys(galleryData).length === 0" class="empty-state">
      <text class="empty-icon">🖼️</text>
      <text>暂无图片，快去聊天生图吧</text>
    </view>

    <view v-for="(item, roleId) in galleryData" :key="roleId" class="role-section">
      <template v-if="item.images && item.images.length > 0">
        <view class="role-header">
          <view class="role-title">{{ item.name }}</view>
          <view class="role-count">{{ item.images.length }} 张</view>
        </view>
        
        <view class="grid-layout">
          <view 
            v-for="(img, index) in item.images" 
            :key="index" 
            class="grid-item" 
            @click="handleItemClick(roleId, index)"
            @longpress="handleLongPress(roleId, index)"
          >
            <image :src="img.path" mode="aspectFill" class="grid-img"></image>
            
            <view class="overlay" v-if="isSelectMode">
              <view class="check-circle" :class="{ 'checked': isSelected(roleId, index) }">
                <text v-if="isSelected(roleId, index)" class="check-icon">✓</text>
              </view>
            </view>
          </view>
        </view>
      </template>
    </view>
    
    <view style="height: 120rpx;" v-if="isSelectMode"></view>

    <view class="bottom-bar" :class="{ 'show': isSelectMode }">
      <view class="delete-btn" @click="deleteSelectedImages">
        <text>删除 ({{ selectedCount }})</text>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getGalleryData } from '@/utils/gallery-save.js';

// 数据源
const galleryData = ref({});
const isSelectMode = ref(false);
// 选中的集合，格式为 "roleId-index" 的字符串
const selectedSet = ref(new Set());

onShow(() => {
  refreshData();
  isSelectMode.value = false;
  selectedSet.value.clear();
});

const refreshData = () => {
  galleryData.value = getGalleryData();
};

const selectedCount = computed(() => selectedSet.value.size);

// 判断某张图是否被选中
const isSelected = (roleId, index) => {
  return selectedSet.value.has(`${roleId}-${index}`);
};

// 长按触发选择模式
const handleLongPress = (roleId, index) => {
  if (isSelectMode.value) return;
  uni.vibrateShort();
  isSelectMode.value = true;
  selectedSet.value.add(`${roleId}-${index}`);
};

// 点击处理 (分模式)
const handleItemClick = (roleId, index) => {
  if (isSelectMode.value) {
    // 【选择模式】：切换选中状态
    const key = `${roleId}-${index}`;
    if (selectedSet.value.has(key)) {
      selectedSet.value.delete(key);
    } else {
      selectedSet.value.add(key);
    }
  } else {
    // 【浏览模式】：查看大图
    previewImg(galleryData.value[roleId].images, index);
  }
};

const exitSelectMode = () => {
  isSelectMode.value = false;
  selectedSet.value.clear();
};

const previewImg = (images, index) => {
  const urls = images.map(i => i.path);
  uni.previewImage({
    urls: urls,
    current: index
  });
};

// 核心：批量删除逻辑
const deleteSelectedImages = () => {
  if (selectedCount.value === 0) return;

  uni.showModal({
    title: '批量删除',
    content: `确定要删除这 ${selectedCount.value} 张照片吗？`,
    confirmColor: '#ff4757',
    success: (res) => {
      if (res.confirm) {
        performBatchDelete();
      }
    }
  });
};

const performBatchDelete = () => {
  uni.showLoading({ title: '删除中...' });
  
  try {
    // 1. 将选中的 key 解析并按 roleId 分组
    const deleteMap = {};
    selectedSet.value.forEach(key => {
      const [roleId, idxStr] = key.split('-');
      const idx = parseInt(idxStr);
      
      if (!deleteMap[roleId]) deleteMap[roleId] = [];
      deleteMap[roleId].push(idx);
    });

    // 2. 开始删除
    for (const roleId in deleteMap) {
      const indices = deleteMap[roleId];
      // ⚠️ 重要：从大到小排序，防止索引错位
      indices.sort((a, b) => b - a);
      
      const roleData = galleryData.value[roleId];
      if (roleData && roleData.images) {
        indices.forEach(idx => {
          // A. 物理删除文件
          const path = roleData.images[idx].path;
          uni.removeSavedFile({
            filePath: path,
            fail: (e) => console.log('物理删除失败(可能文件不在了)', e)
          });
          
          // B. 从数组移除
          roleData.images.splice(idx, 1);
        });
      }
    }

    // 3. 保存回本地 (请确认你的 Key 与 saveToGallery 一致)
    uni.setStorageSync('gallery_save_data', galleryData.value); 
    
    uni.showToast({ title: '已删除', icon: 'success' });
    exitSelectMode();
    refreshData(); // 强制刷新界面
    
  } catch (e) {
    console.error(e);
    uni.showToast({ title: '删除出错', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};
</script>

<style lang="scss">
.gallery-container { 
  min-height: 100vh; 
  background-color: #1e1e1e; 
  padding: 20rpx; 
  padding-bottom: 40rpx;
}

/* 顶部操作栏 */
.nav-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 88rpx;
  background-color: rgba(30, 30, 30, 0.95);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30rpx;
  z-index: 100;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.3);
  backdrop-filter: blur(10px);
}
.nav-header-placeholder { height: 88rpx; }
.nav-title { color: #fff; font-size: 30rpx; font-weight: bold; }
.nav-btn { color: #007aff; font-size: 28rpx; padding: 10rpx; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #666; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }

/* 角色区块 */
.role-section { margin-bottom: 40rpx; }
.role-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; padding: 0 10rpx; }
.role-title { color: #fff; font-size: 32rpx; font-weight: bold; border-left: 6rpx solid #007aff; padding-left: 16rpx; }
.role-count { color: #888; font-size: 24rpx; }

/* 网格布局 */
.grid-layout { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; }
.grid-item { position: relative; aspect-ratio: 1; border-radius: 8rpx; overflow: hidden; background-color: #333; transition: transform 0.1s; }
.grid-item:active { transform: scale(0.98); }
.grid-img { width: 100%; height: 100%; }

/* 选中遮罩 */
.overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0,0,0,0.3);
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  padding: 10rpx;
}
.check-circle {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
  background-color: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.check-circle.checked {
  background-color: #007aff;
  border-color: #007aff;
}
.check-icon { font-size: 24rpx; color: #fff; font-weight: bold; }

/* 底部删除栏 */
.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background-color: #2c2c2c;
  padding: 20rpx 0;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 100;
  display: flex;
  justify-content: center;
  border-top: 1px solid #333;
}
.bottom-bar.show { transform: translateY(0); }

.delete-btn {
  background-color: #ff4757;
  color: #fff;
  padding: 16rpx 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: bold;
}
</style>