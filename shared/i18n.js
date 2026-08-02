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
      // navigation (compass menu)
      'nav.center': 'Center on player',
      'nav.farm': 'Farm route (≤9 steps)',
      'nav.hard': 'Strong-foe route (≤20 steps)',
      'nav.shop': 'Nearest shop',
      'nav.safe': 'Into the safe zone',
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
      // navigation (compass menu)
      'nav.center': '定位玩家',
      'nav.farm': '发育路线（≤9 步）',
      'nav.hard': '强敌路线（≤20 步）',
      'nav.shop': '最近的商店',
      'nav.safe': '进入安全区',
      // node types
      'nodeType.0': '通路',
      'nodeType.1': '首领',
      'nodeType.2': '战斗',
      'nodeType.3': '强敌',
      'nodeType.4': '统治者',
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
