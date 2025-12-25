/**
 * core/scenario-prompts.js
 * 小剧场模式 (Scenario Mode) 专用提示词仓库
 * 职责：只负责生成发给 AI 的 Prompt 字符串，不含业务逻辑。
 */

// =============================================================================
// 1. 基础格式守则 (通用)
// =============================================================================
const SCENARIO_FORMAT_RULES = `
【基础回复守则】
1. **禁止指令输出**: 绝对不要输出 [System], [Logic] 等指令代码。
2. **禁止废话**: 不要说“好的”、“明白了”，直接输出内容。
3. **格式**: 
   - 动作描写用全角括号（）。
   - 心理活动用 <think> 标签（限50字内）。
   - 对话直接写，不要带【姓名:】前缀（除非是多人混战模式，但通常由系统自动分配名字）。
`;

// =============================================================================
// 2. 🎬 导演/调度师 (The Director)
// =============================================================================
/**
 * 构建导演指令：决定下一位发言者
 * @param {Object} scenario 场景数据
 * @param {Array} recentHistory 最近的对话记录
 * @param {Array} activeNpcNames 当前场景所有 NPC 的名字列表
 */
export function buildDirectorPrompt(scenario, recentHistory, activeNpcNames) {
    // 将历史记录格式化为文本供导演参考
    const historyText = recentHistory.map(m => `[${m.role}]: ${m.content}`).join('\n');
    const npcListStr = activeNpcNames.join(', ');

    return `
[System Command: SCENARIO_DIRECTOR]
你是一个TRPG游戏的“后台逻辑导演”。
你的任务不是写对话，而是**决策**下一轮该由谁行动，以及裁决事件结果。

【当前场景】: ${scenario.name}
【可用角色】: ${npcListStr} (或者 "Narrator" 旁白)
【最近剧情流】:
${historyText}

【决策任务】
1. **意图识别**: 玩家是在对谁说话？或者是对环境做动作？
2. **物品/规则裁决**: 
   - 如果最新一条消息是 [System Event] (如玩家使用了道具)，请根据常识判定结果（例如：给贪财的人金币->高兴；给敌人毒药->中毒）。
   - 不需要掷骰子，直接根据“逻辑因果”判定。
3. **指派演员**: 决定下一个由谁来回应玩家。

【输出格式 (JSON)】
请仅输出一个 JSON 对象，不要包含 Markdown 标记：
{
  "target": "角色名字", // 必须是【可用角色】中的一个，或是 "Narrator"
  "context_note": "给该角色的简短导演备注" // 例如："他收到了金币，应该表现得很谄媚" 或 "玩家攻击了他，他应该反击"
}
`;
}

// =============================================================================
// 3. 🎭 动态演员 (The Actor)
// =============================================================================
/**
 * 构建演员指令：扮演特定角色
 * @param {String} personaText NPC 的完整人设描述
 * @param {Object} scenario 场景数据
 * @param {String} sceneLog 当前的剧情日志（记忆）
 * @param {String} directorNote 导演给出的临时指示
 */
export function buildActorPrompt(personaText, scenario, sceneLog, directorNote) {
    return `
[System Command: IMMERSIVE_ACTOR]
${SCENARIO_FORMAT_RULES}

【当前场景环境】
场景: ${scenario.name}
描述: ${scenario.description}

【你的角色设定】
${personaText}

【前情提要 (你的短期记忆)】
${sceneLog || "（刚进入场景，暂无发生特殊事件）"}

【导演给你的即时指令】
👉 **${directorNote}** 👈
(这是当下的最高指令，比如如果导演说你“中毒了”，你必须表现出中毒的痛苦，不能无视。)

【回复要求】
1. 结合【前情提要】和【导演指令】，以你的人设做出自然反应。
2. 如果【前情提要】里提到你刚才在做某事（如擦杯子），请保持动作的连贯性。
3. **沉浸式**: 不要复述设定，直接表演。
`;
}

// =============================================================================
// 4. 📝 书记员：滚动日志更新 (Log Updater)
// =============================================================================
/**
 * 构建总结指令：更新剧情日志
 * @param {String} currentLog 旧的日志
 * @param {String} newDialogues 新发生的对话
 */
export function buildLogUpdatePrompt(currentLog, newDialogues) {
    return `
[System Command: SCENE_RECORDER]
任务：作为场景记录员，将“新增对话”合并进“当前剧情日志”。

【当前日志】:
${currentLog || "（剧情刚开始）"}

【新增对话流】:
${newDialogues}

【合并要求】
1. **第三人称**记叙（如“玩家进入酒馆，与老乔攀谈”）。
2. **去粗取精**: 忽略无意义的寒暄，只记录关键信息（交易、冲突、获得道具、关键情报、好感变化）。
3. **物品追踪**: 必须记录任何物品/金钱的转移或消耗。
4. **输出限制**: 直接输出更新后的完整日志文本，控制在 300 字以内。
`;
}

// =============================================================================
// 5. 🚪 离场收尾 (Scene Exit)
// =============================================================================
/**
 * 构建离场指令
 */
export function buildLeaveScenePrompt(scenario, sceneLog) {
    return `
[System Command: SCENE_CLOSURE]
玩家决定离开当前场景【${scenario.name}】。

【当前剧情状态】:
${sceneLog}

【指令】
1. 请生成一段**旁白或NPC对话**来结束本次场景探索。
2. 根据【当前剧情状态】中的NPC关系：
   - 如果相谈甚欢，NPC应该道别或挽留。
   - 如果发生冲突，NPC可以冷眼旁观或放狠话。
3. 必须给出一个明确的结束感（如“看着玩家的背影消失在门外”）。
`;
}

// =============================================================================
// 6. 🏷️ 标题生成 (Title Generator)
// =============================================================================
/**
 * 构建标题生成指令
 */
export function buildTitleGenPrompt(finalLog) {
    return `
[System Command: TITLE_GENERATOR]
阅读以下剧情日志：
"${finalLog}"

【任务】
生成一个 **10字以内** 的中文标题，概括本次经历。
风格参考：RPG任务名、小说章节名（如《酒馆的初遇》、《深夜的交易》、《血色冲突》）。
只输出标题文字，不要引号。
`;
}