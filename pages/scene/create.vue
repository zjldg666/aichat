<template>
  <view class="container" :class="{ 'dark-mode': isDarkMode }">
    
    <view class="card">
      <view class="section-header" @click="toggleSection('world')">
        <view class="section-title-wrapper">
             <view class="section-title">🌍 世界与舞台</view>
             <text class="section-subtitle">设定场景的背景与规则</text>
        </view>
        <text class="arrow-icon">{{ activeSections.world ? '▼' : '▶' }}</text>
      </view>
      
      <view v-show="activeSections.world" class="section-content">
        <picker 
          mode="selector" 
          :range="worldList" 
          range-key="name" 
          @change="onWorldChange"
        >
          <view class="picker-item">
            <text class="label">所属世界 (可选)</text>
            <view class="value-box">
                <text class="value">{{ selectedWorldName || '无 (独立场景)' }}</text>
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
        
        <view class="form-item">
          <text class="label">场景名称</text>
          <input class="input" v-model="form.name" placeholder="例如：深夜的酒馆" />
        </view>
      
        <view class="form-item">
           <text class="label">📍 场景地图规划 (子场景)</text>
           <text class="tip-text">定义场景里有哪些小房间，比如: 吧台、包厢、卫生间</text>
           
           <view class="sub-scene-input-box">
               <input 
                  class="input-small" 
                  v-model="tempSubScene" 
                  placeholder="输入区域名 (回车添加)" 
                  @confirm="addSubScene"
               />
               <view class="add-btn-small" @click="addSubScene">添加</view>
           </view>
      
           <view class="sub-scene-tags">
               <view class="tag" v-for="(tag, idx) in form.subScenes" :key="idx">
                   {{ tag }}
                   <text class="close-icon" @click="removeSubScene(idx)">×</text>
               </view>
           </view>
           <text class="tip-text" v-if="form.subScenes.length === 0" style="color:#ff9f43">⚠️ 必须至少添加一个区域 (如: 大厅)</text>
        </view>
      
        <view class="form-item">
          <text class="label">玩家身份</text>
          <input class="input" v-model="form.playerIdentity" placeholder="例如：神秘的旅人" />
        </view>
      
        <view class="form-item no-border" style="margin-top: 20rpx;">
          <text class="label">场景氛围/补充描述</text>
          <textarea 
            class="textarea" 
            v-model="form.background" 
            placeholder="例如：今天是校庆日，非常热闹..." 
          ></textarea>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-header" @click="toggleSection('npcs')">
        <view class="section-title-wrapper">
             <view class="section-title">👥 登场角色</view>
             <text class="section-subtitle">选择参与者并配置记忆</text>
        </view>
        <text class="arrow-icon">{{ activeSections.npcs ? '▼' : '▶' }}</text>
      </view>

      <view v-show="activeSections.npcs" class="section-content">
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
                  <view class="memory-tag-row" v-if="npc.selected">
                      <text class="mem-tag" :class="npc.usePrivateMemory ? 'mem-on' : 'mem-off'">
                          {{ npc.usePrivateMemory ? '🧠 记忆同步开启' : '🚫 记忆隔离' }}
                      </text>
                  </view>
                </view>
              </view>
              
              <view v-if="npc.selected" class="npc-detail-form" @click.stop>
                  
                  <view class="detail-row highlight-row">
                     <text class="sub-label">初始位置:</text>
                     <picker 
                       mode="selector" 
                       :range="form.subScenes" 
                       @change="(e) => handleNpcLocationChange(npc, e)"
                     >
                         <view class="picker-display">
                             {{ npc.initialSubLocation || '请选择区域 >' }}
                         </view>
                     </picker>
                  </view>
                  
                  <view class="detail-row">
                     <text class="sub-label">剧本身份:</text>
                     <input class="mini-input" v-model="npc.sceneRole" placeholder="例如: 酒保 (默认原职)" />
                  </view>
                  
                  <view class="detail-block">
                      </view>
              </view>
            </view>
          </view>
      </view>
    </view>

    <view class="card">
        <view class="section-header" @click="toggleSection('sceneMem')">
            <view class="section-title-wrapper">
                 <view class="section-title" style="color: #9b59b6;">🧠 场景记忆设置</view>
                 <text class="section-subtitle">控制场景本身的记录方式</text>
            </view>
            <text class="arrow-icon">{{ activeSections.sceneMem ? '▼' : '▶' }}</text>
        </view>
        
        <view v-show="activeSections.sceneMem" class="section-content">
            <view class="form-item no-border">
                <view class="label-row">
                    <text class="label">上下文深度: {{ form.historyLimit }}条</text>
                </view>
                <slider 
                    :value="form.historyLimit" 
                    min="5" 
                    max="50" 
                    step="1" 
                    show-value 
                    activeColor="#9b59b6" 
                    @change="(e) => form.historyLimit = e.detail.value" 
                />
                <text class="tip">技术设置：决定了 AI 能回看屏幕上最近多少句对话。设得太高会消耗更多 Token，建议 15-20。</text>
            </view>
        
            </view>
    </view>

    <view class="card danger-zone" v-if="editSceneId">
        <view class="section-header" @click="toggleSection('danger')">
            <view class="section-title-wrapper">
                 <view class="section-title" style="color: #ff4757;">⚠️ 危险区域</view>
            </view>
            <text class="arrow-icon">{{ activeSections.danger ? '▼' : '▶' }}</text>
        </view>
        
        <view v-show="activeSections.danger" class="section-content">
            <view class="danger-content">
                <view class="danger-desc">
                    此处操作将直接影响数据库，请谨慎操作。
                </view>
                
                <button class="clear-btn" @click="handleClearHistory">
                    🗑️ 物理清空本场景聊天记录
                </button>
            </view>
        </view>
    </view>

    <view class="footer-btn-area">
        <button class="save-btn" @click="saveScene">
            {{ editSceneId ? '保存修改' : '创建场景' }}
        </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app'; 
import { useTheme } from '@/composables/useTheme.js';
import { DB } from '@/utils/db.js';

const { isDarkMode, applyNativeTheme } = useTheme();

// 状态管理
const isCustomMode = ref(false); 
const worldList = ref([]); 
const currentWorldLocations = ref([]); 
const editSceneId = ref(null); 

// 🔥 新增：折叠状态管理
const activeSections = ref({
    world: true,
    npcs: true,
    sceneMem: false,
    danger: false
});
// 新增：临时输入框变量
const tempSubScene = ref('');
const form = ref({
  name: '',
  worldId: '',
  worldName: '', 
  locationName: '',
  background: '',
  playerIdentity: '',
  historyLimit: 15, 

  subScenes: ['大厅']
});

const contacts = ref([]);

const selectedWorldName = computed(() => {
    const w = worldList.value.find(i => i.id === form.value.worldId);
    return w ? w.name : '';
});
const selectedWorldDesc = computed(() => {
    const w = worldList.value.find(i => i.id === form.value.worldId);
    return w ? w.description : '';
});

onLoad((options) => {
    applyNativeTheme();
    loadWorlds();
    loadContacts(); 

    if (options.id) {
        editSceneId.value = options.id;
        uni.setNavigationBarTitle({ title: '编辑场景' });
        loadSceneDataForEdit(options.id);
    } else {
        uni.setNavigationBarTitle({ title: '创建新场景' });
    }
});

const loadWorlds = () => {
  const list = uni.getStorageSync('app_world_settings') || [];
  worldList.value = list;
};

const loadContacts = () => {
  const list = uni.getStorageSync('contact_list') || [];
  contacts.value = list.map(c => ({
      ...c,
      selected: false,
      initialSubLocation: '', // 🔥 新增字段：初始位置
      sceneRole: '',
      reason: '',
      usePrivateMemory: true,
      memoryStats: null 
  }));
};
// 🔥 新增函数：添加子场景
const addSubScene = () => {
    const val = tempSubScene.value.trim();
    if (!val) return;
    
    if (form.value.subScenes.includes(val)) {
        return uni.showToast({ title: '该区域已存在', icon: 'none' });
    }
    
    form.value.subScenes.push(val);
    tempSubScene.value = ''; // 清空输入框
};

// 🔥 新增函数：删除子场景
const removeSubScene = (index) => {
    const removedTag = form.value.subScenes[index];
    form.value.subScenes.splice(index, 1);
    
    // 🧹 清理：如果有 NPC 选了这个被删除的区域，重置他们的位置
    contacts.value.forEach(c => {
        if (c.initialSubLocation === removedTag) {
            c.initialSubLocation = ''; 
        }
    });
};

// 🔥 新增函数：处理 NPC 位置选择
const handleNpcLocationChange = (npc, e) => {
    const idx = e.detail.value;
    // 直接把子场景的名字赋给 NPC
    npc.initialSubLocation = form.value.subScenes[idx];
};

// 🔥 新增：验视 NPC 记忆数据的逻辑
const checkNpcMemory = async (npc) => {
    uni.showLoading({ title: '读取记忆中...' });
    try {
        // 1. 获取流动摘要 (已经加载在内存里了)
        const summaryPreview = npc.summary ? 
            (npc.summary.length > 50 ? npc.summary.slice(0, 50) + '...' : npc.summary) 
            : null;
            
        // 2. 异步查询数据库日记总数
        const res = await DB.select(
            `SELECT count(*) as count FROM diaries WHERE roleId = ?`,
            [String(npc.id)]
        );
        const diaryCount = res[0] ? res[0].count : 0;
        
        // 3. 更新 UI
        npc.memoryStats = {
            summaryPreview,
            diaryCount
        };
        
        uni.hideLoading();
    } catch (e) {
        uni.hideLoading();
        console.error(e);
        uni.showToast({ title: '读取失败', icon: 'none' });
    }
};

const loadSceneDataForEdit = (id) => {
    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const target = allScenes.find(s => String(s.id) === String(id));
    
    if (target) {
        form.value = {
            name: target.name,
            worldId: target.worldId,
            worldName: target.worldName,
            locationName: target.locationName,
            background: target.background,
            playerIdentity: target.playerIdentity,
            historyLimit: target.memorySettings?.historyLimit || 15,
            
            subScenes: (target.subScenes && target.subScenes.length > 0) ? target.subScenes : ['大厅'] 
        };
        
        

        if (target.npcs && Array.isArray(target.npcs)) {
            target.npcs.forEach(savedNpc => {
                const idx = contacts.value.findIndex(c => String(c.id) === String(savedNpc.id));
                if (idx !== -1) {
                    const c = contacts.value[idx];
                    c.selected = true;
                    c.sceneRole = savedNpc.sceneRole || '';
                    c.reason = savedNpc.reason || '';
                    c.usePrivateMemory = savedNpc.usePrivateMemory !== false;
                    
                    if (savedNpc.initialSubLocation && form.value.subScenes.includes(savedNpc.initialSubLocation)) {
                        c.initialSubLocation = savedNpc.initialSubLocation;
                    } else {
                        c.initialSubLocation = form.value.subScenes[0] || '大厅';
                    }
                }
            });
            contacts.value.sort((a, b) => (b.selected ? 1 : 0) - (a.selected ? 1 : 0));
        }
    }
};

// 🔥 新增：折叠切换
const toggleSection = (key) => {
    activeSections.value[key] = !activeSections.value[key];
};

const toggleMode = (val) => {
    isCustomMode.value = val;
    if (val) {
        form.value.worldId = '';
        form.value.locationName = '';
    }
};

const onWorldChange = (e) => {
    const idx = e.detail.value;
    const world = worldList.value[idx];
    if (world) {
        form.value.worldId = world.id;
        form.value.worldName = world.name;
        currentWorldLocations.value = world.locations || []; 
        form.value.locationName = ''; 
    }
};

const onLocationChange = (e) => {
    const idx = e.detail.value;
    const loc = currentWorldLocations.value[idx];
    form.value.locationName = loc;
    if (!form.value.name) form.value.name = loc;
};

const toggleNpc = (index) => {
    contacts.value[index].selected = !contacts.value[index].selected;
};

const saveScene = () => {
    if (!form.value.name) return uni.showToast({ title: '请输入场景名称', icon: 'none' });
    
    // 🔥 校验：必须有至少一个子场景
    if (form.value.subScenes.length === 0) {
        return uni.showToast({ title: '请至少添加一个子区域(如:大厅)', icon: 'none' });
    }

    const selectedNpcs = contacts.value.filter(c => c.selected).map(c => ({
        id: c.id,
        name: c.name,
        sceneRole: c.sceneRole,
        // 🔥 保存初始位置，如果用户没选，默认分配到第一个房间
        initialSubLocation: c.initialSubLocation || form.value.subScenes[0], 
        reason: c.reason,
        worldId: c.worldId, 
        occupation: c.occupation,
        usePrivateMemory: c.usePrivateMemory 
    }));
    
    // 允许 0 NPC 创建 (比如单人探索)
    if (selectedNpcs.length === 0 && contacts.value.length > 0) {
         // 可选：给个提示，或者允许单人场景
    }

    const list = uni.getStorageSync('app_scene_list') || [];

    const memorySettings = {
        historyLimit: form.value.historyLimit,
    };

    // 构造保存对象
    const saveData = {
        ...form.value, 
        npcs: selectedNpcs,
        memorySettings,
        
        updateTime: Date.now()
    };

    if (editSceneId.value) {
        const index = list.findIndex(s => String(s.id) === String(editSceneId.value));
        if (index !== -1) {
            list[index] = { ...list[index], ...saveData };
            uni.showToast({ title: '已更新设定', icon: 'success' });
        }
    } else {
        const newScene = {
            id: 'scene_' + Date.now(),
            createTime: Date.now(),
            ...saveData
        };
        list.unshift(newScene);
        uni.showToast({ title: '场景创建成功', icon: 'success' });
    }

    uni.setStorageSync('app_scene_list', list);
    setTimeout(() => uni.navigateBack(), 800);
};

const handleClearHistory = () => {
    uni.showModal({
        title: '危险操作',
        content: '确定要永久清空本场景的所有聊天记录吗？',
        confirmColor: '#ff4d4f',
        success: async (res) => {
            if (res.confirm && editSceneId.value) {
                try {
                    await DB.execute(
                        `DELETE FROM messages WHERE chatId = ?`, 
                        [String(editSceneId.value)]
                    );
                    uni.showToast({ title: '记录已彻底粉碎', icon: 'success' });
                } catch (e) {
                    console.error(e);
                    uni.showToast({ title: '删除失败', icon: 'none' });
                }
            }
        }
    });
};
</script>

<style lang="scss" scoped>
/* 容器与卡片 */
.container { padding: 30rpx; min-height: 100vh; background-color: var(--bg-color); padding-bottom: 120rpx; }
.card {
  background-color: var(--card-bg); border-radius: 20rpx; margin-bottom: 24rpx;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.02); border: 1px solid var(--border-color);
  overflow: hidden; /* 配合折叠动画 */
}

/* 🔥 仿造 create.vue 的标题头样式 */
.section-header { 
    padding: 30rpx; 
    display: flex; justify-content: space-between; align-items: center; 
    border-bottom: 1px solid var(--border-color); /* 折叠时有底边框 */
    transition: background-color 0.2s;
    &:active { background-color: var(--tool-bg); }
}

.section-title-wrapper { display: flex; flex-direction: column; }
.section-title { 
    font-size: 30rpx; font-weight: bold; 
    color: var(--text-color); 
    border-left: 8rpx solid #007aff; padding-left: 16rpx; 
}
.section-subtitle { 
    font-size: 22rpx; color: var(--text-sub); margin-top: 6rpx; margin-left: 20rpx; 
}
.arrow-icon { color: var(--text-sub); font-size: 24rpx; opacity: 0.5; }

.section-content { padding: 30rpx; animation: slideDown 0.2s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10rpx); } to { opacity: 1; transform: translateY(0); } }

/* 模式切换 */
.mode-switch {
    display: flex; background: var(--tool-bg); border-radius: 12rpx; padding: 6rpx; margin-bottom: 30rpx;
    text {
        flex: 1; text-align: center; font-size: 26rpx; padding: 12rpx 0; color: var(--text-sub); border-radius: 10rpx;
        &.active { background: var(--card-bg); color: #007aff; font-weight: bold; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1); }
    }
}

.picker-item {
    display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1px solid var(--border-color);
    .label { font-size: 30rpx; color: var(--text-color); }
    .value-box { display: flex; align-items: center; }
    .value { font-size: 30rpx; color: #007aff; max-width: 400rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .arrow { color: var(--text-sub); margin-left: 10rpx; font-size: 24rpx; }
}

.world-intro {
    background: rgba(0,122,255,0.05); padding: 20rpx; border-radius: 12rpx; margin-top: 20rpx; 
    font-size: 24rpx; color: var(--text-sub); line-height: 1.5;
    .intro-tag { font-weight: bold; color: #007aff; margin-right: 8rpx; }
}

.form-item { margin-top: 24rpx; border-bottom: 1px solid var(--border-color); padding-bottom: 20rpx; &.no-border { border-bottom: none; } }
.label { font-size: 26rpx; color: var(--text-sub); margin-bottom: 12rpx; display: block; }
.input { font-size: 30rpx; color: var(--text-color); width: 100%; }
.textarea { width: 100%; height: 160rpx; font-size: 30rpx; color: var(--text-color); background: var(--bg-color); padding: 20rpx; border-radius: 12rpx; }

.memory-box {
    border: 2rpx dashed #9b59b6;
    background-color: rgba(155, 89, 182, 0.05);
    color: var(--text-sub);
    line-height: 1.5;
}
.tip { font-size: 24rpx; color: var(--text-sub); margin-top: 10rpx; display: block; }

.empty-tip { text-align: center; color: var(--text-sub); padding: 20rpx; font-size: 26rpx; }
.npc-list { display: flex; flex-direction: column; gap: 20rpx; }

.npc-item {
  background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 16rpx; padding: 20rpx;
  transition: all 0.2s;
  &.is-selected { border-color: #007aff; background: rgba(0, 122, 255, 0.05); .check-mark { color: #fff; } .checkbox { background: #007aff; border-color: #007aff; } }
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

.memory-tag-row { margin-top: 10rpx; }
.mem-tag {
    font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 6rpx; border: 1px solid;
    &.mem-on { color: #007aff; border-color: #007aff; background: rgba(0,122,255,0.05); }
    &.mem-off { color: #ff4757; border-color: #ff4757; background: rgba(255,71,87,0.05); }
}

.npc-detail-form { margin-top: 20rpx; padding-top: 16rpx; border-top: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16rpx; }

.detail-block { 
    background: var(--tool-bg); padding: 16rpx; border-radius: 12rpx; margin-bottom: 10rpx;
}
.switch-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.sub-label-bold { font-size: 26rpx; font-weight: bold; color: var(--text-color); }
.desc-text { font-size: 22rpx; color: var(--text-sub); line-height: 1.4; display: block; 
    &.warning { color: #ff9f43; }
}

/* 🔥 新增：记忆验视面板 */
.memory-check-panel {
    margin-top: 16rpx;
    background: var(--bg-color); /* 内嵌卡片 */
    border-radius: 8rpx;
    padding: 12rpx;
    border: 1px solid var(--border-color);
}
.check-btn {
    text-align: center; padding: 8rpx; background: rgba(0,122,255,0.05); 
    border-radius: 8rpx; font-size: 24rpx; color: #007aff; font-weight: bold;
    &:active { background: rgba(0,122,255,0.1); }
}
.stats-box { margin-top: 12rpx; }
.stat-row { font-size: 24rpx; margin-bottom: 6rpx; display: flex; gap: 10rpx; color: var(--text-sub); }
.stat-row .val { color: var(--text-color); font-weight: bold; }
.summary-preview {
    font-size: 22rpx; color: #666; background: var(--tool-bg);
    padding: 8rpx; border-radius: 6rpx; margin-top: 4rpx;
    line-height: 1.4; font-style: italic;
}

.detail-row { display: flex; align-items: center; }
.sub-label { font-size: 24rpx; color: var(--text-sub); width: 130rpx; }
.mini-input { flex: 1; font-size: 26rpx; color: var(--text-color); border-bottom: 1px solid var(--border-color); }

.danger-zone { border: 1px solid rgba(255, 71, 87, 0.3); }
.danger-content { padding: 10rpx 0; }
.danger-desc { font-size: 24rpx; color: var(--text-sub); margin-bottom: 24rpx; }

.clear-btn {
    background-color: rgba(255, 71, 87, 0.1); 
    color: #ff4757; 
    font-size: 28rpx; 
    border: 1px solid #ff4757; 
    width: 100%;
    border-radius: 40rpx;
    font-weight: bold;
    display: flex; align-items: center; justify-content: center;
    &:active { background-color: rgba(255, 71, 87, 0.2); }
}

.footer-btn-area { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 40rpx; background: var(--card-bg); box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); }
.save-btn { background: #007aff; color: #fff; border-radius: 40rpx; font-weight: bold; }
/* 子场景输入与标签 */
.sub-scene-input-box {
    display: flex; gap: 20rpx; margin-top: 16rpx;
}
.input-small {
    flex: 1; background: var(--tool-bg); height: 68rpx; padding: 0 24rpx; 
    border-radius: 12rpx; font-size: 28rpx; color: var(--text-color);
}
.add-btn-small {
    background: #007aff; color: #fff; font-size: 26rpx; padding: 0 34rpx; 
    border-radius: 12rpx; display: flex; align-items: center; justify-content: center;
    &:active { opacity: 0.8; }
}
.sub-scene-tags {
    display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx;
}
.tag {
    background: rgba(0,122,255,0.08); color: #007aff; font-size: 26rpx; 
    padding: 10rpx 24rpx; border-radius: 40rpx; display: flex; align-items: center;
}
.close-icon { 
    margin-left: 12rpx; font-weight: bold; padding: 0 4rpx; opacity: 0.6;
    &:active { opacity: 1; color: #ff4757; }
}
.tip-text { font-size: 24rpx; color: var(--text-sub); margin-top: 10rpx; display: block; }

/* NPC 详情优化 */
.highlight-row { 
    background: var(--tool-bg); padding: 12rpx 16rpx; border-radius: 12rpx; margin-bottom: 20rpx;
    border: 1px solid rgba(0,0,0,0.03);
}
.picker-display { 
    font-size: 28rpx; color: #007aff; font-weight: bold; 
    display: flex; align-items: center;
}
</style>