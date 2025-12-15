<template>
  <view class="edit-container">
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
import { onLoad } from '@dcloudio/uni-app';
// 引入相册保存工具
import { saveToGallery } from '@/utils/gallery-save.js';

const form = ref({
    name: '',
    avatar: '',
    appearance: ''
});

const isGenerating = ref(false);

// ComfyUI 简单的文生图工作流 (针对头像优化：正方形，特写)
const COMFY_AVATAR_TEMPLATE = {
  "3": { "inputs": { "text": "", "clip": [ "2", 0 ] }, "class_type": "CLIPTextEncode" }, 
  // 负面词：去油腻
  "4": { "inputs": { "text": "3d, realistic, photorealistic, oily skin, shiny skin, bad quality, low quality, worst quality", "clip": [ "2", 0 ] }, "class_type": "CLIPTextEncode" }, 
  "5": { "inputs": { "seed": 0, "steps": 25, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": [ "1", 0 ], "positive": [ "3", 0 ], "negative": [ "4", 0 ], "latent_image": [ "36", 0 ] }, "class_type": "KSampler" },
  "1": { "inputs": { "ckpt_name": "waiNSFWIllustrious_v140.safetensors" }, "class_type": "CheckpointLoaderSimple" },
  "2": { "inputs": { "stop_at_clip_layer": -2, "clip": [ "1", 1 ] }, "class_type": "CLIPSetLastLayer" },
  "9": { "inputs": { "samples": [ "5", 0 ], "vae": [ "1", 2 ] }, "class_type": "VAEDecode" },
  "16": { "inputs": { "filename_prefix": "Avatar_Gen", "images": [ "9", 0 ] }, "class_type": "SaveImage" },
  "36": { "inputs": { "width": 768, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" }
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
            // 手动上传的图片也可以保存到相册
            const tempPath = res.tempFilePaths[0];
            const savedPath = await saveToGallery(tempPath, 'user_profile', '我的头像', '手动上传');
            form.value.avatar = savedPath;
        }
    })
};

// AI 生成头像
const generateAvatar = async () => {
    if (!form.value.appearance.trim()) {
        return uni.showToast({ title: '请先填写外貌描写', icon: 'none' });
    }

    const imgConfig = uni.getStorageSync('app_image_config');
    if (!imgConfig) return uni.showToast({ title: '请先在"我的"页面配置绘图设置', icon: 'none' });

    isGenerating.value = true;
    
    // 强制风格：日漫，哑光皮肤，正方形特写
    const baseStyle = "best quality, masterpiece, anime style, japanese anime, cel shading, matte skin, flat color, solo, face focus, headshot, looking at viewer";
    const finalPrompt = `${baseStyle}, ${form.value.appearance}`;

    try {
        let imageUrl = null;

        // 1. ComfyUI 渠道
        if (imgConfig.provider === 'comfyui') {
            if (!imgConfig.baseUrl) throw new Error('ComfyUI 地址未配置');
            imageUrl = await generateComfyAvatar(finalPrompt, imgConfig.baseUrl);
        } 
        // 2. Gemini 渠道
        else if (imgConfig.provider === 'gemini') {
            imageUrl = await generateGeminiAvatar(finalPrompt, imgConfig.baseUrl, imgConfig.apiKey, imgConfig.model);
        }
        // 3. OpenAI 渠道
        else if (imgConfig.provider === 'openai') {
             imageUrl = await generateOpenAIAvatar(finalPrompt, imgConfig.baseUrl, imgConfig.apiKey, imgConfig.model);
        }

        if (imageUrl) {
            // 【关键修改】保存到本地相册
            const savedPath = await saveToGallery(imageUrl, 'user_profile', '我的头像', finalPrompt);
            form.value.avatar = savedPath;
            
            uni.showToast({ title: '生成成功并保存', icon: 'success' });
        }
    } catch (e) {
        console.error(e);
        uni.showModal({ title: '生成失败', content: e.message || '请检查配置或网络', showCancel: false });
    } finally {
        isGenerating.value = false;
    }
};

// --- ComfyUI 核心逻辑 (简化版) ---
const generateComfyAvatar = async (promptText, baseUrl) => {
    const workflow = JSON.parse(JSON.stringify(COMFY_AVATAR_TEMPLATE));
    workflow["3"].inputs.text = promptText;
    workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999);

    const queueRes = await uni.request({
        url: `${baseUrl}/prompt`, method: 'POST',
        data: { prompt: workflow }, sslVerify: false
    });
    if (queueRes.statusCode !== 200) throw new Error('ComfyUI 队列请求失败');
    
    const promptId = queueRes.data.prompt_id;
    
    for (let i = 0; i < 40; i++) {
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

// --- Gemini 核心逻辑 ---
const generateGeminiAvatar = async (prompt, baseUrl, apiKey, model) => {
    if (!apiKey) {
        const chatConfig = uni.getStorageSync('app_api_config');
        apiKey = chatConfig?.apiKey;
    }
    if (!apiKey) throw new Error('缺少 API Key');
    
    const res = await uni.request({
        url: `${baseUrl}/v1beta/models/${model || 'gemini-2.0-flash-exp'}:generateContent?key=${apiKey}`,
        method: 'POST',
        data: { contents: [{ parts: [{ text: prompt }] }] },
        sslVerify: false
    });
    const inlineData = res.data?.candidates?.[0]?.content?.parts?.find(p => p.inline_data)?.inline_data;
    if (inlineData) return `data:${inlineData.mime_type};base64,${inlineData.data}`;
    throw new Error('Gemini 未返回图片数据');
};

// --- OpenAI 核心逻辑 ---
const generateOpenAIAvatar = async (prompt, baseUrl, apiKey, model) => {
    const res = await uni.request({
        url: `${baseUrl}/images/generations`,
        method: 'POST',
        header: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        data: { model: model || 'dall-e-3', prompt: prompt, n: 1, size: "1024x1024" },
        sslVerify: false
    });
    if (res.data?.data?.[0]?.url) return res.data.data[0].url;
    throw new Error('OpenAI 生成失败');
};

const saveProfile = () => {
    if (!form.value.name.trim()) return uni.showToast({title: '昵称不能为空', icon:'none'});
    uni.setStorageSync('app_user_info', form.value);
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => { uni.navigateBack(); }, 1000);
};
</script>

<style lang="scss">
.edit-container { min-height: 100vh; background-color: #f5f7fa; padding: 40rpx; }

.avatar-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 60rpx; }
.avatar-box { position: relative; width: 220rpx; height: 220rpx; border-radius: 50%; box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1); overflow: hidden; background: #fff;}
.avatar-preview { width: 100%; height: 100%; }
.generating-mask { position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-size: 24rpx; backdrop-filter: blur(4px); }
.loading-icon { font-size: 48rpx; margin-bottom: 10rpx; animation: spin 2s infinite linear; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.avatar-tips { margin-top: 20rpx; font-size: 24rpx; color: #999; }

.form-group { background: #fff; border-radius: 20rpx; padding: 0 30rpx; margin-bottom: 40rpx; }
.form-item { padding: 30rpx 0; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; }
.form-item:last-child { border-bottom: none; }
.form-item.column { flex-direction: column; align-items: flex-start; }

.label { width: 160rpx; font-size: 30rpx; color: #333; font-weight: bold; }
.label-row { display: flex; align-items: center; width: 100%; margin-bottom: 20rpx; }
.ai-tag { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 20rpx; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 10rpx; }

.input { flex: 1; font-size: 30rpx; color: #333; text-align: right; }
.textarea { width: 100%; height: 160rpx; background: #f8f8f8; border-radius: 12rpx; padding: 20rpx; font-size: 28rpx; color: #333; box-sizing: border-box; margin-bottom: 20rpx; }

.gen-btn { width: 100%; background: #e0eaff; color: #4a90e2; font-size: 28rpx; border: none; font-weight: bold; border-radius: 12rpx; }
.gen-btn[disabled] { opacity: 0.6; color: #999; }
.btn-hover { opacity: 0.8; }

.action-area { margin-top: 60rpx; }
.save-btn { background: #007aff; color: #fff; border-radius: 50rpx; font-weight: bold; box-shadow: 0 10rpx 20rpx rgba(0,122,255,0.3); }
</style>