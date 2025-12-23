// AiChat/composables/useChatGallery.js
import { Comfy } from '@/services/comfyui.js';
import { saveToGallery } from '@/utils/gallery-save.js';
import { STYLE_PROMPT_MAP } from '@/utils/constants.js';

export function useChatGallery(context) {
    const { 
        currentRole, interactionMode, userAppearance, 
        messageList, chatId, chatName, saveHistory, scrollToBottom 
    } = context;

    // ✅ 1. 生图请求函数 (完全保留你之前的修复，逻辑一字未动)
    const generateOpenAIImage = async (fullUrl, apiKey, model, prompt) => {
        const targetUrl = fullUrl.trim();
        console.log(`🚀 [OpenAI] 请求地址: ${targetUrl}`);
        console.log(`🚀 [OpenAI] 请求模型: ${model}`);

        // 协议判定
        const isChatProtocol = targetUrl.includes('/chat/completions');
        let requestBody = {};

        if (isChatProtocol) {
            console.log('🔄 Chat 协议 (移除 response_format)...');
            requestBody = {
                model: model,
                messages: [{ role: 'user', content: `Generate an image based on this description: ${prompt}` }],
                stream: false
                // ⚠️ 关键：这里不传 response_format
            };
        } else {
            console.log('🎨 标准 Image 协议...');
            requestBody = {
                model: model || 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: "2048x2048",
                response_format: "url"
            };
        }

        try {
            const res = await uni.request({
                url: targetUrl,
                method: 'POST',
                header: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                data: requestBody,
                sslVerify: false,
                timeout: 60000
            });

            if (res.statusCode !== 200) throw new Error(res.data?.error?.message || `请求失败 code:${res.statusCode}`);

            let imgUrl = '';
            if (isChatProtocol) {
                const content = res.data?.choices?.[0]?.message?.content || "";
                const match = content.match(/\!\[.*?\]\((.*?)\)/);
                if (match && match[1]) imgUrl = match[1];
                else if (/(https?:\/\/.*\.(png|jpg|jpeg|webp|gif))/i.test(content)) imgUrl = content.match(/(https?:\/\/.*\.(png|jpg|jpeg|webp|gif))/i)[0];
                else if (content.startsWith('http')) imgUrl = content.trim();
                else throw new Error('Chat模式未返回有效图片链接');
            } else {
                imgUrl = res.data?.data?.[0]?.url;
            }

            if (!imgUrl) throw new Error('解析不到图片地址');
            return imgUrl;
        } catch (e) {
            console.error('生图请求异常:', e);
            throw e; 
        }
    };

    // ✅ 2. ComfyUI 优化器 (已升级为接收门卫指令)
    // 🆕 参数：isDuoModeStr (来自门卫)
    const optimizePromptForComfyUI = async (actionAndSceneDescription, isDuoModeStr) => {
        let aiTags = actionAndSceneDescription || "";
        const settings = currentRole.value?.settings || {};
        const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl"; 
        
        // 🆕 核心逻辑：不再瞎猜，直接听门卫的
        let isDuo = (isDuoModeStr === 'DUO'); 
        
        // 🛡️ Phone 模式双重保险 (虽然门卫已经挡了一道，但这里的清洗逻辑必须保留，防止 Tag 冲突)
        if (interactionMode.value === 'phone') {
            isDuo = false; 
            const subjectKeywords = /\b(couple|2people|1boy|boys|man|men|male|shota)\b/i;
            aiTags = aiTags.replace(subjectKeywords, "");
            aiTags = aiTags.replace(/\b(multiple|penis|testicles|cum)\b/gi, "");
            aiTags = aiTags.replace(/\b(doggystyle|missionary|paizuri|sex|fellatio|cuddling|hug)\b/gi, "kneeling, all fours");
        } else {
            // Face 模式：如果门卫说是 DUO，那就清除 SOLO 标签
            if (isDuo) aiTags = aiTags.replace(/\bsolo\b/gi, ""); 
        }
    
        let parts = [];
        
        // 🆕 智能补全：根据门卫指令补全主体
        if (isDuo) {
            if (!aiTags.includes('couple') && !aiTags.includes('2people')) parts.push("couple, 2people");
        } else {
            if (!aiTags.includes('solo')) parts.push("solo");
        }
        
        // 画风注入 (完全保留)
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        const styleSetting = imgConfig.style || 'anime';
        const presetPrompt = STYLE_PROMPT_MAP[styleSetting];
        
        if (presetPrompt) {
            parts.push("masterpiece, best quality, anime style, flat color, cel shading, vibrant colors, clean lines, highres");
            parts.push(presetPrompt);
        } else {
            parts.push("masterpiece, best quality, highres"); 
            parts.push(`(${styleSetting}:1.2)`); 
        }
        
        parts.push(appearanceSafe);
    
        if (isDuo) parts.push(userAppearance.value || "1boy, male focus");
        if (aiTags) parts.push(`(${aiTags}:1.2)`);
        
        let rawPrompt = parts.join(', ');
        let uniqueTags = [...new Set(rawPrompt.split(/[,，]/).map(t => t.replace(/[^\x00-\x7F]+/g, '').trim()).filter(t => t))];
        return uniqueTags.join(', ');
    };

    // ✅ 3. 生图总控 (接收 compositionType)
    const generateChatImage = async (sceneDescription, compositionType) => {
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        if (!imgConfig.baseUrl) return null;
        
        const userFullUrl = imgConfig.baseUrl.trim();

        try {
            if (imgConfig.provider === 'openai') {
                // OpenAI 模式
                return await generateOpenAIImage(userFullUrl, imgConfig.apiKey, imgConfig.model, sceneDescription);
            } else {
                // ComfyUI 模式：传入 compositionType
                const finalPrompt = await optimizePromptForComfyUI(sceneDescription, compositionType);
                if (!finalPrompt) return null;
                
                // 根据门卫指令决定是否开启双人
                const isDuo = (compositionType === 'DUO');
                return await Comfy.generateImage(userFullUrl, finalPrompt, isDuo);
            }
        } catch (e) { 
            console.error('生图总控异常:', e); 
            throw e;
        }
    };

    // ✅ 4. 异步处理 (新增参数)
    const handleAsyncImageGeneration = async (imgDesc, placeholderId, compositionType = 'SOLO') => {
        try {
            const imgUrl = await generateChatImage(imgDesc, compositionType);
            const idx = messageList.value.findIndex(m => m.id === placeholderId);
            
            if (idx !== -1 && imgUrl) {
                const localPath = await saveToGallery(imgUrl, chatId.value, chatName.value, imgDesc);
                messageList.value[idx] = { role: 'model', type: 'image', content: localPath, id: placeholderId };
                saveHistory(); 
                scrollToBottom();
            } else if (idx !== -1) {
                 messageList.value[idx] = { role: 'system', content: '❌ 显影失败', isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
                 saveHistory();
            }
        } catch(e) {
            const idx = messageList.value.findIndex(m => m.id === placeholderId);
             if (idx !== -1) {
                 let errText = e.message || 'API错误';
                 if (errText.includes('json')) errText = '参数格式错误';
                 messageList.value[idx] = { role: 'system', content: `❌ ${errText}`, isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
                 saveHistory();
            }
        }
    };
    
    // ✅ 5. 重试逻辑
    const retryGenerateImage = (msg) => {
        if (!msg.isError || !msg.originalPrompt) return;
        const idx = messageList.value.findIndex(m => m.id === msg.id);
        if (idx !== -1) {
            messageList.value[idx] = { role: 'system', content: '📷 重试中...', isSystem: true, id: msg.id };
            handleAsyncImageGeneration(msg.originalPrompt, msg.id);
        }
    };

    return { handleAsyncImageGeneration, retryGenerateImage };
}