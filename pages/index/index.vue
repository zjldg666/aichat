<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    <view class="custom-navbar">
      <view class="status-bar"></view>
      <view class="nav-content">
        <view class="location-status">
            <text class="status-icon">📍</text>
            <view class="status-text">
                <text class="label">当前位置</text>
                <text class="value">{{ globalLocation === 'CORRIDOR' ? '走廊/街道' : globalLocation }}</text>
            </view>
        </view>
        <view class="add-btn" @click="createNewContact">
          <text class="add-icon">+</text>
        </view>
      </view>
    </view>
    <view class="nav-placeholder"></view>

    <scroll-view scroll-y class="room-list">
      <view v-if="roomGroups.length === 0" class="empty-tip">
        这里空荡荡的... 点击右上角 + 邀请住户
      </view>

      <view 
        class="room-card" 
        v-for="(room, index) in roomGroups" 
        :key="room.name"
        @click="handleEnterRoom(room)"
      >
        <view class="room-header">
            <text class="room-name">{{ room.name }}</text>
            <view class="room-tag" v-if="globalLocation === room.name">
                <text>🏠 我在这里</text>
            </view>
        </view>
        
        <view class="room-residents">
            <view 
                class="resident-avatar-box" 
                v-for="npc in room.npcs" 
                :key="npc.id"
            >
                <image :src="npc.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="resident-avatar"></image>
                <view class="unread-dot" v-if="npc.unread > 0"></view>
                <text class="resident-name">{{ npc.name }}</text>
            </view>
        </view>
        
        <view class="action-bar">
             <text class="action-text" v-if="globalLocation === room.name">↩️ 返回房间</text>
             <text class="action-text" v-else-if="globalLocation === 'CORRIDOR'">🔑 进门</text>
             <text class="action-text highlight" v-else>👣 去串门</text>
        </view>
      </view>
    </scroll-view>

    

    <CustomTabBar :current="0" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onReady } from '@dcloudio/uni-app';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useTheme } from '@/composables/useTheme.js';

// 🔥 引入手机组件


const { isDarkMode } = useTheme();
const contactList = ref([]);
const globalLocation = ref('CORRIDOR'); // 默认在走廊

onShow(() => {
  // 1. 读取联系人
  const list = uni.getStorageSync('contact_list') || [];
  contactList.value = list;
  
  // 2. 读取玩家物理位置 (如果没有，默认为走廊)
  const savedLoc = uni.getStorageSync('app_global_player_location');
  if (savedLoc) {
      globalLocation.value = savedLoc;
  } else {
      updateLocation('CORRIDOR');
  }
});

// 按地址分组逻辑
const roomGroups = computed(() => {
    const groups = {};
    contactList.value.forEach(npc => {
        const loc = npc.location || '未知区域';
        if (!groups[loc]) {
            groups[loc] = [];
        }
        groups[loc].push(npc);
    });
    return Object.keys(groups).sort().map(locName => ({
        name: locName,
        npcs: groups[locName]
    }));
});

const createNewContact = () => {
  uni.navigateTo({ url: '/pages/create/create' });
};

// 进门逻辑
const handleEnterRoom = (room) => {
    const targetLoc = room.name;
    const currentLoc = globalLocation.value;
    
    // 假设找房间里的第一个人
    const targetNpc = room.npcs[0]; 
    if (!targetNpc) return;

    // A. 我就在这个房间 -> 直接聊 (Face模式)
    if (currentLoc === targetLoc) {
        enterChat(targetNpc.id);
        return;
    }

    // B. 我在别的地方 -> 询问是否移动
    let title = '敲门进入';
    let content = `要进入 ${targetLoc} 吗？`;
    
    if (currentLoc !== 'CORRIDOR') {
        title = '串门';
        content = `从 [${currentLoc}] 前往 [${targetLoc}] 吗？`;
    }

    uni.showModal({
        title: title,
        content: content,
        confirmText: '进屋',
        cancelText: '取消', 
        success: (res) => {
            if (res.confirm) {
                updateLocation(targetLoc);
                enterChat(targetNpc.id, true); 
            }
        }
    });
};

// 更新位置并同步给角色
const updateLocation = (newLoc) => {
    console.log(`🦶 [移动] 玩家位置更新: ${globalLocation.value} -> ${newLoc}`);
    globalLocation.value = newLoc;
    uni.setStorageSync('app_global_player_location', newLoc);

    // 同步给所有 NPC
    const list = contactList.value.map(npc => {
        return {
            ...npc,
            playerLocation: newLoc 
        };
    });
    contactList.value = list;
    uni.setStorageSync('contact_list', list);
};

const enterChat = (id, isNewEntry = false) => {
    uni.navigateTo({
        url: `/pages/chat/chat?id=${id}&isNewEntry=${isNewEntry}`
    });
};
</script>

<style lang="scss" scoped>
.container { background-color: var(--bg-color); min-height: 100vh; }
.custom-navbar { position: fixed; top: 0; width: 100%; background-color: var(--bg-color); z-index: 999; box-shadow: 0 1px 0 var(--border-color); }
.nav-content { height: 88rpx; display: flex; justify-content: space-between; align-items: center; padding: 0 30rpx; }
.location-status { display: flex; align-items: center; }
.status-icon { font-size: 36rpx; margin-right: 12rpx; }
.status-text { display: flex; flex-direction: column; }
.label { font-size: 20rpx; color: var(--text-sub); }
.value { font-size: 28rpx; font-weight: bold; color: var(--text-color); }
.add-btn { width: 60rpx; height: 60rpx; background: var(--card-bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); }
.add-icon { font-size: 40rpx; color: var(--text-color); margin-top: -4rpx; }
.nav-placeholder { height: calc(var(--status-bar-height) + 88rpx); }

.room-list { padding: 30rpx; padding-bottom: 120rpx; height: 100vh; box-sizing: border-box; }
.empty-tip { text-align: center; color: var(--text-sub); margin-top: 100rpx; font-size: 26rpx; }

.room-card {
    background: var(--card-bg); border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx;
    border: 1px solid var(--border-color); box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.02);
    transition: transform 0.1s;
}
.room-card:active { transform: scale(0.98); }

.room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.room-name { font-size: 32rpx; font-weight: bold; color: var(--text-color); }
.room-tag { background: rgba(0,122,255,0.1); padding: 4rpx 12rpx; border-radius: 8rpx; }
.room-tag text { font-size: 22rpx; color: #007aff; font-weight: bold; }

.room-residents { display: flex; flex-wrap: wrap; gap: 20rpx; margin-bottom: 20rpx; }
.resident-avatar-box { display: flex; flex-direction: column; align-items: center; width: 100rpx; position: relative; }
.resident-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #eee; border: 2rpx solid var(--border-color); }
.unread-dot { position: absolute; top: 0; right: 10rpx; width: 16rpx; height: 16rpx; background: #ff4d4f; border-radius: 50%; border: 2rpx solid #fff; }
.resident-name { font-size: 22rpx; color: var(--text-sub); margin-top: 8rpx; width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.action-bar { border-top: 1px solid var(--border-color); padding-top: 16rpx; text-align: right; }
.action-text { font-size: 24rpx; color: var(--text-sub); }
.action-text.highlight { color: #007aff; font-weight: bold; }
</style>