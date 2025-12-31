// AiChat/composables/useAgents.js
import { ref } from 'vue';
import { LLM } from '@/services/llm.js';
import { DB } from '@/utils/db.js'; 
import { useChatGallery } from '@/composables/useChatGallery.js'; // 👈 必须引入这个
import { 
    SCENE_KEEPER_PROMPT, 
    RELATIONSHIP_PROMPT, 
    SNAPSHOT_TRIGGER_PHONE, // 👈 新增
    SNAPSHOT_TRIGGER_FACE,  // 👈 新增
    IMAGE_GENERATOR_PROMPT, 
    CAMERA_MAN_PROMPT,
    SUMMARY_PROMPT,
    IMAGE_GENERATOR_OPENAI_PROMPT,
    CAMERA_MAN_OPENAI_PROMPT, 
} from '@/utils/prompts.js';

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
    // 匹配 [KEY] 后面直到行尾或下一个标签前的内容
    const regex = new RegExp(`\\[${key}\\]\\s*(.+)`, 'i');
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
        getCurrentLlmConfig,sceneParticipants
        // handleAsyncImageGeneration // 👈 2. 移除了这个，防止冲突
    } = context;

    // const lastImageGenerationTime = ref(0); // 👈 这一行多余了，因为文件顶部定义了，这里注释掉或删除
    const lastSummaryIndex = ref(0); 
    // const IMAGE_COOLDOWN_MS = 15000; // 👈 同理，顶部有了
    const isArchiving = ref(false);

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

        // 🟢 使用正则提取标签，不再解析 JSON
        const newMode = parseTags(res, 'MODE');
        const newLoc = parseTags(res, 'LOCATION');
        const newClothes = parseTags(res, 'CLOTHES');
        const newAction = parseTags(res, 'ACTION');
        const psychology = parseTags(res, 'PSYCHOLOGY');

        // 基础校验：如果没有提取到任何有效信息，跳过
        if (!newMode && !newLoc) return;

        let hasChange = false;
        
        // 1. 地点处理
        const charHomeAddress = currentRole.value?.location || "角色家"; 
        let suggestedLoc = newLoc || currentLocation.value;
        
        // (原有逻辑：地点关键词对齐)
        const homeKeywords = ['家', '卧室', '客厅', '厨房', '浴室', '玄关', '门口', '洗手间'];
        if (homeKeywords.some(key => suggestedLoc.includes(key))) {
            if (suggestedLoc !== charHomeAddress && !suggestedLoc.includes(charHomeAddress)) {
                // 可选：强制对齐
            }
        }
        if (suggestedLoc !== currentLocation.value) {
            currentLocation.value = suggestedLoc;
            hasChange = true;
        }

        // 2. 模式判定 (包含 301/302 修复逻辑)
        let aiDecidedMode = newMode ? newMode.toLowerCase() : interactionMode.value;
        
        // ⚡️ 数字熔断
        const getNum = (s) => (s && s.match(/\d+/) ? s.match(/\d+/)[0] : null);
        const numA = getNum(suggestedLoc);
        const numB = getNum(playerLocation.value);
        if (numA && numB && numA !== numB) {
            if (aiDecidedMode === 'face') aiDecidedMode = 'phone';
        }

        if (aiDecidedMode && aiDecidedMode !== interactionMode.value) {
            interactionMode.value = aiDecidedMode;
            hasChange = true;
            if (aiDecidedMode === 'face') uni.vibrateShort();
        }

        if (interactionMode.value === 'face' && suggestedLoc !== playerLocation.value) {
             playerLocation.value = suggestedLoc;
             hasChange = true;
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

        if (!newRelation && !newActivity) return;

        console.log(`❤️ [心态] ${newRelation} | ${newActivity}`);
        let hasChange = false;
        if (newRelation && newRelation !== currentRelation.value) {
            currentRelation.value = newRelation;
            hasChange = true;
        }
        if (newActivity && newActivity !== currentActivity.value) {
            currentActivity.value = newActivity;
            hasChange = true;
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
                // A. 门卫检查
                // ============================
                let compositionType = 'SOLO'; 
        
				if (!existingMsgId) {
						console.log('🕵️ [门卫] 启动检查...');
						const isPhone = interactionMode.value === 'phone'; // 👈 明确模式
						
						// 获取权限
						const s = currentRole.value?.settings || {};
						const allowSelfImage = s.allowSelfImage === true; 
			
						// 🔥🔥🔥 核心修改：物理分流 (If-Else) 🔥🔥🔥
						let gatekeeperPrompt = "";
			
						if (isPhone) {
							// === 📱 手机模式 ===
							// 逻辑：玩家索取 + 角色主动(带权限检测)
							gatekeeperPrompt = SNAPSHOT_TRIGGER_PHONE
								.replace('{{user_msg}}', promptUserMsg)
								.replace('{{ai_msg}}', promptAiMsg)
								.replace('{{allow_self_image}}', allowSelfImage ? 'TRUE' : 'FALSE');
						} else {
							// === 📷 当面模式 ===
							// 逻辑：仅限玩家发起 (无视角色权限，防止动作误判)
							gatekeeperPrompt = SNAPSHOT_TRIGGER_FACE
								.replace('{{user_msg}}', promptUserMsg)
								.replace('{{ai_msg}}', promptAiMsg);
						}
			
						const gateRes = await safeTagChat({
							config, messages: [{ role: 'user', content: gatekeeperPrompt }],
							temperature: 0.1, maxTokens: 100
						});
			
						// 解析结果
						let result = false;
						const resultTag = parseTags(gateRes, 'RESULT');
						const looseMatch = /\bTRUE\b/i.test(gateRes);
			
						if ((resultTag && resultTag.toUpperCase().includes('TRUE')) || looseMatch) {
							result = true;
						}
						
						console.log(result 
							? `✅ [门卫] 允许拍照 (Mode: ${isPhone ? 'Phone' : 'Face'})` 
							: `🚫 [门卫] 拦截 (Mode: ${isPhone ? 'Phone' : 'Face'})`
						);
						
						if (!result) return;
					}
        
                // ============================
                // B. 生图逻辑
                // ============================
                const { handleAsyncImageGeneration } = useChatGallery({
                    currentRole, interactionMode, messageList, chatId, chatName,
                    saveHistory, scrollToBottom, userAppearance: ref('')
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
                const settings = currentRole.value?.settings || {};
        
                // 🟢 1. 角色样貌
                let fullAppearance = settings.appearance || settings.appearanceSafe || "1girl, beautiful face";
                if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
                
                // 简单排雷 sid
                if (fullAppearance.includes('sid,')) {
                     const parts = fullAppearance.split('sid,');
                     if (parts.length > 1) fullAppearance = parts[1].trim(); 
                }
        
                // 🟢 2. 玩家特征准备 (去重)
                const charFeat = settings.charFeatures || {};
                const isNsfwAllowed = charFeat.wearStatus === '暴露/H';
                const rawUserApp = settings.userAppearance || "short hair, black hoodie";
                const playerNsfwKeywords = ['penis', 'cock', 'erection', 'testicles', 'balls', 'pubic hair', 'cum', 'glans'];
                
                let userAppSafe = [];
                let userAppNsfw = [];
                rawUserApp.split(',').forEach(tag => {
                    // 去掉 '1boy' 防止重复
                    const t = tag.trim().replace(/\b1boy\b/gi, '').replace(/,/g, '').trim();
                    if (t) {
                        if (playerNsfwKeywords.some(k => t.toLowerCase().includes(k))) userAppNsfw.push(t);
                        else userAppSafe.push(t);
                    }
                });
                const userAppSafeStr = userAppSafe.join(', ');
                const userAppNsfwStr = userAppNsfw.join(', ');
        
                // 🟢 3. 准备 Prompt 变量
                const clothesStr = currentClothing.value || "casual clothes"; 
        
                const template = isOpenAI ? IMAGE_GENERATOR_OPENAI_PROMPT : IMAGE_GENERATOR_PROMPT;
                const directorPrompt = template
                    .replace('{{clothes}}', clothesStr) 
                    .replace('{{location}}', currentLocation.value || "Indoor")
                    .replace('{{time}}', formattedTime.value)
                    .replace('{{user_msg}}', promptUserMsg)
                    .replace('{{ai_msg}}', promptAiMsg)
                    .replace('{{current_action}}', currentAction.value || "Standing");
        
                try {
                    const dirRes = await safeTagChat({
                        config, messages: [{ role: 'user', content: directorPrompt }],
                        temperature: 0.7, maxTokens: 300
                    });
        
                    console.log(`🎨 [导演] 原始输出:`, dirRes);
                    let dynamicPart = parseTags(dirRes, 'IMAGE_PROMPT');
                    if (!dynamicPart && dirRes.length > 5) dynamicPart = dirRes.replace(/Here is.*?:/i, '').trim();
        
                    if (dynamicPart) {
                        lastImageGenerationTime.value = Date.now();
                        const idx = messageList.value.findIndex(m => m.id === placeholderId);
                        if (idx !== -1) messageList.value[idx].content = '📷 显影中...';
        
                        // 🔥🔥🔥 [清洗逻辑] 🔥🔥🔥
                        
                        // 1. 判定人数
                        const duoKeywords = [
                            '1boy', '2people', 'couple', 'hugging', 'kissing', 
                            'holding hands', 'sex', 'penis', 'leaning on', 'on top of', 'being held'
                        ];
                        const isContentDuo = duoKeywords.some(k => dynamicPart.toLowerCase().includes(k));
        
                        if (isContentDuo) {
                            compositionType = 'DUO';
                            console.log(`⚖️ [内容判定] 检测到双人词 -> 切换为 DUO`);
                        } else {
                            compositionType = 'SOLO';
                            console.log(`⚖️ [内容判定] 未检测到双人词 -> 保持 SOLO`);
                        }
        
                        // 2. 基础去重
                        dynamicPart = dynamicPart
                            .replace(/\b(couple|2people|2girls|2boys)\b/gi, '') 
                            .replace(/,\s*,/g, ',') 
                            .trim();
                        
                        // 3. 移除 Dynamic 里的 1girl (防止女主分身)
                        if (compositionType === 'DUO') {
                             dynamicPart = dynamicPart.replace(/\b1girl\b/gi, ''); 
                        }
        
                        // 4. 移除手机 (POV)
                        dynamicPart = dynamicPart
                            .replace(/\b(holding (smart)?phone|looking at (smart)?phone|smartphone|saving photo)\b/gi, '')
                            .replace(/,\s*,/g, ',');
        
                        // 5. 强制视线补全
                        if (!dynamicPart.includes('looking at viewer')) {
                            dynamicPart = "looking at viewer, " + dynamicPart;
                        }
        
                        // 6. R18 检测
                        const dynamicNsfwRegex = /\b(naked|nude|sex|fuck|fellatio|blowjob|cunnilingus|penetration|cum|orgasm|nipples?|pussy|vagina|penis|cock|erection|undressing|exposing)\b/i;
                        const isNsfwScene = dynamicNsfwRegex.test(dynamicPart);
        
                        // === 最终拼接 (The Assembly) ===
                        let finalPrompt = "";
                        if (isOpenAI) {
                            const stylePrefix = getOpenAIStylePrefix(imgConfig.style);
                            finalPrompt = `${stylePrefix} ${fullAppearance}. Wearing ${clothesStr}. ${dynamicPart}. 1boy, ${userAppSafeStr}`;
                        } else {
                            const STYLE_HEADER = "(masterpiece, best quality), anime coloring, cel shading, flat color, simple background";
                            let girlBlock = fullAppearance.replace(/1girl,?/gi, '').trim();
        
                            let promptParts = [];
                            promptParts.push(STYLE_HEADER);
        
                            if (compositionType === 'DUO') {
                                promptParts.push("2people, couple"); 
                                promptParts.push(`1girl, ${girlBlock}`); 
                                // ❌ 坚决不加 Header 位的 Boy Block
                            } else {
                                promptParts.push("solo, focus on girl");
                                promptParts.push(`1girl, ${girlBlock}`);
                            }
        
                            // 1. 先放动作 (Dynamic Part)
                            // e.g. "standing, being held by 1boy, pinching 1boy's cheek"
                            promptParts.push(dynamicPart); 
        
                            // 2. 🔥🔥🔥 [尾部补全] 🔥🔥🔥
                            // 在整个 Prompt 的最后面，加上男主的样貌定义。
                            // 这样 SD 会把这些特征应用到前面动作里提到的 1boy 身上。
                            if (compositionType === 'DUO' && userAppSafeStr) {
                                 promptParts.push(`1boy, ${userAppSafeStr}`);
                                 console.log('💉 [Director] 尾部追加玩家特征 (防止幻视)');
                            }
        
                            // 3. NSFW 补在最后
                            if (isNsfwAllowed && isNsfwScene && userAppNsfwStr) {
                                promptParts.push(userAppNsfwStr);
                            }
        
                            finalPrompt = promptParts.filter(p => p).join(", \n");
                        }
        
                        console.log(`🧩 [最终拼接Prompt (Type:${compositionType})]`, finalPrompt);
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


            // =========================================================================
                // 3. 摄影师 Agent (极简版 - 动态用户名适配)
                // =========================================================================
                const runCameraManCheck = async (lastUserMsg, aiResponseText) => {
                    const config = getCurrentLlmConfig();
                    if (!config || !config.apiKey) return;
                    
                    console.log('📸 [摄影师] 启动 (State锁定模式)...');
                    
                    // 🔥 1. 获取真实用户名 (不再写死 "阿林")
                    // 尝试从本地存储获取，如果没有则默认为 "玩家"
                    // 注意：请确保你的项目里存储用户信息的 key 是 'user_info' 或 'userInfo'
                    // 如果你的 key 不一样，请在这里修改
                    const userInfo = uni.getStorageSync('user_info') || uni.getStorageSync('userInfo') || {};
                    const realUserName = userInfo.name || userInfo.nickName || '玩家'; 
            
                    // 2. 物理骨架 (Physical Skeleton)
                    let visualContext = currentAction.value || "Standing";
                    
                    // 3. 氛围补充 (Atmosphere Supplement)
                    try {
                        const aiMsgs = messageList.value.filter(m => m.role === 'model');
                        if (aiMsgs.length > 0) {
                            const lastMsg = aiMsgs[aiMsgs.length - 1];
                            if (lastMsg && lastMsg.content && lastMsg.content !== aiResponseText) {
                                visualContext += ` (Context: ${lastMsg.content.slice(0, 50)})`;
                            }
                        }
                    } catch (e) {}
            
                    console.log(`📸 [摄影师] 视觉锚点锁定: ${visualContext}`);
            
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
                    
                    // 🟢 获取固定样貌
                    const settings = currentRole.value?.settings || {};
                    let fullAppearance = settings.appearance || settings.appearanceSafe || "a beautiful girl";
                    if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
                    
                    let compositionType = 'SOLO'; 
                    
                    const imgConfig = uni.getStorageSync('app_image_config') || {};
                    const isOpenAI = imgConfig.provider === 'openai';
                    
                    let prompt = "";
                    
                    if (isOpenAI) {
                        prompt = CAMERA_MAN_OPENAI_PROMPT
                            .replace('{{clothes}}', currentClothing.value || "Casual") 
                            .replace('{{location}}', currentLocation.value || "Indoor") 
                            .replace('{{time}}', formattedTime.value)
                            .replace('{{current_action}}', visualContext) 
                            .replace('{{ai_msg}}', "SILENT_SNAPSHOT"); 
                    } else {
                        prompt = CAMERA_MAN_PROMPT
                            .replace('{{current_action}}', visualContext) 
                            .replace('{{ai_response}}', "SILENT_SNAPSHOT") 
                            .replace('{{clothes}}', currentClothing.value || "Casual")
                            .replace('{{location}}', currentLocation.value || "Indoor")
                            .replace('{{time}}', formattedTime.value)
                            // 🔥 这里注入真实的用户名
                            // replaceAll 确保替换所有的 {{user_name}}
                            .split('{{user_name}}').join(realUserName); 
                    }
                    
                    const pid = `img-loading-${Date.now()}-${Math.random()}`;
                    messageList.value.push({ role: 'system', content: '📸 快门已按下...', isSystem: true, id: pid });
                    scrollToBottom();
                    saveHistory();
                    
                    try {
                        const res = await safeTagChat({
                            config, messages: [{ role: 'user', content: prompt }],
                            temperature: 0.5, maxTokens: 300
                        });
                    
                        console.log(`📸 [摄影师] 动态部分:`, res);
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
                                const STYLE_HEADER = "(masterpiece, best quality), anime coloring, cel shading, flat color, simple background";
                                if (!dynamicPart.includes(fullAppearance)) {
                                    finalPrompt = `${STYLE_HEADER}, ${fullAppearance}, ${dynamicPart}`;
                                } else {
                                    finalPrompt = `${STYLE_HEADER}, ${dynamicPart}`;
                                }
                            }
                            
                            console.log(`🧩 [最终拼接Prompt]`, finalPrompt);
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
        
            // 🔥 继续使用 safeJsonChat
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
                // 1. 更新当前会话的上下文 (短期记忆刷新)
                saveCharacterState(undefined, undefined, result.new_memory);
                
                // 2. 准备心情字段
                const mood = (currentAffection.value > 60) ? '开心' : '平静';
                
                // 🔥🔥🔥 核心修改区域 Start (修复 ID 数据类型报错) 🔥🔥🔥
                
                if (sceneParticipants && sceneParticipants.value && sceneParticipants.value.length > 0) {
                    // === A. 场景模式：记忆分发 ===
                    console.log(`📚 [Memory] 检测到多人场景，正在分发记忆给 ${sceneParticipants.value.length} 位角色...`);
                    
                    const scenePrefix = `【场景: ${chatName.value}】`;
                    const finalDetail = scenePrefix + rawLog; 
        
                    // 遍历在场的每一个人，给他们的日记本里都写上一笔
                    for (const npc of sceneParticipants.value) {
                        await DB.execute(
                            `INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
                            // 👇 修复：使用 Math.floor 取整，并乘 10000 保证随机性
                            [Math.floor(Date.now() + Math.random() * 10000), String(npc.id), fullDateStr, result.brief, finalDetail, mood]
                        );
                    }
                    
                    // (可选) 同时也给场景本身留个底，roleId = chatId(sceneId)
                    await DB.execute(
                        `INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
                        // 👇 修复：使用 Math.floor 取整
                        [Math.floor(Date.now() + Math.random() * 10000), String(chatId.value), fullDateStr, result.brief, finalDetail, mood]
                    );
        
                } else {
                    // === B. 单人模式：照旧 ===
                    const roleId = currentRole.value.id || 'default';
                    await DB.execute(
                        `INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
                        // 👇 修复：使用 Math.floor 取整
                        [Math.floor(Date.now() + Math.random() * 10000), String(roleId), fullDateStr, result.brief, rawLog, mood]
                    );
                }
                // 🔥🔥🔥 核心修改区域 End 🔥🔥🔥
        
                console.log('✅ [DB] 归档完成:', result.brief);
                
                // 3. 重置当天的流水账
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