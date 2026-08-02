// Main application logic for the helper window

import { MapRenderer } from './map-renderer.js';
import { FilterPanel } from './filter-panel.js';
import { findShortestPath, findFarmRoute, findNearestShop, findSafeZoneRoute } from './pathfinder.js';
import { MIASMA_ACTIVATION_TURN } from './miasma-predictor.js';
import { DUNGEON_STATUS_LABELS, NODE_TYPE_LABELS } from '../shared/constants.js';

let renderer = null;
let filterPanel = null;
let dungeon = null;
let nodeMap = new Map();
let currentMiasmaInfo = null;
let currentTurn = 0;
let currentPath = null;
let pathStartId = null;
let prevMiasmic = false;

// --- Init ---

function init() {
  const canvas = document.getElementById('map-canvas');

  function resizeCanvas() {
    const container = document.getElementById('map-container');
    const dpr = window.devicePixelRatio || 1;
    // Allocate backing store at device resolution so the browser doesn't
    // rescale every frame (blurry + slower at DPI > 100%).
    canvas.width = Math.round(container.clientWidth * dpr);
    canvas.height = Math.round(container.clientHeight * dpr);
    if (renderer) renderer.resize(canvas.width, canvas.height, dpr);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Watch the map container directly: collapsing the sidebar changes its
  // width WITHOUT a window resize, and leaving the canvas CSS-stretched
  // distorts the map. ResizeObserver keeps the backing store in sync.
  const mapContainer = document.getElementById('map-container');
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => resizeCanvas()).observe(mapContainer);
  }

  // Restore cached guidebook icons from storage
  chrome.storage.local.get('gbf-helper-book-icons').then((stored) => {
    const icons = stored && stored['gbf-helper-book-icons'];
    if (icons) cacheBookIcons(icons);
  }).catch(() => {});

  renderer = new MapRenderer(canvas);
  renderer.onNodeClick = handleNodeClick;
  renderer.onEmptyClick = handleEmptyClick;

  filterPanel = new FilterPanel(document.getElementById('filter-panel'), (types, specials) => {
    renderer.setFilter(types, specials);
  });

  // Request current state from background
  chrome.runtime.sendMessage({ channel: 'gbf-helper:get-state' }, (state) => {
    if (chrome.runtime.lastError) return;
    if (state && state.map) {
      applyFullMap(state.map);
    }
    if (state && state.partyStatus) renderPartyBar(state.partyStatus);
    if (state && state.guideBooks) renderGuideBooks(state.guideBooks);
    if (state && state.dungeonPoint != null) renderDungeonPoint(state.dungeonPoint);
    if (state && state.guideBooksStale) setGuideBooksStale(true);
    if (state && state.shopStock) {
      for (const [k, v] of Object.entries(state.shopStock)) renderer.shopStock[k] = v;
      renderer.render();
    }
    updateStatusBar();
  });

  // Listen for live updates
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.channel !== 'gbf-helper:window-data') return;
    handleWindowMessage(msg.type, msg.payload);
  });

  // Compass: opens the navigation menu (center-on-player is a menu item).
  const navMenu = document.getElementById('nav-menu');
  const btnFocus = document.getElementById('btn-focus');
  buildNavMenu();
  btnFocus.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!navMenu.classList.contains('hidden') && !navMenu.contains(e.target) && e.target !== btnFocus && !btnFocus.contains(e.target)) {
      navMenu.classList.add('hidden');
    }
  });

  // Sidebar: switch side / collapse
  const sidebar = document.getElementById('sidebar');
  const btnSide = document.getElementById('btn-sidebar-side');
  btnSide.addEventListener('click', () => {
    document.getElementById('app').classList.toggle('sidebar-left');
  });
  const btnCollapse = document.getElementById('btn-sidebar-collapse');
  btnCollapse.addEventListener('click', () => {
    document.getElementById('app').classList.toggle('sidebar-collapsed');
    btnCollapse.textContent = document.getElementById('app').classList.contains('sidebar-collapsed') ? '▸' : '▾';
    // Refresh floating path info visibility
    updatePathInfo(currentPath ? currentPath : null);
  });

  // Guide book popup toggle
  const popup = document.getElementById('guidebook-popup');
  document.getElementById('btn-guidebook').addEventListener('click', () => {
    popup.classList.toggle('hidden');
  });
  document.getElementById('guidebook-popup-close').addEventListener('click', () => {
    popup.classList.add('hidden');
  });

  // Export miasma log button
  document.getElementById('btn-export-miasma').addEventListener('click', () => {
    chrome.runtime.sendMessage({ channel: 'gbf-helper:get-miasma-log' }, (log) => {
      if (chrome.runtime.lastError || !log) return;
      const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `miasma_log_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // Language toggle
  const langBtn = document.getElementById('btn-lang');
  langBtn.addEventListener('click', () => {
    const next = I18N.getLang() === 'zh' ? 'en' : 'zh';
    I18N.setLang(next);
    applyLanguage();
  });

  function applyLanguage() {
    // Rebuild filter panel with new labels
    filterPanel = new FilterPanel(document.getElementById('filter-panel'), (types, specials) => {
      renderer.setFilter(types, specials);
    });
    if (dungeon) filterPanel.setPresentSpecials(getPresentSpecialIds());
    buildNavMenu();
    langBtn.textContent = I18N.t('btn.lang');
    langBtn.title = I18N.getLang() === 'zh' ? 'Switch to English' : '切换到中文';
    updateStatusBar();
    if (currentPath) updatePathInfo(currentPath); else updatePathInfo(null);
  }
  applyLanguage();

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearCurrentPath();
    } else if (e.key === 'f' || e.key === 'F') {
      if (renderer) renderer.focusPlayer();
    }
  });

  // Animation loop
  requestAnimationFrame(function animLoop() {
    if (renderer && renderer.nodeMap.size > 0) renderer.render();
    requestAnimationFrame(animLoop);
  });
}

function applyFullMap(mapData) {
  const isNewDungeon = !dungeon ||
    dungeon.map_id !== mapData.map_id ||
    (mapData.total_turn === 0 && dungeon.total_turn > 0);

  dungeon = mapData;
  nodeMap.clear();
  if (dungeon.node_list) {
    for (const node of dungeon.node_list) nodeMap.set(node.node_id, node);
  }
  currentMiasmaInfo = dungeon.miasma_info;
  currentTurn = dungeon.total_turn || 0;
  prevMiasmic = !!(currentMiasmaInfo && currentMiasmaInfo.after && currentMiasmaInfo.after.is_miasmic);

  if (isNewDungeon) {
    clearCurrentPath();
    renderer.setMap(dungeon);
  } else {
    // Player position may have changed after finishing an event/battle
    // (content/index re-fetch returns the new current_node_id).
    const oldNodeId = renderer.currentNodeId;
    renderer.nodeMap = nodeMap;
    renderer.currentNodeId = dungeon.current_node_id;
    renderer.miasmaInfo = currentMiasmaInfo;
    renderer.totalTurn = currentTurn;
    renderer._updateAdjacentSet();
    renderer.render();

    // If the player moved (event/battle end), re-plan the path from the
    // NEW position, keeping the original destination.
    if (oldNodeId != null && oldNodeId !== dungeon.current_node_id && currentPath) {
      if (currentPath.length <= 1) {
        // Player already reached the single-node target → clear
        clearCurrentPath();
      } else {
        const destId = currentPath[currentPath.length - 1];
        const newPath = findShortestPath(nodeMap, dungeon.current_node_id, destId);
        if (newPath) {
          currentPath = newPath;
        } else {
          clearCurrentPath();
        }
      }
    }
  }

  if (filterPanel) filterPanel.setPresentSpecials(getPresentSpecialIds());
  if (mapData.possession_arcarum3_dungeon_point != null) {
    renderDungeonPoint(mapData.possession_arcarum3_dungeon_point);
  }
  reEvaluatePath();
}

function getPresentSpecialIds() {
  const ids = new Set();
  for (const [, node] of nodeMap) {
    if (node.special_incident_id != null) ids.add(node.special_incident_id);
  }
  return ids;
}

// --- Miasma disappear detection ---

function checkMiasmaTransition(newMiasmaInfo) {
  const wasMiasmic = prevMiasmic;
  const isMiasmic = !!(newMiasmaInfo && newMiasmaInfo.after && newMiasmaInfo.after.is_miasmic);
  prevMiasmic = isMiasmic;

  if (wasMiasmic && !isMiasmic) {
    clearCurrentPath();
    updateStatusBar('New phase — map refreshing...');
  }
}

// --- Message handling ---

function handleWindowMessage(type, payload) {
  switch (type) {
    case 'map-init':
      applyFullMap(payload);
      updateStatusBar();
      break;

    case 'move-update':
      if (dungeon) {
        dungeon.current_node_id = payload.currentNodeId;
        dungeon.total_turn = payload.totalTurn;
        if (payload.dungeonStatus) dungeon.dungeon_status = payload.dungeonStatus;
        const node = nodeMap.get(payload.currentNodeId);
        if (node) node.is_visited = true;
      }
      currentMiasmaInfo = payload.miasmaInfo || currentMiasmaInfo;
      currentTurn = payload.totalTurn !== undefined ? payload.totalTurn : currentTurn;
      checkMiasmaTransition(currentMiasmaInfo);

      // Mark newly consumed nodes as shrinking (exact from server)
      if (payload.shrinkNodeIds) {
        for (const sid of payload.shrinkNodeIds) {
          const sn = nodeMap.get(Number(sid));
          if (sn) sn.is_shrinking = true;
        }
      }

      // Sync renderer
      renderer.miasmaInfo = currentMiasmaInfo;
      renderer.totalTurn = currentTurn;
      renderer.updatePosition(payload.currentNodeId, currentMiasmaInfo, currentTurn);

      // Path auto-advance: if the player is on the planned path, the route
      // should start from where they actually are now (handles event-end
      // teleports, skipped nodes, multi-step moves).
      if (currentPath && currentPath.length > 0) {
        const idx = currentPath.indexOf(payload.currentNodeId);
        if (idx >= 0) {
          // On the path → trim everything before the current node
          currentPath = currentPath.slice(idx);
          if (currentPath.length <= 1) clearCurrentPath(); // reached destination
        } else {
          clearCurrentPath(); // off-path → drop the stale route
        }
      }

      updateStatusBar();
      reEvaluatePath();
      break;

    case 'finish-node':
      if (payload.dungeonStatus && dungeon) dungeon.dungeon_status = payload.dungeonStatus;
      if (payload.totalTurn !== undefined) {
        currentTurn = payload.totalTurn;
        if (dungeon) dungeon.total_turn = payload.totalTurn;
      }
      if (payload.miasmaInfo) currentMiasmaInfo = payload.miasmaInfo;
      checkMiasmaTransition(currentMiasmaInfo);

      if (payload.specialIncidentAppearance) {
        const info = payload.specialIncidentAppearance;
        const appearances = Array.isArray(info) ? info : Object.values(info);
        for (const app of appearances) {
          if (app && app.appearance_list) {
            for (const a of app.appearance_list) {
              const node = nodeMap.get(a.node_id);
              if (node) node.special_incident_id = a.special_incident_id;
            }
          }
        }
        if (filterPanel) filterPanel.setPresentSpecials(getPresentSpecialIds());
      }

      // finish_node_event: the node the player just cleared becomes a Path
      // (node_type=0) — it's NOT destroyed, just no longer an encounter.
      if ((payload.isVisitedNode || payload.isDeleteNode) && payload.nodeId != null) {
        const curNode = nodeMap.get(payload.nodeId);
        if (curNode) {
          curNode.node_type = 0;
          curNode.is_visited = true;
        }
      }
      renderer.miasmaInfo = currentMiasmaInfo;
      renderer.totalTurn = currentTurn;
      renderer.render();
      updateStatusBar();
      reEvaluatePath();
      break;

    case 'proceed':
      if (payload.dungeonStatus && dungeon) dungeon.dungeon_status = payload.dungeonStatus;
      if (payload.miasmaInfo) currentMiasmaInfo = payload.miasmaInfo;
      if (payload.totalTurn !== undefined) currentTurn = payload.totalTurn;
      renderer.miasmaInfo = currentMiasmaInfo;
      renderer.totalTurn = currentTurn;
      updateStatusBar();
      break;

    case 'party-status':
      renderPartyBar(payload);
      break;

    case 'guide-books':
      renderGuideBooks(payload);
      break;

    case 'guidebook-icons':
      cacheBookIcons(payload);
      break;

    case 'dungeon-point':
      renderDungeonPoint(payload);
      break;

    case 'guidebooks-stale':
      setGuideBooksStale(!!payload);
      break;

    case 'shop-stock':
      // payload: {nodeId, stock:{items, coinAfter}}
      if (payload && payload.nodeId != null && payload.stock) {
        renderer.shopStock[payload.nodeId] = payload.stock;
        renderer.render();
      }
      break;
  }
}

// --- HUD rendering: dungeon point / party / guide books ---

function renderDungeonPoint(value) {
  const el = document.getElementById('dungeon-point');
  el.textContent = String(value);
}

function setGuideBooksStale(stale) {
  const el = document.getElementById('guidebook-stale');
  if (el) el.classList.toggle('hidden', !stale);
}

function renderPartyBar(party) {
  const el = document.getElementById('party-bar');
  if (!Array.isArray(party) || party.length === 0) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = party.map((m, i) => {
    const dead = m.alive === 0;
    const hp = dead ? 0 : (Number(m.hp) || 0);
    const maxHp = Number(m.max_hp) || 1;
    // Minimum 1% while alive (never show an empty bar unless dead)
    const rawPct = Math.round(hp / maxHp * 100);
    const pct = dead ? 0 : Math.max(1, Math.min(100, rawPct));
    // Game rule: hpPercent <= 25 → red gauge, otherwise green; dead → gray
    const color = dead ? '#5a5f6e' : (rawPct <= 25 ? '#e03131' : '#4caf50');
    const label = m.is_pc ? 'PC' : `N${i}`;
    const base = 'https://prd-game-a-granbluefantasy.akamaized.net/assets_en/img/sp/assets/';
    const imgUrl = m.image_id ? `${base}${m.is_pc ? 'leader' : 'npc'}/raid_normal/${m.image_id}.jpg` : '';
    return `<div class="party-member${dead ? ' party-dead' : ''}" title="${label}">
      <div class="party-card">
        ${imgUrl ? `<img class="party-portrait" src="${imgUrl}" alt="">` : '<div class="party-portrait party-portrait-empty"></div>'}
        <div class="party-hpbar">
          <div class="party-hpfill" style="width:${pct}%;background:${color}"></div>
          <span class="party-hppct">${pct}%</span>
        </div>
      </div>
      <div class="party-hpval">${hp}</div>
      <div class="party-hpmax">${maxHp}</div>
    </div>`;
  }).join('');
}

// Guidebook icon cache: icon_type → data URL (fetched from CDN on demand).
const bookIconCache = {};
let latestGuideBooks = [];

function getBookIconUrl(iconType) {
  if (iconType == null) return '';
  // 1) bundled asset
  return `../assets/icon_book_effect/book_effect_${iconType}.png`;
}

// If the bundled file is missing, the img onerror swaps to the cached
// data URL fetched by the background.
function bookIconImg(iconType) {
  if (iconType == null) return '<div class="gb-icon"></div>';
  const local = `../assets/icon_book_effect/book_effect_${iconType}.png`;
  const cached = bookIconCache[iconType];
  if (cached) {
    return `<img class="gb-icon" src="${cached}" alt="">`;
  }
  return `<img class="gb-icon" src="${local}" alt="" onerror="this.onerror=null;var c=window.__bookIconCache&&window.__bookIconCache['${iconType}'];if(c)this.src=c;">`;
}

function renderGuideBooks(books) {
  latestGuideBooks = Array.isArray(books) ? books : [];
  // Update popup (map top-right)
  const body = document.getElementById('guidebook-popup-body');
  const badge = document.getElementById('guidebook-badge');
  if (!body) return;

  if (!Array.isArray(books) || books.length === 0) {
    body.innerHTML = '<div class="guidebook-popup-empty">No guide books yet</div>';
    if (badge) { badge.classList.add('hidden'); badge.textContent = '0'; }
    return;
  }

  // Merge duplicates by status_id (same guidebook can be held multiple times;
  // server reports `num` for duplicates, e.g. X2/X3)
  const merged = [];
  const byId = new Map();
  for (const b of books) {
    const key = b.status_id != null ? String(b.status_id) : b.name;
    if (byId.has(key)) {
      byId.get(key).num += (b.num || 1);
    } else {
      const copy = { ...b, num: b.num || 1 };
      byId.set(key, copy);
      merged.push(copy);
    }
  }
  // Sort: rarity desc, then name
  merged.sort((a, b) => (b.rarity || 0) - (a.rarity || 0) || String(a.name).localeCompare(String(b.name)));

  const total = merged.reduce((s, b) => s + b.num, 0);
  if (badge) { badge.textContent = String(total); badge.classList.remove('hidden'); }

  const rows = merged.map(b => {
    const rarLabel = { 1: '★', 2: '★★', 3: '★★★', 99: '?' }[b.rarity] || '';
    const name = (b.name || '').replace(/@@/g, ' ');
    const countLabel = b.num > 1 ? ` ×${b.num}` : '';
    return `<div class="guidebook-popup-row">
      ${bookIconImg(b.icon_type)}
      <span class="gb-name">${name}<span class="gb-count">${countLabel}</span></span>
      <span class="gb-rarity">${rarLabel}</span>
    </div>`;
  }).join('');
  body.innerHTML = rows;
}

// Cache guidebook icons fetched by the background (icon_type → data URL)
function cacheBookIcons(icons) {
  if (!icons || typeof icons !== 'object') return;
  Object.assign(bookIconCache, icons);
  window.__bookIconCache = bookIconCache;
  // Re-render to pick up newly available icons
  if (latestGuideBooks.length > 0) renderGuideBooks(latestGuideBooks);
}

// --- Path planning ---

function handleNodeClick(node) {
  if (!dungeon || dungeon.current_node_id == null) return;
  const clickedId = node.node_id;

  if (clickedId === dungeon.current_node_id) {
    clearCurrentPath();
    return;
  }

  // Truncate if clicking a node already on path
  if (currentPath && currentPath.length > 0) {
    const idx = currentPath.indexOf(clickedId);
    if (idx >= 0 && idx < currentPath.length - 1) {
      currentPath = currentPath.slice(0, idx + 1);
      reEvaluatePath();
      return;
    }
    if (idx === currentPath.length - 1) {
      clearCurrentPath();
      return;
    }
  }

  const startId = (currentPath && currentPath.length > 0)
    ? currentPath[currentPath.length - 1]
    : dungeon.current_node_id;

  const segment = findShortestPath(nodeMap, startId, clickedId);
  if (!segment) {
    updatePathInfo(null, 'No path found!');
    return;
  }

  if (currentPath && currentPath.length > 0) {
    currentPath = [...currentPath, ...segment.slice(1)];
  } else {
    currentPath = segment;
  }
  pathStartId = currentPath[0];
  reEvaluatePath();
}

function handleEmptyClick() {
  clearCurrentPath();
}

function clearCurrentPath() {
  currentPath = null;
  pathStartId = null;
  renderer.clearPath();
  updatePathInfo(null, null);
}

function reEvaluatePath() {
  if (!currentPath || !renderer) return;
  renderer.setPath(currentPath, null);
  updatePathInfo(currentPath);
}

// --- Navigation menu (compass) ---
// Extensible: add entries to NAV_ITEMS; each entry has {id, icon, label,
// action()}. The menu rebuilds on language change.

function buildNavMenu() {
  const menu = document.getElementById('nav-menu');
  if (!menu) return;
  menu.innerHTML = '';
  for (const item of NAV_ITEMS) {
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${I18N.t(item.labelKey)}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.add('hidden');
      item.action();
    });
    menu.appendChild(btn);
  }
}

const NAV_ITEMS = [
  { id: 'center', icon: '⌖', labelKey: 'nav.center', action: () => { if (renderer) renderer.focusPlayer(); } },
  { id: 'farm', icon: '🌾', labelKey: 'nav.farm', action: navigateFarmRoute },
  { id: 'shop', icon: '🛒', labelKey: 'nav.shop', action: navigateNearestShop },
  { id: 'safe', icon: '☂', labelKey: 'nav.safe', action: navigateSafeZone },
];

function navigateFarmRoute() {
  if (!dungeon) return;
  const res = findFarmRoute(nodeMap, dungeon.current_node_id, 9);
  if (!res) { updatePathInfo(null, 'No farm route within 9 steps'); return; }
  currentPath = res.path;
  pathStartId = currentPath[0];
  reEvaluatePath();
}

function navigateNearestShop() {
  if (!dungeon) return;
  const res = findNearestShop(nodeMap, dungeon.current_node_id);
  if (!res) { updatePathInfo(null, 'No shop reachable'); return; }
  currentPath = res.path;
  pathStartId = currentPath[0];
  reEvaluatePath();
}

function navigateSafeZone() {
  if (!dungeon) return;
  const a = currentMiasmaInfo && currentMiasmaInfo.after;
  if (!a || !a.is_miasmic) {
    updatePathInfo(null, 'Safe zone has not appeared yet');
    return;
  }
  const curNode = nodeMap.get(dungeon.current_node_id);
  if (curNode && !curNode.is_shrinking) {
    updatePathInfo(null, 'You are already in the safe zone');
    return;
  }
  const res = findSafeZoneRoute(nodeMap, dungeon.current_node_id);
  if (!res) { updatePathInfo(null, 'No safe zone reachable'); return; }
  currentPath = res.path;
  pathStartId = currentPath[0];
  reEvaluatePath();
}

// --- UI updates ---

function updateStatusBar(override) {
  const el = document.getElementById('status-bar');
  if (override) {
    el.innerHTML = `<span class="status-waiting">${override}</span>`;
    return;
  }
  if (!dungeon) {
    el.innerHTML = `<span class="status-waiting">${I18N.t('status.waiting')}</span>`;
    return;
  }

  const turn = currentTurn;
  const status = DUNGEON_STATUS_LABELS[dungeon.dungeon_status] || `status:${dungeon.dungeon_status}`;

  let miasmaHtml = '';
  const a = currentMiasmaInfo && currentMiasmaInfo.after;
  if (a && a.is_miasmic) {
    miasmaHtml = `<span class="status-miasma">${I18N.t('status.miasma', { level: a.level, countdown: a.miasma_stop_countdown })}</span>`;
  } else {
    const turnsUntil = MIASMA_ACTIVATION_TURN - turn;
    if (turnsUntil > 0) {
      miasmaHtml = `<span class="status-safe">${I18N.t('status.miasmaBefore', { turns: turnsUntil })}</span>`;
    }
  }

  el.innerHTML = `<span class="status-turn">${I18N.t('status.turn', { turn })}</span><span class="status-sep">·</span><span class="status-state">${status}</span>${miasmaHtml ? '<br>' + miasmaHtml : ''}`;
}

function updatePathInfo(path, error) {
  const el = document.getElementById('path-info');
  const floatEl = document.getElementById('floating-path-info');
  let html;
  if (error) {
    html = `<span class="path-error">${error}</span>`;
  } else if (!path) {
    html = `<span class="path-hint">${I18N.t('path.hint')}</span>`;
  } else {
    const steps = path.length - 1;
    const counts = {};
    for (const id of path) {
      const n = nodeMap.get(id);
      if (!n) continue;
      const label = I18N.t('nodeType.' + n.node_type) || NODE_TYPE_LABELS[n.node_type] || `type:${n.node_type}`;
      counts[label] = (counts[label] || 0) + 1;
    }
    const summary = Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(', ');
    html = `<div class="path-summary"><strong>${I18N.t('path.summary', { steps, summary })}</strong></div>`;
  }
  el.innerHTML = html;
  if (floatEl) {
    // Sync the floating copy; show it when collapsed and there's content
    floatEl.innerHTML = html;
    floatEl.classList.toggle('hidden', !document.getElementById('app').classList.contains('sidebar-collapsed'));
  }
}

// --- Start ---

document.addEventListener('DOMContentLoaded', init);
