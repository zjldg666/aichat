<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    <view class="custom-navbar">
      <view class="status-bar"></view>
      
      <view class="nav-content">
        <view class="location-capsule">
            <image class="capsule-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0QzRDNEMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOS02LTktMTNhOSAxMCAwIDAgMSAxOCAweiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=" mode="aspectFit"></image>
            <view class="capsule-info">
                <text class="capsule-label">当前位置</text>
                <text class="capsule-value">{{ globalLocation === 'CORRIDOR' ? '走廊/街道' : globalLocation }}</text>
            </view>
        </view>
        
        <view class="right-actions">
            <view class="glass-btn phone-btn" @click="showPhone = true">
              <image class="btn-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDdhZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSI1IiB5PSIyIiB3aWR0aD0iMTQiIGhlaWdodD0iMjAiIHJ4PSIyIiByeT0iMiIvPjxsaW5lIHgxPSIxMiIgeTE9IjE4IiB4Mj0iMTIuMDEiIHkyPSIxOCIvPjwvc3ZnPg==" mode="aspectFit"></image>
            </view>
            <view class="glass-btn add-btn" @click="createNewContact">
              <image class="btn-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48bGluZSB4MT0iMTIiIHkxPSI1IiB4Mj0iMTIiIHkyPSIxOSIvPjxsaW5lIHgxPSI1IiB5MT0iMTIiIHgyPSIxOSIgeTI9IjEyIi8+PC9zdmc+" mode="aspectFit"></image>
            </view>
        </view>
      </view>
    </view>
    
    <view class="nav-placeholder"></view>

    <scroll-view scroll-y class="room-list">
      <view class="list-header">
        <text class="list-title">探索社区</text>
        <text class="list-subtitle">发现 {{ roomGroups.length }} 个活跃区域</text>
      </view>

      <view v-if="roomGroups.length === 0" class="empty-state">
        <image class="empty-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOSIgLz48bGluZSB4MT0iOSIgeTE9IjEwIiB4Mj0iOS4wMSIgeTI9IjEwIiAvPjxsaW5lIHgxPSIxNSIgeTE9IjEwIiB4Mj0iMTUuMDEiIHkyPSIxOCIgLz48cGF0aCBkPSJNOS41IDE1LjI1YTMuNSAzLjUgMCAwIDEgNSAwIiAvPjwvc3ZnPg==" mode="aspectFit"></image>
        <text>这里静悄悄的...</text>
        <text class="empty-sub">点击右上角 + 邀请新住户入住</text>
      </view>

      <view 
        class="room-card" 
        v-for="(room, index) in roomGroups" 
        :key="room.name"
        @click="handleEnterRoom(room)"
        :class="{ 'active-location': globalLocation === room.name }"
      >
        <view class="card-content">
            <view class="room-info">
                <view class="room-title-row">
                    <text class="room-name">{{ room.name }}</text>
                    <view class="my-location-badge" v-if="globalLocation === room.name">
                        <view class="pulse-dot"></view>
                        <text>当前位置</text>
                    </view>
                </view>
                
                <view class="resident-pile">
                    <view 
                        class="avatar-circle" 
                        v-for="(npc, i) in room.npcs.slice(0, 5)" 
                        :key="npc.id"
                        :style="{ zIndex: 10 - i }"
                    >
                        <image :src="npc.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="pile-img"></image>
                        <view class="status-indicator" v-if="npc.unread > 0"></view>
                    </view>
                    <view class="more-count" v-if="room.npcs.length > 5">
                        <text>+{{ room.npcs.length - 5 }}</text>
                    </view>
                    <text class="resident-count-text" v-if="room.npcs.length > 0">{{ room.npcs.length }} 人在场</text>
                    <text class="resident-count-text empty" v-else>暂无人在场</text>
                </view>
            </view>
            
            <view class="card-action">
                 <button class="action-btn-pill enter" v-if="globalLocation === room.name">
                    <text>↩️ 返回</text>
                 </button>
                 <button class="action-btn-pill visit" v-else-if="globalLocation === 'CORRIDOR'">
                    <text>🔑 进门</text>
                 </button>
                 <button class="action-btn-pill travel" v-else>
                    <text>👣 串门</text>
                 </button>
            </view>
        </view>
      </view>
    </scroll-view>

    <GamePhone 
      :visible="showPhone"
      :world-id="currentWorldId"
      :current-chat-id="''"
      :time="formattedTime"
      @close="showPhone = false"
    />

    <CustomTabBar :current="0" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onReady } from '@dcloudio/uni-app';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useTheme } from '@/composables/useTheme.js';
import GamePhone from '@/components/GamePhone.vue';
import { useGameTime } from '@/composables/useGameTime.js';

const { isDarkMode } = useTheme();
const { formattedTime } = useGameTime();

const contactList = ref([]);
const globalLocation = ref('CORRIDOR'); 
const showPhone = ref(false);

const currentWorldId = computed(() => {
    if (contactList.value.length > 0) {
        return contactList.value[0].worldId;
    }
    return '';
});

onShow(() => {
  const list = uni.getStorageSync('contact_list') || [];
  contactList.value = list;
  
  const savedLoc = uni.getStorageSync('app_global_player_location');
  if (savedLoc) {
      globalLocation.value = savedLoc;
  } else {
      updateLocation('CORRIDOR');
  }
});

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

const handleEnterRoom = (room) => {
    const targetLoc = room.name;
    const currentLoc = globalLocation.value;
    const targetNpc = room.npcs[0]; 
    if (!targetNpc) return;

    if (currentLoc === targetLoc) {
        enterChat(targetNpc.id);
        return;
    }

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

const updateLocation = (newLoc) => {
    console.log(`🦶 [移动] 玩家位置更新: ${globalLocation.value} -> ${newLoc}`);
    globalLocation.value = newLoc;
    uni.setStorageSync('app_global_player_location', newLoc);

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
/* 全局容器 */
.container { 
    background-color: var(--bg-color); 
    min-height: 100vh; 
    transition: background-color 0.3s;
}

/* === 顶部导航栏 (毛玻璃) === */
.custom-navbar { 
    position: fixed; 
    top: 0; 
    width: 100%; 
    background: rgba(255, 255, 255, 0.85); 
    backdrop-filter: blur(20px);            
    -webkit-backdrop-filter: blur(20px);
    z-index: 999; 
    border-bottom: 1px solid rgba(0,0,0,0.05);
    /* 确保内部元素垂直排列 */
    display: flex;
    flex-direction: column;
}
.dark-mode .custom-navbar {
    background: rgba(30, 30, 30, 0.85);
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

/* 🔥🔥🔥 核心修复：定义状态栏高度 🔥🔥🔥 */
.status-bar {
    height: var(--status-bar-height);
    width: 100%;
}

.nav-content { 
    height: 100rpx; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 0 32rpx; 
}

/* 位置胶囊 */
.location-capsule { 
    display: flex; 
    align-items: center; 
    background: rgba(0,0,0,0.04);
    padding: 8rpx 20rpx 8rpx 16rpx;
    border-radius: 40rpx;
}
.dark-mode .location-capsule { background: rgba(255,255,255,0.08); }

.capsule-icon { width: 32rpx; height: 32rpx; margin-right: 12rpx; opacity: 0.6; }
.capsule-info { display: flex; flex-direction: column; justify-content: center; }
.capsule-label { font-size: 20rpx; color: var(--text-sub); line-height: 1; margin-bottom: 4rpx; }
.capsule-value { font-size: 26rpx; font-weight: 700; color: var(--text-color); line-height: 1.2; }

/* 右侧按钮组 */
.right-actions { display: flex; align-items: center; gap: 24rpx; }

.glass-btn { 
    width: 80rpx; height: 80rpx; 
    background: #ffffff; 
    border-radius: 24rpx; 
    display: flex; align-items: center; justify-content: center; 
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06); 
    transition: all 0.2s;
    border: 1px solid rgba(0,0,0,0.02);
}
.dark-mode .glass-btn {
    background: #2c2c2c;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.05);
}
.glass-btn:active { transform: scale(0.92); opacity: 0.9; }

.phone-btn .btn-icon { width: 44rpx; height: 44rpx; }
.add-btn .btn-icon { width: 40rpx; height: 40rpx; opacity: 0.8; }

/* 占位符高度 = 状态栏 + 导航内容栏 */
.nav-placeholder { height: calc(var(--status-bar-height) + 100rpx); }

/* === 列表区域 === */
.room-list { 
    height: 100vh; 
    box-sizing: border-box; 
    padding: 20rpx 32rpx;
    padding-bottom: 160rpx; 
}

.list-header { margin-bottom: 30rpx; margin-top: 10rpx; }
.list-title { font-size: 40rpx; font-weight: 800; color: var(--text-color); display: block; }
.list-subtitle { font-size: 24rpx; color: var(--text-sub); margin-top: 8rpx; display: block; }

/* 空状态 */
.empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding-top: 100rpx; opacity: 0.6;
}
.empty-icon { width: 120rpx; height: 120rpx; margin-bottom: 30rpx; opacity: 0.5; }
.empty-sub { font-size: 24rpx; color: var(--text-sub); margin-top: 10rpx; }

/* === 卡片样式优化 === */
.room-card {
    background: var(--card-bg); 
    border-radius: 32rpx; 
    margin-bottom: 30rpx;
    box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.04); 
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    border: 1px solid transparent;
    overflow: hidden;
}
.dark-mode .room-card { box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }

.room-card:active { transform: scale(0.98); }
.room-card.active-location {
    border: 2rpx solid #007aff;
    background: linear-gradient(to bottom right, var(--card-bg), rgba(0,122,255,0.05));
}

.card-content { padding: 30rpx; display: flex; align-items: center; justify-content: space-between; }

.room-info { flex: 1; padding-right: 20rpx; }

.room-title-row { display: flex; align-items: center; margin-bottom: 24rpx; flex-wrap: wrap; gap: 16rpx; }
.room-name { font-size: 34rpx; font-weight: 700; color: var(--text-color); }

/* 当前位置徽章 */
.my-location-badge {
    background: rgba(0,122,255,0.1); 
    padding: 6rpx 16rpx; 
    border-radius: 20rpx;
    display: flex; align-items: center; gap: 10rpx;
}
.my-location-badge text { font-size: 22rpx; color: #007aff; font-weight: bold; }
.pulse-dot { width: 12rpx; height: 12rpx; background: #007aff; border-radius: 50%; animation: pulse 1.5s infinite; }

@keyframes pulse {
    0% { transform: scale(0.8); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.6; }
    100% { transform: scale(0.8); opacity: 1; }
}

/* === 头像堆叠效果 === */
.resident-pile { display: flex; align-items: center; height: 60rpx; }
.avatar-circle { 
    width: 64rpx; height: 64rpx; 
    border-radius: 50%; 
    border: 4rpx solid var(--card-bg); 
    margin-left: -20rpx; 
    position: relative;
    flex-shrink: 0;
}
.avatar-circle:first-child { margin-left: 0; }

.pile-img { width: 100%; height: 100%; border-radius: 50%; background: #eee; }
.status-indicator { position: absolute; top: 0; right: 0; width: 16rpx; height: 16rpx; background: #ff4d4f; border: 3rpx solid var(--card-bg); border-radius: 50%; }

.more-count {
    width: 64rpx; height: 64rpx; 
    border-radius: 50%; 
    background: #f0f0f0; 
    border: 4rpx solid var(--card-bg);
    margin-left: -20rpx;
    display: flex; align-items: center; justify-content: center;
    z-index: 0;
}
.more-count text { font-size: 22rpx; color: #999; font-weight: bold; }
.resident-count-text { font-size: 22rpx; color: var(--text-sub); margin-left: 16rpx; }
.resident-count-text.empty { margin-left: 0; color: #ccc; }

/* === 右侧动作按钮 === */
.card-action { flex-shrink: 0; }
.action-btn-pill {
    margin: 0; padding: 0;
    width: 140rpx; height: 64rpx;
    border-radius: 32rpx;
    display: flex; align-items: center; justify-content: center;
    font-size: 26rpx; font-weight: bold;
    border: none;
    line-height: 1;
}
.action-btn-pill::after { border: none; }

.action-btn-pill.enter { background: #f2f2f7; color: #666; }
.action-btn-pill.visit { background: #007aff; color: #fff; box-shadow: 0 4rpx 12rpx rgba(0,122,255,0.3); }
.action-btn-pill.travel { background: #fff; color: #007aff; border: 2rpx solid #007aff; }

.dark-mode .action-btn-pill.enter { background: #333; color: #aaa; }
.dark-mode .action-btn-pill.travel { background: transparent; color: #007aff; border-color: #007aff; }
</style>