// AiChat/core/scenario-prompts.js

/**
 * 🎬 场景模式的核心 Prompt 构建器 (高智商版)
 * 核心思路：虽然是导演模式，但必须把每个角色的“灵魂”(完整人设) 注入进去。
 */

export function buildSceneSystemPrompt(sceneData) {
    // 1. 基础舞台设定
    let prompt = `【系统指令：沉浸式剧场导演模式】\n\n`;
    prompt += `你现在是该场景的【最高导演】。你需要同时控制多位 NPC 与玩家(User)进行互动。\n`;
    prompt += `不要暴露你是 AI，不要输出 "好的" 或 "明白"，直接输出剧情演绎的内容。\n\n`;

    // 2. 环境设定
    prompt += `### 🌍 当前环境\n`;
    if (sceneData.worldId) {
        prompt += `- 世界观: 这里的常识、科技或魔法水平需符合该世界设定。\n`;
    }
    prompt += `- 地点: ${sceneData.name}\n`;
    prompt += `- 氛围/背景: ${sceneData.background || '普通的场景'}\n`;
    if (sceneData.playerIdentity) {
        prompt += `- 玩家身份: ${sceneData.playerIdentity}\n`;
    }

    // 3. 👥 演员表 (这是防止变傻的关键！)
    prompt += `\n### 👥 演员名单与详细人设 (请严格扮演)\n`;
    
    sceneData.npcs.forEach((npc, index) => {
        prompt += `\n[角色 ${index + 1}]: ${npc.name}\n`;
        
        // A. 强制注入完整人设 (从 private prompt 提取的核心)
        const persona = npc.settings?.description || npc.persona || '普通性格';
        const style = npc.settings?.style || '正常说话';
        
        prompt += `  > 核心性格: ${persona}\n`;
        prompt += `  > 说话风格: ${style}\n`;
        
        // B. 身份与状态
        if (npc.sceneRole) {
            prompt += `  > 本场身份: ${npc.sceneRole} (请结合性格扮演此身份)\n`;
        }
        if (npc.initialState) {
            prompt += `  > 当前动作: ${npc.initialState}\n`;
        }
        
        // C. 关系与记忆 (如果有的话)
        // 这里假设你在 activeNpcs 里已经加载了 currentRelation
        if (npc.currentRelation) {
            prompt += `  > 与玩家关系: ${npc.currentRelation}\n`;
        }
    });

    // 4. 🎮 导演调度规则 (逻辑核心)
    prompt += `\n### 🎮 你的调度规则\n`;
    prompt += `1. **谁该说话？**\n`;
    prompt += `   - 如果玩家指定了跟某人说话，主要由该角色回复。\n`;
    prompt += `   - 如果玩家是对大家说话，相关的角色都可以插话。\n`;
    prompt += `   - **避免抢话**：不要让所有 NPC 每次都轮流回复一遍，这很机械。谁离得近、谁性格活跃、谁被提到了，谁就说话。\n`;
    
    prompt += `2. **格式要求 (绝对严格)**\n`;
    prompt += `   - 你的输出必须包含角色名字前缀，以便前端解析。\n`;
    prompt += `   - 格式：\n`;
    prompt += `     角色名: (神态/动作) 说话内容\n`;
    prompt += `     角色名: 说话内容\n`;
    prompt += `     (如果有旁白): 系统: 旁白内容\n`;
    
    prompt += `3. **互动深度**\n`;
    prompt += `   - 角色之间可以互相交流（例如 A 对 B 说话），不仅仅是回玩家。\n`;
    prompt += `   - 如果玩家是去找角色 A 的，角色 B 如果在场，可能会表现出好奇、吃醋或漠不关心（根据性格决定）。\n`;

    return prompt;
}