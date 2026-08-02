// i18n framework — plain-script compatible (global I18N) so both popup.html
// and window/index.html can use it. Adding a new language = add a block to
// MESSAGES and expose it via setLang / detect.
// Usage: I18N.t('key') or I18N.t('key', {name:'x'}) for {placeholder} substitution.

(function (global) {
  'use strict';

  const MESSAGES = {
    en: {
      // popup
      'popup.title': 'GBF Map Helper',
      'popup.openWindow': 'Open Map Window',
      'popup.hint': 'Make sure the game is open on game.granbluefantasy.jp',
      // window — status bar
      'status.waiting': 'Waiting for game data...',
      'status.turn': 'Turn {turn}',
      'status.miasma': '☠ Miasma Lv{level} · {countdown} turns until shrink',
      'status.miasmaBefore': '☠ Miasma in ~{turns} turns',
      'status.lv2Soon': '☠ Lv2 shrink in ~{turns} turns',
      'status.nextCycleSoon': '☠ Next Lv1 in ~{turns} turns',
      'status.miasmaDone': '☠ Miasma Lv{level} fully closed',
      'status.guidebookManual': '⚠ Auto-refresh throttled — open the Guide Book page in-game to sync',
      'status.guidebookRefreshing': '⏳ Syncing guide books…',
      'status.newPhase': 'New phase — map refreshing...',
      // window — path info
      'path.hint': 'Click a node to plan a route. Click again to extend. Click your position or Esc to clear.',
      'path.errorNoPath': 'No path found!',
      'path.summary': '{steps} step(s) — {summary}',
      'path.affected': '⚠ {affected}/{total} nodes affected — first at step {first}',
      'path.safe': '✓ Route is safe from miasma',
      'path.phaseLv2': 'after Lv2 shrink',
      'path.phaseMiasma': 'in miasma',
      // window — buttons
      'btn.focus': 'Center on player (F)',
      'btn.exportMiasma': '📋 Export Miasma Log',
      'btn.lang': '中文',
      // window — filter panel
      'filter.title': 'Filters',
      'filter.clearAll': 'Clear All',
      'filter.nodeType': 'Node Type',
      'filter.specialEvent': 'Special Event',
      'filter.presentHint': '(● = in this run)',
      'filter.guideBooks': 'Guide Books',
      // window — guidebook popup & codex
      'gb.myBooks': 'My Guide Books',
      'gb.codex': 'Guidebook Codex',
      'gb.openCodex': 'Guidebook Codex',
      'gb.langShowZh': 'Show translation',
      'gb.langShowOrig': 'Show original text',
      'gb.langSwitchTitle': 'Toggle Chinese / original text',
      'gb.jaUnmapped': '⚠ No ID mapping — open the in-game Guide Book page and switch to EN once',
      'gb.search': 'Search guide books (EN / JA / ZH)...',
      'gb.rarity': 'Rarity: All',
      'gb.type': 'Type: All',
      'gb.avail': 'Availability: All',
      'gb.own': 'Ownership: All',
      'gb.ownOwned': 'Owned',
      'gb.ownMissing': 'Not owned',
      'gb.fav': 'Favorite: All',
      'gb.favOnly': 'Favorites',
      'gb.lang': 'Language:',
      'gb.idMap': 'ID Map: All',
      'gb.idMapMapped': 'Mapped (✓)',
      'gb.idMapUnmapped': 'Unmapped (△)',
      'gb.export': '⬇ Export',
      'gb.import': '⬆ Import',
      'gb.empty': 'No guide books match the filters',
      'gb.emptyOwned': 'No guide books yet',
      'gb.uncatalogued': 'Uncatalogued ({n}) — seen in your runs, not yet in the wiki DB',
      'pick.title': 'Guide Book Options',
      'report.newMappings': '✓ {n} new guidebook mappings established',
      // navigation (compass menu)
      'nav.center': 'Center on player',
      'nav.farm': 'Farm route (≤9 steps)',
      'nav.hard': 'Strong-foe route (≤20 steps)',
      'nav.shop': 'Nearest shop',
      'nav.custom': 'Custom path',
      'custom.title': 'Custom Path',
      'custom.hint': 'Click up to 6 nodes on the map, then confirm.',
      'custom.confirm': 'Confirm',
      'custom.cancel': 'Cancel',
      'custom.count': '{n}/{max} selected',
      'custom.maxReached': 'Max 6 waypoints',
      'custom.noWaypoints': 'Select at least one node',
      'custom.noPath': 'No path through these nodes',
      // node types
      'nodeType.0': 'Path',
      'nodeType.1': 'Boss',
      'nodeType.2': 'Battle',
      'nodeType.3': 'Strong Foe',
      'nodeType.4': 'Ruler',
      'nodeType.5': 'Event',
      'nodeType.6': 'Treasure',
      'nodeType.7': 'Healing',
      'nodeType.8': 'Shop',
      'nodeType.9': 'Teleporter',
      'nodeType.10': 'Special',
      'nodeType.11': 'Terrifying Foe',
      // special events
      'sp.1': 'Cult Founder',
      'sp.2': 'Cultist I',
      'sp.3': 'Cultist II',
      'sp.4': 'Floating Castle',
      'sp.5': 'FC Portal I',
      'sp.6': 'FC Portal II',
      'sp.7': 'FC Portal III',
      'sp.8': 'FC Researcher',
      'sp.9': 'Clock Tower',
      'sp.10': 'Flower Garden',
      'sp.11': 'Prison',
      'sp.12': 'Hot Spring',
      'sp.13': 'Blacksmith',
      'sp.14': 'Fort',
      'sp.15': 'Cathedral',
      'sp.16': 'Cave',
      'sp.17': 'Stone Face',
      'sp.18': 'Village',
    },
    zh: {
      // popup
      'popup.title': 'GBF 地图助手',
      'popup.openWindow': '打开地图窗口',
      'popup.hint': '请先在 game.granbluefantasy.jp 打开游戏',
      // window — status bar
      'status.waiting': '等待游戏数据...',
      'status.turn': '回合 {turn}',
      'status.miasma': '☠ 瘴气 Lv{level} · {countdown} 回合后缩圈',
      'status.miasmaBefore': '☠ 约 {turns} 回合后出现瘴气',
      'status.lv2Soon': '☠ 约 {turns} 回合后 Lv2 缩圈',
      'status.nextCycleSoon': '☠ 约 {turns} 回合后下一轮 Lv1',
      'status.miasmaDone': '☠ 瘴气 Lv{level} 已完全收缩',
      'status.guidebookManual': '⚠ 后台刷新被节流 — 请在游戏内打开导本页面以同步',
      'status.guidebookRefreshing': '⏳ 导本同步中…',
      'status.newPhase': '新阶段 — 地图刷新中...',
      // window — path info
      'path.hint': '点击节点规划路线，再次点击延伸。点击自己位置或按 Esc 清除。',
      'path.errorNoPath': '找不到路径！',
      'path.summary': '{steps} 步 — {summary}',
      'path.affected': '⚠ {affected}/{total} 个节点受影响 — 最早在第 {first} 步',
      'path.safe': '✓ 路线不受瘴气影响',
      'path.phaseLv2': '（Lv2 缩圈后）',
      'path.phaseMiasma': '在瘴气中',
      // window — buttons
      'btn.focus': '聚焦玩家 (F)',
      'btn.exportMiasma': '📋 导出瘴气日志',
      'btn.lang': 'English',
      // window — filter panel
      'filter.title': '筛选',
      'filter.clearAll': '全部清除',
      'filter.nodeType': '节点类型',
      'filter.specialEvent': '特殊事件',
      'filter.presentHint': '(● = 本局出现)',
      'filter.guideBooks': '导本',
      // window — guidebook popup & codex
      'gb.myBooks': '我的导本',
      'gb.codex': '导本图鉴',
      'gb.openCodex': '导本图鉴',
      'gb.langShowZh': '显示译文',
      'gb.langShowOrig': '显示原文',
      'gb.langSwitchTitle': '切换中文/原文',
      'gb.jaUnmapped': '⚠ 该导本未建立映射 — 请打开游戏导本页面，切换英文版一次',
      'gb.search': '搜索导本（英/日/中）...',
      'gb.rarity': '稀有度：全部',
      'gb.type': '类型：全部',
      'gb.avail': '来源：全部',
      'gb.own': '拥有状态：全部',
      'gb.ownOwned': '已拥有',
      'gb.ownMissing': '未拥有',
      'gb.fav': '收藏：全部',
      'gb.favOnly': '已收藏',
      'gb.lang': '语言：',
      'gb.idMap': 'ID映射：全部',
      'gb.idMapMapped': '已映射 (✓)',
      'gb.idMapUnmapped': '未映射 (△)',
      'gb.export': '⬇ 导出',
      'gb.import': '⬆ 导入',
      'gb.empty': '没有符合条件的导本',
      'gb.emptyOwned': '还没有导本',
      'gb.uncatalogued': '未收录（{n}）— 你遇到过但 wiki 数据库还没有',
      'pick.title': '导本选项',
      'report.newMappings': '✓ 建立 {n} 个新导本映射',
      // navigation (compass menu)
      'nav.center': '定位玩家',
      'nav.farm': '发育路线（≤9 步）',
      'nav.hard': '强敌路线（≤20 步）',
      'nav.shop': '最近的商店',
      'nav.custom': '自定义路径',
      'custom.title': '自定义路径',
      'custom.hint': '在地图上点击选择最多 6 个节点，然后确认。',
      'custom.confirm': '确定',
      'custom.cancel': '取消',
      'custom.count': '已选 {n}/{max}',
      'custom.maxReached': '最多选择 6 个节点',
      'custom.noWaypoints': '请至少选择一个节点',
      'custom.noPath': '无法规划经过这些节点的路径',
      // node types
      'nodeType.0': '通路',
      'nodeType.1': '首领',
      'nodeType.2': '战斗',
      'nodeType.3': '强敌',
      'nodeType.4': '君临者',
      'nodeType.5': '事件',
      'nodeType.6': '宝箱',
      'nodeType.7': '治疗',
      'nodeType.8': '商店',
      'nodeType.9': '传送门',
      'nodeType.10': '特殊',
      'nodeType.11': '恐怖强敌',
      // special events
      'sp.1': '邪教创始人',
      'sp.2': '邪教徒 I',
      'sp.3': '邪教徒 II',
      'sp.4': '浮游城',
      'sp.5': '浮游城传送门 I',
      'sp.6': '浮游城传送门 II',
      'sp.7': '浮游城传送门 III',
      'sp.8': '浮游城研究员',
      'sp.9': '钟楼',
      'sp.10': '花园',
      'sp.11': '监狱',
      'sp.12': '温泉',
      'sp.13': '铁匠铺',
      'sp.14': '堡垒',
      'sp.15': '大教堂',
      'sp.16': '洞穴',
      'sp.17': '石像',
      'sp.18': '村庄',
    },
  };

  const STORAGE_KEY = 'gbf-helper-lang';
  let lang = 'en';

  function detectLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && MESSAGES[saved]) return saved;
    } catch (e) { /* ignore */ }
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  function setLang(l) {
    if (!MESSAGES[l]) l = 'en';
    lang = l;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    return lang;
  }

  function getLang() {
    return lang;
  }

  /** Translate a key, substituting {placeholders} from vars. Falls back to en, then the key. */
  function t(key, vars) {
    let msg = MESSAGES[lang] && MESSAGES[lang][key];
    if (msg === undefined) msg = MESSAGES.en[key];
    if (msg === undefined) return key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
      }
    }
    return msg;
  }

  const I18N = {
    MESSAGES,
    detectLang,
    setLang,
    getLang,
    t,
  };

  // Initialize with detected language
  lang = detectLang();

  global.I18N = I18N;
})(typeof window !== 'undefined' ? window : globalThis);
