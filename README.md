# AiChat

最后更新：2026-04-17

`AiChat` 已经不再是“单角色聊天页”，而是在演进成“可自定义世界的 Agent 小镇模拟器”。当前主线已经具备小镇总览、居民页、关系页、场景页、面对面私聊、手机聊天、住宅拜访与门口协商，以及第一版多人公开场景聊天。

## 5 分钟入门

如果你是第一次接手这个仓库的 Codex，先按这个顺序建立上下文：

1. [打包交接说明](docs/打包交接说明.md)
2. [当前状态与交接](docs/当前状态与交接.md)
3. [文档导航](docs/README.md)
4. [当前任务计划](task_plan.md)
5. [全局规则](docs/全局规则.md)
6. [进度记录](progress.md)
7. [关键判断与风险](findings.md)
8. [AGENTS 指南](AGENTS.md)

## 先记住这 6 件事

- [pages/chat/chat.vue](pages/chat/chat.vue) 只负责面对面私聊，不再承载手机聊天。
- 手机聊天只走 [components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue) 这条底部弹窗链路，而且必须保持“纯远程频道”语义。
- 住宅拜访不是普通私聊皮肤，而是一条围绕住处访问权限展开的“门口协商机制”。
- [pages/scene/scene.vue](pages/scene/scene.vue) 现在是“多人现场聊天壳”，留在现场说话，点头像切到 1v1 私聊。
- 世界时间的手动跳转、手动设时和睡觉入口，这一轮已经统一收口到 store 级快进能力，会真实推进居民 slice，而不只是改时钟显示。
- 关系真正落在 `playerRelationship` 这组“玩家与居民之间的结构化关系对象”里，后续要继续消费的是“关系 -> 权限 -> 事件 -> 行为”这条链。

## 这轮刚完成的关键更新

- 时间系统入口已收口：
  - [composables/useGameTime.js](composables/useGameTime.js) 现在会先停表，再调用 [stores/useTownStore.js](stores/useTownStore.js) 里的 `advanceTimeTo(...)`，最后恢复时钟。
  - [pages/chat/chat.vue](pages/chat/chat.vue) 不再通过旧的 `currentTime.value = newTime` 把快进结果写回成“只改时钟”的旧路径。
  - [pages/scene/scene.vue](pages/scene/scene.vue) 的睡觉入口现在也会走同一套停表 -> 快进 -> 恢复流程。
- 主入口文档已重写成“新 Codex 快速接手”视角，减少必须先翻历史 plans 才能看懂项目的情况。

## 当前主线能力

- 小镇总览：[pages/index/index.vue](pages/index/index.vue)
- 居民次级详情：[pages/town-resident/town-resident.vue](pages/town-resident/town-resident.vue)
- 关系页：[pages/town-relationship/town-relationship.vue](pages/town-relationship/town-relationship.vue)
- 多人场景页：[pages/scene/scene.vue](pages/scene/scene.vue)
- 面对面私聊页：[pages/chat/chat.vue](pages/chat/chat.vue)
- 手机聊天弹窗：[components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue)
- 住宅拜访与门口聊天：[components/TownDoorstepChatSheet.vue](components/TownDoorstepChatSheet.vue)
- 小镇状态主源：[stores/useTownStore.js](stores/useTownStore.js)

## 关键代码入口

- 时间与居民推进：
  - [stores/useTownStore.js](stores/useTownStore.js)
  - [composables/useGameTime.js](composables/useGameTime.js)
  - [services/townSimulationService.js](services/townSimulationService.js)
  - [services/townClockService.js](services/townClockService.js)
- 场景公开聊天：
  - [pages/scene/scene.vue](pages/scene/scene.vue)
  - [services/townSceneChatService.js](services/townSceneChatService.js)
  - [utils/town/town-scene-chat.js](utils/town/town-scene-chat.js)
- 手机聊天：
  - [components/TownPhoneChatSheet.vue](components/TownPhoneChatSheet.vue)
  - [utils/town/town-phone-chat-guard.js](utils/town/town-phone-chat-guard.js)
  - [utils/town/town-entry-links.js](utils/town/town-entry-links.js)
- 门口拜访：
  - [composables/useResidentDoorstepConversation.js](composables/useResidentDoorstepConversation.js)
  - [utils/town/town-home-visit-conversation.js](utils/town/town-home-visit-conversation.js)
  - [utils/town/town-home-visit-follow-ups.js](utils/town/town-home-visit-follow-ups.js)
  - [utils/town/town-doorstep-chat-actions.js](utils/town/town-doorstep-chat-actions.js)
- 关系与后劲：
  - [utils/town/player-relationship.js](utils/town/player-relationship.js)
  - [utils/town/player-relationship-settlement.js](utils/town/player-relationship-settlement.js)
  - [utils/town/town-behavior-bias.js](utils/town/town-behavior-bias.js)

## 当前默认推进方向

1. 继续做深 [pages/scene/scene.vue](pages/scene/scene.vue) 的公开聊天调度、记忆回流和后续行为承接。
2. 继续把关系变化稳定回流到权限、事件和居民行为，而不是只改结构化分值。
3. 做旧功能手工回归，例如购物、物品转移、旧移动链路。
4. 历史 specs / plans 的乱码清理继续做，但它不该再盖过当前主线。

补充说明：

- `worldSemantics` 这个“世界语义配置对象”第一阶段已经落地，但当前不是默认继续推进方向；除非用户重新开启这条线，否则不要把它当成第一主线。

## 当前主要风险

- 场景页多人聊天已经能跑，但“谁继续跟进、谁只旁听、谁把后劲带回住处”这条链还没做深。
- 手机聊天、面对面私聊、门口拜访的产品边界已经清楚，但底层 helper 还没完全统一。
- 旧功能还没完成系统性手工回归。
- 历史 specs / plans 仍有中文乱码和旧预期残留，所以它们只能作为历史参考，不该充当默认入口。

## 常用验证

```powershell
.\node_modules\.bin\vitest.cmd run tests/composables/useGameTime.spec.js tests/town/town-page-script-syntax.spec.js
.\node_modules\.bin\vitest.cmd run tests/town/town-page-copy-integrity.spec.js tests/town/town-page-script-syntax.spec.js
$env:npm_config_cache = "$PWD\.npm-cache"; npm run test
```

说明：

- 这轮最新刚补过的是“时间系统入口”和“主入口脚本结构”的聚焦回归。
- 如果要交付较高置信度结果，仍建议再跑一次全量 `npm run test`。
