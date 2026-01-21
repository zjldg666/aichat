// AiChat/core/director.js
import { LLM } from '@/services/llm.js';
import { buildSystemPrompt } from '@/core/prompt-builder.js';
import { 
    ACTOR_SCENE_CONTEXT,
    ACTOR_AUTONOMOUS_MODE // 记得引入这个新常量
} from '@/core/director-prompts.js';



/**
 * 🤖 自主演员 (Autonomous Agent)
 * 作用：角色自己决定是否发言，无需导演调度；支持自主移动。
 * @param {Array} subScenes - 当前场景合法的子区域列表
 */
export async function runAutonomousActor({ targetNpc, locationName, formattedTime, userName, activeNpcs, history, allContacts, config, contextLimit, subScenes }) {
    
    // 1. 读取私聊记忆
    const realProfile = allContacts.find(c => String(c.id) === String(targetNpc.privateChatId));
    const privateMemory = realProfile ? (realProfile.summary || "") : "";

    // 2. 构建基础 System Prompt
    let charSystemPrompt = buildSystemPrompt({
        role: targetNpc,
        userName: userName,
        summary: privateMemory,
        formattedTime: formattedTime,
        location: locationName, 
        mode: 'face', 
        activity: targetNpc.initialState || 'interactive',
        clothes: targetNpc.clothing || 'default',
        relation: targetNpc.currentRelation || 'acquaintance'
    });

    // 3. 补充环境上下文
    const otherNames = activeNpcs.filter(n => n.id !== targetNpc.id).map(n => n.name).join('、');
    const sceneContext = ACTOR_SCENE_CONTEXT
        .replace('{{location_name}}', locationName)
        .replace('{{other_names}}', otherNames || '无');
    
    charSystemPrompt += `\n${sceneContext}\n`;

    // 4. 🔥 注入自主决策指令 (带地点限制) 🔥
    // 如果没有传 subScenes，就默认为当前地点，防止 AI 乱跑
    const validLocationsStr = (subScenes && subScenes.length > 0) ? subScenes.join('、') : locationName;
    
    const autoModeInst = ACTOR_AUTONOMOUS_MODE
        .replace('{{role_name}}', targetNpc.name)
        .replace('{{valid_locations}}', validLocationsStr);

    charSystemPrompt += `\n${autoModeInst}`;

    // 5. 构建上下文
    const limit = contextLimit || 20;
    const context = history.slice(-limit).map(m => {
         if (m.isSystem) return { role: 'system', content: m.content };
         if (m.role === 'user') return { role: 'user', content: m.content };
         return { role: m.role === targetNpc.name ? 'assistant' : 'user', content: m.content }; 
    });

    console.log(`🤖 [Auto] ${targetNpc.name} 正在思考 (深度:${limit})...`);

    try {
        const reply = await LLM.chat({
            config,
            messages: context,
            systemPrompt: charSystemPrompt,
            temperature: 0.3 // 允许一定的性格发挥
        });
        
        // 6. 处理结果
        if (reply) {
            const cleanReply = reply.trim();
            // 如果 AI 决定沉默，返回 null
            if (cleanReply.includes('[SILENCE]') || cleanReply === '') {
                console.log(`🤖 [Auto] ${targetNpc.name} 决定保持沉默。`);
                return null;
            }
            // 否则返回内容 (去除可能存在的名字前缀)
            return cleanReply.replace(new RegExp(`^${targetNpc.name}[:：]\\s*`, 'i'), '').trim();
        }
    } catch (e) {
        console.error(`[Auto] ${targetNpc.name} 思考失败`, e);
    }
    return null;
}