import { ref } from 'vue';
import { LLM } from '@/services/llm.js';

export function useEvolution() {
    const isEvolving = ref(false);

    // 进化 Prompt 模板 (自然聊天版)
    const EVOLUTION_SYSTEM_PROMPT = `
[System Command: CHARACTER_EVOLUTION]
Task: 更新角色的【性格与行为素描】，使其符合最新的经历。

【输入数据】
1. **旧的性格素描**:
"{{old_persona}}"

2. **最近发生的事 (触发原因)**:
{{recent_context}}

3. **长期记忆摘要**:
{{summary}}

【重写要求】
请用**第三人称**重写一段性格素描 (100-150字)。
- **核心目标**: 描述现在的她是个什么样的人？
- **重点关注**:
  - 她现在对玩家的态度变了吗？(比如以前很客气，现在很依赖；或者以前很害羞，现在放开了)
  - 她的说话习惯有没有潜移默化的改变？(比如开始用昵称，或者语气更随意)
  - **不要**写成“因为...所以...”的分析报告，直接写**结果**。就像你在向别人介绍现在的她。

【输出格式 JSON】
{
    "analysis": "一句话解释为什么要变 (如：因为表白成功，她不再掩饰自己的感情)",
    "new_persona": "此处填写新的性格素描文本..."
}
`;

    // 执行进化
    const executeEvolution = async (currentSettings, memorySummary, recentContext, llmConfig) => {
        if (!llmConfig || !llmConfig.apiKey) throw new Error("No LLM Config found");
        
        isEvolving.value = true;
        
        try {
            const oldPersona = currentSettings.personalityNormal || "Default persona";
            
            const prompt = EVOLUTION_SYSTEM_PROMPT
                .replace('{{old_persona}}', oldPersona)
                .replace('{{summary}}', memorySummary || "Just regular daily chats.")
                .replace('{{recent_context}}', recentContext || "No recent context provided.");
                
            console.log('🧬 Evolution Prompt:', prompt);
            
            const response = await LLM.chat({
                config: llmConfig,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8, // Slightly creative
                jsonMode: true
            });
            
            console.log('🧬 Evolution Response:', response);
            
            // 解析 JSON
            // 尝试提取 JSON (有些模型可能不遵循 jsonMode)
            let result;
            try {
                result = JSON.parse(response);
            } catch (e) {
                // Fallback: 尝试用正则提取 JSON
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("Failed to parse evolution result");
                }
            }
            
            return result; // { analysis, new_persona }
            
        } catch (error) {
            console.error('Evolution failed:', error);
            throw error;
        } finally {
            isEvolving.value = false;
        }
    };
    
    return {
        isEvolving,
        executeEvolution
    };
}
