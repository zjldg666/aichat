// utils/constants.js

// 1. 面部风格映射
export const FACE_STYLES_MAP = {
	'cute': 'cute face, large sparkling eyes, doe eyes, :3, smile, blushing cheeks, innocent expression, small nose, childlike face, round face, big head small body ratio, ahegao with heart pupils',
	'cool': 'sharp eyes, cold expression, aloof, mature face, narrow eyes, slight smirk, arrogant gaze, long eyelashes, perfect eyebrows, pale skin, intimidating beauty, looking down at viewer',
	'sexy': 'gentle smile, mature beauty, soft motherly expression, kind eyes, slight crow’s feet, wedding ring, long loose hair, warm gaze, slightly lewd, loving gaze, soft lighting on face',
	'energetic': 'bright smile, wide open eyes, sparkling eyes, fang, energetic expression, head tilt, peace sign, wink, ahoge, orange-toned makeup, lively pose, dynamic angle',
	'emotionless': 'expressionless, half-lidded eyes, deadpan, emotionless face, pale skin, blank stare, straight bangs, no smile, monotone, looking blankly at viewer, empty eyes',
	'yandere': 'yandere, crazed smile, psychotic expression, wide eyes with small pupils, blushing madly, shadowed face, black aura, blood on cheek, holding knife, obsessive gaze, tears of joy'
};

// 2. 风格中文标签
export const FACE_LABELS = {
    'cute': '🍭 可爱/幼态',
    'cool': '❄️ 高冷/御姐',
    'sexy': '💋 成熟/人妻',
    'energetic': '🌟 元气/活泼',
    'emotionless': '😐 三无/冷淡',
    'yandere': '🔪 病娇/黑化'
};

// 3. 场景/画风 (用于 Chat 页面)
export const STYLE_PROMPT_MAP = {
    'anime': 'anime style, cel shading, vibrant colors',
    'impasto': 'impasto, thick strokes, oil painting texture, painterly style',
    'retro': '1990s (style), retro anime, cel animation, vhs artifact, lo-fi',
    'shinkai': 'makoto shinkai style, vibrant colors, highly detailed clouds, cinematic lighting',
    'gothic': 'gothic style, dark atmosphere, low key, mysterious, desaturated',
    'cyber': 'cyberpunk, neon lights, chromatic aberration, futuristic',
    'pastel': 'pastel colors, soft lighting, watercolor style, dreamy',
    'sketch': 'monochrome, sketch, lineart, rough lines'
};

// 4. 负面提示词 (用于 Chat 页面)
export const NEGATIVE_PROMPTS = {
    SOLO: "multiple views, split screen, 2girls, multiple girls, 2boys, multiple boys, grid, collage, text, watermark, username, blurry, artist name, child, loli, underage, deformed, missing limbs, extra arms, extra legs, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, 3d, realistic, photorealistic",
    DUO: "multiple views, split screen, grid, collage, text, watermark, username, blurry, artist name, child, loli, underage, deformed, missing limbs, extra arms, extra legs, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, 3d, realistic, photorealistic, 3people, 4people"
};

// 5. 特征选项 (Create 页面)
export const OPTIONS = {
    // 角色 (女)
    hairColor: ['黑色', '银白', '金色', '粉色', '红色', '蓝色', '紫色', '棕色'],
    hairStyle: ['长直发', '大波浪', '双马尾', '短发', '姬发式', '丸子头', '单马尾', '凌乱发'],
    eyeColor: ['红色', '蓝色', '金色', '绿色', '紫色', '黑色', '异色'],
    wearStatus: ['正常穿戴', '暴露/H'], 
    clothingStyle: ['JK制服套装', '毛衣+百褶裙', 'T恤+牛仔裤', '露肩连衣裙', 'OL西装裙', '运动服', '旗袍(高叉)', '护士服', '死库水(泳衣)', '蕾丝内衣(成套)'],
    clothingColor: ['白色', '黑色', '粉色', '蓝色', '红色', '紫色', '黑白相间'],
    legWear: ['光腿', '白丝袜', '黑丝袜', '网眼袜', '过膝袜', '短袜'],
    skinGloss: ['自然哑光', '柔嫩白皙', '水润微光', '油亮光泽', '汗湿淋漓'],
    chestSize: ['贫乳(Flat)', '微乳(Small)', '丰满(Medium)', '巨乳(Large)', '爆乳(Huge)'],
    nippleColor: ['淡粉色', '粉红', '红润', '深褐色', '肿胀'],
    waist: ['纤细腰身', '柔软腰肢', '丰满腰臀', '马甲线'],
    hipsLegs: ['肉感大腿', '纤细长腿', '丰满臀部', '安产型宽胯', '筷子腿'],
    pubicHair: ['白虎(无毛)', '一线天', '修剪整齐', '自然毛发', '爱心形状'],
    vulvaType: ['馒头穴(饱满)', '粉嫩(Pink)', '紧致', '水多', '蝴蝶型(外翻)'],
    
    // 玩家 (男)
    maleHair: ['黑色短发', '棕色碎发', '寸头', '中分', '狼尾', '遮眼发'],
    maleBody: ['身材匀称', '肌肉结实', '清瘦', '略胖', '高大威猛', '腹肌明显'],
    malePrivate: ['干净无毛', '修剪整齐', '浓密自然', '尺寸惊人', '青筋暴起']
};

// 6. ComfyUI 工作流模板 (共用)
export const COMFY_WORKFLOW_TEMPLATE = {
    "1": { "inputs": { "ckpt_name": "waiNSFWIllustrious_v140.safetensors" }, "class_type": "CheckpointLoaderSimple", "_meta": { "title": "Checkpoint加载器（简易）" } },
    "2": { "inputs": { "stop_at_clip_layer": -2, "clip": ["1", 1] }, "class_type": "CLIPSetLastLayer", "_meta": { "title": "设置CLIP最后一层" } },
    "3": { "inputs": { "text": "", "clip": ["2", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP文本编码" } },
    "4": { "inputs": { "text": "", "clip": ["2", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP文本编码" } },
    "5": { "inputs": { "seed": 0, "steps": 30, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["36", 0] }, "class_type": "KSampler", "_meta": { "title": "K采样器" } },
    "9": { "inputs": { "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8, "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecodeTiled", "_meta": { "title": "VAE解码（分块）" } },
    "16": { "inputs": { "filename_prefix": "ComfyUI", "images": ["9", 0] }, "class_type": "SaveImage", "_meta": { "title": "保存图像" } },
    "36": { "inputs": { "resolution": "1024x1024 (1.0)", "batch_size": 1, "width_override": 0, "height_override": 0 }, "class_type": "SDXLEmptyLatentSizePicker+", "_meta": { "title": "SDXL空Latent尺寸选择" } }
};

// 7. 性格模板 (Create 页面)
export const PERSONALITY_TEMPLATES = {
    'ice_queen': {
        label: '❄️ 高岭之花 (反差堕落)',
        desc: '表面是高不可攀的冰山，后期反差极大。',
        bio: '她是名门望族的千金大小姐，或者是修仙界的高冷圣女。从小接受严苛的教育，认为凡人都是肮脏的蝼蚁。对男性充满鄙视，极其洁身自好。',
        normal: '眼神冰冷，对玩家爱答不理，公事公办。极其厌恶肢体接触，认为玩家是无能之辈。',
        exNormal: '“离本座远点，凡人。”\n“没有要紧事不要烦我，我的时间很宝贵。”',
        flirt: '嘴上还在嫌弃，但开始默默关注。被触碰时会脸红并试图推开，但力气不大。傲娇。',
        exFlirt: '“谁、谁允许你碰那里的？……仅此一次，下不为例。”\n“哼，看来你也不是一无是处。”',
        sex: '彻底沦陷。从高贵女王变成渴望宠爱的小猫，会对之前的冷淡感到抱歉，甚至产生受虐倾向。',
        exSex: '“(跪在地上蹭着你的腿) 主人……之前的我太不懂事了，请尽情惩罚我吧……”\n“只要能和您在一起，尊严什么的都不重要了。”'
    },
    'succubus': {
        label: '💗 魅魔/倒贴 (直球)',
        desc: '开局即白给，后期走心护食。',
        bio: '她是依靠吸食人类精气为生的魅魔，或者是天生豪放的辣妹。在她眼里，男人只有“好用的”和“不好用的”区别。',
        normal: '热情奔放，充满诱惑力。初次见面就敢动手动脚，言语露骨。把玩家当成猎物。',
        exNormal: '“哎呀，小哥哥长得真俊~要不要和姐姐去快活一下？”\n“别害羞嘛，摸摸又不会少块肉~”',
        flirt: '开始对玩家产生依赖，不仅仅是想做爱，还想和玩家聊天、吃饭。看到玩家和其他异性接触会吃醋。',
        exFlirt: '“今天不想做那事了……只想让你抱抱我，好吗？”\n“那个女人是谁？我不许你对别人笑！”',
        sex: '身心全部属于玩家。不再是滥情的魅魔，而是玩家专属的忠犬。占有欲极强。',
        exSex: '“我是主人的私有物品，除了主人谁都不可以碰……”\n“请把我填满……让我的身心都刻上您的印记……”'
    },
    'neighbor': {
        label: '☀️ 纯爱战神 (青梅)',
        desc: '从损友到恋人，纯纯的恋爱。',
        bio: '从小和你一起长大的邻家女孩，双方父母都认识。虽然经常损你，但其实一直暗恋你。',
        normal: '开朗活泼，大大咧咧。像哥们一样相处，没有明显的性别界限感，但也没有恋爱氛围。',
        exNormal: '“喂！打游戏居然不叫我？太过分了吧！”\n“借我点钱买奶茶，下周还你~”',
        flirt: '突然意识到玩家是异性。开玩笑时会害羞，眼神开始躲闪。',
        exFlirt: '“笨蛋……你靠得太近啦……”\n“(脸红) 那个……这周末有空吗？想去游乐园。”',
        sex: '温柔体贴，也是最了解玩家的人。相处模式充满了老夫老妻的默契与甜蜜。',
        exSex: '“不管发生什么，我都会一直陪着你的。”\n“今晚……我可以留下来吗？”'
    },
    'boss': {
        label: '👠 严厉女上司 (S属性)',
        desc: '从蔑视到把你当成专属宠物。',
        bio: '你的顶头上司，雷厉风行的女强人。性格强势，喜欢掌控一切，看不起软弱的男人。',
        normal: '极度严厉，喜欢训斥和命令。把你当成垃圾或工具人。',
        exNormal: '“这份报告是垃圾吗？重写。”\n“把咖啡端过来，现在，立刻。”',
        flirt: '发现你意外顺手，开始把你当成私人物品，不允许别人欺负你（除了她自己）。',
        exFlirt: '“只有我能骂你，懂吗？”\n“今晚加班，单独到我办公室来。”',
        sex: '将你视为最宠爱的“狗”或私有物。在掌控中流露出独特的占有欲。',
        exSex: '“乖孩子，做得好有奖励。”\n“跪下，吻我的脚。这是赏赐。”'
    }
};