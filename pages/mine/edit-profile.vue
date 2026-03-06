<template>
  <view class="edit-container" :class="{ 'dark-mode': isDarkMode }">
    <!-- 头像区域 -->
    <view class="avatar-section">
      <view class="avatar-box">
        <image class="avatar-preview" :src="form.avatar || '/static/user-avatar.png'" mode="aspectFill" @click="chooseImage"></image>
        <view v-if="isGenerating" class="generating-mask">
           <text class="loading-icon">🎨</text>
           <text>绘制中...</text>
        </view>
      </view>
      <view class="avatar-tips">点击图片上传，或使用下方 AI 生成</view>
    </view>

    <!-- 表单区域 -->
    <view class="form-group">
      <view class="form-item">
        <text class="label">我的昵称</text>
        <input class="input" v-model="form.name" placeholder="起个好听的名字" />
      </view>
      
      <view class="form-item column">
        <view class="label-row">
            <text class="label">外貌描写 (用于生成头像)</text>
            <view class="ai-tag">AI</view>
        </view>
        <textarea 
            class="textarea" 
            v-model="form.appearance" 
            placeholder="例如：黑发少年，金色眼睛，戴着眼镜，穿着连帽衫，温柔的微笑..." 
            maxlength="200"
        />
        <button class="gen-btn" hover-class="btn-hover" @click="generateAvatar" :disabled="isGenerating">
            {{ isGenerating ? '正在请求云端绘图...' : '✨ 根据外貌生成二次元头像' }}
        </button>
      </view>
    </view>

    <view class="action-area">
        <button class="save-btn" @click="saveProfile">保存修改</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad,onShow } from '@dcloudio/uni-app';
import { saveToGallery } from '@/utils/gallery-save.js';
// 🔥 1. 引入 Prompt 模板
import { IMAGE_GENERATOR_OPENAI_PROMPT } from '@/utils/prompts.js';
import { useTheme } from '@/composables/useTheme.js';
const { isDarkMode, applyNativeTheme } = useTheme();
onShow(() => {

    applyNativeTheme(); 

   
});
const form = ref({
    name: '',
    avatar: '',
    appearance: ''
});

const isGenerating = ref(false);

// 🧹 敏感词清洗 (复用自 useAgents.js)
const sanitizePrompt = (text) => {
    if (!text) return "";
    let cleanText = text;
    cleanText = cleanText.replace(/\bmilf\b/gi, "mature elegant lady");
    cleanText = cleanText.replace(/\b(nude|naked|nipples?|pussy|penis|vagina|sex|fuck)\b/gi, "");
    cleanText = cleanText.replace(/\b(t-back|thong|g-string)\b/gi, "lace lingerie");
    cleanText = cleanText.replace(/\b(sheer|transparent|see-through)\b/gi, "delicate silk");
    cleanText = cleanText.replace(/\b(open crotch|crotchless)\b/gi, "");
    cleanText = cleanText.replace(/\bhuge breasts\b/gi, "voluptuous figure");
    cleanText = cleanText.replace(/\blarge breasts\b/gi, "curvy body");
    cleanText = cleanText.replace(/\b(cleavage|areola)\b/gi, "neckline");
    return cleanText;
};

// 🎨 画风前缀生成器 (复用自 useAgents.js)
const getOpenAIStylePrefix = (styleValue) => {
    if (!styleValue || styleValue === 'anime') return "High-quality anime style illustration of";
    const map = {
        'impasto': "Anime style illustration with rich colors and painterly brushstrokes, detailed shading of",
        'retro': "Retro 90s cel-shaded anime style illustration, vintage aesthetic of",
        'shinkai': "Masterpiece anime illustration with vibrant lighting, clouds and emotional atmosphere in the style of Makoto Shinkai, depicting",
        'ghibli': "Studio Ghibli style animation cell illustration, hand-drawn texture of",
        'gufeng': "Anime style illustration, elegant oriental aesthetics, soft colors, detailed background showing",
        'pastel': "Dreamy soft pastel watercolor anime illustration, delicate lines of",
        'sketch': "High-quality manga sketch, clean lines, intricate details of",
        'realistic': "High-quality 2.5D CG art, semi-realistic anime style with detailed skin texture and cinematic lighting of",
        'cyberpunk': "Cyberpunk style anime digital art, neon lights, futuristic atmosphere of"
    };
    if (map[styleValue]) return map[styleValue];
    return `High-quality anime style illustration with ${styleValue} elements of`;
};

onLoad(() => {
    const user = uni.getStorageSync('app_user_info');
    if (user) {
        form.value = { ...user };
        if (!form.value.appearance) form.value.appearance = "";
    }
});

// 手动上传头像
const chooseImage = () => {
    uni.chooseImage({
        count: 1,
        success: async (res) => {
            const tempPath = res.tempFilePaths[0];
            const savedPath = await saveToGallery(tempPath, 'user_profile', '我的头像', '手动上传');
            form.value.avatar = savedPath;
        }
    })
};

// 🔥🔥🔥 AI 生成头像 (核心逻辑升级) 🔥🔥🔥
const generateAvatar = async () => {
    if (!form.value.appearance.trim()) {
        return uni.showToast({ title: '请先填写外貌描写', icon: 'none' });
    }

    const imgConfig = uni.getStorageSync('app_image_config');
    // 如果没有配置，或者配置为空，提示去设置
    if (!imgConfig || (!imgConfig.baseUrl && imgConfig.provider === 'comfyui')) {
        return uni.showToast({ title: '请先在"我的"页面配置绘图设置', icon: 'none' });
    }

    isGenerating.value = true;
    
    try {
        let imageUrl = null;
        let finalPrompt = "";

        // ===========================
        // 分支 1: OpenAI / 豆包 / SiliconFlow
        // ===========================
        if (imgConfig.provider === 'openai') {
            console.log('🤖 使用 OpenAI API 生成头像...');
            
            // 1. 清洗敏感词
            const safeAppearance = sanitizePrompt(form.value.appearance);
            
            // 2. 获取画风
            const stylePrefix = getOpenAIStylePrefix(imgConfig.style);
            
            // 3. 构建肖像 Prompt
            // 这是一个专门优化过的头像模板
            let portraitTemplate = "solo, looking at viewer, headshot portrait, detailed face, best quality. {{appearance}}";
            
            // 4. 拼接: [画风] + [外貌] + [肖像参数]
            finalPrompt = `${stylePrefix} ${portraitTemplate.replace('{{appearance}}', safeAppearance)}`;
            
            console.log('🧩 [头像Prompt]:', finalPrompt);

imageUrl = await generateOpenAIImageInternal(
                imgConfig.baseUrl, 
                imgConfig.apiKey, 
                imgConfig.model, 
                finalPrompt
            );

        } 
        // ===========================
        // 分支 2: ComfyUI
        // ===========================
        else if (imgConfig.provider === 'comfyui') {
            // 保持你原有的 ComfyUI 逻辑，加上 Prompt 优化
            const baseStyle = "best quality, masterpiece, anime style, cel shading, solo, face focus, headshot";
            finalPrompt = `${baseStyle}, ${form.value.appearance}`;
            imageUrl = await generateComfyAvatar(finalPrompt, imgConfig.baseUrl);
        }

        if (imageUrl) {
            // 保存到相册
            const savedPath = await saveToGallery(imageUrl, 'user_profile', '我的头像', finalPrompt);
            form.value.avatar = savedPath;
            uni.showToast({ title: '生成成功', icon: 'success' });
        }

    } catch (e) {
        console.error(e);
        uni.showModal({ title: '生成失败', content: e.message || '请检查配置', showCancel: false });
    } finally {
        isGenerating.value = false;
    }
};

// 🔧 内部函数：OpenAI/豆包 生图请求 (复刻自 useChatGallery.js)
const generateOpenAIImageInternal = async (baseUrl, apiKey, model, prompt) => {

        let targetUrl = baseUrl.trim(); 
    
        // 针对 SiliconFlow/豆包 的特殊处理
        const isSiliconFlow = targetUrl.includes('siliconflow') || targetUrl.includes('volces');
        const requestBody = {
            model: model || 'dall-e-3',
            prompt: prompt,
            n: 1,
            // 豆包/SiliconFlow 推荐用 1024x1024，DALL-E 3 也是
            size: "1024x1024", 
            response_format: "url"
        };


    
    // 如果是 SiliconFlow，可能需要 image_size
    if (isSiliconFlow) {
        requestBody.image_size = "1024x1024";
    }

    const res = await uni.request({
        url: targetUrl,
        method: 'POST',
        header: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        data: requestBody,
        timeout: 120000 // 60秒超时
    });

    if (res.statusCode === 200 && res.data?.data?.[0]?.url) {
        return res.data.data[0].url;
    } else {
        const errMsg = res.data?.error?.message || `Status ${res.statusCode}`;
        throw new Error(errMsg);
    }
};

// --- ComfyUI 核心逻辑 (保持原样) ---
const COMFY_AVATAR_TEMPLATE = {
  "3": { "inputs": { "text": "", "clip": [ "2", 0 ] }, "class_type": "CLIPTextEncode" }, 
  "4": { "inputs": { "text": "3d, realistic, photorealistic, oily skin, shiny skin, bad quality, low quality, worst quality", "clip": [ "2", 0 ] }, "class_type": "CLIPTextEncode" }, 
  "5": { "inputs": { "seed": 0, "steps": 25, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": [ "1", 0 ], "positive": [ "3", 0 ], "negative": [ "4", 0 ], "latent_image": [ "36", 0 ] }, "class_type": "KSampler" },
  "1": { "inputs": { "ckpt_name": "waiNSFWIllustrious_v140.safetensors" }, "class_type": "CheckpointLoaderSimple" },
  "2": { "inputs": { "stop_at_clip_layer": -2, "clip": [ "1", 1 ] }, "class_type": "CLIPSetLastLayer" },
  "9": { "inputs": { "samples": [ "5", 0 ], "vae": [ "1", 2 ] }, "class_type": "VAEDecode" },
  "16": { "inputs": { "filename_prefix": "Avatar_Gen", "images": [ "9", 0 ] }, "class_type": "SaveImage" },
  "36": { "inputs": { "width": 768, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" }
};

const generateComfyAvatar = async (promptText, baseUrl) => {
    // ... (保持你原有的 ComfyUI 逻辑不变) ...
    // 为了节省篇幅，这里假设你保留了原来的代码
    // 真正的代码请直接复制你原来写好的 ComfyUI 逻辑
    const workflow = JSON.parse(JSON.stringify(COMFY_AVATAR_TEMPLATE));
    workflow["3"].inputs.text = promptText;
    workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999);

    const queueRes = await uni.request({
        url: `${baseUrl}/prompt`, method: 'POST',
        data: { prompt: workflow }, sslVerify: false
    });
    if (queueRes.statusCode !== 200) throw new Error('ComfyUI 队列请求失败');
    
    const promptId = queueRes.data.prompt_id;
    
    for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const historyRes = await uni.request({
            url: `${baseUrl}/history/${promptId}`, method: 'GET', sslVerify: false
        });
        if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
            const outputs = historyRes.data[promptId].outputs;
            if (outputs && outputs["16"]) {
                const img = outputs["16"].images[0];
                return `${baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
            }
        }
    }
    throw new Error('生成超时');
};

const saveProfile = () => {
    if (!form.value.name.trim()) return uni.showToast({title: '昵称不能为空', icon:'none'});
    uni.setStorageSync('app_user_info', form.value);
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => { uni.navigateBack(); }, 1000);
};
</script>

<style lang="scss">
/* --- 基础布局 --- */
.edit-container { 
    min-height: 100vh; 
    /* 全局背景色 */
    background-color: var(--bg-color); 
    padding: 40rpx; 
    transition: background-color 0.3s;
}

/* --- 头像区域 --- */
.avatar-section { 
    display: flex; flex-direction: column; align-items: center; 
    margin-bottom: 60rpx; 
}

.avatar-box { 
    position: relative; width: 220rpx; height: 220rpx; border-radius: 50%; 
    box-shadow: var(--shadow); 
    overflow: hidden; 
    /* 卡片背景色 */
    background: var(--card-bg);
}

.avatar-preview { width: 100%; height: 100%; }

.generating-mask { 
    position: absolute; top:0; left:0; right:0; bottom:0; 
    background: rgba(0,0,0,0.6); /* 遮罩层保持半透明黑 */
    display: flex; flex-direction: column; align-items: center; justify-content: center; 
    color: #fff; font-size: 24rpx; backdrop-filter: blur(4px); 
}

.loading-icon { font-size: 48rpx; margin-bottom: 10rpx; animation: spin 2s infinite linear; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.avatar-tips { 
    margin-top: 20rpx; font-size: 24rpx; 
    color: var(--text-sub); /* 适配灰色文字 */
}

/* --- 表单区域 --- */
.form-group { 
    background: var(--card-bg); /* 卡片背景 */
    border-radius: 20rpx; padding: 0 30rpx; margin-bottom: 40rpx; 
    box-shadow: var(--shadow);
}

.form-item { 
    padding: 30rpx 0; 
    border-bottom: 1px solid var(--border-color); /* 边框适配 */
    display: flex; align-items: center; 
}
.form-item:last-child { border-bottom: none; }
.form-item.column { flex-direction: column; align-items: flex-start; }

.label { 
    width: 160rpx; font-size: 30rpx; 
    color: var(--text-color); /* 标题文字 */
    font-weight: bold; 
}

.label-row { display: flex; align-items: center; width: 100%; margin-bottom: 20rpx; }

.ai-tag { 
    background: linear-gradient(135deg, #667eea, #764ba2); 
    color: #fff; font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 10rpx; 
}

.input { 
    flex: 1; font-size: 30rpx; 
    color: var(--text-color); /* 输入内容文字 */
    text-align: right; 
}

.textarea { 
    width: 100%; height: 160rpx; 
    background: var(--input-bg); /* 输入框背景 */
    border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; 
    color: var(--text-color); /* 输入内容文字 */
    box-sizing: border-box; margin-bottom: 20rpx; 
    border: 1px solid var(--border-color);
}

.gen-btn { 
    width: 100%; 
    /* 使用半透明蓝，自动适配黑白模式 */
    background: rgba(0, 122, 255, 0.1); 
    color: #007aff; 
    font-size: 28rpx; border: none; font-weight: bold; border-radius: 12rpx; 
}
.gen-btn[disabled] { opacity: 0.6; color: var(--text-sub); }
.btn-hover { opacity: 0.8; }

.action-area { margin-top: 60rpx; }
.save-btn { 
    background: #007aff; color: #fff; border-radius: 50rpx; font-weight: bold; 
    box-shadow: 0 10rpx 20rpx rgba(0,122,255,0.3); 
}
</style>