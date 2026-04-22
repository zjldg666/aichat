<template>
  <view class="status-bar-wrapper">
    <view class="info-row">
      <view class="location-box">
        <view class="icon-circle">
          <text>📍</text>
        </view>
        <view class="status-content">
          <view class="loc-row">
            <text class="mode-tag">当面</text>
            <text class="location-text">{{ currentLocation }}</text>
          </view>
          <text class="activity-text">状态：{{ currentActivity }}</text>
        </view>
      </view>

      <view class="right-status-group">
        <view class="status-pill player-pill" @click="$emit('clickPlayer')">
          <text class="pill-icon">👤</text>
          <text class="pill-text">{{ playerLocation }}</text>
        </view>

        <view v-if="!isEmbedded" class="status-pill time-pill" @click="$emit('clickTime')">
          <text class="time-clock">{{ timeParts.time }}</text>
          <text class="time-week">{{ timeParts.week }}</text>
        </view>
      </view>
    </view>

    <scroll-view v-if="hasSceneItems && !isEmbedded" scroll-x class="scene-banner">
      <view class="scene-items-flex">
        <view class="scene-item wallet" @click="$emit('clickWallet')">
          <text class="item-icon">💰</text>
          <text class="item-name">¥{{ wallet }}</text>
        </view>

        <view
          v-if="playerLocation === '客厅'"
          class="scene-item courier"
          @click="$emit('clickCourier')"
        >
          <text class="item-icon">📦</text>
          <text class="item-name">快递箱({{ economy?.courierBox?.length || 0 }})</text>
        </view>

        <template v-if="currentRoomContainers">
          <view
            v-for="(items, cName) in currentRoomContainers"
            :key="cName"
            class="scene-item container-item"
            @click="$emit('clickContainer', cName)"
          >
            <text class="item-icon">{{ getContainerIcon(cName) }}</text>
            <text class="item-name">{{ cName }}</text>
          </view>
        </template>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { useCharacterStore } from '@/stores/useCharacterStore';
import {
  resolveCurrentRoomContainers,
  shouldShowChatSceneBanner
} from '@/utils/chat/chat-header-scene-items.js';

const props = defineProps({
  currentLocation: { type: String, default: '未知位置' },
  currentActivity: { type: String, default: '休息中' },
  playerLocation: { type: String, default: '加载中...' },
  timeParts: { type: Object, default: () => ({ time: '--:--', week: '--' }) },
  isEmbedded: { type: Boolean, default: false },
  wallet: { type: Number, default: 0 },
  residentEconomy: { type: Object, default: null }
});

defineEmits(['clickPlayer', 'clickTime', 'clickWallet', 'clickCourier', 'clickContainer']);

const charStore = useCharacterStore();
const currentRole = computed(() => charStore.currentCharacter);
const economy = computed(() => props.residentEconomy || currentRole.value?.economy || null);
const currentRoomContainers = computed(() =>
  resolveCurrentRoomContainers(economy.value, props.playerLocation)
);
const hasSceneItems = computed(() =>
  shouldShowChatSceneBanner({
    economy: economy.value,
    playerLocation: props.playerLocation,
    currentRoomContainers: currentRoomContainers.value
  })
);

function getContainerIcon(name = '') {
  if (name.includes('冰箱')) return '🧊';
  if (name.includes('橱柜')) return '🗄️';
  if (name.includes('浴室柜')) return '🧴';
  if (name.includes('床头柜')) return '🗃️';
  return '📦';
}
</script>

<style lang="scss" scoped>
.status-bar-wrapper {
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  padding: 20rpx 24rpx;
  z-index: 10;
  flex-shrink: 0;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  height: 100rpx;
  gap: 16rpx;
}

.location-box {
  flex: 1.4;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  border-radius: 20rpx;
  border: 1px solid rgba(0, 122, 255, 0.3);
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.1) 0%, rgba(0, 122, 255, 0.05) 100%);
}

.icon-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
  background: var(--card-bg);
  color: #007aff;
  box-shadow: 0 2rpx 8rpx rgba(0, 122, 255, 0.15);
}

.status-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.loc-row {
  display: flex;
  align-items: center;
  margin-bottom: 4rpx;
}

.mode-tag {
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  margin-right: 8rpx;
  font-weight: bold;
  flex-shrink: 0;
  background: var(--card-bg);
  color: #007aff;
}

.location-text {
  font-size: 26rpx;
  font-weight: bold;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-text {
  font-size: 20rpx;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

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

.time-pill,
.player-pill {
  background: var(--pill-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);

  .pill-icon {
    margin-right: 8rpx;
    font-size: 24rpx;
  }

  .pill-text {
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .time-clock {
    font-weight: bold;
    font-size: 26rpx;
    font-family: Helvetica, sans-serif;
  }

  .time-week {
    color: var(--text-sub);
    font-size: 20rpx;
  }

  &.time-pill {
    justify-content: space-between;
  }
}

.scene-banner {
  width: 100%;
  white-space: nowrap;
}

.scene-items-flex {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 4rpx 0;
}

.scene-item {
  display: inline-flex;
  align-items: center;
  background: var(--pill-bg);
  border: 1px solid var(--border-color);
  padding: 8rpx 20rpx;
  border-radius: 30rpx;
  transition: all 0.2s;
  flex-shrink: 0;
}

.scene-item:active {
  background: var(--border-color);
}

.item-icon {
  font-size: 26rpx;
  margin-right: 8rpx;
}

.item-name {
  font-size: 24rpx;
  color: var(--text-color);
  font-weight: bold;
}

.wallet {
  background: rgba(255, 153, 0, 0.1);
  border-color: rgba(255, 153, 0, 0.3);

  .item-name {
    color: #e67e22;
  }
}

.courier {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.3);

  .item-name {
    color: #007aff;
  }
}
</style>
