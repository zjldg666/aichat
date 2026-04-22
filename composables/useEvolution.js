import {
	ref
} from 'vue';
import {
	LLM
} from '@/services/llm.js';
import {
	cleanAiResponse
} from '@/utils/textUtils.js';
export function useEvolution() {
	const isEvolving = ref(false);

	// 进化 Prompt 模板 (保留逻辑)
	const EVOLUTION_SYSTEM_PROMPT = `
[System Command: EVOLUTION_ENGINE]
You are the "Soul Architect" of an AI character. Your task is to EVOLVE the character's RELATION-BASED behavior bias based on their recent interactions, without changing the immutable core.

【Input Data】
1. **Old Core Persona**:
{{core_persona}}

2. **Old Relation-based Bias**:
{{dynamic_bias}}

3. **Recent Experiences (Summary)**:
{{summary}}

4. **Recent Trigger Events (Context)**:
{{recent_context}}

5. **Evolution Trigger**:
The relationship status has shifted and the character needs an updated interaction bias toward the user.

【Evolution Rules】
1. **Core Immutable**: NEVER rewrite the core persona. The output must not contradict or override it.
2. **Bias Only**: Only adjust the relation-based bias: intimacy boundary, trust level, tone, tolerance, initiative, attachment/avoidance.
3. **Stability**: Avoid overreacting to one message. Make the bias stable and coherent.
4. **Actionable**: Write compact rules that can guide behavior in new situations.

【Output Format】
Return a JSON object ONLY:
{
    "analysis": "Brief reasoning of why and how they changed (max 50 words).",
    "new_persona": "The updated relation-based bias paragraph. This will replace the old dynamic bias directly."
}
`;

	// 执行进化
	const executeEvolution = async (currentSettings, memorySummary, recentContext, llmConfig) => {
		if (!llmConfig || !llmConfig.apiKey) throw new Error("No LLM Config found");

		isEvolving.value = true;

		try {
			const corePersona = currentSettings.personalityCore || currentSettings.personalityNormal ||
				"Default persona";
			const dynamicBias = currentSettings.personalityDynamic || "";
			const cleanSummary = cleanAiResponse(memorySummary);
			const cleanContext = cleanAiResponse(recentContext);

			const prompt = EVOLUTION_SYSTEM_PROMPT
				.replace('{{core_persona}}', corePersona)
				.replace('{{dynamic_bias}}', dynamicBias || "No dynamic bias yet.")
				.replace('{{summary}}', cleanSummary || "Just regular daily chats.")
				.replace('{{recent_context}}', cleanContext || "No recent context provided.");

			console.log('🧬 Evolution Prompt:', prompt);

			const response = await LLM.chat({
				config: llmConfig,
				messages: [{
					role: 'user',
					content: prompt
				}],
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