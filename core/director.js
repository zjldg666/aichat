// AiChat/core/director.js
import { LLM } from '@/services/llm.js';
import { DB } from '@/utils/db.js'; 
import { buildSystemPrompt } from '@/core/prompt-builder.js';
import { 
    ACTOR_SCENE_CONTEXT,
    ACTOR_AUTONOMOUS_MODE
} from '@/core/director-prompts.js'; 

// 🔥🔥🔥 核心修正：直接复用 chat/chat 内核的 Prompt 🔥🔥🔥
// 你的 chat/chat 用的就是这个，场景里也必须用这个，保持 AI 性格一致！
import { RELATIONSHIP_PROMPT } from '@/utils/prompts.js';

// =============================================================================
// 🧠 辅助：读取 NPC 的短期显性记忆 (复刻自 useAgents内核)
// =============================================================================
async function fetchNpcActiveMemory(npcId, days = 3) {
    if (!npcId) return "";
    try {
        const logs = await DB.select(
            `SELECT dateStr, brief FROM diaries WHERE roleId = ? ORDER BY id DESC LIMIT ?`,
            [String(npcId), days]
        );
        if (!logs || logs.length === 0) return "";
        const sortedLogs = logs.reverse();
        return `\n【Recent Memories (Active Context)】\n${logs.map(log => `[${log.dateStr}]: ${log.brief}`).join('\n')}`;
    } catch (e) {
        return "";
    }
}

// =============================================================================
// 🤖 主函数：自主演员 (Standard Director)
// =============================================================================
export async function runAutonomousActor({ targetNpc, locationName, formattedTime, userName, activeNpcs, history, allContacts, config, contextLimit, subScenes }) {
    
    // 1. 获取真实档案
    const realProfile = allContacts.find(c => String(c.id) === String(targetNpc.privateChatId));
    
    // 2. 准备记忆与状态
    const privateSummary = realProfile ? (realProfile.summary || "") : "";
    const activeMemory = await fetchNpcActiveMemory(targetNpc.privateChatId);
    
    // 读取文本关系 (不使用数值)
    const currentRelation = realProfile?.relation || targetNpc.currentRelation || '普通朋友';

    // 3. 构建 Prompt (复用 prompt-builder内核)
    let charSystemPrompt = buildSystemPrompt({
        role: targetNpc, 
        userName: userName,
        summary: privateSummary + activeMemory,
        formattedTime: formattedTime,
        location: locationName, 
        mode: 'face', 
        activity: targetNpc.initialState || 'interactive',
        clothes: targetNpc.clothing || 'default',
        relation: currentRelation 
    });

    // 4. 补充环境上下文
    const otherNames = activeNpcs.filter(n => n.id !== targetNpc.id).map(n => n.name).join('、');
    const sceneContext = ACTOR_SCENE_CONTEXT
        .replace('{{location_name}}', locationName)
        .replace('{{other_names}}', otherNames || '独自一人');
    
    charSystemPrompt += `\n${sceneContext}\n`;

    // 5. 注入自主决策
    const validLocationsStr = (subScenes && subScenes.length > 0) ? subScenes.join('、') : locationName;
    const autoModeInst = ACTOR_AUTONOMOUS_MODE
        .replace('{{role_name}}', targetNpc.name)
        .replace('{{valid_locations}}', validLocationsStr);

    charSystemPrompt += `\n${autoModeInst}`;

    // 6. 历史记录处理
    const limit = contextLimit || 20;
    const context = history.slice(-limit).map(m => {
         if (m.isSystem) return { role: 'system', content: m.content };
         if (m.role === 'user') return { role: 'user', content: m.content };
         return { role: m.role === targetNpc.name ? 'assistant' : 'user', content: `${m.role}: ${m.content}` }; 
    });

    console.log(`🤖 [Auto] ${targetNpc.name} 思考中 (Relation: ${currentRelation})...`);

    try {
        const reply = await LLM.chat({
            config,
            messages: context,
            systemPrompt: charSystemPrompt,
            temperature: 0.8 
        });
        
        if (reply) {
            let cleanReply = reply.trim();
            if (cleanReply.includes('[SILENCE]') || cleanReply === '') return null;
            cleanReply = cleanReply.replace(new RegExp(`^${targetNpc.name}[:：]\\s*`, 'i'), '');
            return cleanReply.trim();
        }
    } catch (e) {
        console.error(`[Auto] Error`, e);
    }
    return null;
}

// =============================================================================
// ❤️ 关系状态分析器 (复用 chat/chat 内核逻辑)
// =============================================================================
export async function analyzeNpcRelation({ targetNpc, userMsg, aiMsg, config, allContacts }) {
    if (!userMsg || !aiMsg || userMsg.length < 2) return;
    
    // 🔥 1. 使用与 chat/chat 完全一致的 Prompt
    const PROMPT_TEMPLATE = RELATIONSHIP_PROMPT; 
    if (!PROMPT_TEMPLATE) {
        console.warn("⚠️ 未找到 RELATIONSHIP_PROMPT，请检查 utils/prompts.js");
        return;
    }

    // 2. 找到真实档案
    const contactIdx = allContacts.findIndex(c => String(c.id) === String(targetNpc.privateChatId));
    if (contactIdx === -1) return;
    const realProfile = allContacts[contactIdx];

    const currentRelation = realProfile.relation || "普通朋友";
    const currentActivity = "多人互动"; 

    // 3. 构建 Prompt (格式与 useAgents.js 保持一致)
    const conversationContext = `User: "${userMsg}"\nCharacter: "${aiMsg}"`;
    const prompt = PROMPT_TEMPLATE
        .replace('{{relation}}', currentRelation)
        .replace('{{activity}}', currentActivity)
        + `\n\n【Interaction in Group Scene】\n${conversationContext}`;

    try {
        // 4. 调用 LLM
        const res = await LLM.chat({
            config, 
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1, 
            maxTokens: 300,
            jsonMode: false 
        });

        // 5. 解析 Tags (与 useAgents.js 的 safeTagChat 逻辑对齐)
        const parseTag = (text, tag) => {
            const m = text.match(new RegExp(`\\[${tag}\\]\\s*(.+)`, 'i'));
            return m ? m[1].trim() : null;
        };

        const newRelation = parseTag(res, 'RELATION');
        
        // 6. 更新状态
        if (newRelation && newRelation !== currentRelation) {
            console.log(`❤️ [Relation Update] ${targetNpc.name}: ${currentRelation} -> ${newRelation}`);
            realProfile.relation = newRelation;
            realProfile.lastActiveTime = Date.now();
            uni.setStorageSync('contact_list', allContacts); 
        }

    } catch (e) {
        console.warn(`[Relation] Analyze failed`, e);
    }
}