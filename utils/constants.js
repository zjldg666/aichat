// AiChat/utils/constants.js

// 1. 画风映射 (必须与 Mine 页面 DRAWING_STYLES 的 value 一一对应)
export const STYLE_PROMPT_MAP = {
    // === 原有保留 ===
    'anime': 'anime style, cel shading, vibrant colors, clean lines, high quality',
    'impasto': 'impasto oil painting, thick brushstrokes, textured, artistic, expressive',
    'retro': '1990s anime style, retro art, vhs glitch, lo-fi aesthetic, nostalgic',
    'shinkai': 'makoto shinkai style, hyper detailed clouds, lens flare, cinematic lighting, breathtaking scenery',
    'pastel': 'pastel colors, soft lighting, dreamy atmosphere, watercolor texture, gentle',
    'sketch': 'monochrome sketch, pencil lines, rough texture, artistic, manga style',

    // === ✨ 新增/修改的画风 (关键修复点) ===
    
    // 吉卜力 (Ghibli)
    'ghibli': 'studio ghibli style, miyazaki hayao style, anime style, watercolor background, lush details, peaceful atmosphere, painting',
    
    // 古风仙侠 (GuFeng) - AI听不懂拼音，必须翻译成描述
    'gufeng': 'chinese traditional art, ink painting style, wuxia, xianxia, hanfu, ancient chinese architecture, flowing fabric, elegant, eastern fantasy, watercolor ink'
};

// 2. 负面提示词 (Negative Prompt)
export const NEGATIVE_PROMPTS = {
    // 单人模式
    SOLO: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, child, loli, underage, multiple boys, multiple views, deformed, missing limbs, extra arms, extra legs, fused fingers",
    
    // 双人模式 (允许出现 boy/couple，但依然禁止 child/loli 和 马赛克)
    DUO: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, child, loli, underage, multiple boys, multiple views, deformed, missing limbs, extra arms, extra legs, fused fingers"
};

// 3. ComfyUI 工作流模板
export const COMFY_WORKFLOW_TEMPLATE = {
  "1": {
    "inputs": {
      "ckpt_name": "waiNSFWIllustrious_v140.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Checkpoint加载器（简易）"
    }
  },
  "2": {
    "inputs": {
      "stop_at_clip_layer": -2,
      "clip": [
        "1",
        1
      ]
    },
    "class_type": "CLIPSetLastLayer",
    "_meta": {
      "title": "设置CLIP最后一层"
    }
  },
  "3": {
    "inputs": {
      "text": "", 
      "clip": [
        "2",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP文本编码 (正向)"
    }
  },
  "4": {
    // 这里保留默认也没事，因为 chat.vue 会用 NEGATIVE_PROMPTS 覆盖它
    "inputs": {
      "text": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, child, loli, underage, multiple boys, multiple views, deformed, missing limbs, extra arms, extra legs, fused fingers, censor, mosaic",
      "clip": [
        "2",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP文本编码 (负向)"
    }
  },
  "5": {
    "inputs": {
      "seed": 0,
      "steps": 28, // 稍微降低步数提高速度，Illustrious 28步足够
      "cfg": 7,
      "sampler_name": "euler", // 推荐使用 euler 或 dpmpp_2m
      "scheduler": "normal",   // Illustrious 推荐 normal 或 karras
      "denoise": 1,
      "model": [
        "1",
        0
      ],
      "positive": [
        "3",
        0
      ],
      "negative": [
        "4",
        0
      ],
      "latent_image": [
        "36",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "K采样器"
    }
  },
  "9": {
    "inputs": {
      "tile_size": 512,
      "overlap": 64,
      "temporal_size": 64,
      "temporal_overlap": 8,
      "samples": [
        "5",
        0
      ],
      "vae": [
        "1",
        2
      ]
    },
    "class_type": "VAEDecodeTiled",
    "_meta": {
      "title": "VAE解码（分块）"
    }
  },
  "16": {
    "inputs": {
      "output_path": "[time(%Y-%m-%d)]",
      "filename_prefix": "AiChat_Gen", 
      "filename_delimiter": "_",
      "filename_number_padding": 4,
      "filename_number_start": "false",
      "extension": "webp",
      "dpi": 300,
      "quality": 85,
      "optimize_image": "true",
      "lossless_webp": "false",
      "overwrite_mode": "false",
      "show_history": "false",
      "show_history_by_prefix": "true",
      "embed_workflow": "true",
      "show_previews": "true",
      "images": [
        "9", 
        0
      ]
    },
    "class_type": "Image Save", 
    "_meta": {
      "title": "图像保存 (WebP)"
    }
  },
  "36": {
    "inputs": {
      "resolution": "832x1216 (0.68)", 
      "batch_size": 1,
      "width_override": 0,
      "height_override": 0
    },
    "class_type": "SDXLEmptyLatentSizePicker+", 
    "_meta": {
      "title": "SDXL空Latent尺寸选择"
    }
  }
};
// ... 原有的代码保持不变 ...

export const FACE_STYLES_MAP = {
    // 原有风格（微调 cute）
    'cute': 'cute face, youthful face, round face, large sparkling eyes, small nose, soft facial features',
    'cool': 'mature face, sharp eyes, narrow eyes, defined jawline, elegant features, intimidating beauty',
    'sexy': 'mature female face, seductive eyes, full lips, glossy lipstick, beauty mole under eye',
    'energetic': 'wide open eyes, bright vivid eyes, lively expression, energetic vibe',
    'emotionless': 'pale skin, straight bangs, doll-like face, empty eyes, emotionless expression',
    'yandere': 'shadowed face, sanpaku eyes, dark circles under eyes, sickly pale skin, hollow eyes',

    // 扩展风格
    'alluring': 'alluring face, half-lidded eyes, seductive gaze, sharp eyelashes, enchanting expression',
    'dominant': 'dominant female face, cold confident eyes, arrogant expression, strong gaze, commanding presence',
    'gentle': 'gentle face, soft eyes, warm smile, delicate features, kind expression',
    'villainess': 'villainous beauty, sly smile, sharp eyes, confident smirk, dangerous elegance',
    'obsessive': 'obsessive gaze, intense eyes, flushed cheeks, unstable expression, desperate affection',
    'mysterious': 'mysterious face, half-shadowed eyes, calm expression, distant gaze, quiet elegance',
    'elegant_mature': 'elegant mature face, refined features, calm confident eyes, subtle makeup, classy beauty',
    'teasing': 'teasing expression, playful eyes, naughty smile, flirtatious gaze',
    'vampire': 'vampire-like beauty, pale elegant face, crimson eyes, cold predatory gaze',
    'mannequin': 'porcelain doll face, flawless skin, empty gaze, unnatural beauty, emotionless calm'
};

export const FACE_LABELS = {
    // 原有
    'cute': '🍭 可爱/幼态',
    'cool': '❄️ 高冷/御姐',
    'sexy': '💋 成熟/人妻',
    'energetic': '🌟 元气/活泼',
    'emotionless': '😐 三无/冷淡',
    'yandere': '🔪 病娇/黑化',

    // 扩展
    'alluring': '🖤 妖艳/魔性',
    'dominant': '👑 女王/支配',
    'gentle': '🌸 温柔/贤惠',
    'villainess': '😈 邪气/反派',
    'obsessive': '🫦 痴迷/执念',
    'mysterious': '🌙 神秘/冷艳',
    'elegant_mature': '🍷 成熟/冷艳',
    'teasing': '🐱 撩人/小恶魔',
    'vampire': '🩸 吸血鬼/冷血',
    'mannequin': '🪞 人偶/非人感'
};
