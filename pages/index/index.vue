<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    <!-- 1. 顶部导航栏 -->
    <view class="custom-navbar">
      <view class="status-bar"></view>
      <view class="nav-content">
        <view class="location-capsule">
            <text class="capsule-icon-text">📍</text>
            <view class="capsule-info">
                <text class="capsule-label">当前位置</text>
                <text class="capsule-value">{{ globalLocation || '流浪中...' }}</text>
            </view>
        </view>
        
        <view class="right-actions">
            <view class="glass-btn phone-btn" @click="showPhone = true">
              <text>📱</text>
            </view>
            <view class="glass-btn add-btn" @click="showActionMenu">
              <text>➕</text>
            </view>
        </view>
      </view>
    </view>
    
    <view class="nav-placeholder"></view>

    <!-- 2. 主内容滚动区 -->
    <scroll-view scroll-y class="room-list">
      <view class="list-header">
        <text class="list-title">我的世界</text>
        <text class="list-subtitle">已探索 {{ worldGroups.length }} 个世界 · {{ contactList.length }} 位居民</text>
      </view>

      <!-- 空状态 -->
      <view v-if="worldGroups.length === 0 && unmappedNpcs.length === 0" class="empty-state" @click="goToCreate">
        <text class="empty-emoji">🌍</text>
        <text>还没有创建任何角色</text>
        <view class="create-hint-btn">创建第一个角色</view>
      </view>

      <!-- 🌟 核心：按世界分组显示 -->
      <view 
        class="world-group-card" 
        v-for="(group, gIndex) in worldGroups" 
        :key="group.id"
      >
        <!-- 世界标题栏 (可折叠) -->
        <view class="world-header" @click="toggleWorldCollapse(group.id)">
            <view class="world-info">
                <text class="world-icon">🪐</text>
                <text class="world-name">{{ group.name }}</text>
                <text class="world-count">({{ group.totalNpcs }}人)</text>
            </view>
            <text class="collapse-icon">{{ group.isCollapsed ? '▼' : '▲' }}</text>
        </view>

        <!-- 世界内容 (展开/收起) -->
        <view class="world-body" v-show="!group.isCollapsed">

            <!-- 🆕 玩家设定与关系管理 (新功能) -->
            <view class="player-section">
                <view class="player-header" @click="togglePlayerSettings(group.id)">
                    <view class="ph-title-row">
                        <text class="ph-icon">👤</text>
                        <text class="ph-title">我的身份与关系</text>
                    </view>
                    <text class="ph-arrow">{{ playerSettingsOpen[group.id] ? '▼' : '▶' }}</text>
                </view>

                <view v-show="playerSettingsOpen[group.id]" class="player-body">
                    <!-- 1. 玩家档案 -->
                    <view class="subsection-title">我的档案 (在此世界)</view>
                    <view class="form-card">
                        <view class="input-row">
                            <text class="label">名字</text>
                            <input 
                                class="input" 
                                placeholder="你在该世界的昵称" 
                                :value="getPlayerProfile(group.id).name"
                                @input="(e) => updatePlayerProfile(group.id, 'name', e.detail.value)"
                            />
                        </view>
                        <view class="input-row">
                            <text class="label">住址</text>
                            <input 
                                class="input" 
                                placeholder="例如: 301室" 
                                :value="getPlayerProfile(group.id).location"
                                @input="(e) => updatePlayerProfile(group.id, 'location', e.detail.value)"
                            />
                        </view>
                        <view class="input-col">
                            <text class="label">外貌/人设 (Prompt)</text>
                            <textarea 
                                class="textarea" 
                                placeholder="描述你的外貌特征，用于生图和AI认知..." 
                                :value="getPlayerProfile(group.id).appearance"
                                @input="(e) => updatePlayerProfile(group.id, 'appearance', e.detail.value)"
                                maxlength="-1"
                            />
                        </view>
                        <button class="mini-save-btn" @click="savePlayerProfile(group.id)">💾 保存档案</button>
                    </view>

                    <!-- 2. 关系表 -->
                    <view class="subsection-title" style="margin-top: 30rpx;">羁绊关系网</view>
                    <view class="relation-list">
                        <view class="relation-item" v-for="npc in getAllNpcsInWorld(group.id)" :key="npc.id">
                            <image :src="npc.avatar || '/static/ai-avatar.png'" class="rel-avatar"></image>
                            <view class="rel-info">
                                <text class="rel-name">{{ npc.name }}</text>
                                <input 
                                    class="rel-input" 
                                    placeholder="定义你们的关系 (如: 邻居)" 
                                    :value="npc.settings?.userRelation || ''" 
                                    @input="(e) => updateNpcRelation(npc, e.detail.value)"
                                    @blur="persistContactList"
                                />
                            </view>
                        </view>
                        <view v-if="getAllNpcsInWorld(group.id).length === 0" class="empty-tip">
                            暂无角色，请先创建角色并加入此世界。
                        </view>
                    </view>
                </view>
            </view>
            
            <!-- A. 有明确住址的角色 (按地址分组) -->
            <view 
                class="location-card" 
                v-for="(loc, lIndex) in group.locations" 
                :key="lIndex"
                @click="handleEnterLocation(loc.name, group.id)"
                :class="{ 'active-location': globalLocation === loc.name }"
            >
                <view class="card-content">
                    <view class="room-info">
                        <view class="room-title-row">
                            <text class="scene-icon">🏠</text>
                            <text class="room-name">{{ loc.name }}</text>
                            
                            <view class="my-location-badge" v-if="globalLocation === loc.name">
                                <view class="pulse-dot"></view>
                                <text>当前位置</text>
                            </view>
                        </view>
                        
                        <view class="resident-pile">
                            <view 
                                class="avatar-circle" 
                                v-for="(npc, i) in loc.npcs.slice(0, 5)" 
                                :key="npc.id"
                                :style="{ zIndex: 10 - i }"
                            >
                                <image :src="npc.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="pile-img"></image>
                                <view class="status-indicator" v-if="npc.unread > 0"></view>
                            </view>
                            
                            <view class="more-count" v-if="loc.npcs.length > 5">
                                <text>+{{ loc.npcs.length - 5 }}</text>
                            </view>
                            
                            <text class="resident-count-text">
                                {{ loc.npcs.map(n => n.name).join('、') }}
                            </text>
                        </view>
                    </view>
                    
                    <view class="card-action">
                         <button class="action-btn-pill enter" v-if="globalLocation === loc.name">
                            <text>📍 在此</text>
                         </button>
                         
                         <button 
                            class="action-btn-pill home" 
                            v-else-if="getPlayerProfile(group.id).location === loc.name"
                            @click.stop="handleEnterLocation(loc.name, group.id)"
                         >
                            <text>🏠 回家</text>
                         </button>
                         
                         <button 
                            class="action-btn-pill visit" 
                            v-else 
                            @click.stop="handleEnterLocation(loc.name, group.id)"
                         >
                            <text>✊ 敲门</text>
                         </button>
                    </view>
                </view>
            </view>

            <!-- B. 游荡/无固定住址的角色 -->
            <view v-if="group.wanderingNpcs.length > 0" class="wandering-section">
                <view class="wandering-title">🚶 游荡中 / 未知区域</view>
                <view class="wandering-list">
                    <view 
                        class="wandering-item" 
                        v-for="npc in group.wanderingNpcs" 
                        :key="npc.id"
                        @click="enterChat(npc.id)"
                    >
                        <image :src="npc.avatar || '/static/ai-avatar.png'" class="mini-avatar"></image>
                        <text class="mini-name">{{ npc.name }}</text>
                    </view>
                </view>
            </view>

        </view>
      </view>

      <!-- 兜底：未分配世界的角色 -->
      <view v-if="unmappedNpcs.length > 0" class="world-group-card other-group">
          <view class="world-header">
              <view class="world-info">
                  <text class="world-icon">🌫️</text>
                  <text class="world-name">未知领域</text>
                  <text class="world-count">({{ unmappedNpcs.length }}人)</text>
              </view>
          </view>
          <view class="world-body">
              <view class="wandering-list">
                  <view 
                      class="wandering-item" 
                      v-for="npc in unmappedNpcs" 
                      :key="npc.id"
                      @click="enterChat(npc.id)"
                  >
                      <image :src="npc.avatar || '/static/ai-avatar.png'" class="mini-avatar"></image>
                      <text class="mini-name">{{ npc.name }}</text>
                      <text class="mini-loc">@{{ npc.location || '未知' }}</text>
                  </view>
              </view>
          </view>
      </view>

    </scroll-view>

    <!-- 手机组件 -->
    <GamePhone 
      :visible="showPhone"
      :world-id="currentWorldId"
      :current-chat-id="''"
      :time="formattedTime"
      @close="showPhone = false"
    />

    <CustomTabBar :current="0" />
    
    <!-- 🚪 敲门互动弹窗 -->
    <DoorInteraction 
      :visible="showDoorModal"
      :npc="currentDoorNpc"
      :player-profile="currentDoorPlayerProfile"
      @close="closeDoorModal"
      @open="handleDoorOpened"
      @save-history="saveDoorHistory"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useTheme } from '@/composables/useTheme.js';
import GamePhone from '@/components/GamePhone.vue';
import { useGameTime } from '@/composables/useGameTime.js';
import DoorInteraction from '@/components/DoorInteraction.vue';
import { DB } from '@/utils/db.js';

const { isDarkMode } = useTheme();
const { formattedTime } = useGameTime();

// 核心数据
const contactList = ref([]);
const globalLocation = ref('客厅'); 
const worldSettings = ref([]); // 读取 Mine 页面配置的世界观列表
const collapsedWorlds = ref({}); // 记录折叠状态 { worldId: boolean }

// 新增：玩家设定相关
const playerProfiles = ref({}); // { worldId: { name, location, appearance } }
const playerSettingsOpen = ref({}); // { worldId: boolean }

// 敲门状态
const showDoorModal = ref(false);
const currentDoorNpc = ref({});
const currentDoorPlayerProfile = ref({});

// UI 状态
const showPhone = ref(false);

onShow(() => {
  // 1. 加载 NPC
  const list = uni.getStorageSync('contact_list') || [];
  contactList.value = list;
  
  // 2. 加载玩家位置
  const savedLoc = uni.getStorageSync('app_global_player_location');
  if (savedLoc) globalLocation.value = savedLoc;
  
  // 3. 加载世界观配置
  const savedWorlds = uni.getStorageSync('app_world_settings') || [];
  worldSettings.value = savedWorlds;

  // 4. 加载玩家档案
  const savedProfiles = uni.getStorageSync('app_world_player_profiles') || {};
  playerProfiles.value = savedProfiles;
});

// 计算属性：世界ID (取第一个联系人的世界ID，用于手机组件)
const currentWorldId = computed(() => contactList.value.length > 0 ? contactList.value[0].worldId : '');

// 辅助：获取某世界的所有NPC
const getAllNpcsInWorld = (worldId) => {
    return contactList.value.filter(npc => String(npc.worldId) === String(worldId));
};

// 玩家档案操作
const togglePlayerSettings = (worldId) => {
    playerSettingsOpen.value[worldId] = !playerSettingsOpen.value[worldId];
};

const getPlayerProfile = (worldId) => {
    if (!playerProfiles.value[worldId]) {
        // 初始化空对象
        playerProfiles.value[worldId] = { name: '', location: '', appearance: '' };
    }
    return playerProfiles.value[worldId];
};

const updatePlayerProfile = (worldId, field, value) => {
    if (!playerProfiles.value[worldId]) playerProfiles.value[worldId] = {};
    playerProfiles.value[worldId][field] = value;
};

const savePlayerProfile = (worldId) => {
    uni.setStorageSync('app_world_player_profiles', playerProfiles.value);
    uni.showToast({ title: '档案已保存', icon: 'success' });
    
    // 可选：同步更新该世界下所有角色的 settings.userNameOverride 等字段？
    // 策略：如果这只是“世界观设定”，那么具体聊天时应该优先读取这里的配置，
    // 而不是每个角色的 settings。
    // 但为了兼容旧逻辑，我们可以把这里的名字同步写入到该世界所有角色的 settings.userNameOverride 中
    /*
    const profile = playerProfiles.value[worldId];
    let updated = false;
    contactList.value.forEach(npc => {
        if (String(npc.worldId) === String(worldId) && npc.settings) {
            npc.settings.userNameOverride = profile.name;
            npc.settings.userLocation = profile.location;
            npc.settings.userAppearance = profile.appearance;
            updated = true;
        }
    });
    if (updated) {
        uni.setStorageSync('contact_list', contactList.value);
        console.log('✅ 已同步玩家档案到该世界所有角色');
    }
    */
};

// 关系修改
const updateNpcRelation = (npc, newRelation) => {
    if (!npc.settings) npc.settings = {};
    npc.settings.userRelation = newRelation;
};

const persistContactList = () => {
    uni.setStorageSync('contact_list', contactList.value);
    // console.log('✅ 关系已保存');
};

// 🌟 核心逻辑：按世界 -> 地点 分组
const worldGroups = computed(() => {
    // 1. 预处理世界列表
    const groups = worldSettings.value.map(world => {
        // 找出属于该世界的 NPC
        const worldNpcs = contactList.value.filter(npc => String(npc.worldId) === String(world.id));
        
        // 2. 在该世界内，按 location 分组
        const locationMap = {};
        const wandering = [];

        worldNpcs.forEach(npc => {
            const loc = npc.location;
            if (loc && loc !== '未知位置' && loc !== '流浪中') {
                if (!locationMap[loc]) {
                    locationMap[loc] = [];
                }
                locationMap[loc].push(npc);
            } else {
                wandering.push(npc);
            }
        });

        // 转为数组格式
        const locations = Object.keys(locationMap).map(locName => ({
            name: locName,
            npcs: locationMap[locName]
        }));

        return {
            id: world.id,
            name: world.name,
            totalNpcs: worldNpcs.length,
            locations: locations,
            wanderingNpcs: wandering,
            isCollapsed: !!collapsedWorlds.value[world.id] // 读取折叠状态
        };
    });

    // 过滤掉没有任何 NPC 的世界 (可选，如果想显示空世界可以去掉这行)
    return groups.filter(g => g.totalNpcs > 0);
});

// 找出不属于任何已知世界的 NPC
const unmappedNpcs = computed(() => {
    const knownWorldIds = worldSettings.value.map(w => String(w.id));
    return contactList.value.filter(npc => !npc.worldId || !knownWorldIds.includes(String(npc.worldId)));
});

// === 交互逻辑 ===

const toggleWorldCollapse = (worldId) => {
    // 必须重新赋值触发响应式，或者使用 ref 对象
    collapsedWorlds.value[worldId] = !collapsedWorlds.value[worldId];
    // 强制刷新一下（虽然 Vue3 通常能自动检测到）
    collapsedWorlds.value = { ...collapsedWorlds.value };
};

const showActionMenu = () => {
    uni.showActionSheet({
        itemList: ['👤 创建新角色', '⚙️ 管理世界观'],
        success: (res) => {
            if (res.tapIndex === 0) uni.navigateTo({ url: '/pages/create/create' });
            if (res.tapIndex === 1) uni.switchTab({ url: '/pages/mine/mine' });
        }
    });
};

const goToCreate = () => {
    uni.navigateTo({ url: '/pages/create/create' });
};

// 点击地点卡片 / 敲门
const handleEnterLocation = (locName, worldId) => {
    // 1. 找出住在这里的 NPC
    const residents = contactList.value.filter(n => n.location === locName && String(n.worldId) === String(worldId));
    
    if (residents.length === 0) {
        return uni.showToast({ title: '这里好像没人住...', icon: 'none' });
    }

    // 2. 选一个主要角色来应门 (优先找好感度高的)
    const sortedResidents = [...residents].sort((a, b) => (b.affection || 0) - (a.affection || 0));
    const targetNpc = sortedResidents[0];

    // 3. 打开互动弹窗
    currentDoorNpc.value = targetNpc;
    currentDoorPlayerProfile.value = getPlayerProfile(worldId);
    showDoorModal.value = true;
};

// 关闭门
const closeDoorModal = () => {
    showDoorModal.value = false;
};

// 门开了 -> 跳转
const handleDoorOpened = () => {
    if (currentDoorNpc.value && currentDoorNpc.value.id) {
        // 更新位置
        updateLocation(currentDoorNpc.value.location);
        
        showDoorModal.value = false;
        
        // 延迟跳转，让开门动画播完的体感更好
        setTimeout(() => {
            enterChat(currentDoorNpc.value.id);
        }, 100);
    }
};

// 保存门外对话到历史记录
const saveDoorHistory = async (messages) => {
    if (!currentDoorNpc.value || !messages || messages.length === 0) return;
    
    const chatId = String(currentDoorNpc.value.id);
    const now = Date.now();
    
    try {
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const isSys = msg.role === 'assistant' && (msg.content === '(门开了)' || msg.content.includes('OPEN_DOOR'));
            
            // 跳过纯指令
            if (msg.content.includes('OPEN_DOOR')) continue;

            await DB.execute(
                `INSERT OR REPLACE INTO messages (id, chatId, role, content, type, isSystem, timestamp, source_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    now + i, // 确保顺序
                    chatId,
                    msg.role === 'user' ? 'user' : 'model', // 映射 role
                    isSys ? `(隔着门) ${msg.content}` : `(隔着门) ${msg.content}`, // 加上标记方便区分
                    'text',
                    0,
                    now + i,
                    'door_intercom' // 标记来源模式
                ]
            );
        }
        console.log(`✅ [Door] Saved ${messages.length} messages to history.`);
    } catch (e) {
        console.error('❌ Failed to save door history:', e);
    }
};

const updateLocation = (newLoc) => {
    console.log(`🦶 [移动] 玩家位置更新: ${newLoc}`);
    globalLocation.value = newLoc;
    uni.setStorageSync('app_global_player_location', newLoc);
    
    // 同步更新所有 NPC 视角的玩家位置
    const list = contactList.value.map(npc => ({ ...npc, playerLocation: newLoc }));
    contactList.value = list;
    uni.setStorageSync('contact_list', list);
};

const enterChat = (id) => {
    uni.navigateTo({ url: `/pages/chat/chat?id=${id}` });
};
</script>

<style lang="scss" scoped>
/* === 全局容器 === */
.container { 
    background-color: var(--bg-color); 
    min-height: 100vh; 
    transition: background-color 0.3s ease;
}

/* === 顶部导航栏 (保持不变) === */
.custom-navbar { 
    position: fixed; top: 0; width: 100%; 
    background: rgba(255, 255, 255, 0.8); 
    backdrop-filter: blur(20px); 
    z-index: 999; 
    border-bottom: 1rpx solid rgba(0,0,0,0.05);
    display: flex; flex-direction: column;
}
.dark-mode .custom-navbar { 
    background: rgba(30, 30, 30, 0.8); 
    border-bottom: 1rpx solid rgba(255,255,255,0.05);
}

.status-bar { height: var(--status-bar-height); width: 100%; }
.nav-content { 
    height: 100rpx; 
    display: flex; justify-content: space-between; align-items: center; 
    padding: 0 32rpx; 
}

.location-capsule { 
    display: flex; align-items: center; 
    background: rgba(0,0,0,0.05);
    padding: 8rpx 24rpx 8rpx 16rpx;
    border-radius: 40rpx;
}
.dark-mode .location-capsule { background: rgba(255,255,255,0.1); }
.capsule-icon-text { font-size: 32rpx; margin-right: 12rpx; }
.capsule-info { display: flex; flex-direction: column; justify-content: center; }
.capsule-label { font-size: 20rpx; color: var(--text-sub); opacity: 0.8; line-height: 1; margin-bottom: 4rpx; }
.capsule-value { font-size: 26rpx; font-weight: 700; color: var(--text-color); line-height: 1.2; }

.right-actions { display: flex; align-items: center; gap: 24rpx; }
.glass-btn { 
    width: 80rpx; height: 80rpx; 
    background: rgba(255,255,255,0.8); 
    border-radius: 24rpx; 
    display: flex; align-items: center; justify-content: center; 
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05); 
    border: 1rpx solid rgba(0,0,0,0.05);
}
.dark-mode .glass-btn {
    background: rgba(60, 60, 60, 0.6);
    border: 1rpx solid rgba(255,255,255,0.1);
    box-shadow: none;
}
.add-btn { background: #007aff !important; border: none; }
.add-btn text { color: #fff; font-size: 40rpx; font-weight: 300; }
.phone-btn text { font-size: 36rpx; }

.nav-placeholder { height: calc(var(--status-bar-height) + 100rpx); }

/* === 列表区域 === */
.room-list { 
    height: 100vh; 
    box-sizing: border-box; 
    padding: 20rpx 32rpx 180rpx 32rpx; 
}

.list-header { margin: 30rpx 0 40rpx 0; }
.list-title { font-size: 56rpx; font-weight: 800; color: var(--text-color); display: block; letter-spacing: -1rpx; }
.list-subtitle { font-size: 26rpx; color: var(--text-sub); margin-top: 10rpx; display: block; opacity: 0.7; }

/* === 🌍 世界分组卡片 === */
.world-group-card {
    background: var(--tool-bg); /* 浅灰底色区分世界 */
    border-radius: 32rpx;
    margin-bottom: 40rpx;
    overflow: hidden;
    border: 1rpx solid var(--border-color);
}
.dark-mode .world-group-card { background: rgba(255,255,255,0.02); }

.world-header {
    padding: 24rpx 32rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--card-bg);
    border-bottom: 1rpx solid var(--border-color);
}

.world-info { display: flex; align-items: center; }
.world-icon { font-size: 36rpx; margin-right: 16rpx; }
.world-name { font-size: 30rpx; font-weight: 800; color: var(--text-color); margin-right: 12rpx; }
.world-count { font-size: 24rpx; color: var(--text-sub); }
.collapse-icon { font-size: 24rpx; color: var(--text-sub); padding: 10rpx; }

.world-body { padding: 24rpx; }

/* === 🆕 玩家设定样式 === */
.player-section {
    margin-bottom: 30rpx;
    background: var(--tool-bg);
    border-radius: 16rpx;
    border: 1rpx solid rgba(0,0,0,0.05);
    overflow: hidden;
}
.player-header {
    padding: 20rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0,0,0,0.03);
    cursor: pointer;
}
.ph-title-row { display: flex; align-items: center; }
.ph-icon { margin-right: 12rpx; font-size: 30rpx; }
.ph-title { font-size: 26rpx; font-weight: bold; color: var(--text-color); }
.ph-arrow { font-size: 22rpx; color: var(--text-sub); opacity: 0.6; }

.player-body { padding: 20rpx; background: var(--card-bg); }
.subsection-title { 
    font-size: 24rpx; color: var(--text-sub); margin-bottom: 16rpx; font-weight: bold; 
    border-left: 6rpx solid #007aff; padding-left: 10rpx;
}

.form-card { }
.input-row { 
    display: flex; align-items: center; margin-bottom: 16rpx; 
    border-bottom: 1rpx solid var(--border-color); padding-bottom: 8rpx;
}
.input-col { margin-bottom: 20rpx; }

.label { width: 100rpx; font-size: 26rpx; color: var(--text-sub); }
.input { flex: 1; font-size: 26rpx; color: var(--text-color); }
.textarea { 
    width: 100%; height: 120rpx; 
    background: var(--input-bg); 
    border-radius: 8rpx; padding: 12rpx; 
    font-size: 26rpx; color: var(--text-color); box-sizing: border-box;
    margin-top: 10rpx;
}

.mini-save-btn {
    background: #007aff; color: #fff; font-size: 24rpx; 
    padding: 10rpx 0; border-radius: 30rpx; margin-top: 16rpx;
}

/* 关系表 */
.relation-list { display: flex; flex-direction: column; gap: 16rpx; }
.relation-item { 
    display: flex; align-items: center; 
    background: var(--tool-bg); padding: 12rpx; border-radius: 12rpx;
}
.rel-avatar { width: 60rpx; height: 60rpx; border-radius: 50%; margin-right: 16rpx; }
.rel-info { flex: 1; display: flex; align-items: center; justify-content: space-between; }
.rel-name { font-size: 26rpx; font-weight: bold; color: var(--text-color); margin-right: 20rpx; width: 120rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rel-input { 
    flex: 1; font-size: 24rpx; color: var(--text-color); 
    background: var(--card-bg); padding: 8rpx 16rpx; border-radius: 8rpx; text-align: right;
}
.empty-tip { font-size: 24rpx; color: var(--text-sub); text-align: center; padding: 20rpx; }

/* === 🏠 地点卡片 (复用优化) === */
.location-card {
    background: var(--card-bg); 
    border-radius: 24rpx; 
    margin-bottom: 24rpx;
    box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04); 
    transition: all 0.2s;
    border: 1rpx solid transparent;
}
.dark-mode .location-card { box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.2); }
.location-card:active { transform: scale(0.98); }

.location-card.active-location {
    border-color: #007aff;
    background: linear-gradient(to bottom right, var(--card-bg), rgba(0,122,255,0.03));
}

.card-content { padding: 30rpx; display: flex; align-items: center; justify-content: space-between; }
.room-info { flex: 1; padding-right: 20rpx; min-width: 0; }

.room-title-row { display: flex; align-items: center; margin-bottom: 20rpx; }
.scene-icon { font-size: 34rpx; margin-right: 12rpx; }
.room-name { font-size: 32rpx; font-weight: 700; color: var(--text-color); }

.my-location-badge {
    background: rgba(0,122,255,0.08); 
    padding: 4rpx 12rpx; 
    border-radius: 16rpx;
    display: flex; align-items: center; gap: 8rpx;
    margin-left: 16rpx;
}
.my-location-badge text { font-size: 18rpx; color: #007aff; font-weight: 600; }
.pulse-dot { 
    width: 10rpx; height: 10rpx; 
    background: #007aff; border-radius: 50%; 
    animation: pulse 2s infinite; 
}

@keyframes pulse {
    0% { transform: scale(0.9); opacity: 1; }
    70% { transform: scale(1.2); opacity: 0.5; }
    100% { transform: scale(0.9); opacity: 1; }
}

.resident-pile { display: flex; align-items: center; height: 56rpx; }
.avatar-circle { 
    width: 56rpx; height: 56rpx; 
    border-radius: 50%; 
    border: 3rpx solid var(--card-bg); 
    margin-left: -20rpx; 
    position: relative;
    flex-shrink: 0;
}
.avatar-circle:first-child { margin-left: 0; }
.pile-img { width: 100%; height: 100%; border-radius: 50%; background: #f0f0f0; }
.status-indicator { 
    position: absolute; top: -2rpx; right: -2rpx; 
    width: 16rpx; height: 16rpx; 
    background: #ff4d4f; border: 2rpx solid var(--card-bg); border-radius: 50%; 
}
.more-count {
    width: 56rpx; height: 56rpx; 
    border-radius: 50%; background: var(--tool-bg); 
    border: 3rpx solid var(--card-bg); margin-left: -20rpx;
    display: flex; align-items: center; justify-content: center; z-index: 0;
}
.more-count text { font-size: 18rpx; color: var(--text-sub); font-weight: 700; }
.resident-count-text { font-size: 24rpx; color: var(--text-sub); margin-left: 16rpx; opacity: 0.8; }

/* 按钮 */
.card-action { flex-shrink: 0; }
.action-btn-pill {
    margin: 0; padding: 0 28rpx; height: 64rpx;
    border-radius: 32rpx;
    display: flex; align-items: center; justify-content: center;
    font-size: 26rpx; font-weight: 600; border: none;
}
.action-btn-pill::after { border: none; }
.enter { background: rgba(0,122,255,0.1); color: #007aff; }
.visit { background: #007aff; color: #fff; box-shadow: 0 6rpx 16rpx rgba(0,122,255,0.25); }

/* === 游荡列表 === */
.wandering-section { margin-top: 30rpx; padding-top: 20rpx; border-top: 1rpx dashed var(--border-color); }
.wandering-title { font-size: 24rpx; color: var(--text-sub); margin-bottom: 16rpx; padding-left: 10rpx; }
.wandering-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.wandering-item {
    background: var(--card-bg);
    padding: 12rpx 24rpx 12rpx 12rpx;
    border-radius: 40rpx;
    display: flex; align-items: center;
    border: 1rpx solid var(--border-color);
}
.wandering-item:active { background: var(--tool-bg); }
.mini-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; margin-right: 12rpx; }
.mini-name { font-size: 26rpx; color: var(--text-color); font-weight: 600; }
.mini-loc { font-size: 22rpx; color: var(--text-sub); margin-left: 10rpx; }

/* 空状态 */
.empty-state { padding: 120rpx 0; display: flex; flex-direction: column; align-items: center; opacity: 0.8; }
.empty-emoji { font-size: 100rpx; margin-bottom: 20rpx; filter: grayscale(0.5); }
.create-hint-btn { 
    margin-top: 30rpx; padding: 16rpx 40rpx; 
    background: var(--card-bg); 
    border-radius: 40rpx; font-size: 26rpx; color: #007aff; font-weight: 600; 
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
    border: 1rpx solid rgba(0,122,255,0.1);
}
</style>
