<template>
  <view class="wardrobe-panel" @click.stop>
    <view class="panel-header">
      <text class="title">我的衣柜</text>
      <view class="close-btn" @click="$emit('close')">×</view>
    </view>

    <scroll-view scroll-y class="wardrobe-list">
      <view v-if="localList.length === 0" class="empty-tip">
        衣柜是空的，快去添置新衣服吧~
      </view>

      <view 
        class="outfit-card" 
        v-for="(item, index) in localList" 
        :key="item.id"
      >
        <!-- 顶部概览行 -->
        <view class="card-header" @click="toggleExpand(index)">
          <view class="header-left">
            <text class="expand-icon">{{ item.isExpanded ? '▼' : '▶' }}</text>
            <input 
              v-if="item.isEditing"
              class="name-input"
              v-model="item.name" 
              @click.stop
              placeholder="套装名称"
            />
            <text v-else class="outfit-name">{{ item.name || '未命名套装' }}</text>
          </view>
          
          <view class="header-actions">
            <view class="action-btn wear-btn" @click.stop="$emit('apply', item)">穿上</view>
            <view class="action-btn delete-btn" @click.stop="deleteOutfit(index)">🗑️</view>
          </view>
        </view>

        <!-- 展开详情区域 -->
        <view class="card-body" v-if="item.isExpanded">
			<view class="design-input-box">
			        <text class="label">🎨 设计灵感 / 风格:</text>
			        <input 
			            class="style-input" 
			            v-model="item.stylePrompt" 
			            placeholder="例如: 护士、猫娘、赛博朋克、古风 (留空则随机)" 
			            @input="onUpdate"
			        />
			    </view>
          <!-- 生成工具栏 -->
          <view class="gen-toolbar">
            <view 
                class="r18-switch" 
                :class="{ active: item.isR18 }" 
                @click="toggleR18(index)"
            >
                <view class="checkbox" :class="{ checked: item.isR18 }">
                    <text v-if="item.isR18">✓</text>
                </view>
                <text>R18 模式</text>
            </view>
            
            <view class="gen-btn" @click="handleAutoGenerate(index)">
                <text>✨ AI 自动设计</text>
            </view>
          </view>

          <view class="form-grid">
            <view class="form-item">
              <text class="label">头饰</text>
              <input class="input" v-model="item.items.head" placeholder="如: 棒球帽" @input="onUpdate"/>
            </view>
            <view class="form-item">
              <text class="label">上装</text>
              <input class="input" v-model="item.items.top" placeholder="如: 白色T恤" @input="onUpdate"/>
            </view>
            <view class="form-item">
              <text class="label">下装</text>
              <input class="input" v-model="item.items.bottom" placeholder="如: 牛仔裤" @input="onUpdate"/>
            </view>
            <view class="form-item">
              <text class="label">袜子</text>
              <input class="input" v-model="item.items.socks" placeholder="如: 棉袜" @input="onUpdate"/>
            </view>
            <view class="form-item">
              <text class="label">鞋子</text>
              <input class="input" v-model="item.items.shoes" placeholder="如: 运动鞋" @input="onUpdate"/>
            </view>
            <view class="form-item">
              <text class="label">其他</text>
              <input class="input" v-model="item.items.accessory" placeholder="如: 围巾/项链" @input="onUpdate"/>
            </view>
          </view>
          
          <!-- 英文 Tags 展示区 -->
          <view class="tags-display" v-if="item.tags">
            <text class="tags-label">ComfyUI Tags (English):</text>
            <view class="tags-content">{{ item.tags }}</view>
          </view>
        </view>
      </view>
      
      <!-- 底部占位，防止被按钮遮挡 -->
      <view style="height: 120rpx;"></view>
    </scroll-view>

    <view class="footer-btn">
      <view class="footer-action" @click="addNewOutfit">
        <text>➕ 添加新套装</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, toRaw } from 'vue';
import { LLM } from '@/services/llm.js';

const props = defineProps({
  list: {
    type: Array,
    default: () => []
  },
  currentRole: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:list', 'apply', 'close']);

// 本地列表，初始化时深拷贝 props.list
const localList = ref([]);
const isGenerating = ref(false);

// 监听 props 变化，同步到本地
watch(() => props.list, (newVal) => {
  // 只有当长度不一致或 ID 变化时才全量更新，防止输入时焦点丢失
  // 这里简化处理：如果是初始化或外部强制更新，才覆盖
  if (localList.value.length === 0 && newVal.length > 0) {
     localList.value = JSON.parse(JSON.stringify(newVal));
  }
}, { immediate: true, deep: true });

// 展开/收起
const toggleExpand = (index) => {
  localList.value[index].isExpanded = !localList.value[index].isExpanded;
};



// 自动生成逻辑 (用户指定关键词版)
// 自动生成逻辑 (已修改：直接读取输入框，不再弹窗)
const handleAutoGenerate = async (index) => {
  if (isGenerating.value) return;

  const item = localList.value[index];
  
  // 1. 直接获取用户输入的风格 (如果没有输入，则是空字符串)
  const userTheme = item.stylePrompt ? item.stylePrompt.trim() : '';
  const isR18 = item.isR18 || false;

  isGenerating.value = true;
  
  // 动态提示：如果有关键词显示关键词，否则显示自由发挥
  uni.showLoading({ 
    title: userTheme ? `设计: ${userTheme}...` : 'AI 自由设计中...' 
  });

  try {
    const schemes = uni.getStorageSync('app_llm_schemes') || [];
    const idx = uni.getStorageSync('app_current_scheme_index') || 0;
    const config = (schemes.length > 0 && schemes[idx]) ? schemes[idx] : uni.getStorageSync('app_api_config');

    if (!config || !config.apiKey) throw new Error('API 配置缺失');

    const roleName = props.currentRole?.name || 'Character';
    const roleBio = props.currentRole?.bio || '';
    const roleGender = props.currentRole?.gender || 'Female';

    // 2. 构建 Prompt：根据是否有关键词，给 AI 不同的指令
    let designInstruction = "";

    if (userTheme) {
      // 🅰️ 有关键词：围绕关键词设计，但要求有创意
      designInstruction = `
【DESIGN MISSION】:
The user specifically requested: "${userTheme}".
Please design a high-quality, detailed "${userTheme}".
- **Requirement**: Don't make it boring. Add some unique artistic touches or details to make it stand out.
`;
    } else {
      // 🅱️ 无关键词：完全自由发挥 (高随机性)
      designInstruction = `
【DESIGN MISSION】:
The user left it blank. Please **Hallucinate** a unique theme yourself.
- **Randomly Pick a Style**: Sci-fi, Fantasy, Cyberpunk, Gothic, Historical, Streetwear, etc.
- **Goal**: Create something visually stunning and unexpected.
`;
    }

    const systemPrompt = `You are a top fashion designer.
Task: Design an outfit based on the MISSION below.
Character: ${roleName} (${roleGender})
Bio: ${roleBio}

${designInstruction}

${isR18 ? '⚠️ MODE: R18/NSFW. Make it sexy, revealing, or fetish-oriented.' : 'MODE: Normal/Safe. Focus on fashion aesthetics.'}

【OUTPUT FORMAT】:
Please strictly follow this line-by-line format:

Name: [Creative Outfit Name in Chinese]
Head: [Headwear in Chinese]
Top: [Top in Chinese]
Bottom: [Bottom in Chinese]
Socks: [Socks in Chinese]
Shoes: [Shoes in Chinese]
Accessory: [Accessories in Chinese]
Tags: [Detailed English tags for Stable Diffusion/ComfyUI describing the visual appearance]
`;

    const res = await LLM.chat({
      config,
      messages: [{ role: 'user', content: "Start design." }],
      systemPrompt: systemPrompt,
      temperature: 0.9 // 保持较高的温度，保证每次设计的差异性
    });

    // 3. 解析结果
    const extract = (key) => {
      const regex = new RegExp(`^${key}\\s*[:：]\\s*(.*)$`, 'im');
      const match = res.match(regex);
      return match ? match[1].trim() : '';
    };

    const newName = extract('Name');
    const newTags = extract('Tags');

    if (newName || newTags) {
      // 只有解析成功才覆盖
      item.name = newName || item.name;
      item.items.head = extract('Head');
      item.items.top = extract('Top');
      item.items.bottom = extract('Bottom');
      item.items.socks = extract('Socks');
      item.items.shoes = extract('Shoes');
      item.items.accessory = extract('Accessory');
      item.tags = newTags;

      emitUpdate();
      uni.showToast({ title: '设计完成', icon: 'success' });
    } else {
      uni.showToast({ title: 'AI 没按格式返回，请重试', icon: 'none' });
    }

  } catch (e) {
    console.error(e);
    uni.showToast({ title: '生成失败', icon: 'none' });
  } finally {
    isGenerating.value = false;
    uni.hideLoading();
  }
};

// 切换 R18 状态
const toggleR18 = (index) => {
    localList.value[index].isR18 = !localList.value[index].isR18;
    emitUpdate();
};

// 添加新套装
const addNewOutfit = () => {
  const newOutfit = {
    id: Date.now(),
    name: '新套装',
    isExpanded: true,
	stylePrompt: '',
    isEditing: true, // 默认允许改名
    isR18: false,    // 默认为正常模式
    tags: '',        // 英文 Tags
    items: {
      head: '',
      top: '',
      bottom: '',
      socks: '',
      shoes: '',
      accessory: ''
    }
  };
  localList.value.push(newOutfit);
  emitUpdate();
};

// 删除套装
const deleteOutfit = (index) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要丢弃这套衣服吗？',
    success: (res) => {
      if (res.confirm) {
        localList.value.splice(index, 1);
        emitUpdate();
      }
    }
  });
};

// 输入框变化时触发更新
const onUpdate = () => {
  emitUpdate();
};

// 向上层同步数据
const emitUpdate = () => {
  // 深拷贝去除响应式引用
  emit('update:list', JSON.parse(JSON.stringify(localList.value)));
};

</script>

<style lang="scss" scoped>
.wardrobe-panel {
  width: 650rpx;
  height: 80vh;
  background: var(--card-bg);
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.panel-header {
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  
  .title { font-size: 34rpx; font-weight: bold; color: var(--text-color); }
  .close-btn { font-size: 40rpx; color: var(--text-sub); padding: 0 20rpx; }
}

.wardrobe-list {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.empty-tip {
  text-align: center;
  color: var(--text-sub);
  margin-top: 100rpx;
  font-size: 28rpx;
}

.outfit-card {
  background: var(--bg-color);
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.card-header {
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--tool-bg);
  
  .header-left {
    display: flex;
    align-items: center;
    flex: 1;
    
    .expand-icon { margin-right: 10rpx; font-size: 24rpx; color: var(--text-sub); }
    .outfit-name { font-size: 30rpx; font-weight: bold; color: var(--text-color); }
    .name-input {
      font-size: 30rpx;
      color: var(--text-color);
      border-bottom: 1px solid #007aff;
      width: 200rpx;
    }
  }
  
  .header-actions {
    display: flex;
    gap: 16rpx;
    
    .action-btn {
      padding: 10rpx 20rpx;
      border-radius: 8rpx;
      font-size: 24rpx;
    }
    
    .wear-btn {
      background: #007aff;
      color: #fff;
    }
    
    .delete-btn {
      background: rgba(255, 77, 79, 0.1);
      color: #ff4d4f;
    }
  }
}

.card-body {
  padding: 20rpx;
  background: var(--bg-color);
  .design-input-box {
        margin-bottom: 20rpx;
        
        .label {
            font-size: 24rpx;
            color: var(--text-sub);
            margin-bottom: 10rpx;
            display: block;
        }
        
        .style-input {
            background: var(--input-bg); // 或者是 #f5f5f5
            padding: 16rpx;
            border-radius: 12rpx;
            font-size: 26rpx;
            color: var(--text-color);
            border: 1px solid var(--border-color);
        }
    }
}

.gen-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 20rpx;
    border-bottom: 1px dashed var(--border-color);
    
    .r18-switch {
        display: flex;
        align-items: center;
        font-size: 24rpx;
        color: var(--text-sub);
        
        .checkbox {
            width: 30rpx; height: 30rpx; 
            border: 1px solid var(--text-sub);
            margin-right: 10rpx;
            border-radius: 6rpx;
            display: flex; align-items: center; justify-content: center;
            
            &.checked {
                background: #ff4d4f;
                border-color: #ff4d4f;
                color: #fff;
            }
        }
        
        &.active { color: #ff4d4f; font-weight: bold; }
    }
    
    .gen-btn {
        background: linear-gradient(90deg, #9c27b0, #673ab7);
        color: #fff;
        padding: 8rpx 20rpx;
        border-radius: 30rpx;
        font-size: 24rpx;
        display: flex; align-items: center;
    }
}

.tags-display {
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1px dashed var(--border-color);
    
    .tags-label { font-size: 22rpx; color: var(--text-sub); margin-bottom: 6rpx; }
    .tags-content {
        font-size: 22rpx;
        color: var(--text-sub);
        background: var(--tool-bg);
        padding: 10rpx;
        border-radius: 8rpx;
        min-height: 40rpx;
    }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  
  .label { font-size: 22rpx; color: var(--text-sub); margin-bottom: 6rpx; }
  .input {
    font-size: 26rpx;
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 8rpx;
    padding: 10rpx;
    background: var(--input-bg);
  }
}

.footer-btn {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background: var(--card-bg);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  
  .footer-action {
      font-size: 30rpx;
      color: #007aff;
      font-weight: bold;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
  }
}
</style>