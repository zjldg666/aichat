// AiChat/utils/constants.js

// 1. 画风映射 (对应 Mine 页面的选择)
export const STYLE_PROMPT_MAP = {
    'anime': 'anime style, cel shading, vibrant colors, clean lines, high quality',
    'impasto': 'impasto oil painting, thick brushstrokes, textured, artistic, expressive',
    'retro': '1990s anime style, retro art, vhs glitch, lo-fi aesthetic, nostalgic',
    'shinkai': 'makoto shinkai style, hyper detailed clouds, lens flare, cinematic lighting, breathtaking scenery',
    'gothic': 'gothic art style, dark atmosphere, intricate details, mysterious, somber colors',
    'cyber': 'cyberpunk style, neon lights, futuristic, high tech, chromatic aberration',
    'pastel': 'pastel colors, soft lighting, dreamy atmosphere, watercolor texture, gentle',
    'sketch': 'monochrome sketch, pencil lines, rough texture, artistic, manga style'
};

// 2. 负面提示词 (Negative Prompt)
export const NEGATIVE_PROMPTS = {
    // 单人模式
    SOLO: " (low quality, worst quality:1.2), bad anatomy, bad hands, missing fingers, extra digit, fewer digits, fused fingers, bad composition, inaccurate eyes, (extra arms:1.2), (extra legs), error, jpeg artifacts, signature, watermark, username, artist name, text, child, loli, underage, 2girls, 2boys, multiple girls, multiple boys, couple, multiple views, split screen, censor, mosaic, bar, blurry",
    
    // 双人模式 (允许出现 boy/couple，但依然禁止 child/loli 和 马赛克)
    DUO: " (low quality, worst quality:1.2), bad anatomy, bad hands, missing fingers, extra digit, fewer digits, fused fingers, bad composition, inaccurate eyes, (extra arms:1.2), (extra legs), error, jpeg artifacts, signature, watermark, username, artist name, text, child, loli, underage, multiple views, grid, collage, split screen, censor, mosaic, bar, blurry"
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