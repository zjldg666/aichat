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
    const generateEnglishPrompt = async () => {
       
        const f = formData.value.charFeatures;
        
        // 判断当前是否是暴露模式
        const isExposed = f.wearStatus === '暴露/H';

        const selectedFaceStyle = formData.value.faceStyle;
        const faceTags = FACE_STYLES_MAP[selectedFaceStyle] || selectedFaceStyle || '';
        
        // 1.1 拼接中文描述 - 安全部分 (身体/脸)
        let safeParts = [];
        if (f.hairColor || f.hairStyle) safeParts.push(`${f.hairColor || ''}${f.hairStyle || ''}`);
        if (f.eyeColor) safeParts.push(`${f.eyeColor}眼睛`);
        if (f.skinGloss) safeParts.push(`皮肤${f.skinGloss}`);
        if (f.chestSize) safeParts.push(`胸部${f.chestSize}`); // "大胸"是安全的，但不要描述细节
        if (f.waist) safeParts.push(f.waist);
        if (f.hips) safeParts.push(f.hips);
        if (f.legs) safeParts.push(f.legs);
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
    
            // 构造 Prompt
            const prompt = `You are an expert AI Art Prompt Engineer specializing in Anime/Danbooru styles.
            
            【Input Data】
            1. Body Features: "${safeChinese}"
            2. Private Details: "${nsfwChinese}"  (If empty, output empty string)
            3. Clothing: "${clothesChinese}"
    
            【Optimization Rules】
            1. **Translate & Refine**: Convert to high-quality Danbooru tags.
            2. **Safety First**: If "Clothing" is present, absolutely NO nudity tags (like nipples, pussy) in the "Body Tags" section.
            3. **Be Specific**: "shirt" -> "white t-shirt", "skirt" -> "pleated skirt".
            4. **Format Constraint**: Output EXACTLY three parts separated by "|||".
    
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
            formData.value.appearance = `${faceTags}, ${safeChinese}`; 
            formData.value.appearanceSafe = `${faceTags}, ${safeChinese}`; 
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

    // 3. 自动生成行为逻辑 (升级版：深度人格)
    const autoGenerateBehavior = async () => {
        if (!formData.value.bio || formData.value.bio.length < 5) return uni.showToast({ title: '请先填写"背景故事"', icon: 'none' });
        
        uni.showLoading({ title: 'AI正在深入剖析...', mask: true });
        
        const roleInfo = `姓名: ${formData.value.name || '未命名'}\n职业: ${formData.value.occupation || '未设定'}\n背景故事: ${formData.value.bio}\n说话风格: ${formData.value.speakingStyle || '未设定'}\n喜好: ${formData.value.likes || '未设定'}\n厌恶: ${formData.value.dislikes || '未设定'}`;
        
        const prompt = `[System: Deep Personality Architect]
请根据以下角色设定，构建一个具有心理深度的真实人格。

【角色设定】
${roleInfo}

【任务要求】
请分析该角色的潜意识，并生成以下三个核心字段（请输出纯 JSON 格式）：

1. **core_drive** (核心驱力): 她做一切事情的根本动力是什么？(如：渴望被理解、追求刺激、寻求安全感、想要被支配)。限 20 字。
2. **deep_fear** (深层恐惧): 她内心最害怕失去什么？(如：害怕被抛弃、害怕无聊、害怕暴露软弱)。限 20 字。
3. **behavior_logic** (行为逻辑): 
   - 不要写“友好的”、“温柔的”这种空泛形容词。
   - 要写具体的互动原则：她如何处理冲突？她如何表达好感（是直球还是傲娇）？
   - 包含“Show, Don't Tell”的指令：比如“当她害羞时，不要说‘我害羞了’，而是描述她躲闪的眼神和变红的耳根”。
   - 限 150 字以内。

【输出格式 JSON】
{
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
                systemPrompt: "You are a psychologist specializing in character analysis. Output JSON only.", 
                temperature: 0.7,
                jsonMode: true 
            });
            
            // 解析 JSON
            let json = null;
            try {
                const cleanStr = result.replace(/```json|```/g, '').trim();
                json = JSON.parse(cleanStr);
            } catch (e) {
                console.warn('JSON Parse failed, using raw text fallback');
            }

            if (json) {
                formData.value.coreDrive = json.core_drive || '';
                formData.value.deepFear = json.deep_fear || '';
                formData.value.personalityNormal = json.behavior_logic || '';
                uni.showToast({ title: '深度人格已生成', icon: 'success' });
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