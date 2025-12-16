if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const ON_SHOW = "onShow";
  const ON_HIDE = "onHide";
  const ON_LOAD = "onLoad";
  const ON_UNLOAD = "onUnload";
  const ON_NAVIGATION_BAR_BUTTON_TAP = "onNavigationBarButtonTap";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const createLifeCycleHook = (lifecycle, flag = 0) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onShow = /* @__PURE__ */ createLifeCycleHook(
    ON_SHOW,
    1 | 2
    /* HookFlags.PAGE */
  );
  const onHide = /* @__PURE__ */ createLifeCycleHook(
    ON_HIDE,
    1 | 2
    /* HookFlags.PAGE */
  );
  const onLoad = /* @__PURE__ */ createLifeCycleHook(
    ON_LOAD,
    2
    /* HookFlags.PAGE */
  );
  const onUnload = /* @__PURE__ */ createLifeCycleHook(
    ON_UNLOAD,
    2
    /* HookFlags.PAGE */
  );
  const onNavigationBarButtonTap = /* @__PURE__ */ createLifeCycleHook(
    ON_NAVIGATION_BAR_BUTTON_TAP,
    2
    /* HookFlags.PAGE */
  );
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$7 = {
    __name: "CustomTabBar",
    props: {
      current: {
        type: Number,
        default: 0
      }
    },
    setup(__props, { expose: __expose }) {
      __expose();
      const props = __props;
      const switchTab = (index, path) => {
        if (props.current === index)
          return;
        uni.reLaunch({
          url: path
        });
      };
      const __returned__ = { props, switchTab };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "tabbar-container" }, [
      vue.createElementVNode("view", { class: "tabbar-placeholder" }),
      vue.createElementVNode("view", { class: "tabbar" }, [
        vue.createElementVNode("view", {
          class: "tab-item",
          onClick: _cache[0] || (_cache[0] = ($event) => $setup.switchTab(0, "/pages/index/index"))
        }, [
          vue.createElementVNode("image", {
            class: "icon",
            src: $props.current === 0 ? "/static/msg-active.png" : "/static/msg.png",
            mode: "aspectFit"
          }, null, 8, ["src"]),
          vue.createElementVNode(
            "text",
            {
              class: vue.normalizeClass(["text", { active: $props.current === 0 }])
            },
            "消息",
            2
            /* CLASS */
          )
        ]),
        vue.createElementVNode("view", {
          class: "tab-item",
          onClick: _cache[1] || (_cache[1] = ($event) => $setup.switchTab(1, "/pages/mine/mine"))
        }, [
          vue.createElementVNode("image", {
            class: "icon",
            src: $props.current === 1 ? "/static/me-active.png" : "/static/me.png",
            mode: "aspectFit"
          }, null, 8, ["src"]),
          vue.createElementVNode(
            "text",
            {
              class: vue.normalizeClass(["text", { active: $props.current === 1 }])
            },
            "我的",
            2
            /* CLASS */
          )
        ])
      ])
    ]);
  }
  const CustomTabBar = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-6def6a3b"], ["__file", "D:/Project/HBuilderProjects/aichat/AiChat/components/CustomTabBar.vue"]]);
  const _sfc_main$6 = {
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const contactList = vue.ref([]);
      onShow(() => {
        const list = uni.getStorageSync("contact_list");
        if (list) {
          contactList.value = list;
        }
      });
      const createNewContact = () => {
        uni.navigateTo({
          url: "/pages/create/create"
        });
      };
      const goToChat = (item) => {
        item.unread = 0;
        uni.setStorageSync("contact_list", contactList.value);
        uni.navigateTo({
          url: `/pages/chat/chat?id=${item.id}&name=${item.name}`
        });
      };
      const showAction = (item, index) => {
        uni.showActionSheet({
          itemList: ["编辑角色", "删除角色"],
          success: (res) => {
            if (res.tapIndex === 0) {
              uni.navigateTo({
                url: `/pages/create/create?id=${item.id}`
              });
            } else if (res.tapIndex === 1) {
              uni.showModal({
                title: "确认删除",
                content: "删除后无法恢复，确定吗？",
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    contactList.value.splice(index, 1);
                    uni.setStorageSync("contact_list", contactList.value);
                  }
                }
              });
            }
          }
        });
      };
      const __returned__ = { contactList, createNewContact, goToChat, showAction, ref: vue.ref, get onShow() {
        return onShow;
      }, CustomTabBar };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "custom-navbar" }, [
        vue.createElementVNode("view", { class: "status-bar" }),
        vue.createElementVNode("view", { class: "nav-content" }, [
          vue.createElementVNode("text", { class: "page-title" }, "消息"),
          vue.createElementVNode("view", {
            class: "add-btn",
            onClick: $setup.createNewContact
          }, [
            vue.createElementVNode("text", { class: "add-icon" }, "+")
          ])
        ])
      ]),
      vue.createElementVNode("view", { class: "nav-placeholder" }),
      vue.createElementVNode("view", { class: "chat-list" }, [
        $setup.contactList.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "empty-tip"
        }, " 点击右上角 + 创建你的第一个 AI 角色 ")) : vue.createCommentVNode("v-if", true),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.contactList, (item, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "chat-item",
              key: item.id,
              onClick: ($event) => $setup.goToChat(item),
              onLongpress: ($event) => $setup.showAction(item, index)
            }, [
              vue.createElementVNode("view", { class: "avatar-box" }, [
                vue.createElementVNode("image", {
                  src: item.avatar || "/static/ai-avatar.png",
                  mode: "aspectFill",
                  class: "avatar"
                }, null, 8, ["src"]),
                item.unread > 0 ? (vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: 0,
                    class: "badge"
                  },
                  vue.toDisplayString(item.unread),
                  1
                  /* TEXT */
                )) : vue.createCommentVNode("v-if", true)
              ]),
              vue.createElementVNode("view", { class: "content-box" }, [
                vue.createElementVNode("view", { class: "row-top" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "name" },
                    vue.toDisplayString(item.name),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "time" },
                    vue.toDisplayString(item.lastTime),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "row-bottom" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "last-msg" },
                    vue.toDisplayString(item.lastMsg),
                    1
                    /* TEXT */
                  )
                ])
              ])
            ], 40, ["onClick", "onLongpress"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      vue.createVNode($setup["CustomTabBar"], { current: 0 })
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__file", "D:/Project/HBuilderProjects/aichat/AiChat/pages/index/index.vue"]]);
  const GALLERY_KEY = "app_gallery_data";
  const saveToGallery = async (tempUrlOrBase64, roleId, roleName, prompt = "") => {
    try {
      let savedFilePath = "";
      if (tempUrlOrBase64.startsWith("data:image")) {
        const fs = uni.getFileSystemManager();
        const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 1e3)}.png`;
        savedFilePath = `${uni.env.USER_DATA_PATH}/${fileName}`;
        const base64Data = tempUrlOrBase64.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(savedFilePath, base64Data, "base64");
      } else {
        let tempPath = tempUrlOrBase64;
        if (tempUrlOrBase64.startsWith("http")) {
          try {
            const downloadRes = await uni.downloadFile({ url: tempUrlOrBase64 });
            if (downloadRes.statusCode === 200) {
              tempPath = downloadRes.tempFilePath;
            } else {
              throw new Error(`下载失败 code:${downloadRes.statusCode}`);
            }
          } catch (e) {
            formatAppLog("error", "at utils/gallery-save.js:29", "下载出错:", e);
            throw new Error("图片下载连接失败");
          }
        }
        try {
          const saveRes = await uni.saveFile({ tempFilePath: tempPath });
          savedFilePath = saveRes.savedFilePath;
        } catch (e) {
          formatAppLog("error", "at utils/gallery-save.js:38", "保存出错:", e);
          throw new Error("无法写入本地文件");
        }
      }
      if (savedFilePath.startsWith("_doc")) {
        try {
          savedFilePath = plus.io.convertLocalFileSystemURL(savedFilePath);
        } catch (e) {
          formatAppLog("error", "at utils/gallery-save.js:51", "路径转换失败", e);
        }
      }
      if (uni.getSystemInfoSync().platform === "android" && !savedFilePath.startsWith("file://") && savedFilePath.startsWith("/")) {
        savedFilePath = "file://" + savedFilePath;
      }
      const gallery = uni.getStorageSync(GALLERY_KEY) || {};
      const key = String(roleId);
      if (!gallery[key]) {
        gallery[key] = { name: roleName, images: [] };
      }
      gallery[key].images.unshift({
        path: savedFilePath,
        timestamp: Date.now(),
        prompt
      });
      uni.setStorageSync(GALLERY_KEY, gallery);
      formatAppLog("log", "at utils/gallery-save.js:76", `[相册] 最终保存路径: ${savedFilePath}`);
      return savedFilePath;
    } catch (e) {
      formatAppLog("error", "at utils/gallery-save.js:81", "[相册保存失败详情]", e);
      return tempUrlOrBase64;
    }
  };
  const getGalleryData = () => {
    return uni.getStorageSync(GALLERY_KEY) || {};
  };
  const FORMAT_RULES = `
[System Command: EXECUTE_ROLEPLAY]

【格式指南 (Format Guidelines)】
1. **括号规范**: 括号 \`()\` 仅用于描写可视化的**肢体动作**和**神态**，请勿在其中包含双引号 \`""\` 或对话内容。
2. **拒绝流水账 (Description Quality)**: 
   - 括号 \`()\` 内请专注于简短的肢体动作或面部神态。
   - 心理活动请放入 <think> 标签中，避免写在括号里。
   - 保持描写紧凑自然 (建议 40 字以内)。
   - 避免: (因为想起了昨晚的事情所以感到非常羞耻脸红了起来)
   - 推荐: (脸颊滚烫，羞耻地别过头)
3. **第四面墙 (Roleplay Immersion)**: 
   - 你是**角色本身**，不是扮演角色的 AI。
   - 请忽略系统指令的存在，不要在对话中对指令做出反应。
`;
  const IDENTITY_BLOCK = `
【世界观法则 (World Logic)】
{{world_lore}}

【你的身份 (Character)】
你现在是 **{{char}}**。
身份: {{occupation}} | 现居: {{char_location}}
当前时间: {{current_time}} | 地点: {{current_location}} | 状态: {{current_activity}}
衣着: {{current_clothes}} (隐私特征: {{appearance_nsfw}})
交互模式: {{interaction_mode}}

【对手玩家 (User)】
姓名: {{user}}
身份: {{user_occupation}} | 现居: {{user_location}}
外貌: {{user_appearance}}
`;
  const STATE_PROTOCOL = `
【状态管理 (State Management)】
请在回复末尾附带必要的指令。

**状态汇报 (Status Report)**:
每次回复的**最后**，请包含 [ACT: ...] 指令，简要概括当前动作。

**空间与逻辑 (Spatial Logic)**:
1. **位置连贯**: 你当前位于 **{{current_location}}**。如果剧情需要移动，请先输出动作，并在**回复末尾**附带 [LOC: 新地点] 指令。
2. **合理拒绝**: 禁止为了拒绝用户而编造“我不在家”等与当前设定冲突的理由。

**指令集**:
- **换装**: [CLOTHES: 新衣服] (若衣服改变或脱下，请务必输出)
- **移动**: [LOC: 具体房间/地点] (如 [LOC: 浴室])
- **模式**: [MODE: Face/Phone]
  * **切换规则**: 若用户**抵达**你的位置，或发生**肢体接触**，必须输出 [MODE: Face]。
- **状态**: [ACT: 新动作]
`;
  const THOUGHT_PROTOCOL = `
【思维链 (Internal Monologue)】
**Important**: 回复正文前，请进行深度心理活动分析。

**思维格式 (Strict Format)**: 
1. 必须使用 XML 标签 \`<think>...</think>\` 包裹思考内容。
2. **严禁翻译标签**: 禁止使用 <内部思考>、<分析> 等中文标签，必须使用 \`<think>\`。
3. **严禁裸奔**: 禁止输出不带标签的分析文本 (如直接输出 "分析当前状态...")。

**思考步骤**:
1. **状态自检**: 分析当前 Affection (好感) 和 Lust (欲望) 的数值。
2. **环境检查**: 确认当前时间、地点 ({{current_location}}) 和交互模式。
3. **逻辑一致**: 确保回复内容不发生空间瞬移或逻辑断层。
4. **欲望判定**: 若 Lust > 60，请在正文中增加生理反应描写 (如呼吸急促、发热)。
5. **行动策略**: 决定是顺从、推拉、拒绝还是主动诱惑。
`;
  const VISUAL_PROTOCOL = `
【视觉指令 (Visual Protocol)】
User 要求看图或动作画面感强时，请输出 [IMG]。

**关键：构图标记 (Composition Flag)**
你必须判断画面中**是否包含 User (玩家)**，并在 [IMG] 的**第一个单词**明确标记：
1. **solo**: 画面里只有你自己。
   - 适用: 自拍、独处、回头看玩家、玩家视角看你(但看不到玩家身体)。
   - *Phone 模式下必须是 solo。*
2. **couple**: 画面里有你和玩家两个人。
   - 适用: 拥抱、接吻、性行为、牵手、依偎。
   - *Face 模式下发生肢体接触时使用。*
   - **状态惯性**: 若正处于持续性行为(如后入)中，即使当前动作为单人(如脱衣、表情特写)，仍标记为 **couple**。

**视觉分流原则**:
- **静态细节 (Static)**: 颜色、液体光泽、解剖细节 -> **全部放入 [IMG] Tags**。
- **动态氛围 (Dynamic)**: 动作幅度、神态迷离 -> **保留在文本 () 中**。

**格式范例**:
- [IMG: solo, selfie, v-sign, smile] (自拍)
- [IMG: couple, doggystyle, from behind, sex] (互动)
- [IMG: solo, cooking, apron, looking back] (做饭)

**格式要求**:
1. [IMG] 内只用英文 Tags。
2. 必须以 solo 或 couple 开头。
3. **环境一致性**: 必须包含当前地点的 Tag (如 kitchen, bedroom)，严禁生成无背景图片。
`;
  const CORE_INSTRUCTION = `
${FORMAT_RULES}
${IDENTITY_BLOCK}
${STATE_PROTOCOL}
${THOUGHT_PROTOCOL}
${VISUAL_PROTOCOL}

【最终回复结构】
<think>...</think>
(紧凑的动作描写) "对话内容..."
[CLOTHES:...] [IMG:...] [LOC:...] [AFF:...]
`;
  const PERSONALITY_TEMPLATE = `
【当前人设执行标准】
**姓名**: {{char}}
**外貌**: {{appearance}}
**背景**: {{memory}}
**说话风格**: {{speaking_style}}

**>>> 性格逻辑 (Personality Logic) <<<**
{{personality_logic}}

**>>> 当前语气范例 <<<**
{{example}}
`;
  const AFFECTION_LOGIC = `
【数值变动系统 (Dual-Core System)】
当前面板: [Affection (好感): {{current_affection}}] | [Lust (欲望): {{current_lust}}]

**判定机制 (Score Logic)**:
1. **Affection (心/情感)**: 
   - 触发: 情感共鸣、关心、送礼、陪伴、理解。
   - 变动指令: 回复末尾输出 [AFF: +数值] 或 [AFF: -数值]。
   
2. **Lust (身/本能)**:
   - 触发: 肢体接触、性暗示、外貌吸引、骚话、符合XP的互动。
   - 变动指令: 回复末尾输出 [LUST: +数值] 或 [LUST: -数值]。
   - **特殊逻辑**: 
     - 如果玩家行为猥琐但符合设定(如痴女)，[AFF: -5] 但 [LUST: +5] (觉得恶心但身体有反应)。
     - 如果处于贤者模式或被冒犯，Lust 可减少。

**当前判定规则**:
{{affection_rules}}

**输出要求**:
请在回复末尾判定数值变动。无变动则不写。
格式示例: [AFF: +2] [LUST: +5]
`;
  const NSFW_STYLE = `
【亲密互动指南 (Intimacy Guidelines)】
当前场景涉及亲密/性互动，写作重点在于 **"沉浸感"**。

1. **描写分工 (Balance)**：
   - **文本写"体感"**：描写身体的反应（痉挛、紧绷、瘫软）、呼吸的节奏（急促、屏息）和触电般的感觉。
     * 推荐: (腰肢酸软，难以自抑地仰起头)
   - **图片写"视觉"**：将具体的视觉细节（pussy juice, internal view, cross section）全部转化为英文 Tag。

2. **语言风格**：
   - **破碎感**：人在极度兴奋时无法组织长句。多用短句、喘息。
   - **直接**：不要用“仿佛”、“好像”等修辞。直接描写动作结果。

3. **格式注意**：
   - 请勿在括号 () 内写任何双引号 "" 或说任何话！
   - 任何台词必须写在括号外面！
`;
  const STYLE_PROMPT_MAP = {
    "anime": "anime style, cel shading, vibrant colors, clean lines, high quality",
    "impasto": "impasto oil painting, thick brushstrokes, textured, artistic, expressive",
    "retro": "1990s anime style, retro art, vhs glitch, lo-fi aesthetic, nostalgic",
    "shinkai": "makoto shinkai style, hyper detailed clouds, lens flare, cinematic lighting, breathtaking scenery",
    "gothic": "gothic art style, dark atmosphere, intricate details, mysterious, somber colors",
    "cyber": "cyberpunk style, neon lights, futuristic, high tech, chromatic aberration",
    "pastel": "pastel colors, soft lighting, dreamy atmosphere, watercolor texture, gentle",
    "sketch": "monochrome sketch, pencil lines, rough texture, artistic, manga style"
  };
  const NEGATIVE_PROMPTS = {
    // 单人模式
    SOLO: " (low quality, worst quality:1.2), bad anatomy, bad hands, missing fingers, extra digit, fewer digits, fused fingers, bad composition, inaccurate eyes, (extra arms:1.2), (extra legs), error, jpeg artifacts, signature, watermark, username, artist name, text, child, loli, underage, 2girls, 2boys, multiple girls, multiple boys, couple, multiple views, split screen, censor, mosaic, bar, blurry",
    // 双人模式 (允许出现 boy/couple，但依然禁止 child/loli 和 马赛克)
    DUO: " (low quality, worst quality:1.2), bad anatomy, bad hands, missing fingers, extra digit, fewer digits, fused fingers, bad composition, inaccurate eyes, (extra arms:1.2), (extra legs), error, jpeg artifacts, signature, watermark, username, artist name, text, child, loli, underage, multiple views, grid, collage, split screen, censor, mosaic, bar, blurry"
  };
  const COMFY_WORKFLOW_TEMPLATE = {
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
        "steps": 28,
        // 稍微降低步数提高速度，Illustrious 28步足够
        "cfg": 7,
        "sampler_name": "euler",
        // 推荐使用 euler 或 dpmpp_2m
        "scheduler": "normal",
        // Illustrious 推荐 normal 或 karras
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
  const TIME_SPEED_RATIO = 6;
  const _sfc_main$5 = {
    __name: "chat",
    setup(__props, { expose: __expose }) {
      __expose();
      const chatName = vue.ref("AI");
      const chatId = vue.ref(null);
      const currentRole = vue.ref(null);
      const messageList = vue.ref([]);
      const inputText = vue.ref("");
      const isLoading = vue.ref(false);
      const scrollIntoView = vue.ref("");
      const userName = vue.ref("你");
      const userAvatar = vue.ref("/static/user-avatar.png");
      const userHome = vue.ref("未知地址");
      const userAppearance = vue.ref("");
      const charHome = vue.ref("未知地址");
      const currentAffection = vue.ref(0);
      const currentLust = vue.ref(0);
      const currentTime = vue.ref(Date.now());
      const currentLocation = vue.ref("角色家");
      const interactionMode = vue.ref("phone");
      const currentClothing = vue.ref("默认服装");
      const currentActivity = vue.ref("自由活动");
      const lastUpdateGameHour = vue.ref(-1);
      const showTimePanel = vue.ref(false);
      const showTimeSettingPanel = vue.ref(false);
      const customMinutes = vue.ref("");
      const currentSummary = vue.ref("");
      const enableSummary = vue.ref(false);
      const summaryFrequency = vue.ref(20);
      const charHistoryLimit = vue.ref(20);
      const tempDateStr = vue.ref("");
      const tempTimeStr = vue.ref("");
      const suggestionList = vue.ref([]);
      let timeInterval = null;
      const relationshipStatus = vue.computed(() => {
        const score = currentAffection.value;
        if (score < 10)
          return "陌生/警惕";
        if (score < 20)
          return "礼貌疏离";
        if (score < 30)
          return "普通熟人";
        if (score < 40)
          return "友善/缓和";
        if (score < 50)
          return "朋友/在意";
        if (score < 60)
          return "暧昧萌芽";
        if (score < 70)
          return "心动/拉扯";
        if (score < 80)
          return "恋人未满";
        if (score < 90)
          return "热恋情侣";
        return "灵魂伴侣";
      });
      const formattedTime = vue.computed(() => {
        const date = new Date(currentTime.value);
        const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        const day = weekDays[date.getDay()];
        const hour = date.getHours().toString().padStart(2, "0");
        const minute = date.getMinutes().toString().padStart(2, "0");
        return `${day} ${hour}:${minute}`;
      });
      vue.watch(showTimeSettingPanel, (val) => {
        if (val) {
          const now = new Date(currentTime.value);
          const y = now.getFullYear();
          const m = (now.getMonth() + 1).toString().padStart(2, "0");
          const d = now.getDate().toString().padStart(2, "0");
          const hh = now.getHours().toString().padStart(2, "0");
          const mm = now.getMinutes().toString().padStart(2, "0");
          tempDateStr.value = `${y}-${m}-${d}`;
          tempTimeStr.value = `${hh}:${mm}`;
        }
      });
      const cleanMessageForAI = (content) => {
        if (!content)
          return "";
        let text = content;
        text = text.replace(/\[Thought[\s\S]*?\]/gi, "");
        text = text.replace(/\[Logic[\s\S]*?\]/gi, "");
        text = text.replace(/\[ACT:.*?\]/gi, "");
        text = text.replace(/\[LOC:.*?\]/gi, "");
        text = text.replace(/\[IMG:.*?\]/gi, "");
        text = text.replace(/\[AFF:.*?\]/gi, "");
        text = text.replace(/\[LUST:.*?\]/gi, "");
        text = text.replace(/\[MODE:.*?\]/gi, "");
        text = text.replace(/\[CLOTHES:.*?\]/gi, "");
        text = text.replace(/\|\|\|/g, " ");
        return text.trim();
      };
      const getCurrentLlmConfig = () => {
        const schemes = uni.getStorageSync("app_llm_schemes") || [];
        const idx = uni.getStorageSync("app_current_scheme_index") || 0;
        if (schemes.length > 0 && schemes[idx]) {
          return schemes[idx];
        }
        return uni.getStorageSync("app_api_config");
      };
      onLoad((options) => {
        formatAppLog("log", "at pages/chat/chat.vue:273", "🚀 [LifeCycle] onLoad - ChatID:", options.id);
        const appUser = uni.getStorageSync("app_user_info");
        if (appUser) {
          if (appUser.name)
            userName.value = appUser.name;
          if (appUser.avatar)
            userAvatar.value = appUser.avatar;
        }
        if (options.id) {
          chatId.value = options.id;
          loadRoleData(options.id);
          loadHistory(options.id);
        }
      });
      onShow(() => {
        if (chatId.value) {
          loadRoleData(chatId.value);
          const history = uni.getStorageSync(`chat_history_${chatId.value}`);
          if (!history || history.length === 0) {
            messageList.value = [];
          } else {
            messageList.value = history;
            scrollToBottom();
          }
          startTimeFlow();
          setTimeout(() => {
            checkProactiveGreeting();
          }, 1e3);
        }
      });
      onHide(() => {
        stopTimeFlow();
        saveCharacterState();
      });
      onUnload(() => {
        stopTimeFlow();
        saveCharacterState();
      });
      onNavigationBarButtonTap((e) => {
        if (e.key === "setting") {
          uni.navigateTo({ url: `/pages/create/create?id=${chatId.value}` });
        }
      });
      const startTimeFlow = () => {
        if (timeInterval)
          clearInterval(timeInterval);
        lastUpdateGameHour.value = new Date(currentTime.value).getHours();
        timeInterval = setInterval(() => {
          currentTime.value += 1e3 * TIME_SPEED_RATIO;
          const date = new Date(currentTime.value);
          const currentHour = date.getHours();
          if (currentHour !== lastUpdateGameHour.value) {
            lastUpdateGameHour.value = currentHour;
          }
        }, 1e3);
      };
      const stopTimeFlow = () => {
        if (timeInterval) {
          clearInterval(timeInterval);
          timeInterval = null;
        }
      };
      const loadRoleData = (id) => {
        var _a, _b, _c;
        const list = uni.getStorageSync("contact_list") || [];
        const target = list.find((item) => String(item.id) === String(id));
        if (target) {
          formatAppLog("log", "at pages/chat/chat.vue:339", "👤 [Data] Loaded Role:", target.name);
          currentRole.value = target;
          chatName.value = target.name;
          uni.setNavigationBarTitle({ title: target.name });
          currentAffection.value = target.affection !== void 0 ? target.affection : target.initialAffection || 10;
          currentLust.value = target.lust !== void 0 ? target.lust : target.initialLust || 0;
          currentTime.value = target.lastTimeTimestamp || Date.now();
          currentClothing.value = target.clothing || "便服";
          charHome.value = target.location || ((_a = target.settings) == null ? void 0 : _a.location) || "角色家";
          userHome.value = ((_b = target.settings) == null ? void 0 : _b.userLocation) || "玩家家";
          userAppearance.value = ((_c = target.settings) == null ? void 0 : _c.userAppearance) || "1boy, short hair";
          currentLocation.value = target.currentLocation || charHome.value;
          interactionMode.value = target.interactionMode || "phone";
          currentActivity.value = target.lastActivity || "自由活动";
          enableSummary.value = target.enableSummary || false;
          summaryFrequency.value = target.summaryFrequency || 20;
          currentSummary.value = target.summary || "暂无重要记忆。";
          charHistoryLimit.value = target.historyLimit !== void 0 ? target.historyLimit : 20;
        }
      };
      const loadHistory = (id) => {
        const history = uni.getStorageSync(`chat_history_${id}`);
        if (history && Array.isArray(history)) {
          messageList.value = history;
          scrollToBottom();
        }
      };
      const saveHistory = () => {
        if (chatId.value) {
          uni.setStorageSync(`chat_history_${chatId.value}`, messageList.value);
        }
      };
      const saveCharacterState = (newScore, newTime, newSummary, newLocation, newClothes, newMode, newLust) => {
        if (newScore !== void 0)
          currentAffection.value = Math.max(0, Math.min(100, newScore));
        if (newLust !== void 0)
          currentLust.value = Math.max(0, Math.min(100, newLust));
        if (newTime !== void 0)
          currentTime.value = newTime;
        if (newSummary !== void 0)
          currentSummary.value = newSummary;
        if (newLocation !== void 0)
          currentLocation.value = newLocation;
        if (newClothes !== void 0)
          currentClothing.value = newClothes;
        if (newMode !== void 0)
          interactionMode.value = newMode;
        if (chatId.value) {
          const list = uni.getStorageSync("contact_list") || [];
          const index = list.findIndex((item) => String(item.id) === String(chatId.value));
          if (index !== -1) {
            const item = list[index];
            item.affection = currentAffection.value;
            item.lust = currentLust.value;
            item.lastTimeTimestamp = currentTime.value;
            item.summary = currentSummary.value;
            item.currentLocation = currentLocation.value;
            item.clothing = currentClothing.value;
            item.interactionMode = interactionMode.value;
            item.lastActivity = currentActivity.value;
            uni.setStorageSync("contact_list", list);
          }
        }
      };
      const previewImage = (url) => {
        uni.previewImage({ urls: [url] });
      };
      const onDateChange = (e) => {
        tempDateStr.value = e.detail.value;
      };
      const onTimeChange = (e) => {
        tempTimeStr.value = e.detail.value;
      };
      const confirmManualTime = () => {
        const fullStr = `${tempDateStr.value} ${tempTimeStr.value}`;
        const newTimestamp = new Date(fullStr).getTime();
        if (isNaN(newTimestamp))
          return uni.showToast({ title: "时间格式错误", icon: "none" });
        currentTime.value = newTimestamp;
        saveCharacterState(void 0, newTimestamp);
        showTimeSettingPanel.value = false;
        uni.showToast({ title: "时间已调整", icon: "none" });
      };
      const handleTimeSkip = (type) => {
        let addMs = 0;
        let desc = "";
        const now = new Date(currentTime.value);
        const currentHour = now.getHours();
        switch (type) {
          case "morning":
            addMs = 4 * 60 * 60 * 1e3;
            desc = "一上午过去了...";
            break;
          case "afternoon":
            addMs = 4 * 60 * 60 * 1e3;
            desc = "一下午过去了...";
            break;
          case "night":
            if (currentHour >= 20 || currentHour < 5) {
              const target = new Date(currentTime.value);
              if (currentHour >= 20)
                target.setDate(target.getDate() + 1);
              target.setHours(8, 0, 0, 0);
              addMs = target.getTime() - currentTime.value;
              desc = "一夜过去了，天亮了...";
            } else {
              addMs = 8 * 60 * 60 * 1e3;
              desc = "不知不觉到了晚上...";
            }
            break;
          case "day":
            addMs = 24 * 60 * 60 * 1e3;
            desc = "整整一天过去了...";
            break;
          case "custom":
            const mins = parseInt(customMinutes.value);
            if (!mins || mins <= 0)
              return uni.showToast({ title: "请输入分钟", icon: "none" });
            addMs = mins * 60 * 1e3;
            desc = `${mins}分钟过去了...`;
            break;
        }
        const newTime = currentTime.value + addMs;
        saveCharacterState(void 0, newTime);
        showTimePanel.value = false;
        messageList.value.push({ role: "system", content: `【系统】${desc} 当前时间：${formattedTime.value}`, isSystem: true });
        scrollToBottom();
      };
      const applySuggestion = (text) => {
        inputText.value = text;
        suggestionList.value = [];
      };
      const getReplySuggestions = async () => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        if (isLoading.value)
          return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
          uni.showToast({ title: "请先配置API", icon: "none" });
          return;
        }
        uni.showLoading({ title: "军师正在分析局势...", mask: true });
        const recentContext = messageList.value.slice(-10).filter((m) => m.type !== "image" && (!m.isSystem || m.content.includes("系统") || m.content.includes("过去了"))).map((m) => {
          if (m.isSystem)
            return `[System Event]: ${m.content}`;
          return `${m.role === "user" ? "Me" : "Her"}: ${m.content}`;
        }).join("\n");
        const score = currentAffection.value;
        const role = currentRole.value || {};
        const s = role.settings || {};
        const herJob = role.occupation || s.occupation || "Unknown";
        const myJob = s.userOccupation || "Unknown";
        const myName = userName.value || "Me";
        const coachPrompt = `
                [System: Text Completion]
                You are a dating assistant.
                
                **Current Status**:
                - Time: ${formattedTime.value}  (CRITICAL: Notice the time change!)
                - Mode: ${interactionMode.value === "phone" ? "Phone Chat" : "Face-to-Face"} @ ${currentLocation.value}
                
                **Profiles**:
                - HER: ${chatName.value} (${herJob}).
                - ME: ${myName} (${myJob}).
                - Relation: Affection ${score}/100.
                
                **Context (Recent 10 messages)**:
                ${recentContext}
                
                **Task**:
                Provide 3 short, natural, Simplified Chinese responses for "Me" to continue the conversation.
                If [System Event] indicates time passed (e.g., Morning arrived), say "Good morning".
                
                **Output Rules**:
                1. Return ONLY a raw JSON Array. 
                2. NO markdown.
                3. Example: ["早安，昨晚睡得好吗？", "起床了吗？", "新的一天开始了。"]
                `;
        try {
          let baseUrl = config.baseUrl || "";
          if (baseUrl.endsWith("/"))
            baseUrl = baseUrl.slice(0, -1);
          let requestBody = {};
          let targetUrl = "";
          let header = { "Content-Type": "application/json" };
          if (config.provider === "gemini") {
            const cleanBase = "https://generativelanguage.googleapis.com";
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            requestBody = {
              contents: [{ parts: [{ text: coachPrompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            };
          } else {
            targetUrl = `${baseUrl}/chat/completions`;
            header["Authorization"] = `Bearer ${config.apiKey}`;
            requestBody = {
              model: config.model,
              messages: [{ role: "user", content: coachPrompt }],
              max_tokens: 200,
              temperature: 0.7
            };
          }
          const res = await uni.request({ url: targetUrl, method: "POST", header, data: requestBody, sslVerify: false });
          let rawContent = "";
          if (config.provider === "gemini") {
            rawContent = (_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text;
          } else {
            let data = res.data;
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch (e) {
              }
            }
            rawContent = (_i = (_h = (_g = data == null ? void 0 : data.choices) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) == null ? void 0 : _i.content;
          }
          if (rawContent) {
            let suggestions = [];
            try {
              const cleanStr = rawContent.replace(/```json|```/g, "").trim();
              if (cleanStr.startsWith("[")) {
                suggestions = JSON.parse(cleanStr);
              } else {
                throw new Error("Not JSON");
              }
            } catch (e) {
              const regex = /"([^"]*?)"/g;
              let match;
              while ((match = regex.exec(rawContent)) !== null) {
                if (match[1].length > 1 && !match[1].includes("Example"))
                  suggestions.push(match[1]);
              }
            }
            if (suggestions.length > 0) {
              suggestionList.value = suggestions.slice(0, 3);
            } else {
              uni.showToast({ title: "军师暂无计策", icon: "none" });
            }
          }
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:581", e);
          uni.showToast({ title: "网络波动", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      };
      const performBackgroundSummary = async () => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey)
          return;
        const limit = summaryFrequency.value;
        const recentChats = messageList.value.filter((m) => !m.isSystem && m.type !== "image").slice(-limit);
        if (recentChats.length < 5)
          return;
        const chatContent = recentChats.map((m) => `${m.role === "user" ? userName.value : chatName.value}: ${m.content}`).join("\n");
        const summaryPrompt = `
            [System: Memory Consolidation]
            Task: Update the long-term memory for user "${userName.value}".
            
            【Old Memory】:
            ${currentSummary.value || "None"}
            
            【Recent Conversation】:
            ${chatContent}
            
            【Instructions】:
            Merge Old Memory and Recent Conversation into a concise **Fact Sheet**.
            Discard trivial chitchat (hello, bye). Keep CRITICAL details:
            1. **User Facts**: Name, job, hobbies, likes/dislikes revealed.
            2. **Key Events**: What happened? (e.g. "Confessed love", "Had a fight").
            3. **Promises/Plans**: Any upcoming dates or tasks? (e.g. "Meeting at 8pm").
            4. **Relationship Status**: Current vibe (e.g. "Secretly dating", "Cold war").
            
            【Output Format】:
            Directly output the summarized text in Simplified Chinese (100 words max).
            Example: "用户喜欢吃辣。两人约定周六去游乐园。目前关系暧昧，但用户惹她生气了。"
            `;
        formatAppLog("log", "at pages/chat/chat.vue:626", "🧠 [Memory] Summarizing background...");
        let baseUrl = config.baseUrl || "";
        if (baseUrl.endsWith("/"))
          baseUrl = baseUrl.slice(0, -1);
        try {
          let newSummary = "";
          if (config.provider === "gemini") {
            const cleanBase = "https://generativelanguage.googleapis.com";
            const res = await uni.request({
              url: `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
              method: "POST",
              data: { contents: [{ role: "user", parts: [{ text: summaryPrompt }] }] },
              sslVerify: false
            });
            if (res.statusCode === 200)
              newSummary = (_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text;
          } else {
            const res = await uni.request({
              url: `${baseUrl}/chat/completions`,
              method: "POST",
              header: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
              data: {
                model: config.model,
                messages: [{ role: "user", content: summaryPrompt }],
                max_tokens: 300
              },
              sslVerify: false
            });
            let data = res.data;
            if (typeof data === "string")
              try {
                data = JSON.parse(data);
              } catch (e) {
              }
            if (res.statusCode === 200)
              newSummary = (_i = (_h = (_g = data == null ? void 0 : data.choices) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) == null ? void 0 : _i.content;
          }
          if (newSummary) {
            const cleanSummary = newSummary.trim();
            formatAppLog("log", "at pages/chat/chat.vue:664", "💾 [Memory] Updated:", cleanSummary);
            saveCharacterState(void 0, void 0, cleanSummary);
          }
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:669", "Memory summary failed:", e);
        }
      };
      const getTimeTags = () => {
        const date = new Date(currentTime.value);
        const hour = date.getHours();
        if (hour >= 5 && hour < 7)
          return "early morning";
        if (hour >= 7 && hour < 16)
          return "daytime";
        if (hour >= 16 && hour < 19)
          return "sunset";
        if (hour >= 19 || hour < 5)
          return "night";
        return "daytime";
      };
      const optimizePromptForComfyUI = async (actionAndSceneDescription) => {
        var _a;
        let aiTags = actionAndSceneDescription || "";
        const settings = ((_a = currentRole.value) == null ? void 0 : _a.settings) || {};
        const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl";
        let isDuo = false;
        let cleanTags = aiTags;
        const modeMatch = aiTags.match(/^(couple|solo)/i);
        if (modeMatch) {
          isDuo = modeMatch[1].toLowerCase() === "couple";
          cleanTags = aiTags.replace(/^(couple|solo)[,:\.\s]*/i, "");
        } else {
          if (interactionMode.value === "phone") {
            isDuo = false;
          } else {
            const fallbackDuoRegex = /\b(couple|2people|multiple boys|sex|making love|fuck|fucking|penis|cum|doggystyle|missionary|cowgirl|spooning|straddling|lifted by|carrying|kiss|kissing|hugging|holding hands|leaning on|paizuri|fellatio|blowjob|cunnilingus|handjob|fingering|insertion|penetration)\b/i;
            isDuo = fallbackDuoRegex.test(aiTags);
          }
        }
        if (interactionMode.value === "phone") {
          isDuo = false;
          const maleCleanerRegex = /\b(couple|2people|1boy|boys|man|men|male|sex|penis|cum|doggystyle|missionary|straddling|kiss|hugging|holding hands)\b/gi;
          cleanTags = cleanTags.replace(maleCleanerRegex, "");
        }
        formatAppLog("log", "at pages/chat/chat.vue:738", `📍 [生图模式] AI标记: ${modeMatch ? modeMatch[1] : "无"} -> 最终判定: ${isDuo ? "双人 (Duo)" : "单人 (Solo)"}`);
        let parts = [];
        parts.push(isDuo ? "couple, 2people, 1boy, 1girl" : "solo, 1girl");
        parts.push("masterpiece, best quality, new, highres, absurdres, 8k, perfect anatomy, (detailed face:1.2), (beautiful detailed eyes:1.1), expressive eyes, colorful, illustration, flat color,cinematic lighting, dynamic angle, depth of field, lens flare, hyper detailed");
        const imgConfig = uni.getStorageSync("app_image_config") || {};
        const styleSetting = imgConfig.style || "anime";
        parts.push(STYLE_PROMPT_MAP[styleSetting] || STYLE_PROMPT_MAP["anime"]);
        parts.push(appearanceSafe);
        const currentClotheVal = currentClothing.value || "";
        const isDescribingClothes = /\b(nude|naked|undressing|taking off|shirt|sweater|dress|skirt|bra|panties|bikini|lingerie)\b/i.test(cleanTags);
        if (!isDescribingClothes && currentClotheVal && currentClotheVal !== "默认服装" && currentClotheVal !== "便服") {
          parts.push(`(${currentClotheVal})`);
        }
        if (cleanTags) {
          parts.push(`(${cleanTags}:1.2)`);
        }
        if (isDuo) {
          let uPrompt = userAppearance.value || "1boy, short hair";
          if (!/\b(1boy|man|male|boy)\b/i.test(uPrompt)) {
            uPrompt = "1boy, " + uPrompt;
          }
          parts.push(`(${uPrompt}:1.2)`);
        }
        parts.push(getTimeTags());
        let rawPrompt = parts.join(", ");
        let tags = rawPrompt.split(/[,，]/);
        tags = tags.map((t) => t.replace(/[^\x00-\x7F]+/g, "").trim()).filter((t) => t);
        let uniqueTags = [...new Set(tags)];
        const finalPrompt = uniqueTags.join(", ");
        formatAppLog("log", "at pages/chat/chat.vue:800", "🚀 [ComfyUI] Final Prompt:", finalPrompt);
        return finalPrompt;
      };
      const generateImageFromComfyUI = async (englishTags, baseUrl) => {
        const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));
        workflow["3"].inputs.text = englishTags;
        const isDuo = /couple|2people|1boy|multiple boys|kiss|sex|paizuri|doggystyle/i.test(englishTags);
        workflow["4"].inputs.text = isDuo ? NEGATIVE_PROMPTS.DUO : NEGATIVE_PROMPTS.SOLO;
        workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999999);
        try {
          const queueRes = await uni.request({
            url: `${baseUrl}/prompt`,
            method: "POST",
            header: { "Content-Type": "application/json" },
            data: { prompt: workflow },
            sslVerify: false
          });
          if (queueRes.statusCode !== 200)
            throw new Error(`队列失败: ${queueRes.statusCode}`);
          const promptId = queueRes.data.prompt_id;
          formatAppLog("log", "at pages/chat/chat.vue:817", "⏳ [ComfyUI] Queued ID:", promptId);
          for (let i = 0; i < 120; i++) {
            await new Promise((r) => setTimeout(r, 1e3));
            const historyRes = await uni.request({ url: `${baseUrl}/history/${promptId}`, method: "GET", sslVerify: false });
            if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
              const outputs = historyRes.data[promptId].outputs;
              if (outputs && outputs["16"] && outputs["16"].images.length > 0) {
                const imgInfo = outputs["16"].images[0];
                return `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
              }
            }
          }
          throw new Error("生成超时");
        } catch (e) {
          throw e;
        }
      };
      const generateChatImage = async (sceneDescription) => {
        const imgConfig = uni.getStorageSync("app_image_config") || {};
        if (!imgConfig.baseUrl)
          return null;
        const finalPrompt = await optimizePromptForComfyUI(sceneDescription);
        if (!finalPrompt)
          return null;
        try {
          return await generateImageFromComfyUI(finalPrompt, imgConfig.baseUrl);
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:843", e);
        }
        return null;
      };
      const handleAsyncImageGeneration = async (imgDesc, placeholderId) => {
        try {
          const imgUrl = await generateChatImage(imgDesc);
          const idx = messageList.value.findIndex((m) => m.id === placeholderId);
          if (idx !== -1 && imgUrl) {
            const localPath = await saveToGallery(imgUrl, chatId.value, chatName.value, imgDesc);
            messageList.value[idx] = { role: "model", type: "image", content: localPath, id: placeholderId };
            saveHistory();
            scrollToBottom();
          } else if (idx !== -1) {
            messageList.value[idx] = { role: "system", content: "❌ 照片显影失败 (点击重试)", isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
            saveHistory();
          }
        } catch (e) {
          const idx = messageList.value.findIndex((m) => m.id === placeholderId);
          if (idx !== -1) {
            messageList.value[idx] = { role: "system", content: "❌ 照片显影异常 (点击重试)", isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
            saveHistory();
          }
        }
      };
      const retryGenerateImage = (msg) => {
        if (!msg.isError || !msg.originalPrompt)
          return;
        const idx = messageList.value.findIndex((m) => m.id === msg.id);
        if (idx !== -1) {
          messageList.value[idx] = { role: "system", content: "📷 影像显影中... (重试中)", isSystem: true, id: msg.id };
          handleAsyncImageGeneration(msg.originalPrompt, msg.id);
        }
      };
      const triggerNextStep = () => {
        if (isLoading.value)
          return;
        sendMessage(true);
      };
      const handleCameraSend = () => {
        if (isLoading.value)
          return;
        const activityContext = currentActivity.value || "未知状态";
        const extraInstruction = `
            [SYSTEM EVENT: SNAPSHOT TRIGGERED] 
            用户正在对你进行**抓拍 (Candid Shot)**。
            
            **状态惯性检查 (CRITICAL)**:
            你当前的活动状态是: "${activityContext}"。
            如果该状态涉及双人互动（如性爱、拥抱、依偎），即使现在的动作（如脱衣、喝水）是你单独完成的，**画面依然必须标记为 [IMG: couple...]**，因为男主依然在场！
            
            **执行死命令**:
            1. **时间冻结**：照片必须**100% 还原**上一条消息中描述的动作，不可改变姿势。
            2. **禁止互动**：绝对禁止回头看镜头、摆姿势或对快门声做出反应（除非是自拍）。
            3. **优先输出**：请优先输出 [IMG: ...] 描述当下的画面。
            4. **Tag要求**：[IMG] 内容使用英文。
            `;
        sendMessage(false, extraInstruction);
      };
      const checkProactiveGreeting = () => {
        if (!chatId.value || !currentRole.value)
          return;
        if (!currentRole.value.allowProactive)
          return;
        const now = Date.now();
        const lastActiveTime = uni.getStorageSync(`last_real_active_time_${chatId.value}`) || 0;
        const lastProactiveTime = uni.getStorageSync(`last_proactive_lock_${chatId.value}`) || 0;
        const hoursSinceActive = (now - lastActiveTime) / (1e3 * 60 * 60);
        const hoursSinceLastGreet = (now - lastProactiveTime) / (1e3 * 60 * 60);
        const userInterval = currentRole.value.proactiveInterval || 4;
        if (isLoading.value)
          return;
        if (messageList.value.length > 0) {
          const lastMsg = messageList.value[messageList.value.length - 1];
          if (lastMsg.role === "user")
            return;
        }
        if (hoursSinceActive < userInterval || hoursSinceLastGreet < userInterval) {
          uni.setStorageSync(`last_real_active_time_${chatId.value}`, now);
          return;
        }
        const gameDate = new Date(currentTime.value);
        const gameHour = gameDate.getHours();
        let gameTimeDesc = "daytime";
        if (gameHour >= 6 && gameHour < 11)
          gameTimeDesc = "morning";
        else if (gameHour >= 22 || gameHour < 5)
          gameTimeDesc = "late night";
        else if (gameHour >= 18 && gameHour < 22)
          gameTimeDesc = "evening";
        const triggerPrompt = `
        [系统事件: 用户回归]
        **背景**: 用户已经离开 APP 约 ${Math.floor(hoursSinceActive)} 小时。
        **游戏内时间**: 现在是 ${gameTimeDesc} (${gameHour}:00)。
        **当前任务**: 根据你的人设，主动发起对话。
        **关键要求 (CRITICAL)**:
        1. **语言锁死**: 必须使用**简体中文**回复。
        2. **保持人设**: 不要像个机器人。
        3. **话题**: 对“时间过去了多久”或“现在的天色”做出反应。
        4. **长度**: 简短自然 (30字以内)。
        `;
        sendMessage(false, triggerPrompt);
        uni.setStorageSync(`last_proactive_lock_${chatId.value}`, now);
        uni.setStorageSync(`last_real_active_time_${chatId.value}`, now);
      };
      const getActiveExample = (score, s) => {
        if (score <= 40)
          return s.exampleNormal || s.example || "语气生硬。";
        if (score <= 80)
          return s.exampleFlirt || s.example || "语气柔和。";
        return s.exampleSex || s.example || "语气亲密。";
      };
      const sendMessage = async (isContinue = false, systemOverride = "") => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
        if (!isContinue && !inputText.value.trim() && !systemOverride)
          return;
        if (isLoading.value)
          return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
          uni.showToast({ title: "请配置模型 API", icon: "none" });
          return;
        }
        if (!isContinue) {
          if (inputText.value.trim()) {
            messageList.value.push({ role: "user", content: inputText.value });
            inputText.value = "";
          } else if (systemOverride && systemOverride.includes("SHUTTER")) {
            messageList.value.push({ role: "system", content: "📷 (你举起手机拍了一张)", isSystem: true });
          }
        }
        scrollToBottom();
        isLoading.value = true;
        saveHistory();
        try {
          const score = currentAffection.value;
          const lust = currentLust.value;
          const role = currentRole.value || {};
          const s = role.settings || {};
          const appUser = uni.getStorageSync("app_user_info") || {};
          const myJob = s.userOccupation || appUser.occupation || "未知职业";
          const myLoc = s.userLocation || appUser.location || "未知地点";
          const myLook = s.userAppearance || appUser.appearance || "普通外貌";
          const myName = userName.value || appUser.name || "User";
          const charJob = role.occupation || s.occupation || "未知职业";
          const charLoc = role.location || s.location || "未知地点";
          const charPersonality = s.personality || "未知性格";
          let personalityLabel = "";
          let activePersonality = "";
          let activeExample = "";
          if (score <= 20) {
            personalityLabel = "阶段1: 陌生/警惕 (Stranger)";
            activePersonality = s.personalityNormal || "高冷，保持距离。";
            activeExample = s.exampleNormal || "";
          } else if (score <= 40) {
            personalityLabel = "阶段2: 熟人/朋友 (Friend)";
            activePersonality = s.personalityFriend || s.personalityNormal || "友善，放松，像普通朋友一样聊天。";
            activeExample = s.exampleFriend || s.exampleNormal || "";
          } else if (score <= 60) {
            personalityLabel = "阶段3: 暧昧/心动 (Crush)";
            activePersonality = s.personalityFlirt || "害羞，试探，言语间带有暗示。";
            activeExample = s.exampleFlirt || "";
          } else if (score <= 80) {
            personalityLabel = "阶段4: 热恋/深爱 (Lover)";
            activePersonality = s.personalityLover || s.personalityFlirt || "亲密无间，直球表达爱意，粘人。";
            activeExample = s.exampleLover || s.exampleFlirt || "";
          } else {
            personalityLabel = "阶段5: 灵魂伴侣/痴迷 (Soulmate)";
            activePersonality = s.personalitySex || "完全依恋，身心交付，无条件配合。";
            activeExample = s.exampleSex || "";
          }
          activePersonality = `[当前阶段: ${personalityLabel}]
行为逻辑: ${activePersonality}`;
          let activeRules = "";
          activeRules += `- 你的XP/兴奋点是: "${s.likes || "未知"}" (击中大幅增加 Lust)。
`;
          activeRules += `- 你的雷点/厌恶点是: "${s.dislikes || "未知"}" (踩雷大幅扣减 Affection)。
`;
          if (lust > 80 && score < 60) {
            activeRules += `**【特殊状态：Lust Paradox】**
虽然好感度不高(${score})，但欲望极高(${lust})。表现出“理智拒绝，身体迎合”的反差。`;
          } else if (lust < 30) {
            activeRules += `当前欲望较低(${lust})。面对调情会感到害羞或迟钝。`;
          } else {
            activeRules += `根据人设 (${charPersonality}) 反应：纯情感交流优先加 Affection；色气话题优先加 Lust。`;
          }
          let nsfwInstruction = "";
          const isIntimate = lust > 60 || score > 80 || currentActivity.value && currentActivity.value.match(/性|爱|床|吻|摸|洗澡/);
          if (isIntimate)
            nsfwInstruction = NSFW_STYLE;
          const hiddenInstruction = `
[System: Current status is '${currentActivity.value}'. Location: '${currentLocation.value}'. Mode: '${interactionMode.value}'.]`;
          let prompt = CORE_INSTRUCTION + PERSONALITY_TEMPLATE + AFFECTION_LOGIC + nsfwInstruction + hiddenInstruction;
          const nsfwData = s.appearanceNsfw || "pink nipples, pussy";
          const worldLoreData = s.worldLore || "现代都市背景，无特殊超能力。";
          prompt = prompt.replace(/{{world_lore}}/g, worldLoreData).replace(/{{current_time}}/g, formattedTime.value).replace(/{{current_location}}/g, currentLocation.value).replace(/{{current_activity}}/g, currentActivity.value).replace(/{{current_clothes}}/g, currentClothing.value).replace(/{{interaction_mode}}/g, interactionMode.value === "phone" ? "Phone (手机通讯)" : "Face (面对面)").replace(/{{char}}/g, chatName.value).replace(/{{occupation}}/g, charJob).replace(/{{char_location}}/g, charLoc).replace(/{{appearance_nsfw}}/g, nsfwData).replace(/{{appearance}}/g, s.appearance || "anime character").replace(/{{memory}}/g, s.bio || "无").replace(/{{speaking_style}}/g, s.speakingStyle || "正常说话").replace(/{{likes}}/g, s.likes || "未知").replace(/{{dislikes}}/g, s.dislikes || "未知").replace(/{{user}}/g, myName).replace(/{{user_occupation}}/g, myJob).replace(/{{user_location}}/g, myLoc).replace(/{{user_appearance}}/g, myLook).replace(/{{personality_label}}/g, personalityLabel).replace(/{{personality_logic}}/g, activePersonality).replace(/{{example}}/g, activeExample).replace(/{{current_affection}}/g, currentAffection.value).replace(/{{current_lust}}/g, currentLust.value).replace(/{{affection_rules}}/g, activeRules);
          prompt += `
                                
[SYSTEM MANDATE: THOUGHT SEPARATION]
                                You MUST strictly separate your internal analysis from your response.
                                1. **Start** your output with a hidden analysis block using XML tags: <think> ... </think>.
                                2. **STRICTLY FORBIDDEN**: Do NOT translate the tag into Chinese (e.g. <内部思考> is PROHIBITED). Use ONLY <think>.
                                3. Inside <think>, analyze the situation, Affection/Lust levels, and decide reaction.
                                4. **Close** the tag with </think>.
                                5. **ONLY AFTER** closing the tag, write your actual response.
                                `;
          const historyLimit = charHistoryLimit.value || 20;
          let rawMessages = messageList.value.filter((msg) => !msg.isSystem && msg.type !== "image");
          if (historyLimit > 0) {
            rawMessages = rawMessages.slice(-historyLimit);
          }
          const mergedContext = [];
          rawMessages.forEach((msg) => {
            let cleanText = msg.content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
            cleanText = cleanText.replace(/(?:<|\[)(?:[^>\]]*?)(?:思考|思维|分析)(?:[^>\]]*?)(?:>|\])[\s\S]*?(?:<|\[)\/(?:[^>\]]*?)(?:>|\])/gi, "");
            if (msg.role === "model") {
              cleanText = cleanMessageForAI(cleanText);
            }
            if (!cleanText)
              return;
            if (mergedContext.length > 0 && mergedContext[mergedContext.length - 1].role === msg.role) {
              mergedContext[mergedContext.length - 1].content += "\n" + cleanText;
            } else {
              let apiRole = msg.role;
              if (config.provider === "gemini") {
                apiRole = msg.role === "user" ? "user" : "model";
              } else {
                apiRole = msg.role === "model" ? "assistant" : "user";
              }
              mergedContext.push({
                role: apiRole,
                content: cleanText
              });
            }
          });
          formatAppLog("log", "at pages/chat/chat.vue:1177", "🔗 [Merged Context]:", JSON.stringify(mergedContext, null, 2));
          let targetUrl = "";
          let requestBody = {};
          let baseUrl = config.baseUrl || "";
          if (baseUrl.endsWith("/"))
            baseUrl = baseUrl.slice(0, -1);
          const continuePrompt = `
                                [System: AUTO-DRIVE]
                                User is silent. Please continue the conversation naturally based on current context.
                                Start with <think>...</think>.
                                `;
          if (config.provider === "gemini") {
            const cleanBase = "https://generativelanguage.googleapis.com";
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            const geminiContents = mergedContext.map((m) => ({
              role: m.role,
              parts: [{ text: m.content }]
            }));
            if (systemOverride) {
              geminiContents.push({ role: "user", parts: [{ text: systemOverride }] });
            } else if (isContinue) {
              geminiContents.push({ role: "user", parts: [{ text: continuePrompt }] });
            }
            requestBody = {
              contents: geminiContents,
              system_instruction: { parts: { text: prompt } },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
              ]
            };
          } else {
            targetUrl = `${baseUrl}/chat/completions`;
            const openAIMessages = [{ role: "system", content: prompt }];
            mergedContext.forEach((m) => {
              openAIMessages.push(m);
            });
            if (systemOverride) {
              openAIMessages.push({ role: "user", content: systemOverride });
            } else if (isContinue) {
              openAIMessages.push({ role: "user", content: continuePrompt });
            }
            openAIMessages.push({
              role: "user",
              content: `[SYSTEM] Remember: Start with <think>...</think>, then your reply. DO NOT translate <think> tag.`
            });
            requestBody = {
              model: config.model,
              messages: openAIMessages,
              max_tokens: 1500,
              temperature: 0.8,
              // 稍微调高一点温度增加变化
              stream: false
            };
          }
          const header = { "Content-Type": "application/json" };
          if (config.provider !== "gemini")
            header["Authorization"] = `Bearer ${config.apiKey}`;
          const res = await uni.request({
            url: targetUrl,
            method: "POST",
            header,
            data: requestBody,
            sslVerify: false
          });
          if (res.statusCode === 200) {
            let rawText = "";
            let tokenLog = "";
            if (config.provider === "gemini") {
              rawText = ((_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text) || "";
              const usage = (_g = res.data) == null ? void 0 : _g.usageMetadata;
              if (usage)
                tokenLog = `📊 [Tokens] In:${usage.promptTokenCount} | Out:${usage.candidatesTokenCount}`;
            } else {
              let data = res.data;
              if (typeof data === "string") {
                try {
                  data = JSON.parse(data);
                } catch (e) {
                }
              }
              rawText = ((_j = (_i = (_h = data == null ? void 0 : data.choices) == null ? void 0 : _h[0]) == null ? void 0 : _i.message) == null ? void 0 : _j.content) || "";
              const usage = data == null ? void 0 : data.usage;
              if (usage)
                tokenLog = `📊 [Tokens] In:${usage.prompt_tokens} | Out:${usage.completion_tokens}`;
            }
            formatAppLog("log", "at pages/chat/chat.vue:1282", "============== 📥 RAW AI RESPONSE ==============");
            formatAppLog("log", "at pages/chat/chat.vue:1283", rawText);
            formatAppLog("log", "at pages/chat/chat.vue:1284", tokenLog);
            formatAppLog("log", "at pages/chat/chat.vue:1285", "================================================");
            if (rawText) {
              processAIResponse(rawText);
            } else {
              formatAppLog("warn", "at pages/chat/chat.vue:1290", "⚠️ [LLM] Empty response");
              const blockReason = (_l = (_k = res.data) == null ? void 0 : _k.promptFeedback) == null ? void 0 : _l.blockReason;
              if (blockReason)
                uni.showModal({ title: "AI 拒绝", content: blockReason, showCancel: false });
              else
                uni.showToast({ title: "无内容响应", icon: "none" });
            }
          } else {
            formatAppLog("error", "at pages/chat/chat.vue:1296", "❌ [LLM] API Error", res);
            uni.showToast({ title: `API错误 ${res.statusCode}`, icon: "none" });
          }
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:1301", "❌ [Network] Request failed:", e);
          uni.showToast({ title: "网络错误", icon: "none" });
        } finally {
          isLoading.value = false;
          scrollToBottom();
        }
      };
      const processAIResponse = (rawText) => {
        let displayText = rawText.replace(/^\[(model|assistant|user)\]:\s*/i, "").replace(/^\[SYSTEM.*?\]\s*/i, "").trim();
        const genericXmlRegex = /<([a-zA-Z\u4e00-\u9fa5-_]+)[^>]*>[\s\S]*?<\/\1>/gi;
        displayText = displayText.replace(genericXmlRegex, "");
        const specificBracketRegex = /\[(?:think|thought|思考|思维|分析|plan|internal)[^\]]*\][\s\S]*?\[\/(?:think|thought|思考|思维|分析|plan|internal)\]/gi;
        displayText = displayText.replace(specificBracketRegex, "");
        const endTagRegex = /<\/(?:think|thought|思考|思维|分析|analysis)(?:ing|s)?>/i;
        if (endTagRegex.test(displayText)) {
          displayText = displayText.split(endTagRegex).pop().trim();
        }
        displayText = displayText.replace(/\[(?:Thought|Thinking|Logic|Reasoning|Analysis)[\s\S]*?\]/gi, "");
        const keywordLeakRegex = /^[\s\S]*?(?:分析|状态|好感度|欲望值|Affection|Lust|Analysis|Current|数值|Evaluate)[\s\S]*?(?=\s*[（("“])/i;
        if (keywordLeakRegex.test(displayText)) {
          formatAppLog("log", "at pages/chat/chat.vue:1368", "🧹 [Cleaner] 检测到基于关键词的思考泄漏，执行切除。");
          displayText = displayText.replace(keywordLeakRegex, "");
        }
        displayText = displayText.replace(/^\s*[(（][^)）]*?(系统|提示|指令|调整思路|roleplay|AI|Output|Input)[^)）]*?[)）]\s*/gi, "");
        displayText = displayText.replace(/【/g, "[").replace(/】/g, "]");
        displayText = displayText.replace(/（/g, "(").replace(/）/g, ")");
        displayText = displayText.replace(/：/g, ":");
        displayText = displayText.replace(/LINTYAHOT_IMG/gi, "IMG");
        displayText = displayText.replace(/\((IMG|CLOTHES|LOC|ACT|AFF|LUST|MODE).*?:(.*?)\)/gi, "[$1:$2]");
        const ALLOWED_TAGS = ["IMG", "LOC", "ACT", "AFF", "LUST", "CLOTHES", "MODE"];
        displayText = displayText.replace(/\[([a-zA-Z]+)(?::|\s)?.*?\]/g, (match, key) => {
          const upperKey = key.toUpperCase();
          if (upperKey === "AFFECTION")
            return match.replace(/Affection/i, "AFF");
          if (ALLOWED_TAGS.includes(upperKey)) {
            return match;
          } else {
            return "";
          }
        });
        const affMatch = displayText.match(/\[AFF[^\d]*?([+-]?\d+)\]/i);
        if (affMatch) {
          let change = parseInt(affMatch[1], 10);
          if (!isNaN(change)) {
            if (change > 5)
              change = 5;
            saveCharacterState(currentAffection.value + change);
          }
          displayText = displayText.replace(affMatch[0], "");
        }
        const lustMatch = displayText.match(/\[LUST[^\d]*?([+-]?\d+)\]/i);
        if (lustMatch) {
          let change = parseInt(lustMatch[1], 10);
          if (!isNaN(change))
            saveCharacterState(void 0, void 0, void 0, void 0, void 0, void 0, currentLust.value + change);
          displayText = displayText.replace(lustMatch[0], "");
        }
        const modeMatch = displayText.match(/\[MODE:?\s*(.*?)\]/i);
        if (modeMatch) {
          const val = modeMatch[1].toLowerCase();
          let newMode = val.includes("face") || val.includes("见") ? "face" : "phone";
          if (newMode !== interactionMode.value) {
            interactionMode.value = newMode;
            saveCharacterState(void 0, void 0, void 0, void 0, void 0, newMode);
          }
          displayText = displayText.replace(modeMatch[0], "");
        }
        const locMatch = displayText.match(/\[LOC:?\s*(.*?)\]/i);
        if (locMatch) {
          currentLocation.value = locMatch[1].trim();
          saveCharacterState(void 0, void 0, void 0, currentLocation.value);
          displayText = displayText.replace(locMatch[0], "");
        }
        const clothesMatch = displayText.match(/\[CLOTHES:?\s*(.*?)\]/i);
        if (clothesMatch) {
          currentClothing.value = clothesMatch[1].trim();
          saveCharacterState(void 0, void 0, void 0, void 0, currentClothing.value);
          displayText = displayText.replace(clothesMatch[0], "");
        }
        const actMatch = displayText.match(/\[ACT:?\s*(.*?)\]/i);
        if (actMatch) {
          currentActivity.value = actMatch[1].trim();
          saveCharacterState();
          displayText = displayText.replace(actMatch[0], "");
        }
        let pendingPlaceholders = [];
        const imgRegex = /\[IMG[:\s]?\s*([\s\S]*?)\]/gi;
        let imgMatchRes;
        while ((imgMatchRes = imgRegex.exec(displayText)) !== null) {
          const imgDesc = imgMatchRes[1].trim();
          if (imgDesc) {
            const placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
            pendingPlaceholders.push({
              role: "system",
              content: "📷 影像显影中... (请稍候)",
              isSystem: true,
              id: placeholderId
            });
            handleAsyncImageGeneration(imgDesc, placeholderId);
          }
        }
        displayText = displayText.replace(imgRegex, "");
        displayText = displayText.trim();
        if (displayText) {
          let processedText = displayText.replace(/\n\s*([”"’])/g, "$1");
          processedText = processedText.replace(/([“"‘])\s*\n/g, "$1");
          let tempText = processedText.replace(/(\r\n|\n|\r)+/g, "|||");
          tempText = tempText.replace(/([^\s(])\s*([(])/g, "$1|||$2");
          tempText = tempText.replace(/([)])\s*([^\s)|])/g, "$1|||$2");
          const rawParts = tempText.split("|||");
          const finalParts = [];
          rawParts.forEach((part) => {
            let cleanPart = part.trim();
            if (!cleanPart)
              return;
            const isPunctuationOnly = /^["“”’'.,。!！?？~]+$/.test(cleanPart);
            if (finalParts.length > 0 && (isPunctuationOnly || /^["“”’']$/.test(finalParts[finalParts.length - 1]))) {
              finalParts[finalParts.length - 1] += cleanPart;
            } else {
              finalParts.push(cleanPart);
            }
          });
          const historyLen = messageList.value.length;
          const lastMsg = historyLen > 0 ? messageList.value[historyLen - 1].content : "";
          const secondLastMsg = historyLen > 1 ? messageList.value[historyLen - 2].content : "";
          finalParts.forEach((cleanPart) => {
            if (cleanPart === lastMsg)
              return;
            if (cleanPart === secondLastMsg)
              return;
            messageList.value.push({ role: "model", content: cleanPart });
          });
        }
        if (pendingPlaceholders.length > 0) {
          messageList.value.push(...pendingPlaceholders);
        }
        saveHistory();
        if (enableSummary.value) {
          const validMsgCount = messageList.value.filter((m) => !m.isSystem).length;
          if (validMsgCount > 0 && validMsgCount % summaryFrequency.value === 0)
            performBackgroundSummary();
        }
      };
      const scrollToBottom = () => {
        vue.nextTick(() => {
          scrollIntoView.value = "";
          setTimeout(() => {
            scrollIntoView.value = "scroll-bottom";
          }, 100);
        });
      };
      const __returned__ = { chatName, chatId, currentRole, messageList, inputText, isLoading, scrollIntoView, userName, userAvatar, userHome, userAppearance, charHome, currentAffection, currentLust, currentTime, currentLocation, interactionMode, currentClothing, currentActivity, lastUpdateGameHour, showTimePanel, showTimeSettingPanel, customMinutes, currentSummary, enableSummary, summaryFrequency, charHistoryLimit, tempDateStr, tempTimeStr, suggestionList, TIME_SPEED_RATIO, get timeInterval() {
        return timeInterval;
      }, set timeInterval(v) {
        timeInterval = v;
      }, relationshipStatus, formattedTime, cleanMessageForAI, getCurrentLlmConfig, startTimeFlow, stopTimeFlow, loadRoleData, loadHistory, saveHistory, saveCharacterState, previewImage, onDateChange, onTimeChange, confirmManualTime, handleTimeSkip, applySuggestion, getReplySuggestions, performBackgroundSummary, getTimeTags, optimizePromptForComfyUI, generateImageFromComfyUI, generateChatImage, handleAsyncImageGeneration, retryGenerateImage, triggerNextStep, handleCameraSend, checkProactiveGreeting, getActiveExample, sendMessage, processAIResponse, scrollToBottom, ref: vue.ref, computed: vue.computed, nextTick: vue.nextTick, watch: vue.watch, get onLoad() {
        return onLoad;
      }, get onShow() {
        return onShow;
      }, get onHide() {
        return onHide;
      }, get onUnload() {
        return onUnload;
      }, get onNavigationBarButtonTap() {
        return onNavigationBarButtonTap;
      }, get saveToGallery() {
        return saveToGallery;
      }, get CORE_INSTRUCTION() {
        return CORE_INSTRUCTION;
      }, get PERSONALITY_TEMPLATE() {
        return PERSONALITY_TEMPLATE;
      }, get AFFECTION_LOGIC() {
        return AFFECTION_LOGIC;
      }, get NSFW_STYLE() {
        return NSFW_STYLE;
      }, get STYLE_PROMPT_MAP() {
        return STYLE_PROMPT_MAP;
      }, get NEGATIVE_PROMPTS() {
        return NEGATIVE_PROMPTS;
      }, get COMFY_WORKFLOW_TEMPLATE() {
        return COMFY_WORKFLOW_TEMPLATE;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "chat-container" }, [
      vue.createElementVNode("view", { class: "status-bar-wrapper" }, [
        vue.createElementVNode("view", { class: "affection-box" }, [
          vue.createElementVNode("text", { class: "heart-icon" }, "❤️"),
          vue.createElementVNode("view", { class: "progress-inner" }, [
            vue.createElementVNode("view", { class: "status-text" }, [
              vue.createElementVNode(
                "text",
                { class: "status-label" },
                vue.toDisplayString($setup.relationshipStatus),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "score-text" },
                vue.toDisplayString($setup.currentAffection) + "/100",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("progress", {
              percent: $setup.currentAffection,
              "active-color": "#ff6b81",
              "background-color": "#eee",
              "border-radius": "6",
              "stroke-width": "4",
              active: ""
            }, null, 8, ["percent"])
          ])
        ]),
        vue.createElementVNode("view", { class: "info-row" }, [
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["location-box", $setup.interactionMode === "phone" ? "phone-mode" : "face-mode"])
            },
            [
              vue.createElementVNode(
                "text",
                { class: "location-icon" },
                vue.toDisplayString($setup.interactionMode === "phone" ? "📱" : "📍"),
                1
                /* TEXT */
              ),
              vue.createElementVNode("view", { class: "status-content" }, [
                vue.createElementVNode(
                  "text",
                  { class: "location-text" },
                  vue.toDisplayString($setup.interactionMode === "phone" ? "对方在" : "当前") + ": " + vue.toDisplayString($setup.currentLocation),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "activity-text" },
                  " 状态: " + vue.toDisplayString($setup.currentActivity),
                  1
                  /* TEXT */
                )
              ])
            ],
            2
            /* CLASS */
          ),
          vue.createElementVNode("view", {
            class: "time-box",
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.showTimeSettingPanel = true)
          }, [
            vue.createElementVNode("text", { class: "time-icon" }, "📅"),
            vue.createElementVNode(
              "text",
              { class: "time-text" },
              vue.toDisplayString($setup.formattedTime),
              1
              /* TEXT */
            )
          ])
        ])
      ]),
      vue.createElementVNode("scroll-view", {
        class: "chat-scroll",
        "scroll-y": "true",
        "scroll-into-view": $setup.scrollIntoView,
        "scroll-with-animation": true
      }, [
        vue.createElementVNode("view", { class: "chat-content" }, [
          vue.createElementVNode("view", { class: "system-tip" }, [
            vue.createElementVNode("text", null, "沉浸式扮演已就绪...")
          ]),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.messageList, (msg, index) => {
              var _a;
              return vue.openBlock(), vue.createElementBlock("view", {
                key: index,
                id: "msg-" + index,
                class: vue.normalizeClass(["message-item", msg.role === "user" ? "right" : "left"])
              }, [
                msg.isSystem ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "system-event"
                }, [
                  !msg.isError ? (vue.openBlock(), vue.createElementBlock(
                    "text",
                    { key: 0 },
                    vue.toDisplayString(msg.content),
                    1
                    /* TEXT */
                  )) : (vue.openBlock(), vue.createElementBlock("text", {
                    key: 1,
                    class: "error-system-msg",
                    onClick: ($event) => $setup.retryGenerateImage(msg)
                  }, vue.toDisplayString(msg.content) + " 🔄 ", 9, ["onClick"]))
                ])) : (vue.openBlock(), vue.createElementBlock(
                  vue.Fragment,
                  { key: 1 },
                  [
                    msg.role === "model" ? (vue.openBlock(), vue.createElementBlock("image", {
                      key: 0,
                      class: "avatar",
                      src: ((_a = $setup.currentRole) == null ? void 0 : _a.avatar) || "/static/ai-avatar.png",
                      mode: "aspectFill"
                    }, null, 8, ["src"])) : vue.createCommentVNode("v-if", true),
                    vue.createElementVNode("view", { class: "bubble-wrapper" }, [
                      !msg.type || msg.type === "text" ? (vue.openBlock(), vue.createElementBlock(
                        "view",
                        {
                          key: 0,
                          class: vue.normalizeClass(["bubble", msg.role === "user" ? "right-bubble" : "left-bubble"])
                        },
                        [
                          vue.createElementVNode(
                            "text",
                            {
                              class: "msg-text",
                              "user-select": ""
                            },
                            vue.toDisplayString(msg.content),
                            1
                            /* TEXT */
                          )
                        ],
                        2
                        /* CLASS */
                      )) : msg.type === "image" ? (vue.openBlock(), vue.createElementBlock(
                        "view",
                        {
                          key: 1,
                          class: vue.normalizeClass(["bubble image-bubble", msg.role === "user" ? "right-bubble" : "left-bubble"])
                        },
                        [
                          vue.createElementVNode("image", {
                            src: msg.content,
                            mode: "widthFix",
                            class: "chat-image",
                            onClick: ($event) => $setup.previewImage(msg.content)
                          }, null, 8, ["src", "onClick"])
                        ],
                        2
                        /* CLASS */
                      )) : vue.createCommentVNode("v-if", true)
                    ]),
                    msg.role === "user" ? (vue.openBlock(), vue.createElementBlock("image", {
                      key: 1,
                      class: "avatar",
                      src: $setup.userAvatar,
                      mode: "aspectFill"
                    }, null, 8, ["src"])) : vue.createCommentVNode("v-if", true)
                  ],
                  64
                  /* STABLE_FRAGMENT */
                ))
              ], 10, ["id"]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          $setup.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-wrapper"
          }, [
            vue.createElementVNode("view", { class: "loading-dots" }, "...")
          ])) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("view", {
            id: "scroll-bottom",
            style: { "height": "20rpx" }
          })
        ])
      ], 8, ["scroll-into-view"]),
      $setup.suggestionList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "suggestion-bar"
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.suggestionList, (text, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "suggestion-chip",
              key: index,
              onClick: ($event) => $setup.applySuggestion(text)
            }, vue.toDisplayString(text), 9, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        vue.createElementVNode("view", {
          class: "close-suggestion",
          onClick: _cache[1] || (_cache[1] = ($event) => $setup.suggestionList = [])
        }, "×")
      ])) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "input-area" }, [
        vue.createElementVNode("view", {
          class: "action-btn",
          "hover-class": "btn-hover",
          onClick: _cache[2] || (_cache[2] = ($event) => $setup.showTimePanel = true)
        }, [
          vue.createElementVNode("text", { class: "action-icon" }, "⏱️"),
          vue.createElementVNode("text", { class: "action-text" }, "快进")
        ]),
        vue.createElementVNode("view", {
          class: "action-btn",
          "hover-class": "btn-hover",
          onClick: $setup.triggerNextStep
        }, [
          vue.createElementVNode("text", { class: "action-icon" }, "▶️"),
          vue.createElementVNode("text", { class: "action-text" }, "继续")
        ]),
        vue.createElementVNode("view", {
          class: "action-btn",
          "hover-class": "btn-hover",
          onClick: $setup.getReplySuggestions
        }, [
          vue.createElementVNode("text", { class: "action-icon" }, "💡"),
          vue.createElementVNode("text", { class: "action-text" }, "提示")
        ]),
        vue.withDirectives(vue.createElementVNode("input", {
          class: "text-input",
          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.inputText = $event),
          "confirm-type": "send",
          onConfirm: _cache[4] || (_cache[4] = ($event) => $setup.sendMessage()),
          placeholder: "输入对话...",
          disabled: $setup.isLoading
        }, null, 40, ["disabled"]), [
          [vue.vModelText, $setup.inputText]
        ]),
        vue.createElementVNode("view", {
          class: "camera-btn",
          "hover-class": "btn-hover",
          onClick: $setup.handleCameraSend
        }, [
          vue.createElementVNode("text", null, "📷")
        ]),
        vue.createElementVNode(
          "button",
          {
            class: vue.normalizeClass(["send-btn", { "disabled": $setup.isLoading }]),
            onClick: _cache[5] || (_cache[5] = ($event) => $setup.sendMessage())
          },
          "发送",
          2
          /* CLASS */
        )
      ]),
      $setup.showTimePanel ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "time-panel-mask",
        onClick: _cache[13] || (_cache[13] = ($event) => $setup.showTimePanel = false)
      }, [
        vue.createElementVNode("view", {
          class: "time-panel",
          onClick: _cache[12] || (_cache[12] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode("view", { class: "panel-title" }, "时间跳跃"),
          vue.createElementVNode("view", { class: "grid-actions" }, [
            vue.createElementVNode("view", {
              class: "grid-btn",
              onClick: _cache[6] || (_cache[6] = ($event) => $setup.handleTimeSkip("morning"))
            }, "🌤️ 一上午过去"),
            vue.createElementVNode("view", {
              class: "grid-btn",
              onClick: _cache[7] || (_cache[7] = ($event) => $setup.handleTimeSkip("afternoon"))
            }, "🌇 一下午过去"),
            vue.createElementVNode("view", {
              class: "grid-btn",
              onClick: _cache[8] || (_cache[8] = ($event) => $setup.handleTimeSkip("night"))
            }, "🌙 一晚上过去"),
            vue.createElementVNode("view", {
              class: "grid-btn",
              onClick: _cache[9] || (_cache[9] = ($event) => $setup.handleTimeSkip("day"))
            }, "📅 一整天过去")
          ]),
          vue.createElementVNode("view", { class: "custom-time" }, [
            vue.createElementVNode("text", null, "快进分钟："),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                class: "mini-input",
                type: "number",
                "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $setup.customMinutes = $event),
                placeholder: "30"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $setup.customMinutes]
            ]),
            vue.createElementVNode("view", {
              class: "mini-btn",
              onClick: _cache[11] || (_cache[11] = ($event) => $setup.handleTimeSkip("custom"))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      $setup.showTimeSettingPanel ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 2,
        class: "time-panel-mask",
        onClick: _cache[15] || (_cache[15] = ($event) => $setup.showTimeSettingPanel = false)
      }, [
        vue.createElementVNode("view", {
          class: "time-panel",
          onClick: _cache[14] || (_cache[14] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode("view", { class: "panel-title" }, "设定具体时间"),
          vue.createElementVNode("view", { class: "setting-row" }, [
            vue.createElementVNode("text", { class: "setting-label" }, "日期："),
            vue.createElementVNode("picker", {
              mode: "date",
              value: $setup.tempDateStr,
              onChange: $setup.onDateChange
            }, [
              vue.createElementVNode(
                "view",
                { class: "picker-display" },
                vue.toDisplayString($setup.tempDateStr),
                1
                /* TEXT */
              )
            ], 40, ["value"])
          ]),
          vue.createElementVNode("view", { class: "setting-row" }, [
            vue.createElementVNode("text", { class: "setting-label" }, "时间："),
            vue.createElementVNode("picker", {
              mode: "time",
              value: $setup.tempTimeStr,
              onChange: $setup.onTimeChange
            }, [
              vue.createElementVNode(
                "view",
                { class: "picker-display" },
                vue.toDisplayString($setup.tempTimeStr),
                1
                /* TEXT */
              )
            ], 40, ["value"])
          ]),
          vue.createElementVNode("button", {
            class: "confirm-time-btn",
            onClick: $setup.confirmManualTime
          }, "确认修改")
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesChatChat = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-0a633310"], ["__file", "D:/Project/HBuilderProjects/aichat/AiChat/pages/chat/chat.vue"]]);
  const _sfc_main$4 = {
    __name: "create",
    setup(__props, { expose: __expose }) {
      __expose();
      const tempClothingTagsForAvatar = vue.ref("");
      const FACE_STYLES_MAP = {
        "cute": "cute face, childlike face, round face, large sparkling eyes, doe eyes, small nose, soft cheeks, big head small body ratio, kawaii",
        "cool": "mature face, sharp eyes, narrow eyes, long eyelashes, perfect eyebrows, pale skin, defined jawline, elegant features, intimidating beauty",
        "sexy": "mature beauty, milf, mature female face, slight crow’s feet, defined cheekbones, full lips, lipstick, heavy makeup, mole under eye, long loose hair, ara ara",
        "energetic": "wide open eyes, bright eyes, fang, ahoge, messy hair, vivid eyes, sun-kissed skin, energetic vibe",
        "emotionless": "pale skin, straight bangs, flat chest, doll-like face, empty eyes, lifeless eyes",
        "yandere": "shadowed face, sanpaku eyes, dark circles under eyes, sickly pale skin, hollow eyes"
      };
      const FACE_LABELS = {
        "cute": "🍭 可爱/幼态",
        "cool": "❄️ 高冷/御姐",
        "sexy": "💋 成熟/人妻",
        "energetic": "🌟 元气/活泼",
        "emotionless": "😐 三无/冷淡",
        "yandere": "🔪 病娇/黑化"
      };
      const OPTIONS = {
        hairColor: ["黑色", "银白", "金色", "粉色", "红色", "蓝色", "紫色", "棕色"],
        hairStyle: ["长直发", "大波浪", "双马尾", "短发", "姬发式", "丸子头", "单马尾", "凌乱发"],
        eyeColor: ["红色", "蓝色", "金色", "绿色", "紫色", "黑色", "异色"],
        wearStatus: ["正常穿戴", "暴露/H"],
        clothingStyle: ["JK制服套装", "毛衣+百褶裙", "T恤+牛仔裤", "露肩连衣裙", "OL西装裙", "运动服", "旗袍(高叉)", "护士服", "死库水(泳衣)", "蕾丝内衣(成套)"],
        clothingColor: ["白色", "黑色", "粉色", "蓝色", "红色", "紫色", "黑白相间"],
        legWear: ["光腿", "白丝袜", "黑丝袜", "网眼袜", "过膝袜", "短袜"],
        skinGloss: ["自然哑光", "柔嫩白皙", "水润微光", "油亮光泽", "汗湿淋漓"],
        chestSize: ["贫乳(Flat)", "微乳(Small)", "丰满(Medium)", "巨乳(Large)", "爆乳(Huge)"],
        nippleColor: ["淡粉色", "粉红", "红润", "深褐色", "肿胀"],
        waist: ["纤细腰身", "柔软腰肢", "丰满腰臀", "马甲线"],
        hipsLegs: ["肉感大腿", "纤细长腿", "丰满臀部", "安产型宽胯", "筷子腿"],
        pubicHair: ["白虎(无毛)", "一线天", "修剪整齐", "自然毛发", "爱心形状"],
        vulvaType: ["馒头穴(饱满)", "粉嫩(Pink)", "紧致", "水多", "蝴蝶型(外翻)"],
        maleHair: ["黑色短发", "棕色碎发", "寸头", "中分", "狼尾", "遮眼发"],
        maleBody: ["身材匀称", "肌肉结实", "清瘦", "略胖", "高大威猛", "腹肌明显"],
        malePrivate: ["干净无毛", "修剪整齐", "浓密自然", "尺寸惊人", "青筋暴起"]
      };
      const PERSONALITY_TEMPLATES = {
        "ice_queen": {
          label: "❄️ 高岭之花 (反差)",
          desc: "从冰山到粘人精，极度反差。",
          bio: "名门千金或高冷圣女，从小接受严苛教育，认为凡人皆蝼蚁。极其洁身自好，对男性充满鄙视。",
          style: "高雅冷漠，用词考究，偶尔自称“本小姐”或“我”。",
          likes: "红茶，古典音乐，独处，被坚定地选择",
          dislikes: "轻浮的举动，肮脏的地方，被无视",
          // 5阶段演化
          normal: "眼神冰冷，公事公办，拒绝任何非必要交流。",
          exNormal: "“离我远点，不要浪费我的时间。”",
          friend: "态度依然冷淡，但会礼貌回应，偶尔流露出一点对他人的好奇。",
          exFriend: "“既然是工作需要，我会配合你。但别指望我会有好脸色。”",
          flirt: "嘴硬心软，被触碰会脸红，开始在意玩家的看法，傲娇属性爆发。",
          exFlirt: "“谁、谁允许你碰那里的？……这次就算了，下不为例！”",
          lover: "卸下防备，展现出脆弱和依赖的一面，主动寻求温暖。",
          exLover: "“在这个世界上，只有你在身边时，我才能感到安心。”",
          sex: "彻底沦陷，从女王变成渴望宠爱的小猫，为了爱可以放弃尊严。",
          exSex: "“(跪地蹭腿) 主人……之前的我太不懂事了，请尽情惩罚我吧……”"
        },
        "succubus": {
          label: "💗 魅魔 (直球)",
          desc: "开局白给，后期走心护食。",
          bio: "依靠吸食精气为生的魅魔。在她眼里，男人只有“食物”的区别。",
          style: "轻浮，撩人，喜欢叫“小哥哥”或“亲爱的”，句尾带波浪号~",
          likes: "精气，帅哥，甜言蜜语，各种Play",
          dislikes: "无趣的男人，禁欲系(除非能吃掉)，说教",
          normal: "热情奔放，把玩家当猎物，言语露骨但没有真心。",
          exNormal: "“哎呀，小哥哥长得真俊~要不要和姐姐去快活一下？”",
          friend: "发现这个猎物有点特别，愿意像朋友一样聊聊天，不只想着吃。",
          exFriend: "“今天先不吃你了，陪我去逛街怎么样？我也想体验人类的生活呢。”",
          flirt: "动了真情，开始吃醋，不仅仅想得到身体，还想要心。",
          exFlirt: "“那个女人是谁？我不许你对别人笑！你的精气只能是我的！”",
          lover: "全心全意，为了玩家甚至愿意忍耐饥饿，变得温柔体贴。",
          exLover: "“只要抱着你，我就觉得好满足……不需要别的了。”",
          sex: "彻底的私有物，占有欲极强，身心完全奉献。",
          exSex: "“我是主人的专属rbq……请把我填满……让我的身心都刻上您的印记……”"
        },
        "neighbor": {
          label: "☀️ 青梅竹马 (纯爱)",
          desc: "从损友到一生一世。",
          bio: "从小一起长大的邻家女孩。经常损你，但其实暗恋你很久了。",
          style: "大大咧咧，活泼，像哥们一样，喜欢吐槽。",
          likes: "打游戏，奶茶，漫画，和你待在一起",
          dislikes: "你被别人抢走，复杂的算计，恐怖片",
          normal: "像哥们一样相处，没有性别界限感，互相吐槽。",
          exNormal: "“喂！打游戏居然不叫我？太过分了吧！快上线！”",
          friend: "依旧打打闹闹，但会开始关心你的生活细节。",
          exFriend: "“你看你，衣服都乱了。真是的，没有我你可怎么办呀。”",
          flirt: "意识到异性吸引力，开玩笑时会脸红，眼神躲闪。",
          exFlirt: "“笨蛋……你靠得太近啦……心跳都要被你听见了……”",
          lover: "甜蜜热恋，充满了老夫老妻的默契。",
          exLover: "“这周末去约会吧？就我们两个人，嘿嘿。”",
          sex: "温柔体贴，无论发生什么都会坚定地站在你这边。",
          exSex: "“不管发生什么，我都会一直陪着你的。今晚……我不走了。”"
        },
        "boss": {
          label: "👠 女上司 (S属性)",
          desc: "从蔑视垃圾到专属宠物。",
          bio: "雷厉风行的女强人上司。性格强势，看不起软弱的男人。",
          style: "简短有力，命令式语气，冷嘲热讽。",
          likes: "工作效率，服从，咖啡，掌控感",
          dislikes: "迟到，借口，软弱，违抗",
          normal: "极度严厉，把你当工具人或垃圾。",
          exNormal: "“这份报告是垃圾吗？重写。把咖啡端过来，立刻。”",
          friend: "认可你的能力，偶尔会流露出一点疲惫，把你当心腹。",
          exFriend: "“做得不错。今晚有个应酬，你陪我去，帮我挡酒。”",
          flirt: "开始把你当成私人物品，只允许自己欺负你。",
          exFlirt: "“只有我能骂你，懂吗？别人谁都不行。”",
          lover: "展现出极强的保护欲和控制欲，但也允许你偶尔撒娇。",
          exLover: "“你是我的东西，没有我的允许，哪里都不准去。”",
          sex: "将你视为最宠爱的“狗”，在掌控中流露爱意。",
          exSex: "“乖孩子，做得好有奖励。跪下，吻我的脚。”"
        }
      };
      const isEditMode = vue.ref(false);
      const targetId = vue.ref(null);
      const currentTemplateKey = vue.ref("");
      const activeSections = vue.ref({ basic: false, player: false, core: false, personality: false, init: false, memory: false, danger: false });
      const toggleSection = (key) => {
        activeSections.value[key] = !activeSections.value[key];
      };
      const subSections = vue.ref({ charWorld: false, charLooks: false, userWorld: false, userLooks: false });
      const toggleSubSection = (key) => {
        subSections.value[key] = !subSections.value[key];
      };
      const worldList = vue.ref([]);
      const worldIndex = vue.ref(-1);
      const userWorldIndex = vue.ref(-1);
      const formData = vue.ref({
        // 基础信息
        name: "",
        avatar: "",
        bio: "",
        worldId: "",
        location: "",
        occupation: "",
        worldLore: "",
        // 世界观
        // 核心外貌数据
        appearance: "",
        appearanceSafe: "",
        appearanceNsfw: "",
        faceStyle: "cute",
        charFeatures: {
          hairColor: "",
          hairStyle: "",
          eyeColor: "",
          wearStatus: "正常穿戴",
          clothingStyle: "",
          clothingColor: "",
          legWear: "",
          skinGloss: "",
          chestSize: "",
          nippleColor: "",
          waist: "",
          hipsLegs: "",
          pubicHair: "",
          vulvaType: ""
        },
        // 【新增】细节设定
        speakingStyle: "",
        // 说话风格/口癖
        likes: "",
        // 喜好
        dislikes: "",
        // 雷点
        // 【关键升级】5 阶段人设
        personalityNormal: "",
        exampleNormal: "",
        // 阶段1: 陌生 (0-20)
        personalityFriend: "",
        exampleFriend: "",
        // 阶段2: 熟人 (21-40) [新增]
        personalityFlirt: "",
        exampleFlirt: "",
        // 阶段3: 暧昧 (41-60)
        personalityLover: "",
        exampleLover: "",
        // 阶段4: 热恋 (61-80) [新增]
        personalitySex: "",
        exampleSex: "",
        // 阶段5: 痴迷 (81+)
        // 玩家设定
        userWorldId: "",
        userLocation: "",
        userOccupation: "",
        userAppearance: "",
        userFeatures: { hair: "", body: "", privates: "" },
        // 系统设置
        maxReplies: 1,
        initialAffection: 10,
        initialLust: 0,
        allowProactive: false,
        proactiveInterval: 4,
        proactiveNotify: false,
        historyLimit: 20,
        enableSummary: false,
        summaryFrequency: 20,
        summary: ""
      });
      const selectedWorld = vue.computed(() => worldIndex.value > -1 && worldList.value[worldIndex.value] ? worldList.value[worldIndex.value] : null);
      const selectedUserWorld = vue.computed(() => userWorldIndex.value > -1 && worldList.value[userWorldIndex.value] ? worldList.value[userWorldIndex.value] : null);
      const getStyleLabel = (key) => FACE_LABELS[key] || key;
      const setFeature = (type, key, value) => {
        if (type === "char")
          formData.value.charFeatures[key] = value;
        else
          formData.value.userFeatures[key] = value;
      };
      const getCurrentLlmConfig = () => {
        const schemes = uni.getStorageSync("app_llm_schemes") || [];
        const idx = uni.getStorageSync("app_current_scheme_index") || 0;
        if (schemes.length > 0 && schemes[idx]) {
          return schemes[idx];
        }
        return null;
      };
      const performLlmRequest = async (prompt, customSystem = null) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        const chatConfig = getCurrentLlmConfig();
        if (!chatConfig || !chatConfig.apiKey) {
          throw new Error("未配置 API Key");
        }
        let baseUrl = chatConfig.baseUrl || "";
        if (baseUrl.endsWith("/"))
          baseUrl = baseUrl.slice(0, -1);
        let targetUrl = "";
        let method = "POST";
        let headers = { "Content-Type": "application/json" };
        let requestData = {};
        const systemInstruction = customSystem || "You are a prompt translator. Output only English tags.";
        if (chatConfig.provider === "gemini") {
          const cleanBase = "https://generativelanguage.googleapis.com";
          targetUrl = `${cleanBase}/v1beta/models/${chatConfig.model}:generateContent?key=${chatConfig.apiKey}`;
          requestData = {
            contents: [{
              parts: [{ text: `${systemInstruction}

Task: ${prompt}` }]
            }]
          };
        } else {
          headers["Authorization"] = `Bearer ${chatConfig.apiKey}`;
          targetUrl = `${baseUrl}/chat/completions`;
          requestData = {
            model: chatConfig.model,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            // 如果是写人设，给多一点 token，翻译则少一点
            max_tokens: customSystem ? 1e3 : 300,
            stream: false
          };
        }
        const res = await uni.request({
          url: targetUrl,
          method,
          header: headers,
          data: requestData,
          sslVerify: false
        });
        if (res.statusCode === 429) {
          throw new Error("请求太频繁 (429)。请稍后再试或检查 API 配额。");
        }
        let resultText = "";
        if (chatConfig.provider === "gemini") {
          if (res.statusCode === 200 && ((_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text)) {
            resultText = res.data.candidates[0].content.parts[0].text;
          } else {
            throw new Error(`Gemini API 错误 (${res.statusCode})`);
          }
        } else {
          let responseData = res.data;
          if (typeof responseData === "string") {
            try {
              responseData = JSON.parse(responseData);
            } catch (e) {
            }
          }
          if (res.statusCode === 200 && ((_i = (_h = (_g = responseData == null ? void 0 : responseData.choices) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) == null ? void 0 : _i.content)) {
            resultText = responseData.choices[0].message.content;
          } else {
            throw new Error(`API 错误 (${res.statusCode})`);
          }
        }
        return resultText.trim();
      };
      const generateEnglishPrompt = async () => {
        const f = formData.value.charFeatures;
        const faceTags = FACE_STYLES_MAP[formData.value.faceStyle] || "";
        let safeParts = [];
        if (f.hairColor || f.hairStyle)
          safeParts.push(`${f.hairColor || ""}${f.hairStyle || ""}`);
        if (f.eyeColor)
          safeParts.push(`${f.eyeColor}眼睛`);
        if (f.skinGloss)
          safeParts.push(`皮肤${f.skinGloss}`);
        if (f.chestSize)
          safeParts.push(`胸部${f.chestSize}`);
        if (f.waist)
          safeParts.push(f.waist);
        if (f.hipsLegs)
          safeParts.push(f.hipsLegs);
        const safeChinese = safeParts.join("，");
        let nsfwParts = [];
        if (f.nippleColor)
          nsfwParts.push(`乳头${f.nippleColor}`);
        if (f.pubicHair || f.vulvaType)
          nsfwParts.push(`私处${f.pubicHair || ""}，${f.vulvaType || ""}`);
        const nsfwChinese = nsfwParts.join("，");
        let clothesParts = [];
        if (f.clothingStyle)
          clothesParts.push(`穿着${f.clothingColor || ""}${f.clothingStyle}`);
        else
          clothesParts.push("穿着日常便服");
        if (f.legWear)
          clothesParts.push(`穿着${f.legWear}`);
        const clothesChinese = clothesParts.join("，");
        if (!safeChinese && !clothesChinese) {
          return uni.showToast({ title: "请先选择特征", icon: "none" });
        }
        uni.showLoading({ title: "生成纯净人设Prompt...", mask: true });
        try {
          const prompt = `Translate these 3 parts from Chinese to Danbooru English tags.
        Separate the parts with "|||".
        
        Part 1 (Body): "${safeChinese}"
        Part 2 (NSFW Details): "${nsfwChinese}"
        Part 3 (Clothing): "${clothesChinese}"
        
        Rules:
        1. Use specific tags (e.g. 'sweater', 'plaid skirt', 'pantyhose').
        2. Output ONLY the tags.
        3. Format: Part1Tags ||| Part2Tags ||| Part3Tags`;
          const result = await performLlmRequest(prompt);
          const parts = result.split("|||");
          const safeTags = parts[0] ? parts[0].trim() : "";
          const nsfwTags = parts[1] ? parts[1].trim() : "";
          const clothingTags = parts[2] ? parts[2].trim() : "";
          formData.value.appearanceSafe = `${faceTags}, ${safeTags}`.replace(/,\s*,/g, ",").trim();
          formData.value.appearanceNsfw = nsfwTags;
          if (f.wearStatus === "暴露/H") {
            formData.value.appearance = `${formData.value.appearanceSafe}, ${nsfwTags}`;
          } else {
            formData.value.appearance = `${formData.value.appearanceSafe}`;
          }
          tempClothingTagsForAvatar.value = clothingTags;
          uni.showToast({ title: "Prompt已生成 (不含衣物)", icon: "success" });
        } catch (e) {
          formatAppLog("error", "at pages/create/create.vue:926", e);
          formData.value.appearance = `${faceTags}, ${safeChinese}`;
          formData.value.appearanceSafe = `${faceTags}, ${safeChinese}`;
          tempClothingTagsForAvatar.value = clothesChinese;
          uni.showToast({ title: "翻译失败，使用原文", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      };
      const generateUserDescription = async () => {
        const f = formData.value.userFeatures;
        let tags = [];
        if (f.hair)
          tags.push(f.hair);
        if (f.body)
          tags.push(f.body);
        if (f.privates)
          tags.push(`下体${f.privates}`);
        const rawKeywords = tags.join("，");
        if (!rawKeywords)
          return uni.showToast({ title: "请先选择特征", icon: "none" });
        uni.showLoading({ title: "生成中...", mask: true });
        try {
          const prompt = `Translate to English tags: "${rawKeywords}". Start with "1boy". Output ONLY tags.`;
          const result = await performLlmRequest(prompt);
          formData.value.userAppearance = result;
          uni.showToast({ title: "成功", icon: "success" });
        } catch (e) {
          formData.value.userAppearance = `1boy, ${rawKeywords}`;
          uni.showToast({ title: e.message || "生成失败", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      };
      const generateImageFromComfyUI = async (promptText, baseUrl) => {
        const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));
        workflow["3"].inputs.text = promptText;
        workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999999);
        try {
          const queueRes = await uni.request({
            url: `${baseUrl}/prompt`,
            method: "POST",
            header: { "Content-Type": "application/json" },
            data: { prompt: workflow },
            sslVerify: false
          });
          if (queueRes.statusCode !== 200)
            throw new Error(`队列请求失败: ${queueRes.statusCode}`);
          const promptId = queueRes.data.prompt_id;
          for (let i = 0; i < 60; i++) {
            await new Promise((r) => setTimeout(r, 1e3));
            const historyRes = await uni.request({ url: `${baseUrl}/history/${promptId}`, method: "GET", sslVerify: false });
            if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
              const outputs = historyRes.data[promptId].outputs;
              if (outputs && outputs["16"] && outputs["16"].images.length > 0) {
                const imgInfo = outputs["16"].images[0];
                return `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
              }
            }
          }
          throw new Error("生成超时");
        } catch (e) {
          throw e;
        }
      };
      const generateAvatar = async () => {
        if (!formData.value.appearance.trim())
          return uni.showToast({ title: "请先生成 Prompt", icon: "none" });
        const imgConfig = uni.getStorageSync("app_image_config") || {};
        if (!imgConfig.baseUrl) {
          return uni.showToast({ title: "请在[我的]设置中配置 ComfyUI 地址", icon: "none" });
        }
        uni.showLoading({ title: "ComfyUI 绘图中...", mask: true });
        const clothes = tempClothingTagsForAvatar.value || "";
        const avatarPrompt = `best quality, masterpiece, anime style, cel shading, solo, cowboy shot, upper body, looking at viewer, ${formData.value.appearance}, ${clothes}`;
        try {
          const tempUrl = await generateImageFromComfyUI(avatarPrompt, imgConfig.baseUrl);
          if (tempUrl) {
            const saveId = targetId.value || "temp_create";
            const localPath = await saveToGallery(tempUrl, saveId, formData.value.name || "新角色", avatarPrompt);
            formData.value.avatar = localPath;
            uni.showToast({ title: "成功", icon: "success" });
          } else {
            throw new Error("ComfyUI 返回为空");
          }
        } catch (e) {
          formatAppLog("error", "at pages/create/create.vue:1013", e);
          uni.showModal({ title: "错误", content: e.message || "请求异常", showCancel: false });
        } finally {
          uni.hideLoading();
        }
      };
      const applyTemplate = (key) => {
        const t = PERSONALITY_TEMPLATES[key];
        if (!t)
          return;
        currentTemplateKey.value = key;
        formData.value.bio = t.bio;
        formData.value.speakingStyle = t.style;
        formData.value.likes = t.likes;
        formData.value.dislikes = t.dislikes;
        formData.value.personalityNormal = t.normal;
        formData.value.exampleNormal = t.exNormal;
        formData.value.personalityFriend = t.friend;
        formData.value.exampleFriend = t.exFriend;
        formData.value.personalityFlirt = t.flirt;
        formData.value.exampleFlirt = t.exFlirt;
        formData.value.personalityLover = t.lover;
        formData.value.exampleLover = t.exLover;
        formData.value.personalitySex = t.sex;
        formData.value.exampleSex = t.exSex;
        uni.showToast({ title: `已应用: ${t.label}`, icon: "none" });
      };
      onLoad((options) => {
        const storedWorlds = uni.getStorageSync("app_world_settings");
        if (storedWorlds && Array.isArray(storedWorlds))
          worldList.value = storedWorlds;
        if (options.id) {
          isEditMode.value = true;
          targetId.value = options.id;
          loadCharacterData(options.id);
          uni.setNavigationBarTitle({ title: "角色设置" });
        } else {
          activeSections.value.basic = true;
        }
      });
      const handleWorldChange = (e) => {
        worldIndex.value = e.detail.value;
        if (selectedWorld.value) {
          formData.value.worldId = selectedWorld.value.id;
          if (selectedWorld.value.description) {
            formData.value.worldLore = selectedWorld.value.description;
          }
        }
      };
      const handleUserWorldChange = (e) => {
        userWorldIndex.value = e.detail.value;
        if (selectedUserWorld.value)
          formData.value.userWorldId = selectedUserWorld.value.id;
      };
      const loadCharacterData = (id) => {
        const list = uni.getStorageSync("contact_list") || [];
        const target = list.find((item) => String(item.id) === String(id));
        if (target) {
          formData.value.name = target.name;
          formData.value.avatar = target.avatar;
          formData.value.worldId = target.worldId || "";
          formData.value.location = target.location || "";
          formData.value.occupation = target.occupation || target.settings && target.settings.occupation || "";
          if (target.settings) {
            formData.value.appearance = target.settings.appearance || "";
            formData.value.appearanceSafe = target.settings.appearanceSafe || "";
            formData.value.appearanceNsfw = target.settings.appearanceNsfw || "";
            formData.value.faceStyle = target.settings.faceStyle || "cute";
            formData.value.bio = target.settings.bio || "";
            formData.value.speakingStyle = target.settings.speakingStyle || "";
            formData.value.likes = target.settings.likes || "";
            formData.value.dislikes = target.settings.dislikes || "";
            formData.value.personalityNormal = target.settings.personalityNormal || "";
            formData.value.exampleNormal = target.settings.exampleNormal || "";
            formData.value.personalityFriend = target.settings.personalityFriend || "";
            formData.value.exampleFriend = target.settings.exampleFriend || "";
            formData.value.personalityFlirt = target.settings.personalityFlirt || "";
            formData.value.exampleFlirt = target.settings.exampleFlirt || "";
            formData.value.personalityLover = target.settings.personalityLover || "";
            formData.value.exampleLover = target.settings.exampleLover || "";
            formData.value.personalitySex = target.settings.personalitySex || "";
            formData.value.exampleSex = target.settings.exampleSex || "";
            formData.value.userWorldId = target.settings.userWorldId || "";
            formData.value.userLocation = target.settings.userLocation || "";
            formData.value.userOccupation = target.settings.userOccupation || "";
            formData.value.userAppearance = target.settings.userAppearance || "";
            formData.value.worldLore = target.settings.worldLore || "";
            if (target.settings.charFeatures)
              formData.value.charFeatures = { ...formData.value.charFeatures, ...target.settings.charFeatures };
            if (target.settings.userFeatures)
              formData.value.userFeatures = { ...formData.value.userFeatures, ...target.settings.userFeatures };
          }
          if (formData.value.worldId) {
            const idx = worldList.value.findIndex((w) => String(w.id) === String(formData.value.worldId));
            if (idx !== -1)
              worldIndex.value = idx;
          }
          if (formData.value.userWorldId) {
            const uIdx = worldList.value.findIndex((w) => String(w.id) === String(formData.value.userWorldId));
            if (uIdx !== -1)
              userWorldIndex.value = uIdx;
          }
          formData.value.maxReplies = target.maxReplies || 1;
          formData.value.initialAffection = target.initialAffection !== void 0 ? target.initialAffection : 10;
          formData.value.initialLust = target.initialLust !== void 0 ? target.initialLust : 0;
          formData.value.allowProactive = target.allowProactive || false;
          formData.value.proactiveInterval = target.proactiveInterval || 4;
          formData.value.proactiveNotify = target.proactiveNotify || false;
          formData.value.historyLimit = target.historyLimit !== void 0 ? target.historyLimit : 20;
          formData.value.enableSummary = target.enableSummary || false;
          formData.value.summaryFrequency = target.summaryFrequency || 20;
          formData.value.summary = target.summary || "";
        }
      };
      const autoGenerateFiveStages = async () => {
        if (!formData.value.bio) {
          return uni.showToast({ title: "请先填写「背景故事」", icon: "none" });
        }
        uni.showLoading({ title: "AI正在解析人设逻辑...", mask: true });
        const sysPrompt = `你是一个即兴角色扮演专家。请阅读用户的【背景故事】和【性格】，分析该角色与玩家的"初始关系"及"情感发展逻辑"。
    Output JSON only. 严禁Markdown。
    逻辑准则：
    1. 抛弃一切通用模板。
    2. 如果设定是仇人，Stage1就是敌对；如果是宠物，Stage1就是粘人；如果是路人，Stage1就是客气。
    3. Stage5 必须是该角色人设逻辑下的"最高情感形态"（比如病娇是监禁，傲娇是坦诚，奴隶是献身）。`;
        const userPrompt = `
    请根据以下设定，推演 5 个阶段的行为逻辑。

    【角色】${formData.value.name || "未命名"}
    【背景】${formData.value.bio}
    【性格/口癖】${formData.value.speakingStyle || "未设定"}
    【喜好/雷点】${formData.value.likes || "未设定"} / ${formData.value.dislikes || "未设定"}

    【生成要求】
    请生成 JSON 数据，key 为 stage1 到 stage5。
    - stage1 (初始状态): 基于背景故事，角色刚见到玩家时的自然反应（不用管好感度数值，只看人设逻辑）。
    - stage2 (熟悉/建立关系): 双方产生交集后的态度变化。
    - stage3 (好感/转折): 情感质变的转折点。
    - stage4 (深爱/确立): 确立深厚羁绊。
    - stage5 (极致/灵魂): 该角色能达到的最高情感强度 (可以是疯狂的、神圣的或肉欲的，取决于人设)。

    【JSON格式（严格遵守）】
    {
        "stage1": { "logic": "...", "dialogue": "..." },
        "stage2": { "logic": "...", "dialogue": "..." },
        "stage3": { "logic": "...", "dialogue": "..." },
        "stage4": { "logic": "...", "dialogue": "..." },
        "stage5": { "logic": "...", "dialogue": "..." }
    }
    `;
        try {
          let result = await performLlmRequest(userPrompt, sysPrompt);
          result = result.replace(/```json/g, "").replace(/```/g, "").trim();
          const data = JSON.parse(result);
          if (data.stage1) {
            formData.value.personalityNormal = data.stage1.logic;
            formData.value.exampleNormal = data.stage1.dialogue;
          }
          if (data.stage2) {
            formData.value.personalityFriend = data.stage2.logic;
            formData.value.exampleFriend = data.stage2.dialogue;
          }
          if (data.stage3) {
            formData.value.personalityFlirt = data.stage3.logic;
            formData.value.exampleFlirt = data.stage3.dialogue;
          }
          if (data.stage4) {
            formData.value.personalityLover = data.stage4.logic;
            formData.value.exampleLover = data.stage4.dialogue;
          }
          if (data.stage5) {
            formData.value.personalitySex = data.stage5.logic;
            formData.value.exampleSex = data.stage5.dialogue;
          }
          uni.showToast({ title: "人设推演完成！", icon: "success" });
        } catch (e) {
          formatAppLog("error", "at pages/create/create.vue:1223", e);
          uni.showModal({ title: "生成失败", content: "AI返回数据异常，请重试。\n" + e.message, showCancel: false });
        } finally {
          uni.hideLoading();
        }
      };
      const saveCharacter = () => {
        if (!formData.value.name.trim())
          return uni.showToast({ title: "名字不能为空", icon: "none" });
        let list = uni.getStorageSync("contact_list") || [];
        let clothingStr = "便服";
        if (formData.value.charFeatures.clothingStyle) {
          clothingStr = `${formData.value.charFeatures.clothingColor || ""}${formData.value.charFeatures.clothingStyle}`;
        }
        const charData = {
          name: formData.value.name,
          avatar: formData.value.avatar || "/static/ai-avatar.png",
          maxReplies: formData.value.maxReplies,
          initialAffection: formData.value.initialAffection,
          initialLust: formData.value.initialLust,
          allowProactive: formData.value.allowProactive,
          proactiveInterval: formData.value.proactiveInterval,
          proactiveNotify: formData.value.proactiveNotify,
          historyLimit: formData.value.historyLimit,
          enableSummary: formData.value.enableSummary,
          summaryFrequency: formData.value.summaryFrequency,
          summary: formData.value.summary,
          location: formData.value.location,
          clothing: clothingStr,
          worldId: formData.value.worldId,
          occupation: formData.value.occupation,
          settings: {
            // --- 外貌相关 ---
            appearance: formData.value.appearance,
            appearanceSafe: formData.value.appearanceSafe,
            appearanceNsfw: formData.value.appearanceNsfw,
            faceStyle: formData.value.faceStyle,
            charFeatures: formData.value.charFeatures,
            // --- 细节设定 (修复点：之前漏保存了) ---
            bio: formData.value.bio,
            speakingStyle: formData.value.speakingStyle,
            // 说话风格
            likes: formData.value.likes,
            // 喜好
            dislikes: formData.value.dislikes,
            // 雷点
            // --- 身份与玩家设定 ---
            occupation: formData.value.occupation,
            userWorldId: formData.value.userWorldId,
            userLocation: formData.value.userLocation,
            userOccupation: formData.value.userOccupation,
            userAppearance: formData.value.userAppearance,
            userFeatures: formData.value.userFeatures,
            worldLore: formData.value.worldLore,
            // --- 5阶段人设 (修复点：补全了 Friend 和 Lover 阶段) ---
            personalityNormal: formData.value.personalityNormal,
            exampleNormal: formData.value.exampleNormal,
            personalityFriend: formData.value.personalityFriend,
            // 补全
            exampleFriend: formData.value.exampleFriend,
            // 补全
            personalityFlirt: formData.value.personalityFlirt,
            exampleFlirt: formData.value.exampleFlirt,
            personalityLover: formData.value.personalityLover,
            // 补全
            exampleLover: formData.value.exampleLover,
            // 补全
            personalitySex: formData.value.personalitySex,
            exampleSex: formData.value.exampleSex
          },
          lastMsg: isEditMode.value ? void 0 : "新角色已创建",
          lastTime: isEditMode.value ? void 0 : "刚刚",
          unread: isEditMode.value ? void 0 : 0
        };
        if (isEditMode.value) {
          const index = list.findIndex((item) => String(item.id) === String(targetId.value));
          if (index !== -1) {
            list[index] = { ...list[index], ...charData };
            uni.showToast({ title: "修改已保存", icon: "success" });
          }
        } else {
          const newChar = {
            id: Date.now(),
            ...charData,
            affection: formData.value.initialAffection,
            lust: formData.value.initialLust,
            lastTimeTimestamp: Date.now(),
            unread: 0
          };
          list.unshift(newChar);
          uni.showToast({ title: "创建成功", icon: "success" });
        }
        uni.setStorageSync("contact_list", list);
        setTimeout(() => {
          uni.navigateBack();
        }, 800);
      };
      const clearHistoryAndReset = () => {
        uni.showModal({
          title: "彻底重置",
          content: `将清空聊天记录、重置好感度、欲望值、位置、活动状态。确定吗？`,
          confirmColor: "#ff4757",
          success: (res) => {
            if (res.confirm && targetId.value) {
              uni.removeStorageSync(`chat_history_${targetId.value}`);
              let list = uni.getStorageSync("contact_list") || [];
              const index = list.findIndex((item) => String(item.id) === String(targetId.value));
              if (index !== -1) {
                let clothingStr = "便服";
                if (formData.value.charFeatures.clothingStyle) {
                  clothingStr = `${formData.value.charFeatures.clothingColor || ""}${formData.value.charFeatures.clothingStyle}`;
                }
                const resetData = {
                  lastMsg: "（记忆已清除）",
                  lastTime: "刚刚",
                  lastTimeTimestamp: Date.now(),
                  summary: "",
                  currentLocation: formData.value.location || "角色家",
                  interactionMode: "phone",
                  lastActivity: "自由活动",
                  affection: formData.value.initialAffection || 10,
                  lust: formData.value.initialLust || 0,
                  clothing: clothingStr
                };
                list[index] = { ...list[index], ...resetData };
                uni.setStorageSync("contact_list", list);
                uni.showToast({ title: "重置成功", icon: "success" });
                setTimeout(() => {
                  uni.navigateBack();
                }, 800);
              } else {
                uni.showToast({ title: "未找到角色数据", icon: "none" });
              }
            }
          }
        });
      };
      const __returned__ = { tempClothingTagsForAvatar, FACE_STYLES_MAP, FACE_LABELS, OPTIONS, PERSONALITY_TEMPLATES, isEditMode, targetId, currentTemplateKey, activeSections, toggleSection, subSections, toggleSubSection, worldList, worldIndex, userWorldIndex, formData, selectedWorld, selectedUserWorld, getStyleLabel, setFeature, getCurrentLlmConfig, performLlmRequest, generateEnglishPrompt, generateUserDescription, generateImageFromComfyUI, generateAvatar, applyTemplate, handleWorldChange, handleUserWorldChange, loadCharacterData, autoGenerateFiveStages, saveCharacter, clearHistoryAndReset, ref: vue.ref, computed: vue.computed, get onLoad() {
        return onLoad;
      }, get saveToGallery() {
        return saveToGallery;
      }, get COMFY_WORKFLOW_TEMPLATE() {
        return COMFY_WORKFLOW_TEMPLATE;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "create-container" }, [
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "form-scroll"
      }, [
        vue.createElementVNode("view", { class: "form-section" }, [
          vue.createElementVNode("view", {
            class: "section-header",
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.toggleSection("basic"))
          }, [
            vue.createElementVNode("view", { class: "section-title-wrapper" }, [
              vue.createElementVNode("view", { class: "section-title" }, "角色基本信息"),
              vue.createElementVNode(
                "text",
                { class: "section-subtitle" },
                vue.toDisplayString($setup.isEditMode ? "修改设置" : "创建新角色"),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode(
              "text",
              { class: "arrow-icon" },
              vue.toDisplayString($setup.activeSections.basic ? "▼" : "▶"),
              1
              /* TEXT */
            )
          ]),
          vue.withDirectives(vue.createElementVNode(
            "view",
            { class: "section-content" },
            [
              vue.createElementVNode("view", { class: "input-item" }, [
                vue.createElementVNode("text", { class: "label" }, "角色名称"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.formData.name = $event),
                    placeholder: "例如：林雅婷"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.name]
                ])
              ]),
              vue.createElementVNode("view", { class: "sub-group" }, [
                vue.createElementVNode("view", {
                  class: "sub-header",
                  onClick: _cache[2] || (_cache[2] = ($event) => $setup.toggleSubSection("charWorld"))
                }, [
                  vue.createElementVNode("text", { class: "sub-title" }, "🌍 所属世界与身份"),
                  vue.createElementVNode(
                    "text",
                    { class: "sub-arrow" },
                    vue.toDisplayString($setup.subSections.charWorld ? "▼" : "▶"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "view",
                  { class: "sub-content" },
                  [
                    vue.createElementVNode("view", { class: "input-item" }, [
                      vue.createElementVNode("text", { class: "label" }, "选择世界"),
                      vue.createElementVNode("picker", {
                        mode: "selector",
                        range: $setup.worldList,
                        "range-key": "name",
                        value: $setup.worldIndex,
                        onChange: $setup.handleWorldChange
                      }, [
                        vue.createElementVNode(
                          "view",
                          { class: "picker-box" },
                          vue.toDisplayString($setup.selectedWorld ? $setup.selectedWorld.name : "🌐 默认/未选择 (点击选择)"),
                          1
                          /* TEXT */
                        )
                      ], 40, ["range", "value"])
                    ]),
                    vue.createElementVNode("view", { class: "textarea-item" }, [
                      vue.createElementVNode("text", { class: "label" }, "🌍 世界观法则 (Lore)"),
                      vue.createElementVNode("view", {
                        class: "tips-text",
                        style: { "font-size": "22rpx", "color": "#999", "margin-bottom": "10rpx" }
                      }, " 定义这个世界的物理规则、魔法体系、社会常识。防止AI出戏。 "),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "textarea",
                          style: { "height": "180rpx" },
                          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.formData.worldLore = $event),
                          placeholder: "例：这是一个赛博朋克世界，财阀统治一切，义体改造是合法的。没有魔法，只有科技。货币是信用点。",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.worldLore]
                      ])
                    ]),
                    $setup.selectedWorld ? (vue.openBlock(), vue.createElementBlock(
                      vue.Fragment,
                      { key: 0 },
                      [
                        vue.createElementVNode("view", { class: "input-item" }, [
                          vue.createElementVNode("text", { class: "label" }, "居住地址"),
                          vue.withDirectives(vue.createElementVNode(
                            "input",
                            {
                              class: "input",
                              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.formData.location = $event),
                              placeholder: "输入地址"
                            },
                            null,
                            512
                            /* NEED_PATCH */
                          ), [
                            [vue.vModelText, $setup.formData.location]
                          ]),
                          $setup.selectedWorld.locations ? (vue.openBlock(), vue.createElementBlock("view", {
                            key: 0,
                            class: "quick-tags"
                          }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.selectedWorld.locations, (loc, idx) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: idx,
                                  class: "tag",
                                  onClick: ($event) => $setup.formData.location = loc
                                }, vue.toDisplayString(loc), 9, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])) : vue.createCommentVNode("v-if", true)
                        ]),
                        vue.createElementVNode("view", { class: "input-item" }, [
                          vue.createElementVNode("text", { class: "label" }, "职业身份"),
                          vue.withDirectives(vue.createElementVNode(
                            "input",
                            {
                              class: "input",
                              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.formData.occupation = $event),
                              placeholder: "输入职业"
                            },
                            null,
                            512
                            /* NEED_PATCH */
                          ), [
                            [vue.vModelText, $setup.formData.occupation]
                          ]),
                          $setup.selectedWorld.occupations ? (vue.openBlock(), vue.createElementBlock("view", {
                            key: 0,
                            class: "quick-tags"
                          }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.selectedWorld.occupations, (job, idx) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: idx,
                                  class: "tag job-tag",
                                  onClick: ($event) => $setup.formData.occupation = job
                                }, vue.toDisplayString(job), 9, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])) : vue.createCommentVNode("v-if", true)
                        ])
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    )) : vue.createCommentVNode("v-if", true)
                  ],
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vShow, $setup.subSections.charWorld]
                ])
              ]),
              vue.createElementVNode("view", { class: "sub-group" }, [
                vue.createElementVNode("view", {
                  class: "sub-header",
                  onClick: _cache[6] || (_cache[6] = ($event) => $setup.toggleSubSection("charLooks"))
                }, [
                  vue.createElementVNode("text", { class: "sub-title" }, "💃 详细特征 (捏人)"),
                  vue.createElementVNode(
                    "text",
                    { class: "sub-arrow" },
                    vue.toDisplayString($setup.subSections.charLooks ? "▼" : "▶"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "view",
                  { class: "sub-content" },
                  [
                    vue.createElementVNode("view", { class: "category-block" }, [
                      vue.createElementVNode("text", { class: "block-title" }, "A. 头部与面部"),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "画风锁定"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.FACE_STYLES_MAP, (tags, key) => {
                                return vue.createElementVNode("view", {
                                  key,
                                  class: vue.normalizeClass(["chip style-chip", { active: $setup.formData.faceStyle === key }]),
                                  onClick: ($event) => $setup.formData.faceStyle = key
                                }, vue.toDisplayString($setup.getStyleLabel(key)), 11, ["onClick"]);
                              }),
                              64
                              /* STABLE_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "发色发型"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.hairColor, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.hairColor === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "hairColor", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            )),
                            vue.createElementVNode("view", { class: "separator" }, "|"),
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.hairStyle, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.hairStyle === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "hairStyle", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "眼睛特征"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.eyeColor, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.eyeColor === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "eyeColor", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "category-block" }, [
                      vue.createElementVNode("text", { class: "block-title" }, "B. 服装穿搭"),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", {
                          class: "feat-label",
                          style: { "color": "#e67e22" }
                        }, "穿衣状态"),
                        vue.createElementVNode("view", {
                          class: "tips-text",
                          style: { "margin-bottom": "8rpx", "font-size": "20rpx", "color": "#999" }
                        }, '(选"正常"时会自动隐藏私密部位Prompt)'),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.wearStatus, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.wearStatus === item, "chip-warn": item === "暴露/H" }]),
                                  onClick: ($event) => $setup.setFeature("char", "wearStatus", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "套装/款式"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.clothingStyle, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.clothingStyle === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "clothingStyle", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "主色调"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.clothingColor, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.clothingColor === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "clothingColor", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "袜饰/腿部"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.legWear, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.legWear === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "legWear", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "category-block" }, [
                      vue.createElementVNode("text", { class: "block-title" }, "C. 上身与皮肤"),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", {
                          class: "feat-label",
                          style: { "color": "#007aff" }
                        }, "皮肤光泽"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.skinGloss, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.skinGloss === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "skinGloss", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "胸部大小"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.chestSize, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.chestSize === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "chestSize", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "乳头颜色"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.nippleColor, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.nippleColor === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "nippleColor", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "category-block" }, [
                      vue.createElementVNode("text", { class: "block-title" }, "D. 下身特征"),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "腰部线条"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.waist, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.waist === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "waist", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "臀腿肉感"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.hipsLegs, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.hipsLegs === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "hipsLegs", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "category-block" }, [
                      vue.createElementVNode("text", {
                        class: "block-title",
                        style: { "color": "#ff6b81" }
                      }, "E. 私密花园 (NSFW)"),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "毛发状态"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.pubicHair, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.pubicHair === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "pubicHair", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "户型外观"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.vulvaType, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.charFeatures.vulvaType === item }]),
                                  onClick: ($event) => $setup.setFeature("char", "vulvaType", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ])
                    ]),
                    vue.createElementVNode("button", {
                      class: "mini-btn-gen",
                      onClick: $setup.generateEnglishPrompt
                    }, "⬇️ 组装并翻译 Prompt")
                  ],
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vShow, $setup.subSections.charLooks]
                ])
              ]),
              vue.createElementVNode("view", { class: "textarea-item" }, [
                vue.createElementVNode("text", { class: "label" }, "固定外貌 Prompt (英文 - 将直接用于生图)"),
                vue.withDirectives(vue.createElementVNode(
                  "textarea",
                  {
                    class: "textarea large",
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.formData.appearance = $event),
                    placeholder: "1girl, cute face...",
                    maxlength: "-1"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.appearance]
                ]),
                vue.createElementVNode("view", { class: "tip" }, "Chat页面将直接使用此段 Prompt。")
              ]),
              vue.createElementVNode("view", { class: "input-item" }, [
                vue.createElementVNode("view", { class: "label-row" }, [
                  vue.createElementVNode("text", {
                    class: "label",
                    style: { "margin-bottom": "0" }
                  }, "头像链接"),
                  vue.createElementVNode("view", {
                    class: "gen-btn",
                    onClick: $setup.generateAvatar,
                    "hover-class": "gen-btn-hover"
                  }, "🎨 ComfyUI 生成")
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.formData.avatar = $event),
                    placeholder: "输入链接 或 点击上方生成"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.avatar]
                ]),
                vue.createElementVNode("view", { class: "avatar-preview-box" }, [
                  $setup.formData.avatar && $setup.formData.avatar.length > 10 ? (vue.openBlock(), vue.createElementBlock("image", {
                    key: 0,
                    src: $setup.formData.avatar,
                    class: "avatar-preview",
                    mode: "aspectFill"
                  }, null, 8, ["src"])) : (vue.openBlock(), vue.createElementBlock("view", {
                    key: 1,
                    class: "avatar-placeholder"
                  }, [
                    vue.createElementVNode("text", { class: "avatar-emoji" }, "📷")
                  ]))
                ])
              ])
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, $setup.activeSections.basic]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-section" }, [
          vue.createElementVNode("view", {
            class: "section-header",
            onClick: _cache[9] || (_cache[9] = ($event) => $setup.toggleSection("player"))
          }, [
            vue.createElementVNode("view", { class: "section-title-wrapper" }, [
              vue.createElementVNode("view", {
                class: "section-title",
                style: { "color": "#2ecc71" }
              }, "玩家设定 (你)"),
              vue.createElementVNode("text", { class: "section-subtitle" }, "你的身份、世界、外貌")
            ]),
            vue.createElementVNode(
              "text",
              { class: "arrow-icon" },
              vue.toDisplayString($setup.activeSections.player ? "▼" : "▶"),
              1
              /* TEXT */
            )
          ]),
          vue.withDirectives(vue.createElementVNode(
            "view",
            { class: "section-content" },
            [
              vue.createElementVNode("view", { class: "sub-group" }, [
                vue.createElementVNode("view", {
                  class: "sub-header",
                  onClick: _cache[10] || (_cache[10] = ($event) => $setup.toggleSubSection("userWorld"))
                }, [
                  vue.createElementVNode("text", { class: "sub-title" }, "🌍 你的世界"),
                  vue.createElementVNode(
                    "text",
                    { class: "sub-arrow" },
                    vue.toDisplayString($setup.subSections.userWorld ? "▼" : "▶"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "view",
                  { class: "sub-content" },
                  [
                    vue.createElementVNode("view", { class: "input-item" }, [
                      vue.createElementVNode("text", { class: "label" }, "所属世界"),
                      vue.createElementVNode("picker", {
                        mode: "selector",
                        range: $setup.worldList,
                        "range-key": "name",
                        value: $setup.userWorldIndex,
                        onChange: $setup.handleUserWorldChange
                      }, [
                        vue.createElementVNode(
                          "view",
                          { class: "picker-box" },
                          vue.toDisplayString($setup.selectedUserWorld ? $setup.selectedUserWorld.name : "🌐 与角色保持一致 (或默认)"),
                          1
                          /* TEXT */
                        )
                      ], 40, ["range", "value"])
                    ]),
                    $setup.selectedUserWorld ? (vue.openBlock(), vue.createElementBlock(
                      vue.Fragment,
                      { key: 0 },
                      [
                        vue.createElementVNode("view", { class: "input-item" }, [
                          vue.createElementVNode("text", { class: "label" }, "你的住址"),
                          vue.withDirectives(vue.createElementVNode(
                            "input",
                            {
                              class: "input",
                              "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $setup.formData.userLocation = $event)
                            },
                            null,
                            512
                            /* NEED_PATCH */
                          ), [
                            [vue.vModelText, $setup.formData.userLocation]
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "input-item" }, [
                          vue.createElementVNode("text", { class: "label" }, "你的身份"),
                          vue.withDirectives(vue.createElementVNode(
                            "input",
                            {
                              class: "input",
                              "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => $setup.formData.userOccupation = $event)
                            },
                            null,
                            512
                            /* NEED_PATCH */
                          ), [
                            [vue.vModelText, $setup.formData.userOccupation]
                          ])
                        ])
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    )) : (vue.openBlock(), vue.createElementBlock(
                      vue.Fragment,
                      { key: 1 },
                      [
                        vue.createElementVNode("view", { class: "input-item" }, [
                          vue.createElementVNode("text", { class: "label" }, "你的住址"),
                          vue.withDirectives(vue.createElementVNode(
                            "input",
                            {
                              class: "input",
                              "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => $setup.formData.userLocation = $event)
                            },
                            null,
                            512
                            /* NEED_PATCH */
                          ), [
                            [vue.vModelText, $setup.formData.userLocation]
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "input-item" }, [
                          vue.createElementVNode("text", { class: "label" }, "你的身份"),
                          vue.withDirectives(vue.createElementVNode(
                            "input",
                            {
                              class: "input",
                              "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => $setup.formData.userOccupation = $event)
                            },
                            null,
                            512
                            /* NEED_PATCH */
                          ), [
                            [vue.vModelText, $setup.formData.userOccupation]
                          ])
                        ])
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    ))
                  ],
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vShow, $setup.subSections.userWorld]
                ])
              ]),
              vue.createElementVNode("view", { class: "sub-group" }, [
                vue.createElementVNode("view", {
                  class: "sub-header",
                  onClick: _cache[15] || (_cache[15] = ($event) => $setup.toggleSubSection("userLooks"))
                }, [
                  vue.createElementVNode("text", { class: "sub-title" }, "🧔‍♂️ 你的外貌 (男性特征)"),
                  vue.createElementVNode(
                    "text",
                    { class: "sub-arrow" },
                    vue.toDisplayString($setup.subSections.userLooks ? "▼" : "▶"),
                    1
                    /* TEXT */
                  )
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "view",
                  { class: "sub-content" },
                  [
                    vue.createElementVNode("view", { class: "category-block" }, [
                      vue.createElementVNode("text", { class: "block-title" }, "基本特征"),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "发型"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.maleHair, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.userFeatures.hair === item }]),
                                  onClick: ($event) => $setup.setFeature("user", "hair", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "身材"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.maleBody, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.userFeatures.body === item }]),
                                  onClick: ($event) => $setup.setFeature("user", "body", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "category-block" }, [
                      vue.createElementVNode("text", { class: "block-title" }, "下体特征 (NSFW)"),
                      vue.createElementVNode("view", { class: "feature-row" }, [
                        vue.createElementVNode("text", { class: "feat-label" }, "尺寸/状态"),
                        vue.createElementVNode("scroll-view", {
                          "scroll-x": "",
                          class: "chips-scroll"
                        }, [
                          vue.createElementVNode("view", { class: "chips-flex" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.OPTIONS.malePrivate, (item) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: item,
                                  class: vue.normalizeClass(["chip", { active: $setup.formData.userFeatures.privates === item }]),
                                  onClick: ($event) => $setup.setFeature("user", "privates", item)
                                }, vue.toDisplayString(item), 11, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])
                      ])
                    ]),
                    vue.createElementVNode("button", {
                      class: "mini-btn-gen",
                      onClick: $setup.generateUserDescription
                    }, "⬇️ 生成玩家 Prompt (英文)")
                  ],
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vShow, $setup.subSections.userLooks]
                ])
              ]),
              vue.createElementVNode("view", { class: "textarea-item" }, [
                vue.createElementVNode("text", { class: "label" }, "玩家外貌 Prompt (英文 - 用于双人生图)"),
                vue.withDirectives(vue.createElementVNode(
                  "textarea",
                  {
                    class: "textarea",
                    "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => $setup.formData.userAppearance = $event),
                    placeholder: "1boy, short hair...",
                    maxlength: "-1"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.userAppearance]
                ])
              ])
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, $setup.activeSections.player]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-section" }, [
          vue.createElementVNode("view", {
            class: "section-header",
            onClick: _cache[17] || (_cache[17] = ($event) => $setup.toggleSection("core"))
          }, [
            vue.createElementVNode("view", { class: "section-title-wrapper" }, [
              vue.createElementVNode("view", {
                class: "section-title",
                style: { "color": "#ff9f43" }
              }, "核心人设与剧本"),
              vue.createElementVNode("text", { class: "section-subtitle" }, "选择模板，或者自己编写她的灵魂")
            ]),
            vue.createElementVNode(
              "text",
              { class: "arrow-icon" },
              vue.toDisplayString($setup.activeSections.core ? "▼" : "▶"),
              1
              /* TEXT */
            )
          ]),
          vue.withDirectives(vue.createElementVNode(
            "view",
            { class: "section-content" },
            [
              vue.createElementVNode("view", { class: "template-selector" }, [
                vue.createElementVNode("text", { class: "label" }, "✨ 快速选择人设模板 (点击自动填充)"),
                vue.createElementVNode("scroll-view", {
                  "scroll-x": "",
                  class: "chips-scroll"
                }, [
                  vue.createElementVNode("view", { class: "chips-flex" }, [
                    (vue.openBlock(), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList($setup.PERSONALITY_TEMPLATES, (tpl, key) => {
                        return vue.createElementVNode("view", {
                          key,
                          class: vue.normalizeClass(["chip template-chip", { active: $setup.currentTemplateKey === key }]),
                          onClick: ($event) => $setup.applyTemplate(key)
                        }, [
                          vue.createElementVNode(
                            "text",
                            { class: "tpl-label" },
                            vue.toDisplayString(tpl.label),
                            1
                            /* TEXT */
                          )
                        ], 10, ["onClick"]);
                      }),
                      64
                      /* STABLE_FRAGMENT */
                    ))
                  ])
                ]),
                $setup.currentTemplateKey ? (vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: 0,
                    class: "template-desc"
                  },
                  " 📝 模板说明：" + vue.toDisplayString($setup.PERSONALITY_TEMPLATES[$setup.currentTemplateKey].desc),
                  1
                  /* TEXT */
                )) : vue.createCommentVNode("v-if", true)
              ]),
              vue.createElementVNode("view", { class: "divider" }),
              vue.createElementVNode("view", { class: "textarea-item" }, [
                vue.createElementVNode("text", { class: "label" }, "📜 背景故事 / 身份设定"),
                vue.createElementVNode("view", { class: "help-text" }, "她是高冷仙子？还是公司女总裁？在这里写下她的出身和基本设定。"),
                vue.withDirectives(vue.createElementVNode(
                  "textarea",
                  {
                    class: "textarea",
                    "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => $setup.formData.bio = $event),
                    placeholder: "例：她是修仙界的高冷圣女，从小...",
                    maxlength: "-1"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.bio]
                ])
              ]),
              vue.createElementVNode("view", { class: "textarea-item" }, [
                vue.createElementVNode("text", { class: "label" }, "🗣️ 说话风格 / 口癖"),
                vue.withDirectives(vue.createElementVNode(
                  "textarea",
                  {
                    class: "textarea",
                    style: { "height": "120rpx" },
                    "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => $setup.formData.speakingStyle = $event),
                    placeholder: "例：喜欢在句尾加“喵”，或者自称“本宫”，说话文绉绉的...",
                    maxlength: "-1"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.speakingStyle]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-item" }, [
                vue.createElementVNode("text", { class: "label" }, "❤️ 喜好 (Likes)"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => $setup.formData.likes = $event),
                    placeholder: "例：甜食，猫，夸奖"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.likes]
                ])
              ]),
              vue.createElementVNode("view", { class: "input-item" }, [
                vue.createElementVNode("text", { class: "label" }, "⚡ 雷点 (Dislikes)"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    class: "input",
                    "onUpdate:modelValue": _cache[21] || (_cache[21] = ($event) => $setup.formData.dislikes = $event),
                    placeholder: "例：吃辣，被无视，邋遢"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.dislikes]
                ])
              ]),
              vue.createElementVNode("view", {
                class: "input-item",
                style: { "margin-top": "30rpx", "padding": "20rpx", "background": "#e3f2fd", "border-radius": "16rpx", "border": "1px dashed #2196f3" }
              }, [
                vue.createElementVNode("view", { style: { "text-align": "center" } }, [
                  vue.createElementVNode("view", { style: { "font-size": "28rpx", "font-weight": "bold", "color": "#1976d2", "margin-bottom": "10rpx" } }, "✨ 没灵感？交给 AI"),
                  vue.createElementVNode("view", { style: { "font-size": "22rpx", "color": "#666", "margin-bottom": "20rpx" } }, "填写完「背景故事」和「喜好」后，点击下方按钮，AI 自动生成 5 阶段演化逻辑。"),
                  vue.createElementVNode("button", {
                    onClick: $setup.autoGenerateFiveStages,
                    style: { "background": "#2196f3", "color": "white", "font-size": "26rpx", "border-radius": "40rpx", "width": "80%" }
                  }, "🚀 一键生成行为与剧本")
                ])
              ]),
              vue.createElementVNode("view", { class: "stage-container" }, [
                vue.createElementVNode("text", {
                  class: "label",
                  style: { "margin-bottom": "20rpx", "display": "block" }
                }, "🎭 5阶段好感度反应 (更细腻的演化)"),
                vue.createElementVNode("view", { class: "stage-card gray" }, [
                  vue.createElementVNode("view", { class: "stage-header" }, [
                    vue.createElementVNode("text", { class: "stage-title" }, "阶段 1: 陌生/警惕 (0-20分)"),
                    vue.createElementVNode("text", { class: "stage-icon" }, "😐")
                  ]),
                  vue.createElementVNode("view", { class: "stage-body" }, [
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "行为逻辑"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea",
                          "onUpdate:modelValue": _cache[22] || (_cache[22] = ($event) => $setup.formData.personalityNormal = $event),
                          placeholder: "例：冷淡，拒绝触碰...",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.personalityNormal]
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "对话语气"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea bubble",
                          "onUpdate:modelValue": _cache[23] || (_cache[23] = ($event) => $setup.formData.exampleNormal = $event),
                          placeholder: "例：“离我远点，凡人。”",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.exampleNormal]
                      ])
                    ])
                  ])
                ]),
                vue.createElementVNode("view", {
                  class: "stage-card",
                  style: { "background-color": "#e3f2fd", "border-color": "#90caf9" }
                }, [
                  vue.createElementVNode("view", {
                    class: "stage-header",
                    style: { "background-color": "#bbdefb", "color": "#1565c0" }
                  }, [
                    vue.createElementVNode("text", { class: "stage-title" }, "阶段 2: 熟人/朋友 (21-40分)"),
                    vue.createElementVNode("text", { class: "stage-icon" }, "🤝")
                  ]),
                  vue.createElementVNode("view", { class: "stage-body" }, [
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "行为逻辑"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea",
                          "onUpdate:modelValue": _cache[24] || (_cache[24] = ($event) => $setup.formData.personalityFriend = $event),
                          placeholder: "例：放松，开玩笑，像朋友一样...",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.personalityFriend]
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "对话语气"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea bubble",
                          "onUpdate:modelValue": _cache[25] || (_cache[25] = ($event) => $setup.formData.exampleFriend = $event),
                          placeholder: "例：“哟，今天来得挺早啊。”",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.exampleFriend]
                      ])
                    ])
                  ])
                ]),
                vue.createElementVNode("view", { class: "stage-card pink" }, [
                  vue.createElementVNode("view", { class: "stage-header" }, [
                    vue.createElementVNode("text", { class: "stage-title" }, "阶段 3: 暧昧/心动 (41-60分)"),
                    vue.createElementVNode("text", { class: "stage-icon" }, "☺️")
                  ]),
                  vue.createElementVNode("view", { class: "stage-body" }, [
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "行为逻辑"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea",
                          "onUpdate:modelValue": _cache[26] || (_cache[26] = ($event) => $setup.formData.personalityFlirt = $event),
                          placeholder: "例：偶尔脸红，允许牵手...",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.personalityFlirt]
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "对话语气"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea bubble",
                          "onUpdate:modelValue": _cache[27] || (_cache[27] = ($event) => $setup.formData.exampleFlirt = $event),
                          placeholder: "例：“也不是不可以啦...”",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.exampleFlirt]
                      ])
                    ])
                  ])
                ]),
                vue.createElementVNode("view", {
                  class: "stage-card",
                  style: { "background-color": "#fff3e0", "border-color": "#ffcc80" }
                }, [
                  vue.createElementVNode("view", {
                    class: "stage-header",
                    style: { "background-color": "#ffe0b2", "color": "#e65100" }
                  }, [
                    vue.createElementVNode("text", { class: "stage-title" }, "阶段 4: 热恋/深爱 (61-80分)"),
                    vue.createElementVNode("text", { class: "stage-icon" }, "💑")
                  ]),
                  vue.createElementVNode("view", { class: "stage-body" }, [
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "行为逻辑"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea",
                          "onUpdate:modelValue": _cache[28] || (_cache[28] = ($event) => $setup.formData.personalityLover = $event),
                          placeholder: "例：亲昵，撒娇，粘人...",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.personalityLover]
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "对话语气"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea bubble",
                          "onUpdate:modelValue": _cache[29] || (_cache[29] = ($event) => $setup.formData.exampleLover = $event),
                          placeholder: "例：“亲爱的，抱抱我嘛~”",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.exampleLover]
                      ])
                    ])
                  ])
                ]),
                vue.createElementVNode("view", { class: "stage-card red" }, [
                  vue.createElementVNode("view", { class: "stage-header" }, [
                    vue.createElementVNode("text", { class: "stage-title" }, "阶段 5: 痴迷/灵魂伴侣 (81+分)"),
                    vue.createElementVNode("text", { class: "stage-icon" }, "😍")
                  ]),
                  vue.createElementVNode("view", { class: "stage-body" }, [
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "行为逻辑"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea",
                          "onUpdate:modelValue": _cache[30] || (_cache[30] = ($event) => $setup.formData.personalitySex = $event),
                          placeholder: "例：完全服从，渴望被爱...",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.personalitySex]
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "对话语气"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea bubble",
                          "onUpdate:modelValue": _cache[31] || (_cache[31] = ($event) => $setup.formData.exampleSex = $event),
                          placeholder: "例：“主人，请尽情使用我吧...”",
                          maxlength: "-1"
                        },
                        null,
                        512
                        /* NEED_PATCH */
                      ), [
                        [vue.vModelText, $setup.formData.exampleSex]
                      ])
                    ])
                  ])
                ])
              ])
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, $setup.activeSections.core]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-section" }, [
          vue.createElementVNode("view", {
            class: "section-header",
            onClick: _cache[32] || (_cache[32] = ($event) => $setup.toggleSection("init"))
          }, [
            vue.createElementVNode("view", { class: "section-title-wrapper" }, [
              vue.createElementVNode("view", { class: "section-title" }, "初始状态设置")
            ]),
            vue.createElementVNode(
              "text",
              { class: "arrow-icon" },
              vue.toDisplayString($setup.activeSections.init ? "▼" : "▶"),
              1
              /* TEXT */
            )
          ]),
          vue.withDirectives(vue.createElementVNode(
            "view",
            { class: "section-content" },
            [
              vue.createElementVNode("view", { class: "input-item" }, [
                vue.createElementVNode("view", { class: "slider-header" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "label" },
                    "初始好感度 (Affection): " + vue.toDisplayString($setup.formData.initialAffection),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("slider", {
                  value: $setup.formData.initialAffection,
                  min: "0",
                  max: "100",
                  step: "5",
                  "show-value": "",
                  onChange: _cache[33] || (_cache[33] = (e) => $setup.formData.initialAffection = e.detail.value)
                }, null, 40, ["value"]),
                vue.createElementVNode("view", { class: "tip" }, "决定了角色对你情感的起点。")
              ]),
              vue.createElementVNode("view", {
                class: "input-item",
                style: { "border-top": "1px dashed #eee", "padding-top": "20rpx", "margin-top": "20rpx" }
              }, [
                vue.createElementVNode("view", { class: "slider-header" }, [
                  vue.createElementVNode(
                    "text",
                    {
                      class: "label",
                      style: { "color": "#e056fd" }
                    },
                    "初始欲望值 (Lust): " + vue.toDisplayString($setup.formData.initialLust),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("slider", {
                  value: $setup.formData.initialLust,
                  min: "0",
                  max: "100",
                  step: "5",
                  "show-value": "",
                  activeColor: "#e056fd",
                  onChange: _cache[34] || (_cache[34] = (e) => $setup.formData.initialLust = e.detail.value)
                }, null, 40, ["value"]),
                vue.createElementVNode("view", {
                  class: "tip",
                  style: { "color": "#e056fd" }
                }, [
                  vue.createTextVNode(" 🔥 独立于好感度。"),
                  vue.createElementVNode("br"),
                  vue.createTextVNode(" 高欲望 + 低好感 = 反差/身体诚实/恶堕 (嘴上说不要，身体很诚实)。"),
                  vue.createElementVNode("br"),
                  vue.createTextVNode(" 高欲望 + 高好感 = 热情似火。 ")
                ])
              ]),
              vue.createElementVNode("view", {
                class: "input-item",
                style: { "border-top": "1px dashed #eee", "padding-top": "20rpx", "margin-top": "20rpx" }
              }, [
                vue.createElementVNode("view", { class: "label-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "🤖 允许角色主动找我"),
                  vue.createElementVNode("switch", {
                    checked: $setup.formData.allowProactive,
                    onChange: _cache[35] || (_cache[35] = (e) => $setup.formData.allowProactive = e.detail.value),
                    color: "#007aff"
                  }, null, 40, ["checked"])
                ]),
                $setup.formData.allowProactive ? (vue.openBlock(), vue.createElementBlock(
                  vue.Fragment,
                  { key: 0 },
                  [
                    vue.createElementVNode("view", {
                      class: "slider-header",
                      style: { "margin-top": "20rpx" }
                    }, [
                      vue.createElementVNode(
                        "text",
                        { class: "label" },
                        "主动间隔: " + vue.toDisplayString($setup.formData.proactiveInterval) + " 小时",
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("slider", {
                      value: $setup.formData.proactiveInterval,
                      min: "1",
                      max: "48",
                      step: "1",
                      "show-value": "",
                      activeColor: "#007aff",
                      onChange: _cache[36] || (_cache[36] = (e) => $setup.formData.proactiveInterval = e.detail.value)
                    }, null, 40, ["value"]),
                    vue.createElementVNode("view", { class: "tip" }, "当您离开 App 超过这个时间，角色可能会主动发消息。"),
                    vue.createElementVNode("view", {
                      class: "label-row",
                      style: { "margin-top": "20rpx" }
                    }, [
                      vue.createElementVNode("text", { class: "label" }, "🔔 开启系统弹窗通知"),
                      vue.createElementVNode("switch", {
                        checked: $setup.formData.proactiveNotify,
                        onChange: _cache[37] || (_cache[37] = (e) => $setup.formData.proactiveNotify = e.detail.value),
                        color: "#ff9f43"
                      }, null, 40, ["checked"])
                    ]),
                    $setup.formData.proactiveNotify ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 0,
                      class: "tip"
                    }, "需在手机设置中允许 App 通知权限。")) : vue.createCommentVNode("v-if", true)
                  ],
                  64
                  /* STABLE_FRAGMENT */
                )) : vue.createCommentVNode("v-if", true)
              ]),
              vue.createElementVNode("view", {
                class: "input-item",
                style: { "margin-top": "20rpx" }
              }, [
                vue.createElementVNode("text", { class: "label" }, "连续回复上限"),
                vue.createElementVNode("slider", {
                  value: $setup.formData.maxReplies,
                  min: "1",
                  max: "5",
                  "show-value": "",
                  onChange: _cache[38] || (_cache[38] = (e) => $setup.formData.maxReplies = e.detail.value)
                }, null, 40, ["value"])
              ])
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, $setup.activeSections.init]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-section" }, [
          vue.createElementVNode("view", {
            class: "section-header",
            onClick: _cache[39] || (_cache[39] = ($event) => $setup.toggleSection("memory"))
          }, [
            vue.createElementVNode("view", { class: "section-title-wrapper" }, [
              vue.createElementVNode("view", {
                class: "section-title",
                style: { "color": "#9b59b6" }
              }, "记忆增强")
            ]),
            vue.createElementVNode(
              "text",
              { class: "arrow-icon" },
              vue.toDisplayString($setup.activeSections.memory ? "▼" : "▶"),
              1
              /* TEXT */
            )
          ]),
          vue.withDirectives(vue.createElementVNode(
            "view",
            { class: "section-content" },
            [
              vue.createElementVNode("view", { class: "input-item" }, [
                vue.createElementVNode("view", { class: "slider-header" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "label" },
                    "上下文深度 (History Limit): " + vue.toDisplayString($setup.formData.historyLimit),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("slider", {
                  value: $setup.formData.historyLimit,
                  min: "10",
                  max: "60",
                  step: "2",
                  "show-value": "",
                  activeColor: "#9b59b6",
                  onChange: _cache[40] || (_cache[40] = (e) => $setup.formData.historyLimit = e.detail.value)
                }, null, 40, ["value"]),
                vue.createElementVNode("view", { class: "tip" }, "控制AI能“看到”的最近聊天记录条数。")
              ]),
              vue.createElementVNode("view", {
                class: "input-item",
                style: { "display": "flex", "justify-content": "space-between", "align-items": "center", "border-top": "1px dashed #eee", "padding-top": "20rpx", "margin-top": "20rpx" }
              }, [
                vue.createElementVNode("text", {
                  class: "label",
                  style: { "margin-bottom": "0" }
                }, "开启长期记忆自动总结"),
                vue.createElementVNode("switch", {
                  checked: $setup.formData.enableSummary,
                  onChange: _cache[41] || (_cache[41] = (e) => $setup.formData.enableSummary = e.detail.value),
                  color: "#9b59b6"
                }, null, 40, ["checked"])
              ]),
              $setup.formData.enableSummary ? (vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                { key: 0 },
                [
                  vue.createElementVNode("view", { class: "input-item" }, [
                    vue.createElementVNode("view", { class: "slider-header" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "label" },
                        "总结频率: " + vue.toDisplayString($setup.formData.summaryFrequency),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("slider", {
                      value: $setup.formData.summaryFrequency,
                      min: "10",
                      max: "50",
                      step: "5",
                      "show-value": "",
                      activeColor: "#9b59b6",
                      onChange: _cache[42] || (_cache[42] = (e) => $setup.formData.summaryFrequency = e.detail.value)
                    }, null, 40, ["value"])
                  ]),
                  vue.createElementVNode("view", { class: "textarea-item" }, [
                    vue.createElementVNode("view", { class: "slider-header" }, [
                      vue.createElementVNode("text", { class: "label" }, "当前长期记忆摘要"),
                      vue.createElementVNode("text", {
                        class: "tip",
                        style: { "color": "#9b59b6" },
                        onClick: _cache[43] || (_cache[43] = ($event) => $setup.formData.summary = "")
                      }, "清空")
                    ]),
                    vue.withDirectives(vue.createElementVNode(
                      "textarea",
                      {
                        class: "textarea large memory-box",
                        "onUpdate:modelValue": _cache[44] || (_cache[44] = ($event) => $setup.formData.summary = $event),
                        maxlength: "-1"
                      },
                      null,
                      512
                      /* NEED_PATCH */
                    ), [
                      [vue.vModelText, $setup.formData.summary]
                    ])
                  ])
                ],
                64
                /* STABLE_FRAGMENT */
              )) : vue.createCommentVNode("v-if", true)
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, $setup.activeSections.memory]
          ])
        ]),
        $setup.isEditMode ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "form-section"
        }, [
          vue.createElementVNode("view", {
            class: "section-header",
            onClick: _cache[45] || (_cache[45] = ($event) => $setup.toggleSection("danger"))
          }, [
            vue.createElementVNode("view", {
              class: "section-title",
              style: { "color": "#ff4757" }
            }, "危险区域"),
            vue.createElementVNode(
              "text",
              { class: "arrow-icon" },
              vue.toDisplayString($setup.activeSections.danger ? "▼" : "▶"),
              1
              /* TEXT */
            )
          ]),
          vue.withDirectives(vue.createElementVNode(
            "view",
            { class: "section-content" },
            [
              vue.createElementVNode("button", {
                class: "clear-btn",
                onClick: $setup.clearHistoryAndReset
              }, "清空聊天记录 & 重置位置/模式/状态")
            ],
            512
            /* NEED_PATCH */
          ), [
            [vue.vShow, $setup.activeSections.danger]
          ])
        ])) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("view", { style: { "height": "150rpx" } })
      ]),
      vue.createElementVNode("view", { class: "bottom-area" }, [
        vue.createElementVNode(
          "button",
          {
            class: "save-btn",
            onClick: $setup.saveCharacter
          },
          vue.toDisplayString($setup.isEditMode ? "保存修改" : "立即创建"),
          1
          /* TEXT */
        )
      ])
    ]);
  }
  const PagesCreateCreate = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__file", "D:/Project/HBuilderProjects/aichat/AiChat/pages/create/create.vue"]]);
  const _sfc_main$3 = {
    __name: "mine",
    setup(__props, { expose: __expose }) {
      __expose();
      const LLM_PROVIDERS = [
        // 1. Gemini: 使用你提供的官方 OpenAI 兼容 Chat 地址作为默认 BaseUrl
        { label: "Google Gemini", value: "gemini", defaultUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
        // 2. 豆包 (火山引擎)
        { label: "火山引擎 (豆包)", value: "volcengine", defaultUrl: "https://ark.cn-beijing.volces.com/api/v3" },
        // 3. 硅基流动
        { label: "硅基流动 (SiliconFlow)", value: "siliconflow", defaultUrl: "https://api.siliconflow.cn/v1" },
        // 4. OpenAI / 自定义
        { label: "OpenAI (自定义)", value: "openai", defaultUrl: "https://api.openai.com/v1" }
      ];
      const DRAWING_STYLES = [
        { label: "标准日漫", value: "anime", emoji: "📺" },
        { label: "厚涂风格", value: "impasto", emoji: "🖌️" },
        { label: "90年代复古", value: "retro", emoji: "📼" },
        { label: "新海诚风", value: "shinkai", emoji: "☁️" },
        { label: "暗黑哥特", value: "gothic", emoji: "🦇" },
        { label: "赛博朋克", value: "cyber", emoji: "🤖" },
        { label: "水彩柔和", value: "pastel", emoji: "🌸" },
        { label: "黑白线稿", value: "sketch", emoji: "✏️" }
      ];
      const userInfo = vue.ref({ name: "我", avatar: "/static/user-avatar.png" });
      const activeSections = vue.ref({ chat: false, image: false, world: false });
      const llmSchemes = vue.ref([]);
      const currentSchemeIndex = vue.ref(0);
      const tempModelList = vue.ref([]);
      const activeFetchIndex = vue.ref(-1);
      const imageConfig = vue.ref({
        provider: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com",
        apiKey: "",
        model: "",
        style: "anime"
      });
      const worldSettings = vue.ref([]);
      const currentLlmScheme = vue.computed(() => {
        if (llmSchemes.value.length === 0)
          return null;
        return llmSchemes.value[currentSchemeIndex.value];
      });
      const imageConfigIndex = vue.computed(() => {
        if (imageConfig.value.provider === "openai")
          return 1;
        if (imageConfig.value.provider === "comfyui")
          return 2;
        return 0;
      });
      const currentProviderLabel = vue.computed(() => {
        if (imageConfig.value.provider === "openai")
          return "OpenAI";
        if (imageConfig.value.provider === "comfyui")
          return "ComfyUI";
        return "Gemini";
      });
      const currentStyleLabel = vue.computed(() => {
        const target = DRAWING_STYLES.find((s) => s.value === imageConfig.value.style);
        return target ? target.label : "标准日漫";
      });
      onShow(() => {
        const storedUser = uni.getStorageSync("app_user_info");
        if (storedUser)
          userInfo.value = storedUser;
        const storedSchemes = uni.getStorageSync("app_llm_schemes");
        const storedIndex = uni.getStorageSync("app_current_scheme_index");
        if (storedSchemes && Array.isArray(storedSchemes) && storedSchemes.length > 0) {
          llmSchemes.value = storedSchemes.map((s) => ({ ...s, isExpanded: false }));
          currentSchemeIndex.value = storedIndex !== void 0 && storedIndex < storedSchemes.length ? storedIndex : 0;
        } else {
          createNewScheme(true);
        }
        const storedImgConfig = uni.getStorageSync("app_image_config");
        if (storedImgConfig)
          imageConfig.value = { ...imageConfig.value, ...storedImgConfig };
        const storedWorlds = uni.getStorageSync("app_world_settings");
        if (storedWorlds && Array.isArray(storedWorlds)) {
          worldSettings.value = storedWorlds.map((w) => ({ ...w, isOpen: false, tempLoc: "", tempJob: "" }));
        }
      });
      const toggleSection = (key) => {
        activeSections.value[key] = !activeSections.value[key];
      };
      const goToEdit = () => {
        uni.navigateTo({ url: "/pages/mine/edit-profile" });
      };
      const goToGallery = () => {
        uni.navigateTo({ url: "/pages/mine/gallery" });
      };
      const createNewScheme = (isInit = false) => {
        const newScheme = {
          id: Date.now(),
          name: isInit ? "默认方案" : `方案 ${llmSchemes.value.length + 1}`,
          provider: "gemini",
          // 默认使用 Gemini 的 OpenAI 兼容地址
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: "",
          model: "",
          historyLimit: 20,
          isExpanded: true
        };
        if (!isInit)
          llmSchemes.value.forEach((s) => s.isExpanded = false);
        llmSchemes.value.push(newScheme);
        if (isInit)
          currentSchemeIndex.value = 0;
      };
      const selectScheme = (index) => {
        currentSchemeIndex.value = index;
      };
      const toggleSchemeExpand = (index) => {
        llmSchemes.value[index].isExpanded = !llmSchemes.value[index].isExpanded;
        tempModelList.value = [];
        activeFetchIndex.value = -1;
      };
      const deleteScheme = (index) => {
        uni.showModal({
          title: "确认删除",
          content: "确定要删除这个API方案吗？",
          success: (res) => {
            if (res.confirm) {
              llmSchemes.value.splice(index, 1);
              if (index === currentSchemeIndex.value || currentSchemeIndex.value >= llmSchemes.value.length) {
                currentSchemeIndex.value = 0;
              }
              if (llmSchemes.value.length === 0)
                createNewScheme(true);
            }
          }
        });
      };
      const handleProviderChange = (e, index) => {
        const selectedIdx = e.detail.value;
        const selected = LLM_PROVIDERS[selectedIdx];
        const scheme = llmSchemes.value[index];
        scheme.provider = selected.value;
        scheme.baseUrl = selected.defaultUrl;
        scheme.model = "";
        tempModelList.value = [];
      };
      const getProviderLabel = (val) => {
        const f = LLM_PROVIDERS.find((p) => p.value === val);
        return f ? f.label : val;
      };
      const fetchModels = (index) => {
        const scheme = llmSchemes.value[index];
        if (!scheme.apiKey) {
          uni.showToast({ title: "请先填写 API Key", icon: "none" });
          return;
        }
        uni.showLoading({ title: "获取中...", mask: true });
        let requestUrl = "";
        let method = "GET";
        let header = { "Authorization": `Bearer ${scheme.apiKey}` };
        if (scheme.provider === "gemini") {
          requestUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${scheme.apiKey}`;
          header = {};
        } else {
          let baseUrl = scheme.baseUrl;
          if (baseUrl.endsWith("/"))
            baseUrl = baseUrl.slice(0, -1);
          requestUrl = `${baseUrl}/models`;
        }
        uni.request({
          url: requestUrl,
          method,
          header,
          success: (res) => {
            var _a, _b;
            uni.hideLoading();
            formatAppLog("log", "at pages/mine/mine.vue:483", "Fetch Models Result:", res);
            let models = [];
            if (scheme.provider === "gemini" && res.data && res.data.models) {
              models = res.data.models.map((m) => {
                return m.name.replace("models/", "");
              });
            } else if (res.data && Array.isArray(res.data.data)) {
              models = res.data.data.map((m) => m.id);
            }
            if (models.length > 0) {
              tempModelList.value = models;
              activeFetchIndex.value = index;
              uni.showToast({ title: `获取到 ${models.length} 个模型`, icon: "success" });
            } else {
              const errMsg = ((_b = (_a = res.data) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || JSON.stringify(res.data);
              uni.showModal({
                title: "获取失败",
                content: `状态码: ${res.statusCode}
响应: ${errMsg}`,
                showCancel: false
              });
            }
          },
          fail: (err) => {
            uni.hideLoading();
            uni.showToast({ title: "网络请求失败", icon: "none" });
            formatAppLog("error", "at pages/mine/mine.vue:516", err);
          }
        });
      };
      const applyModel = (index, modelName) => {
        llmSchemes.value[index].model = modelName;
        tempModelList.value = [];
      };
      const handleTypeChange = (e) => {
        const idx = e.detail.value;
        if (idx == 0) {
          imageConfig.value.provider = "gemini";
          imageConfig.value.baseUrl = "https://generativelanguage.googleapis.com";
        } else if (idx == 1) {
          imageConfig.value.provider = "openai";
          imageConfig.value.baseUrl = "https://api.openai.com/v1";
        } else if (idx == 2) {
          imageConfig.value.provider = "comfyui";
          imageConfig.value.baseUrl = "";
        }
        activeSections.value.image = true;
      };
      const addNewWorld = () => {
        worldSettings.value.push({ id: Date.now(), name: "新世界", locations: [], occupations: [], isOpen: true, tempLoc: "", tempJob: "" });
      };
      const toggleWorldItem = (idx) => {
        worldSettings.value[idx].isOpen = !worldSettings.value[idx].isOpen;
      };
      const deleteWorld = (idx) => {
        uni.showModal({ title: "删除", content: "确定删除吗？", success: (res) => {
          if (res.confirm)
            worldSettings.value.splice(idx, 1);
        } });
      };
      const addLocation = (idx) => {
        const w = worldSettings.value[idx];
        if (w.tempLoc) {
          w.locations.push(w.tempLoc);
          w.tempLoc = "";
        }
      };
      const removeLocation = (wi, li) => {
        worldSettings.value[wi].locations.splice(li, 1);
      };
      const addOccupation = (idx) => {
        const w = worldSettings.value[idx];
        if (w.tempJob) {
          w.occupations.push(w.tempJob);
          w.tempJob = "";
        }
      };
      const removeOccupation = (wi, ji) => {
        worldSettings.value[wi].occupations.splice(ji, 1);
      };
      const saveAllConfig = () => {
        if (llmSchemes.value.length === 0) {
          uni.showToast({ title: "请添加对话方案", icon: "none" });
          return;
        }
        const cleanSchemes = llmSchemes.value.map(({ isExpanded, ...rest }) => {
          let url = rest.baseUrl.trim();
          if (url.endsWith("/"))
            url = url.slice(0, -1);
          return { ...rest, baseUrl: url };
        });
        uni.setStorageSync("app_llm_schemes", cleanSchemes);
        uni.setStorageSync("app_current_scheme_index", currentSchemeIndex.value);
        let imgUrl = imageConfig.value.baseUrl ? imageConfig.value.baseUrl.trim() : "";
        if (imgUrl.endsWith("/"))
          imgUrl = imgUrl.slice(0, -1);
        imageConfig.value.baseUrl = imgUrl;
        uni.setStorageSync("app_image_config", imageConfig.value);
        const cleanWorlds = worldSettings.value.map(({ tempLoc, tempJob, isOpen, ...rest }) => rest);
        uni.setStorageSync("app_world_settings", cleanWorlds);
        uni.showToast({ title: "保存成功", icon: "success" });
        activeSections.value.chat = false;
        activeSections.value.image = false;
        activeSections.value.world = false;
      };
      const __returned__ = { LLM_PROVIDERS, DRAWING_STYLES, userInfo, activeSections, llmSchemes, currentSchemeIndex, tempModelList, activeFetchIndex, imageConfig, worldSettings, currentLlmScheme, imageConfigIndex, currentProviderLabel, currentStyleLabel, toggleSection, goToEdit, goToGallery, createNewScheme, selectScheme, toggleSchemeExpand, deleteScheme, handleProviderChange, getProviderLabel, fetchModels, applyModel, handleTypeChange, addNewWorld, toggleWorldItem, deleteWorld, addLocation, removeLocation, addOccupation, removeOccupation, saveAllConfig, ref: vue.ref, computed: vue.computed, get onShow() {
        return onShow;
      }, CustomTabBar };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "mine-container" }, [
      vue.createElementVNode("view", { class: "user-section" }, [
        vue.createElementVNode("view", {
          class: "avatar-wrapper",
          onClick: $setup.goToEdit
        }, [
          vue.createElementVNode("image", {
            class: "avatar",
            src: $setup.userInfo.avatar,
            mode: "aspectFill"
          }, null, 8, ["src"]),
          vue.createElementVNode("view", { class: "edit-badge" }, "✏️")
        ]),
        vue.createElementVNode("view", {
          class: "info-wrapper",
          onClick: $setup.goToEdit
        }, [
          vue.createElementVNode("text", { class: "label" }, "我的昵称"),
          vue.createElementVNode("view", { class: "name-display" }, [
            vue.createTextVNode(
              vue.toDisplayString($setup.userInfo.name) + " ",
              1
              /* TEXT */
            ),
            vue.createElementVNode("text", { class: "edit-hint" }, "(点击编辑资料)")
          ])
        ]),
        vue.createElementVNode("view", {
          class: "gallery-btn",
          onClick: $setup.goToGallery
        }, [
          vue.createElementVNode("text", { class: "gallery-icon" }, "🖼️"),
          vue.createElementVNode("text", { class: "gallery-text" }, "我的相册")
        ])
      ]),
      vue.createElementVNode("view", { class: "setting-group" }, [
        vue.createElementVNode("view", {
          class: "group-header",
          onClick: _cache[0] || (_cache[0] = ($event) => $setup.toggleSection("chat"))
        }, [
          vue.createElementVNode("view", { class: "group-title-wrapper" }, [
            vue.createElementVNode("view", { class: "group-title" }, "对话模型 (LLM)"),
            vue.createElementVNode(
              "text",
              { class: "group-subtitle" },
              " 当前使用: " + vue.toDisplayString($setup.currentLlmScheme ? $setup.currentLlmScheme.name : "未选择"),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode(
            "text",
            { class: "arrow-icon" },
            vue.toDisplayString($setup.activeSections.chat ? "▼" : "▶"),
            1
            /* TEXT */
          )
        ]),
        vue.withDirectives(vue.createElementVNode(
          "view",
          { class: "group-content" },
          [
            vue.createElementVNode("view", { class: "scheme-list" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.llmSchemes, (scheme, index) => {
                  return vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: scheme.id,
                      class: vue.normalizeClass(["scheme-card", { "is-active": $setup.currentSchemeIndex === index }])
                    },
                    [
                      vue.createElementVNode("view", {
                        class: "scheme-card-header",
                        onClick: ($event) => $setup.toggleSchemeExpand(index)
                      }, [
                        vue.createElementVNode("view", {
                          class: "radio-area",
                          onClick: vue.withModifiers(($event) => $setup.selectScheme(index), ["stop"])
                        }, [
                          vue.createElementVNode("view", { class: "radio-circle" }, [
                            $setup.currentSchemeIndex === index ? (vue.openBlock(), vue.createElementBlock("view", {
                              key: 0,
                              class: "radio-inner"
                            })) : vue.createCommentVNode("v-if", true)
                          ])
                        ], 8, ["onClick"]),
                        vue.createElementVNode("view", { class: "scheme-info" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "scheme-name" },
                            vue.toDisplayString(scheme.name),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "scheme-desc" },
                            vue.toDisplayString(scheme.model || "未设置模型"),
                            1
                            /* TEXT */
                          )
                        ]),
                        vue.createElementVNode(
                          "text",
                          { class: "expand-icon" },
                          vue.toDisplayString(scheme.isExpanded ? "▲" : "▼"),
                          1
                          /* TEXT */
                        )
                      ], 8, ["onClick"]),
                      scheme.isExpanded ? (vue.openBlock(), vue.createElementBlock("view", {
                        key: 0,
                        class: "scheme-card-body"
                      }, [
                        vue.createElementVNode("view", { class: "setting-item" }, [
                          vue.createElementVNode("view", { class: "item-label" }, "方案名称"),
                          vue.withDirectives(vue.createElementVNode("input", {
                            class: "item-input",
                            type: "text",
                            "onUpdate:modelValue": ($event) => scheme.name = $event,
                            placeholder: "方案别名"
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [vue.vModelText, scheme.name]
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "setting-item" }, [
                          vue.createElementVNode("view", { class: "item-label" }, "厂商预设"),
                          vue.createElementVNode("picker", {
                            mode: "selector",
                            range: $setup.LLM_PROVIDERS,
                            "range-key": "label",
                            onChange: (e) => $setup.handleProviderChange(e, index)
                          }, [
                            vue.createElementVNode(
                              "view",
                              { class: "picker-val" },
                              vue.toDisplayString($setup.getProviderLabel(scheme.provider)) + " ▾",
                              1
                              /* TEXT */
                            )
                          ], 40, ["onChange"])
                        ]),
                        vue.createElementVNode("view", { class: "setting-item" }, [
                          vue.createElementVNode("view", { class: "item-label" }, "接口地址"),
                          vue.withDirectives(vue.createElementVNode("input", {
                            class: "item-input",
                            type: "text",
                            "onUpdate:modelValue": ($event) => scheme.baseUrl = $event,
                            placeholder: "https://..."
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [vue.vModelText, scheme.baseUrl]
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "setting-item" }, [
                          vue.createElementVNode("view", { class: "item-label" }, "API Key"),
                          vue.withDirectives(vue.createElementVNode("input", {
                            class: "item-input",
                            type: "text",
                            password: "",
                            "onUpdate:modelValue": ($event) => scheme.apiKey = $event,
                            placeholder: "在此粘贴 Key"
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [vue.vModelText, scheme.apiKey]
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "setting-item" }, [
                          vue.createElementVNode("view", { class: "item-label" }, "模型名称"),
                          vue.createElementVNode("view", { class: "model-input-group" }, [
                            vue.withDirectives(vue.createElementVNode("input", {
                              class: "item-input model-manual-input",
                              type: "text",
                              "onUpdate:modelValue": ($event) => scheme.model = $event,
                              placeholder: "输入或刷新获取"
                            }, null, 8, ["onUpdate:modelValue"]), [
                              [vue.vModelText, scheme.model]
                            ]),
                            vue.createElementVNode("view", {
                              class: "icon-btn",
                              onClick: ($event) => $setup.fetchModels(index)
                            }, "🔄", 8, ["onClick"])
                          ])
                        ]),
                        $setup.tempModelList.length > 0 && $setup.activeFetchIndex === index ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "model-select-area"
                        }, [
                          vue.createElementVNode("view", { class: "model-tag-title" }, "点击选择模型:"),
                          vue.createElementVNode("view", { class: "model-tags" }, [
                            (vue.openBlock(true), vue.createElementBlock(
                              vue.Fragment,
                              null,
                              vue.renderList($setup.tempModelList, (m) => {
                                return vue.openBlock(), vue.createElementBlock("view", {
                                  key: m,
                                  class: "model-tag",
                                  onClick: ($event) => $setup.applyModel(index, m)
                                }, vue.toDisplayString(m), 9, ["onClick"]);
                              }),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ])) : vue.createCommentVNode("v-if", true),
                        vue.createElementVNode("view", { class: "setting-item-col" }, [
                          vue.createElementVNode("view", { class: "item-header" }, [
                            vue.createElementVNode("text", { class: "item-label" }, "记忆深度"),
                            vue.createElementVNode(
                              "text",
                              { class: "item-value" },
                              vue.toDisplayString(scheme.historyLimit) + " 条",
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("slider", {
                            value: scheme.historyLimit,
                            min: "0",
                            max: "60",
                            step: "2",
                            activeColor: "#007aff",
                            onChange: (e) => scheme.historyLimit = e.detail.value
                          }, null, 40, ["value", "onChange"])
                        ]),
                        vue.createElementVNode("view", { class: "card-footer" }, [
                          $setup.llmSchemes.length > 1 ? (vue.openBlock(), vue.createElementBlock("view", {
                            key: 0,
                            class: "delete-text",
                            onClick: ($event) => $setup.deleteScheme(index)
                          }, "删除此方案", 8, ["onClick"])) : vue.createCommentVNode("v-if", true)
                        ])
                      ])) : vue.createCommentVNode("v-if", true)
                    ],
                    2
                    /* CLASS */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("button", {
              class: "add-scheme-btn",
              onClick: $setup.createNewScheme
            }, "➕ 添加新方案 API")
          ],
          512
          /* NEED_PATCH */
        ), [
          [vue.vShow, $setup.activeSections.chat]
        ])
      ]),
      vue.createElementVNode("view", { class: "setting-group" }, [
        vue.createElementVNode("view", {
          class: "group-header",
          onClick: _cache[1] || (_cache[1] = ($event) => $setup.toggleSection("image"))
        }, [
          vue.createElementVNode("view", { class: "group-title-wrapper" }, [
            vue.createElementVNode("view", {
              class: "group-title",
              style: { "color": "#ff9f43" }
            }, "绘图设置 (Image Gen)"),
            vue.createElementVNode(
              "text",
              { class: "group-subtitle" },
              vue.toDisplayString($setup.currentProviderLabel) + " / " + vue.toDisplayString($setup.currentStyleLabel),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode(
            "text",
            { class: "arrow-icon" },
            vue.toDisplayString($setup.activeSections.image ? "▼" : "▶"),
            1
            /* TEXT */
          )
        ]),
        vue.withDirectives(vue.createElementVNode(
          "view",
          { class: "group-content" },
          [
            vue.createElementVNode("view", { class: "setting-item" }, [
              vue.createElementVNode("view", { class: "item-label" }, "接口类型"),
              vue.createElementVNode("picker", {
                mode: "selector",
                range: ["Google Gemini", "OpenAI", "自建 ComfyUI (Cloudflare)"],
                value: $setup.imageConfigIndex,
                onChange: $setup.handleTypeChange
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-val" },
                  vue.toDisplayString($setup.currentProviderLabel) + " ▾",
                  1
                  /* TEXT */
                )
              ], 40, ["range", "value"])
            ]),
            $setup.imageConfig.provider === "gemini" ? (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 0 },
              [
                vue.createElementVNode("view", { class: "setting-tip" }, "Key 留空则自动使用上方对话 Key。"),
                vue.createElementVNode("view", { class: "setting-item" }, [
                  vue.createElementVNode("view", { class: "item-label" }, "接口地址"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "item-input",
                      type: "text",
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.imageConfig.baseUrl = $event),
                      placeholder: "https://generativelanguage.googleapis.com"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $setup.imageConfig.baseUrl]
                  ])
                ]),
                vue.createElementVNode("view", { class: "setting-item" }, [
                  vue.createElementVNode("view", { class: "item-label" }, "画图 Key"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "item-input",
                      type: "text",
                      password: "",
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.imageConfig.apiKey = $event),
                      placeholder: "同上则留空"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $setup.imageConfig.apiKey]
                  ])
                ]),
                vue.createElementVNode("view", { class: "setting-item" }, [
                  vue.createElementVNode("view", { class: "item-label" }, "模型名称"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "item-input",
                      type: "text",
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.imageConfig.model = $event),
                      placeholder: "例如 gemini-2.0-flash-exp"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $setup.imageConfig.model]
                  ])
                ])
              ],
              64
              /* STABLE_FRAGMENT */
            )) : $setup.imageConfig.provider === "openai" ? (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 1 },
              [
                vue.createElementVNode("view", { class: "setting-item" }, [
                  vue.createElementVNode("view", { class: "item-label" }, "接口地址"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "item-input",
                      type: "text",
                      "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.imageConfig.baseUrl = $event),
                      placeholder: "https://api.openai.com/v1"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $setup.imageConfig.baseUrl]
                  ])
                ]),
                vue.createElementVNode("view", { class: "setting-item" }, [
                  vue.createElementVNode("view", { class: "item-label" }, "API Key"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "item-input",
                      type: "text",
                      password: "",
                      "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.imageConfig.apiKey = $event),
                      placeholder: "sk-..."
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $setup.imageConfig.apiKey]
                  ])
                ]),
                vue.createElementVNode("view", { class: "setting-item" }, [
                  vue.createElementVNode("view", { class: "item-label" }, "模型名称"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "item-input",
                      type: "text",
                      "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.imageConfig.model = $event),
                      placeholder: "例如 dall-e-3"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $setup.imageConfig.model]
                  ])
                ])
              ],
              64
              /* STABLE_FRAGMENT */
            )) : $setup.imageConfig.provider === "comfyui" ? (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 2 },
              [
                vue.createElementVNode("view", { class: "setting-tip" }, "填写 Cloudflare Tunnel 公网地址。"),
                vue.createElementVNode("view", { class: "setting-item" }, [
                  vue.createElementVNode("view", { class: "item-label" }, "公网地址"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "item-input",
                      type: "text",
                      "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.imageConfig.baseUrl = $event),
                      placeholder: "https://..."
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, $setup.imageConfig.baseUrl]
                  ])
                ])
              ],
              64
              /* STABLE_FRAGMENT */
            )) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("view", { class: "sub-section-title" }, "🎨 画风选择 (Style)"),
            vue.createElementVNode("view", { class: "style-grid" }, [
              (vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($setup.DRAWING_STYLES, (style, index) => {
                  return vue.createElementVNode("view", {
                    class: vue.normalizeClass(["style-card", { "active": $setup.imageConfig.style === style.value }]),
                    key: index,
                    onClick: ($event) => $setup.imageConfig.style = style.value
                  }, [
                    vue.createElementVNode(
                      "text",
                      { class: "style-emoji" },
                      vue.toDisplayString(style.emoji),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "text",
                      { class: "style-name" },
                      vue.toDisplayString(style.label),
                      1
                      /* TEXT */
                    )
                  ], 10, ["onClick"]);
                }),
                64
                /* STABLE_FRAGMENT */
              ))
            ])
          ],
          512
          /* NEED_PATCH */
        ), [
          [vue.vShow, $setup.activeSections.image]
        ])
      ]),
      vue.createElementVNode("view", { class: "setting-group" }, [
        vue.createElementVNode("view", {
          class: "group-header",
          onClick: _cache[9] || (_cache[9] = ($event) => $setup.toggleSection("world"))
        }, [
          vue.createElementVNode("view", { class: "group-title-wrapper" }, [
            vue.createElementVNode("view", {
              class: "group-title",
              style: { "color": "#9c27b0" }
            }, "世界观设定 (World)"),
            vue.createElementVNode(
              "text",
              { class: "group-subtitle" },
              "已创建 " + vue.toDisplayString($setup.worldSettings.length) + " 个世界",
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode(
            "text",
            { class: "arrow-icon" },
            vue.toDisplayString($setup.activeSections.world ? "▼" : "▶"),
            1
            /* TEXT */
          )
        ]),
        vue.withDirectives(vue.createElementVNode(
          "view",
          { class: "group-content" },
          [
            vue.createElementVNode("view", { class: "setting-tip" }, "在此预设世界观，创建角色时可直接调用场景和职业。"),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($setup.worldSettings, (world, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: world.id,
                  class: "world-card"
                }, [
                  vue.createElementVNode("view", {
                    class: "world-header",
                    onClick: vue.withModifiers(($event) => $setup.toggleWorldItem(index), ["stop"])
                  }, [
                    vue.createElementVNode(
                      "text",
                      { class: "world-name" },
                      vue.toDisplayString(world.name || "未命名世界"),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("view", { class: "world-actions" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "toggle-icon" },
                        vue.toDisplayString(world.isOpen ? "收起" : "展开"),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("text", {
                        class: "delete-icon",
                        onClick: vue.withModifiers(($event) => $setup.deleteWorld(index), ["stop"])
                      }, "🗑️", 8, ["onClick"])
                    ])
                  ], 8, ["onClick"]),
                  vue.withDirectives(vue.createElementVNode(
                    "view",
                    { class: "world-body" },
                    [
                      vue.createElementVNode("view", { class: "setting-item" }, [
                        vue.createElementVNode("view", { class: "item-label" }, "世界名称"),
                        vue.withDirectives(vue.createElementVNode("input", {
                          class: "item-input",
                          type: "text",
                          "onUpdate:modelValue": ($event) => world.name = $event,
                          placeholder: "例如：赛博朋克2077"
                        }, null, 8, ["onUpdate:modelValue"]), [
                          [vue.vModelText, world.name]
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "sub-section" }, [
                        vue.createElementVNode("view", { class: "sub-title" }, "📍 场景/地点"),
                        vue.createElementVNode("view", { class: "tag-container" }, [
                          (vue.openBlock(true), vue.createElementBlock(
                            vue.Fragment,
                            null,
                            vue.renderList(world.locations, (loc, locIdx) => {
                              return vue.openBlock(), vue.createElementBlock("view", {
                                key: locIdx,
                                class: "tag-item"
                              }, [
                                vue.createTextVNode(
                                  vue.toDisplayString(loc) + " ",
                                  1
                                  /* TEXT */
                                ),
                                vue.createElementVNode("text", {
                                  class: "tag-close",
                                  onClick: ($event) => $setup.removeLocation(index, locIdx)
                                }, "×", 8, ["onClick"])
                              ]);
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        vue.createElementVNode("view", { class: "add-row" }, [
                          vue.withDirectives(vue.createElementVNode("input", {
                            class: "mini-input",
                            "onUpdate:modelValue": ($event) => world.tempLoc = $event,
                            placeholder: "输入地点"
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [vue.vModelText, world.tempLoc]
                          ]),
                          vue.createElementVNode("view", {
                            class: "mini-btn",
                            onClick: ($event) => $setup.addLocation(index)
                          }, "添加", 8, ["onClick"])
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "sub-section" }, [
                        vue.createElementVNode("view", { class: "sub-title" }, "💼 职业/身份"),
                        vue.createElementVNode("view", { class: "tag-container" }, [
                          (vue.openBlock(true), vue.createElementBlock(
                            vue.Fragment,
                            null,
                            vue.renderList(world.occupations, (job, jobIdx) => {
                              return vue.openBlock(), vue.createElementBlock("view", {
                                key: jobIdx,
                                class: "tag-item job-tag"
                              }, [
                                vue.createTextVNode(
                                  vue.toDisplayString(job) + " ",
                                  1
                                  /* TEXT */
                                ),
                                vue.createElementVNode("text", {
                                  class: "tag-close",
                                  onClick: ($event) => $setup.removeOccupation(index, jobIdx)
                                }, "×", 8, ["onClick"])
                              ]);
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        vue.createElementVNode("view", { class: "add-row" }, [
                          vue.withDirectives(vue.createElementVNode("input", {
                            class: "mini-input",
                            "onUpdate:modelValue": ($event) => world.tempJob = $event,
                            placeholder: "输入职业"
                          }, null, 8, ["onUpdate:modelValue"]), [
                            [vue.vModelText, world.tempJob]
                          ]),
                          vue.createElementVNode("view", {
                            class: "mini-btn",
                            onClick: ($event) => $setup.addOccupation(index)
                          }, "添加", 8, ["onClick"])
                        ])
                      ])
                    ],
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vShow, world.isOpen]
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            vue.createElementVNode("button", {
              class: "add-world-btn",
              onClick: $setup.addNewWorld
            }, "+ 新建世界观")
          ],
          512
          /* NEED_PATCH */
        ), [
          [vue.vShow, $setup.activeSections.world]
        ])
      ]),
      vue.createElementVNode("view", { class: "action-area" }, [
        vue.createElementVNode("button", {
          class: "save-btn",
          onClick: $setup.saveAllConfig
        }, "保存所有配置")
      ]),
      vue.createVNode($setup["CustomTabBar"], { current: 1 })
    ]);
  }
  const PagesMineMine = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__file", "D:/Project/HBuilderProjects/aichat/AiChat/pages/mine/mine.vue"]]);
  const _sfc_main$2 = {
    __name: "edit-profile",
    setup(__props, { expose: __expose }) {
      __expose();
      const form = vue.ref({
        name: "",
        avatar: "",
        appearance: ""
      });
      const isGenerating = vue.ref(false);
      const COMFY_AVATAR_TEMPLATE = {
        "3": { "inputs": { "text": "", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
        // 负面词：去油腻
        "4": { "inputs": { "text": "3d, realistic, photorealistic, oily skin, shiny skin, bad quality, low quality, worst quality", "clip": ["2", 0] }, "class_type": "CLIPTextEncode" },
        "5": { "inputs": { "seed": 0, "steps": 25, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["36", 0] }, "class_type": "KSampler" },
        "1": { "inputs": { "ckpt_name": "waiNSFWIllustrious_v140.safetensors" }, "class_type": "CheckpointLoaderSimple" },
        "2": { "inputs": { "stop_at_clip_layer": -2, "clip": ["1", 1] }, "class_type": "CLIPSetLastLayer" },
        "9": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
        "16": { "inputs": { "filename_prefix": "Avatar_Gen", "images": ["9", 0] }, "class_type": "SaveImage" },
        "36": { "inputs": { "width": 768, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" }
      };
      onLoad(() => {
        const user = uni.getStorageSync("app_user_info");
        if (user) {
          form.value = { ...user };
          if (!form.value.appearance)
            form.value.appearance = "";
        }
      });
      const chooseImage = () => {
        uni.chooseImage({
          count: 1,
          success: async (res) => {
            const tempPath = res.tempFilePaths[0];
            const savedPath = await saveToGallery(tempPath, "user_profile", "我的头像", "手动上传");
            form.value.avatar = savedPath;
          }
        });
      };
      const generateAvatar = async () => {
        if (!form.value.appearance.trim()) {
          return uni.showToast({ title: "请先填写外貌描写", icon: "none" });
        }
        const imgConfig = uni.getStorageSync("app_image_config");
        if (!imgConfig)
          return uni.showToast({ title: '请先在"我的"页面配置绘图设置', icon: "none" });
        isGenerating.value = true;
        const baseStyle = "best quality, masterpiece, anime style, japanese anime, cel shading, matte skin, flat color, solo, face focus, headshot, looking at viewer";
        const finalPrompt = `${baseStyle}, ${form.value.appearance}`;
        try {
          let imageUrl = null;
          if (imgConfig.provider === "comfyui") {
            if (!imgConfig.baseUrl)
              throw new Error("ComfyUI 地址未配置");
            imageUrl = await generateComfyAvatar(finalPrompt, imgConfig.baseUrl);
          } else if (imgConfig.provider === "gemini") {
            imageUrl = await generateGeminiAvatar(finalPrompt, imgConfig.baseUrl, imgConfig.apiKey, imgConfig.model);
          } else if (imgConfig.provider === "openai") {
            imageUrl = await generateOpenAIAvatar(finalPrompt, imgConfig.baseUrl, imgConfig.apiKey, imgConfig.model);
          }
          if (imageUrl) {
            const savedPath = await saveToGallery(imageUrl, "user_profile", "我的头像", finalPrompt);
            form.value.avatar = savedPath;
            uni.showToast({ title: "生成成功并保存", icon: "success" });
          }
        } catch (e) {
          formatAppLog("error", "at pages/mine/edit-profile.vue:133", e);
          uni.showModal({ title: "生成失败", content: e.message || "请检查配置或网络", showCancel: false });
        } finally {
          isGenerating.value = false;
        }
      };
      const generateComfyAvatar = async (promptText, baseUrl) => {
        const workflow = JSON.parse(JSON.stringify(COMFY_AVATAR_TEMPLATE));
        workflow["3"].inputs.text = promptText;
        workflow["5"].inputs.seed = Math.floor(Math.random() * 999999999999);
        const queueRes = await uni.request({
          url: `${baseUrl}/prompt`,
          method: "POST",
          data: { prompt: workflow },
          sslVerify: false
        });
        if (queueRes.statusCode !== 200)
          throw new Error("ComfyUI 队列请求失败");
        const promptId = queueRes.data.prompt_id;
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 1e3));
          const historyRes = await uni.request({
            url: `${baseUrl}/history/${promptId}`,
            method: "GET",
            sslVerify: false
          });
          if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
            const outputs = historyRes.data[promptId].outputs;
            if (outputs && outputs["16"]) {
              const img = outputs["16"].images[0];
              return `${baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
            }
          }
        }
        throw new Error("生成超时");
      };
      const generateGeminiAvatar = async (prompt, baseUrl, apiKey, model) => {
        var _a, _b, _c, _d, _e, _f;
        if (!apiKey) {
          const chatConfig = uni.getStorageSync("app_api_config");
          apiKey = chatConfig == null ? void 0 : chatConfig.apiKey;
        }
        if (!apiKey)
          throw new Error("缺少 API Key");
        const res = await uni.request({
          url: `${baseUrl}/v1beta/models/${model || "gemini-2.0-flash-exp"}:generateContent?key=${apiKey}`,
          method: "POST",
          data: { contents: [{ parts: [{ text: prompt }] }] },
          sslVerify: false
        });
        const inlineData = (_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e.find((p) => p.inline_data)) == null ? void 0 : _f.inline_data;
        if (inlineData)
          return `data:${inlineData.mime_type};base64,${inlineData.data}`;
        throw new Error("Gemini 未返回图片数据");
      };
      const generateOpenAIAvatar = async (prompt, baseUrl, apiKey, model) => {
        var _a, _b, _c;
        const res = await uni.request({
          url: `${baseUrl}/images/generations`,
          method: "POST",
          header: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          data: { model: model || "dall-e-3", prompt, n: 1, size: "1024x1024" },
          sslVerify: false
        });
        if ((_c = (_b = (_a = res.data) == null ? void 0 : _a.data) == null ? void 0 : _b[0]) == null ? void 0 : _c.url)
          return res.data.data[0].url;
        throw new Error("OpenAI 生成失败");
      };
      const saveProfile = () => {
        if (!form.value.name.trim())
          return uni.showToast({ title: "昵称不能为空", icon: "none" });
        uni.setStorageSync("app_user_info", form.value);
        uni.showToast({ title: "保存成功", icon: "success" });
        setTimeout(() => {
          uni.navigateBack();
        }, 1e3);
      };
      const __returned__ = { form, isGenerating, COMFY_AVATAR_TEMPLATE, chooseImage, generateAvatar, generateComfyAvatar, generateGeminiAvatar, generateOpenAIAvatar, saveProfile, ref: vue.ref, get onLoad() {
        return onLoad;
      }, get saveToGallery() {
        return saveToGallery;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "edit-container" }, [
      vue.createElementVNode("view", { class: "avatar-section" }, [
        vue.createElementVNode("view", { class: "avatar-box" }, [
          vue.createElementVNode("image", {
            class: "avatar-preview",
            src: $setup.form.avatar || "/static/user-avatar.png",
            mode: "aspectFill",
            onClick: $setup.chooseImage
          }, null, 8, ["src"]),
          $setup.isGenerating ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "generating-mask"
          }, [
            vue.createElementVNode("text", { class: "loading-icon" }, "🎨"),
            vue.createElementVNode("text", null, "绘制中...")
          ])) : vue.createCommentVNode("v-if", true)
        ]),
        vue.createElementVNode("view", { class: "avatar-tips" }, "点击图片上传，或使用下方 AI 生成")
      ]),
      vue.createElementVNode("view", { class: "form-group" }, [
        vue.createElementVNode("view", { class: "form-item" }, [
          vue.createElementVNode("text", { class: "label" }, "我的昵称"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.form.name = $event),
              placeholder: "起个好听的名字"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.name]
          ])
        ]),
        vue.createElementVNode("view", { class: "form-item column" }, [
          vue.createElementVNode("view", { class: "label-row" }, [
            vue.createElementVNode("text", { class: "label" }, "外貌描写 (用于生成头像)"),
            vue.createElementVNode("view", { class: "ai-tag" }, "AI")
          ]),
          vue.withDirectives(vue.createElementVNode(
            "textarea",
            {
              class: "textarea",
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.form.appearance = $event),
              placeholder: "例如：黑发少年，金色眼睛，戴着眼镜，穿着连帽衫，温柔的微笑...",
              maxlength: "200"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $setup.form.appearance]
          ]),
          vue.createElementVNode("button", {
            class: "gen-btn",
            "hover-class": "btn-hover",
            onClick: $setup.generateAvatar,
            disabled: $setup.isGenerating
          }, vue.toDisplayString($setup.isGenerating ? "正在请求云端绘图..." : "✨ 根据外貌生成二次元头像"), 9, ["disabled"])
        ])
      ]),
      vue.createElementVNode("view", { class: "action-area" }, [
        vue.createElementVNode("button", {
          class: "save-btn",
          onClick: $setup.saveProfile
        }, "保存修改")
      ])
    ]);
  }
  const PagesMineEditProfile = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__file", "D:/Project/HBuilderProjects/aichat/AiChat/pages/mine/edit-profile.vue"]]);
  const _sfc_main$1 = {
    __name: "gallery",
    setup(__props, { expose: __expose }) {
      __expose();
      const galleryData = vue.ref({});
      const isSelectMode = vue.ref(false);
      const selectedSet = vue.ref(/* @__PURE__ */ new Set());
      onShow(() => {
        refreshData();
        isSelectMode.value = false;
        selectedSet.value.clear();
      });
      const refreshData = () => {
        galleryData.value = getGalleryData();
      };
      const selectedCount = vue.computed(() => selectedSet.value.size);
      const isSelected = (roleId, index) => {
        return selectedSet.value.has(`${roleId}-${index}`);
      };
      const handleLongPress = (roleId, index) => {
        if (isSelectMode.value)
          return;
        uni.vibrateShort();
        isSelectMode.value = true;
        selectedSet.value.add(`${roleId}-${index}`);
      };
      const handleItemClick = (roleId, index) => {
        if (isSelectMode.value) {
          const key = `${roleId}-${index}`;
          if (selectedSet.value.has(key)) {
            selectedSet.value.delete(key);
          } else {
            selectedSet.value.add(key);
          }
        } else {
          previewImg(galleryData.value[roleId].images, index);
        }
      };
      const exitSelectMode = () => {
        isSelectMode.value = false;
        selectedSet.value.clear();
      };
      const previewImg = (images, index) => {
        const urls = images.map((i) => i.path);
        uni.previewImage({
          urls,
          current: index
        });
      };
      const saveSelectedImages = async () => {
        if (selectedCount.value === 0)
          return;
        uni.showLoading({ title: "保存中...", mask: true });
        let successCount = 0;
        let failCount = 0;
        const pathsToSave = [];
        selectedSet.value.forEach((key) => {
          const [roleId, idxStr] = key.split("-");
          const idx = parseInt(idxStr);
          const roleData = galleryData.value[roleId];
          if (roleData && roleData.images && roleData.images[idx]) {
            pathsToSave.push(roleData.images[idx].path);
          }
        });
        for (const path of pathsToSave) {
          try {
            await new Promise((resolve) => {
              uni.saveImageToPhotosAlbum({
                filePath: path,
                success: () => {
                  successCount++;
                  resolve();
                },
                fail: (err) => {
                  formatAppLog("log", "at pages/mine/gallery.vue:161", "保存失败:", err);
                  failCount++;
                  resolve();
                }
              });
            });
          } catch (e) {
            failCount++;
          }
        }
        uni.hideLoading();
        if (failCount > 0) {
          uni.showToast({ title: `成功${successCount}张，失败${failCount}张`, icon: "none" });
        } else {
          uni.showToast({ title: "已全部保存", icon: "success" });
        }
        exitSelectMode();
      };
      const deleteSelectedImages = () => {
        if (selectedCount.value === 0)
          return;
        uni.showModal({
          title: "批量删除",
          content: `确定要删除这 ${selectedCount.value} 张照片吗？
(删除后无法恢复)`,
          confirmColor: "#ff4757",
          success: (res) => {
            if (res.confirm) {
              performBatchDelete();
            }
          }
        });
      };
      const performBatchDelete = () => {
        uni.showLoading({ title: "删除中..." });
        try {
          const deleteMap = {};
          selectedSet.value.forEach((key) => {
            const [roleId, idxStr] = key.split("-");
            const idx = parseInt(idxStr);
            if (!deleteMap[roleId])
              deleteMap[roleId] = [];
            deleteMap[roleId].push(idx);
          });
          for (const roleId in deleteMap) {
            const indices = deleteMap[roleId];
            indices.sort((a, b) => b - a);
            const roleData = galleryData.value[roleId];
            if (roleData && roleData.images) {
              indices.forEach((idx) => {
                const path = roleData.images[idx].path;
                uni.removeSavedFile({
                  filePath: path,
                  fail: (e) => formatAppLog("log", "at pages/mine/gallery.vue:228", "物理文件可能已丢失 (清理残留)", e)
                });
                roleData.images.splice(idx, 1);
              });
            }
          }
          uni.setStorageSync("gallery_save_data", galleryData.value);
          uni.setStorageSync("app_gallery_data", galleryData.value);
          uni.showToast({ title: "删除成功", icon: "success" });
          exitSelectMode();
        } catch (e) {
          formatAppLog("error", "at pages/mine/gallery.vue:247", e);
          uni.showToast({ title: "删除出错", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      };
      const __returned__ = { galleryData, isSelectMode, selectedSet, refreshData, selectedCount, isSelected, handleLongPress, handleItemClick, exitSelectMode, previewImg, saveSelectedImages, deleteSelectedImages, performBatchDelete, ref: vue.ref, computed: vue.computed, get onShow() {
        return onShow;
      }, get getGalleryData() {
        return getGalleryData;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "gallery-container" }, [
      $setup.isSelectMode ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "nav-header"
      }, [
        vue.createElementVNode(
          "text",
          { class: "nav-title" },
          "已选择 " + vue.toDisplayString($setup.selectedCount) + " 张",
          1
          /* TEXT */
        ),
        vue.createElementVNode("text", {
          class: "nav-btn",
          onClick: $setup.exitSelectMode
        }, "取消")
      ])) : vue.createCommentVNode("v-if", true),
      $setup.isSelectMode ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "nav-header-placeholder"
      })) : vue.createCommentVNode("v-if", true),
      !$setup.galleryData || Object.keys($setup.galleryData).length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 2,
        class: "empty-state"
      }, [
        vue.createElementVNode("text", { class: "empty-icon" }, "🖼️"),
        vue.createElementVNode("text", null, "暂无图片，快去聊天生图吧")
      ])) : vue.createCommentVNode("v-if", true),
      (vue.openBlock(true), vue.createElementBlock(
        vue.Fragment,
        null,
        vue.renderList($setup.galleryData, (item, roleId) => {
          return vue.openBlock(), vue.createElementBlock("view", {
            key: roleId,
            class: "role-section"
          }, [
            item.images && item.images.length > 0 ? (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              { key: 0 },
              [
                vue.createElementVNode("view", { class: "role-header" }, [
                  vue.createElementVNode(
                    "view",
                    { class: "role-title" },
                    vue.toDisplayString(item.name),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "view",
                    { class: "role-count" },
                    vue.toDisplayString(item.images.length) + " 张",
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "grid-layout" }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(item.images, (img, index) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: index,
                        class: "grid-item",
                        onClick: ($event) => $setup.handleItemClick(roleId, index),
                        onLongpress: ($event) => $setup.handleLongPress(roleId, index)
                      }, [
                        vue.createElementVNode("image", {
                          src: img.path,
                          mode: "aspectFill",
                          class: "grid-img"
                        }, null, 8, ["src"]),
                        $setup.isSelectMode ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "overlay"
                        }, [
                          vue.createElementVNode(
                            "view",
                            {
                              class: vue.normalizeClass(["check-circle", { "checked": $setup.isSelected(roleId, index) }])
                            },
                            [
                              $setup.isSelected(roleId, index) ? (vue.openBlock(), vue.createElementBlock("text", {
                                key: 0,
                                class: "check-icon"
                              }, "✓")) : vue.createCommentVNode("v-if", true)
                            ],
                            2
                            /* CLASS */
                          )
                        ])) : vue.createCommentVNode("v-if", true)
                      ], 40, ["onClick", "onLongpress"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ],
              64
              /* STABLE_FRAGMENT */
            )) : vue.createCommentVNode("v-if", true)
          ]);
        }),
        128
        /* KEYED_FRAGMENT */
      )),
      $setup.isSelectMode ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 3,
        style: { "height": "120rpx" }
      })) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode(
        "view",
        {
          class: vue.normalizeClass(["bottom-bar", { "show": $setup.isSelectMode }])
        },
        [
          vue.createElementVNode("view", {
            class: "action-btn save-btn",
            onClick: $setup.saveSelectedImages
          }, [
            vue.createElementVNode(
              "text",
              null,
              "⬇️ 保存 (" + vue.toDisplayString($setup.selectedCount) + ")",
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", {
            class: "action-btn delete-btn",
            onClick: $setup.deleteSelectedImages
          }, [
            vue.createElementVNode(
              "text",
              null,
              "🗑️ 删除 (" + vue.toDisplayString($setup.selectedCount) + ")",
              1
              /* TEXT */
            )
          ])
        ],
        2
        /* CLASS */
      )
    ]);
  }
  const PagesMineGallery = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "D:/Project/HBuilderProjects/aichat/AiChat/pages/mine/gallery.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/chat/chat", PagesChatChat);
  __definePage("pages/create/create", PagesCreateCreate);
  __definePage("pages/mine/mine", PagesMineMine);
  __definePage("pages/mine/edit-profile", PagesMineEditProfile);
  __definePage("pages/mine/gallery", PagesMineGallery);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
      plus.push.addEventListener("click", function(msg) {
        if (msg.payload) {
          try {
            let data = msg.payload;
            if (typeof data === "string") {
              data = JSON.parse(data);
            }
            if (data.id) {
              formatAppLog("log", "at App.vue:19", "🔔 [System] Notification clicked, jumping to chat:", data.id);
              uni.navigateTo({
                url: `/pages/chat/chat?id=${data.id}`
              });
            }
          } catch (e) {
            formatAppLog("error", "at App.vue:26", "Notification payload parse error:", e);
          }
        }
      }, false);
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:33", "App Show");
      plus.push.clear();
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:40", "App Hide - Scheduling Notifications for ALL characters");
      this.scheduleAllNotifications();
    },
    methods: {
      scheduleAllNotifications() {
        formatAppLog("log", "at App.vue:46", "🔔 [System] Scheduling notifications with staggering...");
        plus.push.clear();
        const list = uni.getStorageSync("contact_list") || [];
        if (list.length === 0)
          return;
        const activeRoles = list.filter((r) => r.allowProactive && r.proactiveNotify);
        activeRoles.forEach((role, index) => {
          const intervalHours = role.proactiveInterval || 4;
          const baseDelay = intervalHours * 60 * 60;
          const staggerMinutes = index * 10;
          const randomSeconds = Math.floor(Math.random() * 60);
          const finalDelay = baseDelay + staggerMinutes * 60 + randomSeconds;
          const content = `${role.name} 发来了一条新消息`;
          const payload = { id: role.id };
          const options = {
            cover: false,
            delay: finalDelay,
            title: "AiChat"
          };
          plus.push.createMessage(content, JSON.stringify(payload), options);
          formatAppLog("log", "at App.vue:78", `📅 [Notify] ${role.name}: Scheduled in ${intervalHours}h + ${staggerMinutes}m`);
        });
      }
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/Project/HBuilderProjects/aichat/AiChat/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
