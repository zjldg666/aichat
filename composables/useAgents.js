// AiChat/composables/useAgents.js
import { ref } from 'vue';
import { LLM } from '@/services/llm.js';
import { DB } from '@/utils/db.js'; 
import { useChatGallery } from '@/composables/useChatGallery.js'; // 👈 必须引入这个
import { 
    SCENE_KEEPER_PROMPT, 
    RELATIONSHIP_PROMPT, 
    SNAPSHOT_TRIGGER_PHONE,
    SNAPSHOT_TRIGGER_FACE, 
    IMAGE_GENERATOR_PROMPT, 
    CAMERA_MAN_PROMPT,
    SUMMARY_PROMPT,
    IMAGE_GENERATOR_OPENAI_PROMPT,
    CAMERA_MAN_OPENAI_PROMPT, 
} from '@/utils/prompts.js';
import { STYLE_PROMPT_MAP } from '@/utils/constants.js'; // ✨ 引入画风映射表

const lastImageGenerationTime = ref(0);
const IMAGE_COOLDOWN_MS = 60 * 1000;

// 🔥🔥🔥 优化后的画风前缀 (去掉了容易导致崩坏的“墨水/厚涂”等硬核词) 🔥🔥🔥
const getOpenAIStylePrefix = (styleValue) => {
    // 默认标准日漫
    if (!styleValue || styleValue === 'anime') return "High-quality anime style illustration of";
    
    const map = {
        // 厚涂 -> 改为 "丰富色彩+绘画感"，去掉 "impasto/thick" (避免脸部像肿了)
        'impasto': "Anime style illustration with rich colors and painterly brushstrokes, detailed shading of",
        
        // 90年代 -> 保持赛璐璐风格，这通常很稳
        'retro': "Retro 90s cel-shaded anime style illustration, vintage aesthetic of",
        
        // 新海诚 -> 保持，强调光影
        'shinkai': "Masterpiece anime illustration with vibrant lighting, clouds and emotional atmosphere in the style of Makoto Shinkai, depicting",
        
        // 吉卜力 -> 保持
        'ghibli': "Studio Ghibli style animation cell illustration, hand-drawn texture of",
        
        // 古风 -> 去掉 "ink painting" (水墨)，改为 "GuFeng/东方美学"，避免画面变脏
        'gufeng': "Exquisite Chinese GuFeng anime style illustration, elegant oriental aesthetics, soft colors, detailed background of",
        
        // 水彩 -> 强调 "柔和/梦幻"
        'pastel': "Dreamy soft pastel watercolor anime illustration, delicate lines of",
        
        // 线稿 -> 强调 "精细线稿"
        'sketch': "High-quality manga sketch, clean lines, intricate details of",
        
        // 写实 -> 强调 "CG/精细度" 而不是照片真实感
        'realistic': "High-quality 2.5D CG art, semi-realistic anime style with detailed skin texture and cinematic lighting of",
        
        // 赛博朋克 -> 保持
        'cyberpunk': "Cyberpunk style anime digital art, neon lights, futuristic atmosphere of"
    };

    if (map[styleValue]) return map[styleValue];
    
    // 自定义 -> 加上 quality 词缓冲
    return `High-quality anime style illustration with ${styleValue} elements of`;
};

function parseTags(text, key) {
    if (!text) return null;
    // 匹配 [KEY] 后面直到下一个标签前或结尾的内容 (支持多行)
    const regex = new RegExp(`\\[${key}\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

// 🔧 2. 标签请求器 (不强制 JSON 模式)
async function safeTagChat({ config, messages, temperature = 0.1, maxTokens = 500 }) {
    try {
        const res = await LLM.chat({
            config, messages, 
            jsonMode: false, // 🚀 关闭 JSON 模式，使用纯文本
            temperature, maxTokens
        });
        return res || "";
    } catch (e) {
        console.warn("LLM Request Failed:", e);
        return "";
    }
}

// 🔧 3. 强力 JSON 解析器 (仅供每日总结使用)
function aggressiveJSONParse(str) {
    if (!str) return null;
    let clean = str.replace(/```json|```/g, '').trim();
    const firstOpen = clean.indexOf('{');
    if (firstOpen === -1) return null;
    clean = clean.substring(firstOpen);
    try { return JSON.parse(clean); } catch (e) {}
    const lastClose = clean.lastIndexOf('}');
    if (lastClose !== -1) {
        try { return JSON.parse(clean.substring(0, lastClose + 1)); } catch (e) {}
    }
    let fixed = clean;
    for (let i = 0; i < 3; i++) {
        fixed += "}";
        try { return JSON.parse(fixed); } catch (e) {
            try { return JSON.parse(fixed + '" }'); } catch (e2) {}
        }
    }
    return null;
}

// 🔧 4. JSON 稳定请求器 (仅供每日总结使用)
async function safeJsonChat({ config, messages, temperature = 0.1, maxTokens = 500, maxRetries = 1 }) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const res = await LLM.chat({
                config, messages, jsonMode: true, temperature, maxTokens
            });
            const json = aggressiveJSONParse(res);
            if (json) return json;
        } catch (e) {
            console.warn(`⚠️ [JSON重试 ${attempt + 1}/${maxRetries}] 请求失败...`);
        }
    }
    return null;
}


export function useAgents(context) {
    const {
        messageList, currentRole, chatName, chatId, // 👈 1. 这里加了 chatId
        currentLocation, currentClothing, currentAction,
        interactionMode, currentRelation, currentAffection, 
        currentActivity, playerLocation, formattedTime,
        enableSummary, summaryFrequency, currentSummary,
        saveCharacterState, saveHistory, scrollToBottom,
        getCurrentLlmConfig,userAppearance
       
    } = context;

    // const lastImageGenerationTime = ref(0); // 👈 这一行多余了，因为文件顶部定义了，这里注释掉或删除
    const lastSummaryIndex = ref(0); 
    // const IMAGE_COOLDOWN_MS = 15000; // 👈 同理，顶部有了
    const isArchiving = ref(false);
	
// =========================================================================
    // 🛠️ 辅助函数：构建 ComfyUI 的分块 Prompt (格式升级)
    // =========================================================================
    const buildComfyPrompt = (stylePart, subjectHeader, dynamicPart, charApp, userApp, compositionType) => {
        // 0. 👑 固定起手式 (正面提示词)
        const qualityPrefix = "";
        
        // 1. 第一层：[质量词] + [画风] + [人数Header] + [动态/环境]
        // 目标格式: masterpiece..., <style>, 
        //          1boy, 1girl, couple, indoor..., 
        //          sitting on lap...
        
        let firstLayer = qualityPrefix;
        if (stylePart) firstLayer += `, ${stylePart}`;
        
        // 换行拼接，清晰明了
        firstLayer += `,\n${subjectHeader},\n${dynamicPart}`;

        // 2. 第二层：角色固定特征 (BREAK 隔开)
        let final = firstLayer;
        if (charApp) {
            final += `\nBREAK\n${charApp}`;
        }

        // 3. 第三层：玩家固定特征 (只有在 DUO 模式下才加)
        if (compositionType === 'DUO' && userApp) {
            final += `\nBREAK\n${userApp}`;
        }
        
        // 清理可能的多余标点
        return final.replace(/,,/g, ',').replace(/\n,/g, '\n').trim();
    };
    // =========================================================================
    // 1. 场景检查 Agent (改用标签模式 - 彻底解决报错)
    // =========================================================================
    const runSceneCheck = async (lastUserMsg, aiResponseText) => {
        if (!aiResponseText || aiResponseText.length < 3) return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
      
        const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;
        
        const prompt = SCENE_KEEPER_PROMPT
            .replace('{{user_location}}', playerLocation.value || "未知") 
            .replace('{{char_location}}', currentLocation.value || "未知")        
            .replace('{{clothes}}', currentClothing.value)
            .replace('{{mode}}', interactionMode.value)
            .replace('{{current_action}}', currentAction.value || "站立/闲逛") 
            + `\n\n【Interaction】\n${conversationContext}`;
      
        // 🔥 使用 safeTagChat
        const res = await safeTagChat({
            config, messages: [{ role: 'user', content: prompt }],
            temperature: 0.1, maxTokens: 500
        });

        // 🟢 使用正则提取标签
        const newMode = parseTags(res, 'MODE');
        const newCharLoc = parseTags(res, 'CHAR_LOCATION');
        const newUserLoc = parseTags(res, 'USER_LOCATION');
        const newClothes = parseTags(res, 'CLOTHES');
        const newAction = parseTags(res, 'ACTION');
        const psychology = parseTags(res, 'PSYCHOLOGY');

        // 基础校验：如果没有提取到任何有效信息，跳过
        if (!newMode && !newCharLoc) return;

        let hasChange = false;
        
        // 1. 地点处理 (分别处理)
        if (newCharLoc && newCharLoc !== currentLocation.value) {
            currentLocation.value = newCharLoc;
            hasChange = true;
        }
        
        // 只有当 AI 明确给出了玩家的新地点，且不为空时，才更新玩家位置
        if (newUserLoc && newUserLoc.length > 1 && newUserLoc !== "未知" && newUserLoc !== playerLocation.value) {
            playerLocation.value = newUserLoc;
            hasChange = true;
        }

        // 2. 模式判定 (物理法则)
        let aiDecidedMode = newMode ? newMode.toLowerCase() : interactionMode.value;
        
        // ⚡️ 物理距离熔断: 如果两人地点不一致，强制切回 PHONE
        // 忽略简单的包含关系检测（比如 "医院" 和 "医院大厅" 算在一起），只处理明显的不同
        const isSamePlace = (locA, locB) => {
            if (!locA || !locB) return false;
            return locA === locB || locA.includes(locB) || locB.includes(locA);
        };

        if (!isSamePlace(currentLocation.value, playerLocation.value)) {
            // 如果地点不同，强制 Phone
            if (aiDecidedMode === 'face') {
                console.log(`🚧 [物理法则] 地点不一致 (${currentLocation.value} vs ${playerLocation.value})，强制修正为 PHONE`);
                aiDecidedMode = 'phone';
            }
        }

        if (aiDecidedMode && aiDecidedMode !== interactionMode.value) {
            interactionMode.value = aiDecidedMode;
            hasChange = true;
            if (aiDecidedMode === 'face') uni.vibrateShort();
        }

        // 3. 其他状态
        if (newClothes && newClothes.length < 50 && newClothes !== currentClothing.value) {
            currentClothing.value = newClothes;
            hasChange = true;
        }
        
        if (newAction && newAction !== currentAction.value) {
            currentAction.value = newAction;
            hasChange = true; 
        }
        
        if (psychology) console.log(`🧠 [AI] ${psychology}`);
        if (hasChange) saveCharacterState();
    };

    // =========================================================================
    // 2. 关系检查 Agent (改用标签模式)
    // =========================================================================
    const runRelationCheck = async (lastUserMsg, aiResponseText) => {
        if (!aiResponseText || aiResponseText.length < 5) return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
      
        const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;
        const prompt = RELATIONSHIP_PROMPT
            .replace('{{relation}}', currentRelation.value || "初相识")
            .replace('{{activity}}', currentActivity.value || "互动")
            + `\n\n【Interaction】\n${conversationContext}`;
      
        // 🔥 使用 safeTagChat
        const res = await safeTagChat({
            config, messages: [{ role: 'user', content: prompt }],
            temperature: 0.5, maxTokens: 500
        });

        // 🟢 提取标签
        const newRelation = parseTags(res, 'RELATION');
        const newActivity = parseTags(res, 'ACTIVITY');
        const newLabel = parseTags(res, 'LABEL'); // ✨ 新增提取

        if (!newRelation && !newActivity) return;

        console.log(`❤️ [心态] ${newRelation} | [标签] ${newLabel} | ${newActivity}`);
        let hasChange = false;
        
        // 1. 更新心理状态
        if (newRelation && newRelation !== currentRelation.value) {
            currentRelation.value = newRelation;
            hasChange = true;
        }
        
        // 2. 更新动作
        if (newActivity && newActivity !== currentActivity.value) {
            currentActivity.value = newActivity;
            hasChange = true;
        }

        // 3. ✨ 新增：如果检测到明确的社会关系标签变化，也保存到 relation 字段（可选）
        // 这里我们可以选择把 Label 拼接到 Relation 前面，或者单独存
        // 为了兼容性，暂时不强制覆盖 Relation，但可以考虑存入 settings 或者追加到 Relation
        if (newLabel && newLabel.length < 10 && newLabel !== "未定义") {
             // 简单的追加逻辑，让 Relation 字段包含标签信息
             if (!currentRelation.value.includes(newLabel)) {
                 currentRelation.value = `【${newLabel}】${currentRelation.value}`;
                 hasChange = true;
             }
        }

        if (hasChange) saveCharacterState();
    };


        
    const runVisualDirectorCheck = async (lastUserMsg, aiResponseText, existingMsgId = null) => {
        // 1. 冷却检查
        if (!existingMsgId && Date.now() - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) return;
        
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
        
        // 2. 文本清洗
        const rawAiText = aiResponseText || "";
        const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        const promptAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
        const promptUserMsg = lastUserMsg || "";
        
        // ============================
        // A. 门卫检查 (Gatekeeper)
        // ============================
        let compositionType = 'SOLO'; 
        
        if (!existingMsgId) {
            console.log('🕵️ [门卫] 启动检查...');
            
            let gatekeeperPrompt = "";
            if (interactionMode.value === 'phone') {
                // 默认允许主动发图，除非明确禁止
                const allowSelfImage = currentRole.value?.settings?.allowSelfImage !== false ? 'TRUE' : 'FALSE';
                gatekeeperPrompt = SNAPSHOT_TRIGGER_PHONE
                    .replace('{{user_msg}}', promptUserMsg)
                    .replace('{{ai_msg}}', promptAiMsg)
                    .replace('{{allow_self_image}}', allowSelfImage);
            } else {
                gatekeeperPrompt = SNAPSHOT_TRIGGER_FACE
                    .replace('{{user_msg}}', promptUserMsg)
                    .replace('{{ai_msg}}', promptAiMsg);
            }
        
            const gateRes = await safeTagChat({
                config, messages: [{ role: 'user', content: gatekeeperPrompt }],
                temperature: 0.1, maxTokens: 100
            });
            
            let result = false;
            const resultTag = parseTags(gateRes, 'RESULT');
            const compTag = parseTags(gateRes, 'COMPOSITION');
            if (compTag && compTag.toUpperCase().includes('DUO')) {
                compositionType = 'DUO';
            }
            const looseMatch = /\bTRUE\b/i.test(gateRes); 
        
            if ((resultTag && resultTag.toUpperCase().includes('TRUE')) || looseMatch) {
                result = true;
            }
            console.log(result ? `✅ [门卫] 通过 (构图: ${compositionType})` : '🚫 [门卫] 拦截');
            if (!result) return;
        }
        
        // ============================
        // B. 生图逻辑 (Director)
        // ============================
        // 🔥 3. 这里的 useChatGallery 需要传入完整参数 (特别是 chatId)
        const { handleAsyncImageGeneration, retryGenerateImage } = useChatGallery({ 
            currentRole, 
            interactionMode, 
            messageList, 
            chatId, // ✅ 核心修复：传入了 chatId
            chatName,
            saveHistory, 
            scrollToBottom,
            userAppearance: ref('') // 补一个默认值防止报错
        });
        
        let placeholderId = existingMsgId;
        if (!placeholderId) {
            placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
            messageList.value.push({ role: 'system', content: '📷 正在构图...', isSystem: true, id: placeholderId });
        }
        scrollToBottom();
        saveHistory();
        
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        const isOpenAI = imgConfig.provider === 'openai';
        
        // 🟢 1. 获取性别与样貌
        const settings = currentRole.value?.settings || {};
        const gender = settings.gender || '女';
        const userGender = settings.userGender || '男';

        // 变量映射
        const charTag = gender === '女' ? '1girl' : '1boy';
        const userTag = userGender === '男' ? '1boy' : '1girl';
        const pronoun = gender === '女' ? 'She' : 'He';
        const possessive = gender === '女' ? 'Her' : 'His';

        let fullAppearance = settings.appearance || settings.appearanceSafe || (gender === '女' ? "a beautiful girl" : "a handsome boy");
        if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
        
        // 🟢 2. 构建 Prompt 给 AI (只问动作 积木B)
        const template = isOpenAI ? IMAGE_GENERATOR_OPENAI_PROMPT : IMAGE_GENERATOR_PROMPT;
        
        // 🛠️ 优先使用英文 Tags，否则降级使用中文描述 (防止中文污染 Prompt)
        const clothingDesc = settings.clothingTags ? settings.clothingTags : (currentClothing.value || "Casual");

        const directorPrompt = template
            .replace('{{clothes}}', clothingDesc) 
            .replace('{{location}}', currentLocation.value || "Indoor") 
            .replace('{{time}}', formattedTime.value)
            .replace('{{user_msg}}', promptUserMsg)
            .replace('{{ai_msg}}', promptAiMsg)
            .replace('{{current_action}}', currentAction.value || "Standing")
            .replace('{{composition}}', compositionType) // ✨ 注入构图
            .replace('{{char_appearance}}', fullAppearance) // ✨ 注入角色外观
            .replace('{{user_appearance}}', userAppearance.value || "1boy, casual clothes") // ✨ 注入玩家外观
            .replace(/{{char_tag}}/g, charTag) 
            .replace(/{{user_tag}}/g, userTag) 
            .replace(/{{pronoun}}/g, pronoun)   
            .replace(/{{possessive}}/g, possessive); 
        
        try {
            const dirRes = await safeTagChat({
                config, messages: [{ role: 'user', content: directorPrompt }],
                temperature: 0.7, maxTokens: 300
            });
        
            console.log(`🎨 [导演] 动态部分生成:`, dirRes);
            let dynamicPart = parseTags(dirRes, 'IMAGE_PROMPT');
            if (!dynamicPart && dirRes.length > 5) dynamicPart = dirRes.replace(/Here is.*?:/i, '').trim();
        
            if (dynamicPart) {
                lastImageGenerationTime.value = Date.now();
                const idx = messageList.value.findIndex(m => m.id === placeholderId);
                if (idx !== -1) messageList.value[idx].content = '📷 显影中...';
        
                // 🔥🔥🔥 核心拼接修改开始 🔥🔥🔥
                                let finalPrompt = "";
                                if (isOpenAI) {
                                    // OpenAI 暂不支持 BREAK，保持原样或自行调整
                                    const stylePrefix = getOpenAIStylePrefix(imgConfig.style); 
                                    finalPrompt = `${stylePrefix} ${fullAppearance}. ${dynamicPart}`;
                                } else {
                                                    // 🔥 ComfyUI 组装 🔥
                                                    const customPrompt = imgConfig.prompt || ""; 
                                                    const styleKey = imgConfig.style || 'anime';
                                                    let stylePart = STYLE_PROMPT_MAP[styleKey] || "";
                                                    if (customPrompt) stylePart = stylePart ? `${stylePart}, ${customPrompt}` : customPrompt;
                                                    
                                                    // 新版直接拼接: Style + AI生成的完整Block
                                                    finalPrompt = `${stylePart},\n${dynamicPart}`;
                                                }
                                
                                console.log(`🧩 [最终拼接Prompt]`, finalPrompt);
                                handleAsyncImageGeneration(finalPrompt, placeholderId, compositionType);
            } else {
                throw new Error("生成内容无效");
            }
        } catch (e) {
            console.warn('Director failed:', e);
            const idx = messageList.value.findIndex(m => m.id === placeholderId);
            if (idx !== -1) {
                messageList.value[idx].content = '❌ 构图失败';
                messageList.value[idx].hasError = true;
                messageList.value[idx].retryContext = { lastUserMsg, aiResponseText: rawAiText };
                saveHistory();
            }
        }
    };

    const retryAgentGeneration = async (msg) => {
        if (msg.isLogicError && msg.retryContext) {
            console.log('🔄 触发 AI 重新构图...');
            await runVisualDirectorCheck(
                msg.retryContext.lastUserMsg, 
                msg.retryContext.aiResponseText, 
                msg.id
            );
        }
    };

        
    // 2. 替换 runCameraManCheck 函数
    const runCameraManCheck = async (lastUserMsg, aiResponseText) => {
            // 🛑 1. 特权通道
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) return;
            
            console.log('📸 [摄影师] 启动 (拼接模式)...');
            
            // 2. 文本清洗
            const rawAiText = aiResponseText || "";
            const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            const finalAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
            
            let targetAction = finalAiMsg;
            if (targetAction.length < 5 && messageList.value.length >= 3) {
                    const prevMsg = messageList.value[messageList.value.length - 3]; 
                    if (prevMsg && prevMsg.role === 'model') {
                        targetAction += ` (Previous context: ${prevMsg.content})`;
                    }
            }
            
            // 🔥 4. 这里同样修复了 useChatGallery 的调用参数
            const { handleAsyncImageGeneration, retryGenerateImage } = useChatGallery({ 
                currentRole, 
                interactionMode, 
                messageList, 
                chatId, // ✅ 传入 chatId
                chatName,
                saveHistory, 
                scrollToBottom,
                userAppearance: ref('') 
            });
            
            // 🟢 3. 获取固定样貌 (积木A)
            const settings = currentRole.value?.settings || {};
            const gender = settings.gender || '女';
            const userGender = settings.userGender || '男';
    
            // 变量映射
            const charTag = gender === '女' ? '1girl' : '1boy';
            const userTag = userGender === '男' ? '1boy' : '1girl';
            const pronoun = gender === '女' ? 'She' : 'He';
            const possessive = gender === '女' ? 'Her' : 'His';
    
            let fullAppearance = settings.appearance || settings.appearanceSafe || (gender === '女' ? "a beautiful girl" : "a handsome boy");
            if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
            
            // 构图模式
            let compositionType = interactionMode.value === 'phone' ? 'SOLO' : 'DUO';
            
            // 🟢 4. 构建 Prompt 给 AI (只问动态 积木B)
            const imgConfig = uni.getStorageSync('app_image_config') || {};
            const isOpenAI = imgConfig.provider === 'openai';
            
            // 🛠️ 优先使用英文 Tags
            const clothingDesc = settings.clothingTags ? settings.clothingTags : (currentClothing.value || "Casual");
    
            let prompt = "";
            if (isOpenAI) {
                // 使用新的 CAMERA_MAN_OPENAI_PROMPT (不含样貌变量)
                prompt = CAMERA_MAN_OPENAI_PROMPT
                    .replace('{{clothes}}', clothingDesc) 
                    .replace('{{location}}', currentLocation.value || "Indoor") 
                    .replace('{{time}}', formattedTime.value)
                    .replace('{{current_action}}', currentAction.value || "Standing")
                    .replace('{{ai_msg}}', targetAction)
                    .replace(/{{pronoun}}/g, pronoun) // ✨ 注入
                    .replace(/{{possessive}}/g, possessive); // ✨ 注入
					// 🔥 【新增】追加指令，让 AI 决定是单人还是双人构图
					        prompt += `\n\n【Mandatory Composition Check】
					        Determine if the user/photographer is visible in the shot based on the action/context.
					        - If it's a selfie of two people, hugging, holding hands, or user is in frame -> Output: [COMPOSITION] DUO
					        - If it's a POV shot, solo portrait, or user is just holding camera -> Output: [COMPOSITION] SOLO
					        
					        Return format:
					        [COMPOSITION] SOLO
					        [IMAGE_PROMPT] ...tags...`;
            } else {
                // ComfyUI 使用新版多行 Prompt
                prompt = CAMERA_MAN_PROMPT
                    .replace('{{clothes}}', clothingDesc)
                    .replace('{{location}}', currentLocation.value || "Indoor")
                    .replace('{{time}}', formattedTime.value)
                    .replace('{{current_action}}', currentAction.value || "Standing")
                    .replace('{{composition}}', compositionType) // ✨ 注入
                    .replace('{{char_appearance}}', fullAppearance) // ✨ 注入
                    .replace('{{user_appearance}}', userAppearance.value || "1boy, casual clothes") // ✨ 注入
                    .replace(/{{char_tag}}/g, charTag) 
                    .replace(/{{user_tag}}/g, userTag); 
            }
            
            // 5. 占位符
            const pid = `img-loading-${Date.now()}-${Math.random()}`;
            messageList.value.push({ role: 'system', content: '📸 快门已按下...', isSystem: true, id: pid });
            scrollToBottom();
            saveHistory();
            
            // 6. 请求与拼接
            try {
                        const res = await safeTagChat({
                            config, messages: [{ role: 'user', content: prompt }],
                            temperature: 0.5, maxTokens: 300
                        });
                    
                        console.log(`📸 [摄影师] 返回:`, res);
                        
                        // 1. 🔥【新增】提取构图标签 (AI 说了算)
                        const compTag = parseTags(res, 'COMPOSITION');
                        if (compTag && (compTag.includes('DUO') || compTag.includes('SOLO'))) {
                            compositionType = compTag.trim().toUpperCase();
                            console.log(`📸 [构图判定] AI决定为: ${compositionType}`);
                        }
            
                        // 2. 提取 Prompt
                        let dynamicPart = parseTags(res, 'IMAGE_PROMPT');
                        if (!dynamicPart && res.length > 5) dynamicPart = res.replace(/Here is.*?:/i, '').trim();
                        
                        // 清理掉 dynamicPart 里可能自己生成的 1girl/1boy 开头 (避免重复)
                        if (dynamicPart) {
                             dynamicPart = dynamicPart.replace(/^(1girl|1boy|couple|duo),/i, '').trim();
                        }
                    
                        if (dynamicPart) {
                            lastImageGenerationTime.value = Date.now();
                            // 这里的 pid 是你在上面定义的 const pid = ...
                            const idx = messageList.value.findIndex(m => m.id === pid);
                            if (idx !== -1) messageList.value[idx].content = '📸 显影中...';
                            
                            let finalPrompt = "";
                            if (isOpenAI) {
                                const stylePrefix = getOpenAIStylePrefix(imgConfig.style); 
                                finalPrompt = `${stylePrefix} ${fullAppearance}. ${dynamicPart}`;
                            } else {
                                                // 🔥 ComfyUI 组装 🔥
                                                const customPrompt = imgConfig.prompt || ""; 
                                                const styleKey = imgConfig.style || 'anime';
                                                let stylePart = STYLE_PROMPT_MAP[styleKey] || "";
                                                if (customPrompt) stylePart = stylePart ? `${stylePart}, ${customPrompt}` : customPrompt;
                            
                                                // 新版直接拼接: Style + AI生成的完整Block
                                                finalPrompt = `${stylePart},\n${dynamicPart}`;
                                            }
                            
                            console.log(`🧩 [Camera Prompt]`, finalPrompt);
                            
                            // ✅ 【修复】这里改回 pid
                            handleAsyncImageGeneration(finalPrompt, pid, compositionType);
                        } else {
                            throw new Error("生成内容无效");
                        }
            } catch (e) {
                console.warn('CameraMan failed:', e);
                const idx = messageList.value.findIndex(m => m.id === pid);
                if (idx !== -1) {
                    messageList.value[idx].content = '❌ 拍照失败';
                    messageList.value[idx].hasError = true;
                    saveHistory();
                }
            }
        };

    // =========================================================================
    // 5. 日常流水账 (Text Only - 保持原样)
    // =========================================================================
    const checkAndRunSummary = async () => {
        if (!enableSummary.value) return;
        const listLen = messageList.value.length;
        const freq = summaryFrequency.value || 20;
        
        if (listLen - lastSummaryIndex.value >= freq) {
            console.log(`📝 [Memory] 触发自动总结...`);
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) return;
            
            const recentMsgs = messageList.value.slice(-(freq + 5)).filter(m => !m.isSystem && m.type !== 'image');
            if (recentMsgs.length < 5) return; 
            const conversationText = recentMsgs.map(m => {
                const roleName = m.role === 'user' ? '玩家' : chatName.value;
                return `${roleName}: ${m.content}`;
            }).join('\n');
            const prompt = SUMMARY_PROMPT
                .replace('{{previous_summary}}', currentSummary.value || "暂无早期记忆")
                .replace('{{recent_messages}}', conversationText);
            
            try {
                lastSummaryIndex.value = listLen; 
                const newSummary = await LLM.chat({
                    config: config,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3, maxTokens: 1000
                });
                if (newSummary && newSummary.length > 5) {
                    saveCharacterState(undefined, undefined, newSummary);
                    console.log('✅ [Memory] 更新:', newSummary.slice(0, 30) + '...');
                }
            } catch (e) {
                console.warn('Memory error:', e);
                lastSummaryIndex.value = listLen - freq; 
            }
        }
    };

    // =========================================================================
    // 6. 每日结算 (🌟保持 JSON 模式🌟)
    // =========================================================================
    // 解释：每日结算需要生成结构化数据存库 (brief, mood 等)，用 JSON 是最合适的。
    // 而且它是后台任务，不需要实时性，我们保留了 safeJsonChat 重试机制。
    const runDayEndSummary = async () => {
        isArchiving.value = true;
        console.log(`🌙 [Daily Summary] 开始归档...`);
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
            isArchiving.value = false;
            return;
        }
        const now = new Date();
        const datePart = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
        const fullDateStr = `${datePart} ${formattedTime.value.split(' ')[0] || '未知'}`; 
        const rawLog = currentSummary.value || "今日暂无重要互动记录。";

        const prompt = `
        [System Command: MEMORY_ANALYZER]
        Current Date: {{full_date_str}}
        Target Character: {{role_name}}
        【Input Logs】
        {{raw_log}}
        【Objective】
        Task 1: Generate Brief (标题, 中文, 分号分隔, 忽略日常)
        Task 2: Update Impression (长期印象)
        【Output Format JSON】
        { "brief": "...", "new_memory": "..." }
        `;

        // 🔥 继续使用 safeJsonChat，因为这里 Prompt 依然请求 JSON
        const result = await safeJsonChat({
            config,
            messages: [{ role: 'user', content: prompt
                .replace('{{full_date_str}}', fullDateStr)
                .replace('{{role_name}}', chatName.value)
                .replace('{{raw_log}}', rawLog) 
            }],
            temperature: 0.1, maxTokens: 1000
        });

        if (result) {
            saveCharacterState(undefined, undefined, result.new_memory);
            const roleId = currentRole.value.id || 'default';
            const mood = (currentAffection.value > 60) ? '开心' : '平静';
            
            await DB.execute(
                `INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
                [Date.now(), String(roleId), fullDateStr, result.brief, rawLog, mood]
            );
            console.log('✅ [DB] 归档完成:', result.brief);
            const initialSummary = `**今日生活账本 (${fullDateStr})**:\n- [00:00]: 新的一天开始。`; 
            saveCharacterState(undefined, undefined, initialSummary);
            if (typeof lastSummaryIndex !== 'undefined') lastSummaryIndex.value = messageList.value.length; 
        }
        isArchiving.value = false;
    };

    // =========================================================================
    // 7. 记忆检索 (Text Only)
    // =========================================================================
    const checkHistoryRecall = async (userMsg) => {
        if (!userMsg || userMsg.length < 4) return null;
        const recallKeywords = ['记得', '上次', '以前', '那天', '回忆', '之前', '过往', '当时', '旧事','昨天','前天','上周','上月'];
        if (!recallKeywords.some(key => userMsg.includes(key))) return null;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return null;
        const roleId = String(currentRole.value.id || 'default');
        const userLimit = currentRole.value.diaryHistoryLimit || 7; 
 
        try {
            const logs = await DB.select(
                `SELECT * FROM diaries WHERE roleId = ? ORDER BY id DESC LIMIT ${userLimit}`,
                [roleId]
            );
            if (!logs || logs.length === 0) return null;
            const indexList = logs.map((log, i) => `ID_${i}: [${log.dateStr}] ${log.brief}`).join('\n');
            const prompt = `[System: Memory Retrieval]\nUser: "${userMsg}"\nDiaries:\n${indexList}\nIf user asks about past details, return ONLY the ID (e.g. ID_0). Otherwise return NO.`;
            const res = await LLM.chat({ config, messages: [{ role: 'user', content: prompt }], temperature: 0.1, maxTokens: 50 });
            if (res.includes('ID_')) {
                const match = res.match(/ID_(\d+)/);
                if (match) {
                    const targetLog = logs[parseInt(match[1])];
                    return targetLog ? targetLog.detail : null;
                }
            }
        } catch (e) { console.error('Recall failed:', e); }
        return null;
    };
    
    // 8. 显性记忆上下文
    const fetchActiveMemoryContext = async () => {
        const roleId = String(currentRole.value.id || 'default');
        const days = currentRole.value.activeMemoryDays || 3;
        if (days <= 0) return "";
        try {
            const logs = await DB.select(
                `SELECT dateStr, brief FROM diaries WHERE roleId = ? ORDER BY id DESC LIMIT ${days}`,
                [roleId]
            );
            if (!logs || logs.length === 0) return "";
            const sortedLogs = logs.reverse();
            const memoryBlock = sortedLogs.map(log => `[${log.dateStr}]: ${log.brief}`).join('\n');
            return `【Recent Memories (${days} days range)】\n${memoryBlock}`;
        } catch (e) { return ""; }
    };

    return {
        runSceneCheck,
        runRelationCheck,
        runVisualDirectorCheck,
        runCameraManCheck,
        checkAndRunSummary,
        runDayEndSummary,
        checkHistoryRecall,
        isArchiving,
        fetchActiveMemoryContext,
        retryAgentGeneration
    };
}