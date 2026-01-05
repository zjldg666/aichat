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
            <view class="glass-btn add-btn" @click="handlePlusClick">
              <image class="btn-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48bGluZSB4MT0iMTIiIHkxPSI1IiB4Mj0iMTIiIHkyPSIxOSIvPjxsaW5lIHgxPSI1IiB5MT0iMTIiIHgyPSIxOSIgeTI9IjEyIi8+PC9zdmc+" mode="aspectFit"></image>
            </view>
        </view>
      </view>
    </view>
    
    <view class="nav-placeholder"></view>

    <scroll-view scroll-y class="room-list">
		
          <view class="list-header">
            <text class="list-title">探索社区</text>
            <text class="list-subtitle">已加载 {{ worldGroups.length }} 个世界区域</text>
          </view>
    
          <view v-if="worldGroups.length === 0" class="empty-state">
            <text>暂无场景</text>
            <text class="empty-sub">点击右上角 + 创建新场景或角色</text>
          </view>
    
          <view class="world-group" v-for="group in worldGroups" :key="group.id">
              
              <view class="group-header" @click="toggleWorld(group.id)">
                  <view class="header-left">
                      <text class="world-icon">🌍</text>
                      <text class="group-title">{{ group.name }}</text>
                      <text class="group-count">({{ group.scenes.length }})</text>
                  </view>
                  <text class="arrow-icon" :class="{ 'collapsed': collapsedWorlds.has(group.id) }">▼</text>
              </view>
    
              <view class="group-content" v-if="!collapsedWorlds.has(group.id)">
                   <view 
                   class="room-card" 
                   v-for="(scene, index) in group.scenes" 
                   :key="scene.id || scene.name"
                   @click="handleEnterRoom(scene)"
                   @longpress="handleLongPressScene(scene)" 
                   :class="{ 'active-location': globalLocation === scene.name, 'is-temporary': scene.isTemporary }"
                   >
                        <view class="card-content">
                            <view class="room-info">
                                <view class="room-title-row">
                                    <text class="room-name">{{ scene.name }}</text>
                                    <view class="tag-temp" v-if="scene.isTemporary">未登记区域</view>
                                    <view class="my-location-badge" v-if="globalLocation === scene.name">
                                        <view class="pulse-dot"></view>
                                        <text>当前位置</text>
                                    </view>
                                </view>
    
                                <view class="subscene-tags" v-if="!scene.isTemporary && scene.subScenes && scene.subScenes.length > 0">
                                    <text v-for="(sub, sIdx) in scene.subScenes.slice(0, 3)" :key="sIdx" class="sub-tag">📍 {{ sub }}</text>
                                    <text v-if="scene.subScenes.length > 3" class="sub-tag">...</text>
                                </view>
                                
                                <view class="resident-pile">
                                    <view 
                                        class="avatar-circle" 
                                        v-for="(npc, i) in scene.npcs.slice(0, 5)" 
                                        :key="npc.id"
                                        :style="{ zIndex: 10 - i }"
                                        @longpress.stop="handleDeleteNpc(npc)"
                                    >
                                        <image :src="npc.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="pile-img"></image>
                                        <view class="status-indicator" v-if="npc.unread > 0"></view>
                                    </view>
                                    <view class="more-count" v-if="scene.npcs.length > 5">
                                        <text>+{{ scene.npcs.length - 5 }}</text>
                                    </view>
                                    <text class="resident-count-text" v-if="scene.npcs.length > 0">{{ scene.npcs.length }} 人在场</text>
                                    <text class="resident-count-text empty" v-else>暂无人在场</text>
                                </view>
                            </view>
                            
                            <view class="card-action">
                                 <button class="action-btn-pill enter" v-if="globalLocation === scene.name">
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
    
    <view class="modal-mask" v-if="showCreateSceneModal" @click="closeCreateModal">
        <view class="modal-content" @click.stop>
            <view class="modal-header">
                <text class="modal-title">创建新场景</text>
                <view class="close-btn" @click="closeCreateModal">×</view>
            </view>
            <scroll-view scroll-y class="modal-body">
                <view class="form-item">
                    <text class="form-label">所属世界观</text>
                    <picker 
                        mode="selector" 
                        :range="worldList" 
                        range-key="name" 
                        @change="handleWorldChange"
                    >
                        <view class="picker-box">
                            <text v-if="newScene.worldId">🌍 {{ getSelectedWorldName() }}</text>
                            <text v-else class="placeholder">请选择世界...</text>
                            <text class="arrow">▼</text>
                        </view>
                    </picker>
                    <text class="form-tip" v-if="worldList.length === 0">⚠️ 请先去[我的-世界观]创建世界</text>
                </view>

                <view class="form-item">
                    <text class="form-label">场景名称</text>
                    <input class="form-input" v-model="newScene.name" placeholder="例如：月光酒吧、侦探事务所..." />
                </view>

                <view class="form-item">
                    <text class="form-label">子场景 / 区域 (点击标签设为默认入口)</text> <view class="sub-scene-input-row">
                        <input class="form-input small" v-model="tempSubScene" placeholder="例如：大厅、301室..." @confirm="addSubScene" />
                        <view class="add-btn-mini" @click="addSubScene">添加</view>
                    </view>
                    
                    <view class="tags-wrapper">
                        <view 
                            v-for="(sub, idx) in newScene.subScenes" 
                            :key="idx" 
                            class="tag-chip"
                            :class="{ 'is-default': newScene.defaultSubLocation === sub }"
                            @click="setDefaultLocation(sub)"
                        >
                            <text v-if="newScene.defaultSubLocation === sub" class="default-icon">📍</text>
                            {{ sub }}
                            <text class="tag-del" @click.stop="removeSubScene(idx)">×</text>
                        </view>
                    </view>
                    
                    <text class="form-tip" v-if="newScene.defaultSubLocation">
                        当前默认入口: {{ newScene.defaultSubLocation }}
                    </text>
                </view>
            </scroll-view>
            <view class="modal-footer">
                <button class="modal-btn" @click="submitCreateScene">立即创建</button>
            </view>
        </view>
    </view>

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

// 数据源
const contactList = ref([]);
const sceneList = ref([]); // 真实创建的场景列表
const worldList = ref([]); // 世界列表

const globalLocation = ref('CORRIDOR'); 
const showPhone = ref(false);
const showCreateSceneModal = ref(false);

// 创建场景表单数据
const newScene = ref({
    worldId: '',
    name: '',
    subScenes: [],
	defaultSubLocation: '' // 👈 [新增] 默认落脚点
});
const tempSubScene = ref('');

const currentWorldId = computed(() => {
    // 简单取第一个角色的世界ID传给手机组件，或者根据当前位置判断
    if (contactList.value.length > 0) return contactList.value[0].worldId;
    return '';
});
// 👇 [新增] 控制折叠状态 (使用 Set 存储被收起的世界 ID)
const collapsedWorlds = ref(new Set());

const toggleWorld = (worldId) => {
    if (collapsedWorlds.value.has(worldId)) {
        collapsedWorlds.value.delete(worldId);
    } else {
        collapsedWorlds.value.add(worldId);
    }
};
onShow(() => {
  loadData();
});

const loadData = () => {
    contactList.value = uni.getStorageSync('contact_list') || [];
    sceneList.value = uni.getStorageSync('app_scene_list') || [];
    worldList.value = uni.getStorageSync('app_world_settings') || [];
    
    const savedLoc = uni.getStorageSync('app_global_player_location');
    if (savedLoc) globalLocation.value = savedLoc;
};

// 🔥 [重构] 核心逻辑：先处理场景映射，再按世界分组
const worldGroups = computed(() => {
    // A. 第一步：先算出扁平化的所有场景 (逻辑同之前修复过的 displayScenes)
    // 这样能保证 NPC 位置判定逻辑（实时位置优先）依然生效
    const flatScenes = [];
    const usedNpcIds = new Set();

    // 1. 真实场景处理
    sceneList.value.forEach(scene => {
        const npcsInScene = contactList.value.filter(npc => {
            const isSameWorld = !scene.worldId || String(npc.worldId) === String(scene.worldId);
            // 优先看实时位置
            const actualLoc = npc.currentLocation || npc.location;
            return isSameWorld && actualLoc === scene.name;
        });
        npcsInScene.forEach(n => usedNpcIds.add(n.id));
        
        flatScenes.push({
            ...scene,
            npcs: npcsInScene,
            isTemporary: false
        });
    });

    // 2. 临时区域处理
    const tempGroups = {};
    contactList.value.forEach(npc => {
        if (!usedNpcIds.has(npc.id)) {
            const loc = npc.currentLocation || npc.location || '未知区域';
            if (!tempGroups[loc]) tempGroups[loc] = [];
            tempGroups[loc].push(npc);
        }
    });

    Object.keys(tempGroups).forEach(locName => {
        const firstNpc = tempGroups[locName][0];
        flatScenes.push({
            id: 'temp_' + locName,
            name: locName,
            worldId: firstNpc.worldId, // 临时场景跟随第一个 NPC 的世界观
            isTemporary: true,
            npcs: tempGroups[locName],
            subScenes: []
        });
    });

    // B. 第二步：按世界分组
    const groupsMap = new Map();

    // 初始化世界分组
    worldList.value.forEach(world => {
        groupsMap.set(String(world.id), {
            id: String(world.id),
            name: world.name,
            scenes: []
        });
    });
    
    // 初始化“其他/未知世界”
    const UNKNOWN_ID = 'unknown';
    groupsMap.set(UNKNOWN_ID, { id: UNKNOWN_ID, name: '未分类 / 独立世界', scenes: [] });

    // 分发场景到对应世界
    flatScenes.forEach(scene => {
        const targetWorldId = scene.worldId ? String(scene.worldId) : UNKNOWN_ID;
        if (groupsMap.has(targetWorldId)) {
            groupsMap.get(targetWorldId).scenes.push(scene);
        } else {
            // 如果世界ID存在但找不到对应世界设定，也归入未知
            groupsMap.get(UNKNOWN_ID).scenes.push(scene);
        }
    });

    // 转换为数组并过滤掉空的世界 (可选：如果你想显示空世界，去掉 filter 即可)
    return Array.from(groupsMap.values()).filter(g => g.scenes.length > 0);
});

const displayScenes = computed(() => {
    const result = [];
    const usedNpcIds = new Set();

    // 1. 遍历真实创建的场景
    sceneList.value.forEach(scene => {
        // 找到属于该场景世界 且 location 匹配的 NPC
        const npcsInScene = contactList.value.filter(npc => {
            // 兼容逻辑：必须世界ID匹配（如果有世界ID的话）
            const isSameWorld = !scene.worldId || String(npc.worldId) === String(scene.worldId);
            
            // 🔥🔥🔥 [修改点 1] 核心修复：优先判断 currentLocation（实时位置），没有才看 location（常驻地）
            const actualLoc = npc.currentLocation || npc.location;
            
            // 只有当“实际位置”等于“场景名称”时，才归类到这里
            return isSameWorld && actualLoc === scene.name;
        });

        // 标记这些 NPC 已被展示
        npcsInScene.forEach(n => usedNpcIds.add(n.id));
        
        // 查找世界名称
        const world = worldList.value.find(w => String(w.id) === String(scene.worldId));
        
        result.push({
            ...scene,
            npcs: npcsInScene,
            worldName: world ? world.name : '',
            isTemporary: false
        });
    });

    // 2. [兼容] 处理没有真实场景的“临时/未登记区域” NPC
    const tempGroups = {};
    contactList.value.forEach(npc => {
        if (!usedNpcIds.has(npc.id)) {
            // 🔥🔥🔥 [修改点 2] 临时区域分组也要优先看实时位置
            const loc = npc.currentLocation || npc.location || '未知区域';
            
            if (!tempGroups[loc]) tempGroups[loc] = [];
            tempGroups[loc].push(npc);
        }
    });

    Object.keys(tempGroups).forEach(locName => {
        const firstNpc = tempGroups[locName][0];
        const world = worldList.value.find(w => String(w.id) === String(firstNpc.worldId));
        
        result.push({
            id: 'temp_' + locName,
            name: locName,
            worldId: firstNpc.worldId,
            worldName: world ? world.name : '',
            subScenes: [],
            npcs: tempGroups[locName],
            isTemporary: true
        });
    });

    return result;
});

const handleDeleteNpc = (npc) => {
    uni.showModal({
        title: '删除角色',
        content: `确定要永久删除角色“${npc.name}”吗？\n(删除后无法恢复，且会清除该角色的所有聊天记录)`,
        confirmColor: '#ff4d4f',
        success: (res) => {
            if (res.confirm) {
                // 1. 从列表移除
                const idx = contactList.value.findIndex(c => c.id === npc.id);
                if (idx !== -1) {
                    contactList.value.splice(idx, 1);
                    // 2. 保存到本地存储
                    uni.setStorageSync('contact_list', contactList.value);
                    
                    // 3. (可选) 如果你想更彻底，也可以在这里调用 DB 删除聊天记录
                    // 但仅为了解决重复问题，从列表删除就够了
                    
                    uni.showToast({ title: '角色已删除', icon: 'none' });
                }
            }
        }
    });
};
// =============================================================================
// 右上角 + 号逻辑
// =============================================================================
const handlePlusClick = () => {
    uni.showActionSheet({
        itemList: ['✨ 创建新角色', '🏘️ 创建新场景'],
        success: (res) => {
            if (res.tapIndex === 0) {
                // 创建角色
                createNewContact();
            } else if (res.tapIndex === 1) {
                // 创建场景
                openCreateSceneModal();
            }
        }
    });
};

const createNewContact = () => {
  uni.navigateTo({ url: '/pages/create/create' });
};

// =============================================================================
// 场景创建逻辑
// =============================================================================
const openCreateSceneModal = () => {
    if (worldList.value.length === 0) {
        uni.showModal({
            title: '提示',
            content: '还没有创建世界观，请先去【我的 -> 世界观设定】创建一个世界。',
            confirmText: '去创建',
            success: (res) => {
                if(res.confirm) uni.switchTab({ url: '/pages/mine/mine' });
            }
        });
        return;
    }
    // 重置表单
    newScene.value = { worldId: '', name: '', subScenes: [] };
    tempSubScene.value = '';
    showCreateSceneModal.value = true;
};

const closeCreateModal = () => {
    showCreateSceneModal.value = false;
};

const handleWorldChange = (e) => {
    const idx = e.detail.value;
    newScene.value.worldId = worldList.value[idx].id;
};

const getSelectedWorldName = () => {
    const w = worldList.value.find(w => String(w.id) === String(newScene.value.worldId));
    return w ? w.name : '';
};

const addSubScene = () => {
    const val = tempSubScene.value.trim();
    if (val) {
        if (newScene.value.subScenes.includes(val)) {
            uni.showToast({ title: '重复的子场景', icon: 'none' });
            return;
        }
        newScene.value.subScenes.push(val);
        
        // 🔥 [新增] 如果这是第一个添加的子场景，自动设为默认
        if (newScene.value.subScenes.length === 1) {
            newScene.value.defaultSubLocation = val;
        }
        
        tempSubScene.value = '';
    }
};
const handleLongPressScene = (scene) => {
    // 1. 核心判断：如果是系统自动生成的临时区域（isTemporary），不允许删除
    if (scene.isTemporary) {
        // 可选：给个提示，或者什么都不做
        // uni.showToast({ title: '临时区域不可删除', icon: 'none' });
        return;
    }

    // 2. 震动反馈 (提升手感)
    uni.vibrateShort();

    // 3. 弹出确认框
    uni.showModal({
        title: '删除场景',
        content: `确定要删除场景“${scene.name}”吗？\n(场景内的角色不会被删除，将变为未登记状态)`,
        confirmColor: '#ff4d4f',
        success: (res) => {
            if (res.confirm) {
                const idx = sceneList.value.findIndex(s => s.id === scene.id);
                if (idx !== -1) {
                    sceneList.value.splice(idx, 1);
                    uni.setStorageSync('app_scene_list', sceneList.value);
                    uni.showToast({ title: '已删除', icon: 'none' });
                }
            }
        }
    });
};

const removeSubScene = (index) => {
    const removedVal = newScene.value.subScenes[index];
    newScene.value.subScenes.splice(index, 1);
    
    // 🔥 [新增] 如果删掉的是默认地点，重置默认地点
    if (newScene.value.defaultSubLocation === removedVal) {
        // 如果还有其他子场景，取第一个；否则为空
        newScene.value.defaultSubLocation = newScene.value.subScenes.length > 0 
            ? newScene.value.subScenes[0] 
            : '';
    }
};

// 🔥 [新增] 手动设置默认地点
const setDefaultLocation = (sub) => {
    newScene.value.defaultSubLocation = sub;
};

const submitCreateScene = () => {
    if (!newScene.value.worldId) return uni.showToast({ title: '请选择世界观', icon: 'none' });
    if (!newScene.value.name) return uni.showToast({ title: '请输入场景名称', icon: 'none' });

    // 检查重复
    const exists = sceneList.value.some(s => 
        String(s.worldId) === String(newScene.value.worldId) && s.name === newScene.value.name
    );
    if (exists) {
        return uni.showToast({ title: '该世界下已存在同名场景', icon: 'none' });
    }

    const sceneObj = {
        id: Date.now(),
        ...newScene.value,
        // 🔥 确保保存了默认位置，如果没有子场景，就叫"大厅"
        lastSubLocation: newScene.value.defaultSubLocation || '大厅', 
        npcs: []
    };

    sceneList.value.push(sceneObj);
    uni.setStorageSync('app_scene_list', sceneList.value);
    
    uni.showToast({ title: '场景创建成功', icon: 'success' });
    closeCreateModal();
};

// =============================================================================
// 进场/移动逻辑
// =============================================================================
// pages/index/index.vue

const handleEnterRoom = (scene) => {
    // 1. 如果是“真实创建的场景”，跳转到 scene/chat
    if (!scene.isTemporary) {
        uni.navigateTo({
            url: `/pages/scene/chat?id=${scene.id}`
        });
        return;
    }

    // 2. 如果是“临时区域”（只有人，没有场景数据），保持原有逻辑进私聊
    const targetLoc = scene.name;
    const currentLoc = globalLocation.value;
    
    if (scene.npcs.length === 0) return; // 没人就不进了
    const targetNpc = scene.npcs[0]; 

    if (currentLoc === targetLoc) {
        enterChat(targetNpc.id);
        return;
    }

    uni.showModal({
        title: '移动确认',
        content: `从 [${currentLoc}] 前往 [${targetLoc}] 吗？`,
        confirmText: '前往',
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
    display: flex;
    flex-direction: column;
}
.dark-mode .custom-navbar {
    background: rgba(30, 30, 30, 0.85);
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

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

/* === 卡片样式 === */
.room-card {
    background: var(--card-bg); 
    border-radius: 32rpx; 
    margin-bottom: 30rpx;
    box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.04); 
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
    border: 1px solid transparent;
    overflow: hidden;
    position: relative;
}
.dark-mode .room-card { box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }

.room-card:active { transform: scale(0.98); }
.room-card.active-location {
    border: 2rpx solid #007aff;
    background: linear-gradient(to bottom right, var(--card-bg), rgba(0,122,255,0.05));
}
.room-card.is-temporary {
    border: 2rpx dashed var(--border-color);
    opacity: 0.9;
}

.card-content { padding: 30rpx; display: flex; align-items: center; justify-content: space-between; }
.room-info { flex: 1; padding-right: 20rpx; }

.room-title-row { display: flex; align-items: center; margin-bottom: 16rpx; flex-wrap: wrap; gap: 12rpx; }
.room-name { font-size: 34rpx; font-weight: 700; color: var(--text-color); }

.tag-world {
    font-size: 20rpx;
    background: rgba(156, 39, 176, 0.1);
    color: #9c27b0;
    padding: 4rpx 10rpx;
    border-radius: 8rpx;
    font-weight: bold;
}
.tag-temp {
    font-size: 20rpx;
    background: rgba(0,0,0,0.05);
    color: var(--text-sub);
    padding: 4rpx 10rpx;
    border-radius: 8rpx;
}
.dark-mode .tag-temp { background: rgba(255,255,255,0.1); }

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

/* 子场景标签 */
.subscene-tags { display: flex; gap: 12rpx; margin-bottom: 24rpx; flex-wrap: wrap; }
.sub-tag { 
    font-size: 22rpx; color: var(--text-sub); 
    background: var(--tool-bg); padding: 4rpx 12rpx; border-radius: 8rpx; 
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

/* === 模态框样式 === */
.modal-mask {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 2000;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
}
.modal-content {
    width: 600rpx; max-height: 80vh;
    background: var(--card-bg); border-radius: 32rpx;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 20rpx 50rpx rgba(0,0,0,0.2);
}
.modal-header {
    padding: 30rpx; display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid var(--border-color);
}
.modal-title { font-size: 32rpx; font-weight: bold; color: var(--text-color); }
.close-btn { font-size: 40rpx; color: var(--text-sub); padding: 0 10rpx; line-height: 1; }

.modal-body { padding: 30rpx; flex: 1; overflow-y: auto; }

.form-item { margin-bottom: 30rpx; }
.form-label { font-size: 26rpx; color: var(--text-sub); margin-bottom: 12rpx; display: block; }
.form-tip { font-size: 22rpx; color: #ff9f43; margin-top: 8rpx; display: block; }

.picker-box {
    background: var(--input-bg); height: 80rpx; border-radius: 16rpx;
    padding: 0 24rpx; display: flex; justify-content: space-between; align-items: center;
    border: 1px solid var(--border-color);
}
.picker-box text { font-size: 28rpx; color: var(--text-color); }
.picker-box text.placeholder { color: #999; }
.arrow { color: #ccc; font-size: 24rpx; }

.form-input {
    background: var(--input-bg); height: 80rpx; border-radius: 16rpx;
    padding: 0 24rpx; font-size: 28rpx; color: var(--text-color);
    border: 1px solid var(--border-color);
}
.form-input.small { flex: 1; margin-right: 16rpx; }

.sub-scene-input-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.add-btn-mini {
    background: #007aff; color: #fff; font-size: 24rpx;
    height: 80rpx; width: 100rpx; border-radius: 16rpx;
    display: flex; align-items: center; justify-content: center;
}

.tags-wrapper { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tag-chip {
    background: var(--tool-bg); padding: 8rpx 20rpx; border-radius: 30rpx;
    font-size: 24rpx; color: var(--text-color); border: 1px solid var(--border-color);
    display: flex; align-items: center;
}
.tag-del { margin-left: 10rpx; color: #ff4d4f; font-weight: bold; padding: 0 4rpx; }

.modal-footer { padding: 30rpx; border-top: 1px solid var(--border-color); }
.modal-btn {
    background: #007aff; color: #fff; border-radius: 44rpx;
    font-size: 30rpx; font-weight: bold;
}
.modal-btn:active { opacity: 0.9; }
/* 🔥 新增分组样式 */
.world-group {
    margin-bottom: 40rpx;
}

.group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 10rpx;
    margin-bottom: 16rpx;
    /* 粘性定位：让标题在滚动时吸顶，体验更好 (可选) */
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg-color); /* 需要背景色遮挡 */
    border-radius: 12rpx;
}
/* 增加点击反馈 */
.group-header:active {
    background: rgba(0,0,0,0.03);
}

.header-left {
    display: flex;
    align-items: center;
}

.world-icon {
    font-size: 32rpx;
    margin-right: 12rpx;
}

.group-title {
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-color);
    margin-right: 10rpx;
}

.group-count {
    font-size: 24rpx;
    color: var(--text-sub);
    font-weight: normal;
}

.arrow-icon {
    font-size: 24rpx;
    color: var(--text-sub);
    transition: transform 0.3s ease;
}

/* 箭头旋转动画 */
.arrow-icon.collapsed {
    transform: rotate(-90deg);
}

.group-content {
    /* 这里不需要写太多，主要靠 v-if 控制 */
}

/* 调整原来的 room-card margin，因为现在有分组包裹了 */
.room-card {
    margin-bottom: 24rpx; /* 稍微减小一点间距，让组内更紧凑 */
}

.tag-chip {
    background: var(--tool-bg); 
    padding: 8rpx 20rpx; 
    border-radius: 30rpx;
    font-size: 24rpx; 
    color: var(--text-color); 
    border: 1px solid var(--border-color);
    display: flex; 
    align-items: center;
    transition: all 0.2s;
}

/* 🔥 [新增] 默认地点的选中样式 */
.tag-chip.is-default {
    background: rgba(0, 122, 255, 0.1);
    border-color: #007aff;
    color: #007aff;
    font-weight: bold;
    padding-left: 14rpx; /* 调整内边距给图标留位 */
}

.default-icon {
    margin-right: 6rpx;
    font-size: 22rpx;
}

.tag-del { 
    margin-left: 10rpx; 
    color: #ff4d4f; 
    font-weight: bold; 
    padding: 0 4rpx;
    opacity: 0.6;
}
.tag-del:active { opacity: 1; }


</style>