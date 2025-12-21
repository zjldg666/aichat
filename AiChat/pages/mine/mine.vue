<template>
  <view class="mine-container">
    <view class="user-section">
      <view class="avatar-wrapper" @click="goToEdit">
        <image class="avatar" :src="userInfo.avatar" mode="aspectFill"></image>
        <view class="edit-badge">✏️</view>
      </view>
      <view class="info-wrapper" @click="goToEdit">
        <text class="label">我的昵称</text>
        <view class="name-display">{{ userInfo.name }} <text class="edit-hint">(点击编辑资料)</text></view>
      </view>
      <view class="gallery-btn" @click="goToGallery">
        <text class="gallery-icon">🖼️</text>
        <text class="gallery-text">我的相册</text>
      </view>
    </view>

    <view class="setting-group">
      <view class="group-header" @click="toggleSection('chat')">
        <view class="group-title-wrapper">
          <view class="group-title">对话模型 (LLM)</view>
          <text class="group-subtitle">
            当前使用: {{ currentLlmScheme ? currentLlmScheme.name : '未选择' }}
          </text>
        </view>
        <text class="arrow-icon">{{ activeSections.chat ? '▼' : '▶' }}</text>
      </view>

      <view v-show="activeSections.chat" class="group-content">
        <view class="scheme-list">
          <view 
            v-for="(scheme, index) in llmSchemes" 
            :key="scheme.id" 
            class="scheme-card"
            :class="{ 'is-active': currentSchemeIndex === index }"
          >
            <view class="scheme-card-header" @click="toggleSchemeExpand(index)">
               <view class="radio-area" @click.stop="selectScheme(index)">
                  <view class="radio-circle">
                      <view v-if="currentSchemeIndex === index" class="radio-inner"></view>
                  </view>
               </view>
               <view class="scheme-info">
                   <text class="scheme-name">{{ scheme.name }}</text>
                   <text class="scheme-desc">{{ scheme.model || '未设置模型' }}</text>
               </view>
               <text class="expand-icon">{{ scheme.isExpanded ? '▲' : '▼' }}</text>
            </view>

            <view v-if="scheme.isExpanded" class="scheme-card-body">
                <view class="setting-item">
                  <view class="item-label">方案名称</view>
                  <input class="item-input" type="text" v-model="scheme.name" placeholder="方案别名" />
                </view>
                
                <view class="setting-item">
                  <view class="item-label">厂商预设</view>
                  <picker mode="selector" :range="LLM_PROVIDERS" range-key="label" @change="(e) => handleProviderChange(e, index)">
                      <view class="picker-val">{{ getProviderLabel(scheme.provider) }} ▾</view>
                  </picker>
                </view>

                <view class="setting-item">
                  <view class="item-label">接口地址</view>
                  <input class="item-input" type="text" v-model="scheme.baseUrl" placeholder="https://..." />
                </view>
                
                <view class="setting-item">
                                  <view class="item-label">API Key</view>
                                  <input 
                                    class="item-input" 
                                    type="text" 
                                    password 
                                    v-model="scheme.apiKey" 
                                    placeholder="在此粘贴 Key" 
                                  />
                                  <view 
                                    v-if="scheme.provider === 'siliconflow'" 
                                    class="input-suffix-link" 
                                    @click.stop="openSiliconFlowLink"
                                  >
                                    去官网申请 🔗
                                  </view>
                                </view>
                
                <view class="setting-item">
                  <view class="item-label">模型名称</view>
                  <view class="model-input-group">
                      <input 
                        class="item-input model-manual-input" 
                        type="text" 
                        v-model="scheme.model" 
                        placeholder="输入或刷新获取" 
                      />
                      <view class="icon-btn" @click="fetchModels(index)">🔄</view>
                  </view>
                </view>
                
                <view v-if="tempModelList.length > 0 && activeFetchIndex === index" class="model-select-area">
                    <view class="model-tag-title">点击选择模型:</view>
                    <view class="model-tags">
                        <view 
                            v-for="m in tempModelList" 
                            :key="m" 
                            class="model-tag" 
                            @click="applyModel(index, m)"
                        >
                            {{ m }}
                        </view>
                    </view>
                </view>

                <view class="setting-item-col">
                  <view class="item-header">
                    <text class="item-label">记忆深度</text>
                    <text class="item-value">{{ scheme.historyLimit }} 条</text>
                  </view>
                  <slider :value="scheme.historyLimit" min="0" max="60" step="2" activeColor="#007aff" @change="(e) => scheme.historyLimit = e.detail.value" />
                </view>
                
                <view class="card-footer">
                    <view class="delete-text" @click="deleteScheme(index)" v-if="llmSchemes.length > 1">删除此方案</view>
                </view>
            </view>
          </view>
        </view>

        <button class="add-scheme-btn" @click="createNewScheme">➕ 添加新方案 API</button>
      </view>
    </view>

    <view class="setting-group">
      <view class="group-header" @click="toggleSection('image')">
        <view class="group-title-wrapper">
          <view class="group-title" style="color: #ff9f43;">绘图设置 (Image Gen)</view>
          <text class="group-subtitle">{{ currentProviderLabel }} / {{ currentStyleLabel }}</text>
        </view>
        <text class="arrow-icon">{{ activeSections.image ? '▼' : '▶' }}</text>
      </view>
      
      <view v-show="activeSections.image" class="group-content">
        <view class="setting-item">
          <view class="item-label">接口类型</view>
          <picker mode="selector" :range="['Google Gemini', 'OpenAI', '自建 ComfyUI (Cloudflare)']" :value="imageConfigIndex" @change="handleTypeChange">
              <view class="picker-val">{{ currentProviderLabel }} ▾</view>
          </picker>
        </view>

        <template v-if="imageConfig.provider === 'gemini'">
            <view class="setting-tip">Key 留空则自动使用上方对话 Key。</view>
            <view class="setting-item">
              <view class="item-label">接口地址</view>
              <input class="item-input" type="text" v-model="imageConfig.baseUrl" placeholder="https://generativelanguage.googleapis.com" />
            </view>
            <view class="setting-item">
              <view class="item-label">画图 Key</view>
              <input class="item-input" type="text" password v-model="imageConfig.apiKey" placeholder="同上则留空" />
            </view>
            <view class="setting-item">
              <view class="item-label">模型名称</view>
              <input class="item-input" type="text" v-model="imageConfig.model" placeholder="例如 gemini-2.0-flash-exp" />
            </view>
        </template>

        <template v-else-if="imageConfig.provider === 'openai'">
            <view class="setting-item">
              <view class="item-label">接口地址</view>
              <input class="item-input" type="text" v-model="imageConfig.baseUrl" placeholder="https://api.openai.com/v1" />
            </view>
            <view class="setting-item">
              <view class="item-label">API Key</view>
              <input class="item-input" type="text" password v-model="imageConfig.apiKey" placeholder="sk-..." />
            </view>
            <view class="setting-item">
              <view class="item-label">模型名称</view>
              <input class="item-input" type="text" v-model="imageConfig.model" placeholder="例如 dall-e-3" />
            </view>
        </template>

        <template v-else-if="imageConfig.provider === 'comfyui'">
            <view class="setting-tip">填写 Cloudflare Tunnel 公网地址。</view>
            <view class="setting-item">
              <view class="item-label">公网地址</view>
              <input class="item-input" type="text" v-model="imageConfig.baseUrl" placeholder="https://..." />
            </view>
        </template>

        <view class="sub-section-title">🎨 画风选择 (Style)</view>
        <view class="style-grid">
            <view 
                class="style-card" 
                v-for="(style, index) in DRAWING_STYLES" 
                :key="index"
                :class="{ 'active': imageConfig.style === style.value || (style.value === 'custom' && !isPresetStyle(imageConfig.style)) }"
                @click="handleStyleSelect(style)"
            >
                <text class="style-emoji">{{ style.emoji }}</text>
                <text class="style-name">{{ style.label }}</text>
            </view>
        </view>
      </view>
    </view>
    
    <view class="setting-group">
      <view class="group-header" @click="toggleSection('world')">
        <view class="group-title-wrapper">
          <view class="group-title" style="color: #9c27b0;">世界观设定 (World)</view>
          <text class="group-subtitle">已创建 {{ worldSettings.length }} 个世界</text>
        </view>
        <text class="arrow-icon">{{ activeSections.world ? '▼' : '▶' }}</text>
      </view>

      <view v-show="activeSections.world" class="group-content">
        <view class="setting-tip">在此预设世界观，创建角色时可直接调用场景和职业。</view>
        <view v-for="(world, index) in worldSettings" :key="world.id" class="world-card">
          <view class="world-header" @click.stop="toggleWorldItem(index)">
            <text class="world-name">{{ world.name || '未命名世界' }}</text>
            <view class="world-actions">
              <text class="toggle-icon">{{ world.isOpen ? '收起' : '展开' }}</text>
              <text class="delete-icon" @click.stop="deleteWorld(index)">🗑️</text>
            </view>
          </view>
          <view v-show="world.isOpen" class="world-body">
             <view class="setting-item">
               <view class="item-label">世界名称</view>
               <input class="item-input" type="text" v-model="world.name" placeholder="例如：赛博朋克2077" />
             </view>
             <view class="sub-section">
               <view class="sub-title">📍 场景/地点</view>
               <view class="tag-container">
                 <view v-for="(loc, locIdx) in world.locations" :key="locIdx" class="tag-item">
                   {{ loc }}
                   <text class="tag-close" @click="removeLocation(index, locIdx)">×</text>
                 </view>
               </view>
               <view class="add-row">
                 <input class="mini-input" v-model="world.tempLoc" placeholder="输入地点" />
                 <view class="mini-btn" @click="addLocation(index)">添加</view>
               </view>
             </view>
             <view class="sub-section">
               <view class="sub-title">💼 职业/身份</view>
               <view class="tag-container">
                 <view v-for="(job, jobIdx) in world.occupations" :key="jobIdx" class="tag-item job-tag">
                   {{ job }}
                   <text class="tag-close" @click="removeOccupation(index, jobIdx)">×</text>
                 </view>
               </view>
               <view class="add-row">
                 <input class="mini-input" v-model="world.tempJob" placeholder="输入职业" />
                 <view class="mini-btn" @click="addOccupation(index)">添加</view>
               </view>
             </view>
          </view>
        </view>
        <button class="add-world-btn" @click="addNewWorld">+ 新建世界观</button>
      </view>
    </view>
    
    <view class="action-area">
         <button class="save-btn" @click="saveAllConfig">保存所有配置</button>
    </view>

    <CustomTabBar :current="1" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import CustomTabBar from '@/components/CustomTabBar.vue';

// =========================================================================
// 静态常量
// =========================================================================

const LLM_PROVIDERS = [
    // 1. Gemini: 使用你提供的官方 OpenAI 兼容 Chat 地址作为默认 BaseUrl
    { label: 'Google Gemini', value: 'gemini', defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
    // 2. 豆包 (火山引擎)
    { label: '火山引擎 (豆包)', value: 'volcengine', defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
    // 3. 硅基流动
    { label: '硅基流动 (SiliconFlow)', value: 'siliconflow', defaultUrl: 'https://api.siliconflow.cn/v1' },
    // 4. OpenAI / 自定义
    { label: 'OpenAI (自定义)', value: 'openai', defaultUrl: 'https://api.openai.com/v1' }
];

const DRAWING_STYLES = [
    { label: '标准日漫', value: 'anime', emoji: '📺' },
    { label: '厚涂风格', value: 'impasto', emoji: '🖌️' },
    { label: '90年代复古', value: 'retro', emoji: '📼' },
    { label: '新海诚风', value: 'shinkai', emoji: '☁️' },
    { label: '吉卜力', value: 'ghibli', emoji: '🧙‍♀️' }, // 👈 修改
    { label: '古风仙侠', value: 'gufeng', emoji: '🎐' }, // 👈 修改
    { label: '水彩柔和', value: 'pastel', emoji: '🌸' },
    { label: '黑白线稿', value: 'sketch', emoji: '✏️' },
    { label: '✨ 自定义', value: 'custom', emoji: '✏️' } // 👈 新增自定义入口
];

// =========================================================================
// 状态变量
// =========================================================================

const userInfo = ref({ name: '我', avatar: '/static/user-avatar.png' });
const activeSections = ref({ chat: false, image: false, world: false });

const llmSchemes = ref([]);            
const currentSchemeIndex = ref(0);    
const tempModelList = ref([]);
const activeFetchIndex = ref(-1);

const imageConfig = ref({
  provider: 'gemini', 
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: '',
  model: '',
  style: 'anime'
});

const worldSettings = ref([]);

// =========================================================================
// 计算属性
// =========================================================================

const currentLlmScheme = computed(() => {
    if (llmSchemes.value.length === 0) return null;
    return llmSchemes.value[currentSchemeIndex.value];
});

const imageConfigIndex = computed(() => {
    if (imageConfig.value.provider === 'openai') return 1;
    if (imageConfig.value.provider === 'comfyui') return 2;
    return 0; 
});

const currentProviderLabel = computed(() => {
    if (imageConfig.value.provider === 'openai') return 'OpenAI';
    if (imageConfig.value.provider === 'comfyui') return 'ComfyUI';
    return 'Gemini';
});

// 辅助函数：判断当前 style 是否在预设列表中
const isPresetStyle = (val) => {
    return DRAWING_STYLES.some(s => s.value === val && s.value !== 'custom');
};

const currentStyleLabel = computed(() => {
    const target = DRAWING_STYLES.find(s => s.value === imageConfig.value.style);
    // 如果找到了预设值，且不是 custom，显示预设 label
    if (target && target.value !== 'custom') return target.label;
    // 否则直接显示 style 的值（即用户的自定义输入），如果没值显示“自定义”
    return imageConfig.value.style || '自定义';
});

// =========================================================================
// 生命周期
// =========================================================================

onShow(() => {
  const storedUser = uni.getStorageSync('app_user_info');
  if (storedUser) userInfo.value = storedUser;

  const storedSchemes = uni.getStorageSync('app_llm_schemes');
  const storedIndex = uni.getStorageSync('app_current_scheme_index');
  
  if (storedSchemes && Array.isArray(storedSchemes) && storedSchemes.length > 0) {
      llmSchemes.value = storedSchemes.map(s => ({ ...s, isExpanded: false }));
      currentSchemeIndex.value = (storedIndex !== undefined && storedIndex < storedSchemes.length) ? storedIndex : 0;
  } else {
      createNewScheme(true);
  }

  const storedImgConfig = uni.getStorageSync('app_image_config');
  if (storedImgConfig) imageConfig.value = { ...imageConfig.value, ...storedImgConfig };
  
  const storedWorlds = uni.getStorageSync('app_world_settings');
  if (storedWorlds && Array.isArray(storedWorlds)) {
      worldSettings.value = storedWorlds.map(w => ({ ...w, isOpen: false, tempLoc: '', tempJob: '' }));
  }
});

// =========================================================================
// 方法
// =========================================================================

const toggleSection = (key) => { activeSections.value[key] = !activeSections.value[key]; };
const goToEdit = () => { uni.navigateTo({ url: '/pages/mine/edit-profile' }); };
const goToGallery = () => { uni.navigateTo({ url: '/pages/mine/gallery' }); };

// --- 处理画风选择 ---
const handleStyleSelect = (styleItem) => {
    if (styleItem.value === 'custom') {
        // 如果点击的是自定义，弹出输入框
        // 如果当前已经是自定义的值，则把它作为默认值显示
        let currentVal = isPresetStyle(imageConfig.value.style) ? '' : imageConfig.value.style;
        
        uni.showModal({
            title: '自定义画风 Prompt',
            content: currentVal, // 小程序真机上 editable:true 时 content 会作为初始值
            editable: true,
            placeholderText: '例: cyberpunk, watercolor, pixel art...',
            success: (res) => {
                if (res.confirm) {
                    const inputVal = res.content.trim();
                    if (inputVal) {
                        imageConfig.value.style = inputVal;
                        // 顺手保存一下，防止没点保存就退出了
                        uni.setStorageSync('app_image_config', imageConfig.value);
                    }
                }
            }
        });
    } else {
        // 预设画风，直接应用
        imageConfig.value.style = styleItem.value;
    }
};

// --- LLM 方案管理 ---

const createNewScheme = (isInit = false) => {
    const newScheme = {
        id: Date.now(),
        name: isInit ? '默认方案' : `方案 ${llmSchemes.value.length + 1}`,
        provider: 'gemini', 
        // 默认使用 Gemini 的 OpenAI 兼容地址
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: '',
        model: '', 
        historyLimit: 20,
        isExpanded: true 
    };
    if (!isInit) llmSchemes.value.forEach(s => s.isExpanded = false);
    llmSchemes.value.push(newScheme);
    if (isInit) currentSchemeIndex.value = 0;
};

const selectScheme = (index) => {
    currentSchemeIndex.value = index;
};

const toggleSchemeExpand = (index) => {
    llmSchemes.value[index].isExpanded = !llmSchemes.value[index].isExpanded;
    tempModelList.value = [];
    activeFetchIndex.value = -1;
};

const deleteScheme = (index) => {
    uni.showModal({
        title: '确认删除', content: '确定要删除这个API方案吗？',
        success: (res) => {
            if (res.confirm) {
                llmSchemes.value.splice(index, 1);
                if (index === currentSchemeIndex.value || currentSchemeIndex.value >= llmSchemes.value.length) {
                    currentSchemeIndex.value = 0;
                }
                if (llmSchemes.value.length === 0) createNewScheme(true);
            }
        }
    });
};

const handleProviderChange = (e, index) => {
    const selectedIdx = e.detail.value;
    const selected = LLM_PROVIDERS[selectedIdx];
    const scheme = llmSchemes.value[index];
    scheme.provider = selected.value;
    scheme.baseUrl = selected.defaultUrl;
    scheme.model = '';
    tempModelList.value = [];
};

const getProviderLabel = (val) => {
    const f = LLM_PROVIDERS.find(p => p.value === val);
    return f ? f.label : val;
};

// =========================================================================
// [核心修改] 获取模型列表逻辑
// =========================================================================
const fetchModels = (index) => {
    const scheme = llmSchemes.value[index];
    if (!scheme.apiKey) {
        uni.showToast({ title: '请先填写 API Key', icon: 'none' });
        return;
    }
    
    uni.showLoading({ title: '获取中...', mask: true });

    let requestUrl = '';
    let method = 'GET';
    let header = { 'Authorization': `Bearer ${scheme.apiKey}` };
    
    // --- 针对 Gemini 的特殊处理 ---
    // Gemini 的 OpenAI 兼容接口 (/v1beta/openai/models) 有时不稳定或返回 404
    // 策略：获取列表时使用【Google 原生接口】，聊天时继续使用【OpenAI 兼容接口】
    if (scheme.provider === 'gemini') {
        // 原生列表接口：https://generativelanguage.googleapis.com/v1beta/models?key=API_KEY
        // 注意：这里我们使用 'key' 参数鉴权，而不是 Authorization header，这是 Google 原生的推荐方式，但 header 也可以
        // 为了稳妥，我们直接访问根路径的 /models
        requestUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${scheme.apiKey}`;
        // 对于原生接口，通常不需要 Bearer Token，而是 key 参数。
        // 但为了兼容，我们把 Header 留着也无妨，主要是 URL 要对。
        header = {}; 
    } else {
        // --- 其他标准 OpenAI 厂商 (硅基流动、豆包、DeepSeek) ---
        let baseUrl = scheme.baseUrl;
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        requestUrl = `${baseUrl}/models`;
    }

    uni.request({
        url: requestUrl,
        method: method,
        header: header,
        success: (res) => {
            uni.hideLoading();
            console.log('Fetch Models Result:', res);

            let models = [];

            // 1. 处理 Google 原生返回格式 { "models": [ { "name": "models/gemini-pro" } ] }
            if (scheme.provider === 'gemini' && res.data && res.data.models) {
                models = res.data.models.map(m => {
                    // 去掉 'models/' 前缀，只保留 'gemini-2.0-flash' 这种格式
                    return m.name.replace('models/', '');
                });
            }
            // 2. 处理标准 OpenAI 返回格式 { "data": [ { "id": "deepseek-chat" } ] }
            else if (res.data && Array.isArray(res.data.data)) {
                models = res.data.data.map(m => m.id);
            }
            
            if (models.length > 0) {
                tempModelList.value = models;
                activeFetchIndex.value = index;
                uni.showToast({ title: `获取到 ${models.length} 个模型`, icon: 'success' });
            } else {
                // 错误处理
                const errMsg = res.data?.error?.message || JSON.stringify(res.data);
                uni.showModal({
                    title: '获取失败',
                    content: `状态码: ${res.statusCode}\n响应: ${errMsg}`,
                    showCancel: false
                });
            }
        },
        fail: (err) => {
            uni.hideLoading();
            uni.showToast({ title: '网络请求失败', icon: 'none' });
            console.error(err);
        }
    });
};

const applyModel = (index, modelName) => {
    llmSchemes.value[index].model = modelName;
    tempModelList.value = []; 
};

// --- 图片配置 ---
const handleTypeChange = (e) => {
    const idx = e.detail.value;
    if (idx == 0) {
        imageConfig.value.provider = 'gemini';
        imageConfig.value.baseUrl = 'https://generativelanguage.googleapis.com';
    } else if (idx == 1) {
        imageConfig.value.provider = 'openai';
        imageConfig.value.baseUrl = 'https://api.openai.com/v1';
    } else if (idx == 2) {
        imageConfig.value.provider = 'comfyui';
        imageConfig.value.baseUrl = ''; 
    }
    activeSections.value.image = true;
};

// --- 世界观 ---
const addNewWorld = () => { worldSettings.value.push({ id: Date.now(), name: '新世界', locations: [], occupations: [], isOpen: true, tempLoc: '', tempJob: '' }); };
const toggleWorldItem = (idx) => { worldSettings.value[idx].isOpen = !worldSettings.value[idx].isOpen; };
const deleteWorld = (idx) => { uni.showModal({ title: '删除', content: '确定删除吗？', success: (res) => { if (res.confirm) worldSettings.value.splice(idx, 1); } }); };
const addLocation = (idx) => { const w = worldSettings.value[idx]; if (w.tempLoc) { w.locations.push(w.tempLoc); w.tempLoc = ''; } };
const removeLocation = (wi, li) => { worldSettings.value[wi].locations.splice(li, 1); };
const addOccupation = (idx) => { const w = worldSettings.value[idx]; if (w.tempJob) { w.occupations.push(w.tempJob); w.tempJob = ''; } };
const removeOccupation = (wi, ji) => { worldSettings.value[wi].occupations.splice(ji, 1); };


// --- 打开外部链接逻辑 ---
const openSiliconFlowLink = () => {
    // 硅基流动的注册/Key获取地址 (带有邀请码可得赠送额度，这里放官网或你的邀请链接)
    const url = 'https://cloud.siliconflow.cn/i/lvGIlSLg'; // 这是硅基流动的邀请链接，新用户有额度
    
    // #ifdef H5
    window.open(url);
    // #endif

    // #ifdef APP-PLUS
    plus.runtime.openURL(url);
    // #endif

    // #ifdef MP
    // 小程序不能直接跳外链，通常改为复制链接
    uni.setClipboardData({
        data: url,
        success: () => {
            uni.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' });
        }
    });
    // #endif
};

// --- 保存 ---
const saveAllConfig = () => {
    if (llmSchemes.value.length === 0) {
        uni.showToast({ title: '请添加对话方案', icon: 'none' }); return;
    }
    
    // 保存前清理
    const cleanSchemes = llmSchemes.value.map(({isExpanded, ...rest}) => {
        let url = rest.baseUrl.trim();
        if (url.endsWith('/')) url = url.slice(0, -1);
        return { ...rest, baseUrl: url };
    });
    
    uni.setStorageSync('app_llm_schemes', cleanSchemes);
    uni.setStorageSync('app_current_scheme_index', currentSchemeIndex.value);
    
    let imgUrl = imageConfig.value.baseUrl ? imageConfig.value.baseUrl.trim() : '';
    if (imgUrl.endsWith('/')) imgUrl = imgUrl.slice(0, -1);
    imageConfig.value.baseUrl = imgUrl;
    uni.setStorageSync('app_image_config', imageConfig.value);
    
    const cleanWorlds = worldSettings.value.map(({tempLoc, tempJob, isOpen, ...rest}) => rest);
    uni.setStorageSync('app_world_settings', cleanWorlds);
    
    uni.showToast({ title: '保存成功', icon: 'success' });
    activeSections.value.chat = false;
    activeSections.value.image = false;
    activeSections.value.world = false;
};
</script>

<style lang="scss">
/* --- 基础布局 --- */
.mine-container { min-height: 100vh; background-color: #f5f7fa; padding-bottom: 120rpx; }
.user-section { background-color: #ffffff; padding: 60rpx 40rpx; display: flex; align-items: center; margin-bottom: 24rpx; position: relative; }
.avatar-wrapper { margin-right: 32rpx; position: relative; width: 140rpx; height: 140rpx;}
.avatar { width: 140rpx; height: 140rpx; border-radius: 50%; background-color: #eee; }
.edit-badge { position: absolute; right: 0; bottom: 0; background: #007aff; color: #fff; font-size: 24rpx; width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2rpx solid #fff; }
.info-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.label { font-size: 24rpx; color: #999; margin-bottom: 10rpx; }
.name-display { font-size: 40rpx; font-weight: bold; color: #333; }
.edit-hint { font-size: 24rpx; color: #bbb; font-weight: normal; margin-left: 10rpx;}
.gallery-btn { display: flex; flex-direction: column; align-items: center; margin-left: 20rpx; padding: 10rpx; }
.gallery-icon { font-size: 48rpx; margin-bottom: 4rpx; }
.gallery-text { font-size: 20rpx; color: #666; }

/* --- 设置分组通用 --- */
.setting-group { background-color: #ffffff; margin-bottom: 24rpx; overflow: hidden; }
.group-header { padding: 30rpx; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 1px solid transparent; transition: background 0.2s;}
.group-header:active { background-color: #f9f9f9; }
.group-title-wrapper { display: flex; flex-direction: column; }
.group-title { font-size: 30rpx; color: #333; font-weight: bold; }
.group-subtitle { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.arrow-icon { color: #ccc; font-size: 24rpx; }
.group-content { padding: 0 32rpx 20rpx; animation: fadeIn 0.3s ease; border-top: 1px solid #f0f0f0; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* --- 列表式方案管理样式 (重点修改) --- */
.scheme-list { margin-bottom: 20rpx; margin-top: 10rpx;}
.scheme-card { background: #fff; border: 1px solid #eee; border-radius: 16rpx; margin-bottom: 20rpx; overflow: hidden; transition: all 0.2s; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.02); }
.scheme-card.is-active { border-color: #007aff; background-color: #f0f8ff; box-shadow: 0 4rpx 12rpx rgba(0,122,255,0.1); }

/* 卡片头部 */
.scheme-card-header { padding: 24rpx; display: flex; align-items: center; cursor: pointer; }
.radio-area { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: flex-start; }
.radio-circle { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #ccc; display: flex; align-items: center; justify-content: center; background: #fff; }
.is-active .radio-circle { border-color: #007aff; }
.radio-inner { width: 20rpx; height: 20rpx; border-radius: 50%; background-color: #007aff; }
.scheme-info { flex: 1; display: flex; flex-direction: column; }
.scheme-name { font-size: 28rpx; font-weight: bold; color: #333; }
.scheme-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.expand-icon { padding: 10rpx; color: #ccc; font-size: 24rpx; }

/* 卡片展开内容 */
.scheme-card-body { padding: 0 24rpx 24rpx 24rpx; border-top: 1px solid #f0f0f0; background-color: #fafafa; }
.card-footer { display: flex; justify-content: flex-end; margin-top: 20rpx; }
.delete-text { color: #ff4d4f; font-size: 24rpx; padding: 10rpx 0; }

/* 添加按钮 */
.add-scheme-btn { background-color: #fff; border: 1px dashed #007aff; color: #007aff; font-size: 28rpx; border-radius: 40rpx; margin-top: 20rpx; }
.add-scheme-btn:active { background-color: #f0f8ff; }

/* 模型选择气泡 */
.model-select-area { background: #fff; border: 1px solid #eee; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx; }
.model-tag-title { font-size: 24rpx; color: #999; margin-bottom: 12rpx; }
.model-tags { display: flex; flex-wrap: wrap; gap: 16rpx; }
.model-tag { background: #e3f2fd; color: #007aff; font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 30rpx; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* --- 通用 Setting Item --- */
.setting-item { display: flex; align-items: center; justify-content: space-between; height: 100rpx; border-bottom: 1px solid #e0e0e0; }
.item-label { font-size: 30rpx; color: #333; width: 180rpx; }
.item-input { flex: 1; text-align: right; font-size: 30rpx; color: #333; }
.picker-val { font-size: 30rpx; color: #007aff; font-weight: bold; }
.setting-item-col { padding: 20rpx 0; border-bottom: 1px solid #e0e0e0; }
.item-header { display: flex; justify-content: space-between; margin-bottom: 10rpx; }
.item-value { font-size: 28rpx; color: #007aff; font-weight: bold; }
.setting-tip { font-size: 24rpx; color: #999; padding: 20rpx 0; line-height: 1.5; }

/* 模型输入+刷新 */
.model-input-group { flex: 1; display: flex; align-items: center; justify-content: flex-end; }
.model-manual-input { flex: 1; text-align: right; margin-right: 16rpx; }
.icon-btn { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; background: #e6e6e6; border-radius: 50%; font-size: 30rpx; flex-shrink: 0;}
.icon-btn:active { background: #d0d0d0; }

/* --- World 样式 --- */
.world-card { background-color: #f8f9fa; border-radius: 12rpx; margin-bottom: 20rpx; overflow: hidden; border: 1px solid #eee;}
.world-header { padding: 20rpx; display: flex; justify-content: space-between; align-items: center; background: #fff; border-bottom: 1px solid #eee; }
.world-name { font-weight: bold; font-size: 28rpx; color: #333; }
.world-actions { display: flex; gap: 20rpx; align-items: center; }
.toggle-icon { font-size: 24rpx; color: #007aff; }
.delete-icon { font-size: 28rpx; padding: 10rpx; }
.world-body { padding: 20rpx; }
.sub-section { margin-top: 20rpx; }
.sub-title { font-size: 26rpx; color: #666; margin-bottom: 12rpx; font-weight: bold;}
.tag-container { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 12rpx; }
.tag-item { background-color: #e3f2fd; color: #007aff; padding: 6rpx 16rpx; border-radius: 20rpx; font-size: 24rpx; display: flex; align-items: center; }
.job-tag { background-color: #f3e5f5; color: #9c27b0; }
.tag-close { margin-left: 8rpx; font-weight: bold; opacity: 0.6; padding: 0 4rpx;}
.add-row { display: flex; gap: 10rpx; }
.mini-input { flex: 1; background: #fff; height: 60rpx; border: 1px solid #ddd; border-radius: 8rpx; padding: 0 16rpx; font-size: 24rpx; }
.mini-btn { width: 100rpx; height: 60rpx; background: #333; color: #fff; border-radius: 8rpx; font-size: 24rpx; display: flex; align-items: center; justify-content: center; }
.add-world-btn { background-color: #fff; color: #9c27b0; border: 1px dashed #9c27b0; font-size: 28rpx; margin-top: 20rpx; }

.action-area { padding: 0 32rpx; }
.save-btn { margin: 30rpx 0; background-color: #007aff; color: #fff; border-radius: 40rpx; box-shadow: 0 8rpx 16rpx rgba(0,122,255,0.2); }

/* --- 画风 --- */
.sub-section-title { font-size: 28rpx; color: #666; margin: 30rpx 0 20rpx 0; font-weight: bold; }
.style-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.style-card { background-color: #f8f9fa; border: 2rpx solid transparent; border-radius: 12rpx; padding: 20rpx; display: flex; align-items: center; transition: all 0.2s; }
.style-card.active { background-color: #fff3e0; border-color: #ff9f43; box-shadow: 0 4rpx 8rpx rgba(255,159,67,0.2); }
.style-emoji { font-size: 40rpx; margin-right: 16rpx; }
.style-name { font-size: 26rpx; color: #333; font-weight: 500; }

/* --- 新增：输入框内的右侧链接样式 --- */
.input-suffix-link {
    font-size: 24rpx;
    color: #007aff;           /* 蓝色文字 */
    background-color: #e3f2fd; /* 浅蓝背景 */
    padding: 6rpx 16rpx;
    border-radius: 30rpx;      /* 圆角 */
    margin-left: 16rpx;        /* 跟输入框拉开一点距离 */
    white-space: nowrap;       /* 防止换行 */
    flex-shrink: 0;            /* 防止被输入框挤扁 */
    display: flex;
    align-items: center;
}

.input-suffix-link:active {
    opacity: 0.6;
    background-color: #d0e4f7;
}
</style>