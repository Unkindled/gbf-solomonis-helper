# GBF Evoking Solomonis 地图助手 — 需求文档

> 版本：0.1-draft · 日期：2025-07-31
> 游戏模式：Evoking Solomonis（ソロモナスの賢者）· URL hash: `#arcarum3/dungeon`
> Wiki: https://gbf.wiki/Evoking_Solomonis

---

## 1. 产品定位

一个**纯只读**的 Chrome/Edge 浏览器扩展，为 GBF 的 Evoking Solomonis 模式提供**独立窗口**的地图全貌、实时位置同步、节点筛选高亮、最短路径规划和缩圈提醒。

### 1.1 反作弊红线（需求 6，最高优先级）

| 允许 | 严禁 |
|---|---|
| 被动监听游戏页面的 fetch/XHR 响应 | 修改游戏页面的任何 DOM 元素 |
| 在独立窗口中渲染地图/UI | 向游戏页面注入任何可见 UI |
| 使用浏览器 Notification API | 触发游戏页面的任何 click/input 事件 |
| 读取游戏已接收的 API 数据 | 主动向游戏服务器发送任何请求 |
| 在助手窗口内播放提示音 | 拦截/修改/重放任何 HTTP 请求 |

**原则：扩展对游戏页面是"只读旁观者"，对游戏服务器是"完全静默"。**

---

## 2. 已确认的技术事实（来源：HAR 抓包 + 前端源码分析）

### 2.1 协议

纯 REST（fetch/XHR），无 WebSocket。所有端点带 `X-Requested-With: XMLHttpRequest` 头。

### 2.2 核心端点

| 端点 | 方法 | 触发时机 | 关键数据 |
|---|---|---|---|
| `arcarum3/dungeon/content/index/{0\|1}` | GET | 进入地图页面 | **完整地图**：`option.dungeon.node_list[]`、`miasma_info`、`current_node_id`、`total_turn`、`dungeon_status` |
| `rest/arcarum3/dungeon/move_node` | POST | 玩家移动一步 | `before/after_current_node_id`、`node_type`、`miasma_info`（含 `shrink_node_ids`）、`total_turn` |
| `rest/arcarum3/dungeon/proceed_node_event` | POST | 推进节点事件 | `action_scenario_list`、`miasma_info`、`dungeon_status` |
| `rest/arcarum3/dungeon/finish_node_event` | POST | 结束节点事件 | `miasma_info`、`is_delete_node`、`is_visited_node`、`special_incident_appearance_info`、`dungeon_status` |
| `rest/arcarum3/dungeon/incident_choose` | POST | 事件中选择选项 | 同 move_node 结构 |
| `rest/arcarum3/dungeon/party_status` | GET | 查看队伍状态 | 队伍成员 HP |

### 2.3 地图数据结构（`option.dungeon`）

```typescript
interface DungeonMap {
  name: string;              // e.g. "Allotropic Microcosm"
  map_id: number;            // 地图模板 ID
  current_node_id: number;   // 玩家当前节点
  dungeon_status: number;    // 见 DUNGEON_STATUS 枚举
  total_turn: number;        // 已经过回合数
  node_list: DungeonNode[];  // 完整节点表（153 个节点样本）
  miasma_info: MiasmaInfo;   // 缩圈状态
  hint: { text: string; target_node_types: number[] };
}

interface DungeonNode {
  node_id: number;
  position_x: number;        // 逻辑坐标（范围 ~100–2567）
  position_y: number;        // 逻辑坐标（范围 ~169–1631）
  node_type: number;         // 见 NODE_TYPE 枚举
  adjacent_node_ids: number[]; // 邻接表（无向图）
  is_shrinking: boolean;     // 是否正在被缩圈吞没
  is_visited: boolean;       // 是否已探索
  is_quest_check: boolean;
  special_incident_id: number | null; // 见 SPECIAL_NODE_TYPE 枚举
}
```

### 2.4 节点类型枚举

| 值 | 枚举名 | 含义 | 图标色（建议） |
|---|---|---|---|
| 0 | NONE | 通路 | 灰 |
| 1 | ENCOUNTER_BOSS | Boss | 红★ |
| 2 | ENCOUNTER_NORMAL | 普通战斗 | 红 |
| 3 | ENCOUNTER_HARD | 强敌 | 深红 |
| 4 | ENCOUNTER_GUARDIAN | Ruler（区域守护者） | 紫 |
| 5 | INCIDENT | 随机事件 | 蓝 |
| 6 | TREASURE_CHEST | 宝箱 | 金 |
| 7 | RECOVERY_HP | 治疗（恢复 30% HP） | 绿 |
| 8 | SHOP | 商店 | 橙 |
| 9 | TELEPORT | 传送门 | 青 |
| 10 | SPECIAL | 特殊事件 | 粉 |
| 11 | ENCOUNTER_VERY_HARD | 恐怖敌人 | 暗红 |

### 2.5 特殊事件类型枚举（`special_incident_id`）

| 值 | 枚举名 | 含义 |
|---|---|---|
| 1 | GURU | 邪教教主 |
| 2–3 | FANATIC_1/2 | 邪教徒 |
| 4 | FLOATING_CASTLE | 浮游城 |
| 5–7 | FLOATING_CASTLE_TELEPORT_1/2/3 | 浮游城传送门 |
| 8 | FLOATING_CASTLE_RESEARCHER | 浮游城研究员 |
| 9 | CLOCK_TOWER | 钟楼 |
| 10 | FLOWER_GARDEN | 花园 |
| 11 | PRISON | 监狱 |
| 12 | HOT_SPRING | 温泉 |
| 13 | BLACKSMITH_TABLE | 锻造台 |
| 14 | FORT | 要塞 |
| 15 | CATHEDRAL | 大教堂 |
| 16 | CAVE | 洞穴 |
| 17 | STONE_FACE | 石像 |
| 18 | VILLAGE | 村庄 |

### 2.6 缩圈（Miasma）数据结构

```typescript
interface MiasmaInfo {
  before: MiasmaState;
  after: MiasmaState;
  shrink_node_ids: number[];  // ★ 即将被吞没的节点 ID 列表
}

interface MiasmaState {
  is_miasmic: boolean;              // 缩圈是否已激活
  step: number | null;              // 缩圈阶段
  miasma_stop_countdown: number | null; // 停止倒计时（单位待确认）
  level: number | null;
  status: number | null;
  base_pattern_id: number | null;   // 缩圈模式基础 ID
  pattern_id: number | null;        // 缩圈模式 ID
  center_node_id: number | null;    // 安全区中心节点
  center_position_x: number | null; // 安全区中心坐标
  center_position_y: number | null;
  bgm: string;
}
```

### 2.6.1 缩圈机制详解（来源：第二份 HAR + 前端 parser 源码）

**触发时机**：约第 9 回合（`total_turn=9`）缩圈激活。

**生命周期**：
1. `is_miasmic: false → true`：缩圈开始，播放 START 通知动画
2. `step` 每回合递增 5（0→5→10→...），驱动瘴气蔓延动画
3. `miasma_stop_countdown` 每回合递减 1（20→19→18→...），**单位是回合数**
4. countdown 归零时：缩圈停止（播放 END 动画）或进入 level 2

**安全圈几何**：
- 安全区是一个**圆形**，圆心 = `(center_position_x, center_position_y)`
- Level 1 半径 = **670** 逻辑坐标单位（对应 `miasma_circle_1.png` 1340×1340px，offset=-670）
- Level 2 半径 = **67** 逻辑坐标单位（极度收缩）
- 判断节点是否在圈外：`sqrt((node.x - center_x)² + (node.y - center_y)²) > radius`

**关键字段语义**：
| 字段 | 含义 |
|---|---|
| `is_miasmic` | 缩圈是否已激活 |
| `step` | 当前蔓延进度（每回合+5），驱动动画帧 |
| `miasma_stop_countdown` | 剩余回合数直到缩圈停止/升级 |
| `level` | 缩圈阶段（1=大圈，2=极小圈） |
| `status` | 1=进行中 |
| `center_position_x/y` | 安全区圆心坐标 |
| `center_node_id` | 安全区中心节点（可为 null） |
| `pattern_id` / `base_pattern_id` | 缩圈模式（决定瘴气蔓延的视觉路径） |
| `shrink_node_ids` | 正在被吞没的节点 ID（过渡帧标记，通常为空） |
| `is_shrinking`（node_list 中） | 节点是否已被瘴气覆盖 |

**通知类型**（`DUNGEON_MIASMA_NOTICE_TYPE`）：
| 值 | 含义 |
|---|---|
| 1 | START（缩圈开始） |
| 2 | RESUME（缩圈恢复/继续） |
| 3 | END（缩圈结束） |
| 4 | BOSS_APPEAR（Boss 出现） |

**动画类型**（`DUNGEON_MIASMA_ANIMATION_TYPE`）：
| 值 | 含义 |
|---|---|
| 0 | NONE |
| 1 | PROGRESS（正常蔓延） |
| 2 | RESET（重置/回缩） |

**对助手的影响**：
- 缩圈激活后，每回合根据 `center_position_x/y` + level 对应半径画安全圈
- 圈外节点用红色半透明覆盖
- `miasma_stop_countdown` 直接作为"剩余 N 回合"显示
- 路径规划时：圈外节点标记为"将受影响"，但不阻断路径（玩家仍可通行，只是有风险）

### 2.7 游戏状态枚举（`dungeon_status`）

| 值 | 枚举名 | 含义 |
|---|---|---|
| 1 | BEFORE_START | 未开始 |
| 2 | NODE_WAIT_MOVE | 等待移动 |
| 3 | NODE_WAIT_ACTION | 等待行动 |
| 4 | NODE_PROGRESS_ACTION | 行动进行中 |
| 5 | FINISH_EXPLORE | 探索结束 |
| 6 | FINISHED | 已完成 |
| 7 | NODE_BEFORE_ACTION | 行动前 |
| 8 | NODE_AFTER_ACTION | 行动后 |

### 2.8 增量同步策略

初始加载 `content/index` 获取完整地图后，后续通过监听以下响应增量更新：

| 事件 | 更新内容 |
|---|---|
| `move_node` 响应 | `current_node_id`、`miasma_info`、`total_turn` |
| `finish_node_event` 响应 | `is_visited`、`is_delete_node`（删除节点）、`special_incident_appearance_info`（新出现的特殊事件）、`miasma_info` |
| `incident_choose` 响应 | `miasma_info`、`total_turn` |
| `proceed_node_event` 响应 | `dungeon_status`（状态变化） |

无需重新拉取完整地图。

---

## 3. 功能需求

### 3.1 独立窗口（需求 1 + 6）

- **形式**：`chrome.windows.create({ type: 'popup' })`，独立于游戏标签页
- **打开方式**：点击扩展工具栏图标手动打开
  - 如果当前没有游戏标签页 → 提示用户先打开游戏
  - 如果已有助手窗口 → 聚焦已有窗口，不重复创建
- **布局**：
  - 主区域：Canvas 渲染的完整地图（可缩放、可拖拽平移）
  - 侧边/底部：筛选面板 + 状态栏（当前回合、缩圈倒计时）
- **尺寸**：默认 800×900，用户可自由调整
- **严禁**：不向游戏页面注入任何 DOM 元素、不触发任何事件

### 3.2 实时位置同步（需求 2）

- 监听 `move_node` 响应，更新玩家棋子位置
- 在地图上用醒目棋子标记当前位置
- 显示 `total_turn`（已经过回合数）
- 显示 `dungeon_status` 状态文字

### 3.3 节点筛选高亮（需求 3）

- **按节点类型**：复选框列表（12 种 node_type），勾选后对应类型节点高亮，未勾选的降低透明度
- **按特殊事件类型**：当筛选 SPECIAL（type=10）时，展开二级筛选（18 种 special_incident_id）
- 筛选结果在地图上实时反映
- 提供"全选/清除"快捷按钮

### 3.4 路线规划（需求 4）

- **交互**：用户在地图上点击目标节点 → 以玩家当前位置为起点，BFS 计算最短路径 → 高亮路径上的所有节点和连线
- **缩圈标注**：路径计算完成后，检查路径上的每个节点：
  - 如果节点在 `shrink_node_ids` 中 → 用警告色（红/橙）标注
  - 如果节点 `is_shrinking === true` → 用危险色标注
  - 在路径信息面板中列出"第 N 步将进入缩圈影响区域"
- **路径信息**：显示总步数、途经节点类型摘要
- **清除**：点击空白处或按 Esc 清除当前路径
- **算法**：BFS（无权图最短路径），邻接表已在 `adjacent_node_ids` 中提供
- **传送门处理**：MVP 阶段不自动将传送门作为路径跳转，仅作为普通节点通行

### 3.5 缩圈提醒（需求 5）

- **窗口内提醒**：
  - 当 `miasma_info.after.is_miasmic` 从 false → true 时，地图边缘闪烁红色警告
  - 当 `shrink_node_ids` 非空时，在状态栏显示"N 个节点即将被吞没"
  - 缩圈倒计时（`miasma_stop_countdown`）显示在状态栏（单位待确认）
- **可选系统通知**：
  - 使用 `chrome.notifications` API
  - 默认关闭，在助手窗口设置中可开启
  - 触发条件：缩圈激活时 / 玩家当前节点即将被吞没时
- **严禁**：不向游戏页面注入任何提醒元素

### 3.6 地图渲染

- **渲染引擎**：Canvas 2D（原生，无依赖）
- **节点**：圆形/六边形，按 node_type 着色，hover 显示 tooltip（类型名 + 特殊事件名）
- **连线**：邻接节点间画线
- **玩家棋子**：当前位置用醒目图标标记
- **缩放**：鼠标滚轮缩放，拖拽平移
- **迷雾**：不实现迷雾——全量显示所有节点（含未探索区域），`is_visited` 仅作为筛选维度
- **缩圈可视化**：被缩圈影响的节点用半透明红色覆盖层

---

## 4. 技术架构

### 4.1 扩展结构

```
gbf-rouge-helper/
├── manifest.json          # MV3 manifest
├── background.js          # Service Worker：窗口管理、消息路由
├── content.js             # Content Script：hook fetch/XHR，被动监听
├── popup/                 # 点击图标的最小 popup（仅"打开助手窗口"按钮）
│   ├── popup.html
│   └── popup.js
├── window/                # 助手独立窗口的完整 UI
│   ├── index.html
│   ├── app.js             # 主逻辑：地图渲染、筛选、路径规划
│   ├── map-renderer.js    # Canvas 地图渲染器
│   ├── pathfinder.js      # BFS 最短路径
│   ├── filter-panel.js    # 筛选面板
│   └── styles.css
├── shared/
│   ├── constants.js       # 枚举定义（NODE_TYPE, DUNGEON_STATUS 等）
│   └── protocol.js        # 消息协议定义
└── icons/                 # 扩展图标
```

### 4.2 数据流

```
游戏页面 (game.granbluefantasy.jp)
    │
    │  fetch/XHR 响应（被动监听，不修改）
    ▼
content.js ──chrome.runtime.sendMessage──▶ background.js
                                              │
                                              │  chrome.runtime.sendMessage
                                              ▼
                                         window/app.js
                                              │
                                              ▼
                                         Canvas 渲染
```

### 4.3 Content Script 注入策略

- **匹配 URL**：`https://game.granbluefantasy.jp/*`
- **Hook 方式**：在页面加载前（`document_start`）注入脚本，monkey-patch `window.fetch` 和 `XMLHttpRequest.prototype.open/send`
- **只读原则**：hook 仅读取响应体，不修改、不阻断、不延迟原始请求
- **过滤**：仅转发 URL 匹配 `arcarum3` 的响应，忽略其他请求
- **注入脚本**：使用 `world: 'MAIN'` 注入到页面主世界以访问 fetch/XHR（MV3 支持），或通过 `document_start` 的 content script 注入 `<script>` 标签

### 4.4 Manifest V3 要点

```json
{
  "manifest_version": 3,
  "permissions": ["notifications"],
  "host_permissions": ["https://game.granbluefantasy.jp/*"],
  "content_scripts": [{
    "matches": ["https://game.granbluefantasy.jp/*"],
    "js": ["content.js"],
    "run_at": "document_start",
    "world": "MAIN"
  }],
  "background": { "service_worker": "background.js" },
  "action": { "default_popup": "popup/popup.html" }
}
```

> 注意：`world: "MAIN"` 在 Chrome 111+ / Edge 111+ 支持。如需兼容更早版本，改用 `document_start` + `<script>` 注入方式。

---

## 5. 分发

- **仅侧载**：开发者模式加载 / 自托管 zip
- 不上架 Chrome Web Store / Edge Add-ons
- 更新机制：MVP 不做自动更新，手动下载替换

---

## 6. MVP 范围与后续迭代

### 6.1 MVP（v0.1）

- [x] 被动监听 fetch/XHR，提取地图和状态数据
- [x] 独立弹出窗口，Canvas 渲染完整地图
- [x] 实时位置同步
- [x] 按节点类型 + 特殊事件类型筛选高亮
- [x] 点击目标节点 → BFS 最短路径 → 高亮显示
- [x] 路径上的缩圈影响标注
- [x] 缩圈状态显示（窗口内）

### 6.2 后续迭代（v0.2+）

- [ ] 缩圈预测：基于 `pattern_id` + `step` 推算未来缩圈范围（需补充 HAR 样本）
- [ ] 系统通知提醒
- [ ] 声音提醒
- [ ] 传送门路径优化（将传送门对作为路径跳转边）
- [ ] 多地图支持（Paracyclic Microcosm 等后续开放地图）
- [ ] 节点收益评估（结合 guidebook 效果推荐路径）
- [ ] 地图导出/截图

---

## 7. 待确认事项

| # | 事项 | 状态 | 影响 |
|---|---|---|---|
| 1 | ~~缩圈数值语义~~ | ✅ 已确认：countdown 单位=回合，step 每回合+5，level 1 半径=670，level 2 半径=67 | — |
| 2 | `content/index/{0|1}` 中 0 和 1 的区别 | 推测：0=普通模式，1=预览/回放模式 | 端点过滤 |
| 3 | 传送门配对关系（哪个传送门通向哪个） | 待确认 | 路径优化 |
| 4 | `is_delete_node` 的具体触发条件 | 待确认 | 地图增量更新 |
| 5 | 多语言：游戏有 en/ja 客户端，API 结构是否一致 | 待确认 | 兼容性 |

---

## 8. 参考文件

| 文件 | 内容 |
|---|---|
| `game.granbluefantasy.jp.har` | 完整抓包（含 session token，勿公开） |
| `_ref_map_sample.json` | 完整地图数据样本（153 节点） |
| `_ref_schema.js` | 游戏前端 API schema（valibot） |
| `_ref_fetch.js` | 游戏前端 API 调用层 |
| `_ref_constants.js` | 游戏前端枚举定义 |
| `_ref_parser.js` | 游戏前端响应解析器 |
| `_ref_dungeon.js` | 游戏前端地图页面主逻辑 |
| `_ref_map.js` | 游戏前端地图渲染组件 |
