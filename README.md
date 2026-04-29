# AiChat

## 2026-04-27 更新

- 场景页 [pages/scene/scene.vue](pages/scene/scene.vue) 右上角现已新增“设置”入口，可进入独立场景编辑页 [pages/scene-editor/scene-editor.vue](pages/scene-editor/scene-editor.vue)。
- 新增 [utils/town/town-scene-content.js](utils/town/town-scene-content.js)，统一处理 `sceneContent`（场景内容）的归一化、目标场景定位与保存回写。
- 当前这轮只完成 `sceneContent`（场景内容）里 `zones`（区域）与 `activities`（事项）的编辑和保存；居民行为、相遇判定还没有接入这层数据。

## 2026-04-28 更新

- 默认小镇种子数据 [utils/town/default-world-template.js](utils/town/default-world-template.js) 现已预写入公共地点和住宅区的 `sceneContent`（场景内容）。
- 预设地点已包含如“月街咖啡”“旧灯书屋”“港口公园”“落潮码头”等区域与事项，方便直接进项目试玩，而不必先手动创建。
- 为了兼容旧存档，读取 `default-town`（默认小镇）时也会自动补齐缺失的场景内容种子；这条回填不会改动用户自定义世界。

最后更新：2026-04-26

`AiChat` 当前主线目标已经收口为“AI 小镇”。
它不是单个角色聊天应用，而是一个会持续运转、居民会自己生活、会自己产生关系和对话、玩家可以介入其中的中文小镇模拟项目。

## 最短接手路径

1. [文档导航](docs/README.md)
2. [当前状态与交接](docs/当前状态与交接.md)
3. [当前执行分发页](task_plan.md)
4. [AiChat「AI 小镇」总规划](docs/specs/2026-04-23-aichat-ai-town-master-plan.md)
5. [AiChat 自治生活主链 v1 设计稿](docs/superpowers/specs/2026-04-26-aichat-autonomous-living-loop-v1-design.md)
6. [AiChat Autonomous Living Loop v1 Implementation Plan](docs/superpowers/plans/2026-04-26-aichat-autonomous-living-loop-v1-implementation-plan.md)
7. [AiChat 自治生活主链 v1 任务板](docs/tasks/2026-04-26-aichat-autonomous-living-loop-v1-task-board.md)
8. [AGENTS 指南](AGENTS.md)

## 当前唯一权威主线

1. [AiChat「AI 小镇」总规划](docs/specs/2026-04-23-aichat-ai-town-master-plan.md)
2. [AiChat 自治生活主链 v1 设计稿](docs/superpowers/specs/2026-04-26-aichat-autonomous-living-loop-v1-design.md)
3. [AiChat Autonomous Living Loop v1 Implementation Plan](docs/superpowers/plans/2026-04-26-aichat-autonomous-living-loop-v1-implementation-plan.md)
4. [AiChat 自治生活主链 v1 任务板](docs/tasks/2026-04-26-aichat-autonomous-living-loop-v1-task-board.md)

当前默认从任务板 `T1` 开始继续：
`T1 生活接触成立`

## 补充参考

- [AiChat 第二阶段实施计划：更像真的在生活的小镇](docs/superpowers/plans/2026-04-26-aichat-phase2-living-town-implementation-plan.md)
- [AiChat 第二阶段预备任务板：让小镇更像真的在生活](docs/tasks/2026-04-24-aichat-phase2-prep-task-board.md)
- [AiChat 当前补强优先级计划](docs/superpowers/plans/2026-04-24-aichat-current-reinforcement-priority-plan.md)
- `docs/superpowers/plans/2026-04-24-aichat-phase2-t1-*.md` 到 `T6`
- [历史文档索引](docs/history/README.md)

除“当前唯一权威主线”外，其余计划默认只承担背景参考角色，不替代当前任务排序。

## 当前主链能力

- 小镇首页已经是观察台入口：[pages/index/index.vue](pages/index/index.vue)
- 场景页已经是地点现场入口：[pages/scene/scene.vue](pages/scene/scene.vue)
- 居民详情页和关系页已经接入世界快照投影
- 玩家可进行面对面私聊、场景公开聊天、手机聊天、门口拜访
- 第一阶段 `T1-T8` 已完成，时间推进、居民时间片模拟、世界快照、首页、场景页、主链调试都已收口

## 这轮要做什么

当前第一优先子项目不是婚恋、搬家或更多聊天入口，而是：

**先让居民稳定过日子，并且会自己持续聊起来。**

也就是让以下闭环真正成立：

`生活调度 -> 居民接触 -> 自治线程 -> 多轮对白 -> 世界回写 -> 页面投影`

## 关键代码入口

- 全局小镇状态：
  - [stores/useTownStore.js](stores/useTownStore.js)
- 时间与居民推进：
  - [composables/useGameTime.js](composables/useGameTime.js)
  - [services/townSimulationService.js](services/townSimulationService.js)
  - [services/townClockService.js](services/townClockService.js)
- 场景现场与公开聊天：
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

## 文档分层

- 当前主线：见 [docs/README.md](docs/README.md)
- 历史归档：见 [docs/history/README.md](docs/history/README.md)
- 模板资料：见 [docs/模板库/00-模板使用说明.md](docs/模板库/00-模板使用说明.md)

## 常用验证

```powershell
.\node_modules\.bin\vitest.cmd run tests/town/town-simulation.spec.js tests/store/useTownStore.spec.js
.\node_modules\.bin\vitest.cmd run tests/town/town-shell-view-models.spec.js tests/town/town-scene-overview-entry.spec.js
$env:npm_config_cache = "$PWD\.npm-cache"; npm run test
```
