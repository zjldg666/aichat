<template>
  <view class="create-container" :class="{ 'dark-mode': isDarkMode }">
    

    <scroll-view scroll-y class="form-scroll">
      
      <view class="form-section">
        <view class="section-header" @click="toggleSection('basic')">
          <view class="section-title-wrapper">
            <view class="section-title">🏛️ 世界观基石</view>
            <text class="section-subtitle">场景名称与核心规则</text>
          </view>
          <text class="arrow-icon">{{ activeSections.basic ? '▼' : '▶' }}</text>
        </view>
        
        <view v-show="activeSections.basic" class="section-content">
          <view class="input-item">
            <text class="label">场景名称</text>
            <input class="input" v-model="form.name" placeholder="例如：赛博朋克·夜之城" />
          </view>
          
          <view class="textarea-item">
            <text class="label">背景描述 (System Prompt)</text>
            <textarea class="textarea large" v-model="form.description" maxlength="-1" placeholder="描述这里的环境、气氛、规则。AI将根据此设定进行演绎..." />
          </view>

          <view class="input-item">
            <text class="label">玩家初始身份</text>
            <input class="input" v-model="form.playerIdentity" placeholder="例如：刚入职的特工" />
          </view>

          <view class="ai-gen-box">
             <view class="gen-header">
                 <text class="gen-title">✨ AI 创世助手</text>
             </view>
             
             <view class="gen-settings">
                 <view class="setting-row">
                     <text class="set-label">生成 NPC 数量: <text class="set-val">{{ genConfig.npcCount }}</text></text>
                     <slider class="mini-slider" :value="genConfig.npcCount" min="1" max="10" step="1" activeColor="#007aff" block-size="16" @change="(e) => genConfig.npcCount = e.detail.value" />
                 </view>
                 <view class="setting-row">
                     <text class="set-label">生成 道具 数量: <text class="set-val">{{ genConfig.itemCount }}</text></text>
                     <slider class="mini-slider" :value="genConfig.itemCount" min="0" max="5" step="1" activeColor="#9b59b6" block-size="16" @change="(e) => genConfig.itemCount = e.detail.value" />
                 </view>
             </view>

             <button 
                class="gen-btn-full" 
                @click="generateScenarioDetails" 
                :disabled="isGenerating"
                :class="{ 'processing': isGenerating }"
             >
                 <text class="btn-icon">{{ isGenerating ? '⏳' : '🪄' }}</text>
                 <text>{{ isGenerating ? '正在构建世界...' : '开始生成' }}</text>
             </button>
             <view class="gen-tip">AI 将根据上方填写的背景，自动设计符合设定的角色与物品。</view>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-header" @click="toggleSection('npcs')">
          <view class="section-title-wrapper">
            <view class="section-title" style="color: #ff9f43;">👥 登场角色 (NPC)</view>
            <text class="section-subtitle">定义他们的性格与外貌</text>
          </view>
          <view class="mini-btn" @click.stop="addNPC">+ 添加角色</view>
        </view>

        <view v-show="activeSections.npcs" class="section-content">
          <view v-for="(npc, index) in form.npcs" :key="index" class="npc-card">
            <view class="npc-header" @click="npc.expanded = !npc.expanded">
              <view class="npc-header-left">
                  <text class="npc-tag">角色 #{{ index + 1 }}</text>
                  <text class="npc-name-preview" v-if="npc.name">{{ npc.name }} ({{ npc.role }})</text>
              </view>
              <text class="npc-arrow">{{ npc.expanded ? '▼' : '▶' }}</text>
            </view>

            <view v-show="npc.expanded" class="npc-body">
              <view class="input-row">
                <view class="col-4">
                  <text class="label-mini">名字</text>
                  <input class="input mini" v-model="npc.name" placeholder="老乔" />
                </view>
                <view class="col-4">
                  <text class="label-mini">身份/职业</text>
                  <input class="input mini" v-model="npc.role" placeholder="酒保" />
                </view>
                <view class="col-4">
                  <text class="label-mini">性别</text>
                  <input class="input mini" v-model="npc.gender" placeholder="男/女" />
                </view>
              </view>
              
              <view class="textarea-item">
                <text class="label-mini">性格与行为逻辑</text>
                <textarea class="textarea small" v-model="npc.desc" placeholder="核心性格、说话口癖、对玩家的态度..." maxlength="-1" />
              </view>

              <view class="textarea-item">
                <text class="label-mini">外貌描写 (Appearance)</text>
                <textarea class="textarea medium" v-model="npc.appearance" placeholder="发型发色、五官特征、身材、服装搭配..." maxlength="-1" />
              </view>

              <view class="del-btn" @click="removeNPC(index)" v-if="form.npcs.length > 1">删除此角色</view>
            </view>
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-header" @click="toggleSection('items')">
          <view class="section-title-wrapper">
            <view class="section-title" style="color: #9b59b6;">🎒 场景道具</view>
            <text class="section-subtitle">定义特殊物品的效果</text>
          </view>
          <view class="mini-btn purple" @click.stop="addItem">+ 添加道具</view>
        </view>

        <view v-show="activeSections.items" class="section-content">
          <view v-for="(item, index) in form.items" :key="'item-'+index" class="item-card">
             <view class="item-head">
               <text class="item-tag">道具 #{{index + 1}}</text>
               <text class="del-text" @click="removeItem(index)">移除</text>
             </view>
             <input class="input" v-model="item.name" placeholder="道具名 (如: 吐真剂)" />
             <textarea class="textarea small" v-model="item.effect" placeholder="使用效果：当玩家使用它时会发生什么..." />
          </view>
        </view>
      </view>

      <view class="form-section">
        <view class="section-header" @click="toggleSection('memory_enhance')">
          <view class="section-title-wrapper">
            <view class="section-title" style="color: #9b59b6;">🧠 记忆增强</view>
            <text class="section-subtitle">控制AI的即时记忆深度与总结能力</text>
          </view>
          <text class="arrow-icon">{{ activeSections.memory_enhance ? '▼' : '▶' }}</text>
        </view>

        <view v-show="activeSections.memory_enhance" class="section-content">
            <view class="input-item">
                <view class="slider-header"><text class="label">上下文深度 (History Limit): {{ form.historyLimit }}</text></view>
                <slider :value="form.historyLimit" min="10" max="60" step="5" show-value activeColor="#9b59b6" @change="(e) => form.historyLimit = e.detail.value" />
                <view class="tip">控制AI能“看到”的最近对话条数。</view>
            </view>

            <view class="input-item" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #eee; padding-top:20rpx; margin-top:20rpx;">
                <text class="label" style="margin-bottom:0;">开启滚动剧情总结</text>
                <switch :checked="form.enableSummary" @change="(e) => form.enableSummary = e.detail.value" color="#9b59b6"/>
            </view>

            <template v-if="form.enableSummary">
                <view class="input-item">
                    <view class="slider-header"><text class="label">总结频率: {{ form.summaryFrequency }}</text></view>
                    <slider :value="form.summaryFrequency" min="5" max="30" step="1" show-value activeColor="#9b59b6" @change="(e) => form.summaryFrequency = e.detail.value" />
                    <view class="tip">每隔多少句对话，AI 会自动整理一次剧情日志。</view>
                </view>
                
                <view class="textarea-item">
                    <view class="slider-header">
                        <text class="label">当前剧情日志 (Current Summary)</text>
                        <text class="tip" style="color:#9b59b6;" @click="form.summary = ''">清空</text>
                    </view>
                    <textarea class="textarea large memory-box" v-model="form.summary" maxlength="-1" placeholder="这里存储着 AI 的即时记忆..." />
                </view>
            </template>
        </view>
      </view>

      <view class="form-section">
        <view class="section-header" @click="toggleSection('memory_manage')">
          <view class="section-title-wrapper">
            <view class="section-title" style="color: #2ecc71;">📚 记忆与日志管理</view>
            <text class="section-subtitle">管理该场景的历史存档</text>
          </view>
          <text class="arrow-icon">{{ activeSections.memory_manage ? '▼' : '▶' }}</text>
        </view>

        <view v-show="activeSections.memory_manage" class="section-content">
           <view class="input-item" style="background:#e8f5e9; padding:15rpx; border-radius:12rpx;">
               <view class="slider-header">
                   <text class="label" style="color:#2e7d32; font-weight:bold;">🧠 最近印象: {{ form.activeMemorySessions }} 次</text>
               </view>
               <slider :value="form.activeMemorySessions" min="0" max="5" step="1" show-value activeColor="#2ecc71" @change="(e) => form.activeMemorySessions = e.detail.value" />
               <view class="tip" style="color:#666;">最近这几次游玩的详细剧情会<text style="font-weight:bold; color:#2e7d32">始终</text>包含在对话背景里。</view>
           </view>

           <view class="input-item" style="margin-top:20rpx; background:#f1f8e9; padding:15rpx; border-radius:12rpx;">
               <view class="slider-header">
                   <text class="label" style="color:#558b2f; font-weight:bold;">📚 往事检索范围: {{ form.diaryHistoryLimit }} 次</text>
               </view>
               <slider :value="form.diaryHistoryLimit" min="5" max="50" step="5" show-value activeColor="#558b2f" @change="(e) => form.diaryHistoryLimit = e.detail.value" />
               <view class="tip" style="color:#666;">AI 会在这个范围内的历史存档中搜索信息。</view>
           </view>

           <view class="diary-list" style="margin-top: 40rpx;">
               <text class="label" style="margin-bottom: 20rpx; display: block;">📜 剧情存档 ({{ diaryList.length }})</text>
               <view v-if="diaryList.length === 0" class="empty-tip">暂无存档。</view>
               <view v-for="(log, idx) in diaryList" :key="idx" 
                     class="diary-item" 
                     @click="log.expanded = !log.expanded" 
                     @longpress="handleDeleteLog(log, idx)">
                   <view class="diary-header">
                       <text class="diary-date">{{ log.dateStr }}</text>
                       <text class="diary-tag">Session</text>
                   </view>
                   <view class="diary-brief">{{ log.brief }}</view>
                   <view v-if="log.expanded" class="diary-detail">{{ log.detail }}</view>
                   <view v-else class="diary-expand-hint">▼ 点击展开</view>
               </view>
           </view>
        </view>
      </view>

      <view class="form-section" v-if="isEditMode">
        <view class="section-header" @click="toggleSection('danger')">
          <view class="section-title" style="color: #ff4757;">⚠️ 危险区域</view>
          <text class="arrow-icon">{{ activeSections.danger ? '▼' : '▶' }}</text>
        </view>
        <view v-show="activeSections.danger" class="section-content">
          <button class="clear-btn" @click="clearScenarioHistory">💥 清空剧情存档 & 重置状态</button>
        </view>
      </view>

      <view style="height: 200rpx;"></view>
    </scroll-view>

    <view class="bottom-area">
      <button class="save-btn" @click="handleSave" :loading="saving">{{ isEditMode ? '保存修改' : '创建世界' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { DB } from '@/utils/db.js';
import { useTheme } from '@/composables/useTheme.js';
import { LLM, getCurrentLlmConfig } from '@/services/llm.js';

const { isDarkMode, applyNativeTheme } = useTheme();
const saving = ref(false);
const isEditMode = ref(false);
const targetId = ref(null);
const diaryList = ref([]);
const isGenerating = ref(false);

// AI 生成配置 (新增)
const genConfig = reactive({
    npcCount: 3,
    itemCount: 3
});

// 折叠状态
const activeSections = ref({ 
    basic: true, npcs: true, items: false, 
    memory_enhance: false, memory_manage: false, danger: false 
});
const toggleSection = (key) => activeSections.value[key] = !activeSections.value[key];

// 表单数据
const form = reactive({
  name: '', 
  description: '', 
  playerIdentity: '',
  
  historyLimit: 20,
  enableSummary: true,
  summaryFrequency: 6,
  summary: '', 
  activeMemorySessions: 2, 
  diaryHistoryLimit: 20,   

  // NPC 结构简化：去掉 features 对象，增加 gender
  npcs: [
      { name: '', role: '', gender: '', desc: '', appearance: '', expanded: true }
  ],
  items: [
      { name: '', effect: '' }
  ]
});

// 初始化
onLoad(async (opts) => {
    applyNativeTheme();
    if (opts.id) {
        isEditMode.value = true;
        targetId.value = opts.id;
        uni.setNavigationBarTitle({ title: '编辑剧本' });
        await loadScenarioData(opts.id);
        await loadScenarioLogs(opts.id);
    }
});

// ===================== ✨ AI 生成逻辑 (强化版) =====================
// ===================== ✨ AI 生成逻辑 (修复版) =====================
const generateScenarioDetails = async () => {
    if (!form.name || !form.description) {
        return uni.showToast({ title: '请先填写场景名称和背景描述', icon: 'none' });
    }

    const config = getCurrentLlmConfig();
    if (!config || !config.apiKey) {
        return uni.showToast({ title: '请先在"我的"页面配置 AI 模型', icon: 'none' });
    }

    isGenerating.value = true;
    uni.showLoading({ title: 'AI 正在创世...' });

    try {
        // 1. 优化 Prompt：强调“纯文本”，减少 Markdown 干扰，限制字数防止截断
        const prompt = `
你是一个游戏数据生成器。请根据设定生成数据。

【场景】: ${form.name}
【描述】: ${form.description}
【玩家】: ${form.playerIdentity || "未知"}
【数量】: NPC ${genConfig.npcCount}人, 道具 ${genConfig.itemCount}个。

【要求】
1. **NPC外貌**: 必须细致描写（发型、五官、身材、衣着）。
2. **NPC性格**: 包含核心欲望和对玩家态度。
3. **格式**: 必须返回 **纯 JSON 字符串**。
4. **严禁**: 不要包含 \`\`\`json\`\`\` 标记，不要包含任何“好的”、“如下”等废话。直接以 { 开始，以 } 结束。

【JSON结构】:
{
  "npcs": [
    { 
      "name": "名字", 
      "role": "身份", 
      "gender": "男/女", 
      "desc": "性格描述(30字内)", 
      "appearance": "外貌描述(50字内)" 
    }
  ],
  "items": [
    { "name": "道具名", "effect": "效果(20字内)" }
  ]
}
`;
        const response = await LLM.chat({
            config,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, //稍微降低温度，让格式更稳定
            jsonMode: true 
        });

        console.log("🤖 AI原始回复:", response); // 方便调试

        // 2. 强力清洗逻辑 (关键修改)
        let jsonStr = response;
        
        // A. 移除 markdown 代码块标记
        jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '');
        
        // B. 寻找 JSON 的首尾 (防止 AI 在前后加废话)
        const firstOpen = jsonStr.indexOf('{');
        const lastClose = jsonStr.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
        } else {
            throw new Error("未找到有效的 JSON 对象");
        }

        // 3. 尝试解析
        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (parseErr) {
            console.error("JSON 解析失败，尝试修复...", parseErr);
            // 最后的挣扎：如果 AI 没写完，尝试补一个 }
            try {
                data = JSON.parse(jsonStr + "}");
            } catch (e) {
                throw new Error("数据格式错误，请重试");
            }
        }

        // 4. 数据填充 (保持不变)
        if (data.npcs && Array.isArray(data.npcs)) {
            if(form.npcs.length === 1 && !form.npcs[0].name) {
                form.npcs = data.npcs.map(n => ({...n, expanded: false}));
            } else {
                form.npcs = [...form.npcs, ...data.npcs.map(n => ({...n, expanded: false}))];
            }
            if(form.npcs.length > 0) form.npcs[form.npcs.length - data.npcs.length].expanded = true;
        }

        if (data.items && Array.isArray(data.items)) {
            if(form.items.length === 1 && !form.items[0].name) {
                form.items = data.items;
            } else {
                form.items = [...form.items, ...data.items];
            }
        }

        uni.showToast({ title: '构建完成', icon: 'success' });
        activeSections.value.npcs = true;
        activeSections.value.items = true;

    } catch (e) {
        console.error("AI 生成逻辑出错:", e);
        uni.showModal({
            title: '生成失败',
            content: 'AI 返回的数据格式有误。\n原因: ' + e.message,
            showCancel: false
        });
    } finally {
        isGenerating.value = false;
        uni.hideLoading();
    }
};
// ==========================================================

// 加载数据
const loadScenarioData = async (id) => {
    try {
        const res = await DB.select(`SELECT * FROM scenarios WHERE id = '${id}'`);
        if (res && res.length > 0) {
            const data = res[0];
            form.name = data.name;
            form.description = data.description;
            
            try { 
                const playerSetup = JSON.parse(data.player_setup);
                form.playerIdentity = playerSetup.identity || '';
                if (playerSetup.historyLimit !== undefined) form.historyLimit = playerSetup.historyLimit;
                if (playerSetup.enableSummary !== undefined) form.enableSummary = playerSetup.enableSummary;
                if (playerSetup.summaryFrequency !== undefined) form.summaryFrequency = playerSetup.summaryFrequency;
                if (playerSetup.summary) form.summary = playerSetup.summary;
                if (playerSetup.activeMemorySessions !== undefined) form.activeMemorySessions = playerSetup.activeMemorySessions;
                if (playerSetup.diaryHistoryLimit !== undefined) form.diaryHistoryLimit = playerSetup.diaryHistoryLimit;
            } catch(e){}

            try { 
                form.npcs = JSON.parse(data.npcs).map(n => ({ ...n, expanded: false })); 
            } catch(e) { form.npcs = []; }

            try { 
                form.items = JSON.parse(data.items); 
            } catch(e) { form.items = []; }
        }
    } catch (e) { console.error(e); }
};

const loadScenarioLogs = async (id) => {
    try {
        const logs = await DB.select(`SELECT * FROM diaries WHERE roleId = '${id}' ORDER BY id DESC`);
        diaryList.value = logs.map(l => ({ ...l, expanded: false }));
    } catch(e) { console.error(e); }
};

const goBack = () => uni.navigateBack();
const addNPC = () => form.npcs.push({ name: '', role: '', gender: '', desc: '', appearance: '', expanded: true });
const removeNPC = (i) => { if(form.npcs.length > 1) form.npcs.splice(i, 1); };
const addItem = () => form.items.push({ name: '', effect: '' });
const removeItem = (i) => form.items.splice(i, 1);

const handleSave = async () => {
    if (!form.name) return uni.showToast({ title: '请输入场景名称', icon: 'none' });
    
    saving.value = true;
    try {
        const id = isEditMode.value ? targetId.value : ('scn_' + Date.now());
        const createdTime = Date.now();
        
        const npcsJson = JSON.stringify(form.npcs);
        const itemsJson = JSON.stringify(form.items);
        const playerSetupJson = JSON.stringify({ 
            identity: form.playerIdentity,
            historyLimit: form.historyLimit,
            enableSummary: form.enableSummary,
            summaryFrequency: form.summaryFrequency,
            summary: form.summary,
            activeMemorySessions: form.activeMemorySessions,
            diaryHistoryLimit: form.diaryHistoryLimit
        });

        if (isEditMode.value) {
            await DB.execute(
                `UPDATE scenarios SET name=?, description=?, npcs=?, items=?, player_setup=? WHERE id=?`,
                [form.name, form.description, npcsJson, itemsJson, playerSetupJson, id]
            );
            uni.showToast({ title: '修改已保存', icon: 'success' });
        } else {
            await DB.execute(
                `INSERT INTO scenarios (id, name, description, npcs, items, player_setup, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, form.name, form.description, npcsJson, itemsJson, playerSetupJson, createdTime]
            );
            uni.showToast({ title: '创建成功', icon: 'success' });
        }
        
        setTimeout(() => uni.navigateBack(), 800);
    } catch(e) {
        console.error(e);
        saving.value = false;
        uni.showToast({ title: '保存失败', icon: 'none' });
    }
};

const handleDeleteLog = (log, index) => {
    uni.vibrateShort();
    uni.showModal({
        title: '删除存档',
        content: `确定要删除这条剧情记录吗？\n"${log.brief}"`,
        confirmColor: '#ff4757',
        success: async (res) => {
            if (res.confirm) {
                await DB.execute(`DELETE FROM diaries WHERE id = ?`, [log.id]);
                diaryList.value.splice(index, 1);
                uni.showToast({ title: '已删除', icon: 'success' });
            }
        }
    });
};

const clearScenarioHistory = () => {
    uni.showModal({
        title: '彻底重置',
        content: '这将清空本场景的所有剧情存档、聊天记录以及当前状态，且无法恢复。确定吗？',
        confirmColor: '#ff4757',
        success: async (res) => {
            if (res.confirm && targetId.value) {
                try {
                    await DB.execute(`DELETE FROM diaries WHERE roleId = ?`, [targetId.value]);
                    form.summary = "";
                    diaryList.value = [];
                    await handleSave();
                    uni.showToast({ title: '重置成功', icon: 'success' });
                } catch(e) { console.error(e); }
            }
        }
    });
};
</script>

<style lang="scss">
/* 通用样式 */
.create-container { 
    height: 100vh; display: flex; flex-direction: column; background-color: var(--bg-color); 
    --bg-color: #f5f7fa; --card-bg: #ffffff; --text-main: #333; --text-sub: #999;
    --tool-bg: #f0f2f5;
}
.create-container.dark-mode { 
    --bg-color: #0d0d0d; --card-bg: #1a1a1a; --text-main: #eee; --text-sub: #666; 
    --tool-bg: #252525;
}

.nav-bar {
    padding: 100rpx 30rpx 30rpx; display: flex; align-items: center; justify-content: space-between;
    background: var(--bg-color);
    .back-btn { font-size: 48rpx; color: var(--text-main); padding: 10rpx; }
    .nav-title { font-size: 36rpx; font-weight: bold; color: var(--text-main); }
    .nav-placeholder { width: 60rpx; }
}

.form-scroll { flex: 1; height: 0; width: 100%; }

.form-section { 
    background-color: var(--card-bg); margin-top: 24rpx; 
    border-top: 1px solid rgba(0,0,0,0.05); border-bottom: 1px solid rgba(0,0,0,0.05);
}

.section-header { 
    padding: 30rpx; display: flex; justify-content: space-between; align-items: center; 
}
.section-title { font-size: 32rpx; font-weight: bold; color: var(--text-main); border-left: 8rpx solid #007aff; padding-left: 20rpx; }
.section-subtitle { font-size: 22rpx; color: var(--text-sub); margin-left: 28rpx; margin-top: 8rpx; }
.arrow-icon { color: var(--text-sub); opacity: 0.5; }

.section-content { padding: 30rpx; background-color: var(--card-bg); animation: slideDown 0.2s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10rpx); } to { opacity: 1; transform: translateY(0); } }

/* AI 生成框 */
.ai-gen-box {
    margin-top: 30rpx; padding: 30rpx; 
    background: linear-gradient(135deg, rgba(0,122,255,0.08) 0%, rgba(155,89,182,0.08) 100%);
    border-radius: 20rpx; border: 1px solid rgba(0,122,255,0.15);
}
.gen-header { margin-bottom: 20rpx; text-align: center; }
.gen-title { font-size: 28rpx; font-weight: bold; color: #007aff; }

.gen-settings { 
    background: rgba(255,255,255,0.5); padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; 
}
.setting-row { 
    display: flex; align-items: center; margin-bottom: 12rpx;
    &:last-child { margin-bottom: 0; }
}
.set-label { font-size: 24rpx; color: var(--text-main); width: 220rpx; }
.set-val { font-weight: bold; color: #007aff; margin-left: 8rpx; }
.mini-slider { flex: 1; margin: 0 10rpx; }

.gen-btn-full {
    background: linear-gradient(90deg, #007aff, #0056d2); color: #fff; font-size: 30rpx; font-weight: bold;
    border-radius: 50rpx; display: flex; align-items: center; justify-content: center; height: 88rpx;
    box-shadow: 0 6rpx 16rpx rgba(0,122,255,0.3); transition: transform 0.2s;
}
.gen-btn-full:active { transform: scale(0.98); }
.gen-btn-full.processing { opacity: 0.7; pointer-events: none; }
.btn-icon { margin-right: 12rpx; font-size: 36rpx; }
.gen-tip { font-size: 22rpx; color: var(--text-sub); text-align: center; margin-top: 20rpx; opacity: 0.8; }

/* 输入框 */
.input-item, .textarea-item { margin-bottom: 30rpx; }
.label { display: block; font-size: 28rpx; color: var(--text-sub); margin-bottom: 16rpx; }
.input { background: rgba(128,128,128,0.1); height: 80rpx; padding: 0 20rpx; border-radius: 12rpx; font-size: 30rpx; color: var(--text-main); }
.textarea { background: rgba(128,128,128,0.1); width: 100%; padding: 20rpx; border-radius: 12rpx; font-size: 30rpx; color: var(--text-main); box-sizing: border-box; height: 160rpx; }
.textarea.large { height: 240rpx; }
.textarea.small { height: 120rpx; }
.textarea.medium { height: 180rpx; }
.memory-box { border: 1px dashed #9b59b6; background: rgba(155,89,182,0.05); color: var(--text-sub); line-height: 1.6; }

/* NPC 卡片 */
.npc-card { 
    background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); border-radius: 16rpx; margin-bottom: 24rpx; overflow: hidden;
}
.npc-header { 
    padding: 20rpx; background: rgba(0,122,255,0.05); display: flex; justify-content: space-between; align-items: center;
    .npc-tag { font-size: 24rpx; font-weight: bold; color: #007aff; }
    .npc-header-left { display: flex; flex-direction: column; }
    .npc-name-preview { font-size: 26rpx; color: var(--text-main); font-weight: bold; margin-top: 4rpx; }
    .npc-arrow { font-size: 20rpx; color: #007aff; }
}
.npc-body { padding: 20rpx; }

.input-row { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.col-4 { width: 33.33%; }
.label-mini { font-size: 22rpx; color: var(--text-sub); margin-bottom: 8rpx; display: block; }
.input.mini { height: 64rpx; font-size: 26rpx; }

.del-btn { text-align: center; color: #ff4757; font-size: 24rpx; padding: 10rpx; margin-top: 10rpx; }

/* 道具样式 */
.mini-btn { font-size: 24rpx; color: #007aff; background: rgba(0,122,255,0.1); padding: 6rpx 16rpx; border-radius: 20rpx; }
.mini-btn.purple { color: #9b59b6; background: rgba(155,89,182,0.1); }
.item-card { 
    background: rgba(0,0,0,0.02); padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; border-left: 4rpx solid #9b59b6; 
}
.item-head { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.item-tag { font-size: 22rpx; color: #9b59b6; font-weight: bold; }
.del-text { font-size: 22rpx; color: #ff4757; }

/* 日志样式 */
.diary-list { margin-top: 20rpx; }
.empty-tip { text-align: center; font-size: 24rpx; color: var(--text-sub); padding: 20rpx; }
.diary-item { 
    background: rgba(0,0,0,0.02); padding: 20rpx; border-radius: 12rpx; margin-bottom: 16rpx; 
    border: 1px solid rgba(0,0,0,0.05);
}
.diary-header { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.diary-date { font-size: 22rpx; color: var(--text-sub); }
.diary-tag { font-size: 20rpx; background: rgba(46,204,113,0.1); color: #2ecc71; padding: 2rpx 8rpx; border-radius: 6rpx; }
.diary-brief { font-size: 26rpx; font-weight: bold; color: var(--text-main); }
.diary-detail { font-size: 24rpx; color: var(--text-sub); margin-top: 12rpx; line-height: 1.5; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 12rpx; }
.diary-expand-hint { text-align: center; font-size: 20rpx; color: #ccc; margin-top: 8rpx; }

/* 辅助组件 */
.slider-header { display: flex; justify-content: space-between; align-items: center; }
.tip { font-size: 22rpx; color: var(--text-sub); margin-top: 8rpx; }

/* 底部按钮 */
.bottom-area { 
    padding: 20rpx 30rpx; background-color: var(--card-bg); border-top: 1px solid rgba(0,0,0,0.05);
    padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}
.save-btn { background-color: #007aff; color: #fff; border-radius: 40rpx; font-size: 32rpx; }
.clear-btn { background: rgba(255,71,87,0.1); color: #ff4757; font-size: 30rpx; border: 1px solid #ff4757; width: 100%; }
</style>