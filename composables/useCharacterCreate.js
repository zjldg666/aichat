// AiChat/composables/useCharacterCreate.js
import { ref } from 'vue';
import { LLM } from '@/services/llm.js';
import { Comfy } from '@/services/comfyui.js';
import { saveToGallery } from '@/utils/gallery-save.js';
import { FACE_STYLES_MAP, STYLE_PROMPT_MAP } from '@/utils/constants.js';

export function useCharacterCreate(formData, targetId) {
    const tempClothingTagsForAvatar = ref('');

    const getCurrentLlmConfig = () => {
        const schemes = uni.getStorageSync('app_llm_schemes') || [];
        const idx = uni.getStorageSync('app_current_scheme_index') || 0;
        return (schemes.length > 0 && schemes[idx]) ? schemes[idx] : null;
    };

    // 1. 优化/翻译角色 Prompt
    // 1. 优化/翻译角色 Prompt (完整修复版)
        const generateEnglishPrompt = async () => {
           
            const f = formData.value.charFeatures;
            
            // 判断当前是否是暴露模式
            const isExposed = f.wearStatus === '暴露/H';
    
            const selectedFaceStyle = formData.value.faceStyle;
            const faceTags = FACE_STYLES_MAP[selectedFaceStyle] || selectedFaceStyle || '';
            
            // 1.1 拼接中文描述 - 安全部分 (身体/脸)
            let safeParts = [];
            
            // [修复点1]: 优化头发拼接，确保即使只有颜色或发型也能正常组合
            const hairColor = f.hairColor || '';
            const hairStyle = f.hairStyle || '';
            if (hairColor || hairStyle) {
                 safeParts.push(`${hairColor}${hairStyle}`);
            }
            
            if (f.eyeColor) safeParts.push(`${f.eyeColor}眼睛`);
            if (f.skinGloss) safeParts.push(`皮肤${f.skinGloss}`);
            if (f.chestSize) safeParts.push(`胸部${f.chestSize}`); // "大胸"是安全的，但不要描述细节
            
            // [修复点2]: 显式补全部位名词，防止 LLM 不知道"丰满圆润"指的是什么
            if (f.waist) {
                safeParts.push(f.waist.includes('腰') ? f.waist : `${f.waist}腰`); 
            }
            if (f.hips) {
                safeParts.push(f.hips.includes('臀') ? f.hips : `${f.hips}臀部`); 
            }
            if (f.legs) {
                safeParts.push(f.legs.includes('腿') ? f.legs : `${f.legs}双腿`); 
            }
            
            const safeChinese = safeParts.join('，');
        
            // 1.2 拼接中文描述 - NSFW部分 (关键修改！🔒)
            let nsfwParts = [];
            // ⚠️ 只有在【暴露模式】下，才把这些特征发给 LLM
            // 如果是正常穿戴，我们直接隐藏这些信息，防止 LLM 把它们写进 safeTags 里
            if (isExposed) {
                if (f.nippleColor) nsfwParts.push(`乳头${f.nippleColor}`);
                if (f.pubicHair || f.vulvaType) nsfwParts.push(`私处${f.pubicHair || ''}，${f.vulvaType || ''}`);
            }
            const nsfwChinese = nsfwParts.join('，');
        
            // 1.3 拼接中文描述 - 服装部分
            let clothesParts = [];
            if (f.topStyle) clothesParts.push(`上身穿着${f.topColor || ''}${f.topStyle}`);
            if (f.bottomStyle) clothesParts.push(`下身穿着${f.bottomColor || ''}${f.bottomStyle}`);
            if (f.legWear) clothesParts.push(`穿着${f.legWear}`);
            
            // 兜底逻辑：如果没填服装且是正常模式，强制加衣服
            if (clothesParts.length === 0 && !isExposed) {
                clothesParts.push('穿着时尚的日常便服'); 
            }
            const clothesChinese = clothesParts.join('，');
            
            if (!safeChinese && !clothesChinese) {
                return uni.showToast({ title: '请先选择特征', icon: 'none' });
            }
        
            uni.showLoading({ title: 'AI 正在优化 Prompt...', mask: true });
        
            try {
                const config = getCurrentLlmConfig();
                if (!config || !config.apiKey) throw new Error('请先在“我的”页面配置 API');
        
                // [修复点3]: 更新 Prompt，增加 "Tag Integrity" 规则
                const prompt = `You are an expert AI Art Prompt Engineer specializing in Anime/Danbooru styles.
                
                【Input Data】
                1. Body Features: "${safeChinese}"
                2. Private Details: "${nsfwChinese}"  (If empty, output empty string)
                3. Clothing: "${clothesChinese}"
        
                【Optimization Rules】
                1. **Translate & Refine**: Convert to high-quality Danbooru tags.
                2. **Safety First**: If "Clothing" is present, absolutely NO nudity tags (like nipples, pussy) in the "Body Tags" section.
                3. **Be Specific**: "shirt" -> "white t-shirt", "skirt" -> "pleated skirt".
                4. **Tag Integrity**: Keep adjectives and nouns together as a single tag (e.g., use "black hair", "plump hips", NOT "black, hair" or "plump, hips").
                5. **Format Constraint**: Output EXACTLY three parts separated by "|||".
        
                【Output Format】
                <Body Tags> ||| <Private Tags> ||| <Clothing Tags>`;
        
                const result = await LLM.chat({
                    config,
                    messages: [{ role: 'user', content: prompt }],
                    systemPrompt: "You are a professional Prompt Generator. Output only the requested format.",
                    temperature: 0.3 // 降低温度，让它更听话
                });
                
                const parts = result.split('|||');
                const safeTags = parts[0] ? parts[0].trim().replace(/\n/g, '') : '';
                const nsfwTags = parts[1] ? parts[1].trim().replace(/\n/g, '') : '';
                const clothingTags = parts[2] ? parts[2].trim().replace(/\n/g, '') : ''; 
                
                // 组合最终结果
                formData.value.appearanceSafe = `${faceTags}, ${safeTags}`.replace(/,\s*,/g, ',').trim();
                formData.value.appearanceNsfw = nsfwTags;
                
                if (isExposed) {
                     formData.value.appearance = `${formData.value.appearanceSafe}, ${nsfwTags}`;
                } else {
                     formData.value.appearance = `${formData.value.appearanceSafe}`;
                }
        
                tempClothingTagsForAvatar.value = clothingTags;
                
                uni.showToast({ title: 'Prompt已优化生成', icon: 'success' });
        
            } catch (e) {
                console.error("❌ [Debug] 生成过程报错:", e);
                // 失败时的兜底逻辑也同步优化一下，补全名词
                let fallbackSafe = safeChinese; // 这里其实已经是补全过名词的中文了，勉强能用
                formData.value.appearance = `${faceTags}, ${fallbackSafe}`; 
                formData.value.appearanceSafe = `${faceTags}, ${fallbackSafe}`; 
                tempClothingTagsForAvatar.value = clothesChinese;
                uni.showToast({ title: 'AI优化失败，使用原文', icon: 'none' });
            } finally {
                uni.hideLoading();
            }
        };

    // 2. 生成玩家 Prompt
    const generateUserDescription = async () => {
        const f = formData.value.userFeatures;
        let tags = [];
        if (f.hair) tags.push(f.hair);
        if (f.body) tags.push(f.body);
        if (f.privates) tags.push(`下体${f.privates}`);
        const rawKeywords = tags.join('，');
        if (!rawKeywords) return uni.showToast({ title: '请先选择特征', icon: 'none' });
        uni.showLoading({ title: '生成中...', mask: true });
        try {
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) throw new Error('请配置 API');
            const prompt = `Translate to English tags: "${rawKeywords}". Start with "1boy". Output ONLY tags.`;
            const result = await LLM.chat({
                config, messages: [{ role: 'user', content: prompt }], systemPrompt: "You are a prompt translator.", temperature: 0.3
            });
            formData.value.userAppearance = result;
            uni.showToast({ title: '成功', icon: 'success' });
        } catch (e) {
            formData.value.userAppearance = `1boy, ${rawKeywords}`;
            uni.showToast({ title: '翻译失败，使用原文', icon: 'none' });
        } finally {
            uni.hideLoading();
        }
    };

    // 3. 自动生成行为逻辑 (升级版：静态高精度人设)
    // 3. 自动生成行为逻辑 (大师级：心理侧写冰山模型 + 自动补全)
    const autoGenerateBehavior = async () => {
        if (!formData.value.bio || formData.value.bio.length < 5) return uni.showToast({ title: '请先填写"背景故事"', icon: 'none' });
        
        uni.showLoading({ title: 'AI正在注入灵魂...', mask: true });
        
        // 构造更丰富的输入信息
        const roleInfo = `【角色本体】
姓名: ${formData.value.name || '未命名'}
性别: ${formData.value.gender || '未知'}
职业: ${formData.value.occupation || '未设定'}
背景故事: ${formData.value.bio}
人物性格: ${formData.value.personality || '未设定'}
说话风格: ${formData.value.speakingStyle || '未设定 (请生成)'}
喜好: ${formData.value.likes || '未设定 (请生成)'}
厌恶: ${formData.value.dislikes || '未设定 (请生成)'}

【玩家设定 (对手戏对象)】
玩家昵称: ${formData.value.userNameOverride || '玩家'}
玩家性别: ${formData.value.userGender || '未知'}
当前关系: ${formData.value.userRelation || '未设定 (请根据背景故事自行推断)'}`;

        // ✨✨✨ 核心修改：升级为“人格操作系统” Prompt ✨✨✨
        const prompt = `[System: Deep Psyche Architect & Character Designer]
目标：构建一个有血有肉、逻辑自洽的灵魂。如果【角色档案】中缺少细节，请基于背景故事进行补全。

【角色档案】
${roleInfo}

【任务要求】
请分析角色，输出 JSON 格式。

1. **补全设定** (如果原设定已提供，则基于原设定优化；如果未提供，请根据人设自动生成):
   - speaking_style: 说话风格/口癖 (例: 语气慵懒，喜欢叫人“小弟弟”)。
   - likes: 喜好 (例: 红茶，古典音乐)。
   - dislikes: 雷点 (例: 轻浮的举动)。

2. **深度心理分析**:
   - core_drive: 核心驱力 (她活着是为了什么？如: 填补内心的空洞 / 证明自己的价值)。
   - deep_fear: 深层恐惧 (夜深人静时她最怕面对什么？)。

3. **behavior_logic** (思维与行为准则 - 核心):
   - **禁止**列举"遇到A做B"的流水账。
   - **必须**定义一套通用的"人格操作系统"，包含：
     a) [认知滤镜]: 她预设玩家的意图是什么？(例如：总是把善意曲解为图谋不轨)。这决定了她如何应对**未知情况**。
     b) [矛盾张力]: 她身上最大的反差是什么？(例如：嘴上不仅毒舌且抗拒，身体却诚实地渴望触碰)。
     c) [防御机制]: 当感到压力、尴尬或不知所措时，她的本能反应是什么？
     d) [表现层锚点]: 结合以上逻辑，给出2个具体的微动作习惯，作为情感宣泄的出口。
   - 语气要求：精准、深刻、直击灵魂，像心理医生的诊断书。
   - 限 200 字以内。

【输出格式 JSON】
{
  "speaking_style": "...",
  "likes": "...",
  "dislikes": "...",
  "core_drive": "...",
  "deep_fear": "...",
  "behavior_logic": "..."
}`;

        try {
            const config = getCurrentLlmConfig();
            if (!config || !config.apiKey) throw new Error('请配置 API');
            
            const result = await LLM.chat({
                config, 
                messages: [{ role: 'user', content: prompt }], 
                systemPrompt: "You are an expert Character Psychologist. Analyze deeply. Output JSON only.", 
                temperature: 0.8, // 稍微提高温度，增加灵性
                jsonMode: true 
            });
            
            let json = null;
            try {
                const cleanStr = result.replace(/```json|```/g, '').trim();
                json = JSON.parse(cleanStr);
            } catch (e) {
                console.warn('JSON Parse failed, using raw text fallback');
            }

            if (json) {
                // 如果用户没填，就用生成的；如果用户填了，也可以考虑用生成的优化版（这里选择如果为空则填入）
                if (!formData.value.speakingStyle) formData.value.speakingStyle = json.speaking_style;
                if (!formData.value.likes) formData.value.likes = json.likes;
                if (!formData.value.dislikes) formData.value.dislikes = json.dislikes;

                formData.value.coreDrive = json.core_drive || '';
                formData.value.deepFear = json.deep_fear || '';
                formData.value.personalityNormal = json.behavior_logic || '';
                uni.showToast({ title: '灵魂注入完成', icon: 'success' });
            } else {
                formData.value.personalityNormal = result;
                uni.showToast({ title: '已生成 (格式可能有误)', icon: 'none' });
            }
            
        } catch (e) {
            console.error(e);
            uni.showToast({ title: '生成失败', icon: 'none' });
        } finally {
            uni.hideLoading();
        }
    };

    // 4. 生成头像 (ComfyUI)
    const generateAvatar = async () => {
      if (!formData.value.appearance.trim()) return uni.showToast({ title: '请先生成 Prompt', icon: 'none' });
      const imgConfig = uni.getStorageSync('app_image_config') || {};
      if (!imgConfig.baseUrl) return uni.showToast({ title: '请在[我的]设置中配置 ComfyUI 地址', icon: 'none' });
      
      uni.showLoading({ title: 'ComfyUI 绘图中...', mask: true });
      const clothes = tempClothingTagsForAvatar.value || '';
      
      const currentStyleKey = imgConfig.style || 'anime'; 
      const stylePrompt = STYLE_PROMPT_MAP[currentStyleKey] || STYLE_PROMPT_MAP['anime'];
      
      // 🔥 组装提示词
      // 如果 clothes 存在，ComfyUI 会尝试画衣服。
      // 但为了保险，可以在这里给 Positive Prompt 加一个 "fully clothed" 的强引导
      let safetyTag = "";
      if (clothes && clothes.length > 2 && formData.value.charFeatures.wearStatus !== '暴露/H') {
          safetyTag = "fully clothed, ";
      }

      const avatarPrompt = `masterpiece, best quality, ${stylePrompt}, ${safetyTag}solo, cowboy shot, upper body, looking at viewer, ${formData.value.appearance}, ${clothes}`;
      
     

      try {
          const tempUrl = await Comfy.generateImage(imgConfig.baseUrl, avatarPrompt, false);
          if (tempUrl) {
              const saveId = targetId.value || 'temp_create';
              const localPath = await saveToGallery(tempUrl, saveId, formData.value.name || '新角色', avatarPrompt);
              formData.value.avatar = localPath;
              uni.showToast({ title: '成功', icon: 'success' });
          } else { throw new Error("ComfyUI 返回为空"); }
      } catch (e) {
          console.error("❌ [Debug] 生图报错:", e);
          uni.showModal({ title: '错误', content: e.message || '请求异常', showCancel: false });
      } finally { uni.hideLoading(); }
    };

    return {
        generateEnglishPrompt,
        generateUserDescription,
        autoGenerateBehavior,
        generateAvatar
    };
}