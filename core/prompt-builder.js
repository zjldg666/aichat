// AiChat/core/prompt-builder.js

import { CORE_INSTRUCTION_LOGIC_MODE } from '@/utils/prompts.js';

export function buildSystemPrompt({
    role,
    userName,
    summary,
    formattedTime,
    location,
    mode,
    activity,
    clothes,
    relation
}) {
    // 1. 容错处理与数据格式化
    const s = role.settings || {};
    const appUser = uni.getStorageSync('app_user_info') || {};
    
    // 🔥 [修复 1]: 正确读取 create.vue 保存的 workStartHour (数字)，并转为 "HH:00" 格式
    // 如果 s.workStartHour 存在(哪怕是0)，就用它，否则默认 9
    const startH = (s.workStartHour !== undefined && s.workStartHour !== null) ? s.workStartHour : 9;
    const endH = (s.workEndHour !== undefined && s.workEndHour !== null) ? s.workEndHour : 17;
    
    // 补零处理 (9 -> "09:00", 17 -> "17:00")
    const workStart = `${String(startH).padStart(2, '0')}:00`;
    const workEnd = `${String(endH).padStart(2, '0')}:00`;

    // 2. 构建玩家画像 (User Profile)
    const finalUserName = s.userNameOverride || userName || appUser.name || 'User';
    
    let myProfile = `[User Profile]\nName: ${finalUserName}`;
    if (s.userAge || appUser.age) myProfile += `\nAge: ${s.userAge || appUser.age}`; // ✨ 新增：玩家年龄
    if (s.userGender) myProfile += `\nGender: ${s.userGender}`; // ✨ 新增：玩家性别
    if (s.userOccupation) myProfile += `\nOccupation: ${s.userOccupation}`;
    if (s.userRelation) myProfile += `\nRelation to Char: ${s.userRelation}`; 
    if (s.userPersona) myProfile += `\nPersonality: ${s.userPersona}`;        
    if (s.userAppearance || appUser.appearance) myProfile += `\nAppearance: ${s.userAppearance || appUser.appearance}`;

    // 3. 准备角色基础信息
    const charName = role.name || 'AI';
    // ✨ 注入角色年龄到 Bio 前面
    const ageInfo = (s.age) ? `[Age: ${s.age}] ` : "";
    const personalityInfo = (s.personality) ? `[Personality: ${s.personality}] ` : ""; // ✨ 新增
    const charBio = ageInfo + personalityInfo + (s.bio || "No bio provided.");
    const coreLogic = s.personalityCore || s.personalityNormal || "以背景故事与性格为准，像真人一样自然互动；保持一致的动机、底线与说话风格。";
    const dynamicBias = s.personalityDynamic || "";
    
    // 日记目录注入逻辑
    const diaryKey = `diary_logs_${role.id || 'default'}`;
    const logs = uni.getStorageSync(diaryKey) || [];
    const limit = (role.diaryHistoryLimit !== undefined) ? role.diaryHistoryLimit : 5;
    let diaryIndexText = "";
    if (limit > 0 && logs.length > 0) {
        diaryIndexText = "\n\n【往事大纲 (仅供连续性参考，除非用户提起细节，否则不要主动复述)】\n" + 
            logs.slice(0, limit).map(log => `- [${log.dateStr}]: ${log.brief}`).join('\n');
    }

    // 4. 记忆与状态注入
    const memoryBlock = summary ? `\n\n【长期记忆摘要 (Long-term Memory)】\n${summary}` : "";
    
    // 关系锚点注入
    const defaultRelationText = '初始状态：尚未产生互动，请严格基于[背景故事(Bio)]判定与玩家的初始关系。';
    const isRelationValid = relation && relation !== defaultRelationText && relation.length > 2;
    const finalRelation = isRelationValid ? relation : (s.userRelation || '初相识，还没有具体印象');
    const relationAnchor = `\n\n【RELATIONSHIP STATUS (HARD FACT)】\nCURRENT STATUS: ${finalRelation}`;
    
    const dynamicLogic = `${coreLogic}\n\n【关系动态行为偏置 (Relation-based Bias)】\n${dynamicBias || '（无额外偏置）'}${diaryIndexText}${memoryBlock}${relationAnchor}\n\n【当前心理状态与对玩家印象 (Current Psychology)】\n${finalRelation}`;

    // 5. 模板替换 
    let prompt = CORE_INSTRUCTION_LOGIC_MODE
        // 🔥 [修复 2]: 使用正则全局替换 /g，确保所有位置的 {{work_start}} 都被替换
        .replace(/{{work_start}}/g, workStart) 
        .replace(/{{work_end}}/g, workEnd)   
        .replace(/{{char}}/g, charName)
        .replace(/{{bio}}/g, charBio)
        .replace(/{{evolution_level}}/g, s.evolutionLevel || 1)
        .replace(/{{logic}}/g, dynamicLogic)
        .replace(/{{core_logic}}/g, coreLogic)
        .replace(/{{dynamic_logic}}/g, dynamicBias || '（关系基线：无额外偏置）')
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
