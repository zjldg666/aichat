// AiChat/composables/useChatGallery.js
import { Comfy } from '@/services/comfyui.js';
import { saveToGallery } from '@/utils/gallery-save.js';
import { STYLE_PROMPT_MAP } from '@/utils/constants.js';

export function useChatGallery(context) {
    const { 
        currentRole, interactionMode, userAppearance, 
        messageList, chatId, chatName, saveHistory, scrollToBottom 
    } = context;

    const optimizePromptForComfyUI = async (actionAndSceneDescription) => {
            let aiTags = actionAndSceneDescription || "";
            const settings = currentRole.value?.settings || {};
            const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl"; 
            
            const isPhone = interactionMode.value === 'phone';
            let isDuo = false;
            
            // 🆕 新增：定义双人主体关键词 (用于判定和清洗)
            const subjectKeywords = /\b(couple|2people|1boy|boys|man|men|male|shota)\b/i;
            
            if (isPhone) {
                isDuo = false;
                // 🧹 电话模式：强制清洗掉双人主体词 (使用新定义的正则+你原本的词库)
                aiTags = aiTags.replace(subjectKeywords, "");
                aiTags = aiTags.replace(/\b(multiple|penis|testicles|cum)\b/gi, "");
                
                // 🧹 电话模式：清洗会导致双人构图的动作词 (防止 AI 幻觉)
                // 保留了你原本的 doggystyle，并补充了 sex, hug 等
                aiTags = aiTags.replace(/\b(doggystyle|missionary|paizuri|sex|fellatio|cuddling|hug)\b/gi, "kneeling, all fours");
            } else {
                // ✨ 核心修改：不再检测动作(如kiss)，而是信任 AI 输出的主体(如couple)
                isDuo = subjectKeywords.test(aiTags);
                if (isDuo) aiTags = aiTags.replace(/\bsolo\b/gi, ""); 
            }
        
            let parts = [];
            
            // ✨ 核心修改：智能补全 (查漏补缺)
            // 只有当 AI 既没写 solo 也没写 couple 时，才根据 isDuo 兜底补一个
            // 这样避免了你原本直接 parts.push(...) 可能导致的标签重复或冲突
            const hasSoloTag = /\bsolo\b/i.test(aiTags);
            const hasCoupleTag = /\b(couple|2people)\b/i.test(aiTags);
    
            if (!hasSoloTag && !hasCoupleTag) {
                parts.push(isDuo ? "couple, 2people" : "solo");
            }
            
            // 🎨 获取画风配置 (👇这里往下完全保留你原本的逻辑，不动)
            const imgConfig = uni.getStorageSync('app_image_config') || {};
            const styleSetting = imgConfig.style || 'anime';
            
            // ✨✨✨【画风注入逻辑 - 保持原样】✨✨✨
            // 1. 尝试从常量表里找预设 Prompt
            const presetPrompt = STYLE_PROMPT_MAP[styleSetting];
            
            if (presetPrompt) {
                // A. 如果是预设画风
                parts.push("masterpiece, best quality, anime style, flat color, cel shading, vibrant colors, clean lines, highres");
                parts.push(presetPrompt);
            } else {
                // B. 如果是自定义画风
                parts.push("masterpiece, best quality, highres"); 
                parts.push(`(${styleSetting}:1.2)`); 
                console.log(`🎨 [Style] 应用自定义画风: ${styleSetting}`);
            }
            
            parts.push(appearanceSafe);
        
            if (isDuo) parts.push(userAppearance.value || "1boy, male focus");
            if (aiTags) parts.push(`(${aiTags}:1.2)`);
            
            let rawPrompt = parts.join(', ');
            // 去重逻辑
            let uniqueTags = [...new Set(rawPrompt.split(/[,，]/).map(t => t.replace(/[^\x00-\x7F]+/g, '').trim()).filter(t => t))];
            return uniqueTags.join(', ');
        };

    const generateChatImage = async (sceneDescription) => {
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        if (!imgConfig.baseUrl) return null;
        
        const finalPrompt = await optimizePromptForComfyUI(sceneDescription);
        if (!finalPrompt) return null;
        
        console.log('🎨 [生图] Final Prompt:', finalPrompt);

        try {
            const isDuo = finalPrompt.includes('couple') || finalPrompt.includes('2people');
            return await Comfy.generateImage(imgConfig.baseUrl, finalPrompt, isDuo);
        } catch (e) { console.error('生图异常:', e); }
        return null;
    };

    const handleAsyncImageGeneration = async (imgDesc, placeholderId) => {
        try {
            const imgUrl = await generateChatImage(imgDesc);
            const idx = messageList.value.findIndex(m => m.id === placeholderId);
            if (idx !== -1 && imgUrl) {
                const localPath = await saveToGallery(imgUrl, chatId.value, chatName.value, imgDesc);
                messageList.value[idx] = { role: 'model', type: 'image', content: localPath, id: placeholderId };
                // 记得这里，之前这里要改
                saveHistory(); 
                scrollToBottom();
            } else if (idx !== -1) {
                 messageList.value[idx] = { role: 'system', content: '❌ 照片显影失败', isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
                 saveHistory();
            }
        } catch(e) {
            const idx = messageList.value.findIndex(m => m.id === placeholderId);
             if (idx !== -1) {
                 messageList.value[idx] = { role: 'system', content: '❌ 照片显影异常', isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
                 saveHistory();
            }
        }
    };
    
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