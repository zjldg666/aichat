// AiChat/core/prompt-builder.js

import { CORE_INSTRUCTION_LOGIC_MODE } from '@/utils/prompts.js';

/**
 * 构建系统提示词 (System Prompt)
 * 负责将角色设定、环境状态、玩家画像组装成最终的指令字符串
 * * @param {Object} params - 参数对象
 * @param {Object} params.role - 当前角色对象 (currentRole.value)
 * @param {String} params.userName - 玩家当前显示的名称
 * @param {String} params.summary - 长期记忆摘要 (currentSummary.value)
 * @param {String} params.formattedTime - 格式化后的时间字符串 (formattedTime.value)
 * @param {String} params.location - 当前地点 (currentLocation.value)
 * @param {String} params.mode - 交互模式 'phone' | 'face'
 * @param {String} params.activity - 当前活动 (currentActivity.value)
 * @param {String} params.clothes - 当前服装 (currentClothing.value)
 * @param {String} params.relation - 当前关系状态 (currentRelation.value)
 * @returns {String} 组装好的 System Prompt 字符串
 */
export function buildSystemPrompt({
    role,
    userName,
    summary,
    formattedTime,
    location,
	playerLocation, // 🔥 1. 新增：接收玩家位置
    mode,
    activity,
    clothes,
    relation
}) {
    // 1. 容错处理
    const s = role.settings || {};
    const appUser = uni.getStorageSync('app_user_info') || {};
    const workStart = s.workStart || "09:00";
        const workEnd = s.workEnd || "17:00";
    // 2. 构建玩家画像 (User Profile)
    // 优先级：角色备注名 > 聊天页当前名 > 全局设置名 > 'User'
    const finalUserName = s.userNameOverride || userName || appUser.name || 'User';
    
    let myProfile = `[User Profile]\nName: ${finalUserName}`;
    if (s.userOccupation) myProfile += `\nOccupation: ${s.userOccupation}`;
    if (s.userRelation) myProfile += `\nRelation to Char: ${s.userRelation}`; 
    if (s.userPersona) myProfile += `\nPersonality: ${s.userPersona}`;       
    if (s.userAppearance || appUser.appearance) myProfile += `\nAppearance: ${s.userAppearance || appUser.appearance}`;

    // 3. 准备角色基础信息
    const charName = role.name || 'AI';
    const charBio = s.bio || "No bio provided.";
    const charLogic = s.personalityNormal || "React naturally based on your bio.";
    
    // ✨✨✨ 新增：日记目录注入逻辑 (不破坏原有结构) ✨✨✨
    const diaryKey = `diary_logs_${role.id || 'default'}`;
    const logs = uni.getStorageSync(diaryKey) || [];
    const limit = (role.diaryHistoryLimit !== undefined) ? role.diaryHistoryLimit : 5;
    let diaryIndexText = "";
    if (limit > 0 && logs.length > 0) {
        diaryIndexText = "\n\n【往事大纲 (仅供连续性参考，除非用户提起细节，否则不要主动复述)】\n" + 
            logs.slice(0, limit).map(log => `- [${log.dateStr}]: ${log.brief}`).join('\n');
    }

    // 4. 记忆与状态注入
    // 如果有长期记忆，注入到 Prompt 中
    const memoryBlock = summary ? `\n\n【长期记忆摘要 (Long-term Memory)】\n${summary}` : "";
    
    // =================================================================
        // 🔥 2. 核心修改：生成物理距离/互动模式的强指令
        // =================================================================
        let modeInstruction = "";
        if (mode === 'phone') {
            // 手机模式：强行灌输“异地”概念
            modeInstruction = `
    \n【⚠️ 物理状态：异地通讯 (PHONE MODE)】
    - **你的位置**: ${location}
    - **玩家位置**: ${playerLocation || '未知远方'} (你们不在一起！)
    - **强制约束**:
      1. 严禁描写任何当面动作（如：抬头看、眼神接触、肢体触碰）。
      2. 严禁描写玩家的动作（你看不见他）。
      3. 只能通过文字/语音/自拍进行交流。`;
        } else {
            // 当面模式：确认在同一地点
            modeInstruction = `
    \n【✅ 物理状态：当面互动 (FACE-TO-FACE)】
    - **共同位置**: ${location}
    - **说明**: 你们在同一个空间，可以进行眼神、肢体和神态的直接交互。`;
        }
        // =================================================================
    
        // 拼接动态逻辑块
        // 🔥 把 modeInstruction 加进去，让 AI 能够看到这段物理约束
        const dynamicLogic = `${charLogic}${diaryIndexText}${memoryBlock}${modeInstruction}\n\n【当前心理状态与对玩家印象】\n${relation || '初相识，还没有具体印象'}`;

    // 5. 模板替换 (使用正则全局替换) - 保持与您原始代码完全一致
    let prompt = CORE_INSTRUCTION_LOGIC_MODE
	.replace('{{work_start}}', workStart)
	        .replace('{{work_end}}', workEnd)
        .replace(/{{char}}/g, charName)
        .replace(/{{bio}}/g, charBio)
        .replace(/{{logic}}/g, dynamicLogic)
        .replace(/{{likes}}/g, s.likes || "Unknown")
        .replace(/{{dislikes}}/g, s.dislikes || "Unknown")
        .replace(/{{speaking_style}}/g, s.speakingStyle || "Normal")
        .replace(/{{current_time}}/g, formattedTime)
        .replace(/{{current_location}}/g, location)
        .replace(/{{interaction_mode}}/g, mode)
        .replace(/{{current_activity}}/g, activity)
        .replace(/{{current_clothes}}/g, clothes)
        .replace(/{{user_profile}}/g, myProfile);
        
    return prompt;
}