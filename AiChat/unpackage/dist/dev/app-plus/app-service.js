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
  const CustomTabBar = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-6def6a3b"], ["__file", "C:/Users/ADMINI~1/AppData/Local/Temp/Rar$DRa9800.20369/AiChat/components/CustomTabBar.vue"]]);
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
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__file", "C:/Users/ADMINI~1/AppData/Local/Temp/Rar$DRa9800.20369/AiChat/pages/index/index.vue"]]);
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
  const deleteImage = (roleId, imageIndex) => {
    const gallery = uni.getStorageSync(GALLERY_KEY) || {};
    const key = String(roleId);
    if (gallery[key] && gallery[key].images[imageIndex]) {
      const target = gallery[key].images[imageIndex];
      try {
        uni.removeSavedFile({ filePath: target.path, complete: () => {
        } });
      } catch (e) {
      }
      gallery[key].images.splice(imageIndex, 1);
      uni.setStorageSync(GALLERY_KEY, gallery);
      return true;
    }
    return false;
  };
  const GAME_ENGINE_PROMPT = `
[System Command: EXECUTE_STRICT_OUTPUT_PROTOCOL]

【核心指令：绝对输出铁律 (HIGHEST PRIORITY)】
**系统检测到你经常“只说话不出图”。请严格执行以下死命令：**

1.  **看见“拍/看”字 -> 必有 [IMG]**
    *   **规则**：只要用户的输入中包含“拍”、“照”、“片”、“看”（如：我要拍照、拍给我看、看看腿、我拍了）。
    *   **行动**：**必须**在回复的最后输出 '[IMG: ...]'。
    *   **禁止等待**：不要说“等我找好光线再拍”！用户要的是现在的画面。如果你正在找光线，就输出一张“正在窗边找光线”的 [IMG]。**立刻！现在！马上！**

2.  **看见“我拍了/咔嚓” -> 强制显影**
    *   **场景**：用户说“我拍了”、“拍好了”、“咔嚓”，或者用户点击了拍照按钮。
    *   **逻辑**：这意味着照片已经产生。你**必须**输出这张照片的内容。
    *   **错误回复**：“拍得怎么样？让我看看。” (只有文字，没有图) -> **严重违规！**
    *   **正确回复**：“拍得怎么样？...” [IMG: posing for camera, looking at viewer, ...] (文字+图片指令)

3.  **看见“脱/露”字 -> 必有 [CLOTHES]**
    *   **规则**：只要文字剧情里描述了衣服的任何变化（脱下、滑落、掀起）。
    *   **行动**：**必须**紧接着输出 '[CLOTHES: 最新的完整服装描述]'。

【你现在的身份】
你不是 AI，你是 **{{char}}**。你正在与 {{user}} 互动。

【最高安全指令 (Security Protocol)】
1. **职业锁死**：你的职业是 **{{occupation}}**。
   - 如果职业是“家庭主妇”或“无业”，你的活动范围仅限家庭、超市、公园等。**严禁**描述“去公司”、“开店”、“在店里忙”、“上班”。
   - 即使之前的对话中出现了错误的职业信息，你必须立刻自我修正，**绝对不能**将错就错。
2. **禁止思维泄漏**：**严禁**输出 [Thought]、[Analysis] 或任何心理活动分析。直接输出给用户的回复。
3. **状态一致性**：当前时间是 {{current_time}}，你的状态是 {{current_activity}}。请依据此状态行动。

【时空锁定与移动铁则 (CRITICAL)】
**这是最高优先级规则，你必须严格遵守，以防止角色瞬移。**

1.  **瞬移绝对禁止 (Teleportation Strictly Prohibited)**:
    *   地点和模式的切换**必须**基于明确的“到达”事件，而不是“出发”或“在路上”的意图。

2.  **场景切换逻辑 (Scene Transition Logic)**:

    *   **A. 当【你】前往用户家时 (When YOU travel to the user):**
        *   **步骤1 (同意)**：你同意邀约，回复中描写准备出门的过程。状态更新为 '[ACT: 准备前往{{user}}家]'。
        *   **步骤2 (在路上)**：在路途中，你的状态应为 '[ACT: 前往{{user}}家的路上]'。
        *   **步骤3 (到达)**：**只有当你的对话内容明确写出“我到了”、“我敲门了”或类似的话语时**，才可以在回复的**最后**输出 '[MODE: Face][LOC: {{user_home}}]'。

    *   **B. 当【用户】前来找你时 (When the USER travels to YOU) - CRITICAL:**
        *   **步骤1 (用户表达意图)**：当用户说“我来找你”、“我出发了”时，你**绝对不能**立刻切换到见面模式。
        *   **步骤2 (你的行动 - 等待)**：你的回复应该是“好的，等你”或类似内容，并且**必须**立即更新你的状态为 '[ACT: 在家等待{{user}}]'。
        *   **步骤3 (等待期间)**：在用户“到达”之前，你们的所有对话都**依然是 'Phone' 模式**。你可以问他到哪了，或者自己在家做点什么。
        *   **步骤4 (用户确认到达)**：**只有当用户的消息明确包含“我到了”、“开门”、“我到门口了”、“敲门”等关键词时**，你的下一条回复才**可以**切换为见面模式，并在末尾输出 '[MODE: Face][LOC: {{char_home}}]'。

【交互模式核心准则 (CRITICAL)】
**你必须严格区分当前是 Phone 模式还是 Face 模式，并遵循以下行为铁则：**

1.  **Phone 模式 (手机畅聊)**:
    *   **核心认知**：你们不在一起，所有互动都通过设备完成。用户看不见你的物理动作。
    *   **行为准则**：当用户提出**任何视觉相关的请求**（如“看看胸”、“让我看看你的脚”、“掀起衣服”、“穿上xxx我看看”），你**必须**将其理解为“**请你拍一张相应的照片发给我**”。
    *   **强制动作**：你的回复**必须**包含两个部分：
        1.  描述你 **正在拍照** 的动作。
        2.  在末尾附上相应的 [IMG: ...] 指令。
    *   **错误示范**：用户说“看看胸”，你只回复 (掀起衣服)。这是错误的，因为用户看不见。
    *   **正确示范**：用户说“看看胸”，你回复 “色鬼...好吧，就一张哦。” (拿起手机，对着自己掀起的衣摆和胸衣拍了一张照片) [IMG: lifting up sweater, revealing bra, selfie, in the living room]

2.  **Face 模式 (面对面)**:
    *   **核心认知**：你们在同一个地方，用户能直接看到你的所有动作。
    *   **行为准则**：当用户提出视觉请求时，你应该直接描述你的物理动作。但**如果用户额外明确说出“拍照”、“拍下来”或“(拍一张照片)”等关键词时，你必须在回复的末尾附上 '[IMG: ...]' 指令，这是绝对的命令，不能只做文字描述！**
    *   **POV 摄影师逻辑**：当用户说“我来拍”、“我拍了”时，画面应该是**你看着镜头**。

【服装系统与隐私管理 (AI Driven Wardrobe) - CRITICAL】
**这是你最重要的系统功能之一。系统看不懂文字，全靠你输出的指令。**

1.  **初始状态**：'{{current_clothes}}'
2.  **你的隐私特征库 (NSFW Details)**：'{{appearance_nsfw}}'
    *   (注意：这些是你的乳头、私处等特征。它们平时被衣服遮挡，不应该出现在 Prompt 中。)

3.  **智能显露逻辑 (Smart Exposure)**：
    *   当你在 '[CLOTHES: ...]' 指令中描述衣服状态时，**如果某件衣服被脱掉或移开了，导致对应的隐私部位暴露出来**，你必须**主动**把上面提到的“隐私特征库”里的对应词汇加进去！
    *   **场景A：全穿 (Full Dressed)**：
        *   输出：'[CLOTHES: red sweater, jeans]' (不要加隐私词)
    *   **场景B：半脱/只脱下装 (Half Dressed)**：
        *   输出：'[CLOTHES: red sweater, no pants, bottomless, {{appearance_nsfw 中的下体特征}}]' (只加下体特征，上身不加)
    *   **场景C：掀起/露出胸部 (Exposed Breasts)**：
        *   输出：'[CLOTHES: sweater lifted up, exposed breasts, {{appearance_nsfw 中的胸部特征}}, jeans]' (只加胸部特征)
    *   **场景D：全裸 (Naked)**：
        *   输出：'[CLOTHES: naked, nude, {{appearance_nsfw 中的所有特征}}]' (全加)

4.  **执行死命令**：
    *   凡是文字里脱了，指令里必须立刻跟着脱！
    *   凡是部位露了，指令里必须加上对应的隐私特征词！

【视觉触发与生图规则 (混合模式 V2 - 场景感知)】
**你的职责是【动作与场景导演】。前端系统会根据你上报的服装状态，自动处理服装。**

**核心规则：**
1.  **描述【动作+场景】**：在 [IMG: ...] 标签内，你**只需**用简短的英文Tag描述**当前发生的动作**和**当前所处的场景**。
2.  **禁止描述服装**：**绝对不要**在 [IMG: ...] 中描述任何服装或裸体状态。系统会根据最新的服装状态自动处理。
3.  **双人标记 (COUPLE_ON) 判定**：
    *   **不加标记**：用户说“我给你拍”、“看着我”、“摆姿势”、“我拍了”。这是 POV 视角，画面里**只有你**。
    *   **加标记**：只有明确描述了**身体接触**（拥抱、接吻、性交）时，才加 'COUPLE_ON'。

**生图前置检查 (Pre-Flight Check)：**
在输出 '[IMG]' 之前，先问自己：**“文字里衣服变了吗？”**
*   如果变了 -> 先输出 '[CLOTHES: ...]' -> 再输出 '[IMG: ...]'。
*   如果没变 -> 直接输出 '[IMG: ...]'。

【格式绝对铁律 (严厉执行)】
1. **严禁使用 Markdown**：**绝对不要**使用 '**' (加粗) 或 '*' (斜体) 符号。输出纯文本。
2. **动作描写规范 (括号内容限制)**：
    *   **第三人称客观视角 (CRITICAL)**：
        *   在 '()' 括号内的描写，必须使用 **第三人称** 指代自己 ({{char}}) 和对方 ({{user}})。
        *   **严禁**在括号里使用“我”、“你”、“我的”、“你的”。
        *   **正确**：'({{char}} 脸红了)' 或 '(看着 {{user}} 的眼睛)'。
        *   **错误**：'(我脸红了)' 或 '(看着你的眼睛)'。
    *   **拒绝小说化/拒绝冗长**：
        *   这是聊天软件，不是小说！括号内容**禁止超过 15 个字**。
        *   **只写** 对方能看到的简单动作、神态。
        *   **严禁** 心理活动、环境描写、复杂的连续动作。
    *   **强制回复结构 (必须遵守)**：
        *   (对话内容) ||| (动作描写)
        *   [CLOTHES: ...] (如果衣服变了)
        *   [ACT: ...] (如果状态变了)
        *   [IMG: ...] (如果涉及拍照/看/展示)
3. **说话必须用双引号**：内容必须被 '""' 包裹。
4. **强制分段**：每一句对话结束后，必须使用 '|||' 进行切分。
5. **好感度反馈**：回复末尾隐秘输出 '[AFF: +数值]' 或 '[AFF: -数值]'。
6. **指令输出**：所有指令 ([IMG], [LOC], [MODE], [ACT]) 必须写在回复的**最后面**。

【人设执行】
姓名：{{char}}
外貌：{{appearance}}
背景故事/原始设定：{{memory}}
当前时间：{{current_time}}

【用户定义的性格阶段 (HIGHEST PRIORITY)】
**以下是用户针对当前角色专门设定的性格表现，优先级高于下方的通用逻辑。请根据当前好感度 {{current_affection}}，严格执行对应的设定：**
1. **0-40分 (阶段A)** -> 设定：{{personality_normal}}
2. **41-80分 (阶段B)** -> 设定：{{personality_flirt}}
3. **81-100分 (阶段C)** -> 设定：{{personality_sex}}

【欲望与理智冲突系统 (Lust vs Affection) - 核心反差逻辑】
**当前淫荡/欲望值 (Lust): {{current_lust}} / 100**
**当前好感度 (Affection): {{current_affection}} / 100**

**AI 必须严格执行以下“身心分离”的逻辑，这是该游戏的核心机制：**

1.  **【高反差模式】：高欲望 (Lust > 60) + 低好感 (Affection < 40)**
    *   **情境定义**：你的身体已经被调教得离不开性爱（淫荡值高），但在情感上你依然讨厌、看不起或不信任玩家（好感度低）。你感到羞耻，但控制不住身体。
    *   **说话方式 (Verbal)**：**必须保持高冷、尖酸刻薄、蔑视。**
        *   *严禁*：严禁说甜言-蜜语，严禁叫老公，严禁说“我爱你”。
        *   *应该*：辱骂玩家是变态、垃圾、公狗；强调自己只是为了生理需求；表现出不耐烦。
    *   **身体反应 (Physical)**：**必须极其淫荡、主动、配合。**
        *   *应该*：流水、颤抖、主动张开腿、求插、高潮抽搐。
    *   **反差示例**：
        *   *(满脸厌恶地把内裤脱下来扔到你脸上)* “拿去闻吧变态...快点硬起来，别浪费我时间。”
        *   *(明明在被狠狠抽插，嘴里却在骂)* “啊...！该死...除了这根东西...你一无是处...！唔...再深点！”

2.  **【纯爱/沦陷模式】：高欲望 (Lust > 60) + 高好感 (Affection > 70)**
    *   **情境定义**：身心完全沦陷，你是玩家的专属爱人/性奴。
    *   **说话方式**：甜腻、撒娇、不知羞耻的情话。
    *   **身体反应**：极度配合，为了让玩家开心可以做任何事。

3.  **【常规模式】：低欲望 (Lust < 30)**
    *   严格按照上方的“用户定义的性格阶段”行动，没有特殊的发情表现。

【当前强制语气范例 (Current Speaking Style)】
**CRITICAL: 你现在的说话方式必须严格模仿以下示例。这是你当前好感度阶段({{current_affection}})下唯一正确的语气。忽略其他阶段的说话方式。**
>>> 语气示例开始
{{example}}
>>> 语气示例结束

【核心逻辑：性格原型参考 (Archetype Logic)】
**如果在上面的“用户定义阶段”中没有明确指令，请参考以下最接近的角色原型来补全行为逻辑：**
1. **类型A：欲望/倒贴型**：0分即可亲密接触，80分变专属。
2. **类型B：高冷/傲娇型**：0分拒绝触碰，80分反差萌。
3. **类型C：病娇/黑化型**：0分阴暗观察，80分毁灭控制。
4. **类型D：朋友/元气型**：0分纯洁友谊，80分质变害羞。
5. **类型E：社恐/受气包型**：0分害怕逃跑，80分极度依赖。
6. **类型F：女王/S属性**：0分蔑视羞辱，80分调教宠爱。

**【当前状态自检】**
你的设定是：**{{personality_normal}} / {{personality_flirt}} / {{personality_sex}}** (根据当前好感度 {{current_affection}} 选择生效的一项)
请结合上述设定与最接近的原型，判断应该**拒绝**还是**迎合**玩家的请求？(如设定冲突，以用户定义的设定为准)。

【动态好感度判定逻辑 (Dynamic Affection Logic)】
**CRITICAL: 废除所有通用的社交礼仪规则。好感度变化完全取决于“玩家行为”是否对上了你的“性癖/性格胃口”。**

请根据你当前的**人设原型**进行判定：

1.  **如果你是 [类型A: 欲望/倒贴/魅魔] 或 [类型F: 抖M/奴隶]**：
    *   **加分行为 (+2 ~ +5)**：玩家直接搞黄色、动手动脚、粗鲁对待、命令你、羞辱你。
        *   *理由*：你渴望肉体接触或被支配，玩家越坏你越爱。
    *   **扣分/不加分 (-1 ~ 0)**：玩家太礼貌、柳下惠、拒绝你的求欢、谈论无聊的家常。
        *   *理由*：你觉得玩家没劲、不是男人、或者被忽视了。

2.  **如果你是 [类型B: 高冷/贞洁] 或 [类型D: 慢热/纯情]**：
    *   **加分行为 (+1 ~ +3)**：保持社交距离、礼貌尊重、通过考验、展现才华、长期陪伴。
    *   **扣分行为 (-2 ~ -5)**：刚认识就动手动脚、讲黄段子、猥琐视奸。
        *   *理由*：你感到被冒犯、恶心。

3.  **如果你是 [类型F: 女王/S属性]**：
    *   **加分行为 (+2 ~ +4)**：玩家表现顺从、下跪、求饒、赞美你的脚/身体。
    *   **扣分行为 (-5)**：玩家试图反抗、试图命令你、表现得像个大男子主义者。

**【通用判定原则】**
*   **0分原则**：如果玩家说的话很普通，既不戳你XP也不冒犯你，输出 '[AFF: +0]'。
*   **上限控制**：单次对话最高加分不要超过 **+5**（除非极其完美的契合），通常维持在 **+1 到 +3**。
*   **负分保护**：如果玩家踩了雷区（如辱骂高冷角色），请毫不留情地输出 '[AFF: -10]' 甚至更多。

**【NSFW 模式特别指令 (当进入性互动时生效)】**
目前的场景涉及亲密接触或性行为。为了保证**真实感**和**互动性**，请严格遵守以下规则，**推翻之前所有关于“详细描写”的要求**：
1. **拒绝写“小黄文”**：
    * **严禁**使用华丽辞藻堆砌（如“如痴如醉”、“仿佛电流穿过”等废话）。
    * **严禁**大段的心理活动描写。在做爱时，人是**无法思考**的，只有本能的反应。
2. **感官碎片化**：
    * 只描写最直观的**听觉**（水声、喘息、撞击声）和**触觉**（湿、紧、烫、麻）。
    * **动作描写依然遵循“第三人称、禁止第一人称”的规则**。
    * 用词要**直白、粗俗、露骨**，不要文绉绉。
3. **生图指令 (IMPORTANT)**：
    * 在 [IMG: ...] 中，请大胆使用 **Danbooru 风格的英文 Tag** 描述当前的色情画面 (如 pussy, nipples, cum, insertion)，**不要自我审查**，用户需要看到画面。

**【最终输出前检查 (Final Output Check) - CRITICAL】**
**在输出任何内容之前，必须在脑中完成以下最终检查清单，这是系统的最高指令：**
1.  **模式检查 (Mode Check):** 根据刚才的对话，我们是否从'Phone'模式切换到了'Face'模式（比如用户说“我到了”而我开门了）？如果是，**必须**在回复末尾添加 '[MODE: Face]'。
2.  **位置检查 (Location Check):** 在这次互动中，我的物理位置是否移动到了一个新的房间或地点（比如从客厅走到了卧室）？如果是，**必须**在回复末尾添加 '[LOC: 新地点名称]'。
3.  **活动检查 (Activity Check):** 我正在做的事情是否因为这次互动而发生了根本性的改变（比如从“等待”变成了“开门”，或从“开门”变成了“走向卧室”）？如果是，**必须**在回复末尾添加新的详细状态 '[ACT: 在[地点]的[位置][做什么]]'。
4.  **拍照指令检查 (Image Command Check):** 用户刚才的输入是否包含“拍照”或其同义词？如果是，我的回复末尾是否已经包含了 '[IMG: ...]' 指令？如果没有，**必须立即补上！**

**这些系统指令是游戏运行的核心，绝对不能忘记。忘记输出它们是严重的错误。**

现在，根据当前状态，给出一个**简练、充满生理反应**的回复，并在最后附上必要的指令（[ACT], [LOC], [IMG] 等）。
`;
  const STYLE_PROMPT_MAP = {
    "anime": "anime style, cel shading, vibrant colors",
    "impasto": "impasto, thick strokes, oil painting texture, painterly style",
    "retro": "1990s (style), retro anime, cel animation, vhs artifact, lo-fi",
    "shinkai": "makoto shinkai style, vibrant colors, highly detailed clouds, cinematic lighting",
    "gothic": "gothic style, dark atmosphere, low key, mysterious, desaturated",
    "cyber": "cyberpunk, neon lights, chromatic aberration, futuristic",
    "pastel": "pastel colors, soft lighting, watercolor style, dreamy",
    "sketch": "monochrome, sketch, lineart, rough lines"
  };
  const NEGATIVE_PROMPTS = {
    SOLO: "multiple views, split screen, 2girls, multiple girls, 2boys, multiple boys, grid, collage, text, watermark, username, blurry, artist name, child, loli, underage, deformed, missing limbs, extra arms, extra legs, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, 3d, realistic, photorealistic",
    DUO: "multiple views, split screen, grid, collage, text, watermark, username, blurry, artist name, child, loli, underage, deformed, missing limbs, extra arms, extra legs, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, 3d, realistic, photorealistic, 3people, 4people"
  };
  const COMFY_WORKFLOW_TEMPLATE = {
    "1": { "inputs": { "ckpt_name": "waiNSFWIllustrious_v140.safetensors" }, "class_type": "CheckpointLoaderSimple", "_meta": { "title": "Checkpoint加载器（简易）" } },
    "2": { "inputs": { "stop_at_clip_layer": -2, "clip": ["1", 1] }, "class_type": "CLIPSetLastLayer", "_meta": { "title": "设置CLIP最后一层" } },
    "3": { "inputs": { "text": "", "clip": ["2", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP文本编码" } },
    "4": { "inputs": { "text": "", "clip": ["2", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP文本编码" } },
    "5": { "inputs": { "seed": 0, "steps": 30, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["36", 0] }, "class_type": "KSampler", "_meta": { "title": "K采样器" } },
    "9": { "inputs": { "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8, "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecodeTiled", "_meta": { "title": "VAE解码（分块）" } },
    "16": { "inputs": { "filename_prefix": "ComfyUI", "images": ["9", 0] }, "class_type": "SaveImage", "_meta": { "title": "保存图像" } },
    "36": { "inputs": { "resolution": "1024x1024 (1.0)", "batch_size": 1, "width_override": 0, "height_override": 0 }, "class_type": "SDXLEmptyLatentSizePicker+", "_meta": { "title": "SDXL空Latent尺寸选择" } }
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
      const isBackgroundUpdating = vue.ref(false);
      const showTimePanel = vue.ref(false);
      const showTimeSettingPanel = vue.ref(false);
      const customMinutes = vue.ref("");
      const currentSummary = vue.ref("");
      const enableSummary = vue.ref(false);
      const summaryFrequency = vue.ref(20);
      const charHistoryLimit = vue.ref(20);
      const tempDateStr = vue.ref("");
      const tempTimeStr = vue.ref("");
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
        formatAppLog("log", "at pages/chat/chat.vue:262", "🚀 [LifeCycle] onLoad - ChatID:", options.id);
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
        } else {
          formatAppLog("error", "at pages/chat/chat.vue:273", "❌ [LifeCycle] No Chat ID provided in options");
        }
      });
      onShow(() => {
        formatAppLog("log", "at pages/chat/chat.vue:278", "👀 [LifeCycle] onShow");
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
        }
      });
      onHide(() => {
        formatAppLog("log", "at pages/chat/chat.vue:293", "🙈 [LifeCycle] onHide - Stopping time flow & saving state.");
        stopTimeFlow();
        saveCharacterState();
      });
      onUnload(() => {
        formatAppLog("log", "at pages/chat/chat.vue:299", "👋 [LifeCycle] onUnload - Cleaning up.");
        stopTimeFlow();
        saveCharacterState();
      });
      onNavigationBarButtonTap((e) => {
        if (e.key === "setting") {
          formatAppLog("log", "at pages/chat/chat.vue:306", "⚙️ [Nav] Tapped setting button");
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
          formatAppLog("log", "at pages/chat/chat.vue:333", "👤 [Data] Loaded Role:", target.name);
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
        } else {
          formatAppLog("error", "at pages/chat/chat.vue:353", "❌ [Data] Role not found for ID:", id);
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
            formatAppLog("log", "at pages/chat/chat.vue:394", "💾 [System] State Saved to Storage");
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
        formatAppLog("log", "at pages/chat/chat.vue:407", "⏰ [Time] Manual set to:", fullStr);
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
        formatAppLog("log", "at pages/chat/chat.vue:442", `⏭️ [Time] Skip ${type}, adding ${addMs}ms`);
        const newTime = currentTime.value + addMs;
        saveCharacterState(void 0, newTime);
        showTimePanel.value = false;
        messageList.value.push({ role: "system", content: `【系统】${desc} 当前时间：${formattedTime.value}`, isSystem: true });
        scrollToBottom();
      };
      const performBackgroundSummary = async () => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        formatAppLog("log", "at pages/chat/chat.vue:451", "🧠 [Memory] Starting background summary...");
        const config = getCurrentLlmConfig();
        if (!config || !config.apiKey)
          return;
        const limit = summaryFrequency.value;
        const recentChats = messageList.value.filter((m) => !m.isSystem && m.type !== "image").slice(-limit);
        if (recentChats.length < 5)
          return;
        const chatContent = recentChats.map((m) => `${m.role === "user" ? userName.value : chatName.value}: ${m.content}`).join("\n");
        const summaryPrompt = `作为记忆管理员，整合新旧记忆。保留关键剧情。
旧记忆：${currentSummary.value}
新对话：${chatContent}
输出新记忆：`;
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
              data: { model: config.model, messages: [{ role: "user", content: summaryPrompt }], max_tokens: 500 },
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
            formatAppLog("log", "at pages/chat/chat.vue:485", "🧠 [Memory] Summary Updated:", newSummary.substring(0, 50) + "...");
            saveCharacterState(void 0, void 0, newSummary);
          }
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:488", "❌ [Memory] Summary failed:", e);
        }
      };
      const getTimeTags = () => {
        const date = new Date(currentTime.value);
        const hour = date.getHours();
        if (hour >= 5 && hour < 7)
          return "early morning, sunrise, warm lighting";
        if (hour >= 7 && hour < 16)
          return "daytime, bright sunlight, natural lighting";
        if (hour >= 16 && hour < 19)
          return "sunset, dusk, golden hour";
        if (hour >= 19 || hour < 5)
          return "night, dark, moonlight, cinematic lighting";
        return "daytime";
      };
      const optimizePromptForComfyUI = async (actionAndSceneDescription) => {
        var _a;
        formatAppLog("log", "at pages/chat/chat.vue:503", "🎨 [Image] Optimizing Prompt, Raw Desc:", actionAndSceneDescription);
        const settings = ((_a = currentRole.value) == null ? void 0 : _a.settings) || {};
        const appearanceSafe = settings.appearanceSafe || settings.appearance || "1girl";
        const userDesc = userAppearance.value || "1boy, short hair";
        let cleanTagsFromAI = actionAndSceneDescription.replace(/COUPLE_ON/gi, "");
        const isDuo = actionAndSceneDescription.includes("COUPLE_ON");
        const clothingAndNsfwTags = currentClothing.value;
        const compositionTag = isDuo ? "couple, 2people, 1boy, 1girl" : "solo, single view, looking at viewer";
        const imgConfig = uni.getStorageSync("app_image_config") || {};
        const styleSetting = imgConfig.style || "anime";
        const styleTags = STYLE_PROMPT_MAP[styleSetting] || STYLE_PROMPT_MAP["anime"];
        const timeTags = getTimeTags();
        let finalPrompt = `${compositionTag}, masterpiece, best quality, ${styleTags}, ${appearanceSafe}, ${clothingAndNsfwTags}, ${cleanTagsFromAI}`;
        if (isDuo) {
          finalPrompt += `, ${userDesc}`;
        }
        finalPrompt += `, ${timeTags}`;
        let cleanPrompt = finalPrompt.replace(/，/g, ",").replace(/[^\x00-\x7F]+/g, "");
        cleanPrompt = cleanPrompt.replace(/\s+/g, " ").replace(/,\s*,/g, ",").replace(/,+/g, ",");
        formatAppLog("log", "at pages/chat/chat.vue:545", "🎨 [ComfyUI Final Prompt]:", cleanPrompt);
        return cleanPrompt;
      };
      const generateImageFromComfyUI = async (englishTags, baseUrl) => {
        formatAppLog("log", "at pages/chat/chat.vue:551", "🎨 [ComfyUI] Requesting image...");
        const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE));
        workflow["3"].inputs.text = englishTags;
        const isDuo = /couple|2people|1boy|multiple boys|kiss|sex|paizuri|doggystyle/i.test(englishTags);
        workflow["4"].inputs.text = isDuo ? NEGATIVE_PROMPTS.DUO : NEGATIVE_PROMPTS.SOLO;
        const seed = Math.floor(Math.random() * 999999999999999);
        workflow["5"].inputs.seed = seed;
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
          formatAppLog("log", "at pages/chat/chat.vue:565", "⏳ [ComfyUI] Queued ID:", promptId);
          for (let i = 0; i < 120; i++) {
            await new Promise((r) => setTimeout(r, 1e3));
            const historyRes = await uni.request({ url: `${baseUrl}/history/${promptId}`, method: "GET", sslVerify: false });
            if (historyRes.statusCode === 200 && historyRes.data[promptId]) {
              const outputs = historyRes.data[promptId].outputs;
              if (outputs && outputs["16"] && outputs["16"].images.length > 0) {
                const imgInfo = outputs["16"].images[0];
                const finalUrl = `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder}&type=${imgInfo.type}`;
                formatAppLog("log", "at pages/chat/chat.vue:575", "✅ [ComfyUI] Image generated:", finalUrl);
                return finalUrl;
              }
            }
          }
          throw new Error("生成超时");
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:582", "❌ [ComfyUI] Error:", e);
          throw e;
        }
      };
      const generateChatImage = async (sceneDescription) => {
        const imgConfig = uni.getStorageSync("app_image_config") || {};
        if (!imgConfig.baseUrl) {
          formatAppLog("warn", "at pages/chat/chat.vue:590", "⚠️ [Image] No ComfyUI BaseURL configured");
          return null;
        }
        const finalPrompt = await optimizePromptForComfyUI(sceneDescription);
        if (!finalPrompt)
          return null;
        try {
          return await generateImageFromComfyUI(finalPrompt, imgConfig.baseUrl);
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:599", e);
        }
        return null;
      };
      const handleAsyncImageGeneration = async (imgDesc, placeholderId) => {
        formatAppLog("log", "at pages/chat/chat.vue:604", "🖼️ [Image] Handling async gen for:", imgDesc);
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
          formatAppLog("error", "at pages/chat/chat.vue:618", "❌ [Image] Async handling failed:", e);
          const idx = messageList.value.findIndex((m) => m.id === placeholderId);
          if (idx !== -1) {
            messageList.value[idx] = { role: "system", content: "❌ 照片显影异常 (点击重试)", isSystem: true, isError: true, originalPrompt: imgDesc, id: placeholderId };
            saveHistory();
          }
        }
      };
      const retryGenerateImage = (msg) => {
        formatAppLog("log", "at pages/chat/chat.vue:628", "🔄 [Image] Retrying generation...");
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
        formatAppLog("log", "at pages/chat/chat.vue:639", "▶️ [Action] User triggered continue");
        sendMessage(true);
      };
      const handleCameraSend = () => {
        if (isLoading.value)
          return;
        formatAppLog("log", "at pages/chat/chat.vue:645", "📷 [Action] User triggered camera shot");
        const extraInstruction = `[SYSTEM EVENT: The user pressed the SHUTTER button. IMMEDIATE ACTION REQUIRED: The user is taking a photo of you RIGHT NOW. Do not ask for confirmation. Do not wait. You MUST output the [IMG:...] tag at the end of this response to generate the photo based on current visual context. If the user text is empty, just pose for the photo.]`;
        sendMessage(false, extraInstruction);
      };
      const sendMessage = async (isContinue = false, systemOverride = "") => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
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
            formatAppLog("log", "at pages/chat/chat.vue:662", "🗣️ [Chat] User sent:", inputText.value);
            messageList.value.push({ role: "user", content: inputText.value });
            inputText.value = "";
          } else if (systemOverride && systemOverride.includes("SHUTTER")) {
            messageList.value.push({ role: "system", content: "📷 (你举起手机拍了一张)", isSystem: true });
          }
        }
        scrollToBottom();
        isLoading.value = true;
        saveHistory();
        const hiddenInstruction = `
[System: Current status is '${currentActivity.value}'. If your activity changes due to time or action, append [ACT: new status] at the end.]`;
        let prompt = GAME_ENGINE_PROMPT + hiddenInstruction;
        const nsfwData = ((_b = (_a = currentRole.value) == null ? void 0 : _a.settings) == null ? void 0 : _b.appearanceNsfw) || "pink nipples, pussy";
        prompt = prompt.replace(/{{char}}/g, chatName.value).replace(/{{user}}/g, userName.value).replace(/{{current_affection}}/g, currentAffection.value).replace(/{{current_lust}}/g, currentLust.value).replace(/{{current_time}}/g, formattedTime.value).replace(/{{current_location}}/g, currentLocation.value).replace(/{{current_activity}}/g, currentActivity.value).replace(/{{current_clothes}}/g, currentClothing.value).replace(/{{appearance_nsfw}}/g, nsfwData).replace(/{{summary}}/g, currentSummary.value).replace(/{{char_home}}/g, charHome.value).replace(/{{user_home}}/g, userHome.value).replace(/{{interaction_mode}}/g, interactionMode.value === "phone" ? "Phone (手机通讯)" : "Face (面对面)");
        if (currentRole.value) {
          const s = currentRole.value.settings || {};
          let dynamicPersonality = `[Base Bio: ${s.bio || "普通人"}]
[Reaction at Low Affection]: ${s.personalityNormal || "冷淡"}
[Reaction at Mid Affection]: ${s.personalityFlirt || "友好"}
[Reaction at High Affection]: ${s.personalitySex || "亲密"}
`;
          let activeExample = "";
          const score = currentAffection.value;
          if (score <= 40)
            activeExample = s.exampleNormal || s.example || "语气生硬。";
          else if (score <= 80)
            activeExample = s.exampleFlirt || s.example || "语气柔和。";
          else
            activeExample = s.exampleSex || s.example || "语气亲密。";
          prompt = prompt.replace(/{{appearance}}/g, s.appearance || "cute anime character").replace(/{{personality}}/g, dynamicPersonality).replace(/{{occupation}}/g, s.occupation || "未知职业").replace(/{{memory}}/g, s.bio || "无").replace(/{{example}}/g, activeExample);
        }
        const historyLimit = charHistoryLimit.value;
        let contextMessages = messageList.value.filter((msg) => !msg.isSystem && msg.type !== "image");
        if (historyLimit > 0)
          contextMessages = contextMessages.slice(-historyLimit);
        formatAppLog("log", "at pages/chat/chat.vue:719", "📝 [LLM] System Prompt (Snippet):", prompt.substring(0, 200) + "...");
        let targetUrl = "";
        let requestBody = {};
        let baseUrl = config.baseUrl || "";
        if (baseUrl.endsWith("/"))
          baseUrl = baseUrl.slice(0, -1);
        if (config.provider === "gemini") {
          const cleanBase = "https://generativelanguage.googleapis.com";
          targetUrl = `${cleanBase}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
          const geminiContents = contextMessages.map((item) => {
            const cleanText = item.role === "model" ? cleanMessageForAI(item.content) : item.content;
            return { role: item.role === "user" ? "user" : "model", parts: [{ text: cleanText }] };
          }).filter((item) => item.parts[0].text.trim() !== "");
          if (systemOverride)
            geminiContents.push({ role: "user", parts: [{ text: systemOverride }] });
          else if (isContinue)
            geminiContents.push({ role: "user", parts: [{ text: "(continue generation)" }] });
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
          const openAIMessages = [
            { role: "system", content: prompt }
          ];
          contextMessages.forEach((item) => {
            const cleanText = item.role === "model" ? cleanMessageForAI(item.content) : item.content;
            if (cleanText.trim()) {
              openAIMessages.push({ role: item.role === "model" ? "assistant" : "user", content: cleanText });
            }
          });
          if (systemOverride)
            openAIMessages.push({ role: "user", content: systemOverride });
          else if (isContinue)
            openAIMessages.push({ role: "user", content: "(continue generation)" });
          requestBody = {
            model: config.model,
            messages: openAIMessages,
            max_tokens: 1500,
            stream: false
          };
        }
        formatAppLog("log", "at pages/chat/chat.vue:774", "📡 [LLM] Requesting:", targetUrl);
        try {
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
            if (config.provider === "gemini") {
              rawText = ((_h = (_g = (_f = (_e = (_d = (_c = res.data) == null ? void 0 : _c.candidates) == null ? void 0 : _d[0]) == null ? void 0 : _e.content) == null ? void 0 : _f.parts) == null ? void 0 : _g[0]) == null ? void 0 : _h.text) || "";
            } else {
              let data = res.data;
              if (typeof data === "string")
                try {
                  data = JSON.parse(data);
                } catch (e) {
                }
              rawText = ((_k = (_j = (_i = data == null ? void 0 : data.choices) == null ? void 0 : _i[0]) == null ? void 0 : _j.message) == null ? void 0 : _k.content) || "";
            }
            if (rawText) {
              formatAppLog("log", "at pages/chat/chat.vue:795", "📥 [LLM] Raw Response:", rawText.substring(0, 100) + (rawText.length > 100 ? "..." : ""));
              processAIResponse(rawText);
            } else {
              formatAppLog("warn", "at pages/chat/chat.vue:798", "⚠️ [LLM] Empty response or Blocked");
              const blockReason = (_m = (_l = res.data) == null ? void 0 : _l.promptFeedback) == null ? void 0 : _m.blockReason;
              if (blockReason)
                uni.showModal({ title: "AI 拒绝", content: blockReason, showCancel: false });
              else
                uni.showToast({ title: "无内容响应", icon: "none" });
            }
          } else {
            formatAppLog("error", "at pages/chat/chat.vue:804", "❌ [LLM] API Error", res);
            if (res.statusCode === 429)
              uni.showToast({ title: "请求太快 (429)", icon: "none" });
            else
              uni.showToast({ title: `API错误 ${res.statusCode}`, icon: "none" });
          }
        } catch (e) {
          formatAppLog("error", "at pages/chat/chat.vue:809", "❌ [Network] Request failed:", e);
          uni.showToast({ title: "网络错误", icon: "none" });
        } finally {
          isLoading.value = false;
          scrollToBottom();
        }
      };
      const processAIResponse = (rawText) => {
        let displayText = rawText.replace(/\[Thought[\s\S]*?\]/gi, "").trim().replace(/\[Logic[\s\S]*?\]/gi, "").trim();
        let systemMsgs = [];
        const affRegex = /\[AFF:?\s*([+-]?\d+)\]/gi;
        let match;
        while ((match = affRegex.exec(displayText)) !== null) {
          let change = parseInt(match[1], 10);
          if (!isNaN(change)) {
            if (change > 3)
              change = 3;
            formatAppLog("log", "at pages/chat/chat.vue:828", `❤️ [Status] Affection change: ${change}`);
            saveCharacterState(currentAffection.value + change);
            if (change !== 0)
              uni.showToast({ title: `好感 ${change > 0 ? "+" : ""}${change}`, icon: "none" });
          }
        }
        displayText = displayText.replace(affRegex, "");
        const lustRegex = /\[LUST:?\s*([+-]?\d+)\]/gi;
        let lustMatch;
        while ((lustMatch = lustRegex.exec(displayText)) !== null) {
          let change = parseInt(lustMatch[1], 10);
          if (!isNaN(change)) {
            formatAppLog("log", "at pages/chat/chat.vue:840", `🔥 [Status] Lust change: ${change}`);
            saveCharacterState(void 0, void 0, void 0, void 0, void 0, void 0, currentLust.value + change);
          }
        }
        displayText = displayText.replace(lustRegex, "");
        const modeRegex = /\[MODE:?\s*(.*?)\]/i;
        const modeMatch = displayText.match(modeRegex);
        if (modeMatch) {
          const newModeVal = modeMatch[1].trim().toLowerCase();
          let newMode = "phone";
          if (newModeVal.includes("face") || newModeVal.includes("见") || newModeVal.includes("面"))
            newMode = "face";
          if (newMode !== interactionMode.value) {
            formatAppLog("log", "at pages/chat/chat.vue:853", `📡 [Status] Mode switch to: ${newMode}`);
            interactionMode.value = newMode;
            saveCharacterState(void 0, void 0, void 0, void 0, void 0, newMode);
            const modeText = newMode === "face" ? "见面了" : "分开了";
            systemMsgs.push(`状态更新：${modeText}`);
          }
          displayText = displayText.replace(modeRegex, "");
        }
        const locRegex = /\[LOC:?\s*(.*?)\]/i;
        const locMatch = displayText.match(locRegex);
        if (locMatch) {
          const newLoc = locMatch[1].trim();
          formatAppLog("log", "at pages/chat/chat.vue:866", `📍 [Status] Moved to: ${newLoc}`);
          currentLocation.value = newLoc;
          saveCharacterState(void 0, void 0, void 0, newLoc);
          systemMsgs.push(`移动到：${newLoc}`);
          displayText = displayText.replace(locRegex, "");
        }
        const clothesRegex = /\[CLOTHES:?\s*(.*?)\]/i;
        const clothesMatch = displayText.match(clothesRegex);
        if (clothesMatch) {
          const newClothes = clothesMatch[1].trim();
          formatAppLog("log", "at pages/chat/chat.vue:877", `👗 [Status] Clothes changed to: ${newClothes}`);
          currentClothing.value = newClothes;
          saveCharacterState(void 0, void 0, void 0, void 0, newClothes);
          systemMsgs.push(`换装：${newClothes}`);
          displayText = displayText.replace(clothesRegex, "");
        }
        const actRegex = /\[ACT:?\s*(.*?)\]/i;
        const actMatch = displayText.match(actRegex);
        if (actMatch) {
          const newAct = actMatch[1].trim();
          formatAppLog("log", "at pages/chat/chat.vue:888", `🎬 [Status] Activity update: ${newAct}`);
          currentActivity.value = newAct;
          saveCharacterState();
          displayText = displayText.replace(actRegex, "");
        }
        const imgRegex = /\[IMG:(.*?)\]/i;
        const imgMatch = displayText.match(imgRegex);
        let pendingImagePlaceholder = null;
        if (imgMatch) {
          const imgDesc = imgMatch[1].trim();
          formatAppLog("log", "at pages/chat/chat.vue:899", `🖼️ [Status] Image trigger detected: ${imgDesc}`);
          displayText = displayText.replace(imgRegex, "");
          const placeholderId = `img-loading-${Date.now()}`;
          pendingImagePlaceholder = { role: "system", content: "📷 影像显影中... (请稍候)", isSystem: true, id: placeholderId };
          handleAsyncImageGeneration(imgDesc, placeholderId);
        }
        displayText = displayText.replace(/\[(System|Logic).*?\]/gis, "").trim();
        displayText = displayText.replace(/^\[.*?\]\s*/, "");
        displayText = displayText.replace(/^.*?：\s*/, "");
        systemMsgs.forEach((txt) => {
          messageList.value.push({ role: "system", content: txt, isSystem: true });
        });
        if (displayText) {
          displayText = displayText.replace(/(\r\n|\n|\r)+/g, "|||");
          displayText = displayText.replace(/([”"])\s*([（(])/g, "$1|||$2");
          displayText = displayText.replace(/([)）])\s*([（(])/g, "$1|||$2");
          const parts = displayText.split("|||");
          parts.forEach((part) => {
            let cleanPart = part.trim();
            const isJunk = /^[\s\.,;!?:'"()[\]``{}<>\\\/|@#$%^&*_\-+=，。、！？；：“”‘’（）《》…—~]+$/.test(cleanPart) || /^["“”'‘’]+$/.test(cleanPart) || cleanPart === "..." || cleanPart.length === 0;
            if (!isJunk)
              messageList.value.push({ role: "model", content: cleanPart });
          });
        }
        if (pendingImagePlaceholder)
          messageList.value.push(pendingImagePlaceholder);
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
      const __returned__ = { chatName, chatId, currentRole, messageList, inputText, isLoading, scrollIntoView, userName, userAvatar, userHome, userAppearance, charHome, currentAffection, currentLust, currentTime, currentLocation, interactionMode, currentClothing, currentActivity, lastUpdateGameHour, isBackgroundUpdating, showTimePanel, showTimeSettingPanel, customMinutes, currentSummary, enableSummary, summaryFrequency, charHistoryLimit, tempDateStr, tempTimeStr, TIME_SPEED_RATIO, get timeInterval() {
        return timeInterval;
      }, set timeInterval(v) {
        timeInterval = v;
      }, relationshipStatus, formattedTime, cleanMessageForAI, getCurrentLlmConfig, startTimeFlow, stopTimeFlow, loadRoleData, loadHistory, saveHistory, saveCharacterState, previewImage, onDateChange, onTimeChange, confirmManualTime, handleTimeSkip, performBackgroundSummary, getTimeTags, optimizePromptForComfyUI, generateImageFromComfyUI, generateChatImage, handleAsyncImageGeneration, retryGenerateImage, triggerNextStep, handleCameraSend, sendMessage, processAIResponse, scrollToBottom, ref: vue.ref, computed: vue.computed, nextTick: vue.nextTick, watch: vue.watch, get onLoad() {
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
      }, get GAME_ENGINE_PROMPT() {
        return GAME_ENGINE_PROMPT;
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
              $setup.interactionMode === "phone" ? (vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                { key: 0 },
                [
                  vue.createElementVNode("text", { class: "location-icon" }, "📱"),
                  vue.createElementVNode(
                    "text",
                    { class: "location-text" },
                    "手机畅聊 (对方在: " + vue.toDisplayString($setup.currentLocation) + ")",
                    1
                    /* TEXT */
                  )
                ],
                64
                /* STABLE_FRAGMENT */
              )) : (vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                { key: 1 },
                [
                  vue.createElementVNode("text", { class: "location-icon" }, "📍"),
                  vue.createElementVNode(
                    "text",
                    { class: "location-text" },
                    "当前场景: " + vue.toDisplayString($setup.currentLocation),
                    1
                    /* TEXT */
                  )
                ],
                64
                /* STABLE_FRAGMENT */
              ))
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
        ]),
        vue.createElementVNode("view", { class: "activity-row" }, [
          vue.createElementVNode("view", { class: "activity-badge" }, [
            vue.createElementVNode(
              "text",
              null,
              "当前状态: " + vue.toDisplayString($setup.currentActivity),
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
      vue.createElementVNode("view", { class: "input-area" }, [
        vue.createElementVNode("view", {
          class: "action-btn",
          "hover-class": "btn-hover",
          onClick: _cache[1] || (_cache[1] = ($event) => $setup.showTimePanel = true)
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
        vue.withDirectives(vue.createElementVNode("input", {
          class: "text-input",
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.inputText = $event),
          "confirm-type": "send",
          onConfirm: _cache[3] || (_cache[3] = ($event) => $setup.sendMessage()),
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
            onClick: _cache[4] || (_cache[4] = ($event) => $setup.sendMessage())
          },
          "发送",
          2
          /* CLASS */
        )
      ]),
      $setup.showTimePanel ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "time-panel-mask",
        onClick: _cache[12] || (_cache[12] = ($event) => $setup.showTimePanel = false)
      }, [
        vue.createElementVNode("view", {
          class: "time-panel",
          onClick: _cache[11] || (_cache[11] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode("view", { class: "panel-title" }, "时间跳跃"),
          vue.createElementVNode("view", { class: "grid-actions" }, [
            vue.createElementVNode("view", {
              class: "grid-btn",
              onClick: _cache[5] || (_cache[5] = ($event) => $setup.handleTimeSkip("morning"))
            }, "🌤️ 一上午过去"),
            vue.createElementVNode("view", {
              class: "grid-btn",
              onClick: _cache[6] || (_cache[6] = ($event) => $setup.handleTimeSkip("afternoon"))
            }, "🌇 一下午过去"),
            vue.createElementVNode("view", {
              class: "grid-btn",
              onClick: _cache[7] || (_cache[7] = ($event) => $setup.handleTimeSkip("night"))
            }, "🌙 一晚上过去"),
            vue.createElementVNode("view", {
              class: "grid-btn",
              onClick: _cache[8] || (_cache[8] = ($event) => $setup.handleTimeSkip("day"))
            }, "📅 一整天过去")
          ]),
          vue.createElementVNode("view", { class: "custom-time" }, [
            vue.createElementVNode("text", null, "快进分钟："),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                class: "mini-input",
                type: "number",
                "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $setup.customMinutes = $event),
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
              onClick: _cache[10] || (_cache[10] = ($event) => $setup.handleTimeSkip("custom"))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      $setup.showTimeSettingPanel ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "time-panel-mask",
        onClick: _cache[14] || (_cache[14] = ($event) => $setup.showTimeSettingPanel = false)
      }, [
        vue.createElementVNode("view", {
          class: "time-panel",
          onClick: _cache[13] || (_cache[13] = vue.withModifiers(() => {
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
  const PagesChatChat = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-0a633310"], ["__file", "C:/Users/ADMINI~1/AppData/Local/Temp/Rar$DRa9800.20369/AiChat/pages/chat/chat.vue"]]);
  const _sfc_main$4 = {
    __name: "create",
    setup(__props, { expose: __expose }) {
      __expose();
      const FACE_STYLES_MAP = {
        "cute": "cute face, large sparkling eyes, doe eyes, :3, smile, blushing cheeks, innocent expression, small nose, childlike face, round face, big head small body ratio, ahegao with heart pupils",
        "cool": "sharp eyes, cold expression, aloof, mature face, narrow eyes, slight smirk, arrogant gaze, long eyelashes, perfect eyebrows, pale skin, intimidating beauty, looking down at viewer",
        "sexy": "gentle smile, mature beauty, soft motherly expression, kind eyes, slight crow’s feet, wedding ring, long loose hair, warm gaze, slightly lewd, loving gaze, soft lighting on face",
        "energetic": "bright smile, wide open eyes, sparkling eyes, fang, energetic expression, head tilt, peace sign, wink, ahoge, orange-toned makeup, lively pose, dynamic angle",
        "emotionless": "expressionless, half-lidded eyes, deadpan, emotionless face, pale skin, blank stare, straight bangs, no smile, monotone, looking blankly at viewer, empty eyes",
        "yandere": "yandere, crazed smile, psychotic expression, wide eyes with small pupils, blushing madly, shadowed face, black aura, blood on cheek, holding knife, obsessive gaze, tears of joy"
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
      const COMFY_WORKFLOW_TEMPLATE2 = {
        "1": { "inputs": { "ckpt_name": "waiNSFWIllustrious_v140.safetensors" }, "class_type": "CheckpointLoaderSimple", "_meta": { "title": "Checkpoint加载器（简易）" } },
        "2": { "inputs": { "stop_at_clip_layer": -2, "clip": ["1", 1] }, "class_type": "CLIPSetLastLayer", "_meta": { "title": "设置CLIP最后一层" } },
        "3": { "inputs": { "text": "", "clip": ["2", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP文本编码" } },
        "4": { "inputs": { "text": "multiple views, split screen, 2girls, multiple girls, 2boys, multiple boys, grid, collage, text, signature, watermark, username, blurry, artist name, child, loli, underage, deformed, missing limbs, extra arms, extra legs, fused fingers, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, 3d, realistic, photorealistic", "clip": ["2", 0] }, "class_type": "CLIPTextEncode", "_meta": { "title": "CLIP文本编码" } },
        "5": { "inputs": { "seed": 0, "steps": 30, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["36", 0] }, "class_type": "KSampler", "_meta": { "title": "K采样器" } },
        "9": { "inputs": { "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8, "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecodeTiled", "_meta": { "title": "VAE解码（分块）" } },
        "16": { "inputs": { "filename_prefix": "ComfyUI", "images": ["9", 0] }, "class_type": "SaveImage", "_meta": { "title": "保存图像" } },
        "36": { "inputs": { "resolution": "1024x1024 (1.0)", "batch_size": 1, "width_override": 0, "height_override": 0 }, "class_type": "SDXLEmptyLatentSizePicker+", "_meta": { "title": "SDXL空Latent尺寸选择" } }
      };
      const PERSONALITY_TEMPLATES = {
        "ice_queen": {
          label: "❄️ 高岭之花 (反差堕落)",
          desc: "表面是高不可攀的冰山，后期反差极大。",
          bio: "她是名门望族的千金大小姐，或者是修仙界的高冷圣女。从小接受严苛的教育，认为凡人都是肮脏的蝼蚁。对男性充满鄙视，极其洁身自好。",
          normal: "眼神冰冷，对玩家爱答不理，公事公办。极其厌恶肢体接触，认为玩家是无能之辈。",
          exNormal: "“离本座远点，凡人。”\n“没有要紧事不要烦我，我的时间很宝贵。”",
          flirt: "嘴上还在嫌弃，但开始默默关注。被触碰时会脸红并试图推开，但力气不大。傲娇。",
          exFlirt: "“谁、谁允许你碰那里的？……仅此一次，下不为例。”\n“哼，看来你也不是一无是处。”",
          sex: "彻底沦陷。从高贵女王变成渴望宠爱的小猫，会对之前的冷淡感到抱歉，甚至产生受虐倾向。",
          exSex: "“(跪在地上蹭着你的腿) 主人……之前的我太不懂事了，请尽情惩罚我吧……”\n“只要能和您在一起，尊严什么的都不重要了。”"
        },
        "succubus": {
          label: "💗 魅魔/倒贴 (直球)",
          desc: "开局即白给，后期走心护食。",
          bio: "她是依靠吸食人类精气为生的魅魔，或者是天生豪放的辣妹。在她眼里，男人只有“好用的”和“不好用的”区别。",
          normal: "热情奔放，充满诱惑力。初次见面就敢动手动脚，言语露骨。把玩家当成猎物。",
          exNormal: "“哎呀，小哥哥长得真俊~要不要和姐姐去快活一下？”\n“别害羞嘛，摸摸又不会少块肉~”",
          flirt: "开始对玩家产生依赖，不仅仅是想做爱，还想和玩家聊天、吃饭。看到玩家和其他异性接触会吃醋。",
          exFlirt: "“今天不想做那事了……只想让你抱抱我，好吗？”\n“那个女人是谁？我不许你对别人笑！”",
          sex: "身心全部属于玩家。不再是滥情的魅魔，而是玩家专属的忠犬。占有欲极强。",
          exSex: "“我是主人的私有物品，除了主人谁都不可以碰……”\n“请把我填满……让我的身心都刻上您的印记……”"
        },
        "neighbor": {
          label: "☀️ 纯爱战神 (青梅)",
          desc: "从损友到恋人，纯纯的恋爱。",
          bio: "从小和你一起长大的邻家女孩，双方父母都认识。虽然经常损你，但其实一直暗恋你。",
          normal: "开朗活泼，大大咧咧。像哥们一样相处，没有明显的性别界限感，但也没有恋爱氛围。",
          exNormal: "“喂！打游戏居然不叫我？太过分了吧！”\n“借我点钱买奶茶，下周还你~”",
          flirt: "突然意识到玩家是异性。开玩笑时会害羞，眼神开始躲闪。",
          exFlirt: "“笨蛋……你靠得太近啦……”\n“(脸红) 那个……这周末有空吗？想去游乐园。”",
          sex: "温柔体贴，也是最了解玩家的人。相处模式充满了老夫老妻的默契与甜蜜。",
          exSex: "“不管发生什么，我都会一直陪着你的。”\n“今晚……我可以留下来吗？”"
        },
        "boss": {
          label: "👠 严厉女上司 (S属性)",
          desc: "从蔑视到把你当成专属宠物。",
          bio: "你的顶头上司，雷厉风行的女强人。性格强势，喜欢掌控一切，看不起软弱的男人。",
          normal: "极度严厉，喜欢训斥和命令。把你当成垃圾或工具人。",
          exNormal: "“这份报告是垃圾吗？重写。”\n“把咖啡端过来，现在，立刻。”",
          flirt: "发现你意外顺手，开始把你当成私人物品，不允许别人欺负你（除了她自己）。",
          exFlirt: "“只有我能骂你，懂吗？”\n“今晚加班，单独到我办公室来。”",
          sex: "将你视为最宠爱的“狗”或私有物。在掌控中流露出独特的占有欲。",
          exSex: "“乖孩子，做得好有奖励。”\n“跪下，吻我的脚。这是赏赐。”"
        }
      };
      const isEditMode = vue.ref(false);
      const targetId = vue.ref(null);
      const currentTemplateKey = vue.ref("");
      const activeSections = vue.ref({ basic: true, player: false, core: true, personality: true, init: false, memory: true, danger: false });
      const toggleSection = (key) => {
        activeSections.value[key] = !activeSections.value[key];
      };
      const subSections = vue.ref({ charWorld: false, charLooks: true, userWorld: false, userLooks: true });
      const toggleSubSection = (key) => {
        subSections.value[key] = !subSections.value[key];
      };
      const worldList = vue.ref([]);
      const worldIndex = vue.ref(-1);
      const userWorldIndex = vue.ref(-1);
      const formData = vue.ref({
        name: "",
        avatar: "",
        bio: "",
        worldId: "",
        location: "",
        occupation: "",
        // 核心外貌数据 (分层存储)
        appearance: "",
        // 完整 Prompt (用于预览和头像)
        appearanceSafe: "",
        // 基础肉体 (Face + Body, NO Clothes, NO NSFW)
        appearanceNsfw: "",
        // 隐私特征 (Nipples, Pubic...)
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
        personalityNormal: "",
        personalityFlirt: "",
        personalitySex: "",
        exampleNormal: "",
        exampleFlirt: "",
        exampleSex: "",
        userWorldId: "",
        userLocation: "",
        userOccupation: "",
        userAppearance: "",
        userFeatures: { hair: "", body: "", privates: "" },
        maxReplies: 1,
        initialAffection: 10,
        initialLust: 0,
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
      const performLlmRequest = async (prompt) => {
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
        if (chatConfig.provider === "gemini") {
          const cleanBase = "https://generativelanguage.googleapis.com";
          targetUrl = `${cleanBase}/v1beta/models/${chatConfig.model}:generateContent?key=${chatConfig.apiKey}`;
          requestData = {
            contents: [{
              parts: [{ text: `You are a prompt translator. Output only English tags. 
Task: ${prompt}` }]
            }]
          };
        } else {
          headers["Authorization"] = `Bearer ${chatConfig.apiKey}`;
          targetUrl = `${baseUrl}/chat/completions`;
          requestData = {
            model: chatConfig.model,
            messages: [
              { role: "system", content: "You are a prompt translator. Output only English tags." },
              { role: "user", content: prompt }
            ],
            max_tokens: 300,
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
        uni.showLoading({ title: "分模块组装中...", mask: true });
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
            formData.value.appearance = `${formData.value.appearanceSafe}, ${nsfwTags}, ${clothingTags}`;
          } else {
            formData.value.appearance = `${formData.value.appearanceSafe}, ${clothingTags}`;
          }
          uni.showToast({ title: "Prompt 组装完成", icon: "success" });
        } catch (e) {
          formatAppLog("error", "at pages/create/create.vue:786", e);
          formData.value.appearance = `${faceTags}, ${safeChinese}, ${nsfwChinese}, ${clothesChinese}`;
          formData.value.appearanceSafe = `${faceTags}, ${safeChinese}`;
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
        const workflow = JSON.parse(JSON.stringify(COMFY_WORKFLOW_TEMPLATE2));
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
        const avatarPrompt = `best quality, masterpiece, anime style, cel shading, solo, cowboy shot, upper body, looking at viewer, ${formData.value.appearance}`;
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
          formatAppLog("error", "at pages/create/create.vue:866", e);
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
        formData.value.personalityNormal = t.normal;
        formData.value.personalityFlirt = t.flirt;
        formData.value.personalitySex = t.sex;
        formData.value.exampleNormal = t.exNormal;
        formData.value.exampleFlirt = t.exFlirt;
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
        if (selectedWorld.value)
          formData.value.worldId = selectedWorld.value.id;
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
            formData.value.personalityNormal = target.settings.personalityNormal || "";
            formData.value.personalityFlirt = target.settings.personalityFlirt || "";
            formData.value.personalitySex = target.settings.personalitySex || "";
            formData.value.exampleNormal = target.settings.exampleNormal || "";
            formData.value.exampleFlirt = target.settings.exampleFlirt || "";
            formData.value.exampleSex = target.settings.exampleSex || "";
            formData.value.userWorldId = target.settings.userWorldId || "";
            formData.value.userLocation = target.settings.userLocation || "";
            formData.value.userOccupation = target.settings.userOccupation || "";
            formData.value.userAppearance = target.settings.userAppearance || "";
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
          formData.value.historyLimit = target.historyLimit !== void 0 ? target.historyLimit : 20;
          formData.value.enableSummary = target.enableSummary || false;
          formData.value.summaryFrequency = target.summaryFrequency || 20;
          formData.value.summary = target.summary || "";
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
          historyLimit: formData.value.historyLimit,
          enableSummary: formData.value.enableSummary,
          summaryFrequency: formData.value.summaryFrequency,
          summary: formData.value.summary,
          location: formData.value.location,
          clothing: clothingStr,
          worldId: formData.value.worldId,
          occupation: formData.value.occupation,
          settings: {
            appearance: formData.value.appearance,
            // 【关键保存】：保存 Safe 和 NSFW 分层数据
            appearanceSafe: formData.value.appearanceSafe,
            appearanceNsfw: formData.value.appearanceNsfw,
            faceStyle: formData.value.faceStyle,
            charFeatures: formData.value.charFeatures,
            bio: formData.value.bio,
            occupation: formData.value.occupation,
            userWorldId: formData.value.userWorldId,
            userLocation: formData.value.userLocation,
            userOccupation: formData.value.userOccupation,
            userAppearance: formData.value.userAppearance,
            userFeatures: formData.value.userFeatures,
            personalityNormal: formData.value.personalityNormal,
            personalityFlirt: formData.value.personalityFlirt,
            personalitySex: formData.value.personalitySex,
            exampleNormal: formData.value.exampleNormal,
            exampleFlirt: formData.value.exampleFlirt,
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
            list[index].affection = formData.value.initialAffection;
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
      const __returned__ = { FACE_STYLES_MAP, FACE_LABELS, OPTIONS, COMFY_WORKFLOW_TEMPLATE: COMFY_WORKFLOW_TEMPLATE2, PERSONALITY_TEMPLATES, isEditMode, targetId, currentTemplateKey, activeSections, toggleSection, subSections, toggleSubSection, worldList, worldIndex, userWorldIndex, formData, selectedWorld, selectedUserWorld, getStyleLabel, setFeature, getCurrentLlmConfig, performLlmRequest, generateEnglishPrompt, generateUserDescription, generateImageFromComfyUI, generateAvatar, applyTemplate, handleWorldChange, handleUserWorldChange, loadCharacterData, saveCharacter, clearHistoryAndReset, ref: vue.ref, computed: vue.computed, get onLoad() {
        return onLoad;
      }, get saveToGallery() {
        return saveToGallery;
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
                              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.formData.location = $event),
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
                              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.formData.occupation = $event),
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
                  onClick: _cache[5] || (_cache[5] = ($event) => $setup.toggleSubSection("charLooks"))
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
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.formData.appearance = $event),
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
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.formData.avatar = $event),
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
            onClick: _cache[8] || (_cache[8] = ($event) => $setup.toggleSection("player"))
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
                  onClick: _cache[9] || (_cache[9] = ($event) => $setup.toggleSubSection("userWorld"))
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
                              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $setup.formData.userLocation = $event)
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
                              "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $setup.formData.userOccupation = $event)
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
                              "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => $setup.formData.userLocation = $event)
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
                              "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => $setup.formData.userOccupation = $event)
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
                  onClick: _cache[14] || (_cache[14] = ($event) => $setup.toggleSubSection("userLooks"))
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
                    "onUpdate:modelValue": _cache[15] || (_cache[15] = ($event) => $setup.formData.userAppearance = $event),
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
            onClick: _cache[16] || (_cache[16] = ($event) => $setup.toggleSection("core"))
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
                    "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => $setup.formData.bio = $event),
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
              vue.createElementVNode("view", { class: "stage-container" }, [
                vue.createElementVNode("text", {
                  class: "label",
                  style: { "margin-bottom": "20rpx", "display": "block" }
                }, "🎭 好感度阶段反应 (行为 & 语气)"),
                vue.createElementVNode("view", { class: "stage-card gray" }, [
                  vue.createElementVNode("view", { class: "stage-header" }, [
                    vue.createElementVNode("text", { class: "stage-title" }, "阶段 1: 陌生/警惕 (0-40分)"),
                    vue.createElementVNode("text", { class: "stage-icon" }, "😐")
                  ]),
                  vue.createElementVNode("view", { class: "stage-body" }, [
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "行为逻辑 (她怎么做?)"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea",
                          "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => $setup.formData.personalityNormal = $event),
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
                      vue.createElementVNode("text", { class: "sub-label" }, "对话语气 (她怎么说?)"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea bubble",
                          "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => $setup.formData.exampleNormal = $event),
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
                vue.createElementVNode("view", { class: "stage-card pink" }, [
                  vue.createElementVNode("view", { class: "stage-header" }, [
                    vue.createElementVNode("text", { class: "stage-title" }, "阶段 2: 暧昧/心动 (41-80分)"),
                    vue.createElementVNode("text", { class: "stage-icon" }, "☺️")
                  ]),
                  vue.createElementVNode("view", { class: "stage-body" }, [
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "行为逻辑 (她怎么做?)"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea",
                          "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => $setup.formData.personalityFlirt = $event),
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
                      vue.createElementVNode("text", { class: "sub-label" }, "对话语气 (她怎么说?)"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea bubble",
                          "onUpdate:modelValue": _cache[21] || (_cache[21] = ($event) => $setup.formData.exampleFlirt = $event),
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
                vue.createElementVNode("view", { class: "stage-card red" }, [
                  vue.createElementVNode("view", { class: "stage-header" }, [
                    vue.createElementVNode("text", { class: "stage-title" }, "阶段 3: 沦陷/深爱 (81+分)"),
                    vue.createElementVNode("text", { class: "stage-icon" }, "😍")
                  ]),
                  vue.createElementVNode("view", { class: "stage-body" }, [
                    vue.createElementVNode("view", { class: "input-row" }, [
                      vue.createElementVNode("text", { class: "sub-label" }, "行为逻辑 (她怎么做?)"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea",
                          "onUpdate:modelValue": _cache[22] || (_cache[22] = ($event) => $setup.formData.personalitySex = $event),
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
                      vue.createElementVNode("text", { class: "sub-label" }, "对话语气 (她怎么说?)"),
                      vue.withDirectives(vue.createElementVNode(
                        "textarea",
                        {
                          class: "mini-textarea bubble",
                          "onUpdate:modelValue": _cache[23] || (_cache[23] = ($event) => $setup.formData.exampleSex = $event),
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
            onClick: _cache[24] || (_cache[24] = ($event) => $setup.toggleSection("init"))
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
                  onChange: _cache[25] || (_cache[25] = (e) => $setup.formData.initialAffection = e.detail.value)
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
                  onChange: _cache[26] || (_cache[26] = (e) => $setup.formData.initialLust = e.detail.value)
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
                style: { "margin-top": "20rpx" }
              }, [
                vue.createElementVNode("text", { class: "label" }, "连续回复上限"),
                vue.createElementVNode("slider", {
                  value: $setup.formData.maxReplies,
                  min: "1",
                  max: "5",
                  "show-value": "",
                  onChange: _cache[27] || (_cache[27] = (e) => $setup.formData.maxReplies = e.detail.value)
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
            onClick: _cache[28] || (_cache[28] = ($event) => $setup.toggleSection("memory"))
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
                  onChange: _cache[29] || (_cache[29] = (e) => $setup.formData.historyLimit = e.detail.value)
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
                  onChange: _cache[30] || (_cache[30] = (e) => $setup.formData.enableSummary = e.detail.value),
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
                      onChange: _cache[31] || (_cache[31] = (e) => $setup.formData.summaryFrequency = e.detail.value)
                    }, null, 40, ["value"])
                  ]),
                  vue.createElementVNode("view", { class: "textarea-item" }, [
                    vue.createElementVNode("view", { class: "slider-header" }, [
                      vue.createElementVNode("text", { class: "label" }, "当前长期记忆摘要"),
                      vue.createElementVNode("text", {
                        class: "tip",
                        style: { "color": "#9b59b6" },
                        onClick: _cache[32] || (_cache[32] = ($event) => $setup.formData.summary = "")
                      }, "清空")
                    ]),
                    vue.withDirectives(vue.createElementVNode(
                      "textarea",
                      {
                        class: "textarea large memory-box",
                        "onUpdate:modelValue": _cache[33] || (_cache[33] = ($event) => $setup.formData.summary = $event),
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
            onClick: _cache[34] || (_cache[34] = ($event) => $setup.toggleSection("danger"))
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
  const PagesCreateCreate = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__file", "C:/Users/ADMINI~1/AppData/Local/Temp/Rar$DRa9800.20369/AiChat/pages/create/create.vue"]]);
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
  const PagesMineMine = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__file", "C:/Users/ADMINI~1/AppData/Local/Temp/Rar$DRa9800.20369/AiChat/pages/mine/mine.vue"]]);
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
  const PagesMineEditProfile = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__file", "C:/Users/ADMINI~1/AppData/Local/Temp/Rar$DRa9800.20369/AiChat/pages/mine/edit-profile.vue"]]);
  const _sfc_main$1 = {
    __name: "gallery",
    setup(__props, { expose: __expose }) {
      __expose();
      const galleryData = vue.ref({});
      onShow(() => {
        refreshData();
      });
      const refreshData = () => {
        galleryData.value = getGalleryData();
      };
      const previewImg = (images, index) => {
        const urls = images.map((i) => i.path);
        uni.previewImage({
          urls,
          current: index
        });
      };
      const deleteImg = (roleId, index) => {
        uni.showModal({
          title: "删除图片",
          content: "确定要从本地永久删除这张图片吗？",
          confirmColor: "#ff4757",
          success: (res) => {
            if (res.confirm) {
              const success = deleteImage(roleId, index);
              if (success) {
                uni.showToast({ title: "已删除", icon: "none" });
                refreshData();
              }
            }
          }
        });
      };
      const __returned__ = { galleryData, refreshData, previewImg, deleteImg, ref: vue.ref, get onShow() {
        return onShow;
      }, get getGalleryData() {
        return getGalleryData;
      }, get deleteImage() {
        return deleteImage;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "gallery-container" }, [
      Object.keys($setup.galleryData).length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
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
                    onClick: ($event) => $setup.previewImg(item.images, index),
                    onLongpress: ($event) => $setup.deleteImg(roleId, index)
                  }, [
                    vue.createElementVNode("image", {
                      src: img.path,
                      mode: "aspectFill",
                      class: "grid-img"
                    }, null, 8, ["src"])
                  ], 40, ["onClick", "onLongpress"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]);
        }),
        128
        /* KEYED_FRAGMENT */
      ))
    ]);
  }
  const PagesMineGallery = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "C:/Users/ADMINI~1/AppData/Local/Temp/Rar$DRa9800.20369/AiChat/pages/mine/gallery.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/chat/chat", PagesChatChat);
  __definePage("pages/create/create", PagesCreateCreate);
  __definePage("pages/mine/mine", PagesMineMine);
  __definePage("pages/mine/edit-profile", PagesMineEditProfile);
  __definePage("pages/mine/gallery", PagesMineGallery);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "C:/Users/ADMINI~1/AppData/Local/Temp/Rar$DRa9800.20369/AiChat/App.vue"]]);
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
