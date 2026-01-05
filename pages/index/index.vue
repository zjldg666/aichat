<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    <view class="custom-navbar">
      <view class="status-bar"></view>
      <view class="nav-content">
        <view class="location-capsule">
            <image class="capsule-icon" src="/static/location.png" mode="aspectFit" v-if="false"></image>
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

    <scroll-view scroll-y class="room-list">
      <view class="list-header">
        <text class="list-title">我的世界</text>
        <text class="list-subtitle">已探索 {{ worldScenes.length }} 个区域 · {{ contactList.length }} 位居民</text>
      </view>

      <view v-if="worldScenes.length === 0" class="empty-state" @click="openCreateSceneModal">
        <text class="empty-emoji">🗺️</text>
        <text>还没有创建地图场景</text>
        <view class="create-hint-btn">创建第一个场景</view>
      </view>

      <view 
        class="scene-card" 
        v-for="(scene, sIndex) in computedScenes" 
        :key="scene.id"
        @click="handleEnterScene(scene)" 
        :class="{ 'active-location': globalLocation === scene.name }"
      >
        <view class="card-content">
            <view class="room-info">
                <view class="room-title-row">

                    
                    <view class="my-location-badge" v-if="globalLocation.includes(scene.name)">
                        <view class="pulse-dot"></view>
                        <text>当前位置</text>
                    </view>
                    
                    <view class="delete-btn" @click.stop="deleteScene(sIndex)">
                        <text>🗑️</text>
                    </view>
                </view>
                
                <view class="resident-pile">
                    <view 
                        class="avatar-circle" 
                        v-for="(npc, i) in scene.npcs.slice(0, 5)" 
                        :key="npc.id"
                        :style="{ zIndex: 10 - i }"
                    >
                        <image :src="npc.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="pile-img"></image>
                        <view class="status-indicator" v-if="npc.unread > 0"></view>
                    </view>
                    
                    <view class="more-count" v-if="scene.npcs.length > 5">
                        <text>+{{ scene.npcs.length - 5 }}</text>
                    </view>
                    
                    <text class="resident-count-text" v-if="scene.npcs.length > 0">
                        {{ scene.npcs.length }} 人在屋内
                    </text>
                    <text class="resident-count-text empty" v-else>
                        屋内空无一人
                    </text>
                </view>
            </view>
            
            <view class="card-action">
                 <button class="action-btn-pill enter" v-if="globalLocation.includes(scene.name)">
                    <text>📍 在此</text>
                 </button>
                 <button class="action-btn-pill visit" v-else>
                    <text>🔑 进门</text>
                 </button>
            </view>
        </view>
      </view>

      <view v-if="unmappedNpcs.length > 0" class="scene-card other-card">
          <view class="scene-header">
              <text class="scene-name" style="font-size: 28rpx; opacity: 0.7;">📍 其他区域 / 游荡中</text>
          </view>
          <view class="other-list">
              <view class="other-item" v-for="npc in unmappedNpcs" :key="npc.id" @click="enterChat(npc.id)">
                  <image :src="npc.avatar || '/static/ai-avatar.png'" class="other-avatar"></image>
                  <text class="other-name">{{ npc.name }}</text>
                  <text class="other-loc">@{{ npc.location }}</text>
              </view>
          </view>
      </view>

    </scroll-view>

    <view class="modal-mask" v-if="showCreateModal" @click.self="showCreateModal = false">
        <view class="modal-content">
            <view class="modal-header">
                <text class="modal-title">创建新区域</text>
            </view>
            <view class="modal-body">
				<view class="input-group">
				    <text class="label">所属世界</text>
				    <picker 
				        mode="selector" 
				        :range="worldList" 
				        range-key="name" 
				        :value="selectedWorldIndex" 
				        @change="(e) => selectedWorldIndex = e.detail.value"
				    >
				        <view class="picker-box">
				            {{ worldList[selectedWorldIndex] ? worldList[selectedWorldIndex].name : '请选择世界' }}
				            <text class="arrow">▼</text>
				        </view>
				    </picker>
				</view>
                <view class="input-group">
                    <text class="label">区域名称 (如: 家/学校)</text>
                    <input class="input" v-model="newSceneName" placeholder="给这个地方起个名字" />
                </view>
                <view class="input-group">
                    <text class="label">包含场所 (逐个添加)</text>
                    
                    <view class="add-node-row">
                        <input 
                            class="input node-input" 
                            v-model="tempNodeName" 
                            placeholder="输入房间名 (如: 卧室)" 
                            @confirm="addNode" 
                        />
                        <button class="btn-mini add" @click="addNode">添加</button>
                    </view>
                
                    <view class="tags-container" v-if="newSceneNodes.length > 0">
                        <view 
                            class="node-tag" 
                            v-for="(node, index) in newSceneNodes" 
                            :key="index"
                            @click="removeNode(index)"
                        >
                            <text>{{ node }}</text>
                            <text class="tag-close">×</text>
                        </view>
                    </view>
                    <view class="hint" v-else>还没有添加房间，请在上方输入并点击添加</view>
                </view>
            </view>
            <view class="modal-footer">
                <button class="btn cancel" @click="showCreateModal = false">取消</button>
                <button class="btn confirm" @click="confirmCreateScene">创建</button>
            </view>
        </view>
    </view>

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
import { onShow } from '@dcloudio/uni-app';
import CustomTabBar from '@/components/CustomTabBar.vue';
import { useTheme } from '@/composables/useTheme.js';
import GamePhone from '@/components/GamePhone.vue';
import { useGameTime } from '@/composables/useGameTime.js';

const { isDarkMode } = useTheme();
const { formattedTime } = useGameTime();

// 核心数据
const contactList = ref([]);
const globalLocation = ref('客厅'); 
const worldScenes = ref([]); // 🌟 存储所有的场景配置

// UI 状态
const showPhone = ref(false);
const showCreateModal = ref(false);
const newSceneName = ref('');


// 计算属性：世界ID (取第一个联系人的世界ID)
const currentWorldId = computed(() => contactList.value.length > 0 ? contactList.value[0].worldId : '');
const worldList = ref([]); // 所有的世界选项
const selectedWorldIndex = ref(0); // 当前选中的世界索引 (picker用)

// ✨ 新增：子场景一个个添加相关
const tempNodeName = ref(''); // 输入框里临时的那个名字
const newSceneNodes = ref([]); // 已经添加进去的子场景列表 (不再是字符串了)
onShow(() => {
  // 1. 加载 NPC
  const list = uni.getStorageSync('contact_list') || [];
  contactList.value = list;
  
  // 2. 加载玩家位置
  const savedLoc = uni.getStorageSync('app_global_player_location');
  if (savedLoc) globalLocation.value = savedLoc;
  
  // 3. 🌟 加载场景配置 (如果为空，初始化一个默认的“家”)
  let scenes = uni.getStorageSync('app_world_scenes_custom');
const savedWorlds = uni.getStorageSync('app_world_settings') || [];
  if (savedWorlds.length > 0) {
      worldList.value = savedWorlds;
  } else {
      // 如果没数据，给个默认的，防止 picker 报错
      worldList.value = [{ id: 'default', name: '默认世界' }];
  }
  worldScenes.value = scenes;
});


// 🌟 核心修改：以大场景为单位汇总 NPC
const computedScenes = computed(() => {
    return worldScenes.value.map(scene => {
        // 1. 找出所有在这个大场景（包括其子房间）里的 NPC
        const residents = contactList.value.filter(npc => {
            const cLoc = npc.location || '';
            // 匹配逻辑：NPC位置 包含 场景名 (如 "301") 或 包含 任意子房间名 (如 "卧室")
            const isMatchScene = cLoc.includes(scene.name); 
            const isMatchNode = scene.nodes.some(n => cLoc.includes(n));
            return isMatchScene || isMatchNode;
        });

        // 2. 返回简化的结构，供 UI 显示头像堆叠
        return {
            ...scene,
            npcs: residents // 这里的 npcs 是整个大场景里的所有人
        };
    });
});

// 🌟 核心逻辑：找出所有没有被归类到场景里的 NPC
const unmappedNpcs = computed(() => {
    return contactList.value.filter(c => {
        const cLoc = c.location || '';
        
        // 检查这个 NPC 是否已经被上面的 computedScenes "认领" 了
        const isClaimed = worldScenes.value.some(scene => {
            // 情况1: 地址包含大场景名 (如 "幸福小区301")
            if (cLoc.includes(scene.name)) return true;
            // 情况2: 地址包含某个房间名
            return scene.nodes.some(n => cLoc.includes(n) || n.includes(cLoc));
        });
        
        return !isClaimed; // 没被认领的才显示在底部
    });
});

// === 交互逻辑 ===

const showActionMenu = () => {
    uni.showActionSheet({
        itemList: ['🏗️ 创建新场景', '👤 创建新角色'],
        success: (res) => {
            if (res.tapIndex === 0) openCreateSceneModal();
            if (res.tapIndex === 1) uni.navigateTo({ url: '/pages/create/create' });
        }
    });
};

const openCreateSceneModal = () => {
    newSceneName.value = '';
    newSceneNodes.value = []; // ✨ 必须是空数组 []
    tempNodeName.value = '';  // 顺便清空一下输入框缓存
    showCreateModal.value = true;
    selectedWorldIndex.value = 0; 
};

// ✨ 添加一个子场景
const addNode = () => {
    if (!tempNodeName.value.trim()) return; // 空的不管
    // 查重（可选）
    if (newSceneNodes.value.includes(tempNodeName.value)) {
        return uni.showToast({ title: '这个房间已存在', icon: 'none' });
    }
    newSceneNodes.value.push(tempNodeName.value.trim()); // 放入列表
    tempNodeName.value = ''; // 清空输入框，方便输下一个
};

// ✨ 删除已添加的
const removeNode = (index) => {
    newSceneNodes.value.splice(index, 1);
};
const confirmCreateScene = () => {
    if (!newSceneName.value) return uni.showToast({ title: '缺场景名', icon:'none' });
        if (newSceneNodes.value.length === 0) return uni.showToast({ title: '至少加一个房间', icon:'none' });
    
        // 获取当前选中的世界ID
        const currentWorld = worldList.value[selectedWorldIndex.value];
    
        const newScene = {
            id: 'scene_' + Date.now(),
            worldId: currentWorld.id, // ✨ 绑定世界ID
            name: newSceneName.value,
            nodes: newSceneNodes.value // ✨ 直接存数组，不用 split 了
        };
    
    // 保存
    worldScenes.value.push(newScene);
    uni.setStorageSync('app_world_scenes_custom', worldScenes.value);
    
    showCreateModal.value = false;
    uni.showToast({ title: '场景创建成功', icon: 'success' });
};

const deleteScene = (index) => {
    uni.showModal({
        title: '删除场景',
        content: '确定要删除这个区域吗？NPC 不会被删除，但位置会变为“游荡”。',
        success: (res) => {
            if (res.confirm) {
                worldScenes.value.splice(index, 1);
                uni.setStorageSync('app_world_scenes_custom', worldScenes.value);
            }
        }
    });
};

// 点击节点逻辑
const handleEnterScene = (scene) => {
    const targetLoc = scene.name; // 目标是大场景，如 "幸福小区301"
    
    // 1. 更新玩家位置 (不具体到卧室，只到大门口)
    // 这样进入 Chat 后，useGameLocation 会根据这个位置加载对应的子场景列表
    updateLocation(targetLoc);
    
    // 2. 检查屋里有没有人
    if (scene.npcs && scene.npcs.length > 0) {
        // 如果有人，直接找第一个人聊天
        // (优化点：如果有多人，这里其实可以弹窗让人选，或者默认找好感度最高的)
        const targetNpc = scene.npcs[0];
        uni.showToast({ title: `进入 ${targetLoc}`, icon: 'none' });
        
        // 延迟跳转，让 Toast 显示一会
        setTimeout(() => {
            enterChat(targetNpc.id);
        }, 500);
    } else {
        // 如果没人，只是进去逛逛
        uni.showToast({ title: `已进入 ${targetLoc} (空屋)`, icon: 'none' });
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

/* === 顶部导航栏 (毛玻璃效果增强) === */
.custom-navbar { 
    position: fixed; top: 0; width: 100%; 
    background: rgba(255, 255, 255, 0.8); 
    backdrop-filter: blur(20px); 
    -webkit-backdrop-filter: blur(20px);
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

/* 位置胶囊优化 */
.location-capsule { 
    display: flex; align-items: center; 
    background: rgba(0,0,0,0.05);
    padding: 8rpx 24rpx 8rpx 16rpx;
    border-radius: 40rpx;
    transition: all 0.3s;
}
.dark-mode .location-capsule { background: rgba(255,255,255,0.1); }

.capsule-icon-text { font-size: 32rpx; margin-right: 12rpx; }
.capsule-info { display: flex; flex-direction: column; justify-content: center; }
.capsule-label { font-size: 20rpx; color: var(--text-sub); opacity: 0.8; line-height: 1; margin-bottom: 4rpx; }
.capsule-value { font-size: 26rpx; font-weight: 700; color: var(--text-color); line-height: 1.2; }

/* 右侧按钮组 */
.right-actions { display: flex; align-items: center; gap: 24rpx; }

.glass-btn { 
    width: 80rpx; height: 80rpx; 
    background: rgba(255,255,255,0.8); 
    border-radius: 24rpx; 
    display: flex; align-items: center; justify-content: center; 
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05); 
    border: 1rpx solid rgba(0,0,0,0.05);
    transition: transform 0.1s;
}
.dark-mode .glass-btn {
    background: rgba(60, 60, 60, 0.6);
    border: 1rpx solid rgba(255,255,255,0.1);
    box-shadow: none;
}
.glass-btn:active { transform: scale(0.92); }
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

/* === 🌟 场景卡片样式 (核心优化) === */
.scene-card {
    background: var(--card-bg); 
    border-radius: 32rpx; 
    margin-bottom: 32rpx;
    box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.06); 
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    border: 1rpx solid rgba(0,0,0,0.02);
    position: relative;
    overflow: hidden;
}
.dark-mode .scene-card { 
    box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.3); 
    border: 1rpx solid rgba(255,255,255,0.05);
}

.scene-card:active { transform: scale(0.98); }
.scene-card.active-location {
    border: 2rpx solid #007aff;
    background: linear-gradient(to bottom right, var(--card-bg), rgba(0,122,255,0.03));
}

.card-content { padding: 36rpx; display: flex; align-items: center; justify-content: space-between; }
.room-info { flex: 1; padding-right: 20rpx; min-width: 0; /* 防止文字溢出 */ }

/* 标题行布局 */
.room-title-row { 
    display: flex; align-items: center; justify-content: space-between; 
    margin-bottom: 28rpx; width: 100%;
}
.title-left { display: flex; align-items: center; flex: 1; overflow: hidden; }
.scene-icon { font-size: 38rpx; margin-right: 16rpx; }
.room-name { 
    font-size: 34rpx; font-weight: 700; color: var(--text-color); 
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* 删除按钮 */
.delete-btn {
    padding: 10rpx; opacity: 0.3; transition: opacity 0.2s; margin-right: -10rpx;
}
.delete-btn:active { opacity: 1; }

/* 当前位置徽章 (呼吸灯效果) */
.my-location-badge {
    background: rgba(0,122,255,0.08); 
    padding: 6rpx 16rpx; 
    border-radius: 20rpx;
    display: flex; align-items: center; gap: 10rpx;
    margin-left: 20rpx; flex-shrink: 0;
}
.my-location-badge text { font-size: 20rpx; color: #007aff; font-weight: 600; }
.pulse-dot { 
    width: 12rpx; height: 12rpx; 
    background: #007aff; border-radius: 50%; 
    box-shadow: 0 0 8rpx rgba(0,122,255,0.6);
    animation: pulse 2s infinite; 
}

@keyframes pulse {
    0% { transform: scale(0.9); opacity: 1; box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.7); }
    70% { transform: scale(1); opacity: 0.7; box-shadow: 0 0 0 10rpx rgba(0, 122, 255, 0); }
    100% { transform: scale(0.9); opacity: 1; box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
}

/* === 头像堆叠效果 === */
.resident-pile { display: flex; align-items: center; height: 64rpx; margin-top: 8rpx; }
.avatar-circle { 
    width: 64rpx; height: 64rpx; 
    border-radius: 50%; 
    border: 4rpx solid var(--card-bg); 
    margin-left: -24rpx; /* 更紧凑的堆叠 */
    position: relative;
    flex-shrink: 0;
    transition: transform 0.2s;
}
.avatar-circle:first-child { margin-left: 0; }
.pile-img { width: 100%; height: 100%; border-radius: 50%; background: #f0f0f0; }
.status-indicator { 
    position: absolute; top: -2rpx; right: -2rpx; 
    width: 18rpx; height: 18rpx; 
    background: #ff4d4f; border: 3rpx solid var(--card-bg); border-radius: 50%; 
}

.more-count {
    width: 64rpx; height: 64rpx; 
    border-radius: 50%; 
    background: var(--tool-bg); 
    border: 4rpx solid var(--card-bg);
    margin-left: -24rpx;
    display: flex; align-items: center; justify-content: center;
    z-index: 0;
}
.more-count text { font-size: 20rpx; color: var(--text-sub); font-weight: 700; }
.resident-count-text { font-size: 24rpx; color: var(--text-sub); margin-left: 20rpx; opacity: 0.8; }
.resident-count-text.empty { margin-left: 0; opacity: 0.5; font-style: italic; }

/* === 按钮样式 === */
.card-action { flex-shrink: 0; margin-left: 20rpx; }
.action-btn-pill {
    margin: 0; padding: 0 32rpx;
    height: 72rpx;
    border-radius: 36rpx;
    display: flex; align-items: center; justify-content: center;
    font-size: 28rpx; font-weight: 600;
    border: none;
    transition: all 0.2s;
}
.action-btn-pill::after { border: none; }

.action-btn-pill.enter { 
    background: rgba(0,122,255,0.1); color: #007aff; 
}
.action-btn-pill.visit { 
    background: #007aff; color: #fff; 
    box-shadow: 0 8rpx 20rpx rgba(0,122,255,0.25); 
}
.action-btn-pill.visit:active { transform: scale(0.95); box-shadow: 0 4rpx 10rpx rgba(0,122,255,0.2); }

/* === 其他区域 (弱化显示) === */
.other-card { 
    margin-top: 60rpx; 
    background: transparent; 
    box-shadow: none; 
    border: 1rpx dashed var(--border-color); 
}
.other-card .scene-header { display: none; /* 隐藏原来的header */ }
.scene-header { padding: 20rpx 30rpx; } /* 仅用于other-card内部的标题 */

.other-list { padding: 0; }
.other-item { 
    display: flex; align-items: center; padding: 24rpx; 
    background: var(--card-bg);
    margin-bottom: 2rpx;
}
.other-item:first-child { border-top-left-radius: 20rpx; border-top-right-radius: 20rpx; }
.other-item:last-child { border-bottom-left-radius: 20rpx; border-bottom-right-radius: 20rpx; }

.other-avatar { width: 72rpx; height: 72rpx; border-radius: 50%; margin-right: 24rpx; }
.other-name { font-size: 30rpx; font-weight: 600; color: var(--text-color); margin-right: 20rpx; }
.other-loc { font-size: 24rpx; color: var(--text-sub); background: var(--tool-bg); padding: 4rpx 16rpx; border-radius: 8rpx; }

/* === 弹窗样式优化 === */
.modal-mask {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); z-index: 2000;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
    transition: opacity 0.3s;
}
.modal-content {
    width: 620rpx; 
    background: var(--card-bg); 
    border-radius: 40rpx;
    padding: 48rpx; 
    box-shadow: 0 30rpx 80rpx rgba(0,0,0,0.3);
    animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes modalPop {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.modal-title { 
    font-size: 36rpx; font-weight: 800; color: var(--text-color); 
    text-align: center; margin-bottom: 48rpx; 
}

.input-group { margin-bottom: 36rpx; }
.label { 
    font-size: 26rpx; font-weight: 600; color: var(--text-color); 
    margin-bottom: 16rpx; display: block; opacity: 0.9;
}

/* 输入框统一风格 */
.input, .textarea, .picker-box {
    width: 100%; 
    height: 96rpx; 
    background: var(--bg-color); 
    border-radius: 24rpx;
    padding: 0 32rpx; 
    font-size: 30rpx; color: var(--text-color);
    box-sizing: border-box;
    line-height: 96rpx;
    border: 2rpx solid transparent;
    transition: border-color 0.2s;
}
.input:focus, .node-input:focus { border-color: #007aff; background: var(--card-bg); }

/* 选择器美化 */
.picker-box { display: flex; justify-content: space-between; align-items: center; }
.arrow { color: var(--text-sub); font-size: 24rpx; transform: rotate(90deg); }

/* 添加子场景行 */
.add-node-row { display: flex; gap: 20rpx; margin-bottom: 24rpx; }
.node-input { flex: 1; width: auto; }
.btn-mini.add {
    width: 140rpx; height: 96rpx; 
    background: #007aff; color: white;
    font-size: 28rpx; font-weight: 600;
    border-radius: 24rpx; display: flex; align-items: center; justify-content: center;
}
.btn-mini.add:active { opacity: 0.8; }

/* 标签墙 */
.tags-container { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 10rpx 0; }
.node-tag {
    background: rgba(0,122,255,0.08); color: #007aff;
    padding: 12rpx 28rpx; border-radius: 40rpx;
    font-size: 26rpx; font-weight: 600;
    display: flex; align-items: center;
}
.tag-close { margin-left: 12rpx; font-size: 32rpx; opacity: 0.5; line-height: 0.8; }
.tag-close:active { opacity: 1; }

.hint { font-size: 24rpx; color: var(--text-sub); margin-top: 10rpx; opacity: 0.6; }

/* 弹窗底部按钮 */
.modal-footer { display: flex; gap: 24rpx; margin-top: 50rpx; }
.btn { 
    flex: 1; height: 96rpx; line-height: 96rpx;
    border-radius: 28rpx; font-size: 30rpx; font-weight: 700; border: none; 
}
.btn.cancel { background: var(--bg-color); color: var(--text-sub); }
.btn.confirm { background: #007aff; color: white; box-shadow: 0 10rpx 30rpx rgba(0,122,255,0.25); }
.btn:active { transform: scale(0.98); }

/* 空状态 */
.empty-state { padding: 120rpx 0; opacity: 0.8; }
.empty-emoji { font-size: 120rpx; margin-bottom: 30rpx; display: block; filter: grayscale(0.5); }
.create-hint-btn { 
    margin-top: 40rpx; padding: 20rpx 48rpx; 
    background: var(--card-bg); 
    border-radius: 50rpx; font-size: 28rpx; color: #007aff; font-weight: 600; 
    box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.06);
    border: 1rpx solid rgba(0,122,255,0.1);
}
</style>