<template>
  <view class="mine-container">
    <!-- 头部用户信息 -->
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

    <!-- 1. 对话模型配置 -->
    <view class="setting-group">
      <view class="group-header" @click="toggleSection('chat')">
        <view class="group-title-wrapper">
          <view class="group-title">对话模型 (LLM)</view>
          <text class="group-subtitle">{{ apiConfig.model || '未设置' }}</text>
        </view>
        <text class="arrow-icon">{{ activeSections.chat ? '▼' : '▶' }}</text>
      </view>

      <view v-show="activeSections.chat" class="group-content">
        <view class="setting-item">
          <view class="item-label">接口地址</view>
          <input class="item-input" type="text" v-model="apiConfig.baseUrl" placeholder="例如 https://generativelanguage.googleapis.com" />
        </view>
        <view class="setting-item">
          <view class="item-label">API Key</view>
          <input class="item-input" type="text" password v-model="apiConfig.apiKey" placeholder="在此粘贴 Key" />
        </view>
        <view class="setting-item">
          <view class="item-label">模型名称</view>
          <input class="item-input" type="text" v-model="apiConfig.model" placeholder="例如 gemini-2.0-flash" />
        </view>
        <view class="setting-item-col">
          <view class="item-header">
            <text class="item-label">记忆深度</text>
            <text class="item-value">{{ apiConfig.historyLimit }} 条</text>
          </view>
          <slider :value="apiConfig.historyLimit" min="0" max="60" step="2" activeColor="#007aff" @change="(e) => apiConfig.historyLimit = e.detail.value" />
        </view>
      </view>
    </view>

    <!-- 2. 画图模型配置 -->
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

        <!-- A. Gemini -->
        <template v-if="imageConfig.provider === 'gemini'">
            <view class="setting-tip">Key 留空则自动使用上方对话 Key。</view>
            <view class="setting-item">
              <view class="item-label">接口地址</view>
              <input class="item-input" type="text" v-model="imageConfig.baseUrl" placeholder="例如 https://generativelanguage.googleapis.com" />
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

        <!-- B. OpenAI -->
        <template v-else-if="imageConfig.provider === 'openai'">
            <view class="setting-item">
              <view class="item-label">接口地址</view>
              <input class="item-input" type="text" v-model="imageConfig.baseUrl" placeholder="例如 https://api.openai.com/v1" />
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

        <!-- C. ComfyUI -->
        <template v-else-if="imageConfig.provider === 'comfyui'">
            <view class="setting-tip">
              填写 Cloudflare Tunnel 的公网地址。<br>
              例如: https://my-comfy.trycloudflare.com
            </view>
            <view class="setting-item">
              <view class="item-label">公网地址</view>
              <input class="item-input" type="text" v-model="imageConfig.baseUrl" placeholder="https://..." />
            </view>
        </template>

        <!-- 新增：画风选择 -->
        <view class="sub-section-title">🎨 画风选择 (Style)</view>
        <view class="style-grid">
            <view 
                class="style-card" 
                v-for="(style, index) in DRAWING_STYLES" 
                :key="index"
                :class="{ 'active': imageConfig.style === style.value }"
                @click="imageConfig.style = style.value"
            >
                <text class="style-emoji">{{ style.emoji }}</text>
                <text class="style-name">{{ style.label }}</text>
            </view>
        </view>
      </view>
    </view>
    
    <!-- 3. 世界观设定 -->
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
                 <input class="mini-input" v-model="world.tempLoc" placeholder="输入地点 (如: 荒坂塔)" />
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
                 <input class="mini-input" v-model="world.tempJob" placeholder="输入职业 (如: 黑客)" />
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
// 画风定义 (多样性选择)
// =========================================================================
const DRAWING_STYLES = [
    { label: '标准日漫 (Standard)', value: 'anime', emoji: '📺' },
    { label: '厚涂风格 (Impasto)', value: 'impasto', emoji: '🖌️' },
    { label: '90年代复古 (Retro)', value: 'retro', emoji: '📼' },
    { label: '新海诚风 (Scenery)', value: 'shinkai', emoji: '☁️' },
    { label: '暗黑哥特 (Gothic)', value: 'gothic', emoji: '🦇' },
    { label: '赛博朋克 (Cyber)', value: 'cyber', emoji: '🤖' },
    { label: '水彩柔和 (Pastel)', value: 'pastel', emoji: '🌸' },
    { label: '黑白线稿 (Sketch)', value: 'sketch', emoji: '✏️' }
];

const userInfo = ref({ name: '我', avatar: '/static/user-avatar.png' });
const activeSections = ref({ chat: false, image: false, world: false });
const toggleSection = (key) => { activeSections.value[key] = !activeSections.value[key]; };

const apiConfig = ref({
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: '',
  model: '', 
  historyLimit: 20
});

const imageConfig = ref({
  provider: 'gemini', 
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: '',
  model: '',
  style: 'anime' // 默认为标准日漫
});

const worldSettings = ref([]);

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

const currentStyleLabel = computed(() => {
    const target = DRAWING_STYLES.find(s => s.value === imageConfig.value.style);
    return target ? target.label : '标准日漫';
});

onShow(() => {
  const storedUser = uni.getStorageSync('app_user_info');
  if (storedUser) userInfo.value = storedUser;

  const storedConfig = uni.getStorageSync('app_api_config');
  if (storedConfig) apiConfig.value = { ...apiConfig.value, ...storedConfig };

  const storedImgConfig = uni.getStorageSync('app_image_config');
  if (storedImgConfig) imageConfig.value = { ...imageConfig.value, ...storedImgConfig };
  
  const storedWorlds = uni.getStorageSync('app_world_settings');
  if (storedWorlds && Array.isArray(storedWorlds)) {
      worldSettings.value = storedWorlds.map(w => ({
          ...w, isOpen: false, tempLoc: '', tempJob: ''
      }));
  }
});

const goToEdit = () => { uni.navigateTo({ url: '/pages/mine/edit-profile' }); };
const goToGallery = () => { uni.navigateTo({ url: '/pages/mine/gallery' }); };

const handleTypeChange = (e) => {
    const idx = e.detail.value;
    if (idx == 0) {
        imageConfig.value.provider = 'gemini';
        imageConfig.value.baseUrl = 'https://generativelanguage.googleapis.com';
        if(!imageConfig.value.model) imageConfig.value.model = 'gemini-2.0-flash-exp'; 
    } else if (idx == 1) {
        imageConfig.value.provider = 'openai';
        imageConfig.value.baseUrl = 'https://api.openai.com/v1';
        if(!imageConfig.value.model) imageConfig.value.model = 'dall-e-3';
    } else if (idx == 2) {
        imageConfig.value.provider = 'comfyui';
        imageConfig.value.baseUrl = ''; 
        imageConfig.value.model = '';
    }
    activeSections.value.image = true;
};

// --- 世界观逻辑 (保持不变) ---
const addNewWorld = () => {
    worldSettings.value.push({ id: Date.now(), name: '新世界 ' + (worldSettings.value.length + 1), locations: ['家中', '公园', '学校'], occupations: ['学生', '上班族'], isOpen: true, tempLoc: '', tempJob: '' });
};
const toggleWorldItem = (index) => { worldSettings.value[index].isOpen = !worldSettings.value[index].isOpen; };
const deleteWorld = (index) => { uni.showModal({ title: '确认删除', content: '确定要删除这个世界设定吗？', success: (res) => { if (res.confirm) worldSettings.value.splice(index, 1); } }); };
const addLocation = (index) => { const world = worldSettings.value[index]; if (world.tempLoc && world.tempLoc.trim()) { world.locations.push(world.tempLoc.trim()); world.tempLoc = ''; } };
const removeLocation = (wIndex, lIndex) => { worldSettings.value[wIndex].locations.splice(lIndex, 1); };
const addOccupation = (index) => { const world = worldSettings.value[index]; if (world.tempJob && world.tempJob.trim()) { world.occupations.push(world.tempJob.trim()); world.tempJob = ''; } };
const removeOccupation = (wIndex, jIndex) => { worldSettings.value[wIndex].occupations.splice(jIndex, 1); };

const saveAllConfig = () => {
  if (!apiConfig.value.apiKey.trim()) { uni.showToast({ title: '对话 Key 不能为空', icon: 'none' }); return; }
  let chatUrl = apiConfig.value.baseUrl.trim();
  if (chatUrl.endsWith('/')) chatUrl = chatUrl.slice(0, -1);
  apiConfig.value.baseUrl = chatUrl;
  uni.setStorageSync('app_api_config', apiConfig.value);

  let imgUrl = imageConfig.value.baseUrl ? imageConfig.value.baseUrl.trim() : '';
  if (imgUrl.endsWith('/')) imgUrl = imgUrl.slice(0, -1);
  imageConfig.value.baseUrl = imgUrl;
  // 确保风格被保存
  if (!imageConfig.value.style) imageConfig.value.style = 'anime';
  uni.setStorageSync('app_image_config', imageConfig.value);
  
  const cleanWorlds = worldSettings.value.map(({tempLoc, tempJob, isOpen, ...rest}) => rest);
  uni.setStorageSync('app_world_settings', cleanWorlds);

  uni.showToast({ title: '所有配置已保存', icon: 'success' });
  activeSections.value.chat = false;
  activeSections.value.image = false;
  activeSections.value.world = false;
};
</script>

<style lang="scss">
/* 保持原有样式，新增 style-grid 相关样式 */
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
.setting-group { background-color: #ffffff; margin-bottom: 24rpx; overflow: hidden; }
.group-header { padding: 30rpx; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 1px solid transparent; transition: background 0.2s;}
.group-header:active { background-color: #f9f9f9; }
.group-title-wrapper { display: flex; flex-direction: column; }
.group-title { font-size: 30rpx; color: #333; font-weight: bold; }
.group-subtitle { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.arrow-icon { color: #ccc; font-size: 24rpx; }
.group-content { padding: 0 32rpx 20rpx; animation: fadeIn 0.3s ease; border-top: 1px solid #f0f0f0; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.setting-item { display: flex; align-items: center; justify-content: space-between; height: 100rpx; border-bottom: 1px solid #f0f0f0; }
.item-label { font-size: 30rpx; color: #333; width: 180rpx; }
.item-input { flex: 1; text-align: right; font-size: 30rpx; color: #333; }
.picker-val { font-size: 30rpx; color: #007aff; font-weight: bold; }
.setting-item-col { padding: 20rpx 0; border-bottom: 1px solid #f0f0f0; }
.item-header { display: flex; justify-content: space-between; margin-bottom: 10rpx; }
.item-value { font-size: 28rpx; color: #007aff; font-weight: bold; }
.setting-tip { font-size: 24rpx; color: #999; padding: 20rpx 0; line-height: 1.5; }
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
.add-world-btn:active { background-color: #f3e5f5; }
.action-area { padding: 0 32rpx; }
.save-btn { margin: 30rpx 0; background-color: #007aff; color: #fff; border-radius: 40rpx; box-shadow: 0 8rpx 16rpx rgba(0,122,255,0.2); }

/* 新增：画风选择样式 */
.sub-section-title { font-size: 28rpx; color: #666; margin: 30rpx 0 20rpx 0; font-weight: bold; }
.style-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.style-card { background-color: #f8f9fa; border: 2rpx solid transparent; border-radius: 12rpx; padding: 20rpx; display: flex; align-items: center; transition: all 0.2s; }
.style-card.active { background-color: #fff3e0; border-color: #ff9f43; box-shadow: 0 4rpx 8rpx rgba(255,159,67,0.2); }
.style-emoji { font-size: 40rpx; margin-right: 16rpx; }
.style-name { font-size: 26rpx; color: #333; font-weight: 500; }
</style>