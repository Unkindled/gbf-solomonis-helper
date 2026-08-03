// Main application logic for the helper window

import { MapRenderer } from './map-renderer.js';
import { FilterPanel } from './filter-panel.js';
import { findShortestPath, findFarmRoute, findNearestShop, findCustomPath, findHardRoute } from './pathfinder.js';
import { MiasmaCalibration } from './miasma-predictor.js';
import { DUNGEON_STATUS_LABELS, NODE_TYPE_LABELS } from '../shared/constants.js';
import { GUIDEBOOK_DB, GUIDEBOOK_STATUS_ID } from '../shared/guidebook-data.js';
import { GUIDEBOOK_ICONS } from '../shared/guidebook-icons.js';
import { GUIDEBOOK_ZH } from '../shared/guidebook-zh.js';
import {
  MSG_GET_STATE, MSG_GET_MIASMA_LOG, MSG_OPEN_GUIDEBOOK_TAB,
  MSG_FETCH_BOOK_ICONS, MSG_WINDOW_DATA,
  TYPE_MAP_INIT, TYPE_MOVE_UPDATE, TYPE_FINISH_NODE, TYPE_PROCEED,
  TYPE_PARTY_STATUS, TYPE_GUIDE_BOOKS, TYPE_GUIDEBOOK_ICONS,
  TYPE_GUIDEBOOKS_STALE, TYPE_GUIDEBOOK_REFRESH_STARTED,
  TYPE_GUIDEBOOK_REFRESH_FAILED, TYPE_SHOP_STOCK, TYPE_SHOP_GUIDEBOOKS,
  TYPE_PICK_CANDIDATES, TYPE_PICK_DONE, TYPE_REPORT_BOOKS, TYPE_DUNGEON_POINT,
} from '../shared/protocol.js';
import { applyMove, applyFinish } from '../shared/dungeon-mutations.js';
import {
  learnedJaText, seenBookIcons, unknownBooks,
  normText, matchCodexEntry, statusIdOfEntry, entryHasStatusMap, ownedCodexMap,
  getDisplayText, absorbBookInfo, collectUnknownBooks,
  loadLearnedJaText, loadLearnedStatusId, loadSeenBookIcons, loadUnknownBooks,
  exportGuidebookData, importGuidebookData,
} from './guidebook-store.js';

/** onChange for the store's absorb/import paths — re-render guidebook UI. */
function guidebookOnChange() {
  renderGuideBooks(latestGuideBooks);
  if (!document.getElementById('guidebook-codex')?.classList.contains('hidden')) renderCodex();
}

// Merge the community ZH translation into the DB entries' zh field.
for (const entry of GUIDEBOOK_DB) {
  if (GUIDEBOOK_ZH[entry.id]) entry.zh = GUIDEBOOK_ZH[entry.id];
}

let renderer = null;
let filterPanel = null;
let dungeon = null;
let nodeMap = new Map();
let currentMiasmaInfo = null;
let currentTurn = 0;
let currentPath = null;
let pathStartId = null;
let prevMiasmic = false;
// Calibrated miasma phase timing for the current run (see MiasmaCalibration).
const miasmaCal = new MiasmaCalibration();
// True when guidebook data may be out of date (battle drops etc.).
let guideBooksStale = false;

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
  chrome.runtime.sendMessage({ channel: MSG_GET_STATE }, (state) => {
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
    if (!msg || msg.channel !== MSG_WINDOW_DATA) return;
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
  const statusBarEl = document.getElementById('status-bar');
  const floatingPathEl = document.getElementById('floating-path-info');
  const hudLeft = document.getElementById('hud-left');
  const sidebarEl = document.getElementById('sidebar');
  const appEl = document.getElementById('app');
  btnCollapse.addEventListener('click', () => {
    const collapsed = document.getElementById('app').classList.toggle('sidebar-collapsed');
    btnCollapse.textContent = collapsed ? '▸' : '▾';
    if (collapsed) {
      // Move turn/miasma + path info INTO the HUD flex flow so they lay
      // out dynamically beside coins/party — no hardcoded pixels, no
      // overlap. DOM is restored on expand.
      hudLeft.appendChild(statusBarEl);
      hudLeft.appendChild(floatingPathEl);
    } else {
      sidebarEl.insertBefore(statusBarEl, sidebarEl.querySelector('.sidebar-actions'));
      appEl.insertBefore(floatingPathEl, document.getElementById('guidebook-popup'));
    }
    // Refresh floating path info visibility
    updatePathInfo(currentPath ? currentPath : null);
  });

  // Guide book popup toggle. When data is stale, clicking also opens the
  // in-game guidebook page in a background tab so the game itself refreshes
  // spacebook_status_list (passively captured → tab auto-closes).
  const popup = document.getElementById('guidebook-popup');
  document.getElementById('btn-guidebook').addEventListener('click', () => {
    popup.classList.toggle('hidden');
    // Keep the pick overlay clear of the popup (shift left when popup open)
    const pick = document.getElementById('pick-overlay');
    if (pick) pick.classList.toggle('pushed-left', !popup.classList.contains('hidden'));
    if (!popup.classList.contains('hidden')) {
      renderGuideBooks(latestGuideBooks); // refresh active tab view
    }
    if (guideBooksStale) {
      chrome.runtime.sendMessage({ channel: MSG_OPEN_GUIDEBOOK_TAB });
    }
  });
  document.getElementById('guidebook-popup-close').addEventListener('click', () => {
    popup.classList.add('hidden');
  });

  // Guide book codex: opens as a separate large modal ("opening a book")
  const codex = document.getElementById('guidebook-codex');
  document.getElementById('gb-open-codex').addEventListener('click', () => {
    codex.classList.remove('hidden');
    renderCodex();
  });
  document.getElementById('gb-codex-close').addEventListener('click', () => {
    codex.classList.add('hidden');
  });
  document.getElementById('pick-overlay-close').addEventListener('click', hidePickOverlay);
  document.getElementById('custom-path-confirm').addEventListener('click', confirmCustomPath);
  document.getElementById('custom-path-cancel').addEventListener('click', exitCustomMode);
  // Codex filter inputs → re-render
  const codexInputs = [
    'gb-codex-search', 'gb-codex-rarity', 'gb-codex-type',
    'gb-codex-avail', 'gb-codex-own', 'gb-codex-fav', 'gb-codex-lang', 'gb-codex-map',
  ];
  for (const id of codexInputs) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      if (id === 'gb-codex-lang') codexLang = el.value;
      if (!codex.classList.contains('hidden')) renderCodex();
    });
  }

  // 'My Guide Books' display language toggle (Chinese / original text).
  // The button shows what clicking it will DO:
  //   currently original → '显示译文 / Show translation'
  //   currently Chinese  → '显示原文 / Show original text'
  const ownedLangBtn = document.getElementById('gb-owned-lang');
  function updateOwnedLangBtn() {
    ownedLangBtn.textContent = ownedLang === 'zh' ? I18N.t('gb.langShowOrig') : I18N.t('gb.langShowZh');
    ownedLangBtn.title = I18N.t('gb.langSwitchTitle');
  }
  ownedLangBtn.addEventListener('click', () => {
    ownedLang = ownedLang === 'zh' ? 'original' : 'zh';
    updateOwnedLangBtn();
    renderGuideBooks(latestGuideBooks);
  });
  loadFavorites(() => { renderGuideBooks(latestGuideBooks); });
  loadUnknownBooks();
  loadLearnedStatusId();
  loadLearnedJaText();
  loadSeenBookIcons();

  // Export / import learned guidebook data (JA text, id maps, unknowns)
  document.getElementById('gb-export-data').addEventListener('click', exportGuidebookData);
  document.getElementById('gb-import-data').addEventListener('click', () => {
    document.getElementById('gb-import-file').click();
  });
  document.getElementById('gb-import-file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (file) importGuidebookData(file, (changed, err) => {
      if (changed) guidebookOnChange();
      updateStatusBar(err ? '✗ Import failed: ' + err : '✓ Guidebook data imported');
    });
  });

  // Export miasma log button
  document.getElementById('btn-export-miasma').addEventListener('click', () => {
    chrome.runtime.sendMessage({ channel: MSG_GET_MIASMA_LOG }, (log) => {
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

  // Weapons & summons display removed per user request — data capture
  // (party/deck) is also removed.

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
    applyGuidebookUI(); // bilingual labels + re-render content
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
  if (isNewDungeon) miasmaCal.reset();
  miasmaCal.observe(currentMiasmaInfo, currentTurn);

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
  updateTypeCounts();
  if (mapData.possession_arcarum3_dungeon_point != null) {
    renderDungeonPoint(mapData.possession_arcarum3_dungeon_point);
  }
  reEvaluatePath();
}

/** Count nodes per node_type and show them next to the filter labels. */
function updateTypeCounts() {
  if (!filterPanel) return;
  const counts = new Map();
  for (const [, node] of nodeMap) {
    counts.set(node.node_type, (counts.get(node.node_type) || 0) + 1);
  }
  filterPanel.setTypeCounts(counts);
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
    case TYPE_MAP_INIT:
      applyFullMap(payload);
      updateStatusBar();
      break;

    case TYPE_MOVE_UPDATE:
      if (dungeon) {
        dungeon.current_node_id = payload.currentNodeId;
        dungeon.total_turn = payload.totalTurn;
        if (payload.dungeonStatus) dungeon.dungeon_status = payload.dungeonStatus;
      }
      currentMiasmaInfo = payload.miasmaInfo || currentMiasmaInfo;
      currentTurn = payload.totalTurn !== undefined ? payload.totalTurn : currentTurn;
      checkMiasmaTransition(currentMiasmaInfo);
      hidePickOverlay(); // player moved — shop overlay (if any) closes

      // Shared mutation: mark destination visited + consumed nodes shrinking
      applyMove([...nodeMap.values()], payload.currentNodeId, payload.shrinkNodeIds);

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

    case TYPE_FINISH_NODE:
      if (payload.dungeonStatus && dungeon) dungeon.dungeon_status = payload.dungeonStatus;
      if (payload.totalTurn !== undefined) {
        currentTurn = payload.totalTurn;
        if (dungeon) dungeon.total_turn = payload.totalTurn;
      }
      if (payload.miasmaInfo) currentMiasmaInfo = payload.miasmaInfo;
      checkMiasmaTransition(currentMiasmaInfo);

      // Shared mutation: cleared node → Path, shrink marks, special incidents
      if (payload.nodeId != null || payload.specialIncidentAppearance) {
        applyFinish([...nodeMap.values()], payload.nodeId, payload);
        if (filterPanel) filterPanel.setPresentSpecials(getPresentSpecialIds());
      }
      renderer.miasmaInfo = currentMiasmaInfo;
      renderer.totalTurn = currentTurn;
      renderer.render();
      updateStatusBar();
      reEvaluatePath();
      break;

    case TYPE_PROCEED:
      if (payload.dungeonStatus && dungeon) dungeon.dungeon_status = payload.dungeonStatus;
      if (payload.miasmaInfo) currentMiasmaInfo = payload.miasmaInfo;
      if (payload.totalTurn !== undefined) currentTurn = payload.totalTurn;
      renderer.miasmaInfo = currentMiasmaInfo;
      renderer.totalTurn = currentTurn;
      updateStatusBar();
      break;

    case TYPE_PARTY_STATUS:
      renderPartyBar(payload);
      break;

    case TYPE_GUIDE_BOOKS:
      renderGuideBooks(payload);
      updateStatusBar(); // clear the 'refreshing…' override once data arrives
      break;

    case TYPE_GUIDEBOOK_ICONS:
      cacheBookIcons(payload);
      break;

    case TYPE_DUNGEON_POINT:
      renderDungeonPoint(payload);
      break;

    case TYPE_GUIDEBOOKS_STALE:
      setGuideBooksStale(!!payload);
      break;

    case TYPE_GUIDEBOOK_REFRESH_STARTED:
      // Background tab opened; game SPA should fire status_list soon.
      updateStatusBar(I18N.t('status.guidebookRefreshing'));
      break;

    case TYPE_GUIDEBOOK_REFRESH_FAILED:
      // Background refresh couldn't get a status_list response (browser
      // throttled the tab). Tell the user to open the guidebook page
      // manually in the game.
      updateStatusBar(I18N.t('status.guidebookManual'));
      break;

    case TYPE_SHOP_STOCK:
      // payload: {nodeId, stock:{items, coinAfter}}
      if (payload && payload.nodeId != null && payload.stock) {
        renderer.shopStock[payload.nodeId] = payload.stock;
        renderer.render();
      }
      break;

    case TYPE_SHOP_GUIDEBOOKS:
      // payload: status_id → {status_id,name,icon_type,rarity} seen in shop
      // lineups. Feed them into the learned pools AND show the shop's
      // guidebooks in the options overlay (translations via status map).
      if (payload && typeof payload === 'object') {
        const recs = Object.values(payload);
        absorbBookInfo(recs, guidebookOnChange);
        if (recs.length > 0) showPickOverlay(recs);
      }
      break;

    case TYPE_PICK_CANDIDATES:
      // payload: [{status_id,name,icon_type,rarity}] from the 3-way pick UI
      if (Array.isArray(payload)) {
        absorbBookInfo(payload, guidebookOnChange);
        showPickOverlay(payload);
      }
      break;

    case TYPE_REPORT_BOOKS:
      // payload: guidebooks obtained in a battle-report run (record page).
      // Feed into the learning pool only — no overlay; toast new mappings.
      if (Array.isArray(payload)) {
        const { newMappings, newJa, unmappedJaBooks } = absorbBookInfo(payload, guidebookOnChange);
        const msgs = [];
        if (newMappings > 0) msgs.push(I18N.t('report.newMappings', { n: newMappings }));
        if (newJa > 0) msgs.push(I18N.t('report.newJa', { n: newJa }));
        if (unmappedJaBooks.length > 0) {
          // Show up to 3 book names so the player knows their content.
          const shown = unmappedJaBooks.slice(0, 3).map(s => s.length > 26 ? s.slice(0, 26) + '…' : s);
          const extra = unmappedJaBooks.length - shown.length;
          msgs.push(I18N.t('report.unmappedJa', { n: unmappedJaBooks.length }) + '：' + shown.join(' / ') + (extra > 0 ? ` +${extra}` : ''));
        }
        if (msgs.length > 0) showTransientToast(msgs.join('  '));
      }
      break;

    case TYPE_PICK_DONE:
      hidePickOverlay();
      break;
  }
}

// --- 3-way guidebook pick overlay ---
// When the in-game 3-way choice UI appears, show the three options in the
// helper window with their Chinese translation (via status_id → wiki map),
// so JA/EN players can read what each guidebook does without switching.
function showPickOverlay(candidates) {
  lastPickCandidates = Array.isArray(candidates) ? candidates : [];
  const overlay = document.getElementById('pick-overlay');
  const body = document.getElementById('pick-overlay-body');
  if (!overlay || !body) return;
  // When 'My Guide Books' popup is open (right side), shift the options
  // overlay left so it doesn't cover the popup.
  const popupOpen = !document.getElementById('guidebook-popup')?.classList.contains('hidden');
  overlay.classList.toggle('pushed-left', popupOpen);
  const rarLabel = { 1: '★', 2: '★★', 3: '★★★', 99: '☠' };
  const rows = candidates.map((c, i) => {
    const entry = matchCodexEntry(c);
    const zh = entry?.zh || '';
    const original = (c.name || '').replace(/@@/g, ' ');
    const isJa = /[\u3040-\u30ff\u4e00-\u9fff]/.test(original);
    const mapped = entry != null && entryHasStatusMap(entry.id);
    const icon = c.icon_type != null ? bookIconImg(c.icon_type) : '<div class="gb-icon"></div>';
    const main = zh || original;
    const sub = zh ? original : '';
    return `<div class="pick-option${entry ? '' : ' unmapped'}">
      ${icon}
      <div class="pick-option-info">
        <div class="pick-option-zh">${escapeHtml(main)}${!mapped && isJa ? ' <span class="gb-lang">△</span>' : ''}</div>
        ${sub ? `<div class="pick-option-orig">${escapeHtml(sub)}</div>` : ''}
      </div>
      <span class="gb-rarity">${rarLabel[c.rarity] || ''}</span>
    </div>`;
  }).join('');
  body.innerHTML = rows;
  overlay.classList.remove('hidden');
  clearTimeout(pickOverlayTimer);
  pickOverlayTimer = setTimeout(hidePickOverlay, 45000); // safety auto-hide
}
function hidePickOverlay() {
  const overlay = document.getElementById('pick-overlay');
  if (overlay) overlay.classList.add('hidden');
  clearTimeout(pickOverlayTimer);
}
let pickOverlayTimer = null;
let lastPickCandidates = [];

// --- HUD rendering: dungeon point / party / guide books ---

function renderDungeonPoint(value) {
  const el = document.getElementById('dungeon-point');
  el.textContent = String(value);
}

function setGuideBooksStale(stale) {
  guideBooksStale = !!stale;
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
    const hp = Number(m.hp) || 0;
    const maxHp = Number(m.max_hp) || 1;
    const dead = hp <= 0; // no `alive` field in party_status — dead == 0 HP
    // Minimum 1% while alive (never show an empty bar unless dead);
    // dead characters show a flat 0%
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
  return `<img class="gb-icon" src="${local}" alt="" onerror="this.onerror=null;var c=window.__bookIconCache&&window.__bookIconCache['${iconType}'];if(c)this.src=c;else{this.style.display='none';this.insertAdjacentHTML('afterend','<div class=&quot;gb-icon&quot;></div>');}">`;
}

function renderGuideBooks(books) {
  latestGuideBooks = Array.isArray(books) ? books : [];
  // Update popup (map top-right)
  const body = document.getElementById('guidebook-popup-body');
  if (!body) return;

  collectUnknownBooks(latestGuideBooks);
  updateGuidebookBadges();

  if (!Array.isArray(books) || books.length === 0) {
    body.innerHTML = '<div class="guidebook-popup-empty">No guide books yet</div>';
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
  // Sort: favorites first, then rarity (Unique>Rare>Normal>Cursed), then name
  const rarityOrder = { 3: 0, 2: 1, 1: 2, 99: 3 };
  merged.sort((a, b) => {
    const fa = favoriteBookIds.has(String(matchCodexEntry(a)?.id ?? -1));
    const fb = favoriteBookIds.has(String(matchCodexEntry(b)?.id ?? -1));
    if (fa !== fb) return fa ? -1 : 1;
    return (rarityOrder[a.rarity] ?? 9) - (rarityOrder[b.rarity] ?? 9) || String(a.name).localeCompare(String(b.name));
  });

  const rows = merged.map(b => {
    const rarLabel = { 1: '★', 2: '★★', 3: '★★★', 99: '☠' }[b.rarity] || '';
    const original = (b.name || '').replace(/@@/g, ' ');
    const countLabel = b.num > 1 ? ` ×${b.num}` : '';
    const entry = matchCodexEntry(b);
    const entryId = entry?.id;
    const isFav = entryId != null && favoriteBookIds.has(String(entryId));
    // Display text: Chinese toggle → prefer bundled/learned ZH, else original
    let display = original;
    if (ownedLang === 'zh' && entry?.zh) display = entry.zh;
    // Unmapped JA-only text → remind user to teach the mapping (EN once)
    const isJaText = /[\u3040-\u30ff\u4e00-\u9fff]/.test(original);
    const unmappedJa = isJaText && (entry == null || !entryHasStatusMap(entryId));
    const nameHtml = `${escapeHtml(display)}${ownedLang === 'zh' && display === original ? '<span class="gb-lang">EN</span>' : ''}<span class="gb-count">${countLabel}</span>`;
    const warnHtml = unmappedJa
      ? `<span class="gb-unmapped-warn" title="${I18N.t('gb.jaUnmapped')}">⚠</span>`
      : '';
    return `<div class="guidebook-popup-row${unmappedJa ? ' gb-row-unmapped' : ''}">
      ${bookIconImg(b.icon_type)}
      <span class="gb-name">${nameHtml}</span>
      <span class="gb-rarity">${rarLabel}</span>
      ${warnHtml}
      ${entryId != null ? `<button class="gb-fav-btn ${isFav ? 'fav' : ''}" data-id="${entryId}" title="Favorite">${isFav ? '♥' : '♡'}</button>` : ''}
    </div>`;
  }).join('');
  body.innerHTML = rows;
  body.querySelectorAll('.gb-fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(parseInt(btn.dataset.id, 10));
    });
  });
}

// Cache guidebook icons fetched by the background (icon_type → data URL)
function cacheBookIcons(icons) {
  if (!icons || typeof icons !== 'object') return;
  Object.assign(bookIconCache, icons);
  window.__bookIconCache = bookIconCache;
  // Re-render to pick up newly available icons
  if (latestGuideBooks.length > 0) renderGuideBooks(latestGuideBooks);
  if (lastPickCandidates.length > 0 && !document.getElementById('pick-overlay')?.classList.contains('hidden')) {
    showPickOverlay(lastPickCandidates);
  }
}

// --- Guide book codex ---

// favorite status: Set of wiki entry ids (strings), persisted in chrome.storage
let favoriteBookIds = new Set();
// Display language for the codex: 'text' (EN) | 'ja' | 'zh'
let codexLang = 'text';
// Display language for 'My Guide Books': 'original' (game text) | 'zh'
let ownedLang = 'original';

function bookCodexIcon(entry, ownedInfo) {
  // 1) Owned books have a real game icon_type (accurate art).
  if (ownedInfo && ownedInfo.gameBook && ownedInfo.gameBook.icon_type != null) {
    return bookIconImg(ownedInfo.gameBook.icon_type);
  }
  // 2) Books we've SEEN before (even if not owned now): status_id →
  //    icon_type recorded from past status_list responses.
  const sid = statusIdOfEntry(entry.id);
  const seenIcon = sid != null
    ? (seenBookIcons[sid] ?? GUIDEBOOK_ICONS[sid])
    : null;
  if (seenIcon != null) return bookIconImg(seenIcon);
  // 3) Never seen → neutral placeholder.
  return `<img class="gb-icon" src="../assets/book_thumb_1.png" alt="">`;
}

function updateGuidebookBadges() {
  const badgeTotal = document.getElementById('guidebook-badge');
  const badgeFav = document.getElementById('guidebook-badge-fav');
  const badgeCursed = document.getElementById('guidebook-badge-cursed');
  const owned = latestGuideBooks || [];
  const merged = [];
  const byId = new Map();
  for (const b of owned) {
    const key = b.status_id != null ? String(b.status_id) : b.name;
    if (byId.has(key)) byId.get(key).num += (b.num || 1);
    else { const c = { ...b, num: b.num || 1 }; byId.set(key, c); merged.push(c); }
  }
  const total = merged.reduce((s, b) => s + b.num, 0);
  const cursed = merged.filter(b => (b.rarity || 0) === 99).reduce((s, b) => s + b.num, 0);
  let favOwned = 0;
  const ownedSet = new Set(merged.map(b => matchCodexEntry(b)?.id).filter(x => x != null));
  for (const id of favoriteBookIds) if (ownedSet.has(parseInt(id, 10))) favOwned++;
  if (badgeTotal) {
    badgeTotal.textContent = String(total);
    badgeTotal.classList.toggle('hidden', total <= 0);
  }
  if (badgeFav) {
    badgeFav.textContent = `♥${favOwned}`;
    badgeFav.classList.toggle('hidden', favOwned <= 0);
    badgeFav.title = `Favorited: ${favOwned}`;
  }
  if (badgeCursed) {
    badgeCursed.textContent = `☠${cursed}`;
    badgeCursed.classList.toggle('hidden', cursed <= 0);
    badgeCursed.title = `Cursed: ${cursed}`;
  }
}

function renderCodex() {
  const body = document.getElementById('guidebook-codex-body');
  if (!body) return;
  // Normalize the query the same way as the DB texts (keeps CJK, drops
  // symbols/fullwidth punctuation) so JA searches match the haystack.
  const q = normText(document.getElementById('gb-codex-search')?.value || '');
  const rar = document.getElementById('gb-codex-rarity')?.value;
  const typ = document.getElementById('gb-codex-type')?.value;
  const avail = document.getElementById('gb-codex-avail')?.value;
  const own = document.getElementById('gb-codex-own')?.value;
  const fav = document.getElementById('gb-codex-fav')?.value;
  const mapF = document.getElementById('gb-codex-map')?.value;

  const ownedMap = ownedCodexMap(latestGuideBooks || []);
  const rows = [];
  for (const entry of GUIDEBOOK_DB) {
    const ownedInfo = ownedMap.get(entry.id);
    const isOwned = !!ownedInfo;
    const isFav = favoriteBookIds.has(String(entry.id));
    const isMapped = entryHasStatusMap(entry.id);
    if (rar && String(entry.rarity) !== rar) continue;
    if (typ && !entry.type.split(',').includes(typ)) continue;
    if (avail && entry.availability !== avail) continue;
    if (own === 'owned' && !isOwned) continue;
    if (own === 'missing' && isOwned) continue;
    if (fav === 'fav' && !isFav) continue;
    if (mapF === 'mapped' && !isMapped) continue;
    if (mapF === 'unmapped' && isMapped) continue;
    if (q) {
      const entryJa = learnedJaText['entry:' + entry.id] || '';
      // status: keys — a DB entry's JA text learned under its status_id
      const statusKey = Object.entries(GUIDEBOOK_STATUS_ID).find(([, eid]) => eid === entry.id)?.[0];
      const statusJa = statusKey ? (learnedJaText['status:' + statusKey] || '') : '';
      const hay = [entry.text, entry.ja, entry.zh, entryJa, statusJa].filter(Boolean).map(normText).join(' ');
      if (!hay.includes(q)) continue;
    }
    rows.push({ entry, isOwned, isFav, isMapped });
  }
  // Sort: favorites first, then rarity desc (99=Cursed sorts last), then display text
  const rarityOrder = { 3: 0, 2: 1, 1: 2, 99: 3 }; // Unique > Rare > Normal > Cursed
  rows.sort((a, b) => {
    if (a.isFav !== b.isFav) return a.isFav ? -1 : 1;
    return (rarityOrder[a.entry.rarity] ?? 9) - (rarityOrder[b.entry.rarity] ?? 9)
      || String(getDisplayText(a.entry, codexLang)).localeCompare(String(getDisplayText(b.entry, codexLang)));
  });
  const rarLabel = { 1: '★', 2: '★★', 3: '★★★', 99: '☠' };

  let html = '<div class="guidebook-codex-grid">';
  html += rows.map(({ entry, isOwned, isFav, isMapped }) => {
    const label = getDisplayText(entry, codexLang);
    const langTag = codexLang === 'zh' && !entry.zh ? '<span class="gb-lang">EN</span>'
      : codexLang === 'ja' && !entry.ja && !learnedJaText['entry:' + entry.id] ? '<span class="gb-lang">EN</span>'
      : '';
    const mapTag = isMapped
      ? '<span class="gb-map gb-map-ok" title="status_id mapped — JA client recognizes this">✓</span>'
      : '<span class="gb-map gb-map-warn" title="No status_id mapping yet — collect it with an EN session">△</span>';
    return `<div class="guidebook-codex-row${isOwned ? ' owned' : ''}">
      ${bookCodexIcon(entry, ownedMap.get(entry.id))}
      <span class="gb-name">${escapeHtml(label)}${langTag}<span class="gb-count">${isOwned ? ' ✓' : ''}</span></span>
      <span class="gb-rarity">${rarLabel[entry.rarity] || ''}</span>
      ${mapTag}
      <button class="gb-fav-btn ${isFav ? 'fav' : ''}" data-id="${entry.id}" title="Favorite">${isFav ? '♥' : '♡'}</button>
    </div>`;
  }).join('');
  html += '</div>';

  // Unknown / uncatalogued section (new guidebooks added by game updates)
  const unknownList = [...unknownBooks.values()].filter(b => {
    if (own === 'owned' && !latestGuideBooks?.some(g => String(g.status_id) === String(b.status_id))) return false;
    if (own === 'missing' && latestGuideBooks?.some(g => String(g.status_id) === String(b.status_id))) return false;
    if (q) {
      const hay = [b.name, learnedJaText['status:' + b.status_id]].filter(Boolean).map(normText).join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (unknownList.length > 0 && own !== 'missing') {
    html += `<div class="gb-unknown-header">Uncatalogued (${unknownList.length}) — seen in your runs, not yet in the wiki DB</div>`;
    html += '<div class="guidebook-codex-grid">';
    html += unknownList.map(b => `
      <div class="guidebook-codex-row unknown">
        ${bookIconImg(b.icon_type)}
        <span class="gb-name">${escapeHtml(b.name.replace(/@@/g, ' '))}<span class="gb-count"> ×${b.num}</span><span class="gb-lang">id:${b.status_id ?? '?'}</span></span>
        <span class="gb-rarity">${rarLabel[b.rarity] || ''}</span>
      </div>`).join('');
    html += '</div>';
  }

  if (rows.length === 0 && unknownList.length === 0) {
    body.innerHTML = '<div class="guidebook-popup-empty">No guide books match the filters</div>';
    return;
  }
  body.innerHTML = html;
  // bind favorite buttons
  body.querySelectorAll('.gb-fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(parseInt(btn.dataset.id, 10));
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Short-lived toast notification (auto-hides after 2.5s). */
let toastTimer = null;
function showTransientToast(text) {
  let el = document.getElementById('transient-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'transient-toast';
    el.className = 'transient-toast hidden';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

function toggleFavorite(id) {
  const key = String(id);
  if (favoriteBookIds.has(key)) favoriteBookIds.delete(key);
  else favoriteBookIds.add(key);
  persistFavorites();
  renderGuideBooks(latestGuideBooks);
  if (!document.getElementById('guidebook-codex')?.classList.contains('hidden')) renderCodex();
}

function persistFavorites() {
  chrome.storage.local.set({ gbfHelperFavoriteBooks: [...favoriteBookIds] });
}

function loadFavorites(cb) {
  chrome.storage.local.get('gbfHelperFavoriteBooks', (res) => {
    favoriteBookIds = new Set(res.gbfHelperFavoriteBooks || []);
    if (cb) cb();
  });
}



function handleNodeClick(node) {
  if (!dungeon || dungeon.current_node_id == null) return;
  const clickedId = node.node_id;

  // Custom path mode: clicks add/remove waypoints instead of planning.
  if (customMode) {
    handleCustomNodeClick(clickedId);
    return;
  }

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
  { id: 'custom', icon: '✎', labelKey: 'nav.custom', action: navigateCustomPath },
  { id: 'farm', icon: '🌾', labelKey: 'nav.farm', action: navigateFarmRoute },
  { id: 'hard', icon: '⚔', labelKey: 'nav.hard', action: navigateHardRoute },
  { id: 'shop', icon: '🛒', labelKey: 'nav.shop', action: navigateNearestShop },
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

function navigateHardRoute() {
  if (!dungeon) return;
  const res = findHardRoute(nodeMap, dungeon.current_node_id, 20);
  if (!res) { updatePathInfo(null, 'No Ruler reachable within 20 steps'); return; }
  currentPath = res.path;
  pathStartId = currentPath[0];
  reEvaluatePath();
}

// --- Custom path mode ---
// User picks up to 6 waypoints on the map; clicking Confirm plans a route
// through them (teleporters connect at zero cost). Cancel exits the mode.

let customMode = false;
let customWaypoints = [];

function navigateCustomPath() {
  if (!dungeon) return;
  customMode = true;
  customWaypoints = [];
  document.getElementById('custom-path-overlay').classList.remove('hidden');
  updateCustomPathHint();
}

function exitCustomMode() {
  customMode = false;
  customWaypoints = [];
  document.getElementById('custom-path-overlay').classList.add('hidden');
  if (renderer) renderer.setCustomWaypoints([]); // clear blue markers
}

function updateCustomPathHint() {
  const el = document.getElementById('custom-path-count');
  if (el) el.textContent = I18N.t('custom.count', { n: customWaypoints.length, max: 6 });
}

function handleCustomNodeClick(nodeId) {
  if (!customMode) return;
  if (customWaypoints.includes(nodeId)) {
    customWaypoints = customWaypoints.filter(id => id !== nodeId); // toggle off
  } else if (customWaypoints.length < 6) {
    customWaypoints.push(nodeId);
  } else {
    updateStatusBar(I18N.t('custom.maxReached'));
  }
  updateCustomPathHint();
  renderer.setCustomWaypoints(customWaypoints); // highlight picks
}

function confirmCustomPath() {
  if (customWaypoints.length === 0) {
    updateStatusBar(I18N.t('custom.noWaypoints'));
    return;
  }
  const res = findCustomPath(nodeMap, dungeon.current_node_id, customWaypoints);
  if (!res) {
    updateStatusBar(I18N.t('custom.noPath'));
    exitCustomMode();
    return;
  }
  currentPath = res.path;
  pathStartId = currentPath[0];
  reEvaluatePath();
  exitCustomMode();
}

// --- UI updates ---

/** Refresh bilingual UI strings for the guidebook popup & codex. */
function applyGuidebookUI() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const txt = I18N.t(key);
    if (txt && txt !== key) el.textContent = txt;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const txt = I18N.t(key);
    if (txt && txt !== key) el.placeholder = txt;
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const txt = I18N.t(key);
    if (txt && txt !== key) el.title = txt;
  });
  const title = document.getElementById('guidebook-popup-title');
  if (title) title.textContent = I18N.t('gb.myBooks');
  const openCodex = document.getElementById('gb-open-codex');
  if (openCodex) openCodex.textContent = I18N.t('gb.openCodex');
  const ownedLangBtn = document.getElementById('gb-owned-lang');
  if (ownedLangBtn) {
    ownedLangBtn.textContent = ownedLang === 'zh' ? I18N.t('gb.langShowOrig') : I18N.t('gb.langShowZh');
    ownedLangBtn.title = I18N.t('gb.langSwitchTitle');
  }
  renderGuideBooks(latestGuideBooks);
  if (!document.getElementById('guidebook-codex')?.classList.contains('hidden')) renderCodex();
}

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
  const miasmaDesc = miasmaCal.describe(currentMiasmaInfo, turn);
  if (miasmaDesc) {
    const cls = miasmaDesc.key === 'status.miasma' ? 'status-miasma' : 'status-safe';
    miasmaHtml = `<span class="${cls}">${I18N.t(miasmaDesc.key, miasmaDesc.data)}</span>`;
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
