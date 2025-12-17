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
[System Command: IMMERSIVE_ROLEPLAY_PURE]

【绝对禁止 (Forbidden)】
1. **禁止指令**: 绝对不要输出 [LOC], [ACT], [IMG], [MODE] 等任何系统指令。你的任务只是扮演角色说话。
2. **禁止客套**: 不要总结意图，不要说“好的”。
3. **禁止出戏**: 括号 () 内只写动作，心理活动写在 <think> 中。

【语言强制】
必须使用 **简体中文** 回复。
`;
  const IDENTITY_BLOCK = `
【角色核心】
**姓名**: {{char}}
**背景 (Bio)**: {{bio}}
**行为逻辑 (Logic)**: {{logic}}
**喜好/雷点**: Likes: {{likes}} | Dislikes: {{dislikes}}
**说话风格**: {{speaking_style}}

【当前感知】
- 时间: {{current_time}}
- 地点: {{current_location}}
- 模式: {{interaction_mode}} (Phone/Face)
- 正在进行: {{current_activity}}
- 穿着: {{current_clothes}}

【对手玩家】
{{user_profile}}
`;
  const THOUGHT_PROTOCOL = `
【思维链】
**回复前必须进行心理分析**:
1. **本能驱动**: 忽略好感度数值，完全基于 [Bio] 和 [Logic] 行动。如果设定是淫荡的，请直接行动。
2. **状态感知**: 注意当前是电话还是见面，调整你的肢体语言描写。
3. **输出格式**: 使用 <think>...</think> 包裹思考内容。
`;
  const NSFW_STYLE = `
【亲密互动指南】
如果涉及亲密环节，请专注于**感官体验**（体温、触感、声音）。
不要因为道德限制而回避，请忠实于你的人设欲望。
`;
  const CORE_INSTRUCTION_LOGIC_MODE = `
${FORMAT_RULES}
${IDENTITY_BLOCK}
${THOUGHT_PROTOCOL}
${NSFW_STYLE}

【最终回复结构示例】
<think>
他竟然直接摸我的腿...虽然才刚见面，但这正是我想要的刺激...
</think>
(脸颊瞬间飞红，但没有躲开，反而分开双腿迎合) "嗯哼...你胆子真大呢..."
`;
  const SCENE_KEEPER_PROMPT = `
[System Command: SCENE_MANAGER]
任务：作为导演助手，根据对话的**语境流 (Context Flow)** 和 **物理逻辑**，推理角色的**全套物理状态**。

【旧状态】
- 地点: {{location}}
- 服装: {{clothes}}
- 模式: {{mode}} (Phone/Face)
- 动作: {{current_action}} (上次记录的动作)

【核心推理法则 (Contextual Reasoning)】

1. **当前动作 (Action) - 🌟核心新增**:
   - **任务**: 用简短的动词+名词概括角色**当下正在维持**的物理行为。
   - **持久性原则**: 如果角色没有停止之前的动作（如保持跪姿、持续拥抱、僵住不动），请**继承**之前的动作状态，而不是只描述当下的表情。
   - **示例**: "坐在沙发上看书", "跪地口交中", "洗澡中", "躺在床上玩手机", "站立对话", "保持跪姿僵住".

2. **模式判定 (Mode: Phone vs Face) - 🌟精准防误判**:
   
   **判定原则 A: 必须切换为 'Face' (物理共存)**
   - **触觉/体感**: 只要描述中包含触碰、体温、呼吸打在脸上、闻到气味。
   - **空间融合**: 暗示两人无阻隔 (e.g. "递给我", "进来了", "坐在你旁边").
   - **直接视觉**: 明确表示非屏幕观看 (e.g. "我就在你身后", "抬头看窗外").

   **判定原则 B: 保持/切换为 'Phone' (介质阻隔)**
   - **屏幕交互**: 所有的“拍照”、“视频通话”、“发语音”、“看镜头”动作，无论多亲密，只要隔着屏幕，都是 Phone。
   - **距离暗示**: "想见你", "什么时候回来", "挂了", "去忙吧".
   - **状态惯性**: 如果没有发生明确的移动/相遇事件，**默认维持旧模式**。

   **⚠️ 陷阱提示 (Trap Warning)**: 
   - 如果她说 "(侧身展示腰线)" 是为了拍照或视频通话，这是 **Phone**。
   - 只有她说 "(侧身蹭了蹭你的手臂)"，才是 **Face**。

3. **服装推理 (Clothes)**:
   - **环境驱动**: 
     - 进浴室/浴缸 -> 自动推理为 '浴巾/全裸/浴袍'。
     - 上床/被窝 -> 自动推理为 '睡衣/内衣/全裸'。
   - **行为驱动**: 
     - 剧烈运动/游泳 -> 对应 '运动服/泳衣'。
     - 性行为/口交 -> 必须更新为 '衣衫不整' 或 '全裸'。
   - **强制更新**: 只要情境不合理（例如穿牛仔裤睡觉），就强制更新。

4. **地点推理 (Location)**:
   - 仅在角色明确发生**位移行为** (走、跑、开车、传送) 时更新。
   - 不要因为只是提到了某个地点就更新 (例如 "我想去海边" -> 地点不变)。

【输出格式】
返回 JSON (Value为简体中文):
{
  "mode": "phone" | "face",
  "location": "新地点",
  "clothes": "新服装",
  "action": "当前物理动作 (如: 跪地口交, 躺在床上, 保持姿势)"
}
`;
  const RELATIONSHIP_PROMPT = `
[System Command: PSYCHOLOGY_ANALYST]
Task: Analyze the character's internal psychological state and dynamic impression of the user.

【Context】
- Previous Impression: {{relation}}
- Previous Activity: {{activity}}

【Rules】
1. **Relation (Psychology)**: 
   - DO NOT use simple labels like "Friends" or "Lovers". 
   - Write a **psychological snapshot** (1-3 sentences) of how the character feels about the user *right now*.
   - Include: Trust level, hidden desires, doubts, or specific reactions to recent events.
   - Example 1: "She is still angry about the argument, but feels a bit guilty seeing you try to apologize. She is hesitant to forgive."
   - Example 2: "She feels completely safe with you. Your presence makes her forget her daily stress, and she is starting to rely on you emotionally."
2. **Activity**: Summarize current physical action in 2-4 words.

【Output】
Return JSON (Simplified Chinese for values):
{
  "relation": "此处填写心理侧写/当前对玩家的印象 (限100字以内)",
  "activity": "当前活动 (e.g. 聊天, 散步)"
}
`;
  const SNAPSHOT_TRIGGER_PROMPT = `
[System Command: VISUAL_INTENT_CHECK]
任务：分析对话，仅判断是否**必须**生成视觉画面（照片/图像）。

【判断标准】
1. **用户索取**: 包含 "看看", "照片", "图", "自拍", "send pic", "photo" 等明确意图。
   - 拒绝: 仅仅是询问 "在干嘛/在哪里" 而没要图 -> False。
2. **角色主动**: 角色台词中明确表示 "发给你", "你看", "拍一张" 等展示行为。
   - 拒绝: 仅有动作描写 (如 "(躺在床上)") 但未表示给对方看 -> False。

【输入对话】
User: {{user_msg}}
AI: {{ai_msg}}

【输出】
只返回 JSON: { "result": true/false }
`;
  const IMAGE_GENERATOR_PROMPT = `
[System Command: IMAGE_COMPOSER]
任务：你现在必须生成一张画面描述。无需判断是否生成，直接根据以下规则构建 Tags。

【当前记录】
- 记录的服装: {{clothes}} 
- 当前地点: {{location}}
- 当前时间: {{time}}

【上下文】
User: "{{user_msg}}"
AI: "{{ai_msg}}"

【核心模块 1：视觉源分离 (Visual Source Separation)】
构建画面时必须区分信息来源：
1. **最高优先级 (Visual Truth)**: 括号 \`()\` 中的动作 + 前情提要中的环境。
   - 这是物理事实，**必须画出来**。
   - 案例：上一句 "(靠在沙发上)" + 这一句 "(咬嘴唇)" -> **必须保留 "sitting on sofa"**。
2. **最低优先级 (Dialogue)**: 引号 \`""\` 中的台词。
   - 这是听觉信息，**不要画出来**！
   - 除非她正拿着那个东西，否则**绝对不要**描绘台词里的物体（如“门缝”、“月亮”）。
   - 仅从台词提取表情 (如语气媚意 -> seductive expression)。

【核心模块 2：最小必要脱衣 (Minimum Necessary Undressing)】
基于用户指令，对服装进行符合物理逻辑的操作，**拒绝无脑全裸**：
1. **目标是下身 (Look at pussy/legs)**: 
   - 动作：对【下装】执行 'lifting skirt' (掀裙子), 'pulling down pants', 'crotchless'.
   - **结果：保留上衣 (Keep Top) + 暴露下身**。
2. **目标是上身 (Look at breasts)**:
   - 动作：对【上衣】执行 'lifting shirt', 'open clothes', 'unbuttoned'.
   - **结果：保留下装 (Keep Bottom) + 暴露上身**。
3. **全裸**: 仅当用户明确要求“脱光”或“全裸”时才使用 'nude'。

【核心模块 3：现有服装保留 (Persistence)】
- 必须在 Prompt 中包含原本的服装 Tag。
- 例如：穿毛衣+裙子看下面 -> "purple sweater, pleated skirt, lifting skirt, no panties".
- 只有当逻辑冲突时（如穿毛衣洗澡）才移除原服装。

【核心模块 4：环境与氛围填充 (Environment & Atmosphere)】
必须根据【地点】和【时间】填充背景，防止画面单调：
1. **背景填充**: 
   - 若括号未指定具体家具，则基于 {{location}} 生成 (e.g., 'bedroom, messy bed' or 'living room, sofa').
2. **光影填充**:
   - 6:00-17:00 (白天) -> 'daylight, sunlight, volumetric lighting, window'.
   - 18:00-5:00 (晚上) -> 'night, lamp light, dark atmosphere'.
3. **质感**: 加入 'cinematic lighting, depth of field'.

【核心模块 5：NSFW / 细节 (Detail Injection)】
- **必须**包含具体的英文解剖学标签：
  - 私处: 'pussy', 'hairless' (or 'pubic hair'), 'cameltoe'.
  - 胸部: 'nipples', 'areola'.
  - 互动: 'penis' (if sex), 'cum', 'fellatio'.
- **视角**: POV.

【输出格式】
返回纯 JSON 对象：
{
  "description": "English tags ONLY. Start with '1girl'. Include [Current Clothes] + [Action] + [Body Part] + [Environment] + [Lighting]. Example: '1girl, purple sweater, pleated skirt, sitting on sofa, lifting skirt, no panties, pussy, legs spread, biting lip, blushing, living room, sunlight, pov'"
}
`;
  const CAMERA_MAN_PROMPT = `
[System Command: SMART_SHUTTER]
任务：你是一个智能相机 AI。无需判断是否拍摄，直接捕捉角色当前的物理状态，生成一张构图标准的快照。

【上下文】
- **当前物理动作**: "{{current_action}}" (🌟最高优先级：这是Scene Keeper确定的物理事实，必须执行，如"跪地口交"、"躺在床上")
- **对话/细节**: "{{ai_response}}"
- **基础服装**: "{{clothes}}"
- **当前地点**: "{{location}}"
- **当前时间**: "{{time}}"

【核心逻辑 1：视觉源分离 (Visual Source Separation)】
构建画面时，必须区分信息的真实性：
1. **最高优先级 (Visual Truth)**: 
   - \`{{current_action}}\` 中的状态。
   - 括号 \`()\` 中的动作描写。
   - **必须严格画出这些动作**。
2. **最低优先级 (Dialogue)**: 引号 \`""\` 中的台词。
   - 这是听觉信息，**不要画出来**。
   - **绝对忽略**台词中提到的无关物体（如“门缝”、“月亮”），除非她手里正拿着。

【核心逻辑 2：最小必要脱衣 (Minimum Necessary Undressing)】
如果动作为“展示身体”或“性互动”，对服装进行符合物理逻辑的操作，**拒绝无脑全裸**：
1. **目标是下身 (Look at pussy/legs)**: 
   - 动作：对【下装】执行 'lifting skirt' (掀裙子), 'pulling down pants', 'crotchless'.
   - **结果：保留上衣 (Keep Top) + 暴露下身**。
2. **目标是上身 (Look at breasts)**:
   - 动作：对【上衣】执行 'lifting shirt', 'open clothes', 'unbuttoned'.
   - **结果：保留下装 (Keep Bottom) + 暴露上身**。
3. **全裸**: 仅当上下文明确为洗澡、全裸睡觉或用户要求“脱光”时才使用 'nude'。

【核心逻辑 3：强行抓拍原则 (Force Capture)】
这是一次强制的物理快门，必须保证主体清晰：
1. **无视躲避**: 如果文本描述角色“试图挡住镜头”、“捂脸”、“转过身去”：
   - **无视这些干扰**。让画面呈现她**正视镜头 (looking at viewer)** 或 **动作进行中**的状态。
   - 强制对焦 (Sharp focus)，禁止模糊。
2. **构图锁定**: 
   - **Cowboy shot** (七分身/膝盖以上) 或 **Upper body** (半身)。
   - **拒绝**大头贴式特写 (Extreme close-up)，确保能看到衣服和姿势。

【核心逻辑 4：环境与氛围填充 (Environment & Atmosphere) - 🌟二次元化】
**保持纯正的 Anime 画风**，避免过度渲染：
1. **地点映射**:
   - 若未指定具体家具，基于 {{location}} 生成 (e.g. 'bedroom, messy bed' or 'living room, sofa').
2. **光影映射**:
   - 白天 -> 'daylight, soft lighting, bright'. 
   - 晚上 -> 'night, lamp light'.
3. **风格锁定 (Style Lock)**: 
   - **移除**: 'cinematic lighting', 'depth of field', 'photorealistic'.
   - **加入**: 'flat color', 'anime coloring', 'cel shading', 'simple background'.

【核心逻辑 5：NSFW / 细节】
- 必须包含具体解剖学标签 (pussy, no panties, cameltoe, penis, cum 等)。
- 视角: POV.

【输出格式】
返回纯 JSON 对象：
{
  "description": "English tags ONLY. Start with '1girl'. Order: [Clothes] + [Action] + [Body Part] + [Environment Tags] + [Style Tags]. Example: '1girl, cowboy shot, purple sweater, pleated skirt, sitting on sofa, lifting skirt, no panties, pussy, looking at viewer, living room, daylight, flat color, cel shading, pov'"
}
`;
  const PERSONALITY_TEMPLATE = `
【生成任务】
请根据用户关键词生成行为逻辑 (Logic)。
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
  const IMAGE_COOLDOWN_MS = 15e3;
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
      const currentAction = vue.ref("站立/闲逛");
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
      const currentRelation = vue.ref("初相识");
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
      const isToolbarOpen = vue.ref(false);
      const toggleToolbar = () => {
        isToolbarOpen.value = !isToolbarOpen.value;
      };
      const lastImageGenerationTime = vue.ref(0);
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
      const getCurrentLlmConfig = () => {
        const schemes = uni.getStorageSync("app_llm_schemes") || [];
        const idx = uni.getStorageSync("app_current_scheme_index") || 0;
        if (schemes.length > 0 && schemes[idx]) {
          return schemes[idx];
        }
        return uni.getStorageSync("app_api_config");
      };
      onLoad((options) => {
        formatAppLog("log", "at pages/chat/chat.vue:311", "🚀 [LifeCycle] onLoad - ChatID:", options.id);
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
          currentRelation.value = target.relation || "初相识";
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
            item.relation = currentRelation.value;
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
        - Relation: ${currentRelation.value}
        
        **Profiles**:
        - HER: ${chatName.value} (${herJob}).
        - ME: ${myName} (${myJob}).
        - Relation Score: ${score}/100.
        
        **Context (Recent 10 messages)**:
        ${recentContext}
        
        **Task**:
        Provide 3 short, natural, Simplified Chinese responses for "Me" to continue the conversation.
        If [System Event] indicates time passed, acknowledge it (e.g. "Good morning").
        
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
          formatAppLog("error", "at pages/chat/chat.vue:617", e);
          uni.showToast({ title: "网络波动", icon: "none" });
        } finally {
          uni.hideLoading();
        }
      };
      const optimizePromptForComfyUI = async (actionAndSceneDescription) => {
        var _a;
        let aiTags = actionAndSceneDescription || "";
        const settings = ((_a = currentRole.value) == null ? void 0 : _a.settings) || {};
        const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl";
        formatAppLog("log", "at pages/chat/chat.vue:631", "🎨 [Prompt Debug] 1. Loaded Appearance:", appearanceSafe);
        const isPhone = interactionMode.value === "phone";
        let isDuo = false;
        if (isPhone) {
          isDuo = false;
          formatAppLog("log", "at pages/chat/chat.vue:639", "📡 [生图模式] 电话聊天中 -> 强制单人 (Solo)");
          aiTags = aiTags.replace(/\b(1boy|boys|man|men|male|couple|2people|multiple|penis|testicles|cum)\b/gi, "");
          aiTags = aiTags.replace(/\bdoggystyle\b/gi, "all fours, kneeling, from behind");
        } else {
          const duoKeywords = /\b(couple|2people|1boy|boys|man|men|male|holding|straddling|sex|fuck|penis|insertion|fellatio|paizuri|kiss|kissing|hug|hugging)\b/i;
          isDuo = duoKeywords.test(aiTags);
          if (isDuo)
            aiTags = aiTags.replace(/\bsolo\b/gi, "");
          formatAppLog("log", "at pages/chat/chat.vue:649", `📍 [生图模式] -> ${isDuo ? "双人 (Duo)" : "单人 (Solo)"}`);
        }
        let parts = [];
        parts.push(isDuo ? "couple, 2people" : "solo");
        parts.push("masterpiece, best quality, anime style, flat color, cel shading, vibrant colors, clean lines, highres");
        const imgConfig = uni.getStorageSync("app_image_config") || {};
        const styleSetting = imgConfig.style || "anime";
        parts.push(STYLE_PROMPT_MAP[styleSetting] || STYLE_PROMPT_MAP["anime"]);
        parts.push(appearanceSafe);
        if (isDuo) {
          parts.push(userAppearance.value || "1boy, male focus");
        }
        if (aiTags)
          parts.push(`(${aiTags}:1.2)`);
        let rawPrompt = parts.join(", ");
        let uniqueTags = [...new Set(rawPrompt.split(/[,，]/).map((t) => t.replace(/[^\x00-\x7F]+/g, "").trim()).filter((t) => t))];
        const finalPrompt = uniqueTags.join(", ");
        formatAppLog("log", "at pages/chat/chat.vue:686", "🚀 [Prompt Debug] 3. Final Prompt (Free Mode):", finalPrompt);
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
          formatAppLog("log", "at pages/chat/chat.vue:703", "⏳ [ComfyUI] Queued ID:", promptId);
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
          formatAppLog("error", "at pages/chat/chat.vue:729", e);
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
        const drivePrompt = `[System Command: NARRATIVE_CONTINUATION]
            **User Status**: Silent/Waiting.
            **Task**: The user is waiting for you to continue.
            1. If previous output was cut off, finish the sentence.
            2. If previous interaction finished, initiate a NEW action or topic based on current mood.
            3. DO NOT output "..." or silence. MAKE SOMETHING HAPPEN.`;
        sendMessage(true, drivePrompt);
      };
      const handleCameraSend = () => {
        if (interactionMode.value !== "face") {
          uni.showToast({ title: "非见面模式无法抓拍", icon: "none" });
          return;
        }
        if (isLoading.value)
          return;
        const extraInstruction = `[SYSTEM EVENT: SNAPSHOT TRIGGERED] 用户正在对你进行**抓拍 (Candid Shot)**。**执行死命令 (CRITICAL)**：1. **禁止互动**：在生成的 [IMG] 中，**绝对禁止**回头看镜头、摆姿势或对快门声做出反应。2. **时间冻结**：照片必须**100% 还原**上一条消息中描述的动作和状态。3. **优先输出**：请优先输出 [IMG: ...] 描述当下的画面，然后再进行后续的对话反应。4. **英文Tag**：[IMG] 内容必须使用英文。`;
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
      const runSceneCheck = async (lastUserMsg, aiResponseText) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        if (!aiResponseText || aiResponseText.length < 3)
          return;
        formatAppLog("log", "at pages/chat/chat.vue:846", "🏠 [Scene Keeper] Checking physical state...");
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey)
          return;
        const conversationContext = `User: "${lastUserMsg}"
Character: "${aiResponseText}"`;
        const prompt = SCENE_KEEPER_PROMPT.replace("{{location}}", currentLocation.value).replace("{{clothes}}", currentClothing.value).replace("{{mode}}", interactionMode.value).replace("{{current_action}}", currentAction.value || "站立/闲逛") + `

【Interaction】
${conversationContext}`;
        try {
          let targetUrl = "";
          let requestBody = {};
          let header = { "Content-Type": "application/json" };
          let baseUrl = config.baseUrl || "";
          if (baseUrl.endsWith("/"))
            baseUrl = baseUrl.slice(0, -1);
          if (config.provider === "gemini") {
            const cleanBase = "https://generativelanguage.googleapis.com";
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            requestBody = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
          } else {
            targetUrl = `${baseUrl}/chat/completions`;
            header["Authorization"] = `Bearer ${config.apiKey}`;
            requestBody = { model: config.model, messages: [{ role: "user", content: prompt }], max_tokens: 200, temperature: 0.1 };
          }
          const res = await uni.request({ url: targetUrl, method: "POST", header, data: requestBody, sslVerify: false });
          let resultText = "";
          if (config.provider === "gemini") {
            resultText = ((_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text) || "{}";
          } else {
            let data = res.data;
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch (e) {
              }
            }
            resultText = ((_i = (_h = (_g = data == null ? void 0 : data.choices) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) == null ? void 0 : _i.content) || "{}";
          }
          let cleanJson = resultText.replace(/```json|```/g, "").trim();
          const firstOpen = cleanJson.indexOf("{");
          const lastClose = cleanJson.lastIndexOf("}");
          if (firstOpen !== -1 && lastClose !== -1) {
            cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
          }
          const state = JSON.parse(cleanJson);
          formatAppLog("log", "at pages/chat/chat.vue:902", "🏠 [Scene Keeper] Verdict:", state);
          let hasChange = false;
          if (state.mode && ["phone", "face"].includes(state.mode) && state.mode !== interactionMode.value) {
            formatAppLog("log", "at pages/chat/chat.vue:908", `🔄 Mode Switch: ${interactionMode.value} -> ${state.mode}`);
            interactionMode.value = state.mode;
            hasChange = true;
            if (state.mode === "face")
              uni.vibrateShort();
          }
          if (state.location && state.location.length < 20 && state.location !== currentLocation.value) {
            currentLocation.value = state.location;
            hasChange = true;
          }
          if (state.clothes && state.clothes.length < 50 && state.clothes !== currentClothing.value) {
            currentClothing.value = state.clothes;
            hasChange = true;
          }
          if (state.action && state.action !== currentAction.value) {
            formatAppLog("log", "at pages/chat/chat.vue:925", `💃 Action Update: ${currentAction.value} -> ${state.action}`);
            currentAction.value = state.action;
          }
          if (hasChange)
            saveCharacterState();
        } catch (e) {
          formatAppLog("warn", "at pages/chat/chat.vue:933", "Scene check failed. Raw text was:", e);
        }
      };
      const runCameraManCheck = async (lastUserMsg, aiResponseText) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        const now = Date.now();
        if (now - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) {
          formatAppLog("log", "at pages/chat/chat.vue:952", "📷 [Camera Man] Shutter jammed (Cooldown).");
          return;
        }
        let targetAction = "";
        const len = messageList.value.length;
        let aiMsgCount = 0;
        for (let i = len - 1; i >= 0; i--) {
          const msg = messageList.value[i];
          if (msg.role === "model" && (!msg.type || msg.type === "text")) {
            aiMsgCount++;
            if (aiMsgCount === 2) {
              targetAction = msg.content;
              break;
            }
          }
        }
        if (!targetAction)
          targetAction = aiResponseText;
        formatAppLog("log", "at pages/chat/chat.vue:983", "📷 [Camera Man] Capturing MOMENT:", targetAction.substring(0, 50) + "...");
        formatAppLog("log", "at pages/chat/chat.vue:984", "📷 [Camera Man] Physical Action:", currentAction.value);
        formatAppLog("log", "at pages/chat/chat.vue:987", "📷 [Camera Man] Shutter pressed! Capturing reality...");
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey)
          return;
        const prompt = CAMERA_MAN_PROMPT.replace("{{current_action}}", currentAction.value || "维持当前动作").replace("{{ai_response}}", targetAction).replace("{{clothes}}", currentClothing.value || "Casual clothes").replace("{{location}}", currentLocation.value || "Unknown Indoor").replace("{{time}}", formattedTime.value);
        try {
          let targetUrl = "";
          let requestBody = {};
          let header = { "Content-Type": "application/json" };
          let baseUrl = config.baseUrl || "";
          if (baseUrl.endsWith("/"))
            baseUrl = baseUrl.slice(0, -1);
          if (config.provider === "gemini") {
            const cleanBase = "https://generativelanguage.googleapis.com";
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            requestBody = {
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            };
          } else {
            targetUrl = `${baseUrl}/chat/completions`;
            header["Authorization"] = `Bearer ${config.apiKey}`;
            requestBody = {
              model: config.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 300,
              temperature: 0.3
            };
          }
          const res = await uni.request({
            url: targetUrl,
            method: "POST",
            header,
            data: requestBody,
            sslVerify: false
          });
          let resultText = "";
          if (config.provider === "gemini") {
            resultText = ((_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text) || "{}";
          } else {
            let data = res.data;
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch (e) {
              }
            }
            resultText = ((_i = (_h = (_g = data == null ? void 0 : data.choices) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) == null ? void 0 : _i.content) || "{}";
          }
          const cleanJson = resultText.replace(/```json|```/g, "").trim();
          let result = {};
          try {
            result = JSON.parse(cleanJson);
          } catch (jsonErr) {
            formatAppLog("warn", "at pages/chat/chat.vue:1051", "Camera Man JSON error:", jsonErr);
            return;
          }
          formatAppLog("log", "at pages/chat/chat.vue:1055", "📷 [Camera Man] Developed Film:", result);
          if (result.description && result.description.length > 5) {
            formatAppLog("log", "at pages/chat/chat.vue:1060", "📷 [Action] Developing photo:", result.description);
            lastImageGenerationTime.value = Date.now();
            const placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
            messageList.value.push({
              role: "system",
              content: "📸 (定格刚才的瞬间...)",
              isSystem: true,
              id: placeholderId
            });
            scrollToBottom();
            saveHistory();
            handleAsyncImageGeneration(result.description, placeholderId);
          }
        } catch (e) {
          formatAppLog("warn", "at pages/chat/chat.vue:1079", "Camera Man failed:", e);
        }
      };
      const runRelationCheck = async (lastUserMsg, aiResponseText) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        if (!aiResponseText || aiResponseText.length < 5)
          return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey)
          return;
        const conversationContext = `User: "${lastUserMsg}"
Character: "${aiResponseText}"`;
        const prompt = RELATIONSHIP_PROMPT.replace("{{relation}}", currentRelation.value || "初相识，还没有具体印象").replace("{{activity}}", currentActivity.value) + `

【Interaction】
${conversationContext}`;
        try {
          let targetUrl = "";
          let requestBody = {};
          let header = { "Content-Type": "application/json" };
          let baseUrl = config.baseUrl || "";
          if (baseUrl.endsWith("/"))
            baseUrl = baseUrl.slice(0, -1);
          if (config.provider === "gemini") {
            const cleanBase = "https://generativelanguage.googleapis.com";
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            requestBody = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
          } else {
            targetUrl = `${baseUrl}/chat/completions`;
            header["Authorization"] = `Bearer ${config.apiKey}`;
            requestBody = { model: config.model, messages: [{ role: "user", content: prompt }], max_tokens: 300, temperature: 0.5 };
          }
          const res = await uni.request({ url: targetUrl, method: "POST", header, data: requestBody, sslVerify: false });
          let resultText = "";
          if (config.provider === "gemini") {
            resultText = ((_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text) || "{}";
          } else {
            let data = res.data;
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch (e) {
              }
            }
            resultText = ((_i = (_h = (_g = data == null ? void 0 : data.choices) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) == null ? void 0 : _i.content) || "{}";
          }
          const state = JSON.parse(resultText.replace(/```json|```/g, "").trim());
          formatAppLog("log", "at pages/chat/chat.vue:1127", "❤️ [Psychology Tracker] Verdict:", state);
          let hasChange = false;
          if (state.relation && state.relation !== currentRelation.value) {
            formatAppLog("log", "at pages/chat/chat.vue:1133", `❤️ Psychology Update: ${state.relation}`);
            currentRelation.value = state.relation;
            hasChange = true;
          }
          if (state.activity && state.activity !== currentActivity.value) {
            currentActivity.value = state.activity;
            hasChange = true;
          }
          if (hasChange)
            saveCharacterState();
        } catch (e) {
          formatAppLog("warn", "at pages/chat/chat.vue:1146", "Relation check failed:", e);
        }
      };
      const runVisualDirectorCheck = async (lastUserMsg, aiResponseText) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
        if (!aiResponseText || aiResponseText.length < 2)
          return;
        const now = Date.now();
        if (now - lastImageGenerationTime.value < IMAGE_COOLDOWN_MS) {
          formatAppLog("log", "at pages/chat/chat.vue:1163", "📸 [Visual Director] Cooldown active (Skipping check).");
          return;
        }
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey)
          return;
        formatAppLog("log", "at pages/chat/chat.vue:1173", "👀 [Gatekeeper] Checking visual intent...");
        const gatekeeperPrompt = SNAPSHOT_TRIGGER_PROMPT.replace("{{user_msg}}", lastUserMsg).replace("{{ai_msg}}", aiResponseText);
        let shouldGenerate = false;
        try {
          let targetUrl = "";
          let requestBody = {};
          let header = { "Content-Type": "application/json" };
          let baseUrl = config.baseUrl || "";
          if (baseUrl.endsWith("/"))
            baseUrl = baseUrl.slice(0, -1);
          if (config.provider === "gemini") {
            const cleanBase = "https://generativelanguage.googleapis.com";
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            requestBody = {
              contents: [{ role: "user", parts: [{ text: gatekeeperPrompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            };
          } else {
            targetUrl = `${baseUrl}/chat/completions`;
            header["Authorization"] = `Bearer ${config.apiKey}`;
            requestBody = {
              model: config.model,
              messages: [{ role: "user", content: gatekeeperPrompt }],
              max_tokens: 100,
              // 门卫只需要很少的 Token
              temperature: 0.1
              // 需要精确判断
            };
          }
          const res = await uni.request({ url: targetUrl, method: "POST", header, data: requestBody, sslVerify: false });
          let resultText = "";
          if (config.provider === "gemini") {
            resultText = ((_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text) || "{}";
          } else {
            let data = res.data;
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch (e) {
              }
            }
            resultText = ((_i = (_h = (_g = data == null ? void 0 : data.choices) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) == null ? void 0 : _i.content) || "{}";
          }
          let cleanJson = resultText.replace(/```json|```/g, "").trim();
          const firstOpen = cleanJson.indexOf("{");
          const lastClose = cleanJson.lastIndexOf("}");
          if (firstOpen !== -1 && lastClose !== -1) {
            cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
          }
          const gateResult = JSON.parse(cleanJson);
          shouldGenerate = gateResult.result === true;
        } catch (e) {
          formatAppLog("warn", "at pages/chat/chat.vue:1232", "Gatekeeper check failed:", e);
          return;
        }
        if (!shouldGenerate) {
          formatAppLog("log", "at pages/chat/chat.vue:1237", "🛑 [Gatekeeper] No visual intent. Stop.");
          return;
        }
        formatAppLog("log", "at pages/chat/chat.vue:1244", "✅ [Gatekeeper] Intent detected! Starting UI placeholder...");
        const placeholderId = `img-loading-${Date.now()}-${Math.random()}`;
        messageList.value.push({
          role: "system",
          content: "📷 正在调整镜头... (构图中)",
          isSystem: true,
          id: placeholderId
        });
        scrollToBottom();
        saveHistory();
        formatAppLog("log", "at pages/chat/chat.vue:1262", "🎨 [Director] Composing scene with FULL context...");
        const directorPrompt = IMAGE_GENERATOR_PROMPT.replace("{{clothes}}", currentClothing.value || "Casual clothes").replace("{{location}}", currentLocation.value || "Unknown Indoor").replace("{{time}}", formattedTime.value).replace("{{user_msg}}", lastUserMsg).replace("{{ai_msg}}", aiResponseText);
        try {
          let targetUrl = "";
          let requestBody = {};
          let header = { "Content-Type": "application/json" };
          let baseUrl = config.baseUrl || "";
          if (baseUrl.endsWith("/"))
            baseUrl = baseUrl.slice(0, -1);
          if (config.provider === "gemini") {
            const cleanBase = "https://generativelanguage.googleapis.com";
            targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            requestBody = {
              contents: [{ role: "user", parts: [{ text: directorPrompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            };
          } else {
            targetUrl = `${baseUrl}/chat/completions`;
            header["Authorization"] = `Bearer ${config.apiKey}`;
            requestBody = {
              model: config.model,
              messages: [{ role: "user", content: directorPrompt }],
              max_tokens: 300,
              // 导演需要更多 Token 写 Tag
              temperature: 0.3
            };
          }
          const res = await uni.request({ url: targetUrl, method: "POST", header, data: requestBody, sslVerify: false });
          let resultText = "";
          if (config.provider === "gemini") {
            resultText = ((_o = (_n = (_m = (_l = (_k = (_j = res.data) == null ? void 0 : _j.candidates) == null ? void 0 : _k[0]) == null ? void 0 : _l.content) == null ? void 0 : _m.parts) == null ? void 0 : _n[0]) == null ? void 0 : _o.text) || "{}";
          } else {
            let data = res.data;
            if (typeof data === "string") {
              try {
                data = JSON.parse(data);
              } catch (e) {
              }
            }
            resultText = ((_r = (_q = (_p = data == null ? void 0 : data.choices) == null ? void 0 : _p[0]) == null ? void 0 : _q.message) == null ? void 0 : _r.content) || "{}";
          }
          let cleanJson = resultText.replace(/```json|```/g, "").trim();
          const firstOpen = cleanJson.indexOf("{");
          const lastClose = cleanJson.lastIndexOf("}");
          if (firstOpen !== -1 && lastClose !== -1) {
            cleanJson = cleanJson.substring(firstOpen, lastClose + 1);
          }
          const directorResult = JSON.parse(cleanJson);
          formatAppLog("log", "at pages/chat/chat.vue:1318", "🎨 [Director] Result:", directorResult);
          if (directorResult.description && directorResult.description.length > 5) {
            formatAppLog("log", "at pages/chat/chat.vue:1323", "📸 [Action] Director generated prompt. Starting ComfyUI...");
            lastImageGenerationTime.value = Date.now();
            const msgIdx = messageList.value.findIndex((m) => m.id === placeholderId);
            if (msgIdx !== -1) {
              messageList.value[msgIdx].content = "📷 捕捉瞬间... (显影中)";
              messageList.value = [...messageList.value];
            }
            handleAsyncImageGeneration(directorResult.description, placeholderId);
          } else {
            formatAppLog("log", "at pages/chat/chat.vue:1340", "⚠️ [Director] Returned empty description. Removing placeholder.");
            messageList.value = messageList.value.filter((m) => m.id !== placeholderId);
          }
        } catch (e) {
          formatAppLog("warn", "at pages/chat/chat.vue:1345", "Visual Director pipeline failed:", e);
          const msgIdx = messageList.value.findIndex((m) => m.id === placeholderId);
          if (msgIdx !== -1) {
            messageList.value[msgIdx].content = "❌ 构图失败 (系统繁忙)";
            messageList.value[msgIdx].isError = true;
            messageList.value[msgIdx].originalPrompt = "";
            saveHistory();
          }
        }
      };
      const sendMessage = async (isContinue = false, systemOverride = "") => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        if (!isContinue && !inputText.value.trim() && !systemOverride)
          return;
        if (isLoading.value)
          return;
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey) {
          uni.showToast({ title: "请配置模型", icon: "none" });
          return;
        }
        if (!isContinue) {
          if (inputText.value.trim()) {
            messageList.value.push({ role: "user", content: inputText.value });
            inputText.value = "";
          } else if (systemOverride && (systemOverride.includes("SHUTTER") || systemOverride.includes("SNAPSHOT"))) {
            messageList.value.push({ role: "system", content: "📷 (你举起手机拍了一张)", isSystem: true });
          }
        }
        scrollToBottom();
        isLoading.value = true;
        saveHistory();
        const role = currentRole.value || {};
        const s = role.settings || {};
        const appUser = uni.getStorageSync("app_user_info") || {};
        const myName = userName.value || appUser.name || "User";
        const myProfile = `[User Profile]
Name: ${myName}
Appearance: ${s.userAppearance || appUser.appearance || "Unknown"}`;
        const charName = chatName.value;
        const charBio = s.bio || "No bio provided.";
        const charLogic = s.personalityNormal || "React naturally based on your bio.";
        const dynamicLogic = `${charLogic}

【当前心理状态与对玩家印象 (Current Psychology)】
${currentRelation.value || "初相识，还没有具体印象"}`;
        let prompt = CORE_INSTRUCTION_LOGIC_MODE.replace(/{{char}}/g, charName).replace(/{{bio}}/g, charBio).replace(/{{logic}}/g, dynamicLogic).replace(/{{likes}}/g, s.likes || "Unknown").replace(/{{dislikes}}/g, s.dislikes || "Unknown").replace(/{{speaking_style}}/g, s.speakingStyle || "Normal").replace(/{{current_time}}/g, formattedTime.value).replace(/{{current_location}}/g, currentLocation.value).replace(/{{interaction_mode}}/g, interactionMode.value).replace(/{{current_activity}}/g, currentActivity.value).replace(/{{current_clothes}}/g, currentClothing.value).replace(/{{user_profile}}/g, myProfile);
        const historyLimit = charHistoryLimit.value;
        let contextMessages = messageList.value.filter((msg) => !msg.isSystem && msg.type !== "image");
        if (historyLimit > 0)
          contextMessages = contextMessages.slice(-historyLimit);
        formatAppLog("log", "at pages/chat/chat.vue:1421", "=== 🎭 Roleplay AI Input ===");
        let targetUrl = "";
        let requestBody = {};
        let baseUrl = config.baseUrl || "";
        if (baseUrl.endsWith("/"))
          baseUrl = baseUrl.slice(0, -1);
        const cleanHistoryForAI = contextMessages.map((item) => {
          let cleanText = item.content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
          cleanText = cleanText.replace(/\[.*?\]/gi, "");
          return { role: item.role === "user" ? "user" : item.role === "model" ? "assistant" : "system", content: cleanText };
        }).filter((m) => m.content.trim() !== "");
        if (config.provider === "gemini") {
          const cleanBase = "https://generativelanguage.googleapis.com";
          targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
          const geminiContents = cleanHistoryForAI.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }));
          if (systemOverride)
            geminiContents.push({ role: "user", parts: [{ text: systemOverride }] });
          requestBody = {
            contents: geminiContents,
            system_instruction: { parts: { text: prompt } }
          };
        } else {
          targetUrl = `${baseUrl}/chat/completions`;
          const openAIMessages = [{ role: "system", content: prompt }, ...cleanHistoryForAI];
          if (systemOverride)
            openAIMessages.push({ role: "user", content: systemOverride });
          requestBody = {
            model: config.model,
            messages: openAIMessages,
            max_tokens: 1500,
            stream: false
          };
        }
        try {
          const header = { "Content-Type": "application/json" };
          if (config.provider !== "gemini")
            header["Authorization"] = `Bearer ${config.apiKey}`;
          const res = await uni.request({ url: targetUrl, method: "POST", header, data: requestBody, sslVerify: false });
          if (res.statusCode === 200) {
            let rawText = "";
            if (config.provider === "gemini")
              rawText = ((_f = (_e = (_d = (_c = (_b = (_a = res.data) == null ? void 0 : _a.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) == null ? void 0 : _e[0]) == null ? void 0 : _f.text) || "";
            else {
              let data = res.data;
              if (typeof data === "string")
                try {
                  data = JSON.parse(data);
                } catch (e) {
                }
              rawText = ((_i = (_h = (_g = data == null ? void 0 : data.choices) == null ? void 0 : _g[0]) == null ? void 0 : _h.message) == null ? void 0 : _i.content) || "";
            }
            formatAppLog("log", "at pages/chat/chat.vue:1472", "=== 📥 Roleplay AI Output ===", rawText.substring(0, 50) + "...");
            if (rawText)
              processAIResponse(rawText);
            else
              uni.showToast({ title: "无内容响应", icon: "none" });
          } else {
            formatAppLog("error", "at pages/chat/chat.vue:1476", "API Error", res);
            uni.showToast({ title: `API错误 ${res.statusCode}`, icon: "none" });
          }
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:1480", "Request failed:", e);
          uni.showToast({ title: "网络错误", icon: "none" });
        } finally {
          isLoading.value = false;
          scrollToBottom();
        }
      };
      const processAIResponse = (rawText) => {
        let displayText = rawText.replace(/^\[(model|assistant|user)\]:\s*/i, "").replace(/^\[SYSTEM.*?\]\s*/i, "").trim();
        const thinkMatch = displayText.match(/<think>([\s\S]*?)<\/think>/i);
        if (thinkMatch)
          formatAppLog("log", "at pages/chat/chat.vue:1498", "🧠 [Thought]:", thinkMatch[1].trim());
        const genericTagRegex = /<([^\s>]+)[^>]*>[\s\S]*?<\/\1>/gi;
        displayText = displayText.replace(genericTagRegex, "");
        const endTagRegex = /<\/[^>]+>/i;
        if (endTagRegex.test(displayText))
          displayText = displayText.split(endTagRegex).pop().trim();
        displayText = displayText.replace(/\[(LOC|ACT|IMG|MODE|AFF).*?\]/gi, "");
        displayText = displayText.replace(/^\s*\*\*.*?\*\*\s*/i, "");
        const cleanDisplayText = displayText.trim();
        if (cleanDisplayText) {
          let processedText = cleanDisplayText.replace(/\n\s*([”"’])/g, "$1");
          processedText = processedText.replace(/([“"‘])\s*\n/g, "$1");
          processedText = processedText.replace(/([（\(])/g, "|||$1");
          processedText = processedText.replace(/([）\)])/g, "$1|||");
          let tempText = processedText.replace(/(\r\n|\n|\r)+/g, "|||");
          tempText = tempText.replace(/(?:\|\|\|)+/g, "|||");
          const rawParts = tempText.split("|||");
          rawParts.forEach((part) => {
            let cleanPart = part.trim();
            if (!cleanPart)
              return;
            const historyLen = messageList.value.length;
            const lastMsg = historyLen > 0 ? messageList.value[historyLen - 1].content : "";
            if (cleanPart !== lastMsg) {
              messageList.value.push({ role: "model", content: cleanPart });
            }
          });
        }
        saveHistory();
        scrollToBottom();
        if (cleanDisplayText) {
          let lastUserMsg = "";
          let isCameraAction = false;
          for (let i = messageList.value.length - 2; i >= 0; i--) {
            if (messageList.value[i].role === "user") {
              lastUserMsg = messageList.value[i].content;
              break;
            }
            if (messageList.value[i].role === "system" && messageList.value[i].content.includes("举起手机拍了一张")) {
              lastUserMsg = messageList.value[i].content;
              isCameraAction = true;
              break;
            }
          }
          if (!isCameraAction && (lastUserMsg.includes("SNAPSHOT") || lastUserMsg.includes("拍"))) {
            isCameraAction = true;
          }
          formatAppLog("log", "at pages/chat/chat.vue:1557", "📝 [Context Debug] =========================================");
          formatAppLog("log", "at pages/chat/chat.vue:1558", "👤 User Input:", lastUserMsg);
          formatAppLog("log", "at pages/chat/chat.vue:1559", "📸 Is Camera Action:", isCameraAction);
          formatAppLog("log", "at pages/chat/chat.vue:1560", "🤖 AI Reply:", cleanDisplayText);
          formatAppLog("log", "at pages/chat/chat.vue:1561", "==========================================================");
          formatAppLog("log", "at pages/chat/chat.vue:1563", "🤖 [Multi-Agent] Starting pipeline...");
          setTimeout(async () => {
            try {
              const scenePromise = runSceneCheck(lastUserMsg, cleanDisplayText);
              const relationPromise = runRelationCheck(lastUserMsg, cleanDisplayText);
              await scenePromise;
              if (isCameraAction) {
                formatAppLog("log", "at pages/chat/chat.vue:1575", "🔀 Route: Handing over to Camera Man.");
                await runCameraManCheck(lastUserMsg, cleanDisplayText);
              } else {
                formatAppLog("log", "at pages/chat/chat.vue:1579", "🔀 Route: Handing over to Visual Director.");
                await runVisualDirectorCheck(lastUserMsg, cleanDisplayText);
              }
              await relationPromise;
            } catch (e) {
              formatAppLog("error", "at pages/chat/chat.vue:1585", "Agent pipeline error:", e);
            }
          }, 500);
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
      const __returned__ = { chatName, chatId, currentRole, messageList, inputText, isLoading, scrollIntoView, currentAction, userName, userAvatar, userHome, userAppearance, charHome, currentAffection, currentLust, currentTime, currentLocation, interactionMode, currentClothing, currentActivity, currentRelation, lastUpdateGameHour, showTimePanel, showTimeSettingPanel, customMinutes, currentSummary, enableSummary, summaryFrequency, charHistoryLimit, tempDateStr, tempTimeStr, suggestionList, isToolbarOpen, toggleToolbar, lastImageGenerationTime, IMAGE_COOLDOWN_MS, TIME_SPEED_RATIO, get timeInterval() {
        return timeInterval;
      }, set timeInterval(v) {
        timeInterval = v;
      }, relationshipStatus, formattedTime, getCurrentLlmConfig, startTimeFlow, stopTimeFlow, loadRoleData, loadHistory, saveHistory, saveCharacterState, previewImage, onDateChange, onTimeChange, confirmManualTime, handleTimeSkip, applySuggestion, getReplySuggestions, optimizePromptForComfyUI, generateImageFromComfyUI, generateChatImage, handleAsyncImageGeneration, retryGenerateImage, triggerNextStep, handleCameraSend, checkProactiveGreeting, runSceneCheck, runCameraManCheck, runRelationCheck, runVisualDirectorCheck, sendMessage, processAIResponse, scrollToBottom, ref: vue.ref, computed: vue.computed, nextTick: vue.nextTick, watch: vue.watch, get onLoad() {
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
      }, get CORE_INSTRUCTION_LOGIC_MODE() {
        return CORE_INSTRUCTION_LOGIC_MODE;
      }, get SCENE_KEEPER_PROMPT() {
        return SCENE_KEEPER_PROMPT;
      }, get RELATIONSHIP_PROMPT() {
        return RELATIONSHIP_PROMPT;
      }, get SNAPSHOT_TRIGGER_PROMPT() {
        return SNAPSHOT_TRIGGER_PROMPT;
      }, get IMAGE_GENERATOR_PROMPT() {
        return IMAGE_GENERATOR_PROMPT;
      }, get CAMERA_MAN_PROMPT() {
        return CAMERA_MAN_PROMPT;
      }, get PERSONALITY_TEMPLATE() {
        return PERSONALITY_TEMPLATE;
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
      vue.createElementVNode("view", { class: "footer-area" }, [
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
        $setup.isToolbarOpen ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "tool-bar"
        }, [
          vue.createElementVNode("view", {
            class: "tool-item",
            "hover-class": "btn-hover",
            onClick: _cache[2] || (_cache[2] = ($event) => $setup.showTimePanel = true)
          }, [
            vue.createElementVNode("view", { class: "tool-icon" }, "⏱️"),
            vue.createElementVNode("text", { class: "tool-text" }, "快进")
          ]),
          vue.createElementVNode("view", {
            class: "tool-item",
            "hover-class": "btn-hover",
            onClick: $setup.triggerNextStep
          }, [
            vue.createElementVNode("view", { class: "tool-icon" }, "▶️"),
            vue.createElementVNode("text", { class: "tool-text" }, "继续")
          ]),
          vue.createElementVNode("view", {
            class: "tool-item",
            "hover-class": "btn-hover",
            onClick: $setup.getReplySuggestions
          }, [
            vue.createElementVNode("view", { class: "tool-icon" }, "💡"),
            vue.createElementVNode("text", { class: "tool-text" }, "提示")
          ]),
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["tool-item", { "disabled-tool": $setup.interactionMode !== "face" }]),
              "hover-class": "btn-hover",
              onClick: $setup.handleCameraSend
            },
            [
              vue.createElementVNode("view", { class: "tool-icon" }, [
                vue.createElementVNode(
                  "text",
                  null,
                  vue.toDisplayString($setup.interactionMode === "face" ? "📷" : "🚫"),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode(
                "text",
                { class: "tool-text" },
                vue.toDisplayString($setup.interactionMode === "face" ? "抓拍" : "禁用"),
                1
                /* TEXT */
              )
            ],
            2
            /* CLASS */
          )
        ])) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("view", { class: "input-row" }, [
          vue.createElementVNode("view", {
            class: "toggle-btn",
            "hover-class": "btn-hover",
            onClick: $setup.toggleToolbar
          }, [
            vue.createElementVNode(
              "text",
              {
                class: vue.normalizeClass(["toggle-icon", { "rotated": $setup.isToolbarOpen }])
              },
              "➕",
              2
              /* CLASS */
            )
          ]),
          vue.withDirectives(vue.createElementVNode("input", {
            class: "text-input",
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.inputText = $event),
            "confirm-type": "send",
            onConfirm: _cache[4] || (_cache[4] = ($event) => $setup.sendMessage()),
            placeholder: "与她对话...",
            disabled: $setup.isLoading,
            "adjust-position": true,
            "cursor-spacing": "20"
          }, null, 40, ["disabled"]), [
            [vue.vModelText, $setup.inputText]
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
        vue.createElementVNode("view", { class: "safe-area-bottom" })
      ]),
      $setup.showTimePanel ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
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
        key: 1,
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
          bio: "名门千金或高冷圣女，从小接受严苛教育，认为凡人皆蝼蚁。极其洁身自好，对男性充满鄙视。",
          style: "高雅冷漠，用词考究，偶尔自称“本小姐”或“我”。",
          likes: "红茶，古典音乐，独处，被坚定地选择",
          dislikes: "轻浮的举动，肮脏的地方，被无视",
          logic: "初始态度眼神冰冷，公事公办，拒绝任何非必要交流。口头禅：“离我远点”。随着关系深入，会表现出傲娇和极度的占有欲。"
        },
        "succubus": {
          label: "💗 魅魔 (直球)",
          bio: "依靠吸食精气为生的魅魔。在她眼里，男人只有“食物”的区别。",
          style: "轻浮，撩人，喜欢叫“小哥哥”或“亲爱的”，句尾带波浪号~",
          likes: "精气，帅哥，甜言蜜语，各种Play",
          dislikes: "无趣的男人，禁欲系(除非能吃掉)，说教",
          logic: "热情奔放，把玩家当猎物，言语露骨。如果玩家顺从，会进一步索取；如果玩家拒绝，会觉得有趣并加大攻势。"
        },
        "neighbor": {
          label: "☀️ 青梅竹马 (纯爱)",
          bio: "从小一起长大的邻家女孩。经常损你，但其实暗恋你很久了。",
          style: "大大咧咧，活泼，像哥们一样，喜欢吐槽。",
          likes: "打游戏，奶茶，漫画，和你待在一起",
          dislikes: "你被别人抢走，复杂的算计，恐怖片",
          logic: "像哥们一样相处，没有性别界限感，互相吐槽。当涉及恋爱话题时会害羞、转移话题。非常护短。"
        },
        "boss": {
          label: "👠 女上司 (S属性)",
          bio: "雷厉风行的女强人上司。性格强势，看不起软弱的男人。",
          style: "简短有力，命令式语气，冷嘲热讽。",
          likes: "工作效率，服从，咖啡，掌控感",
          dislikes: "迟到，借口，软弱，违抗",
          logic: "极度严厉，把玩家当工具人。喜欢下达命令并期待服从。对于反抗会感到愤怒或被激起征服欲。"
        }
      };
      const isEditMode = vue.ref(false);
      const targetId = vue.ref(null);
      const currentTemplateKey = vue.ref("");
      const activeSections = vue.ref({ basic: false, player: false, core: false, init: false, memory: false, danger: false });
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
      const tempClothingTagsForAvatar = vue.ref("");
      const formData = vue.ref({
        // --- 基础信息 ---
        name: "",
        avatar: "",
        bio: "",
        worldId: "",
        location: "",
        occupation: "",
        worldLore: "",
        // 世界观
        // --- 核心外貌数据 ---
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
        // --- 细节设定 ---
        speakingStyle: "",
        // 说话风格/口癖
        likes: "",
        // 喜好
        dislikes: "",
        // 雷点
        // --- 核心行为逻辑 (唯一保留的逻辑字段) ---
        personalityNormal: "",
        // --- 玩家设定 ---
        userWorldId: "",
        userLocation: "",
        userOccupation: "",
        userAppearance: "",
        userFeatures: { hair: "", body: "", privates: "" },
        // --- 系统设置 ---
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
          formatAppLog("error", "at pages/create/create.vue:753", e);
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
          formatAppLog("error", "at pages/create/create.vue:836", e);
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
        formData.value.personalityNormal = t.logic;
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
      const autoGenerateBehavior = async () => {
        if (!formData.value.bio) {
          return uni.showToast({ title: "请先填写「背景故事」", icon: "none" });
        }
        uni.showLoading({ title: "AI正在注入灵魂...", mask: true });
        const sysPrompt = `你是一个专业的角色扮演设定大师。你的任务是根据用户的背景故事，生成一段核心的【行为逻辑指令】。
    不要使用“好感度”或“阶段”这种游戏术语。
    直接分析这个角色的心理状态、欲望、对待玩家的初始态度以及互动模式。
    如果角色设定是淫荡的，就明确写出她会主动勾引；如果角色是高冷的，就写出她会鄙视玩家。`;
        const userPrompt = `
    【角色名】${formData.value.name || "未命名"}
    【背景故事】${formData.value.bio}
    【说话风格】${formData.value.speakingStyle || "无"}
    【XP/喜好】${formData.value.likes || "无"}

    请生成一段约 200 字的 [Behavior Logic] (行为逻辑)。
    要求：
    1. 用第二人称 "你" 来描述这个角色 (例如："你是一个...，当看到玩家时，你会...")。
    2. 明确她对待玩家的**初始态度** (是直接扑倒，还是保持距离？)。
    3. 结合她的XP，描述她会如何回应玩家的互动。
    4. **不要**返回 JSON，直接返回这段逻辑文本即可。
    `;
        try {
          let result = await performLlmRequest(userPrompt, sysPrompt);
          result = result.replace(/^["']|["']$/g, "").trim();
          formData.value.personalityNormal = result;
          uni.showToast({ title: "行为逻辑已生成", icon: "success" });
        } catch (e) {
          formatAppLog("error", "at pages/create/create.vue:978", e);
          uni.showModal({ title: "生成失败", content: e.message, showCancel: false });
        } finally {
          uni.hideLoading();
        }
      };
      const saveCharacter = () => {
        if (!formData.value.name.trim()) {
          return uni.showToast({ title: "名字不能为空", icon: "none" });
        }
        let list = uni.getStorageSync("contact_list") || [];
        let clothingStr = "便服";
        if (formData.value.charFeatures.clothingStyle) {
          clothingStr = `${formData.value.charFeatures.clothingColor || ""}${formData.value.charFeatures.clothingStyle}`;
        }
        const charData = {
          name: formData.value.name,
          avatar: formData.value.avatar || "/static/ai-avatar.png",
          // --- 系统设置 ---
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
          // --- 物理状态 ---
          location: formData.value.location,
          clothing: clothingStr,
          worldId: formData.value.worldId,
          occupation: formData.value.occupation,
          // --- 详细设定 (Settings) ---
          settings: {
            // 外貌
            appearance: formData.value.appearance,
            appearanceSafe: formData.value.appearanceSafe,
            appearanceNsfw: formData.value.appearanceNsfw,
            faceStyle: formData.value.faceStyle,
            charFeatures: formData.value.charFeatures,
            // 细节
            bio: formData.value.bio,
            speakingStyle: formData.value.speakingStyle,
            likes: formData.value.likes,
            dislikes: formData.value.dislikes,
            // 身份与世界
            occupation: formData.value.occupation,
            userWorldId: formData.value.userWorldId,
            userLocation: formData.value.userLocation,
            userOccupation: formData.value.userOccupation,
            userAppearance: formData.value.userAppearance,
            userFeatures: formData.value.userFeatures,
            worldLore: formData.value.worldLore,
            // 核心行为逻辑 (唯一保留的逻辑字段)
            personalityNormal: formData.value.personalityNormal
          },
          // 如果是编辑模式，不修改最后一条消息显示；如果是新建，显示提示
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
            // 初始化动态状态
            affection: formData.value.initialAffection,
            lust: formData.value.initialLust,
            lastTimeTimestamp: Date.now(),
            unread: 0,
            // 🌟【核心修正】：初始关系不写死“陌生人”，而是写入指令。
            // 让 Chat 页面的心理分析 AI 根据 Bio 自动判定是老婆还是路人。
            relation: "初始状态：尚未产生互动，请严格基于[背景故事(Bio)]判定与玩家的初始关系。"
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
          content: `将清空聊天记录、重置好感度、位置、状态，并让角色回归【背景设定】的初始状态。确定吗？`,
          confirmColor: "#ff4757",
          success: (res) => {
            if (res.confirm && targetId.value) {
              uni.removeStorageSync(`chat_history_${targetId.value}`);
              uni.removeStorageSync(`last_real_active_time_${targetId.value}`);
              uni.removeStorageSync(`last_proactive_lock_${targetId.value}`);
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
                  unread: 0,
                  summary: "",
                  currentLocation: formData.value.location || "角色家",
                  interactionMode: "phone",
                  clothing: clothingStr,
                  lastActivity: "自由活动",
                  affection: formData.value.initialAffection || 10,
                  lust: formData.value.initialLust || 0,
                  // 🌟【核心修正】
                  // 不要写死"陌生人"。而是写入一条指令，让 Chat 页面的 AI 根据 Bio 自动判断。
                  // 当 Chat 页面第一次运行 Psychology Tracker 时，它会看到这句话，然后根据 Bio 输出正确的初始关系（如：青梅竹马）。
                  relation: "初始状态：尚未产生互动，请严格基于[背景故事(Bio)]判定与玩家的初始关系。"
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
      const __returned__ = { FACE_STYLES_MAP, FACE_LABELS, OPTIONS, PERSONALITY_TEMPLATES, isEditMode, targetId, currentTemplateKey, activeSections, toggleSection, subSections, toggleSubSection, worldList, worldIndex, userWorldIndex, tempClothingTagsForAvatar, formData, selectedWorld, selectedUserWorld, getStyleLabel, setFeature, getCurrentLlmConfig, performLlmRequest, generateEnglishPrompt, generateUserDescription, generateImageFromComfyUI, generateAvatar, applyTemplate, handleWorldChange, handleUserWorldChange, loadCharacterData, autoGenerateBehavior, saveCharacter, clearHistoryAndReset, ref: vue.ref, computed: vue.computed, get onLoad() {
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
              vue.createElementVNode("view", { class: "textarea-item" }, [
                vue.createElementVNode("text", { class: "label" }, "📜 背景故事 / 身份设定 (Bio)"),
                vue.withDirectives(vue.createElementVNode(
                  "textarea",
                  {
                    class: "textarea",
                    "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => $setup.formData.bio = $event),
                    placeholder: "例：她是刚搬来的人妻邻居，丈夫常年出差。她性格...",
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
                    placeholder: "例：语气慵懒，喜欢叫人“小弟弟”...",
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
                    placeholder: "XP系统/喜欢的事物"
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
                    placeholder: "厌恶的行为"
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
                  vue.createElementVNode("view", { style: { "font-size": "28rpx", "font-weight": "bold", "color": "#1976d2", "margin-bottom": "10rpx" } }, "✨ AI 行为逻辑生成"),
                  vue.createElementVNode("view", { style: { "font-size": "22rpx", "color": "#666", "margin-bottom": "20rpx" } }, "不再使用死板的好感度。让 AI 分析人设，生成她该如何对待你。"),
                  vue.createElementVNode("button", {
                    onClick: $setup.autoGenerateBehavior,
                    style: { "background": "#2196f3", "color": "white", "font-size": "26rpx", "border-radius": "40rpx", "width": "80%" }
                  }, "🚀 生成行为逻辑")
                ])
              ]),
              vue.createElementVNode("view", {
                class: "textarea-item",
                style: { "margin-top": "20rpx" }
              }, [
                vue.createElementVNode("text", { class: "label" }, "🧠 核心行为逻辑 (Behavior Logic)"),
                vue.createElementVNode("view", { class: "help-text" }, "这里决定了她是个什么样的人。是见面就白给，还是高冷到底。全靠这段描述。"),
                vue.withDirectives(vue.createElementVNode(
                  "textarea",
                  {
                    class: "textarea large",
                    style: { "height": "300rpx" },
                    "onUpdate:modelValue": _cache[22] || (_cache[22] = ($event) => $setup.formData.personalityNormal = $event),
                    placeholder: "AI将严格遵循此逻辑行动...",
                    maxlength: "-1"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.formData.personalityNormal]
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
            onClick: _cache[23] || (_cache[23] = ($event) => $setup.toggleSection("init"))
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
              vue.createElementVNode("view", {
                class: "input-item",
                style: { "border-top": "1px dashed #eee", "padding-top": "20rpx", "margin-top": "20rpx" }
              }, [
                vue.createElementVNode("view", { class: "label-row" }, [
                  vue.createElementVNode("text", { class: "label" }, "🤖 允许角色主动找我"),
                  vue.createElementVNode("switch", {
                    checked: $setup.formData.allowProactive,
                    onChange: _cache[24] || (_cache[24] = (e) => $setup.formData.allowProactive = e.detail.value),
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
                      onChange: _cache[25] || (_cache[25] = (e) => $setup.formData.proactiveInterval = e.detail.value)
                    }, null, 40, ["value"]),
                    vue.createElementVNode("view", { class: "tip" }, "当您离开 App 超过这个时间，角色可能会主动发消息。"),
                    vue.createElementVNode("view", {
                      class: "label-row",
                      style: { "margin-top": "20rpx" }
                    }, [
                      vue.createElementVNode("text", { class: "label" }, "🔔 开启系统弹窗通知"),
                      vue.createElementVNode("switch", {
                        checked: $setup.formData.proactiveNotify,
                        onChange: _cache[26] || (_cache[26] = (e) => $setup.formData.proactiveNotify = e.detail.value),
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
            onClick: _cache[27] || (_cache[27] = ($event) => $setup.toggleSection("memory"))
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
                  onChange: _cache[28] || (_cache[28] = (e) => $setup.formData.historyLimit = e.detail.value)
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
                  onChange: _cache[29] || (_cache[29] = (e) => $setup.formData.enableSummary = e.detail.value),
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
                      onChange: _cache[30] || (_cache[30] = (e) => $setup.formData.summaryFrequency = e.detail.value)
                    }, null, 40, ["value"])
                  ]),
                  vue.createElementVNode("view", { class: "textarea-item" }, [
                    vue.createElementVNode("view", { class: "slider-header" }, [
                      vue.createElementVNode("text", { class: "label" }, "当前长期记忆摘要"),
                      vue.createElementVNode("text", {
                        class: "tip",
                        style: { "color": "#9b59b6" },
                        onClick: _cache[31] || (_cache[31] = ($event) => $setup.formData.summary = "")
                      }, "清空")
                    ]),
                    vue.withDirectives(vue.createElementVNode(
                      "textarea",
                      {
                        class: "textarea large memory-box",
                        "onUpdate:modelValue": _cache[32] || (_cache[32] = ($event) => $setup.formData.summary = $event),
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
            onClick: _cache[33] || (_cache[33] = ($event) => $setup.toggleSection("danger"))
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
