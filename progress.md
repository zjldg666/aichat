# 进度记录

最后更新：2026-04-17

这份文件不再保留乱码状态下的大段流水账，而是保留“当前仍值得回看的关键里程碑摘要”。更细的历史过程仍可从 `docs/superpowers/plans/` 和测试文件里追。

## 2026-04-17

### 时间系统入口已统一到 store 级快进，主入口文档也已收口成“快速接手”视角

- [composables/useGameTime.js](composables/useGameTime.js) 现在会统一执行：
  - `stopTimeFlow()`：先停表。
  - `advanceTimeTo(...)`：让世界时间和居民 slice 一起推进。
  - `startTimeFlow()`：完成后再恢复时钟。
- [pages/chat/chat.vue](pages/chat/chat.vue) 的 `saveCharacterState(...)` 已移除旧的 `currentTime.value = newTime` 直接写时钟回写，避免把快进结果打回旧路径。
- [pages/scene/scene.vue](pages/scene/scene.vue) 的睡觉入口现在也会走同一套停表 -> 快进 -> 恢复流程。
- 这轮新增 / 扩展了：
  - [tests/composables/useGameTime.spec.js](tests/composables/useGameTime.spec.js)
  - [tests/town/town-page-script-syntax.spec.js](tests/town/town-page-script-syntax.spec.js)
- 这轮聚焦验证结果：
  - `2` 个测试文件，`17` 个测试通过
  - 命令：
    - `.\node_modules\.bin\vitest.cmd run tests/composables/useGameTime.spec.js tests/town/town-page-script-syntax.spec.js`
- 同一轮里还同步重写了主入口文档：
  - [README.md](README.md)
  - [docs/README.md](docs/README.md)
  - [docs/打包交接说明.md](docs/打包交接说明.md)
  - [docs/当前状态与交接.md](docs/当前状态与交接.md)
  - [AGENTS.md](AGENTS.md)
  - [task_plan.md](task_plan.md)
  - [findings.md](findings.md)

### 角色级 AI 自治开关已经接通，默认居民仍保持轻量模拟

- 新增了 [utils/town/town-resident-autonomy.js](utils/town/town-resident-autonomy.js)，把 `behaviorMode`（行为模式）和 `townRuntime.autonomy`（自治运行态缓存）统一收口成可归一化的数据层。
- `townProfile.behaviorMode` 现在已经成为角色侧正式字段：
  - `lightweight`：轻量模拟，继续走时间表 + 行为偏置，不调用 AI。
  - `agent`：AI 自治，只在命中受控触发条件时请求模型做一次更细的生活决策。
- `townRuntime.autonomy` 现在会记录：
  - `source`：本轮决策来源。
  - `actionId`：缓存动作标识。
  - `lastDecisionAt`：上一次自治决策时间。
  - `validUntil`：缓存有效截止时间。
  - `currentGoal`：短期目标摘要。
  - `trigger`：触发原因。
  - `towardPlayer`：当前行为对玩家的朝向态度。
- [services/legacyCharacterMigration.js](services/legacyCharacterMigration.js) 与 [services/characterService.js](services/characterService.js) 现在会统一归一化旧角色数据：
  - 旧顶层 `behaviorMode` 会被迁入正式的 `townProfile.behaviorMode`。
  - 缺失的 `townRuntime.autonomy` 会自动补齐默认缓存结构。
- [pages/create/create.vue](pages/create/create.vue) 现在已经补出“启用 AI”开关：
  - 新建角色默认关闭。
  - 编辑角色会回填当前 `behaviorMode`。
  - 保存时会同步写回 `townProfile.behaviorMode`，并归一化 `townRuntime.autonomy`。
- [services/townResidentAgentService.js](services/townResidentAgentService.js) 现在不再只返回一个动作标签，而是返回“动作 + 结构化 autonomy 元数据”：
  - prompt 会显式带入 `trigger`（触发原因）和最近 3 条 `townEvents`（小镇事件）。
  - 模型返回固定 JSON，再映射成动作和自治缓存。
- [services/townSimulationService.js](services/townSimulationService.js) 与 [stores/useTownStore.js](stores/useTownStore.js) 现在已经按角色行为模式分流：
  - `lightweight` 居民不会调用 AI。
  - `agent` 居民只会在 `fresh_player_event`（玩家新近事件触发）、`player_home_context`（玩家住处语境触发）或 `branching_schedule`（分支日程触发）命中时请求模型。
  - 如果没有新的玩家事件打断，并且 `validUntil` 还没过期，系统会优先复用 `actionId` 对应的缓存动作。
  - 如果 `saveCharactersBatch(...)` 保存失败，store 会回读持久化状态，而不是假装自治缓存已经成功落地。
- 这轮新增 / 扩展的验证包括：
  - [tests/town/town-resident-autonomy.spec.js](tests/town/town-resident-autonomy.spec.js)
  - [tests/legacy/character-migration.spec.js](tests/legacy/character-migration.spec.js)
  - [tests/services/character-service.spec.js](tests/services/character-service.spec.js)
  - [tests/town/create-page-behavior-mode.spec.js](tests/town/create-page-behavior-mode.spec.js)
  - [tests/services/town-resident-agent-service.spec.js](tests/services/town-resident-agent-service.spec.js)
  - [tests/town/town-simulation.spec.js](tests/town/town-simulation.spec.js)
  - [tests/store/useTownStore.spec.js](tests/store/useTownStore.spec.js)
- 这轮验证结果：
  - 聚焦回归：`7` 个测试文件，`71` 个测试通过
  - 全量结果：`44` 个测试文件，`313` 个测试通过
  - 命令：
    - `.\node_modules\.bin\vitest.cmd run tests/town/town-resident-autonomy.spec.js tests/legacy/character-migration.spec.js tests/services/character-service.spec.js tests/town/create-page-behavior-mode.spec.js tests/services/town-resident-agent-service.spec.js tests/town/town-simulation.spec.js tests/store/useTownStore.spec.js`
    - `npm run test`

## 2026-04-16

### 手机聊天收口成纯远程频道，电话里的拜访许可也接进真实权限链路

- [components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue) 现在会在手机聊天里显式注入远程规则，避免模型把电话聊天演成面对面见面。
- 新增了 [utils/town/town-phone-chat-guard.js](utils/town/town-phone-chat-guard.js)，专门拦截“开门、进屋、拥抱、递东西”这类现场动作；如果模型越界，会先重写成远程表达，再落入手机线程。
- 手机聊天现在也接进了真实的拜访意图与结算链路：
  - 识别玩家是不是在电话里提出了上门拜访请求。
  - 判定居民回复是同意、拒绝还是改天。
  - 同意时真实调用住处访问权限落地，而不是只在文案里假装“已经进门”。
- 同步补上了：
  - [tests/town/town-phone-chat-guard.spec.js](tests/town/town-phone-chat-guard.spec.js)
  - [tests/town/town-phone-chat-sheet.spec.js](tests/town/town-phone-chat-sheet.spec.js)
  - [tests/town/town-player-intent-followups.spec.js](tests/town/town-player-intent-followups.spec.js)
  - [tests/town/town-player-intent-settlement.spec.js](tests/town/town-player-intent-settlement.spec.js)
- 这轮验证结果：
  - 聚焦回归：`4` 个测试文件，`17` 个测试通过
  - 全量结果：`40` 个测试文件，`290` 个测试通过
  - 命令：`npm run test`

### 主交接文档同步到当前产品边界，`worldSemantics` 标记为“已落一层、暂缓外扩”

- 同步更新了这一组主入口文档：
  - [README.md](README.md)
  - [docs/README.md](docs/README.md)
  - [docs/打包交接说明.md](docs/打包交接说明.md)
  - [docs/当前状态与交接.md](docs/当前状态与交接.md)
  - [task_plan.md](task_plan.md)
  - [progress.md](progress.md)
  - [findings.md](findings.md)
  - [AGENTS.md](AGENTS.md)
- 这轮同步重点收口了三件事：
  - 手机聊天、面对面私聊、门口拜访的频道边界。
  - 门口拜访更准确地说是“住处访问协商机制”，不是普通私聊皮肤。
  - `worldSemantics` 第一阶段已落地，但当前已按产品判断暂缓继续外扩，不再写成默认下一步主线。

## 2026-04-15

### 场景页开始从“名单 + 输入框”收口成“多人聊天壳”第一阶段

- [pages/scene/scene.vue](pages/scene/scene.vue) 已不再维持旧的“自定义导航栏 + 名单页 + 独立输入框”结构，而是先收口成更接近 [pages/chat/chat.vue](pages/chat/chat.vue) 的多人场景壳：
  - 顶部改接 [components/ChatHeader.vue](components/ChatHeader.vue)。
  - 底部改接 [components/ChatFooter.vue](components/ChatFooter.vue)。
  - 中间改成单一主滚动区，保留“场景氛围 / 在场居民 / 多人公共聊天”三段。
  - 点居民仍可直接切回 [pages/chat/chat.vue](pages/chat/chat.vue) 做 1v1 私聊。
- 这轮先聚焦“住处 / 私人场景也像聊天页”，没有在同一轮里硬做完整房间级居民分布模拟；也就是“我回家后像进 chat 壳，但仍是多人场景”这条主体验先落地。
- [components/ChatHeader.vue](components/ChatHeader.vue) 现在补了 `residentEconomy` 这条“外部传入的居民经济数据”入口，允许场景页在不伪装成单人私聊的前提下，复用头部的钱包入口。
- 场景页第一阶段还补上了：
  - 场景宿主居民（`sceneHostResident`）这个“当前多人场景的默认生活入口承接者”。
  - 场景内商店入口与购买落档。
  - 头部点时间后的时间设置弹窗。
  - 底部工具栏里的“继续”动作，默认会向当前多人现场再抛一轮公开话题。
- 为了把这次边界钉住，新增 / 改写了这些回归断言：
  - [tests/town/town-page-script-syntax.spec.js](tests/town/town-page-script-syntax.spec.js)
  - [tests/town/town-page-copy-integrity.spec.js](tests/town/town-page-copy-integrity.spec.js)
- 这轮验证结果：
  - 聚焦回归：`tests/town/town-page-script-syntax.spec.js`、`tests/town/town-page-copy-integrity.spec.js`
  - 聚焦结果：`2` 个测试文件，`20` 个测试通过
  - 全量结果：`36` 个测试文件，`277` 个测试通过
  - 命令：`npm run test`

### 世界语义第一层落地，项目开始从“现代小镇”走向“可复用的小镇生活框架”

- 新增了 [utils/town/world-semantics.js](utils/town/world-semantics.js)，把 `worldSemantics` 这个“世界语义配置对象”正式收口为可归一化的数据层。
- 当前已落地的四组语义包括：
  - `vocabulary`：名词词汇配置，例如“居民 / 场景 / 住宅区 / 住处 / 门牌号 / 职业 / 关系”。
  - `remoteChat`：远程联系机制配置，例如“手机 / 书信 / 传音符”、入口名称，以及线程前缀。
  - `privateSpace`：私人空间叫法与动作配置，例如“住处 / 洞府 / 院落”、拜访动作和进入动作。
  - `scheduleAnchors`：日程语义锚点配置，用来给后续更开放的生活流留接口。
- [utils/town/default-world-template.js](utils/town/default-world-template.js)、[utils/town/town-schema.js](utils/town/town-schema.js)、[utils/town/world-template-editor.js](utils/town/world-template-editor.js)、[services/worldTemplateService.js](services/worldTemplateService.js) 已把这层配置接进默认世界、schema 归一化、编辑草稿和存档读写，保证旧世界缺省时自动回填，部分覆盖时不会丢默认值。
- [pages/mine/mine.vue](pages/mine/mine.vue) 现在已经补出“世界语义”编辑区；官方初始小镇仍然保留为默认 starter world，但新建世界和已有世界都能直接在世界观设定里改远程联系和私人空间叫法。
- [utils/town/town-shell-view-models.js](utils/town/town-shell-view-models.js)、[pages/index/index.vue](pages/index/index.vue)、[components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue)、[utils/town/town-entry-links.js](utils/town/town-entry-links.js) 已开始消费这层语义：
  - 首页总览标题不再写死为现代小镇用语。
  - 远程联系入口可按世界关闭，也可改成不同名称。
  - 远程聊天线程前缀已支持按世界改写，不再固定死为 `phone:`。
  - 私人空间相关入口文案已开始按世界叫法生成。
- 这轮验证结果：
  - 聚焦回归：`tests/town/world-schema.spec.js`、`tests/town/world-template-editor.spec.js`、`tests/town/world-template-service.spec.js`、`tests/town/town-shell-view-models.spec.js`、`tests/town/town-entry-links.spec.js`、`tests/town/town-page-copy-integrity.spec.js`、`tests/town/town-page-script-syntax.spec.js`
  - 聚焦结果：`7` 个测试文件，`92` 个测试通过
  - 全量结果：`36` 个测试文件，`275` 个测试通过
  - 命令：`npm run test`

### 场景公开聊天进入“程序可解释调度 + 记忆显著度 + 分层回流”第二轮

- [utils/town/town-scene-chat.js](utils/town/town-scene-chat.js) 现在补出了 `dispatchContext` 这个“公开聊天的程序侧调度上下文”，会明确给出：
  - `leadSpeakerIds`：主回应者 ID 列表。
  - `supportSpeakerIds`：辅助回应者 ID 列表。
  - `listenerIds`：旁听者 ID 列表。
  - `reasonTagsByResidentId`：每位居民被调度进来的原因标签。
- 同一文件里还补出了 `salience` 这个“记忆显著度”归一化与排序逻辑；公开聊天记忆现在会按 `high / medium / low`（高 / 中 / 低）区分主回应、被点到补充与旁听，并优先把更显著的现场记忆留给后续 prompt 与居民记忆列表。
- [services/townSceneChatService.js](services/townSceneChatService.js) 现在会把这套程序侧调度上下文直接喂进模型 prompt；模型失败时的 fallback 也会优先让主回应者开口，并保留显著度分层，不再退回“在场第一个居民先说”的粗糙兜底。
- [stores/useTownStore.js](stores/useTownStore.js) 现在会按参与层级结算公开聊天后效：
  - 主回应者拿满额关系回流。
  - 辅助回应者拿缩放后的关系回流。
  - 旁听者默认只留下 `sceneMemories` 这类“即时场景记忆”，不再静默获得关系推进或 `player_resident_conversation_followup` 这类后续事件。
- 这轮还确认并保留了单轮关系变化上限：`trust`（信任度）和 `familiarity`（熟悉度）等公开聊天关系增量仍会经过既有单轮上限裁剪，因此 store 侧新测试也已按这个现有规则对齐。
- 新增与扩展的验证包括：
  - 新增 [tests/town/town-scene-chat-service.spec.js](tests/town/town-scene-chat-service.spec.js)
  - 扩展 [tests/town/town-scene-chat.spec.js](tests/town/town-scene-chat.spec.js)
  - 扩展 [tests/store/useTownStore.spec.js](tests/store/useTownStore.spec.js)
- 这轮验证结果：
  - 聚焦回归：`tests/town/town-scene-chat.spec.js`、`tests/town/town-scene-chat-service.spec.js`、`tests/store/useTownStore.spec.js`
  - 聚焦结果：`3` 个测试文件，`35` 个测试通过
  - 全量结果：`36` 个测试文件，`267` 个测试通过
  - 命令：`npm run test`

## 2026-04-14

### 打包交接说明恢复正常编码，打包范围也明确了

- 重写了 [docs/打包交接说明.md](docs/打包交接说明.md)，修复了这份主交接文档本身仍是乱码的问题。
- 再次统一了这些入口文档里的阅读顺序和当前优先级：
  - [README.md](README.md)
  - [AGENTS.md](AGENTS.md)
  - [task_plan.md](task_plan.md)
- 这轮同步后的口径是：
  - 当前主 UI 三个聊天文件的可见文案已经纳入回归测试。
  - 剩余乱码风险更多集中在历史 specs / plans。
  - 下一位 Codex 应先看主入口文档，再决定是否回看历史方案。
- 这轮还明确了不建议随包交付的本机残留：
  - `.trae/documents/plan_20260306_052301.md`
  - `.superpowers/`
  - `.hbuilderx/`
  - `.npm-cache/`
  - `.tmp-script-check-node/`
  - `node_modules/`
  - `unpackage/`
- 完成文档整理后又重新跑了一次全量验证：
  - `35` 个测试文件
  - `260` 个测试通过
  - `npm run test`

### 打包交接入口继续整理，历史文档不再抢默认入口

- 新增了 [docs/打包交接说明.md](docs/打包交接说明.md)，专门告诉下一位 Codex：
  - 先读什么。
  - 当前项目做到哪里。
  - 哪些目录只是历史参考。
  - 哪些本机残留不建议当正式项目文档交付。
- 同步更新了：
  - [README.md](README.md)
  - [docs/README.md](docs/README.md)
  - [docs/当前状态与交接.md](docs/当前状态与交接.md)
  - [AGENTS.md](AGENTS.md)
  - [task_plan.md](task_plan.md)
  - [findings.md](findings.md)
- 这轮文档整理后的判断是：
  - `docs/specs/`、`docs/superpowers/specs/`、`docs/superpowers/plans/`、`docs/tasks/` 先保留。
  - 它们属于历史参考，不再作为默认阅读入口。
  - `.trae/documents/` 这类本机过程残留不建议当正式项目文档交付。

### 住处权限解锁开始继续回流到居民行为，手机已读命名也先收口一轮

- [utils/town/town-behavior-bias.js](utils/town/town-behavior-bias.js) 现在会继续消费 `player_relationship_permission_unlocked` 事件。也就是场景公开聊天刚解锁：
  - `canRequestVisit`：可请求拜访权限，表示玩家已经可以提出上门拜访请求。
  - `canEnterHome`：可进入住处权限，表示玩家已经可以直接进入对方住处。
  之后居民不再只是“权限数值变了”，而是更可能回住处或留在住处，给后续拜访承接真实落点。
- [components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue) 与 [stores/useTownStore.js](stores/useTownStore.js) 把手机未读清理主调用收口到 `markResidentPhoneReplyRead`；旧 `markResidentRemoteReplyRead` 只保留兼容别名，方便后续继续清理历史 `remote` 命名。
- 同步扩展了：
  - [tests/town/town-behavior-bias.spec.js](tests/town/town-behavior-bias.spec.js)
  - [tests/store/useTownStore.spec.js](tests/store/useTownStore.spec.js)
- 本次全量验证结果：
  - `35` 个测试文件
  - `260` 个测试通过
  - `npm run test`

### UI 文案、互动模式默认值与公开聊天后劲继续收口

- [tests/town/town-page-copy-integrity.spec.js](tests/town/town-page-copy-integrity.spec.js) 现已把 [pages/chat/chat.vue](pages/chat/chat.vue)、[components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue)、[components/TownDoorstepChatSheet.vue](components/TownDoorstepChatSheet.vue) 纳入中文文案完整性回归，当前可见 UI 文案不再只靠人工记忆判断。
- [composables/useCharacterState.js](composables/useCharacterState.js) 里 `interactionMode` 这个“互动模式状态”默认值已从旧 `'phone'` 调整为 `'face'`，避免面对面私聊页在缺少历史数据时回落到旧手机态。
- [utils/town/town-chat-invite-actions.js](utils/town/town-chat-invite-actions.js) 不再因为遗留 `remote=1 / entry=phone_contact` 路由参数而隐藏“邀请”动作，面对面私聊现在只看当前是否为 `face` 状态和是否命中居民。
- [stores/useTownStore.js](stores/useTownStore.js) 的场景公开聊天回流继续加深：只要居民在公开场合真的接了玩家的话，即使这一轮没有显式关系增减，也会生成 `player_resident_conversation_followup` 后续事件，方便后面行为偏置继续消费“刚在现场聊出后劲”的状态。
- 同步扩展了：
  - [tests/composables/useCharacterState.spec.js](tests/composables/useCharacterState.spec.js)
  - [tests/town/town-chat-invite-actions.spec.js](tests/town/town-chat-invite-actions.spec.js)
  - [tests/store/useTownStore.spec.js](tests/store/useTownStore.spec.js)
  - [tests/manual/navigation-regression-checklist.md](tests/manual/navigation-regression-checklist.md)
- 本次全量验证结果：
  - `35` 个测试文件
  - `260` 个测试通过
  - `npm run test`

### 面对面聊天页头部已收口为固定当面状态

- [pages/chat/chat.vue](pages/chat/chat.vue) 不再给 [components/ChatHeader.vue](components/ChatHeader.vue) 传入 `interactionMode` 这个“互动模式状态”，避免页面头部继续消费旧 phone / face 双态展示。
- [components/ChatHeader.vue](components/ChatHeader.vue) 已改为固定展示“当面”状态，不再渲染“远程 / 当面”切换标签，也不再保留 `mode-phone` 这类旧样式分支。
- 扩展了 [tests/town/town-page-script-syntax.spec.js](tests/town/town-page-script-syntax.spec.js)，新增对 `ChatHeader.vue` 脚本语法与“不得保留 phone-mode 头部展示”的断言。
- 本次全量验证结果：
  - `35` 个测试文件
  - `260` 个测试通过
  - `npm run test`

### 面对面聊天页先收口一轮旧 work / phone 模式入口

- [pages/chat/chat.vue](pages/chat/chat.vue) 已移除旧“打工”悬浮入口和 `useWorkActions` 接线，避免在面对面私聊页里直接把 `interactionMode` 这个“互动模式状态”重新切回旧的手机态。
- 扩展了 [tests/town/town-page-script-syntax.spec.js](tests/town/town-page-script-syntax.spec.js)，新增“面对面聊天页不得保留 legacy work-mode 入口”的断言。
- 同步更新了 [tests/manual/navigation-regression-checklist.md](tests/manual/navigation-regression-checklist.md)，把首页 / 场景页默认直接进私聊，以及聊天页不再暴露旧 work 入口写回回归清单。
- 这轮收口后，`chat.vue` 的页面边界更贴近“只负责面对面私聊”；但共享 composable 中残留的 `interactionMode` 旧逻辑还没有完全清完。

### 私聊主入口与 ChatFooter 邀请动作已接通

- 首页 [pages/index/index.vue](pages/index/index.vue) 与场景页 [pages/scene/scene.vue](pages/scene/scene.vue) 点击居民后，现在默认直接进入 [pages/chat/chat.vue](pages/chat/chat.vue)。
- `town-resident.vue` 的产品定位进一步收口为“次级详情页”，不再承担点击居民后的默认承接职责。
- [components/ChatFooter.vue](components/ChatFooter.vue) 现在只新增了一个“邀请”动作，没有把“关系 / 观察 / 一起去 / 去她那里”这些额外动作塞回工具栏。
- [pages/chat/chat.vue](pages/chat/chat.vue) 已在当前聊天线程里复用 `resident_invitation` 这条“居民邀约意图”链路；点击“邀请”后会先通过 `createPlayerResidentInvitation` 在 store 侧建档并写入邀约事件，再把邀约上下文注入当前私聊。
- 新增与扩展的测试：
  - [tests/town/town-chat-main-entry.spec.js](tests/town/town-chat-main-entry.spec.js)
  - [tests/town/town-chat-invite-actions.spec.js](tests/town/town-chat-invite-actions.spec.js)
  - [tests/town/town-page-script-syntax.spec.js](tests/town/town-page-script-syntax.spec.js)
- 本次全量验证结果：
  - `35` 个测试文件
  - `260` 个测试通过
  - `npm run test`

### 场景公开聊天开始回流住处权限与事件

- 场景公开聊天后的关系结算现在不再只改原始分值。
- 当公开聊天把 `playerRelationship` 这组“玩家与居民之间的结构化关系对象”推进到更稳定阶段时，会进一步解锁：
  - `canRequestVisit`：可请求拜访权限，表示玩家已经可以提出上门拜访请求。
  - `canEnterHome`：可进入住处权限，表示玩家已经可以直接进入对方住处。
- 这些权限变化会继续回流到住宅访问判断链路，因此公开聊天带来的关系推进，后续会真实影响住处访问。
- 公开聊天触发权限解锁时，也会新增玩家可见事件 `player_relationship_permission_unlocked`，让这类关系推进不再只是静默发生。
- 公开聊天里只要某个居民真的和玩家发生了关系推进，现在还会额外写入 `player_resident_conversation_followup`，并把 `sourceIntent` 标成 `scene_public_chat`。
- 这意味着公开聊天的后劲已经开始进入后续行为偏置，居民之后更可能在原地继续回味、继续接近玩家，而不是只有一个瞬时场景回复。
- 相关实现入口：
  - [stores/useTownStore.js](stores/useTownStore.js)
  - [utils/town/player-relationship-settlement.js](utils/town/player-relationship-settlement.js)
  - [utils/town/town-event-order.js](utils/town/town-event-order.js)
  - [utils/town/town-shell-view-models.js](utils/town/town-shell-view-models.js)
  - [tests/store/useTownStore.spec.js](tests/store/useTownStore.spec.js)

### 场景页多人公开聊天第一版落地

- [pages/scene/scene.vue](pages/scene/scene.vue) 已接入第一版公开聊天区：
  - 现场公共消息流
  - 公开消息输入
  - 调度中状态
  - 保留点单个角色进入私聊的能力
- 新增了场景级公共线程 `scene-public:<worldId>:<locationId>`。
- 这里的 `sceneChatId` 是“场景公共聊天线程标识”，表示同一地点会持续积累自己的公开聊天历史。
- 新增了 `sceneMemories`。这里的 `sceneMemories` 是“居民自己的即时场景记忆列表”，用来把公开聊天继续带进后续私聊和手机聊天。
- 场景调度结果现在会：
  - 决定哪些居民在公开场景里开口。
  - 给在场但未发言的居民补上旁听记忆。
  - 把更重要的公开场景记忆写入个人长期记忆。
  - 把部分关系变化写回 `playerRelationship`。这里的 `playerRelationship` 是“玩家与居民之间的结构化关系对象”。
- 相关实现入口：
  - [stores/useTownStore.js](stores/useTownStore.js)
  - [services/townSceneChatService.js](services/townSceneChatService.js)
  - [utils/town/town-scene-chat.js](utils/town/town-scene-chat.js)
  - [utils/town/town-entry-links.js](utils/town/town-entry-links.js)

### 场景页与记忆回流回归测试补齐

- 新增了：
  - [tests/town/town-scene-chat.spec.js](tests/town/town-scene-chat.spec.js)
- 扩展了：
  - [tests/town/town-entry-links.spec.js](tests/town/town-entry-links.spec.js)
  - [tests/town/town-shell-view-models.spec.js](tests/town/town-shell-view-models.spec.js)
  - [tests/town/town-page-copy-integrity.spec.js](tests/town/town-page-copy-integrity.spec.js)
  - [tests/town/town-page-script-syntax.spec.js](tests/town/town-page-script-syntax.spec.js)
- 该轮阶段性全量验证结果：
  - `33` 个测试文件
  - `237` 个测试通过
  - `npm run test`

## 2026-04-13

### 交接入口文档重建

- 重建了可直接交付的入口文档：
  - [README.md](README.md)
  - [docs/README.md](docs/README.md)
  - [docs/当前状态与交接.md](docs/当前状态与交接.md)
  - [task_plan.md](task_plan.md)
  - [progress.md](progress.md)
  - [findings.md](findings.md)
  - [docs/全局规则.md](docs/全局规则.md)
  - [AGENTS.md](AGENTS.md)
- 入口文档现在已按“交给下一位 Codex”的视角重写。
- 入口文档已去掉本机绝对路径，改为仓库相对路径，便于打包交接。

### 首页与居民页中文乱码修复

- 修复了：
  - [pages/index/index.vue](pages/index/index.vue)
  - [pages/town-resident/town-resident.vue](pages/town-resident/town-resident.vue)
- 新增了 [tests/town/town-page-copy-integrity.spec.js](tests/town/town-page-copy-integrity.spec.js)，用于拦截页面文案乱码和 `text` 标签断裂。
- 历史记录中的验证项包括：
  - `tests/town/town-page-copy-integrity.spec.js`
  - `tests/town/town-page-script-syntax.spec.js`
  - `npm run test`

### 手机聊天正式拆出

- 手机聊天已改为首页弹窗，不再跳到同一个 chat 页面里用“远程模式”伪装。
- 已落地：
  - [components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue)
  - [utils/town/town-entry-links.js](utils/town/town-entry-links.js)
- 手机聊天与面对面聊天共享同一居民、同一长期记忆与关系，但不共享同一条消息线程。

### 住宅拜访门口聊天第一版闭环

- 已经落地：
  - 门口聊天弹窗
  - 多轮门口对话
  - 同意进入
  - 推迟后“楼下等一会 / 约下次”
  - 不在家时“留消息”
- 相关实现入口：
  - [composables/useResidentDoorstepConversation.js](composables/useResidentDoorstepConversation.js)
  - [utils/town/town-home-visit-conversation.js](utils/town/town-home-visit-conversation.js)
  - [utils/town/town-home-visit-follow-ups.js](utils/town/town-home-visit-follow-ups.js)

## 2026-04-12

### 私宅访问权限与家庭轨道接入

- 私宅访问已经不再只看旧的 visitor 白名单，而开始读取结构化关系权限。
- `canRequestVisit` 和 `canEnterHome` 已进入访问判断链路。

### 玩家介入事件入口铺开

- 已支持：
  - 发起邀约
  - 加入当前活动
  - 关系导向入口
  - 私宅访问请求
- 这些入口已经可以把聊天的第一轮真实回复沉淀为后续事件。

## 2026-04-11

### 默认小镇与关系驱动能力补齐

- 默认小镇已具备更完整的工作日 / 周末节奏。
- 居民行为开始受到关系与近期事件偏置影响。
- 关系系统、事件流和小镇视图模型已经具备可持续扩展的基础。

## 当前总验收状态

- 当前记录的测试总量：`44` 个测试文件。
- 当前记录的通过总量：`313` 个测试。
- 当前可直接使用的主入口文档：
  - [README.md](README.md)
  - [docs/打包交接说明.md](docs/打包交接说明.md)
  - [docs/当前状态与交接.md](docs/当前状态与交接.md)
  - [task_plan.md](task_plan.md)
  - [AGENTS.md](AGENTS.md)
