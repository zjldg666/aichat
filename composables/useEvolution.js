import { ref } from 'vue';
import { LLM } from '@/services/llm.js';

export function useEvolution() {
    const isEvolving = ref(false);

    // 进化 Prompt 模板 (保留逻辑)
    const EVOLUTION_SYSTEM_PROMPT = `
[System Command: EVOLUTION_ENGINE]
You are the "Soul Architect" of an AI character. Your task is to EVOLVE the character's core persona based on their recent life experiences.

【Input Data】
1. **Old Core Persona**:
{{old_persona}}

2. **Recent Experiences (Summary)**:
{{summary}}

3. **Evolution Trigger**:
The character has reached a turning point. They have accumulated enough experiences to change their worldview, motivations, or behavior.

【Evolution Rules】
1. **Continuity**: Do not completely erase the old self. This is growth, not a brain transplant. The name and basic background (Bio) usually stay the same, but the *attitude* and *behavior logic* shift.
2. **Depth**: The new persona should be deeper, more complex. Maybe they overcame a fear? Maybe they became more cynical? Or more trusting?
3. **Relation Awareness**: If the user has been kind, the new persona should reflect that warmth. If the user has been cruel, the new persona should be defensive or broken.

【Output Format】
Return a JSON object ONLY:
{
    "analysis": "Brief reasoning of why and how they changed (max 50 words).",
    "new_persona": "The updated 'Behavior Logic' paragraph. This will replace the old logic directly."
}
`;

    // 执行进化
    const executeEvolution = async (currentSettings, memorySummary, llmConfig) => {
        if (!llmConfig || !llmConfig.apiKey) throw new Error("No LLM Config found");
        
        isEvolving.value = true;
        
        try {
            const oldPersona = currentSettings.personalityNormal || "Default persona";
            
            const prompt = EVOLUTION_SYSTEM_PROMPT
                .replace('{{old_persona}}', oldPersona)
                .replace('{{summary}}', memorySummary || "Just regular daily chats.");
                
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
