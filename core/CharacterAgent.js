/**
 * core/CharacterAgent.js
 * * 核心 AI 角色智能体 (The "Brain" of the Character)
 * 整合了感知、记忆、思考、表达与行为控制的全套逻辑。
 */

import { ref, unref } from 'vue';
import { LLM, getCurrentLlmConfig } from '@/services/llm.js';
import { DB } from '@/utils/db.js';
import { useChatGallery } from '@/composables/useChatGallery.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';
import { 
    SCENE_KEEPER_PROMPT, 
    RELATIONSHIP_PROMPT, 
    SNAPSHOT_TRIGGER_PROMPT, 
    IMAGE_GENERATOR_PROMPT, 
    CAMERA_MAN_PROMPT,
    SUMMARY_PROMPT,
    IMAGE_GENERATOR_OPENAI_PROMPT,
    CAMERA_MAN_OPENAI_PROMPT, 
} from '@/utils/prompts.js';

// =============================================================================
// 🔧 静态工具函数 (Helpers)
// =============================================================================

const IMAGE_COOLDOWN_MS = 60 * 1000;

// 1. OpenAI 画风前缀生成器
const getOpenAIStylePrefix = (styleValue) => {
    if (!styleValue || styleValue === 'anime') return "High-quality anime style illustration of";
    
    const map = {
        'impasto': "Anime style illustration with rich colors and painterly brushstrokes, detailed shading of",
        'retro': "Retro 90s cel-shaded anime style illustration, vintage aesthetic of",
        'shinkai': "Masterpiece anime illustration with vibrant lighting, clouds and emotional atmosphere in the style of Makoto Shinkai, depicting",
        'ghibli': "Studio Ghibli style animation cell illustration, hand-drawn texture of",
        'gufeng': "Exquisite Chinese GuFeng anime style illustration, elegant oriental aesthetics, soft colors, detailed background of",
        'pastel': "Dreamy soft pastel watercolor anime illustration, delicate lines of",
        'sketch': "High-quality manga sketch, clean lines, intricate details of",
        'realistic': "High-quality 2.5D CG art, semi-realistic anime style with detailed skin texture and cinematic lighting of",
        'cyberpunk': "Cyberpunk style anime digital art, neon lights, futuristic atmosphere of"
    };

    if (map[styleValue]) return map[styleValue];
    return `High-quality anime style illustration with ${styleValue} elements of`;
};

// 2. 标签解析器
function parseTags(text, key) {
    if (!text) return null;
    const regex = new RegExp(`\\[${key}\\]\\s*(.+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

// 3. 强力 JSON 解析器
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

// 4. 安全标签请求器 (Pure Text Mode)
async function safeTagChat({ config, messages, temperature = 0.1, maxTokens = 500 }) {
    try {
        const res = await LLM.chat({
            config, messages, 
            jsonMode: false, 
            temperature, maxTokens
        });
        return res || "";
    } catch (e) {
        console.warn("LLM Request Failed:", e);
        return "";
    }
}

// 5. 安全 JSON 请求器 (Retry Logic)
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

// =============================================================================
// 🧠 CharacterAgent 类定义
// =============================================================================

export class CharacterAgent {
    /**
     * 初始化智能体
     * @param {Object} context - 包含 Vue refs 的上下文对象 (通常来自 useAgents 的输入)
     * @param {Object} context.messageList - 聊天记录 ref
     * @param {Object} context.currentRole - 当前角色对象 ref
     * @param {String} context.chatName - 角色名 ref
     * @param {String} context.chatId - 会话ID ref
     * @param {Object} context.currentLocation - ref
     * @param {Object} context.currentClothing - ref
     * @param {Object} context.currentAction - ref
     * @param {Object} context.interactionMode - ref ('phone'/'face')
     * @param {Object} context.currentRelation - ref
     * @param {Object} context.currentAffection - ref
     * @param {Object} context.currentActivity - ref
     * @param {Object} context.playerLocation - ref
     * @param {Object} context.formattedTime - ref
     * @param {Object} context.enableSummary - ref
     * @param {Object} context.summaryFrequency - ref
     * @param {Object} context.currentSummary - ref
     * @param {Function} context.saveCharacterState - 状态保存回调
     * @param {Function} context.saveHistory - 历史保存回调
     * @param {Function} context.scrollToBottom - 滚动回调
     */
    constructor(context) {
        this.ctx = context;
        
        // 内部状态
        this.lastImageGenerationTime = 0;
        this.lastSummaryIndex = 0;
        this.isArchiving = false;
        
        // 配置
        this.IMAGE_COOLDOWN_MS = IMAGE_COOLDOWN_MS;
    }

    /**
     * 核心思考循环：接收用户输入 -> 思考 -> 回复 -> 触发后台Agent
     * @param {String} userText - 用户输入的文本
     * @returns {Promise<void>}
     */
    async think(userText) {
        if (!userText || !userText.trim()) return;

        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
            console.error("LLM Config missing");
            this.ctx.messageList.value.push({
                role: 'system', content: '❌ 未配置 API Key，请先去设置页面配置。'
            });
            return;
        }

        // 1. 记忆检索 (Active Recall)
        // 检查用户是否在询问过去，如果是，注入相关日记
        const recalledMemory = await this._checkHistoryRecall(userText);
        
        // 2. 构建系统提示词 (Cognition Setup)
        // 整合角色设定、环境、状态、记忆
        const systemPrompt = buildSystemPrompt({
            role: unref(this.ctx.currentRole),
            userName: 'User', // 或从 storage 获取真实用户名
            summary: unref(this.ctx.currentSummary),
            formattedTime: unref(this.ctx.formattedTime),
            location: unref(this.ctx.currentLocation),
            mode: unref(this.ctx.interactionMode),
            activity: unref(this.ctx.currentActivity),
            clothes: unref(this.ctx.currentClothing),
            relation: unref(this.ctx.currentRelation)
        });

        // 3. 构建消息上下文 (Context Window)
        // 过滤掉 system 消息和错误消息，保留对话流
        let messages = this.ctx.messageList.value
            .filter(m => !m.isSystem && !m.isLogicError)
            .map(m => ({
                role: m.role === 'model' ? 'assistant' : 'user',
                content: m.content
            }));
        
        // 注入检索到的记忆 (作为 System 提示插入到队尾前，或者直接作为 System Prompt 的一部分)
        if (recalledMemory) {
            // 策略：作为临时的 system 消息插入上下文
            messages.push({ 
                role: 'system', 
                content: `[System: Memory Recall]\nRelated past event: "${recalledMemory}"` 
            });
        }
        
        messages.push({ role: 'user', content: userText });

        // 4. LLM 推理 (Inference)
        let aiContent = "";
        let thoughtContent = ""; // 如果支持思维链提取
        
        try {
            const rawResponse = await LLM.chat({
                config,
                messages,
                systemPrompt,
                temperature: 0.8, // 对话稍微灵活一点
                maxTokens: 1000   // 留足空间
            });

            // 简单处理 <think> 标签 (如果有 DeepSeek R1 等模型支持)
            const thinkMatch = rawResponse.match(/<think>([\s\S]*?)<\/think>/i);
            if (thinkMatch) {
                thoughtContent = thinkMatch[1].trim();
                aiContent = rawResponse.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
            } else {
                aiContent = rawResponse;
            }

        } catch (error) {
            console.error("Thinking failed:", error);
            this.ctx.messageList.value.push({
                role: 'model', 
                content: '（AI 似乎走神了，请重试...）',
                isLogicError: true 
            });
            return;
        }

        // 5. 更新 UI (Response)
        if (thoughtContent) {
            // 可选：显示思维链
            // this.ctx.messageList.value.push({ type: 'thought', content: thoughtContent });
            console.log("💭 AI Thought:", thoughtContent);
        }
        
        this.ctx.messageList.value.push({
            role: 'model',
            content: aiContent
        });

        this.ctx.scrollToBottom();
        this.ctx.saveHistory();

        // 6. 启动后台 Agents (Sub-process)
        // 异步执行，不阻塞主线程
        this._runBackgroundAgents(userText, aiContent);
    }

    /**
     * 运行后台辅助 Agents
     */
    async _runBackgroundAgents(userMsg, aiMsg) {
        // 并行或串行执行检查
        // 1. 场景一致性检查 (Scene Keeper)
        await this._runSceneCheck(userMsg, aiMsg);

        // 2. 关系发展检查 (Relationship Judge)
        await this._runRelationCheck(userMsg, aiMsg);

        // 3. 视觉导演检查 (Visual Director)
        await this._runVisualDirectorCheck(userMsg, aiMsg);

        // 4. 记忆整理 (Memory Keeper)
        await this._checkAndRunSummary();
    }

    // =========================================================================
    // 🕵️ Internal Agent: Scene Keeper
    // =========================================================================
    async _runSceneCheck(lastUserMsg, aiResponseText) {
        if (!aiResponseText || aiResponseText.length < 3) return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
      
        const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;
        
        const prompt = SCENE_KEEPER_PROMPT
            .replace('{{user_location}}', unref(this.ctx.playerLocation) || "未知") 
            .replace('{{char_location}}', unref(this.ctx.currentLocation) || "未知")        
            .replace('{{clothes}}', unref(this.ctx.currentClothing))
            .replace('{{mode}}', unref(this.ctx.interactionMode))
            .replace('{{current_action}}', unref(this.ctx.currentAction) || "站立/闲逛") 
            + `\n\n【Interaction】\n${conversationContext}`;
      
        const res = await safeTagChat({
            config, messages: [{ role: 'user', content: prompt }],
            temperature: 0.1, maxTokens: 500
        });

        const newMode = parseTags(res, 'MODE');
        const newLoc = parseTags(res, 'LOCATION');
        const newClothes = parseTags(res, 'CLOTHES');
        const newAction = parseTags(res, 'ACTION');
        const psychology = parseTags(res, 'PSYCHOLOGY');

        if (!newMode && !newLoc) return;

        let hasChange = false;
        
        // 1. 地点逻辑
        const charHomeAddress = unref(this.ctx.currentRole)?.location || "角色家"; 
        let suggestedLoc = newLoc || unref(this.ctx.currentLocation);
        
        // 关键词对齐
        const homeKeywords = ['家', '卧室', '客厅', '厨房', '浴室', '玄关', '门口', '洗手间'];
        if (homeKeywords.some(key => suggestedLoc.includes(key))) {
            if (suggestedLoc !== charHomeAddress && !suggestedLoc.includes(charHomeAddress)) {
                // 可以在这里做归一化
            }
        }
        if (suggestedLoc !== unref(this.ctx.currentLocation)) {
            this.ctx.currentLocation.value = suggestedLoc;
            hasChange = true;
        }

        // 2. 模式逻辑
        let aiDecidedMode = newMode ? newMode.toLowerCase() : unref(this.ctx.interactionMode);
        
        // 数字熔断 (301 vs 302)
        const getNum = (s) => (s && s.match(/\d+/) ? s.match(/\d+/)[0] : null);
        const numA = getNum(suggestedLoc);
        const numB = getNum(unref(this.ctx.playerLocation));
        if (numA && numB && numA !== numB) {
            if (aiDecidedMode === 'face') aiDecidedMode = 'phone';
        }

        if (aiDecidedMode && aiDecidedMode !== unref(this.ctx.interactionMode)) {
            this.ctx.interactionMode.value = aiDecidedMode;
            hasChange = true;
            if (aiDecidedMode === 'face') uni.vibrateShort();
        }

        // Face 模式下玩家跟随
        if (unref(this.ctx.interactionMode) === 'face' && suggestedLoc !== unref(this.ctx.playerLocation)) {
             this.ctx.playerLocation.value = suggestedLoc;
             hasChange = true;
        }

        // 3. 服装与动作
        if (newClothes && newClothes.length < 50 && newClothes !== unref(this.ctx.currentClothing)) {
            this.ctx.currentClothing.value = newClothes;
            hasChange = true;
        }
        
        if (newAction && newAction !== unref(this.ctx.currentAction)) {
            this.ctx.currentAction.value = newAction;
            hasChange = true; 
        }
        
        if (psychology) console.log(`🧠 [AI] ${psychology}`);
        
        if (hasChange) {
            this.ctx.saveCharacterState();
        }
    }

    // =========================================================================
    // ❤️ Internal Agent: Relationship Judge
    // =========================================================================
    async _runRelationCheck(lastUserMsg, aiResponseText) {
        if (!aiResponseText || aiResponseText.length < 5) return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
      
        const conversationContext = `User: "${lastUserMsg}"\nCharacter: "${aiResponseText}"`;
        const prompt = RELATIONSHIP_PROMPT
            .replace('{{relation}}', unref(this.ctx.currentRelation) || "初相识")
            .replace('{{activity}}', unref(this.ctx.currentActivity) || "互动")
            + `\n\n【Interaction】\n${conversationContext}`;
      
        const res = await safeTagChat({
            config, messages: [{ role: 'user', content: prompt }],
            temperature: 0.5, maxTokens: 500
        });

        const newRelation = parseTags(res, 'RELATION');
        const newActivity = parseTags(res, 'ACTIVITY');

        if (!newRelation && !newActivity) return;

        console.log(`❤️ [心态] ${newRelation} | ${newActivity}`);
        let hasChange = false;
        if (newRelation && newRelation !== unref(this.ctx.currentRelation)) {
            this.ctx.currentRelation.value = newRelation;
            hasChange = true;
        }
        if (newActivity && newActivity !== unref(this.ctx.currentActivity)) {
            this.ctx.currentActivity.value = newActivity;
            hasChange = true;
        }
        if (hasChange) {
            this.ctx.saveCharacterState();
        }
    }

    // =========================================================================
    // 🎨 Internal Agent: Visual Director
    // =========================================================================
    async _runVisualDirectorCheck(lastUserMsg, aiResponseText, existingMsgId = null) {
        // 1. 冷却检查
        if (!existingMsgId && Date.now() - this.lastImageGenerationTime < this.IMAGE_COOLDOWN_MS) return;
        
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
        
        const rawAiText = aiResponseText || "";
        const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        const promptAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
        const promptUserMsg = lastUserMsg || "";
        
        // A. 门卫检查 (Gatekeeper)
        let compositionType = 'SOLO'; 
        
        if (!existingMsgId) {
            console.log('🕵️ [门卫] 启动检查...');
            const currentMode = unref(this.ctx.interactionMode) === 'phone' ? 'Phone' : 'Face';
            const gatekeeperPrompt = SNAPSHOT_TRIGGER_PROMPT
                .replace('{{user_msg}}', promptUserMsg)
                .replace('{{ai_msg}}', promptAiMsg)
                .replace('{{mode}}', currentMode);
        
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
        
        // B. 生图逻辑 (Director)
        // 动态引入 Gallery 逻辑，确保拿到最新状态
        const { handleAsyncImageGeneration } = useChatGallery({ 
            currentRole: this.ctx.currentRole,
            interactionMode: this.ctx.interactionMode, 
            messageList: this.ctx.messageList, 
            chatId: this.ctx.chatId,
            chatName: this.ctx.chatName,
            saveHistory: this.ctx.saveHistory, 
            scrollToBottom: this.ctx.scrollToBottom,
            userAppearance: ref('') 
        });
        
        let placeholderId = existingMsgId;
        if (!placeholderId) {
            placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
            this.ctx.messageList.value.push({ 
                role: 'system', content: '📷 正在构图...', isSystem: true, id: placeholderId 
            });
        }
        this.ctx.scrollToBottom();
        this.ctx.saveHistory();
        
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        const isOpenAI = imgConfig.provider === 'openai';
        
        // 获取固定样貌
        const settings = unref(this.ctx.currentRole)?.settings || {};
        let fullAppearance = settings.appearance || settings.appearanceSafe || "a beautiful girl";
        if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
        
        const template = isOpenAI ? IMAGE_GENERATOR_OPENAI_PROMPT : IMAGE_GENERATOR_PROMPT;
        
        const directorPrompt = template
            .replace('{{clothes}}', unref(this.ctx.currentClothing) || "Casual") 
            .replace('{{location}}', unref(this.ctx.currentLocation) || "Indoor") 
            .replace('{{time}}', unref(this.ctx.formattedTime))
            .replace('{{user_msg}}', promptUserMsg)
            .replace('{{ai_msg}}', promptAiMsg)
            .replace('{{current_action}}', unref(this.ctx.currentAction) || "Standing");
        
        try {
            const dirRes = await safeTagChat({
                config, messages: [{ role: 'user', content: directorPrompt }],
                temperature: 0.7, maxTokens: 300
            });
        
            console.log(`🎨 [导演] 动态部分生成:`, dirRes);
            let dynamicPart = parseTags(dirRes, 'IMAGE_PROMPT');
            if (!dynamicPart && dirRes.length > 5) dynamicPart = dirRes.replace(/Here is.*?:/i, '').trim();
        
            if (dynamicPart) {
                this.lastImageGenerationTime = Date.now();
                const idx = this.ctx.messageList.value.findIndex(m => m.id === placeholderId);
                if (idx !== -1) this.ctx.messageList.value[idx].content = '📷 显影中...';
        
                let finalPrompt = "";
                if (isOpenAI) {
                    const stylePrefix = getOpenAIStylePrefix(imgConfig.style);
                    finalPrompt = `${stylePrefix} ${fullAppearance}. ${dynamicPart}`;
                } else {
                    if (!dynamicPart.includes(fullAppearance)) {
                        finalPrompt = `${fullAppearance}, ${dynamicPart}`;
                    } else {
                        finalPrompt = dynamicPart;
                    }
                }
                
                handleAsyncImageGeneration(finalPrompt, placeholderId, compositionType);
            } else {
                throw new Error("生成内容无效");
            }
        } catch (e) {
            console.warn('Director failed:', e);
            const idx = this.ctx.messageList.value.findIndex(m => m.id === placeholderId);
            if (idx !== -1) {
                this.ctx.messageList.value[idx].content = '❌ 构图失败';
                this.ctx.messageList.value[idx].hasError = true;
                this.ctx.messageList.value[idx].retryContext = { lastUserMsg, aiResponseText: rawAiText };
                this.ctx.saveHistory();
            }
        }
    }

    // =========================================================================
    // 📸 Internal Agent: Camera Man (Explicit Trigger)
    // =========================================================================
    // 这个方法通常由 UI 上的“拍照”按钮手动触发
    async runCameraManCheck(lastUserMsg, aiResponseText) {
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return;
        
        console.log('📸 [摄影师] 启动 (拼接模式)...');
        
        const rawAiText = aiResponseText || "";
        const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        const finalAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
        
        let targetAction = finalAiMsg;
        // 如果当前 AI 回复太短，尝试拼接上一条 AI 回复以获取更多动作信息
        if (targetAction.length < 5 && this.ctx.messageList.value.length >= 3) {
            const prevMsg = this.ctx.messageList.value[this.ctx.messageList.value.length - 3]; 
            if (prevMsg && prevMsg.role === 'model') {
                targetAction += ` (Previous context: ${prevMsg.content})`;
            }
        }
        
        const { handleAsyncImageGeneration } = useChatGallery({ 
            currentRole: this.ctx.currentRole, 
            interactionMode: this.ctx.interactionMode, 
            messageList: this.ctx.messageList, 
            chatId: this.ctx.chatId,
            chatName: this.ctx.chatName,
            saveHistory: this.ctx.saveHistory, 
            scrollToBottom: this.ctx.scrollToBottom,
            userAppearance: ref('') 
        });
        
        const settings = unref(this.ctx.currentRole)?.settings || {};
        let fullAppearance = settings.appearance || settings.appearanceSafe || "a beautiful girl";
        if (fullAppearance.endsWith('.')) fullAppearance = fullAppearance.slice(0, -1);
        
        let compositionType = unref(this.ctx.interactionMode) === 'phone' ? 'SOLO' : 'DUO';
        
        const imgConfig = uni.getStorageSync('app_image_config') || {};
        const isOpenAI = imgConfig.provider === 'openai';
        
        let prompt = "";
        if (isOpenAI) {
            prompt = CAMERA_MAN_OPENAI_PROMPT
                .replace('{{clothes}}', unref(this.ctx.currentClothing) || "Casual") 
                .replace('{{location}}', unref(this.ctx.currentLocation) || "Indoor") 
                .replace('{{time}}', unref(this.ctx.formattedTime))
                .replace('{{current_action}}', unref(this.ctx.currentAction) || "Standing")
                .replace('{{ai_msg}}', targetAction);
        } else {
            prompt = CAMERA_MAN_PROMPT
                .replace('{{current_action}}', unref(this.ctx.currentAction) || "Maintaining pose") 
                .replace('{{ai_response}}', targetAction)
                .replace('{{clothes}}', unref(this.ctx.currentClothing) || "Casual")
                .replace('{{location}}', unref(this.ctx.currentLocation) || "Indoor")
                .replace('{{time}}', unref(this.ctx.formattedTime));
        }
        
        const pid = `img-loading-${Date.now()}-${Math.random()}`;
        this.ctx.messageList.value.push({ role: 'system', content: '📸 快门已按下...', isSystem: true, id: pid });
        this.ctx.scrollToBottom();
        this.ctx.saveHistory();
        
        try {
            const res = await safeTagChat({
                config, messages: [{ role: 'user', content: prompt }],
                temperature: 0.5, maxTokens: 300
            });
        
            console.log(`📸 [摄影师] 动态部分:`, res);
            let dynamicPart = parseTags(res, 'IMAGE_PROMPT');
            if (!dynamicPart && res.length > 5) dynamicPart = res.replace(/Here is.*?:/i, '').trim();
        
            if (dynamicPart) {
                this.lastImageGenerationTime = Date.now();
                const idx = this.ctx.messageList.value.findIndex(m => m.id === pid);
                if (idx !== -1) this.ctx.messageList.value[idx].content = '📸 显影中...';
                
                let finalPrompt = "";
                if (isOpenAI) {
                    const stylePrefix = getOpenAIStylePrefix(imgConfig.style);
                    finalPrompt = `${stylePrefix} ${fullAppearance}. ${dynamicPart}`;
                } else {
                    if (!dynamicPart.includes(fullAppearance)) {
                        finalPrompt = `${fullAppearance}, ${dynamicPart}`;
                    } else {
                        finalPrompt = dynamicPart;
                    }
                }
                
                handleAsyncImageGeneration(finalPrompt, pid, compositionType);
            } else {
                throw new Error("生成内容无效");
            }
        } catch (e) {
            console.warn('CameraMan failed:', e);
            const idx = this.ctx.messageList.value.findIndex(m => m.id === pid);
            if (idx !== -1) {
                this.ctx.messageList.value[idx].content = '❌ 拍照失败';
                this.ctx.messageList.value[idx].hasError = true;
                this.ctx.saveHistory();
            }
        }
    }

    // =========================================================================
    // 📝 Internal Agent: Memory Keeper (Auto Summary)
    // =========================================================================
    async _checkAndRunSummary() {
        if (!unref(this.ctx.enableSummary)) return;
        
        const listLen = this.ctx.messageList.value.length;
        const freq = unref(this.ctx.summaryFrequency) || 20;
        
        if (listLen - this.lastSummaryIndex >= freq) {
            console.log(`📝 [Memory] 触发自动总结...`);
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) return;
            
            const recentMsgs = this.ctx.messageList.value
                .slice(-(freq + 5))
                .filter(m => !m.isSystem && m.type !== 'image');
            
            if (recentMsgs.length < 5) return; 
            
            const conversationText = recentMsgs.map(m => {
                const roleName = m.role === 'user' ? '玩家' : unref(this.ctx.chatName);
                return `${roleName}: ${m.content}`;
            }).join('\n');
            
            const prompt = SUMMARY_PROMPT
                .replace('{{previous_summary}}', unref(this.ctx.currentSummary) || "暂无早期记忆")
                .replace('{{recent_messages}}', conversationText);
            
            try {
                this.lastSummaryIndex = listLen; 
                const newSummary = await LLM.chat({
                    config: config,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3, maxTokens: 1000
                });
                
                if (newSummary && newSummary.length > 5) {
                    // 更新外部状态
                    this.ctx.saveCharacterState(undefined, undefined, newSummary);
                    console.log('✅ [Memory] 更新:', newSummary.slice(0, 30) + '...');
                }
            } catch (e) {
                console.warn('Memory error:', e);
                this.lastSummaryIndex = listLen - freq; // 失败回滚
            }
        }
    }

    // =========================================================================
    // 🌙 Internal Agent: Daily Summary (End of Day)
    // =========================================================================
    async runDayEndSummary() {
        this.isArchiving = true;
        console.log(`🌙 [Daily Summary] 开始归档...`);
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
            this.isArchiving = false;
            return;
        }
        
        const now = new Date();
        const datePart = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
        const fullDateStr = `${datePart} ${unref(this.ctx.formattedTime).split(' ')[0] || '未知'}`; 
        const rawLog = unref(this.ctx.currentSummary) || "今日暂无重要互动记录。";

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

        const result = await safeJsonChat({
            config,
            messages: [{ role: 'user', content: prompt
                .replace('{{full_date_str}}', fullDateStr)
                .replace('{{role_name}}', unref(this.ctx.chatName))
                .replace('{{raw_log}}', rawLog) 
            }],
            temperature: 0.1, maxTokens: 1000
        });

        if (result) {
            this.ctx.saveCharacterState(undefined, undefined, result.new_memory);
            const roleId = unref(this.ctx.currentRole).id || 'default';
            const mood = (unref(this.ctx.currentAffection) > 60) ? '开心' : '平静';
            
            await DB.execute(
                `INSERT INTO diaries (id, roleId, dateStr, brief, detail, mood) VALUES (?, ?, ?, ?, ?, ?)`,
                [Date.now(), String(roleId), fullDateStr, result.brief, rawLog, mood]
            );
            console.log('✅ [DB] 归档完成:', result.brief);
            
            // 重置今日摘要
            const initialSummary = `**今日生活账本 (${fullDateStr})**:\n- [00:00]: 新的一天开始。`; 
            this.ctx.saveCharacterState(undefined, undefined, initialSummary);
            this.lastSummaryIndex = this.ctx.messageList.value.length; 
        }
        this.isArchiving = false;
    }

    // =========================================================================
    // 🧠 Internal Agent: Memory Retrieval
    // =========================================================================
    async _checkHistoryRecall(userMsg) {
        if (!userMsg || userMsg.length < 4) return null;
        
        const recallKeywords = ['记得', '上次', '以前', '那天', '回忆', '之前', '过往', '当时', '旧事','昨天','前天','上周','上月'];
        if (!recallKeywords.some(key => userMsg.includes(key))) return null;
        
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) return null;
        
        const roleId = String(unref(this.ctx.currentRole).id || 'default');
        const userLimit = unref(this.ctx.currentRole).diaryHistoryLimit || 7; 
 
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
        } catch (e) { 
            console.error('Recall failed:', e); 
        }
        return null;
    }
    
    // 辅助: 获取最近的显性记忆
    async fetchActiveMemoryContext() {
        const roleId = String(unref(this.ctx.currentRole).id || 'default');
        const days = unref(this.ctx.currentRole).activeMemoryDays || 3;
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
    }

    // 错误重试接口 (供 UI 点击错误气泡时调用)
    async retryAgentGeneration(msg) {
        if (msg.isLogicError && msg.retryContext) {
            console.log('🔄 触发 AI 重新构图...');
            await this._runVisualDirectorCheck(
                msg.retryContext.lastUserMsg, 
                msg.retryContext.aiResponseText, 
                msg.id
            );
        }
    }
}