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
	SNAPSHOT_COMPOSITION_JUDGE,
	VISUAL_CONTENT_ANALYZER,
	 CAMERA_MAN_DUO_PROMPT
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
        interactionMode, currentRelation, 
        currentActivity, playerLocation, formattedTime,
        enableSummary, summaryFrequency, currentSummary,
        saveCharacterState, saveHistory, scrollToBottom,
        getCurrentLlmConfig,userAppearance,
        executeEvolution // ✨ 新增：传入进化函数
       
    } = context;

	
    // const lastImageGenerationTime = ref(0); // 👈 这一行多余了，因为文件顶部定义了，这里注释掉或删除
    const lastSummaryIndex = ref(0); 
    // const IMAGE_COOLDOWN_MS = 15000; // 👈 同理，顶部有了
    const isArchiving = ref(false);
	// ✨ 1. 新增：动作分析状态标记
	const isSceneAnalyzing = ref(false);
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
	// 🌟🌟🌟 新增：独立合拍处理函数 🌟🌟🌟
	    const runGroupCameraCheck = async (lastUserMsg, aiResponseText) => {
	        const config = getCurrentLlmConfig();
	        if (!config || !config.apiKey) return;
	        
	        console.log('✌️ [摄影师] 启动 (合拍模式)...');
	        
	        // 1. 文本清洗
	        const rawAiText = aiResponseText || "";
	        const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
	        const finalAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
	        
	        // 2. 准备生图工具
	        const { handleAsyncImageGeneration } = useChatGallery({ 
	            currentRole, interactionMode, messageList, chatId, chatName,
	            saveHistory, scrollToBottom, userAppearance: ref('') 
	        });
	
	        // 3. 准备变量 (性别/外貌)
	        const settings = currentRole.value?.settings || {};
	        const gender = settings.gender || '女';
	        const userGender = settings.userGender || '男';
	
	        const charTag = gender === '女' ? '1girl' : '1boy';
	        const userTag = userGender === '男' ? '1boy' : '1girl';
	        const pronoun = gender === '女' ? 'She' : 'He';
	        const possessive = gender === '女' ? 'Her' : 'His';
	
	        let fullAppearance = settings.appearance || settings.appearanceSafe || (gender === '女' ? "a beautiful girl" : "a handsome boy");
	        if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
	
	        // 4. 构建 Prompt (强制使用 DUO 模板)
	        const imgConfig = uni.getStorageSync('app_image_config') || {};
	        const isOpenAI = imgConfig.provider === 'openai';
	        const clothingDesc = settings.clothingTags ? settings.clothingTags : (currentClothing.value || "Casual");
	
	        let prompt = "";
	        
	        if (isOpenAI) {
	            // OpenAI 模式：复用 DALL-E 模板，但追加多人指令
	            prompt = CAMERA_MAN_OPENAI_PROMPT
	                .replace('{{clothes}}', clothingDesc) 
	                .replace('{{location}}', currentLocation.value || "Indoor") 
	                .replace('{{time}}', formattedTime.value)
	                .replace('{{current_action}}', currentAction.value || "Standing")
	                .replace('{{ai_msg}}', finalAiMsg)
	                .replace(/{{pronoun}}/g, pronoun) 
	                .replace(/{{possessive}}/g, possessive);
	            
	            prompt += `\n\n[Important] This is a group photo/selfie. The user (${userGender}) MUST be in the frame with the character. Interaction is key.`;
	        } else {
	            // 🔥 ComfyUI 模式：直接使用新定义的 DUO 模板 🔥
	            prompt = CAMERA_MAN_DUO_PROMPT
	                .replace('{{clothes}}', clothingDesc)
	                .replace('{{location}}', currentLocation.value || "Indoor")
	                .replace('{{time}}', formattedTime.value)
	                .replace('{{current_action}}', currentAction.value || "Standing")
	                .replace('{{char_appearance}}', fullAppearance) 
	                .replace('{{user_appearance}}', userAppearance.value || "1boy, casual clothes")
	                .replace(/{{char_tag}}/g, charTag) 
	                .replace(/{{user_tag}}/g, userTag); 
	        }
	
	        // 5. 占位符上屏
	        const pid = `img-loading-duo-${Date.now()}-${Math.random()}`;
	        messageList.value.push({ role: 'system', content: '✌️ 双人合影构图中...', isSystem: true, id: pid });
	        scrollToBottom();
	        saveHistory();
	
	        // 6. 请求与执行
	        try {
	            const res = await safeTagChat({
	                config, messages: [{ role: 'user', content: prompt }],
	                temperature: 0.5, maxTokens: 300
	            });
	
	            console.log(`✌️ [合拍] 动态描述:`, res.slice(0, 5000) + "...");
	            
	            // 提取 Prompt
	            let dynamicPart = parseTags(res, 'IMAGE_PROMPT');
	            if (!dynamicPart && res.length > 5) dynamicPart = res.replace(/Here is.*?:/i, '').trim();
	            
	            if (dynamicPart) {
	                // 直接调用生图，传入 'DUO' 标记
	                handleAsyncImageGeneration(dynamicPart, pid, 'DUO');
	            } else {
	                throw new Error("生成内容无效");
	            }
	        } catch (e) {
	            console.warn('GroupCamera failed:', e);
	            const idx = messageList.value.findIndex(m => m.id === pid);
	            if (idx !== -1) {
	                messageList.value[idx].content = '❌ 合影失败';
	                messageList.value[idx].hasError = true;
	                saveHistory();
	            }
	        }
	    };
    // =========================================================================
    // 1. 场景检查 Agent (改用标签模式 - 彻底解决报错)
    // =========================================================================
    const runSceneCheck = async (lastUserMsg, aiResponseText) => {
        if (!aiResponseText || aiResponseText.length < 3) return;
		isSceneAnalyzing.value = true;
		
		try {
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
		            
		        } catch (e) {
		            console.error('Scene Check Error:', e);
		        } finally {
		            // ✨ 3. 标记分析结束 (无论成功失败)
		            isSceneAnalyzing.value = false;
		        }
				
        
    };

    // =========================================================================
    // 2. 关系检查 Agent (改用标签模式)
    // =========================================================================
    const runRelationCheck = async (lastUserMsg, aiResponseText, recentMessages = []) => {
        if (!aiResponseText || aiResponseText.length < 5) return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
      
        // ✨ 构建更丰富的上下文给 Relation Agent
        const recentText = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        const conversationContext = `
【Recent Context】
${recentText}
【Current Interaction】
User: "${lastUserMsg}"
Character: "${aiResponseText}"`;
        
        // ✨ 准备上下文数据
        const initialRelation = currentRole.value.settings?.userRelation || "未知";
        const coreLogic = currentRole.value.settings?.personalityCore || currentRole.value.settings?.personalityNormal || "默认逻辑";
        const dynamicLogic = currentRole.value.settings?.personalityDynamic || "";
        const currentLogic = `【固定核心】\n${coreLogic}\n\n【关系动态偏置】\n${dynamicLogic || '（无额外偏置）'}`;

        const prompt = RELATIONSHIP_PROMPT
            .replace('{{initial_relation}}', initialRelation)
            .replace('{{relation}}', currentRelation.value || "初相识")
            .replace('{{current_logic}}', currentLogic)
            + `\n\n【Interaction】\n${conversationContext}`;
      
        // 🔥 使用 safeTagChat
        const res = await safeTagChat({
            config, messages: [{ role: 'user', content: prompt }],
            temperature: 0.5, maxTokens: 500
        });

        // 🟢 提取标签
        const newRelation = parseTags(res, 'RELATION');
        const newActivity = parseTags(res, 'ACTIVITY');
        const newLabel = parseTags(res, 'LABEL');
        const updateDynamic = parseTags(res, 'UPDATE_DYNAMIC');
        const updateCore = parseTags(res, 'UPDATE_CORE');

        // 🚨 【修复 Logic Gap】：不要因为没有 Relation/Activity 就直接 Return
        // 只要有 updateCore 也要继续
        const shouldUpdateDynamic = updateDynamic && updateDynamic.toUpperCase().includes('TRUE');
        const shouldUpdateCore = updateCore && updateCore.toUpperCase().includes('TRUE');

        if (!newRelation && !newActivity && !shouldUpdateDynamic && !shouldUpdateCore) {
            return;
        }

        console.log(`❤️ [心态] ${newRelation} | [标签] ${newLabel} | [UpdateDynamic] ${updateDynamic} | [UpdateCore] ${updateCore}`);
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
        if (newLabel && newLabel.length < 10 && newLabel !== "未定义") {
             if (!currentRelation.value.includes(newLabel)) {
                 currentRelation.value = `【${newLabel}】${currentRelation.value}`;
                 hasChange = true;
             }
        }
        
        // 4. 🔥 核心逻辑门卫触发器 🔥
        if (shouldUpdateDynamic || shouldUpdateCore) {
            console.log('🧬 [Gatekeeper] 检测到关系质变，触发关系动态偏置进化！');
            if (executeEvolution) {
                executeEvolution(
                    currentRole.value.settings, 
                    currentSummary.value, 
                    recentText, // <--- ✨ 传递最近上下文
                    config
                ).then(result => {
                    if (result && result.new_persona) {
                        if (!currentRole.value.settings) currentRole.value.settings = {};
                        currentRole.value.settings.personalityDynamic = result.new_persona;
                        if (!currentRole.value.settings.personalityCore && currentRole.value.settings.personalityNormal) {
                            currentRole.value.settings.personalityCore = currentRole.value.settings.personalityNormal;
                        }
                        if (currentRole.value.settings.personalityCore) {
                            currentRole.value.settings.personalityNormal = currentRole.value.settings.personalityCore;
                        }
                        
                        const currentLvl = currentRole.value.settings.evolutionLevel || 1;
                        currentRole.value.settings.evolutionLevel = currentLvl + 1;
                        
                        // 重置进度条 (可选，或者保留积累)
                        // currentRole.value.settings.evolutionProgress = 0; 
                        
                        saveCharacterState();
                        console.log('✅ [Evolution] 关系动态偏置已自动更新完毕！');
                        
                    }
                }).catch(err => {
                    console.error('❌ [Evolution] 自动进化失败:', err);
                });
            }
        }

        if (hasChange) saveCharacterState();
    };


        
    const runVisualDirectorCheck = async (lastUserMsg, aiResponseText, existingMsgId = null, sceneCheckPromise = null) => {
                // 🛡️ 1. 强力防抖：如果列表里已经有正在生成的占位符，直接拒绝，防止双重触发
                const isGenerating = messageList.value.some(m => 
                    m.isSystem && (m.content === '📷 正在构图...' || m.content === '📷 显影中...')
                );
                if (!existingMsgId && isGenerating) {
                    console.log('🚧 [生图拦截] 上一张图正在生成中...');
                    return;
                }
        
                // 2. 冷却检查
                if (!existingMsgId && Date.now() - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) return;
                
                const config = getCurrentLlmConfig();
                if (!config || !config.apiKey) return;
                
                // 3. 文本清洗
                const rawAiText = aiResponseText || "";
                const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                const promptAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
                const promptUserMsg = lastUserMsg || "";
                
                // ============================
                // A. 门卫检查 (Gatekeeper)
                // ============================
                let compositionType = 'SOLO'; // 默认值
                
                if (!existingMsgId) {
                    console.log('🕵️ [门卫] 启动检查...');
    
                    // 🔥🔥🔥 [核心修改] Face 模式下彻底阻断自动生图 🔥🔥🔥
                    // 只有 Phone 模式才允许 AI 自动发图
                    if (interactionMode.value !== 'phone') {
                        console.log('🛑 [门卫] Face模式下自动生图已禁用 (仅限手动)');
                        return;
                    }
                    
                    let gatekeeperPrompt = "";
                    const allowSelfImage = currentRole.value?.settings?.allowSelfImage !== false ? 'TRUE' : 'FALSE';
                    
                    gatekeeperPrompt = SNAPSHOT_TRIGGER_PHONE
                        .replace('{{user_msg}}', promptUserMsg)
                        .replace('{{ai_msg}}', promptAiMsg)
                        .replace('{{allow_self_image}}', allowSelfImage);
                
                    const gateRes = await safeTagChat({
                        config, messages: [{ role: 'user', content: gatekeeperPrompt }],
                        temperature: 0.1, maxTokens: 100
                    });
                    
                    let result = false;
                    const resultTag = parseTags(gateRes, 'RESULT');
                    // Phone 模式下通常是 SOLO，但保留解析能力以备扩展
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
    
                // =========================================================
                // 🔥 并行流水线同步点 (Synchronization Point)
                // =========================================================
                if (sceneCheckPromise) {
                    try {
                        await sceneCheckPromise;
                        console.log('✅ [流水线] 场景数据同步完成，开始生图。');
                    } catch (e) {
                        console.warn('⚠️ 场景同步失败，将使用旧数据继续:', e);
                    }
                }
        
                // =========================================================
                // 🗑️ B. 视觉解耦层 (已移除 - Merged into Director)
                // =========================================================
                
                let finalVisualAction = currentAction.value || "Standing";
                let finalComposition = compositionType; 
                let hardwareBan = false; 
    
                // Face 模式下的防御性硬件屏蔽 (虽然现在已经进不来了，但为了健壮性保留)
                if (interactionMode.value === 'face') {
                    hardwareBan = true;
                }
        
                // ============================
                // C. 生图逻辑 (Director)
                // ============================
                const { handleAsyncImageGeneration } = useChatGallery({ 
                    currentRole, 
                    interactionMode, 
                    messageList, 
                    chatId, 
                    chatName,
                    saveHistory, 
                    scrollToBottom,
                    userAppearance: ref('') 
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
        
                const charTag = gender === '女' ? '1girl' : '1boy';
                const userTag = userGender === '男' ? '1boy' : '1girl';
                const pronoun = gender === '女' ? 'She' : 'He';
                const possessive = gender === '女' ? 'Her' : 'His';
        
                let fullAppearance = settings.appearance || settings.appearanceSafe || (gender === '女' ? "a beautiful girl" : "a handsome boy");
                if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
                
                // 🟢 2. 构建 Prompt 给 AI
                const template = isOpenAI ? IMAGE_GENERATOR_OPENAI_PROMPT : IMAGE_GENERATOR_PROMPT;
                const clothingDesc = settings.clothingTags ? settings.clothingTags : (currentClothing.value || "Casual");
        
                if (hardwareBan) {
                    finalVisualAction += ", (holding phone:0), (holding camera:0), hands free";
                }
        
                const directorPrompt = template
                    .replace('{{clothes}}', clothingDesc) 
                    .replace('{{location}}', currentLocation.value || "Indoor") 
                    .replace('{{time}}', formattedTime.value)
                    .replace('{{user_msg}}', promptUserMsg)
                    .replace('{{ai_msg}}', promptAiMsg)
                    .replace('{{current_action}}', finalVisualAction)
                    .replace('{{composition}}', finalComposition) 
                    .replace('{{char_appearance}}', fullAppearance) 
                    .replace('{{user_appearance}}', userAppearance.value || "1boy, casual clothes") 
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
                
                        let finalPrompt = "";
                        if (isOpenAI) {
                            const stylePrefix = getOpenAIStylePrefix(imgConfig.style); 
                            finalPrompt = `${stylePrefix} ${fullAppearance}. ${dynamicPart}`;
                        } else {
                            const customPrompt = imgConfig.prompt || ""; 
                            const styleKey = imgConfig.style || 'anime';
                            let stylePart = STYLE_PROMPT_MAP[styleKey] || "";
                            if (customPrompt) stylePart = stylePart ? `${stylePart}, ${customPrompt}` : customPrompt;
                            finalPrompt = `${stylePart},\n${dynamicPart}`;
                        }
                                        
                        console.log(`🧩 [最终拼接Prompt]`, finalPrompt);
                        handleAsyncImageGeneration(finalPrompt, placeholderId, finalComposition);
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

        // 2. 替换 runCameraManCheck 函数 (专注 SOLO 模式)
            const runCameraManCheck = async (lastUserMsg, aiResponseText) => {
                // 🛑 1. 特权通道
                const config = getCurrentLlmConfig();
                if (!config || !config.apiKey) return;
                
                console.log('📸 [摄影师] 启动 (单人模式)...');
                
                // 2. 文本清洗
                const rawAiText = aiResponseText || "";
                const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                const finalAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
                
                // 上下文拼接
                let targetAction = finalAiMsg;
                if (targetAction.length < 5 && messageList.value.length >= 3) {
                    const prevMsg = messageList.value[messageList.value.length - 3]; 
                    if (prevMsg && prevMsg.role === 'model') {
                        targetAction += ` (Previous context: ${prevMsg.content})`;
                    }
                }
                
                // 准备生图工具
                const { handleAsyncImageGeneration } = useChatGallery({ 
                    currentRole, interactionMode, messageList, chatId, chatName,
                    saveHistory, scrollToBottom, userAppearance: ref('') 
                });
        
                // =========================================================
                // 🟢 [简化] 构图判定逻辑
                // =========================================================
                // 这个函数现在专注于 SOLO，所以我们默认是 SOLO。
                // 但为了保险（比如 AI 觉得现在不适合拍照），还是可以保留一个快速检查，
                // 或者直接强行 SOLO。鉴于这是“直拍”按钮触发的，我们直接强行 SOLO。
                
                let compositionType = 'SOLO'; 
        
                // Face 模式下，为了保证 POV 视角的准确性，我们依然使用 CAMERA_MAN_PROMPT
                // 它已经被修改为强制输出 POV 视角，所以不需要额外做 DUO 检测了。
                
                // =========================================================
                // 🟢 准备变量 (积木A)
                // =========================================================
                const settings = currentRole.value?.settings || {};
                const gender = settings.gender || '女';
                const userGender = settings.userGender || '男';
        
                const charTag = gender === '女' ? '1girl' : '1boy';
                const userTag = userGender === '男' ? '1boy' : '1girl';
                const pronoun = gender === '女' ? 'She' : 'He';
                const possessive = gender === '女' ? 'Her' : 'His';
        
                let fullAppearance = settings.appearance || settings.appearanceSafe || (gender === '女' ? "a beautiful girl" : "a handsome boy");
                if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
                
                // =========================================================
                // 🟢 构建 Prompt (积木B)
                // =========================================================
                const imgConfig = uni.getStorageSync('app_image_config') || {};
                const isOpenAI = imgConfig.provider === 'openai';
                const clothingDesc = settings.clothingTags ? settings.clothingTags : (currentClothing.value || "Casual");
        
                let prompt = "";
                
                if (isOpenAI) {
                    prompt = CAMERA_MAN_OPENAI_PROMPT
                        .replace('{{clothes}}', clothingDesc) 
                        .replace('{{location}}', currentLocation.value || "Indoor") 
                        .replace('{{time}}', formattedTime.value)
                        .replace('{{current_action}}', currentAction.value || "Standing")
                        .replace('{{ai_msg}}', targetAction)
                        .replace(/{{pronoun}}/g, pronoun) 
                        .replace(/{{possessive}}/g, possessive);
                    
                    // 显式追加 POV 指令
                    prompt += `\n\n[Important] This is a POV shot. Do NOT show the photographer/user. Only show the character looking at the camera.`;
        
                } else {
                    // ComfyUI 模式：使用 CAMERA_MAN_PROMPT (已修改为强制 SOLO/POV)
                    prompt = CAMERA_MAN_PROMPT
                        .replace('{{clothes}}', clothingDesc)
                        .replace('{{location}}', currentLocation.value || "Indoor")
                        .replace('{{time}}', formattedTime.value)
                        .replace('{{current_action}}', currentAction.value || "Standing")
                        .replace('{{composition}}', compositionType) // 传入 'SOLO'
                        .replace('{{char_appearance}}', fullAppearance) 
                        .replace('{{user_appearance}}', userAppearance.value || "1boy, casual clothes")
                        .replace(/{{char_tag}}/g, charTag) 
                        .replace(/{{user_tag}}/g, userTag); 
                }
                
                // 5. 占位符上屏
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
                
                    console.log(`📸 [摄影师] 动态描述生成完毕:`, res.slice(0, 50) + "...");
                
                    // 提取 Prompt
                    let dynamicPart = parseTags(res, 'IMAGE_PROMPT');
                    if (!dynamicPart && res.length > 5) dynamicPart = res.replace(/Here is.*?:/i, '').trim();
                    
                    if (dynamicPart) {
                        lastImageGenerationTime.value = Date.now();
                        
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
        
                            // 直接拼接
                            finalPrompt = `${stylePart},\n${dynamicPart}`;
                        }
                        
                        console.log(`🧩 [Final Prompt]`, finalPrompt);
                        
                        // 发起异步生图，强制传入 SOLO
                        handleAsyncImageGeneration(finalPrompt, pid, 'SOLO');
                    } else {
                        throw new Error("生成内容无效 (无 IMAGE_PROMPT 标签)");
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
			const mood = '记录中'; // 或者直接删掉这个变量，如果在 DB.execute 里需要，就传空字符串
						
			await DB.execute(
				`INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
				[Date.now(), String(roleId), fullDateStr, result.brief, rawLog, mood] // 这里的 mood 现在是字符串 '记录中'
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
        retryAgentGeneration,
		isSceneAnalyzing,
		runGroupCameraCheck
    };
}
