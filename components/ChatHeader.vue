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

    <scroll-view scroll-x class="scene-banner" v-if="hasSceneItems && !isEmbedded">
      <view class="scene-items-flex">
        
        <view class="scene-item wallet" @click="$emit('clickWallet')">
          <text class="item-icon">💰</text>
          <text class="item-name">¥{{ wallet}}</text>
        </view>

        <view class="scene-item courier" v-if="playerLocation === '客厅'" @click="$emit('clickCourier')">
          <text class="item-icon">📦</text>
          <text class="item-name">快递箱({{ economy?.courierBox?.length || 0 }})</text>
        </view>

        <template v-if="currentRoomContainers">
          <view class="scene-item container-item" 
                v-for="(items, cName) in currentRoomContainers" 
                :key="cName" 
                @click="$emit('clickContainer', cName)">
            <text class="item-icon">{{ getContainerIcon(cName) }}</text>
            <text class="item-name">{{ cName }}</text>
          </view>
        </template>
        
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed,watch } from 'vue';
import { useCharacterStore } from '@/stores/useCharacterStore';

const props = defineProps({
  interactionMode: { type: String, default: 'phone' },
  currentLocation: { type: String, default: '未知位置' },
  currentActivity: { type: String, default: '休息中' },
  playerLocation: { type: String, default: '加载中...' },
  timeParts: { type: Object, default: () => ({ time: '--:--', week: '--' }) },
  isEmbedded: { type: Boolean, default: false },
  wallet: {
      type: Number,
      default: 0
    }
});

watch(() => props.currentActivity, (newVal, oldVal) => {
    console.log("=========================================");
    console.log("🏷️ [ChatHeader 状态更新拦截]!");
    console.log("👉 [旧状态]:", oldVal);
    console.log("👉 [新状态]:", newVal);
    if (newVal && newVal.length > 20) {
        console.warn("🚨 警告：状态文本过长，大概率是提取动作的正则翻车了！");
    }
    console.log("=========================================");
});
// ✨ 新增了点击容器的 emit 事件
defineEmits(['clickPlayer', 'clickTime', 'clickWallet', 'clickCourier', 'clickContainer']);

// --- 引入管家，获取底层财产数据 ---
const charStore = useCharacterStore();
const currentRole = computed(() => charStore.currentCharacter);
const economy = computed(() => currentRole.value?.economy);

// 动态计算：当前玩家所在的房间，有没有配置容器？
const currentRoomContainers = computed(() => {
  if (!economy.value || !economy.value.containers) return null;
  // 直接通过玩家当前地点名字，去匹配 containers 字典
  return economy.value.containers[props.playerLocation] || null;
});

// 判断是否需要显示底部的场景横幅
const hasSceneItems = computed(() => {
  if (!economy.value) return false;
  // 只要在客厅(有快递箱) 或者 当前房间有容器，就显示横幅
  return props.playerLocation === '客厅' || !!currentRoomContainers.value;
});

// 动态给容器分配小图标
const getContainerIcon = (name) => {
  if (name.includes('冰箱')) return '🧊';
  if (name.includes('橱柜')) return '🗄️';
  if (name.includes('浴室柜')) return '🧴';
  if (name.includes('床头柜')) return '🗃️';
  return '📦';
};
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
  display: flex;
  flex-direction: column;
  gap: 16rpx; /* 上下部分的间距 */
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

/* ✨✨✨ 新增：场景横幅样式 ✨✨✨ */
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
  .item-name { color: #e67e22; }
}

.courier {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.3);
  .item-name { color: #007aff; }
}
</style>