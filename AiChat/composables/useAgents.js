// AiChat/composables/useAgents.js
import { ref } from 'vue';
import { LLM } from '@/services/llm.js';
import { DB } from '@/utils/db.js'; 
import { 
    SCENE_KEEPER_PROMPT, 
    RELATIONSHIP_PROMPT, 
    SNAPSHOT_TRIGGER_PROMPT, 
    IMAGE_GENERATOR_PROMPT, 
    CAMERA_MAN_PROMPT,
    SUMMARY_PROMPT 
} from '@/utils/prompts.js';

// =============================================================================
// 🛠️ 核心工具：双模式解析器 (标签模式 + JSON模式)
// =============================================================================

// 🔧 1. 标签解析器：提取 [KEY] 后的内容 (极度稳定，解决 JSON 报错的核心)
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

// =============================================================================
// 🧠 智能体逻辑主函数
// =============================================================================
export function useAgents(context) {
    const {
        messageList, currentRole, chatName,
        currentLocation, currentClothing, currentAction,
        interactionMode, currentRelation, currentAffection, 
        currentActivity, playerLocation, formattedTime,
        enableSummary, summaryFrequency, currentSummary,
        saveCharacterState, saveHistory, scrollToBottom,
        getCurrentLlmConfig, handleAsyncImageGeneration
    } = context;

    const lastImageGenerationTime = ref(0);
    const lastSummaryIndex = ref(0); 
    const IMAGE_COOLDOWN_MS = 15000;
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

    // =========================================================================
    // 3. 视觉导演 Agent (改用标签模式 + 门卫优化)
    // =========================================================================
    // =========================================================================
        // 3. 视觉导演 Agent (最终防爆版：支持重试 + 暴力兜底)
        // =========================================================================
        const runVisualDirectorCheck = async (lastUserMsg, aiResponseText, existingMsgId = null) => {
            // 1. 冷却检查 (如果是重试则忽略冷却)
            if (!existingMsgId && Date.now() - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) return;
            
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) return;
    
            // 2. 文本清洗 (移除 <think> 标签，防止干扰)
            const rawAiText = aiResponseText || "";
            const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            // 如果清洗后没内容了（比如只有心声），就用原文，防止空输入
            const promptAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
            const promptUserMsg = lastUserMsg || "";
    
            // ============================
            // A. 门卫检查 (Gatekeeper)
            // ============================
            if (!existingMsgId) {
                console.log('🕵️ [门卫] 启动检查...');
                
                const gatekeeperPrompt = SNAPSHOT_TRIGGER_PROMPT
                    .replace('{{user_msg}}', promptUserMsg)
                    .replace('{{ai_msg}}', promptAiMsg);
    
                const gateRes = await safeTagChat({
                    config, messages: [{ role: 'user', content: gatekeeperPrompt }],
                    temperature: 0.1, maxTokens: 50
                });
                
                // 解析门卫结果
                let result = false;
                const resultTag = parseTags(gateRes, 'RESULT');
                const looseMatch = /\bTRUE\b/i.test(gateRes); // 只要包含 TRUE 就过
    
                if (resultTag && resultTag.toUpperCase().includes('TRUE')) {
                    result = true;
                } else if (looseMatch) {
                    result = true;
                }
    
                console.log(result ? '✅ [门卫] 通过' : '🚫 [门卫] 拦截');
                if (!result) return;
            }
    
            // ============================
            // B. 生图逻辑 (Director)
            // ============================
            
            // 1. 占位气泡处理
            let placeholderId = existingMsgId;
            if (!placeholderId) {
                placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
                messageList.value.push({ role: 'system', content: '📷 正在构图...', isSystem: true, id: placeholderId });
            } else {
                // 如果是重试，更新现有气泡状态
                const idx = messageList.value.findIndex(m => m.id === placeholderId);
                if (idx !== -1) {
                    messageList.value[idx].content = '📷 重新构图中...';
                    messageList.value[idx].hasError = false; 
                    messageList.value[idx].isLogicError = false;
                }
            }
    
            scrollToBottom();
            saveHistory();
    
            const directorPrompt = IMAGE_GENERATOR_PROMPT
                .replace('{{clothes}}', currentClothing.value || "Casual") 
                .replace('{{location}}', currentLocation.value || "Indoor") 
                .replace('{{time}}', formattedTime.value)
                .replace('{{user_msg}}', promptUserMsg)
                .replace('{{ai_msg}}', promptAiMsg)
                .replace('{{current_action}}', currentAction.value || "Standing");
    
            try {
                // 2. 请求 LLM 生成提示词
                const dirRes = await safeTagChat({
                    config, messages: [{ role: 'user', content: directorPrompt }],
                    temperature: 0.3, maxTokens: 500
                });
    
                console.log("🎨 [导演原始回复]:", dirRes);
    
                // 3. 🔥 强力解析逻辑 (修复 No IMAGE_PROMPT tag found)
                let imagePrompt = parseTags(dirRes, 'IMAGE_PROMPT');
    
                // 🚑 兜底方案：如果没抓到标签，但 AI 回复了很长的英文，大概率就是 Prompt 没写标签而已
                if (!imagePrompt && dirRes.length > 10) {
                    console.warn("⚠️ [导演] 未检测到标签，启用兜底模式，使用全部文本。");
                    // 移除可能的解释性废话，如 "Here is the prompt: "
                    imagePrompt = dirRes.replace(/Here is.*?:/i, '').trim(); 
                }
    
                // 4. 最终校验与执行
                if (imagePrompt && imagePrompt.length > 5) {
                    lastImageGenerationTime.value = Date.now();
                    const idx = messageList.value.findIndex(m => m.id === placeholderId);
                    if (idx !== -1) messageList.value[idx].content = '📷 显影中...';
                    
                    handleAsyncImageGeneration(imagePrompt, placeholderId);
                } else {
                    throw new Error("生成内容为空或无效: " + dirRes);
                }
    
            } catch (e) {
                console.warn('Director failed:', e);
                const idx = messageList.value.findIndex(m => m.id === placeholderId);
                if (idx !== -1) {
                    messageList.value[idx].content = '❌ 构图失败 (点击重试)';
                    messageList.value[idx].type = 'image'; 
                    messageList.value[idx].hasError = true;
                    messageList.value[idx].isLogicError = true; 
                    
                    // 💾 保存上下文用于重试 (使用 rawAiText 确保信息完整)
                    messageList.value[idx].retryContext = { 
                        lastUserMsg: lastUserMsg, 
                        aiResponseText: rawAiText 
                    };
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
    // 4. 摄影师 Agent (改用标签模式)
    // =========================================================================
    // =========================================================================
        // 4. 摄影师 Agent (手动拍照 - 特权版)
        // =========================================================================
        const runCameraManCheck = async (lastUserMsg, aiResponseText) => {
            // 🛑 1. 特权通道：手动拍照不需要冷却时间！直接执行！
            // (删除了原来的 Date.now() 判断)
            
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) return;
    
            console.log('📸 [摄影师] 收到快门指令，准备拍摄...');
    
            // 2. 文本清洗
            const rawAiText = aiResponseText || "";
            const cleanAiText = rawAiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            const finalAiMsg = cleanAiText.length > 0 ? cleanAiText : rawAiText;
            
            // 3. 构建 Prompt
            // 尝试获取上一条 AI 动作（如果有的话），辅助构图
            let targetAction = finalAiMsg;
            // 如果当前这句 AI 回复太短（比如"好呀"），尝试往前找找具体的动作
            if (targetAction.length < 5 && messageList.value.length >= 3) {
                 const prevMsg = messageList.value[messageList.value.length - 3]; // -1是AI当前句, -2是玩家快门指令, -3是AI上一句
                 if (prevMsg && prevMsg.role === 'model') {
                     targetAction += ` (Previous context: ${prevMsg.content})`;
                 }
            }
     
            const prompt = CAMERA_MAN_PROMPT
                .replace('{{current_action}}', currentAction.value || "Maintaining pose") 
                .replace('{{ai_response}}', targetAction)
                .replace('{{clothes}}', currentClothing.value || "Casual")
                .replace('{{location}}', currentLocation.value || "Indoor")
                .replace('{{time}}', formattedTime.value);
     
            // 4. 占位符上屏
            const pid = `img-loading-${Date.now()}-${Math.random()}`;
            messageList.value.push({ role: 'system', content: '📸 快门已按下...', isSystem: true, id: pid });
            scrollToBottom();
            saveHistory();
    
            // 5. 请求生成
            try {
                const res = await safeTagChat({
                    config, messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3, maxTokens: 500
                });
    
                console.log("📸 [摄影师原始回复]:", res);
    
                // 6. 强力解析 + 兜底逻辑
                let imagePrompt = parseTags(res, 'IMAGE_PROMPT');
    
                // 🚑 兜底：如果没标签，就把整个回复当 Prompt
                if (!imagePrompt && res.length > 10) {
                    console.warn("⚠️ [摄影师] 未检测到标签，启用兜底模式。");
                    imagePrompt = res.replace(/Here is.*?:/i, '').trim(); 
                }
        
                if (imagePrompt && imagePrompt.length > 5) {
                    lastImageGenerationTime.value = Date.now();
                    
                    const idx = messageList.value.findIndex(m => m.id === pid);
                    if (idx !== -1) messageList.value[idx].content = '📸 显影中...';
                    
                    handleAsyncImageGeneration(imagePrompt, pid);
                } else {
                    throw new Error("生成内容无效");
                }
            } catch (e) {
                console.warn('CameraMan failed:', e);
                const idx = messageList.value.findIndex(m => m.id === pid);
                if (idx !== -1) {
                    messageList.value[idx].content = '❌ 拍照失败 (点击重试)';
                    messageList.value[idx].type = 'image'; 
                    messageList.value[idx].hasError = true;
                    messageList.value[idx].isLogicError = true;
                    // 保存上下文供重试
                    messageList.value[idx].retryContext = { 
                        lastUserMsg: lastUserMsg, 
                        aiResponseText: finalAiMsg 
                    };
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