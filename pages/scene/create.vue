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
            <text class="label">子场景 / 区域</text>
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
              <view v-for="(sub, idx) in formData.subScenes" :key="idx" class="tag">
                <text>{{ sub }}</text>
                <text class="del" @click="removeSubScene(idx)">×</text>
              </view>
            </view>
          </view>
        </view>

        <button class="save-btn" @click="handleSaveScene">保存修改</button>
        <button class="delete-btn" @click="handleDeleteScene">删除场景</button>
      </view>

      <view v-if="currentTab === 1" class="role-list-panel">
        <view v-if="sceneNpcs.length === 0" class="empty-state">
          <text>暂无角色在此场景</text>
        </view>

        <view 
          class="role-card" 
          v-for="npc in sceneNpcs" 
          :key="npc.id"
          @click="editRole(npc.id)"
        >
          <image :src="npc.avatar || '/static/ai-avatar.png'" mode="aspectFill" class="avatar"></image>
          <view class="role-info">
            <view class="role-header">
              <text class="role-name">{{ npc.name }}</text>
              <text class="role-status" v-if="npc.isHere">📍 当前在此</text>
              <text class="role-status resident" v-else>🏠 常驻人口</text>
            </view>
            <text class="role-desc line-1">{{ npc.settings?.description || '暂无简介' }}</text>
          </view>
          <text class="arrow">›</text>
        </view>
        
        <view class="add-role-hint" @click="createNewRole">
            <text>+ 创建新角色并加入此处</text>
        </view>
      </view>

    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useTheme } from '@/composables/useTheme.js';

const { isDarkMode, applyNativeTheme } = useTheme();

const sceneId = ref(null);
const currentTab = ref(0);
const worldName = ref('');
const tempSubScene = ref('');

const formData = ref({
  name: '',
  subScenes: []
});

const sceneNpcs = ref([]); // 在此场景的角色列表

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

  // 1. 初始化表单
  formData.value = {
    name: target.name,
    subScenes: target.subScenes ? [...target.subScenes] : []
  };

  // 2. 获取世界名
  const worlds = uni.getStorageSync('app_world_settings') || [];
  const w = worlds.find(item => String(item.id) === String(target.worldId));
  worldName.value = w ? w.name : '独立世界';

  // 3. 获取角色列表 (常驻 或 当前位置)
  const contacts = uni.getStorageSync('contact_list') || [];
  const sName = target.name;
  
  sceneNpcs.value = contacts.filter(c => {
    // 判定逻辑：常驻地址是这里 OR 当前地址是这里
    const isResident = c.location === sName;
    const isHere = c.currentLocation === sName;
    return isResident || isHere;
  }).map(c => ({
    ...c,
    isHere: c.currentLocation === sName
  }));
};

// --- 场景编辑逻辑 ---
const addSubScene = () => {
  const val = tempSubScene.value.trim();
  if (val && !formData.value.subScenes.includes(val)) {
    formData.value.subScenes.push(val);
    tempSubScene.value = '';
  }
};

const removeSubScene = (index) => {
  formData.value.subScenes.splice(index, 1);
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
    
    // 更新玩家位置
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
                // 强制返回首页
                uni.switchTab({ url: '/pages/index/index' });
            }
        }
    });
};

// --- 角色跳转逻辑 ---
const editRole = (npcId) => {
  uni.navigateTo({
    url: `/pages/create/create?id=${npcId}`
  });
};

const createNewRole = () => {
    // 创建新角色，并预设其位置为当前场景
    // 这里需要 create 页面支持预设参数，或者创建后手动改。
    // 暂时直接跳转新建页
    uni.navigateTo({ url: '/pages/create/create' });
};

const goBack = () => uni.navigateBack();
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background: var(--bg-color); display: flex; flex-direction: column; }

/* 导航栏 */
.custom-navbar { background: var(--card-bg); position: fixed; top: 0; width: 100%; z-index: 100; border-bottom: 1px solid var(--border-color); }
.status-bar { height: var(--status-bar-height); }
.nav-content { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx; }
.nav-btn { width: 80rpx; height: 80rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.title { font-size: 32rpx; font-weight: bold; color: var(--text-color); }
.nav-placeholder { height: calc(var(--status-bar-height) + 88rpx); }

/* 选项卡 */
.tabs { display: flex; background: var(--card-bg); margin-top: 20rpx; border-bottom: 1px solid var(--border-color); }
.tab-item { 
  flex: 1; text-align: center; padding: 24rpx 0; 
  font-size: 28rpx; color: var(--text-sub); position: relative; font-weight: bold;
}
.tab-item.active { color: #007aff; }
.indicator { 
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 40rpx; height: 6rpx; background: #007aff; border-radius: 6rpx; 
}

/* 内容区 */
.content-area { flex: 1; padding: 30rpx; box-sizing: border-box; }

/* 表单样式 */
.card { background: var(--card-bg); border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx; }
.form-item { margin-bottom: 30rpx; }
.label { font-size: 26rpx; color: var(--text-sub); margin-bottom: 12rpx; display: block; }
.input, .value-box { 
  background: var(--input-bg); height: 80rpx; border-radius: 12rpx; 
  padding: 0 24rpx; font-size: 28rpx; color: var(--text-color);
  display: flex; align-items: center;
}
.value-box.disabled { opacity: 0.7; background: rgba(0,0,0,0.03); }
.tip { font-size: 22rpx; color: #ff9f43; margin-top: 8rpx; display: block; }

/* 子场景标签 */
.sub-input-row { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.input.small { flex: 1; }
.btn-mini { 
  background: #007aff; color: #fff; width: 120rpx; height: 80rpx; 
  border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx;
}
.tags-container { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tag { 
  background: rgba(0,122,255,0.1); color: #007aff; 
  padding: 8rpx 20rpx; border-radius: 30rpx; font-size: 24rpx; display: flex; align-items: center; gap: 8rpx;
}
.del { font-weight: bold; opacity: 0.6; }

/* 按钮 */
.save-btn { background: #007aff; color: #fff; border-radius: 40rpx; margin-bottom: 20rpx; }
.delete-btn { background: #fff; color: #ff4d4f; border: 2rpx solid #ff4d4f; border-radius: 40rpx; }

/* 角色列表样式 */
.role-card {
  background: var(--card-bg); padding: 20rpx; border-radius: 20rpx;
  display: flex; align-items: center; margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.03);
}
.avatar { width: 100rpx; height: 100rpx; border-radius: 50%; margin-right: 20rpx; background: #eee; }
.role-info { flex: 1; }
.role-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.role-name { font-size: 30rpx; font-weight: bold; color: var(--text-color); }
.role-status { font-size: 20rpx; padding: 4rpx 8rpx; border-radius: 6rpx; background: #e3f2fd; color: #007aff; }
.role-status.resident { background: #f3e5f5; color: #9c27b0; }
.role-desc { font-size: 24rpx; color: var(--text-sub); }
.arrow { color: #ccc; font-size: 40rpx; }
.empty-state { text-align: center; color: #999; padding: 60rpx 0; }
.add-role-hint { text-align: center; color: #007aff; padding: 20rpx; font-weight: bold; font-size: 28rpx; margin-top: 20rpx;}
</style>