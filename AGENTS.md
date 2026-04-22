# AiChat Agent Guide

最后更新：2026-04-17

这份文件是给下一位进入仓库的 Codex / Agent 的默认入口说明。先读它，再开始动代码。

## 先读顺序

1. [README.md](README.md)
2. [docs/打包交接说明.md](docs/打包交接说明.md)
3. [docs/当前状态与交接.md](docs/当前状态与交接.md)
4. [docs/全局规则.md](docs/全局规则.md)
5. [task_plan.md](task_plan.md)
6. [progress.md](progress.md)
7. [findings.md](findings.md)

## 如果你只有 5 分钟

- 这是“可自定义世界的 Agent 小镇模拟器”，不是旧的单角色聊天页。
- [pages/chat/chat.vue](pages/chat/chat.vue) 只负责面对面私聊。
- 手机聊天只走 [components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue)。
- 住宅拜访是一条住处访问协商机制，不是普通私聊皮肤。
- [pages/scene/scene.vue](pages/scene/scene.vue) 是多人现场聊天壳，留在现场聊天，点头像切进 1v1 私聊。
- 时间系统的手动跳转、手动设时和睡觉入口，这一轮已经统一收口到 store 级快进能力。

## 当前项目阶段

- 主线已经从“单角色聊天页”切到“Agent 小镇模拟器”。
- 现有主壳已经包括：
  - 小镇总览
  - 居民页
  - 关系页
  - 场景页
  - 面对面私聊
  - 手机聊天弹窗
  - 住宅拜访与门口聊天
- 场景页第一版多人公开聊天已经接通，并且页面结构已经收口成更接近聊天页的多人现场聊天壳。
- 公开聊天解锁出来的住处权限，已经开始继续影响居民后续行为。

## 这轮刚完成什么

1. 时间系统入口已经收口到 `advanceTimeTo(...)`
   - [composables/useGameTime.js](composables/useGameTime.js)
   - [stores/useTownStore.js](stores/useTownStore.js)
   - [pages/chat/chat.vue](pages/chat/chat.vue)
   - [pages/scene/scene.vue](pages/scene/scene.vue)
2. 主入口文档已经重写成“快速接手”视角。
3. 新增 / 更新了时间系统与主入口脚本结构回归：
   - [tests/composables/useGameTime.spec.js](tests/composables/useGameTime.spec.js)
   - [tests/town/town-page-script-syntax.spec.js](tests/town/town-page-script-syntax.spec.js)

## 已确认的产品边界

- [pages/chat/chat.vue](pages/chat/chat.vue) 只负责面对面私聊。
- 首页与场景页点击居民后，默认直接进入 [pages/chat/chat.vue](pages/chat/chat.vue)；[pages/town-resident/town-resident.vue](pages/town-resident/town-resident.vue) 只作为次级详情页。
- [components/ChatFooter.vue](components/ChatFooter.vue) 里只新增一个“邀请”动作。
- 手机聊天走首页手机入口与底部弹窗，不再走“远程 chat 页面”。
- 手机聊天必须保持“纯远程频道”语义；电话里可以谈拜访许可，但不能直接演成开门、进屋、面对面拥抱或递东西。
- 住宅拜访里，只有“不在家 / 无人应门”时才允许“留消息”；如果人在屋里但不方便，就在门口继续沟通。
- 住宅拜访不是普通私聊皮肤，而是一条围绕住处访问权限展开的门口协商机制。
- 后续场景页要继续支持多人公开聊天，同时保留点单个角色进入 [pages/chat/chat.vue](pages/chat/chat.vue) 私聊的能力。

## 你接手后默认先做什么

1. 先确认用户有没有重新改主线。
2. 如果没有，默认继续推进：
   - 场景页多人公开聊天调度与记忆回流深化。
   - 关系 -> 权限 -> 事件 -> 行为 这条后劲链继续做深。
   - 旧功能手工回归。
3. 历史 specs / plans 的乱码继续清，但不要让它盖过当前主线。

补充说明：

- `worldSemantics` 第一阶段虽然已经落地，但当前不是默认继续推进方向；除非用户重新开启这条线，否则不要把它当接手后的第一主线。

## 文档判断

- 当前主入口是：
  - [README.md](README.md)
  - [docs/打包交接说明.md](docs/打包交接说明.md)
  - [docs/当前状态与交接.md](docs/当前状态与交接.md)
  - [task_plan.md](task_plan.md)
  - [progress.md](progress.md)
  - [findings.md](findings.md)
- `docs/specs/`、`docs/superpowers/specs/`、`docs/superpowers/plans/`、`docs/tasks/` 目前都保留，但属于历史参考，不是默认阅读入口。
- `.trae/documents/`、`.superpowers/`、`.hbuilderx/`、`.npm-cache/`、`node_modules/`、`unpackage/` 这类本机目录不建议当正式交付内容。

## 关键代码入口

- 全局小镇状态：
  - [stores/useTownStore.js](stores/useTownStore.js)
- 时间与居民推进：
  - [composables/useGameTime.js](composables/useGameTime.js)
  - [services/townSimulationService.js](services/townSimulationService.js)
  - [services/townClockService.js](services/townClockService.js)
- 门口拜访：
  - [composables/useResidentDoorstepConversation.js](composables/useResidentDoorstepConversation.js)
  - [utils/town/town-home-visit-conversation.js](utils/town/town-home-visit-conversation.js)
  - [utils/town/town-home-visit-follow-ups.js](utils/town/town-home-visit-follow-ups.js)
  - [utils/town/town-doorstep-chat-actions.js](utils/town/town-doorstep-chat-actions.js)
- 手机聊天：
  - [components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue)
  - [utils/town/town-phone-chat-guard.js](utils/town/town-phone-chat-guard.js)
  - [utils/town/town-entry-links.js](utils/town/town-entry-links.js)
- 场景公开聊天：
  - [pages/scene/scene.vue](pages/scene/scene.vue)
  - [services/townSceneChatService.js](services/townSceneChatService.js)
  - [utils/town/town-scene-chat.js](utils/town/town-scene-chat.js)
- 私聊主入口与邀约动作：
  - [pages/chat/chat.vue](pages/chat/chat.vue)
  - [components/ChatFooter.vue](components/ChatFooter.vue)
  - [utils/town/town-chat-invite-actions.js](utils/town/town-chat-invite-actions.js)
- 玩家意图与结算：
  - [utils/town/town-player-intent-followups.js](utils/town/town-player-intent-followups.js)
  - [utils/town/town-player-intent-settlement.js](utils/town/town-player-intent-settlement.js)
- 关系系统：
  - [utils/town/player-relationship.js](utils/town/player-relationship.js)
  - [utils/town/player-relationship-settlement.js](utils/town/player-relationship-settlement.js)
  - [utils/town/town-behavior-bias.js](utils/town/town-behavior-bias.js)

## 关键协作规则

- 引用英文项目字段时，必须同步解释中文含义。
- 例如：
  - `trust`：信任度。
  - `familiarity`：熟悉度。
  - `affinity`：好感度。
  - `tension`：紧张度。
  - `permissions`：权限状态对象。
- 如果继续引用 `canRequestVisit`、`canEnterHome`、`interactionMode` 这类字段，也要同步说明它们在当前逻辑中的中文含义与作用。

## 建议先跑的验证

```powershell
.\node_modules\.bin\vitest.cmd run tests/composables/useGameTime.spec.js tests/town/town-page-script-syntax.spec.js
.\node_modules\.bin\vitest.cmd run tests/town/town-page-copy-integrity.spec.js tests/town/town-page-script-syntax.spec.js
```

## 不要先做的事

- 不要先批量删除历史 plans / specs。
- 不要先做大规模架构翻修。
- 不要跳过回归检查就宣称旧功能完全稳定。
- 不要在没有真实游玩证据前，把所有居民默认切到 `agent`。
