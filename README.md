# GBF Solomonis Map Helper — 项目文档

> 面向后续维护者与 AI 的主文档。需求背景见 [`REQUIREMENTS.md`](REQUIREMENTS.md)（游戏机制、端点抓包、数据结构）。
> 本文档覆盖：架构、数据流、模块职责、协议、持久化、开发指南、已知限制。

---

## 1. 项目概览

一个**纯只读** Chrome/Edge **MV3 扩展**，为 GBF「Evoking Solomonis」（ソロモナスの賢者 / `#arcarum3/dungeon`）提供**独立弹窗窗口**中的地图全貌：

- 地图实时同步（玩家位置、节点状态、商店库存、缩圈）
- 节点筛选（类型 chips + 特殊事件）、路径规划（5 种导航）
- **导本（Guide Book / spacebook）图鉴**：自动采集、status_id 映射学习、日文/中文显示、收藏
- 队伍状态（角色 HP 条）、Sephira 金币、回合/缩圈状态栏

**反作弊红线**（不可打破）：扩展对游戏页面是**只读旁观者**，对游戏服务器**完全静默**。所有数据来自被动监听 fetch/XHR 响应；不修改请求/响应/DOM、不触发点击、不主动发包。唯一的"主动网络"是**拉取 CDN 静态图片资源**（导本图标、背景），这属于读公开静态资源，与游戏 API 无关。

---

## 2. 快速开始

```bash
# 无构建步骤 —— 纯静态扩展
# 1. Chrome → chrome://extensions → 开发者模式 → 加载已解压的扩展程序
#    选择本仓库根目录（D:\reasonixWrokspace\gbf-rouge-helper）
# 2. 游戏开在 game.granbluefantasy.jp，进入 Evoking Solomonis 地城
# 3. 点扩展图标 → Open Map Window（或等扩展自动打开）
```

注意：**目录下不能有以 `_` 开头的文件**（Chrome 保留字，会导致 "Cannot load extension"）。`.reasonix/`、`analysis/`、`*.har` 在 `.gitignore` 中，不会进入扩展目录。

---

## 3. 目录结构

```
.
├── manifest.json              # MV3 清单（两个 content script + module SW）
├── background.js              # Service Worker：状态机、消息路由、窗口管理、图标抓取
├── content.js                 # MAIN world 注入：被动 hook fetch/XHR → postMessage
├── relay.js                   # ISOLATED world：postMessage → chrome.runtime 转发
├── popup/                     # 工具栏弹窗（打开助手窗口的入口）
│   ├── popup.html / popup.js
├── shared/                    # 扩展共享模块（ESM，background 与 window 共用）
│   ├── protocol.js            # ★ 消息协议单一来源（所有 channel/type 字符串）
│   ├── constants.js           # 游戏常量（DUNGEON_STATUS、MIASMA_RADIUS；节点数据已迁移到 node-registry）
│   ├── node-registry.js       # ★ 节点类型单一来源（枚举/标签/颜色/图标/特殊事件）
│   ├── dungeon-mutations.js   # ★ 地图节点状态更新的唯一实现（move/finish/shrink/appearance）
│   ├── i18n.js                # 中英双语 i18n（全局 I18N，非模块，供 popup+window）
│   ├── guidebook-data.js      # ★ 导本静态数据库（GUIDEBOOK_DB + GUIDEBOOK_STATUS_ID）
│   ├── guidebook-icons.js     # 导本图标表（status_id → icon_type）
│   └── guidebook-zh.js        # 导本中文翻译表（entry id → zh）
├── window/                    # 助手窗口（独立弹窗页面）
│   ├── index.html             # 唯一页面（topbar + map canvas + 各 overlay）
│   ├── styles.css             # 全部样式
│   ├── app.js                 # ★ 窗口主逻辑（消息分发、渲染、导航、图鉴 UI）
│   ├── map-renderer.js        # Canvas 地图渲染器（游戏素材）
│   ├── pathfinder.js          # 路径规划算法（BFS/DFS）
│   ├── filter-panel.js        # 筛选面板（类型 chips + 特殊事件行）
│   ├── guidebook-store.js     # ★ 导本学习引擎（运行时池、匹配、持久化、导入导出）
│   └── miasma-predictor.js    # 缩圈状态预测 + 校准（MiasmaCalibration）
├── assets/                    # 游戏素材（从 CDN 抓取）：map_bg/、node_icon/、icon_book_effect/、miasma_circle_*.png 等
├── analysis/                  # 抓包分析脚本与参考文件（gitignore，不随扩展发布）
├── REQUIREMENTS.md            # 需求文档（游戏机制/端点/数据结构）
└── icons/                     # 扩展图标
```

代码量约 6.8k 行（不含 assets/analysis/har）。

---

## 4. 架构与数据流

### 4.1 组件

MV3 扩展，四个运行时组件：

| 组件 | 世界 | 职责 |
|---|---|---|
| `content.js` | MAIN（`document_start`） | hook `window.fetch` 与 `XMLHttpRequest`，匹配游戏 API URL，把**响应 JSON**（附 `_requestBody`）postMessage 到页面 |
| `relay.js` | ISOLATED | 监听页面 postMessage，转发到 background（`chrome.runtime.sendMessage`） |
| `background.js` | Service Worker（ESM） | 维护 `gameState` 单一事实源、持久化到 `storage.session`、向助手窗口广播 |
| `window/app.js` | 助手窗口（module） | 接收广播渲染 UI；向 background 发请求（get-state、开窗口、抓图标） |

> **为什么 MAIN world 注入？** 游戏自身的脚本也在 MAIN world，扩展要 hook 的是**游戏发起的** fetch/XHR，必须与游戏脚本同世界才能替换其 `window.fetch`。`relay.js` 在 ISOLATED world 桥接回扩展世界。

### 4.2 消息通道总览

三条通道（全部常量定义在 `shared/protocol.js`）：

```
[游戏页面]                          [background SW]                    [助手窗口]
fetch/XHR hook ──postMessage──▶ relay ──MSG_GAME_DATA──▶ handleGameData()
                                                              │ broadcastToWindow()
                                                              ▼
                                            MSG_WINDOW_DATA {type, payload} ──▶ app.js handleWindowMessage()
                                                              ▲
                                                              │ MSG_GET_STATE / MSG_OPEN_WINDOW /
                                                              │ MSG_OPEN_GUIDEBOOK_TAB / MSG_FETCH_BOOK_ICONS
                                                              └────────── app.js / popup.js
```

- **游戏 → background**：`MSG_GAME_DATA`（`gbf-helper:game-data`），payload `{type: DATA_*, data}`。DATA_* 与 content.js 的 `PATTERNS` key 一一对应。
- **background → 窗口**：`MSG_WINDOW_DATA`（`gbf-helper:window-data`），payload `{type: TYPE_*, payload}`。TYPE_* 是窗口能理解的高层事件。
- **窗口/popup → background**：`MSG_GET_STATE`、`MSG_OPEN_WINDOW`、`MSG_OPEN_GUIDEBOOK_TAB`、`MSG_FETCH_BOOK_ICONS`。

**新增一个游戏端点的完整链路**（三处都要改，全部用 protocol.js 常量）：
1. `content.js` `PATTERNS` 加一个正则 key
2. `background.js` `handleGameData` 加一个 case（+ 处理函数）
3. `window/app.js` `handleWindowMessage` 加一个 case（如需要展示）

### 4.3 数据流示例

**地图初始化**：进入地城 → 游戏请求 `arcarum3/dungeon/content/index/` → content 捕获 → relay → background `handleMapInit`（更新 gameState.map，广播 `TYPE_MAP_INIT`）→ 窗口 `applyFullMap`（建 nodeMap、渲染、校准缩圈）。

**移动一步**：`move_node` 响应 → `handleMoveNode`（更新位置/回合/缩圈，`extractPartyStatus` 同步队伍 HP，`applyMove` 更新节点状态，广播 `TYPE_MOVE_UPDATE`）→ 窗口更新渲染 + 路径自动前进/清除。

**导本同步**：打开游戏导本页 → `spacebook_status_list` → `handleSpacebookList`（覆盖 owned 列表，清除 stale 标记，广播 `TYPE_GUIDE_BOOKS`）。

---

## 5. 协议字典（shared/protocol.js）

### 5.1 窗口 → background（`chrome.runtime.sendMessage({channel})`）

| 常量 | 值 | 载荷 |
|---|---|---|
| `MSG_OPEN_WINDOW` | `gbf-helper:open-window` | — |
| `MSG_GET_STATE` | `gbf-helper:get-state` | 回 `gameState` + `shopStock`（Map 序列化为对象） |
| `MSG_GET_MIASMA_LOG` | `gbf-helper:get-miasma-log` | 回 `miasmaLog` 数组（调试用，UI 已无入口） |
| `MSG_OPEN_GUIDEBOOK_TAB` | `gbf-helper:open-guidebook-tab` | 打开不可见导本刷新窗口 |
| `MSG_FETCH_BOOK_ICONS` | `gbf-helper:fetch-book-icons` | `{iconTypes: number[]}` |

### 5.2 游戏 → background（`MSG_GAME_DATA` 的 `type`）

| 常量 | 值（URL 正则 key） | 触发 |
|---|---|---|
| `DATA_MAP_INIT` | `mapInit` | 地城 `content/index` |
| `DATA_MOVE_NODE` | `moveNode` | `rest/.../move_node` |
| `DATA_FINISH_NODE` | `finishNode` | `finish_node_event` |
| `DATA_PROCEED` | `proceed` | `proceed_node_event` |
| `DATA_SPACEBOOK_ADD` | `spacebookAdd` | `..._spacebook_status_add`（三选一确认） |
| `DATA_SPACEBOOK_LIST` | `spacebookList` | `spacebook_status_list`（导本页） |
| `DATA_REPORT_BOOK` | `reportBook` | `report/spacebook_status_list/`（战斗记录页） |
| `DATA_INCIDENT` | `incident` | `incident_choose` |
| `DATA_PARTY_STATUS` | `partyStatus` | `party_status` |
| `DATA_SHOP_LINEUP` | `shopLineup` | `dungeon_shop_lineup/` |
| `DATA_SHOP_PURCHASE` | `shopPurchase` | `purchase_dungeon_shop_item` |
| `DATA_BATTLE_RESULT` | `battleResult` | `/result/content/index/`（战斗结算页） |
| `DATA_RAID_START` | `raidStart` | `rest/raid/start.json` |

### 5.3 background → 窗口（`MSG_WINDOW_DATA` 的 `type`）

见 `background.js` 各 handler 与 `window/app.js` `handleWindowMessage`。核心：
`TYPE_MAP_INIT` / `TYPE_MOVE_UPDATE` / `TYPE_FINISH_NODE` / `TYPE_PROCEED` / `TYPE_PARTY_STATUS` / `TYPE_GUIDE_BOOKS` / `TYPE_GUIDEBOOK_ICONS` / `TYPE_GUIDEBOOKS_STALE` / `TYPE_GUIDEBOOK_REFRESH_STARTED|FAILED` / `TYPE_SHOP_STOCK` / `TYPE_SHOP_GUIDEBOOKS` / `TYPE_PICK_CANDIDATES` / `TYPE_PICK_DONE` / `TYPE_REPORT_BOOKS` / `TYPE_DUNGEON_POINT`。

---

## 6. 模块详解

### 6.1 content.js（被动监听）

- 在 MAIN world `document_start` 注入，IIFE，**不能 import**（所以 PATTERNS 字符串与 protocol.js 手动同步——见 4.2 警告）。
- hook 两个 API：`window.fetch`（返回后 `response.clone().json()`）与 `XMLHttpRequest`（`load` 事件读 `responseText`）。
- **关键陷阱**：`postMessage` 是同步克隆，必须在调用前把请求体塞进 JSON（`json._requestBody = JSON.parse(body)`），否则 background 永远拿不到（例如三选一的 `status_ids`）。请求体来自 `args[1].body`（fetch）或 `args[0]`（XHR）。
- 只监听，永不拦截/修改返回值。

### 6.2 background.js（状态机）

**`gameState`**（单一事实源）：
```js
{
  map, currentNodeId, totalTurn, dungeonStatus, miasmaInfo,
  partyStatus, dungeonPoint,          // Sephira 金币
  guideBooks: [],                      // 拥有的导本（status_list 覆盖）
  guideBookCandidates: [],             // 三选一候选（proceed 里 status_list）
  guideBooksStale,                     // 战斗后置 true（掉落可能漏抓）
  shopStock: Map<nodeId, {items, coinAfter}>,
  shopGuidebooks: {},                  // status_id → rec（商店见过的导本，累积池）
}
```

要点：
- **持久化**：`snapshotGameState()` + debounce 300ms 写 `chrome.storage.session`（key `gbfHelperSessionState`）；SW 唤醒时 `restoreGameState()`。`shopStock` 是 Map，序列化后 `Object.entries` 得到**字符串 key**，恢复时必须 `Number(k)` 转回（否则 `get(currentNodeId)` 数字 key 找不到——历史 bug，勿改）。
- **窗口管理**：`openHelperWindow`（记住尺寸，`gbfHelperWindowSize`）、`onBoundsChanged` 防抖保存尺寸、`onRemoved` 清 id。
- **导本刷新窗口**（`openGuidebookTab`）：stale 时用户点导本按钮，开一个 340×220 的**右下角不聚焦 popup** 打开游戏导本页 `#arcarum3/book`。popup 可见 → `document.hidden === false` → 不被节流 → 游戏 SPA 自动发 `spacebook_status_list` → 数据到了自动关窗。12s 超时兜底广播 `TYPE_GUIDEBOOK_REFRESH_FAILED`。**扩展自身绝不发包**，只开窗口让游戏自己刷。
- **图标抓取**（`fetchMissingBookIcons`）：对未内置的 `icon_type`，从游戏 CDN 拉 `icon_book_effect/book_effect_{t}.png` → base64 dataURL → `chrome.storage.local`（`gbf-helper-book-icons`）→ 广播 `TYPE_GUIDEBOOK_ICONS`。
- **队伍 HP 同步**：`extractPartyStatus` 从 `action_scenario_list[].after_party_status` 取（after 是移动后快照，before 落后一步——已验证）。`handleRaidStart` 只记录不广播（战斗中 pid ≠ image_id，头像会 404）。
- `handleIncident` = `handleProceed`（incident_choose 不带位置字段，不能动 currentNodeId——历史 bug：曾把玩家位置清掉）。
- `handleSpacebookAdd`：从 `_requestBody.status_ids` 解析三选一结果，把候选合并进 owned 列表。

### 6.3 window/app.js（窗口主逻辑）

- `init()`：canvas 尺寸（DPR 适配 + ResizeObserver）、restore 图标缓存、建 renderer/filterPanel、`MSG_GET_STATE` 拉全量、监听广播、罗盘菜单、导本弹窗/图鉴、语言切换、键盘（Esc 清路径、F 聚焦）、rAF 动画循环。
- `handleWindowMessage`：按 TYPE_* 分发（见 4.3 示例）。
- **路径交互**：`handleNodeClick`（点玩家=清空；点路径上已有点=截断到该点；否则从路径末端续接最短路径）、`clearCurrentPath`、`reEvaluatePath`。
- **导航菜单**：`NAV_ITEMS` 数组驱动 `buildNavMenu()`，加导航只需加一项 `{id, icon, labelKey, action}`。
- **自定义路径模式**：`customMode` + `customWaypoints`（≤6），点击节点增删，确认后 `findCustomPath`。
- **导本 UI**：`renderGuideBooks`（owned 列表，按 status_id 合并 num、收藏优先→稀有度排序、中文/原文切换、未映射警告⚠）、`renderCodex`（图鉴：筛选/搜索/语言/映射状态/未知段）、badge（总数/收藏/诅咒/过期！）、`showPickOverlay`（三选一/商店导本浮窗，带中文翻译，45s 自动隐藏）。
- **状态栏**：`updateStatusBar`（回合 + 地城状态 + 缩圈描述，来自 `miasmaCal.describe`）。

### 6.4 window/map-renderer.js（Canvas 渲染）

- 素材尺寸：背景 `BG_W=2680, BG_H=1830`；节点 `NODE_W=90, NODE_H=100`；棋子 `PIECE_W/H=90/100`。
- **坐标锚点**：服务器 `position_x/y` = 图标**地面点**（bottom-center）；绘制时 `x = posX - W/2, y = posY - H`。命中测试 `_hitTest` 用此几何。
- **视图变换**：`scale/offsetX/offsetY` + 滚轮缩放（`fitScale` 为缩小下限）+ 拖拽平移 + `_clampOffset`；`_fitView` 初始适配；`resetView()`/`focusPlayer()`（聚焦 + 闪烁箭头 `focusArrowUntil`）。
- **渲染顺序**（`render()`）：背景图 → 缩圈覆盖 → 连线 → 传送门链接 → 自定义路径点 → 规划路径 → 节点 → 玩家 → 聚焦箭头 → 边缘羽化 → tooltip。
- **缩圈绘制** `_drawMiasmaOverlay`：
  - Lv1：圆心 = `center_position - MIASMA_CENTER_OFFSET`（{44,86}，因为服务器圆心是中心节点地面点，插件节点画在 position）；半径由 `_fitMiasmaRadius` 从 `is_shrinking` 节点拟合（取最小分类误差半径）。
  - Lv2：**服务器 center_position 不是毒圈圆心**——`_fitMiasmaCircle` 用严格分离搜索（网格粗扫 40 → 精扫 8，最大化 `minDist(polluted) - maxDist(safe)`，取间隙中点半径），保证"圈外必污染、圈内必安全"。无严格圆时退化为质心 + 最小误差。
  - 昂贵的拟合按 `_miasmaSignature`（map_id|level|center|shrinking ids）缓存（Lv2 网格搜索 ~10⁶ hypot，逐帧跑会变幻灯片）。
  - 污染特效：全图紫红 `rgba(150,30,160,.30)` evenodd 挖掉安全圆 + 内缘渐变光 + 动画虚线前沿；白色安全环用游戏素材 `miasma_circle_{level}.png` 画在**服务器安全圆**（不是拟合圆心）。
- **传送门悬停**：`_drawTeleporterLinks`——悬停 type 9 节点时，向所有其他传送门画青色渐变粗线。
- 路径：黄色粗线 + 节点上**步数编号**（深色圆角方块白字）。
- 商店已访问节点画绿色对勾；`is_shrinking` 节点用 miasma 底座图；filter 未命中节点 alpha 0.25。

### 6.5 window/pathfinder.js（路径算法）

`searchBest(nodeMap, startId, isTarget, opts)` — 统一加权 BFS：
- 默认 `priority:'dist'`：最短路径优先，同长取非-path 节点（`node_type !== 0`）多的。
- `priority:'score'`：bonus 高优先，平手取短。
- `opts.teleporters`：传送门间**零成本**跳转（不耗回合、不累计 score，防乒乓）。

对外导航（`NAV_ITEMS` 对应）：
| 函数 | 目标 | 算法 |
|---|---|---|
| `findShortestPath` | 点对点 | searchBest dist 优先 |
| `findCustomPath` | 按序访问 ≤6 途经点 | 逐段 searchBest + teleporters，去冗余（A→A、A→B→A 回退，但**保留途经点**），steps 不计传送门边 |
| `findFarmRoute` | ≤9 步发育（战斗2 > 事件5=宝箱6） | DFS walk（可回访仅当收获新 farm 节点），最大化 (farmNodes, battles)，平手取**最少去重节点**（最少无谓回退）；**跳过 `is_shrinking` 节点**；剪枝 `farmNodes + rem < best` |
| `findNearestShop` | 最近商店 | searchBest target type 8 |
| `findHardRoute` | ≤20 步到最近 Ruler(4)，途中吃恐怖强敌(11)×10 + 强敌(3)×1 | 先 BFS 找最近 Ruler 集合，再 DFS（回访 ≤2 次、仅当吃新强敌），到 Ruler 即停，剪枝 `score + rem*10 < best` |

### 6.6 window/filter-panel.js

- 构造函数 `(chipContainer, specialContainer, onChange)`；chips（类型图标按钮 + 计数）+ 特殊事件行（`<details>` 默认展开，本局出现的排前）。
- `setTypeCounts`、`setPresentSpecials`（动态添加未知事件行）、`clearAll`。

### 6.7 window/guidebook-store.js（导本学习引擎）★

纯数据 + 匹配 + 持久化，**无 DOM**。持有运行时学习池：

| 池 | key（storage.local） | 内容 |
|---|---|---|
| `learnedMap` | `gbfHelperStatusIdMap` | `{user:{user_status_id→entryId}, status:{status_id→entryId}}` 运行时学到的映射 |
| `learnedJaText` | `gbfHelperLearnedJaText` | `entry:{id}` / `status:{id}` → 日文效果文本 |
| `seenBookIcons` | `gbfHelperSeenBookIcons` | status_id → icon_type（见过的真实图标） |
| `unknownBooks` | `gbfHelperUnknownBooks` | 未收录导本（status_id → rec） |

核心函数：
- `normText`：小写、去非字母数字符号（保留 CJK、`+`、`%`）、去 `+` 前缀数字的 `+`、压缩空白。**搜索/匹配的规范化器**。
- `stripRemainingUses`：剥掉实时计数括号（`(remaining uses: 1/2)`、`(0/3 spaces)`、`(+0 / Max: +10)`）——匹配时必须剥，否则和 wiki 静态文本对不上。
- `matchCodexEntry(gameBook)`：匹配优先级：user_status_id 学习映射 → status_id 学习映射 → `GUIDEBOOK_STATUS_ID` 内置 → 文本模糊匹配（剥计数后 startsWith）。命中即 `learnStatusId` + `learnJaText` 回写。
- `statusIdOfEntry` / `entryHasStatusMap` / `ownedCodexMap` / `getDisplayText`（zh→ja→en）/ `entryIconType`。
- `absorbBookInfo(recs, onChange)`：商店货架/三选一/战斗记录导本的统一吸收入口——记图标、记日文、尝试匹配映射；返回 `{newMappings, newJa, unmappedJaBooks}`。
- `collectUnknownBooks`：owned 列表更新时收集未收录书，能匹配的自动从 unknown 中移除。
- `exportGuidebookData` / `importGuidebookData`：JSON 导入导出（版本 2：`{version, exportedAt, jaText, idMaps, bookIcons, unknownBooks}`）。

**导本系统的核心设计**：游戏不提供导本唯一 id（只有每局会变的 `user_status_id` 和稳定但未公开含义的 `status_id`）。所以：
1. 用 `status_id` 作为稳定 key（静态表 `GUIDEBOOK_STATUS_ID` + 运行时学习 `learnedMap.status`）；
2. 日文玩家新拿到的导本如果 `status_id` 没映射 → 文本匹配失败 → 进 `unknownBooks` 并打 ⚠，提示"切一次英文版"让英文文本建立映射；
3. 映射和日文文本累积后通过**导出/导入**沉淀到 `shared/guidebook-data.js`（静态库），新装扩展开箱即有。

### 6.8 window/miasma-predictor.js

- `getMiasmaInnerRadius(level, countdown)`：`safeRadius + (MAX(1600) - safeRadius) * (countdown/total)`，Lv1 total=20，Lv2 total=10（假设值）。
- `getCurrentMiasmaState` / `predictMiasmaAtTurn` / `annotatePathWithMiasma`（路径逐步行毒圈预测——**当前 UI 已不展示**，保留供将来用）。
- `MiasmaCalibration`：**校准缩圈激活回合**。游戏在缩圈未激活时 `miasma_info` 全 null，不预告。本类被动记录每局各阶段真实激活回合（`lv1ActivationTurn`、`lv2ActivationTurn`、`round2Lv1Turn`），一旦某阶段激活过，就能显示准确倒计时并预测下一阶段。`reset()` 每张新地图调用。

---

## 7. 共享数据文件

### 7.1 shared/node-registry.js ★（节点类型单一来源）

- `DUNGEON_NODE_TYPE`：0=通路 1=Boss 2=战斗 3=强敌 4=Ruler 5=事件 6=宝箱 7=回复 8=商店 9=传送门 10=特殊 11=恐怖强敌。
- `NODE_TYPE_META` → 导出 `NODE_TYPE_LABELS/COLORS/ICON_ASSETS`。
- `SPECIAL_INCIDENT_ICONS`：`special_incident_id → 图标文件`（1=Cult Founder `10_guru.png`、2/3=Cultist `10_fanatic.png`、4-7=FC `10_teleport.png`、8=Researcher `10_research.png`）。
- `SPECIAL_INCIDENT_LABELS`：1-18 特殊事件名（Cult Founder…Village）。
- `nodeIconAsset(node)`：type 10 + special_incident_id 优先特殊图标，否则类型图标。

**新增节点类型** = 改这里 + 放图标文件 + `shared/i18n.js` 加 `nodeType.NN` 键。

### 7.2 shared/dungeon-mutations.js ★（地图更新唯一实现）

`applyMove`（标记目标 visited + shrink ids）、`applyFinish`（清节点→node_type=0 + shrink + 特殊事件出现）、`applyShrinkIds`、`applySpecialAppearance`。接受原始服务端字段或 background 广播 payload 两种命名（`is_delete_node | isDeleteNode`）。**background 与窗口必须共用此模块**，否则两份 nodeList 漂移。

### 7.3 shared/constants.js

`DUNGEON_STATUS`（1-8 地城阶段）、`DUNGEON_STATUS_LABELS`、`MIASMA_RADIUS`（Lv1=670、Lv2=67 逻辑半径）、`MIASMA_NOTICE_TYPE`。节点数据已迁移到 node-registry，此处 re-export 兼容。

### 7.4 shared/guidebook-data.js ★

- `GUIDEBOOK_DB`：114 条 wiki 导本，字段 `{id, rarity(1普通/2稀有/3独特/99诅咒), availability(global/event/character), type, effects[], icon, text(EN), ja, zh}`。
- `GUIDEBOOK_STATUS_ID`：status_id → entry id 内置映射（106 个已知 status，缺 96；合并导出数据时用）。
- **缺口现状**：8 条 DB 条目无 status 映射（id 20/24/25/26/30/33/82/87，多为区域 Ruler/角色专属/创世之力）；17 条缺 ja（诅咒系为主，id 86/88/90/106/107/108/109/111/114 + 无 status 的 20/24/25/26/30/33/82/87）。zh 全覆盖。

### 7.5 shared/guidebook-icons.js / guidebook-zh.js

- `GUIDEBOOK_ICONS`：status_id → icon_type（已合并 70/116/117/123 等）。
- `GUIDEBOOK_ZH`：entry id → 中文翻译（全部 114 条）。app.js 启动时 merge 进 DB 条目 `zh` 字段。

### 7.6 shared/i18n.js

全局 `I18N`（非模块，`popup` 与 `window` 都引用），`MESSAGES = {en, zh}`。`I18N.t(key, {placeholders})`、`I18N.getLang/setLang`。语言偏好存 `chrome.storage.local`（`gbfHelperLang`）。新增文案 = en + zh 两处。

---

## 8. 持久化键清单

| 键 | 存储 | 内容 | 写入方 |
|---|---|---|---|
| `gbfHelperSessionState` | storage.session | 对局状态快照（SW 重启恢复） | background |
| `gbfHelperWindowSize` | storage.local | 助手窗口尺寸 | background |
| `gbfHelperTopbarBottom` | storage.local | 顶栏在顶部/底部 | window |
| `gbfHelperFavoriteBooks` | storage.local | 收藏导本 entry id[] | window |
| `gbfHelperLearnedJaText` | storage.local | 学到的日文文本 | guidebook-store |
| `gbfHelperStatusIdMap` | storage.local | 学到的 status 映射 | guidebook-store |
| `gbfHelperSeenBookIcons` | storage.local | 见过的导本图标 | guidebook-store |
| `gbfHelperUnknownBooks` | storage.local | 未收录导本 | guidebook-store |
| `gbf-helper-book-icons` | storage.local | CDN 抓取的图标 dataURL 缓存 | background |
| `gbf-helper-lang` | localStorage（window 页面） | 语言偏好 | i18n.js |

---

## 9. 开发指南

### 9.1 新增游戏 API 端点

1. `shared/protocol.js`：加 `DATA_XXX` 常量（content 侧 key 名）。
2. `content.js` `PATTERNS`：加同名 key + URL 正则（**字符串与常量同步**）。
3. `background.js`：`handleGameData` 加 case + handler（更新 gameState + broadcast）。
4. `window/app.js`：`handleWindowMessage` 加 case（渲染）。

### 9.2 新增节点类型 / 特殊事件

- 类型：`node-registry.js` `NODE_TYPE_META` + `assets/node_icon/{n}.png` + `i18n.js nodeType.N`。
- 特殊事件：`node-registry.js` `SPECIAL_INCIDENT_ICONS` + `SPECIAL_INCIDENT_LABELS` + 图标文件 + `i18n.js sp.N`。

### 9.3 同步导本导出数据（新 HAR/导出 JSON）

用户在导本图鉴点「⬇ Export」得到 `gbf_guidebook_data_*.json`（含 `jaText/idMaps/bookIcons/unknownBooks`）。手动合并步骤：
1. 对比 `idMaps.status` 与 `GUIDEBOOK_STATUS_ID`，新增的直接补进静态表；**检查冲突**（历史：121 被错映射到 +30% 的 id59，实际是诅咒版 id112——对照 `jaText` 文本判断）。
2. `bookIcons` 新增的补进 `GUIDEBOOK_ICONS`。
3. `jaText` 中 DB 缺 ja 的条目补 `ja` 字段（剥 `@@`）。
4. **警惕实时计数**：`jaText` 可能带 `(0/3 spaces)`、`(remaining 1/2)`、`(+0/Max:+10)` 之类的**当前进度**，不是导本静态文本——不要覆盖 DB 里的基础文本（历史教训：54/57/86 三处差异全是进度值）。

### 9.4 加 i18n 文案

`shared/i18n.js` 的 en + zh 各加一对 key；HTML 里用 `data-i18n` / `data-i18n-placeholder` / `data-i18n-title`，JS 里用 `I18N.t()`。

### 9.5 验证方式

- 语法：`node --input-type=module -e "await import('./window/app.js')"` 逐个模块（background/app 会有 chrome API 运行时错误但 import 能过语法检查；纯数据模块能完整执行）。
- 路径算法：`node --input-type=module` 引 pathfinder.js + `analysis/map_real.json` 构造 nodeMap，跑各导航函数验证（该地图 153 节点含传送门 84/98）。
- 导本匹配：`node --input-type=module` 引 guidebook-store.js + 导出 JSON 全量跑 `matchCodexEntry`，比对 status 映射/图标/日文全覆盖。
- 手动：加载扩展 → 开游戏进地城 → 观察窗口同步/路径/导本。

---

## 10. 已知限制与注意事项（踩坑记录）

1. **`_` 开头文件导致扩展加载失败**（Chrome 保留）：仓库里 `.reasonix/`、`analysis/` 已 gitignore，但**不要把导出文件放到根目录再提交**（历史上 `gbf_guidebook_data_*.json` 曾躺在根目录——它不以 `_` 开头所以无害，但 `_ref_constants.js` 之类会炸）。加载扩展前确认目录无 `_` 前缀文件。
2. **`shopStock` Map 的 key 类型**：序列化后 string，恢复必须 `Number(k)`。
3. **postMessage 同步克隆**：`_requestBody` 必须在 postMessage 前塞入（content.js 有注释强调）。
4. **incident_choose 没有位置字段**：不能动 currentNodeId。
5. **战斗中头像 pid ≠ image_id**：`handleRaidStart` 故意不广播，队伍条在战斗结束才刷新。
6. **Lv2 毒圈圆心 ≠ 服务器 center_position**：必须用 `_fitMiasmaCircle` 从节点 is_shrinking 拟合。
7. **导本匹配剥计数**：`stripRemainingUses` 不能省，否则 `(+0 / Max: +10)` 对不上 wiki。
8. **日文版导本映射**：status_id 未映射时只能靠一次英文版会话学习；`learnedMap` 存在本地 storage，导出→合并静态库才能让所有用户受益。
9. **商店导本浮窗**：广播**本次货架**（不是累积池）；离开商店 `hidePickOverlay` 必须清空 `lastPickCandidates`，否则图标缓存更新会复活旧浮窗（历史 bug）。
10. **Lv2 拟合性能**：网格搜索昂贵，靠 `_miasmaSignature` 缓存；改拟合逻辑时注意别破坏缓存键。
11. **`MSG_GET_MIASMA_LOG`**：UI 入口已移除（导出瘴气日志按钮删除），background handler 保留供调试。

---

## 11. 相关文档

- `REQUIREMENTS.md` — 需求文档：游戏机制、全部端点抓包、地图/节点数据结构、反作弊红线。
- `analysis/` — 抓包分析脚本与参考（map_real.json 等），gitignore。
- git 历史 — 提交信息含大量机制决策背景（读 `git log --oneline` 快速了解演进，如缩圈模型、导本映射、UI 重构各阶段）。
