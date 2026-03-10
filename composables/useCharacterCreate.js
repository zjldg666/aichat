// AiChat/composables/useCharacterCreate.js
import {
	ref
} from 'vue';
import {
	LLM
} from '@/services/llm.js';
import {
	Comfy
} from '@/services/comfyui.js';
import {
	saveToGallery
} from '@/utils/gallery-save.js';
import {
	FACE_STYLES_MAP,
	STYLE_PROMPT_MAP
} from '@/utils/constants.js';

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
			return uni.showToast({
				title: '请先选择特征',
				icon: 'none'
			});
		}

		uni.showLoading({
			title: 'AI 正在优化 Prompt...',
			mask: true
		});

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
				messages: [{
					role: 'user',
					content: prompt
				}],
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

			uni.showToast({
				title: 'Prompt已优化生成',
				icon: 'success'
			});

		} catch (e) {
			console.error("❌ [Debug] 生成过程报错:", e);
			// 失败时的兜底逻辑也同步优化一下，补全名词
			let fallbackSafe = safeChinese; // 这里其实已经是补全过名词的中文了，勉强能用
			formData.value.appearance = `${faceTags}, ${fallbackSafe}`;
			formData.value.appearanceSafe = `${faceTags}, ${fallbackSafe}`;
			tempClothingTagsForAvatar.value = clothesChinese;
			uni.showToast({
				title: 'AI优化失败，使用原文',
				icon: 'none'
			});
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
		if (!rawKeywords) return uni.showToast({
			title: '请先选择特征',
			icon: 'none'
		});
		uni.showLoading({
			title: '生成中...',
			mask: true
		});
		try {
			const config = getCurrentLlmConfig();
			if (!config || !config.apiKey) throw new Error('请配置 API');
			const prompt = `Translate to English tags: "${rawKeywords}". Start with "1boy". Output ONLY tags.`;
			const result = await LLM.chat({
				config,
				messages: [{
					role: 'user',
					content: prompt
				}],
				systemPrompt: "You are a prompt translator.",
				temperature: 0.3
			});
			formData.value.userAppearance = result;
			uni.showToast({
				title: '成功',
				icon: 'success'
			});
		} catch (e) {
			formData.value.userAppearance = `1boy, ${rawKeywords}`;
			uni.showToast({
				title: '翻译失败，使用原文',
				icon: 'none'
			});
		} finally {
			uni.hideLoading();
		}
	};

	const autoGenerateBehavior = async () => {
	            if (!formData.value.bio || formData.value.bio.length < 5) return uni.showToast({ title: '请先填写"背景故事"', icon: 'none' });
	            
	            uni.showLoading({ title: 'AI正在注入灵魂...', mask: true });
	            
	            // ✨ 构造输入信息（包含全部 8 个维度）
	            const prompt = `[System: Expert Persona Architect (顶级人性心理学架构师)]
	            目标：你要为一个生活模拟游戏构建一个具有【高度逻辑自洽性】、【反差张力】和【真实瑕疵】的活人灵魂。
	            ⚠️ **绝对禁令**：禁止写出“乐于助人、善解人意、讲道理”的AI式客服人设。必须给她加上幽暗面、小脾气或性格缺陷！
	            
	            【输入档案】
	            姓名: ${formData.value.name || '未命名'}
	            性别: ${formData.value.gender || '未知'}
	            背景故事: ${formData.value.bio || '未设定'}
	            人物性格: ${formData.value.personality || '未设定'}
	            玩家设定: 扮演 ${formData.value.userGender || '男'}，当前关系是【${formData.value.userRelation || '未设定'}】
	            
	            【核心任务与输出要求】
	            请基于上述档案，推理并输出以下 8 个维度的设定。必须严格使用 [TAG] 包裹！
	            
	            1. **[SPEAKING_STYLE] 说话风格**:
	               - 提取 3 个关键词（如：毒舌、慵懒、古风），并提供 1-2 句符合人设的经典台词示例。
	            
	            2. **[LIKES] 喜好**:
	               - 3-5 个具体名词，必须接地气且符合人设（如：黑咖啡、下雨天、被摸头）。
	               
	            3. **[DISLIKES] 雷点**:
	               - 3-5 个具体厌恶的事物或行为（如：别人翻旧账、油腻的搭讪、香菜）。
	
	            4. **[BACKGROUND_EXPAND] 背景与深层动机**:
	               - 写“事实”。扩充她过去的经历、童年阴影、或核心内驱力。
	            
	            5. **[RELATION_BEHAVIOR] 关系动态偏置**:
	               - 基于当前关系，她私下会怎么对待玩家？（写出占有欲、试探或边界感）。
	            
	            6. **[FLAWS] 软肋与缺陷**:
	               - 必须分配 2-3 个真实的缺点（如：极度护食、吃醋时会阴阳怪气、路痴、嘴硬）。
	            
	            7. **[SECRET] 反差与秘密**:
	               - 只有极度亲密时才会暴露的秘密（如：白天是冰山女总裁，私下其实怕黑要抱毛绒玩具）。
	            
	            8. **[CONFLICT_MODE] 冲突应激模式**:
	               - 当她生气或受委屈时，她的本能反应是什么？
	               - ⚠️ **严禁写“主动沟通解决问题”**！写真实的反应（如：冷战回避、翻旧账、委屈大哭）。
	            
	            【输出格式】 (请严格保持标签名一致，不要输出多余废话)
	            [SPEAKING_STYLE]
	            (内容...)
	            
	            [LIKES]
	            (内容...)
	            
	            [DISLIKES]
	            (内容...)
	            
	            [BACKGROUND_EXPAND]
	            (内容...)
	            
	            [RELATION_BEHAVIOR]
	            (内容...)
	            
	            [FLAWS]
	            (内容...)
	            
	            [SECRET]
	            (内容...)
	            
	            [CONFLICT_MODE]
	            (内容...)`;
	    
	            try {
	                const config = getCurrentLlmConfig();
	                if (!config || !config.apiKey) throw new Error('请配置 API');
	                
	                const result = await LLM.chat({
	                    config, 
	                    messages: [{ role: 'user', content: prompt }], 
	                    systemPrompt: "You are an expert Character Psychologist. Output structured text with tags ONLY.", 
	                    temperature: 0.8,
	                    jsonMode: false 
	                });
	                
	                // 🛠️ 手动解析器：精准提取 [TAG] 之间的内容
	                const extract = (tag) => {
	                    const regex = new RegExp(`\\[${tag}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`, 'i');
	                    const match = result.match(regex);
	                    return match ? match[1].trim() : '';
	                };
	    
	                const extractedData = {
	                    speaking_style: extract('SPEAKING_STYLE'),
	                    likes: extract('LIKES'),
	                    dislikes: extract('DISLIKES'),
	                    background_expand: extract('BACKGROUND_EXPAND'),
	                    relation_behavior: extract('RELATION_BEHAVIOR'),
	                    flaws: extract('FLAWS'),
	                    secret: extract('SECRET'),
	                    conflict_mode: extract('CONFLICT_MODE')
	                };
	    
	                console.log("✅ [AI 灵魂注入解析结果]:", extractedData);
	    
	                // 只要解析出了核心逻辑，就视为成功
	                if (extractedData.background_expand) {
	                    // 覆盖基础逻辑
	                    formData.value.personalityCore = extractedData.background_expand;
	                    formData.value.personalityDynamic = extractedData.relation_behavior;
	                    formData.value.personalityNormal = extractedData.background_expand; // 兼容旧字段
	                    
	                    // ✨ 智能补全：如果用户没填这些字段，就把 AI 生成的精妙设定填入对应的输入框！
	                    if (!formData.value.speakingStyle) formData.value.speakingStyle = extractedData.speaking_style;
	                    if (!formData.value.likes) formData.value.likes = extractedData.likes;
	                    if (!formData.value.dislikes) formData.value.dislikes = extractedData.dislikes;
	                    if (!formData.value.flaws) formData.value.flaws = extractedData.flaws;
	                    if (!formData.value.secret) formData.value.secret = extractedData.secret;
	                    if (!formData.value.conflictMode) formData.value.conflictMode = extractedData.conflict_mode;
	    
	                    uni.showToast({ title: '全维度灵魂注入成功！', icon: 'success' });
	                } else {
	                    // 兜底：如果解析失败，退回原文
	                    formData.value.personalityCore = result;
	                    uni.showToast({ title: '解析不完整，已填入原文', icon: 'none' });
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
		if (!formData.value.appearance.trim()) return uni.showToast({
			title: '请先生成 Prompt',
			icon: 'none'
		});
		const imgConfig = uni.getStorageSync('app_image_config') || {};
		if (!imgConfig.baseUrl) return uni.showToast({
			title: '请在[我的]设置中配置 ComfyUI 地址',
			icon: 'none'
		});

		uni.showLoading({
			title: 'ComfyUI 绘图中...',
			mask: true
		});
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

		const avatarPrompt =
			`masterpiece, best quality, ${stylePrompt}, ${safetyTag}solo, cowboy shot, upper body, looking at viewer, ${formData.value.appearance}, ${clothes}`;



		try {
			const tempUrl = await Comfy.generateImage(imgConfig.baseUrl, avatarPrompt, false);
			if (tempUrl) {
				const saveId = targetId.value || 'temp_create';
				const localPath = await saveToGallery(tempUrl, saveId, formData.value.name || '新角色',
					avatarPrompt);
				formData.value.avatar = localPath;
				uni.showToast({
					title: '成功',
					icon: 'success'
				});
			} else {
				throw new Error("ComfyUI 返回为空");
			}
		} catch (e) {
			console.error("❌ [Debug] 生图报错:", e);
			uni.showModal({
				title: '错误',
				content: e.message || '请求异常',
				showCancel: false
			});
		} finally {
			uni.hideLoading();
		}
	};

	return {
		generateEnglishPrompt,
		generateUserDescription,
		autoGenerateBehavior,
		generateAvatar
	};
}