# AiChat 当前任务计划

最后更新：2026-04-17

## 当前阶段目标

把项目整理到“新接手的 Codex 可以快速看懂并继续推进”的阶段，同时继续沿着小镇主线往前做，而不是回到“往旧聊天页里堆散点功能”的做法。

## 当前判断

### 已完成

- 主入口文档已经重写成“快速接手”视角：
  - [README.md](README.md)
  - [docs/打包交接说明.md](docs/打包交接说明.md)
  - [docs/README.md](docs/README.md)
  - [docs/当前状态与交接.md](docs/当前状态与交接.md)
  - [AGENTS.md](AGENTS.md)
- 小镇总览、居民页、关系页、场景页、面对面聊天页都已接通。
- 首页与场景页点击居民后的默认入口，已经改为直接进入 [pages/chat/chat.vue](pages/chat/chat.vue)。
- 手机聊天已从面对面聊天里拆出，并明确收口为“纯远程频道”。
- 住宅拜访已具备门口聊天与后续动作的第一版闭环。
- 场景页第一版多人公开聊天已接通。
- 角色级 `behaviorMode`（行为模式）与 `townRuntime.autonomy`（自治运行态缓存）已落地。
- 时间系统入口已经收口：
  - [composables/useGameTime.js](composables/useGameTime.js) 统一走 `advanceTimeTo(...)`。
  - [pages/chat/chat.vue](pages/chat/chat.vue) 已移除旧的直接写时钟回写。
  - [pages/scene/scene.vue](pages/scene/scene.vue) 的睡觉入口已走同一套快进流程。
- 这轮新增 / 更新了时间系统与主入口脚本结构回归：
  - [tests/composables/useGameTime.spec.js](tests/composables/useGameTime.spec.js)
  - [tests/town/town-page-script-syntax.spec.js](tests/town/town-page-script-syntax.spec.js)

### 进行中

- 继续做深 [pages/scene/scene.vue](pages/scene/scene.vue) 的公开聊天调度、记忆回流和后续行为承接。
- 继续把结构化关系 `playerRelationship` 更稳定地回流到权限、事件和行为。
- 继续做旧功能手工回归，例如购物、物品转移、旧移动链路。
- 继续清理历史 specs / plans 文档里的中文乱码，但不让它盖过主线。
- 继续收口手机聊天、面对面私聊、门口拜访之间残留的共享 helper 差异。

### 尚未收口

- 场景页公开聊天的“谁继续追问、谁只旁听、谁把后劲带回住处”还没做深。
- 三条会话链路的底层结算 helper 还没完全统一。
- 旧功能的系统性手工回归还没做完。
- 历史规格文档仍有乱码和旧预期残留。
- AI 居民自治的阈值和缓存窗口还需要继续观察真实游玩反馈。

## 下一位 Codex 的默认执行顺序

1. 先阅读：
   - [README.md](README.md)
   - [docs/打包交接说明.md](docs/打包交接说明.md)
   - [docs/当前状态与交接.md](docs/当前状态与交接.md)
   - [docs/全局规则.md](docs/全局规则.md)
   - [AGENTS.md](AGENTS.md)
2. 如果用户没有重新改主线，默认先推进：
   - 场景页公开聊天深化。
   - 关系 -> 权限 -> 事件 -> 行为 回流链。
   - 旧功能手工回归。
3. 历史文档乱码继续清，但不要先从历史设计稿开刀。

## 当前优先级

### P1：当前主线

- 做深 [pages/scene/scene.vue](pages/scene/scene.vue) 的多人公开聊天。
- 让 `playerRelationship` 继续稳定影响权限、事件和居民行为。
- 守住手机聊天、面对面私聊、门口拜访三条链路的产品边界。

### P2：交付稳定性

- 做旧功能手工回归。
- 保持主入口文档同步。
- 保持时间系统入口的回归测试稳定。

### P3：文档与历史清理

- 继续清理历史 specs / plans 的乱码。
- 继续把高频被回看的历史文档收口到当前边界。

补充说明：

- `worldSemantics` 当前不是默认继续推进项；除非用户重新开启这条线，否则先停在已落地的一层。

## 现在不要先做的事

- 不要先大规模重构 store。
- 不要先批量删除历史 plans / specs。
- 不要跳过回归就宣称旧功能完全稳定。
- 不要在没有证据前把所有居民默认切成 `agent`。
