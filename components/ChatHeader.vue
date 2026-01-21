<template>
  <view class="status-bar-wrapper">
    <view class="info-row">
      <view class="location-box" :class="interactionMode === 'phone' ? 'mode-phone' : 'mode-face'">
        <view class="icon-circle">
          <text>{{ interactionMode === 'phone' ? '📱' : '📍' }}</text>
        </view>
        <view class="status-content">
          <view class="loc-row">
            <text class="mode-tag">{{ interactionMode === 'phone' ? '远程' : '当面' }}</text>
            <text class="location-text">{{ currentLocation }}</text>
          </view>
          <text class="activity-text">状态: {{ currentActivity }}</text>
        </view>
      </view>

      <view class="right-status-group">
            <view class="status-pill player-pill" @click="$emit('clickPlayer')">
              <text class="pill-icon">👤</text>
              <text class="pill-text">{{ playerLocation }}</text>
            </view>
      
            <view class="status-pill time-pill" @click="$emit('clickTime')" v-if="!isEmbedded">
              <text class="time-clock">{{ timeParts.time }}</text>
              <text class="time-week">{{ timeParts.week }}</text>
            </view>
          </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  interactionMode: {
    type: String,
    default: 'phone'
  },
  currentLocation: {
    type: String,
    default: '未知位置'
  },
  currentActivity: {
    type: String,
    default: '休息中'
  },
  playerLocation: {
    type: String,
    default: '加载中...'
  },
  timeParts: {
    type: Object,
    default: () => ({ time: '--:--', week: '--' })
  },
  isEmbedded: { type: Boolean, default: false }
});

defineEmits(['clickPlayer', 'clickTime']);
</script>

<style lang="scss" scoped>
/* 状态栏 - 磨砂玻璃效果 */
.status-bar-wrapper {
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  padding: 20rpx 24rpx;
  z-index: 10;
  flex-shrink: 0;
  box-shadow: var(--shadow);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  height: 100rpx;
  gap: 16rpx;
}

/* --- 左侧：角色位置卡片 --- */
.location-box {
  flex: 1.4;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  border-radius: 20rpx;
  border: 1px solid transparent;
  transition: all 0.3s;

  &.mode-phone {
    background: var(--pill-bg);
    border-color: var(--border-color);
    .icon-circle { background: var(--bg-color); color: var(--text-sub); }
    .mode-tag { background: var(--bg-color); color: var(--text-sub); }
  }

  &.mode-face {
    background: linear-gradient(135deg, rgba(0,122,255,0.1) 0%, rgba(0,122,255,0.05) 100%);
    border-color: rgba(0,122,255,0.3);
    .icon-circle { background: var(--card-bg); color: #007aff; box-shadow: 0 2rpx 8rpx rgba(0,122,255,0.15); }
    .mode-tag { background: var(--card-bg); color: #007aff; }
  }
}

.icon-circle {
  width: 64rpx; height: 64rpx;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.status-content {
  flex: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden;
}

.loc-row {
  display: flex; align-items: center; margin-bottom: 4rpx;
}

.mode-tag {
  font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 6rpx;
  margin-right: 8rpx; font-weight: bold; flex-shrink: 0;
}

.location-text {
  font-size: 26rpx; font-weight: bold;
  color: var(--text-color);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.activity-text {
  font-size: 20rpx;
  color: var(--text-sub);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* --- 右侧：状态组 --- */
.right-status-group {
  flex: 0.9;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8rpx;
}

.status-pill {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
}

.time-pill, .player-pill {
  background: var(--pill-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);

  .pill-icon { margin-right: 8rpx; font-size: 24rpx; }
  .pill-text { font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .time-clock { font-weight: bold; font-size: 26rpx; font-family: Helvetica, sans-serif; }
  .time-week { color: var(--text-sub); font-size: 20rpx; }

  &.time-pill { justify-content: space-between; }
}
</style>