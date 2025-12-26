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

    <view class="card">
        <view class="section-title" style="color: #9b59b6; border-left-color: #9b59b6;">🧠 场景记忆设置</view>
        
        <view class="form-item">
            <view class="label-row">
                <text class="label">上下文深度: {{ form.historyLimit }}条</text>
            </view>
            <slider :value="form.historyLimit" min="5" max="50" step="1" show-value activeColor="#9b59b6" @change="(e) => form.historyLimit = e.detail.value" />
            <text class="tip">决定了导演和演员能回看最近多少句对话（包括动作）。设得越高，AI 越不容易健忘，但消耗 Token 越多。</text>
        </view>

        <view class="form-item">
             <view class="label-row" style="display: flex; justify-content: space-between; margin-bottom: 20rpx;">
                <text class="label" style="margin:0;">开启剧情自动总结</text>
                <switch :checked="form.enableSummary" @change="(e) => form.enableSummary = e.detail.value" color="#9b59b6" style="transform: scale(0.8);"/>
             </view>
             <text class="tip">开启后，系统会把在场景里发生的事总结成一段话。离场时，这段话会同步给在场的角色。</text>
        </view>

        <template v-if="form.enableSummary">
            <view class="form-item">
                 <text class="label">总结频率 (每N轮对话): {{ form.summaryFrequency }}</text>
                 <slider :value="form.summaryFrequency" min="5" max="30" step="1" show-value activeColor="#9b59b6" @change="(e) => form.summaryFrequency = e.detail.value" />
            </view>
            
            <view class="form-item no-border">
                 <text class="label">当前场景记忆摘要 (初始背景)</text>
                 <textarea class="textarea memory-box" v-model="form.summary" maxlength="-1" placeholder="系统会自动生成，也可以手动补充..." />
            </view>
        </template>
    </view>

    <view class="card danger-zone" v-if="editSceneId">
        <view class="section-title" style="color: #ff4757; border-left-color: #ff4757;">⚠️ 危险区域</view>
        
        <view class="danger-content">
            <view class="danger-desc">
                此处操作将直接影响数据库，请谨慎操作。
            </view>
            
            <button class="clear-btn" @click="handleClearHistory">
                🗑️ 物理清空本场景聊天记录
            </button>
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
import { DB } from '@/utils/db.js'; // 引入 DB 模块

const { isDarkMode, applyNativeTheme } = useTheme();

const isCustomMode = ref(false); 
const worldList = ref([]); 
const currentWorldLocations = ref([]); 

// 增加一个 ID 状态，用来判断是“新建”还是“编辑”
const editSceneId = ref(null); 

const form = ref({
  name: '',
  worldId: '',
  worldName: '', 
  locationName: '',
  background: '',
  playerIdentity: '',
  
  // ➕ 新增记忆配置 (默认值)
  historyLimit: 15, 
  enableSummary: true, 
  summaryFrequency: 10,
  summary: '' 
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

// --- 1. 初始化逻辑 ---
onLoad((options) => {
    applyNativeTheme();
    loadWorlds();
    loadContacts(); // 先加载所有联系人（未选中状态）

    if (options.id) {
        editSceneId.value = options.id;
        uni.setNavigationBarTitle({ title: '编辑场景' });
        loadSceneDataForEdit(options.id); // 回显数据
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
      initialState: '',
      sceneRole: '',
      reason: '' 
  }));
};

// --- 2. 回显逻辑 (编辑模式专用) ---
const loadSceneDataForEdit = (id) => {
    const allScenes = uni.getStorageSync('app_scene_list') || [];
    const target = allScenes.find(s => String(s.id) === String(id));
    
    if (target) {
        // A. 回显基础表单
        form.value = {
            name: target.name,
            worldId: target.worldId,
            worldName: target.worldName,
            locationName: target.locationName,
            background: target.background,
            playerIdentity: target.playerIdentity,

            // ➕ 回显记忆配置 (兼容旧数据)
            historyLimit: target.memorySettings?.historyLimit || 15,
            enableSummary: target.memorySettings?.enableSummary !== false, // 默认 true
            summaryFrequency: target.memorySettings?.summaryFrequency || 10,
            summary: target.summary || '' 
        };
        
        // 如果没有 worldId，说明是自由模式
        if (!target.worldId) {
            isCustomMode.value = true;
        } else {
            // 如果是世界观模式，需要手动触发一下联动，加载地点列表
            const world = worldList.value.find(w => w.id === target.worldId);
            if (world) {
                currentWorldLocations.value = world.locations || [];
            }
        }

        // B. 回显 NPC 选择状态
        if (target.npcs && Array.isArray(target.npcs)) {
            target.npcs.forEach(savedNpc => {
                const idx = contacts.value.findIndex(c => String(c.id) === String(savedNpc.id));
                if (idx !== -1) {
                    contacts.value[idx].selected = true;
                    // 回显具体的设定
                    contacts.value[idx].sceneRole = savedNpc.sceneRole || '';
                    contacts.value[idx].initialState = savedNpc.initialState || '';
                    contacts.value[idx].reason = savedNpc.reason || '';
                }
            });
            
            // 把选中的排到前面去，方便查看 (可选)
            contacts.value.sort((a, b) => (b.selected ? 1 : 0) - (a.selected ? 1 : 0));
        }
    }
};

// --- 3. 交互逻辑 ---
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

// --- 4. 保存逻辑 (区分新建/更新) ---
const saveScene = () => {
    if (!form.value.name) return uni.showToast({ title: '请输入场景名称', icon: 'none' });
    
    // 提取选中的 NPC
    const selectedNpcs = contacts.value.filter(c => c.selected).map(c => ({
        id: c.id,
        name: c.name,
        sceneRole: c.sceneRole,
        initialState: c.initialState,
        reason: c.reason,
        worldId: c.worldId, 
        occupation: c.occupation
    }));
    
    if (selectedNpcs.length === 0) return uni.showToast({ title: '请至少选择一个NPC', icon: 'none' });

    const list = uni.getStorageSync('app_scene_list') || [];

    // 📦 构造记忆配置对象
    const memorySettings = {
        historyLimit: form.value.historyLimit,
        enableSummary: form.value.enableSummary,
        summaryFrequency: form.value.summaryFrequency
    };

    if (editSceneId.value) {
        // 🔥 编辑模式：找到旧数据并更新
        const index = list.findIndex(s => String(s.id) === String(editSceneId.value));
        if (index !== -1) {
            list[index] = {
                ...list[index], 
                ...form.value,
                memorySettings, // 💾 保存记忆设置
                summary: form.value.summary, // 💾 保存摘要
                npcs: selectedNpcs,
                updateTime: Date.now()
            };
            uni.showToast({ title: '已更新设定', icon: 'success' });
        }
    } else {
        // 🔥 新建模式：Push 新数据
        const newScene = {
            id: 'scene_' + Date.now(),
            createTime: Date.now(),
            ...form.value, 
            memorySettings, // 💾 保存记忆设置
            summary: form.value.summary, // 💾 保存摘要
            npcs: selectedNpcs
        };
        list.unshift(newScene);
        uni.showToast({ title: '场景创建成功', icon: 'success' });
    }

    uni.setStorageSync('app_scene_list', list);
    setTimeout(() => uni.navigateBack(), 800);
};

// 5. 危险操作：物理清空
const handleClearHistory = () => {
    uni.showModal({
        title: '危险操作',
        content: '确定要永久清空本场景的所有聊天记录吗？\n此操作不可撤销，但场景设定和角色会保留。',
        confirmColor: '#ff4d4f',
        success: async (res) => {
            if (res.confirm && editSceneId.value) {
                try {
                    // 物理删除 messages 表中 chatId 等于当前 sceneId 的记录
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

const deleteScene = () => {
    uni.showModal({
        title: '删除场景',
        content: '确定要删除这个场景吗？所有记忆将丢失。',
        confirmColor: '#ff4d4f',
        success: (res) => {
            if (res.confirm) {
                const list = uni.getStorageSync('app_scene_list') || [];
                const newList = list.filter(s => String(s.id) !== String(editSceneId.value));
                uni.setStorageSync('app_scene_list', newList);
                
                // 还要记得清空消息记录
                 DB.execute(`DELETE FROM messages WHERE chatId = ?`, [String(editSceneId.value)]);
                
                uni.navigateBack({ delta: 2 }); // 回退两层，直接回列表
            }
        }
    });
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

/* 记忆框样式 */
.memory-box {
    border: 2rpx dashed #9b59b6;
    background-color: rgba(155, 89, 182, 0.05);
    color: var(--text-sub);
    line-height: 1.5;
}
.tip { font-size: 24rpx; color: var(--text-sub); margin-top: 10rpx; display: block; }

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

/* 危险区域样式 */
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

/* 底部按钮 */
.footer-btn-area { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 40rpx; background: var(--card-bg); box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); }
.save-btn { background: #007aff; color: #fff; border-radius: 40rpx; font-weight: bold; }
</style>