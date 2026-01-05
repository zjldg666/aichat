<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    <view class="custom-navbar">
      <view class="status-bar"></view>
      <view class="nav-content">
        <view class="nav-btn" @click="goBack">
          <text class="icon">⬅️</text>
        </view>
        <text class="title">场景管理</text>
        <view class="nav-btn placeholder"></view>
      </view>
    </view>
    <view class="nav-placeholder"></view>

    <view class="tabs">
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 0 }" 
        @click="currentTab = 0"
      >
        场景信息
        <view class="indicator" v-if="currentTab === 0"></view>
      </view>
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 1 }" 
        @click="currentTab = 1"
      >
        角色管理 ({{ sceneNpcs.length }})
        <view class="indicator" v-if="currentTab === 1"></view>
      </view>
    </view>

    <scroll-view scroll-y class="content-area">
      
      <view v-if="currentTab === 0" class="form-panel">
        <view class="card">
          <view class="form-item">
            <text class="label">所属世界</text>
            <view class="value-box disabled">
              <text>🌍 {{ worldName || '未知世界' }}</text>
            </view>
          </view>

          <view class="form-item">
            <text class="label">场景名称</text>
            <input class="input" v-model="formData.name" placeholder="请输入场景名称" />
            <text class="tip">⚠️ 修改名称会自动同步更新在此处的 NPC 位置</text>
          </view>

          <view class="form-item">
            <text class="label">子场景 / 区域 (点击标签设为默认入口)</text>
            
            <view class="sub-input-row">
              <input 
                class="input small" 
                v-model="tempSubScene" 
                placeholder="添加区域 (如: 二楼、吧台)" 
                @confirm="addSubScene"
              />
              <view class="btn-mini" @click="addSubScene">添加</view>
            </view>

            <view class="tags-container">
              <view 
                v-for="(sub, idx) in formData.subScenes" 
                :key="idx" 
                class="tag"
                :class="{ 'is-default': formData.defaultSubLocation === sub }"
                @click="setDefaultLocation(sub)"
              >
                <text v-if="formData.defaultSubLocation === sub" class="default-icon">📍</text>
                <text>{{ sub }}</text>
                <text class="del" @click.stop="removeSubScene(idx)">×</text>
              </view>
            </view>
             <text class="tip" v-if="formData.defaultSubLocation">
                当前默认入口: {{ formData.defaultSubLocation }}
            </text>
          </view>
        </view>

        <button class="save-btn" @click="handleSaveScene">保存修改</button>
        <button class="clear-btn" @click="handleClearHistory">清空聊天记录</button>
        <button class="delete-btn" @click="handleDeleteScene">删除场景</button>
      </view>

      <view v-if="currentTab === 1" class="role-list-panel">
          <view 
            class="role-card-wrapper" 
            v-for="(npc, index) in sceneNpcs" 
            :key="npc.id"
          >
            <view class="role-card-header" @click="toggleExpand(index)">
                <image :src="npc.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="avatar"></image>
                <view class="role-info">
                  <view class="role-header-row">
                    <text class="role-name">{{ npc.name }}</text>
                    <text class="role-status" v-if="npc.isHere">📍 当前在此</text>
                    <text class="role-status resident" v-else>🏠 常驻人口</text>
                  </view>
                  <text class="role-desc line-1">{{ npc.settings?.description || '暂无简介' }}</text>
                  
                  <text class="role-bind-info" v-if="npc.initialSubLocation">
                      🏠 默认房间: {{ npc.initialSubLocation }}
                  </text>
                </view>
                
                <text class="arrow" :class="{ 'expanded': npc.expanded }">›</text>
            </view>
      
            <view class="role-card-body" v-if="npc.expanded">
                <view class="divider"></view>
                
                <view class="setting-row">
                    <text class="setting-label">设置在该场景的专属房间/初始位:</text>
                    <view class="tags-row">
                        <view 
                            v-for="(sub, sIdx) in formData.subScenes" 
                            :key="sIdx"
                            class="mini-tag"
                            :class="{ 'active': npc.initialSubLocation === sub }"
                            @click="saveRoleLocation(npc, sub)"
                        >
                            {{ sub }}
                        </view>
                        
                        <view 
                            class="mini-tag clear" 
                            v-if="npc.initialSubLocation" 
                            @click="saveRoleLocation(npc, '')"
                        >
                            清除
                        </view>
                    </view>
                    <text class="no-sub-tip" v-if="formData.subScenes.length === 0">
                        (请先在"场景信息"中添加子场景区域)
                    </text>
                </view>
      
                <button class="edit-btn-full" @click="editRole(npc.id)">
                    ✏️ 修改角色详细设定
                </button>
            </view>
          </view>
          
          <view class="add-role-hint" @click="createNewRole">
              <text>+ 创建新角色并加入此处</text>
          </view>
      </view>

    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useTheme } from '@/composables/useTheme.js';
import { DB } from '@/utils/db.js';

const { isDarkMode, applyNativeTheme } = useTheme();

const sceneId = ref(null);
const currentTab = ref(0);
const worldName = ref('');
const tempSubScene = ref('');

const formData = ref({
  name: '',
  subScenes: [],
  defaultSubLocation: '' // 🔥 [新增]
});

const sceneNpcs = ref([]); 

onLoad((options) => {
  if (options.id) {
    sceneId.value = options.id;
    loadData();
  }
  applyNativeTheme();
});

const loadData = () => {
  const allScenes = uni.getStorageSync('app_scene_list') || [];
  const target = allScenes.find(s => String(s.id) === String(sceneId.value));
  
  if (!target) {
    uni.showToast({ title: '场景不存在', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 1000);
    return;
  }

  formData.value = {
    name: target.name,
    subScenes: target.subScenes ? [...target.subScenes] : [],
    defaultSubLocation: target.defaultSubLocation || (target.subScenes && target.subScenes.length > 0 ? target.subScenes[0] : '')
  };

  const worlds = uni.getStorageSync('app_world_settings') || [];
  const w = worlds.find(item => String(item.id) === String(target.worldId));
  worldName.value = w ? w.name : '独立世界';

  const contacts = uni.getStorageSync('contact_list') || [];
  const sName = target.name;
  
  sceneNpcs.value = contacts.filter(c => {
    const isResident = c.location === sName;
    const isHere = c.currentLocation === sName;
    return isResident || isHere;
  }).map(c => {
      // 🔥 [核心修改] 从 sceneConfig 字典中读取当前场景的配置
      // 如果没有配置，默认为空
      let myInitial = '';
      if (c.sceneConfig && c.sceneConfig[sceneId.value]) {
          myInitial = c.sceneConfig[sceneId.value].initialSubLocation || '';
      }
      
      return {
        ...c,
        isHere: c.currentLocation === sName,
        expanded: false,
        initialSubLocation: myInitial // 赋值给临时变量供 UI 显示
      };
  });
};

// 🔥 [新增] 切换展开状态
const toggleExpand = (index) => {
    sceneNpcs.value[index].expanded = !sceneNpcs.value[index].expanded;
};

// 🔥 [新增] 保存角色的初始位置设置
const saveRoleLocation = (npc, subLocation) => {
    // 1. 更新当前页面视图
    npc.initialSubLocation = subLocation;
    
    // 2. 更新全局存储
    const contacts = uni.getStorageSync('contact_list') || [];
    const targetIndex = contacts.findIndex(c => c.id === npc.id);
    
    if (targetIndex !== -1) {
        // 确保 sceneConfig 对象存在
        if (!contacts[targetIndex].sceneConfig) {
            contacts[targetIndex].sceneConfig = {};
        }
        // 确保当前场景的配置对象存在
        if (!contacts[targetIndex].sceneConfig[sceneId.value]) {
            contacts[targetIndex].sceneConfig[sceneId.value] = {};
        }

        // 写入配置
        contacts[targetIndex].sceneConfig[sceneId.value].initialSubLocation = subLocation;
        
        // (可选) 如果角色是常驻人口且在这里“迷路”了(没位置)，顺手把他放过去
        if (contacts[targetIndex].location === formData.value.name && !contacts[targetIndex].currentSubLocation) {
             contacts[targetIndex].currentSubLocation = subLocation;
        }

        uni.setStorageSync('contact_list', contacts);
        uni.showToast({ title: '位置已绑定', icon: 'none' });
    }
};

// --- 场景编辑逻辑 ---
const addSubScene = () => {
  const val = tempSubScene.value.trim();
  if (val && !formData.value.subScenes.includes(val)) {
    formData.value.subScenes.push(val);
    
    // 🔥 如果是第一个，自动设为默认
    if (formData.value.subScenes.length === 1) {
        formData.value.defaultSubLocation = val;
    }
    
    tempSubScene.value = '';
  }
};

const removeSubScene = (index) => {
  const removedVal = formData.value.subScenes[index];
  formData.value.subScenes.splice(index, 1);
  
  // 🔥 如果删掉了默认的，重置默认值
  if (formData.value.defaultSubLocation === removedVal) {
      formData.value.defaultSubLocation = formData.value.subScenes.length > 0 
        ? formData.value.subScenes[0] 
        : '';
  }
};

// 🔥 [新增] 设置默认
const setDefaultLocation = (sub) => {
    formData.value.defaultSubLocation = sub;
};

const handleSaveScene = () => {
  if (!formData.value.name) return uni.showToast({ title: '名称不能为空', icon: 'none' });

  const allScenes = uni.getStorageSync('app_scene_list') || [];
  const idx = allScenes.findIndex(s => String(s.id) === String(sceneId.value));
  if (idx === -1) return;

  const oldName = allScenes[idx].name;
  const newName = formData.value.name;

  // 1. 更新场景数据
  allScenes[idx].name = newName;
  allScenes[idx].subScenes = formData.value.subScenes;
  allScenes[idx].defaultSubLocation = formData.value.defaultSubLocation; // 🔥 保存默认位置
  
  // 如果没有 lastSubLocation (可能是旧数据)，顺手也更新一下，防止进场景报错
  if (!allScenes[idx].lastSubLocation && formData.value.defaultSubLocation) {
      allScenes[idx].lastSubLocation = formData.value.defaultSubLocation;
  }

  uni.setStorageSync('app_scene_list', allScenes);

  // 2. 级联更新角色位置 (如果改了名)
  if (oldName !== newName) {
    const contacts = uni.getStorageSync('contact_list') || [];
    let updateCount = 0;
    contacts.forEach(c => {
      let changed = false;
      if (c.location === oldName) { c.location = newName; changed = true; }
      if (c.currentLocation === oldName) { c.currentLocation = newName; changed = true; }
      if (changed) updateCount++;
    });
    if (updateCount > 0) uni.setStorageSync('contact_list', contacts);
    
    const pLoc = uni.getStorageSync('app_global_player_location');
    if (pLoc === oldName) uni.setStorageSync('app_global_player_location', newName);
  }

  uni.showToast({ title: '保存成功', icon: 'success' });
};

const handleDeleteScene = () => {
    uni.showModal({
        title: '删除确认',
        content: '确定要删除该场景吗？\n(场景内的角色不会被删除)',
        confirmColor: '#ff4d4f',
        success: (res) => {
            if (res.confirm) {
                const allScenes = uni.getStorageSync('app_scene_list') || [];
                const newScenes = allScenes.filter(s => String(s.id) !== String(sceneId.value));
                uni.setStorageSync('app_scene_list', newScenes);
                uni.switchTab({ url: '/pages/index/index' });
            }
        }
    });
};

const handleClearHistory = () => {
    uni.showModal({
        title: '清空确认',
        content: '确定要清空该场景内的所有聊天记录吗？\n(此操作不可恢复)',
        confirmColor: '#ff9f43', 
        success: async (res) => {
            if (res.confirm) {
                try {
                    await DB.execute(
                        `DELETE FROM messages WHERE chatId = ?`,
                        [String(sceneId.value)]
                    );
                    uni.showToast({ title: '记录已清空', icon: 'success' });
                } catch (e) {
                    console.error('清空失败', e);
                    uni.showToast({ title: '操作失败', icon: 'none' });
                }
            }
        }
    });
};

const editRole = (npcId) => {
  uni.navigateTo({ url: `/pages/create/create?id=${npcId}` });
};

const createNewRole = () => {
    uni.navigateTo({ url: '/pages/create/create' });
};

const goBack = () => uni.navigateBack();
</script>

<style lang="scss" scoped>
.container { 
  min-height: 100vh; 
  background: var(--bg-color); 
  display: flex; 
  flex-direction: column; 
}

/* =========================================================
   1. 顶部导航栏
   ========================================================= */
.custom-navbar { 
  background: var(--card-bg); 
  position: fixed; 
  top: 0; 
  width: 100%; 
  z-index: 100; 
  border-bottom: 1px solid var(--border-color); 
}
.status-bar { height: var(--status-bar-height); }
.nav-content { 
  height: 88rpx; 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 0 20rpx; 
}
.nav-btn { 
  width: 80rpx; 
  height: 80rpx; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 36rpx; 
}
.title { font-size: 32rpx; font-weight: bold; color: var(--text-color); }
.nav-placeholder { height: calc(var(--status-bar-height) + 88rpx); }

/* =========================================================
   2. 选项卡 (Tab)
   ========================================================= */
.tabs { 
  display: flex; 
  background: var(--card-bg); 
  margin-top: 20rpx; 
  border-bottom: 1px solid var(--border-color); 
}
.tab-item { 
  flex: 1; 
  text-align: center; 
  padding: 24rpx 0; 
  font-size: 28rpx; 
  color: var(--text-sub); 
  position: relative; 
  font-weight: bold;
}
.tab-item.active { color: #007aff; }
.indicator { 
  position: absolute; 
  bottom: 0; 
  left: 50%; 
  transform: translateX(-50%);
  width: 40rpx; 
  height: 6rpx; 
  background: #007aff; 
  border-radius: 6rpx; 
}

/* =========================================================
   3. 内容区域 & 表单
   ========================================================= */
.content-area { 
  flex: 1; 
  padding: 30rpx; 
  box-sizing: border-box; 
}

.card { 
  background: var(--card-bg); 
  border-radius: 20rpx; 
  padding: 30rpx; 
  margin-bottom: 30rpx; 
}
.form-item { margin-bottom: 30rpx; }
.label { 
  font-size: 26rpx; 
  color: var(--text-sub); 
  margin-bottom: 12rpx; 
  display: block; 
}
.input, .value-box { 
  background: var(--input-bg); 
  height: 80rpx; 
  border-radius: 12rpx; 
  padding: 0 24rpx; 
  font-size: 28rpx; 
  color: var(--text-color);
  display: flex; 
  align-items: center;
}
.value-box.disabled { opacity: 0.7; background: rgba(0,0,0,0.03); }
.tip { font-size: 22rpx; color: #ff9f43; margin-top: 8rpx; display: block; }

/* 子场景标签输入相关 */
.sub-input-row { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.input.small { flex: 1; }
.btn-mini { 
  background: #007aff; color: #fff; width: 120rpx; height: 80rpx; 
  border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx;
}
.tags-container { display: flex; flex-wrap: wrap; gap: 16rpx; }

/* 场景标签样式 (支持默认选中态) */
.tag { 
  background: rgba(0,122,255,0.1); color: #007aff; 
  padding: 8rpx 20rpx; border-radius: 30rpx; font-size: 24rpx; 
  display: flex; align-items: center; gap: 8rpx;
  border: 1px solid transparent; 
  transition: all 0.2s;
}
.tag.is-default {
    background: rgba(0,122,255,0.15);
    border-color: #007aff;
    font-weight: bold;
    padding-left: 14rpx;
}
.default-icon { font-size: 22rpx; margin-right: 4rpx; }
.del { font-weight: bold; opacity: 0.6; }

/* 底部操作按钮 */
.save-btn { background: #007aff; color: #fff; border-radius: 40rpx; margin-bottom: 20rpx; }
.clear-btn { background: #fff; color: #ff9f43; border: 2rpx solid #ff9f43; border-radius: 40rpx; margin-bottom: 20rpx; }
.delete-btn { background: #fff; color: #ff4d4f; border: 2rpx solid #ff4d4f; border-radius: 40rpx; }

/* =========================================================
   4. 角色管理卡片 (手风琴样式)
   ========================================================= */
.role-card-wrapper {
  background: var(--card-bg); 
  border-radius: 20rpx; 
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.03);
  overflow: hidden;
  transition: all 0.3s;
}

/* 头部：基本信息 */
.role-card-header {
    padding: 24rpx;
    display: flex;
    align-items: center;
}
.role-card-header:active { background-color: rgba(0,0,0,0.02); }

.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; margin-right: 20rpx; background: #eee; }
.role-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }

.role-header-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.role-name { font-size: 30rpx; font-weight: bold; color: var(--text-color); }
.role-status { font-size: 20rpx; padding: 4rpx 8rpx; border-radius: 6rpx; background: #e3f2fd; color: #007aff; }
.role-status.resident { background: #f3e5f5; color: #9c27b0; }

.role-desc { font-size: 24rpx; color: var(--text-sub); margin-bottom: 4rpx; }
.role-bind-info { font-size: 22rpx; color: #007aff; font-weight: 500; }

/* 展开箭头 */
.arrow { 
    color: #ccc; font-size: 40rpx; transition: transform 0.3s; 
    transform: rotate(90deg); /* 默认朝右/下 */
    margin-left: 20rpx;
    padding: 0 10rpx;
}
.arrow.expanded { transform: rotate(-90deg); /* 展开朝上 */ }

/* 展开后的内容区域 */
.role-card-body {
    background: rgba(0,0,0,0.02); /* 稍微深一点的背景区分 */
    padding: 0 24rpx 24rpx 24rpx;
}

.divider { height: 1px; background: var(--border-color); width: 100%; margin-bottom: 20rpx; opacity: 0.5; }

.setting-row { margin-bottom: 24rpx; }
.setting-label { font-size: 24rpx; color: var(--text-sub); margin-bottom: 12rpx; display: block; }

/* 角色位置选择的小标签 */
.tags-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.mini-tag {
    font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 8rpx;
    background: #fff; border: 1px solid var(--border-color); color: var(--text-color);
}
.mini-tag.active {
    background: #007aff; color: #fff; border-color: #007aff;
}
.mini-tag.clear {
    background: transparent; color: #ff4d4f; border-color: transparent; text-decoration: underline;
}

.no-sub-tip { font-size: 22rpx; color: #999; font-style: italic; }

.edit-btn-full {
    background: #fff; color: #333; border: 1px solid var(--border-color);
    font-size: 26rpx; height: 70rpx; border-radius: 12rpx;
    display: flex; align-items: center; justify-content: center;
}
.dark-mode .edit-btn-full { background: #333; border-color: #444; color: #ccc; }

/* 底部创建提示 */
.empty-state { text-align: center; color: #999; padding: 60rpx 0; }
.add-role-hint { text-align: center; color: #007aff; padding: 20rpx; font-weight: bold; font-size: 28rpx; margin-top: 20rpx;}
</style>