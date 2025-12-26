<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    
    <view class="card">
      <view class="section-title">🌍 世界与舞台</view>
      
      <view class="mode-switch">
        <text :class="{ active: !isCustomMode }" @click="toggleMode(false)">世界观模式</text>
        <text :class="{ active: isCustomMode }" @click="toggleMode(true)">自由模式</text>
      </view>

      <template v-if="!isCustomMode">
        <picker 
          mode="selector" 
          :range="worldList" 
          range-key="name" 
          @change="onWorldChange"
        >
          <view class="picker-item">
            <text class="label">所属世界</text>
            <view class="value-box">
                <text class="value">{{ selectedWorldName || '请选择世界' }}</text>
                <text class="arrow">></text>
            </view>
          </view>
        </picker>

        <picker 
          mode="selector" 
          :range="currentWorldLocations" 
          @change="onLocationChange"
          :disabled="!form.worldId"
        >
          <view class="picker-item">
            <text class="label">发生地点</text>
            <view class="value-box">
                <text class="value">{{ form.locationName || (form.worldId ? '请选择地点' : '请先选世界') }}</text>
                <text class="arrow">></text>
            </view>
          </view>
        </picker>
        
        <view v-if="selectedWorldDesc" class="world-intro">
          <text class="intro-tag">世界设定:</text>
          {{ selectedWorldDesc }}
        </view>
      </template>

      <view class="form-item">
        <text class="label">场景名称</text>
        <input class="input" v-model="form.name" placeholder="例如：深夜的酒馆" />
      </view>

      <view class="form-item">
        <text class="label">玩家身份</text>
        <input class="input" v-model="form.playerIdentity" placeholder="例如：神秘的旅人" />
      </view>

      <view class="form-item no-border" style="margin-top: 20rpx;">
        <text class="label">{{ isCustomMode ? '场景背景详情' : '当前氛围/补充描述' }}</text>
        <textarea 
          class="textarea" 
          v-model="form.background" 
          :placeholder="isCustomMode ? '描述环境...' : '例如：今天是校庆日，非常热闹...'" 
        ></textarea>
      </view>
    </view>

    <view class="card">
      <view class="section-title">👥 登场角色</view>
      <view v-if="contacts.length === 0" class="empty-tip">暂无角色可用</view>
      
      <view class="npc-list">
        <view 
          class="npc-item" 
          v-for="(npc, index) in contacts" 
          :key="npc.id"
          :class="{ 'is-selected': npc.selected, 'is-match': !isCustomMode && npc.worldId === form.worldId }"
          @click="toggleNpc(index)"
        >
          <view class="npc-header">
            <view class="checkbox">
               <text v-if="npc.selected" class="check-mark">✓</text>
            </view>
            <image :src="npc.avatar || '/static/ai-avatar.png'" class="avatar" mode="aspectFill"></image>
            <view class="npc-info">
              <text class="npc-name">{{ npc.name }}</text>
              <view v-if="!isCustomMode && form.worldId" class="tag-row">
                  <text class="npc-meta match" v-if="npc.worldId === form.worldId">🏠 本土居民</text>
                  <text class="npc-meta warning" v-else>✈️ 外来访客</text>
              </view>
            </view>
          </view>
          
          <view v-if="npc.selected" class="npc-detail-form" @click.stop>
             <view class="detail-row">
               <text class="sub-label">剧本身份:</text>
               <input class="mini-input" v-model="npc.sceneRole" placeholder="例如: 酒保 (默认原职)" />
             </view>
             
             <view class="detail-row" v-if="!isCustomMode && form.worldId && npc.worldId !== form.worldId">
               <text class="sub-label">出现理由:</text>
               <input class="mini-input" v-model="npc.reason" placeholder="穿越? 旅游?..." />
             </view>
             
             <view class="detail-row">
               <text class="sub-label">初始状态:</text>
               <input class="mini-input" v-model="npc.initialState" placeholder="正在做什么..." />
             </view>
          </view>

        </view>
      </view>
    </view>

    <view class="footer-btn-area">
      <button class="save-btn" @click="saveScene">创建场景</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useTheme } from '@/composables/useTheme.js';

const { isDarkMode, applyNativeTheme } = useTheme();

const isCustomMode = ref(false); // 默认为世界观模式
const worldList = ref([]); // 所有世界观
const currentWorldLocations = ref([]); // 当前选中的世界的地点列表

const form = ref({
  name: '',
  worldId: '',
  worldName: '', // 存名字方便显示
  locationName: '',
  background: '',
  playerIdentity: ''
});

const contacts = ref([]);

// 计算属性：当前选中世界的描述
const selectedWorldName = computed(() => {
    const w = worldList.value.find(i => i.id === form.value.worldId);
    return w ? w.name : '';
});
const selectedWorldDesc = computed(() => {
    const w = worldList.value.find(i => i.id === form.value.worldId);
    return w ? w.description : '';
});

onShow(() => {
  applyNativeTheme();
  loadWorlds();
  loadContacts();
});

const toggleMode = (val) => {
    isCustomMode.value = val;
    // 切换模式时清空世界选择，避免数据混淆
    if (val) {
        form.value.worldId = '';
        form.value.locationName = '';
    }
};

// 1. 加载世界观 (从 app_world_settings 读取)
const loadWorlds = () => {
  const list = uni.getStorageSync('app_world_settings') || [];
  worldList.value = list;
};

// 2. 加载角色
const loadContacts = () => {
  const list = uni.getStorageSync('contact_list') || [];
  contacts.value = list.map(c => ({
      ...c,
      selected: false,
      initialState: '',
      sceneRole: '',
      reason: '' 
  }));
};

const onWorldChange = (e) => {
    const idx = e.detail.value;
    const world = worldList.value[idx];
    if (world) {
        form.value.worldId = world.id;
        form.value.worldName = world.name;
        // 加载该世界的地点
        currentWorldLocations.value = world.locations || []; 
        form.value.locationName = ''; // 重置地点
        
        // 自动填充场景名为地点名（方便用户）
        // form.value.name = ''; 
    }
};

const onLocationChange = (e) => {
    const idx = e.detail.value;
    const loc = currentWorldLocations.value[idx];
    form.value.locationName = loc;
    // 如果还没填名字，自动用地点名作为场景名
    if (!form.value.name) {
        form.value.name = loc;
    }
};

const toggleNpc = (index) => {
    contacts.value[index].selected = !contacts.value[index].selected;
};

const saveScene = () => {
    if (!form.value.name) return uni.showToast({ title: '请输入场景名称', icon: 'none' });
    
    // 提取选中的 NPC
    const selectedNpcs = contacts.value.filter(c => c.selected).map(c => ({
        id: c.id,
        name: c.name,
        // 关键字段
        sceneRole: c.sceneRole,
        initialState: c.initialState,
        reason: c.reason,
        // 存一下原来的 worldId 方便 Prompt 判断是不是本地人
        worldId: c.worldId, 
        occupation: c.occupation
    }));
    
    if (selectedNpcs.length === 0) return uni.showToast({ title: '请至少选择一个NPC', icon: 'none' });

    const newScene = {
        id: 'scene_' + Date.now(),
        createTime: Date.now(),
        ...form.value, // 包含 worldId, locationName, background 等
        npcs: selectedNpcs,
        // 默认配置
        memorySettings: { enableSummary: true }
    };

    // 保存
    const list = uni.getStorageSync('app_scene_list') || [];
    list.unshift(newScene);
    uni.setStorageSync('app_scene_list', list);

    uni.showToast({ title: '场景创建成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 800);
};
</script>

<style lang="scss" scoped>
/* 容器与卡片 */
.container { padding: 30rpx; min-height: 100vh; background-color: var(--bg-color); padding-bottom: 120rpx; }
.card {
  background-color: var(--card-bg); border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.02); border: 1px solid var(--border-color);
}
.section-title { font-size: 30rpx; font-weight: bold; margin-bottom: 24rpx; color: var(--text-color); border-left: 8rpx solid #007aff; padding-left: 16rpx; }

/* 模式切换 */
.mode-switch {
    display: flex; background: var(--tool-bg); border-radius: 12rpx; padding: 6rpx; margin-bottom: 30rpx;
    text {
        flex: 1; text-align: center; font-size: 26rpx; padding: 12rpx 0; color: var(--text-sub); border-radius: 10rpx;
        &.active { background: var(--card-bg); color: #007aff; font-weight: bold; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1); }
    }
}

/* Picker 样式 */
.picker-item {
    display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1px solid var(--border-color);
    .label { font-size: 30rpx; color: var(--text-color); }
    .value-box { display: flex; align-items: center; }
    .value { font-size: 30rpx; color: #007aff; max-width: 400rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .arrow { color: var(--text-sub); margin-left: 10rpx; font-size: 24rpx; }
}

/* 世界简介 */
.world-intro {
    background: rgba(0,122,255,0.05); padding: 20rpx; border-radius: 12rpx; margin-top: 20rpx; 
    font-size: 24rpx; color: var(--text-sub); line-height: 1.5;
    .intro-tag { font-weight: bold; color: #007aff; margin-right: 8rpx; }
}

/* 表单输入 */
.form-item { margin-top: 24rpx; border-bottom: 1px solid var(--border-color); padding-bottom: 20rpx; &.no-border { border-bottom: none; } }
.label { font-size: 26rpx; color: var(--text-sub); margin-bottom: 12rpx; display: block; }
.input { font-size: 30rpx; color: var(--text-color); width: 100%; }
.textarea { width: 100%; height: 160rpx; font-size: 30rpx; color: var(--text-color); background: var(--bg-color); padding: 20rpx; border-radius: 12rpx; }

/* NPC 列表 */
.empty-tip { text-align: center; color: var(--text-sub); padding: 20rpx; font-size: 26rpx; }
.npc-list { display: flex; flex-direction: column; gap: 20rpx; }

.npc-item {
  background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 16rpx; padding: 20rpx;
  transition: all 0.2s;
  &.is-selected { border-color: #007aff; background: rgba(0, 122, 255, 0.05); .check-mark { color: #fff; } .checkbox { background: #007aff; border-color: #007aff; } }
  /* 本土居民加个微弱的高亮边框提示 */
  &.is-match { border-left: 6rpx solid #52c41a; }
}

.npc-header { display: flex; align-items: center; }
.checkbox { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid var(--text-sub); margin-right: 20rpx; display: flex; align-items: center; justify-content: center; .check-mark { font-size: 24rpx; } }
.avatar { width: 80rpx; height: 80rpx; border-radius: 10rpx; margin-right: 20rpx; background: #eee; }
.npc-info { flex: 1; }
.npc-name { font-size: 30rpx; font-weight: bold; color: var(--text-color); }
.tag-row { display: flex; gap: 10rpx; margin-top: 6rpx; }
.npc-meta { font-size: 20rpx; padding: 2rpx 8rpx; border-radius: 6rpx; 
    &.match { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
    &.warning { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
}

/* NPC 详情表单 */
.npc-detail-form { margin-top: 20rpx; padding-top: 16rpx; border-top: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16rpx; }
.detail-row { display: flex; align-items: center; }
.sub-label { font-size: 24rpx; color: var(--text-sub); width: 130rpx; }
.mini-input { flex: 1; font-size: 26rpx; color: var(--text-color); border-bottom: 1px solid var(--border-color); }

/* 底部按钮 */
.footer-btn-area { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 40rpx; background: var(--card-bg); box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); }
.save-btn { background: #007aff; color: #fff; border-radius: 40rpx; font-weight: bold; }
</style>