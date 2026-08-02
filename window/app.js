// Main application logic for the helper window

import { MapRenderer } from './map-renderer.js';
import { FilterPanel } from './filter-panel.js';
import { findShortestPath, findFarmRoute, findNearestShop, findCustomPath, findHardRoute } from './pathfinder.js';
import { MiasmaCalibration } from './miasma-predictor.js';
import { DUNGEON_STATUS_LABELS, NODE_TYPE_LABELS } from '../shared/constants.js';
import { GUIDEBOOK_DB, GUIDEBOOK_STATUS_ID } from '../shared/guidebook-data.js';
import { GUIDEBOOK_ICONS } from '../shared/guidebook-icons.js';
import { GUIDEBOOK_ZH } from '../shared/guidebook-zh.js';

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

  // Guide book popup toggle. When data is stale, clicking also opens the
  // in-game guidebook page in a background tab so the game itself refreshes
  // spacebook_status_list (passively captured → tab auto-closes).
  const popup = document.getElementById('guidebook-popup');
  document.getElementById('btn-guidebook').addEventListener('click', () => {
    popup.classList.toggle('hidden');
    if (!popup.classList.contains('hidden')) {
      renderGuideBooks(latestGuideBooks); // refresh active tab view
    }
    if (guideBooksStale) {
      chrome.runtime.sendMessage({ channel: 'gbf-helper:open-guidebook-tab' });
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
    if (file) importGuidebookData(file);
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
      hidePickOverlay(); // player moved — shop overlay (if any) closes

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
      updateStatusBar(); // clear the 'refreshing…' override once data arrives
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

    case 'guidebook-refresh-started':
      // Background tab opened; game SPA should fire status_list soon.
      updateStatusBar(I18N.t('status.guidebookRefreshing'));
      break;

    case 'guidebook-refresh-failed':
      // Background refresh couldn't get a status_list response (browser
      // throttled the tab). Tell the user to open the guidebook page
      // manually in the game.
      updateStatusBar(I18N.t('status.guidebookManual'));
      break;

    case 'shop-stock':
      // payload: {nodeId, stock:{items, coinAfter}}
      if (payload && payload.nodeId != null && payload.stock) {
        renderer.shopStock[payload.nodeId] = payload.stock;
        renderer.render();
      }
      break;

    case 'shop-guidebooks':
      // payload: status_id → {status_id,name,icon_type,rarity} seen in shop
      // lineups. Feed them into the learned pools AND show the shop's
      // guidebooks in the options overlay (translations via status map).
      if (payload && typeof payload === 'object') {
        const recs = Object.values(payload);
        absorbBookInfo(recs);
        if (recs.length > 0) showPickOverlay(recs);
      }
      break;

    case 'pick-candidates':
      // payload: [{status_id,name,icon_type,rarity}] from the 3-way pick UI
      if (Array.isArray(payload)) {
        absorbBookInfo(payload);
        showPickOverlay(payload);
      }
      break;

    case 'report-books':
      // payload: guidebooks obtained in a battle-report run (record page).
      // Feed into the learning pool only — no overlay; toast new mappings.
      if (Array.isArray(payload)) {
        const { newMappings, newJa, unmappedJaBooks } = absorbBookInfo(payload);
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

    case 'pick-done':
      hidePickOverlay();
      break;
  }
}

/** Absorb guidebook info seen from any source (shop, 3-way pick, etc.) into
 *  the learned pools: icons, JA text, and status_id → wiki mappings.
 *  @returns {{newMappings:number, newJa:number, unmappedJaBooks:string[]}} */
function absorbBookInfo(recs) {
  let reRender = false;
  let newMappings = 0;
  let newJa = 0;
  const unmappedJaBooks = [];
  const newIconTypes = new Set();
  for (const rec of recs) {
    const sid = rec.status_id != null ? String(rec.status_id) : null;
    if (sid == null) continue;
    if (rec.icon_type != null && seenBookIcons[sid] !== rec.icon_type) {
      seenBookIcons[sid] = rec.icon_type;
      newIconTypes.add(rec.icon_type);
      reRender = true;
    }
    if (rec.name && /[\u3040-\u30ff\u4e00-\u9fff]/.test(rec.name) && learnedJaText['status:' + sid] !== rec.name) {
      learnedJaText['status:' + sid] = rec.name;
      reRender = true;
    }
    if (rec.name) {
      // Try to teach a mapping (works when the name matches wiki text)
      const alreadyMapped = learnedMap.status[sid] != null || GUIDEBOOK_STATUS_ID[sid] != null;
      const hit = matchCodexEntry({ status_id: rec.status_id, name: rec.name, rarity: rec.rarity, icon_type: rec.icon_type });
      if (hit && hit.id != null) {
        if (!alreadyMapped) newMappings++;
        reRender = true;
        // Backfill the entry's JA field from the runtime JA pool (JA-client
        // sessions teach translations for mappings made in EN sessions).
        const jaText = learnedJaText['status:' + sid] || (hit.ja || null);
        if (jaText && hit.ja !== jaText) {
          hit.ja = jaText;
          newJa++;
        }
      } else if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(rec.name)) {
        // JA book with no mapping yet — report its content so the player
        // knows what it does even before switching to EN.
        unmappedJaBooks.push((rec.name || '').replace(/@@/g, ' '));
      }
    }
  }
  // Ask the background to fetch any icon PNGs we don't have bundled/cached
  // (e.g. a pick option's icon_type seen for the first time).
  if (newIconTypes.size > 0) {
    chrome.runtime.sendMessage({ channel: 'gbf-helper:fetch-book-icons', iconTypes: [...newIconTypes] });
  }
  if (reRender) {
    chrome.storage.local.set({
      gbfHelperSeenBookIcons: seenBookIcons,
      gbfHelperLearnedJaText: learnedJaText,
      gbfHelperStatusIdMap: learnedMap,
    });
    renderGuideBooks(latestGuideBooks);
    if (!document.getElementById('guidebook-codex')?.classList.contains('hidden')) renderCodex();
  }
  return { newMappings, newJa, unmappedJaBooks };
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

function normText(s) {
  return String(s || '')
    .toLowerCase()
    // Keep ASCII letters/digits and CJK; drop symbols like '/', '(', ')',
    // '@', '・' etc. \p{L} covers all letters (incl. JA).
    .replace(/[^\p{L}\p{N}+% ]/gu, ' ')
    // '+50%' ≡ '50%': drop '+' in front of digits (ATK +20% vs ATK 20%).
    .replace(/\+\s*(?=\p{N})/gu, '')
    .replace(/\s*([+%])\s*/g, (m, c) => c)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Display text for a codex entry in the selected language, with fallback:
 *   zh → ja (runtime-collected) → text (EN).
 * The bundled ja field is sparse; runtime-collected JA (learnedJaText
 * under 'entry:<id>') fills the gap while playing the JA client.
 */
function getDisplayText(entry) {
  if (codexLang === 'zh') return entry.zh || entry.text;
  if (codexLang === 'ja') {
    if (entry.ja) return entry.ja;
    const entryJa = learnedJaText['entry:' + entry.id];
    if (entryJa) return entryJa;
    // status: pool — JA text learned under a status_id mapped to this entry
    const statusKey = Object.entries(GUIDEBOOK_STATUS_ID).find(([, eid]) => eid === entry.id)?.[0];
    if (statusKey && learnedJaText['status:' + statusKey]) return learnedJaText['status:' + statusKey];
    return entry.text;
  }
  return entry.text;
}

/**
 * Whether a wiki entry already has a known game status_id mapping
 * (built-in table or runtime-learned user/status maps). Mapped entries
 * are recognized by the JA client immediately; unmapped ones fall into
 * Uncatalogued until an EN session teaches the id.
 */
function entryHasStatusMap(entryId) {
  const vals = [
    ...Object.values(GUIDEBOOK_STATUS_ID),
    ...Object.values(learnedMap.status || {}),
    ...Object.values(learnedMap.user || {}),
  ];
  return vals.includes(entryId);
}

/**
 * Match a game book against the wiki DB.
 * Priority:
 *   1. learned status_id map (chrome.storage, extended at runtime when an
 *      EN-client match teaches a status_id → entry mapping)
 *   2. built-in status_id mapping (language-independent — works for EN and JA)
 *   3. normalized effect text in any available language
 * Side effect: when matched by text AND the game gave us a status_id, learn
 * the mapping so future JA/EN sessions match instantly.
 */
function matchCodexEntry(gameBook) {
  if (gameBook == null) return null;
  const sid = gameBook.status_id != null ? String(gameBook.status_id) : null;
  const uid = gameBook.user_status_id != null ? String(gameBook.user_status_id) : null;
  // 1) learned user_status_id map (instance id — identical across EN/JA
  //    for the same player, so a match learned in EN hits instantly in JA)
  if (uid != null && learnedMap.user[uid] != null) {
    return GUIDEBOOK_DB.find(b => b.id === learnedMap.user[uid]) || null;
  }
  // 2) learned status_id map (runtime)
  if (sid != null && learnedMap.status[sid] != null) {
    return GUIDEBOOK_DB.find(b => b.id === learnedMap.status[sid]) || null;
  }
  // 3) built-in status_id map
  if (sid != null && GUIDEBOOK_STATUS_ID[sid] != null) {
    return GUIDEBOOK_DB.find(b => b.id === GUIDEBOOK_STATUS_ID[sid]) || null;
  }
  // 4) text match in any language (en / ja / zh). Exact first; if that
  //    fails, strip "(Remaining uses: x/y)" both sides and prefix-match —
  //    remaining-use counts differ between players (e.g. 1/2 vs 2/2).
  const n = normText(gameBook.name);
  const nStripped = normText(stripRemainingUses(gameBook.name));
  let hit = null;
  for (const b of GUIDEBOOK_DB) {
    for (const lang of ['text', 'ja', 'zh']) {
      const t = b[lang];
      if (!t) continue;
      const tn = normText(t);
      if (tn === n || (n.length >= 12 && tn.startsWith(n))) { hit = b; break; }
      const tnStripped = normText(stripRemainingUses(t));
      if (nStripped.length >= 12 && (tnStripped.startsWith(nStripped) || nStripped.startsWith(tnStripped))) { hit = b; break; }
    }
    if (hit) break;
  }
  if (hit) {
    learnStatusId(gameBook, hit.id);
    learnJaText(hit.id, gameBook.status_id, gameBook.name); // collect JA text for searching
  }
  return hit || null;
}

// Runtime-collected JA effect text for searching. Two key namespaces:
//   entry:<wiki id>  → JA text of a matched entry
//   status:<status_id> → JA text seen from ANY book (matched or not)
// so JA queries can find uncatalogued books too, and DB entries whose
// status_id we've seen in JA match even before text mapping exists.
let learnedJaText = {};
function learnJaText(entryId, statusId, name) {
  if (!name || !/[\u3040-\u30ff\u4e00-\u9fff]/.test(name)) return;
  let changed = false;
  if (entryId != null) {
    const k = 'entry:' + entryId;
    if (learnedJaText[k] !== name) { learnedJaText[k] = name; changed = true; }
  }
  if (statusId != null) {
    const k = 'status:' + statusId;
    if (learnedJaText[k] !== name) { learnedJaText[k] = name; changed = true; }
  }
  if (changed) chrome.storage.local.set({ gbfHelperLearnedJaText: learnedJaText });
}
function loadLearnedJaText() {
  chrome.storage.local.get('gbfHelperLearnedJaText', (res) => {
    const raw = res.gbfHelperLearnedJaText || {};
    learnedJaText = {};
    for (const [k, v] of Object.entries(raw)) {
      // migrate old format (plain entry id) to 'entry:' namespace
      learnedJaText[k.startsWith('entry:') || k.startsWith('status:') ? k : 'entry:' + k] = v;
    }
  });
}

/**
 * Export all runtime-learned guidebook data as a JSON file the user can
 * save, share, or hand back to the project so it can be merged into the
 * bundled database (ja text etc.).
 */
function exportGuidebookData() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    jaText: learnedJaText,            // 'entry:<id>' | 'status:<sid>' → JA text
    idMaps: learnedMap,               // { user: {uid→id}, status: {sid→id} }
    bookIcons: seenBookIcons,         // status_id → icon_type (real icons)
    unknownBooks: [...unknownBooks.values()],
    favorites: [...favoriteBookIds],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gbf_guidebook_data_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import a JSON file produced by exportGuidebookData (or hand-edited),
 * merging its learned data into runtime + chrome.storage.
 */
function importGuidebookData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      let changed = false;

      if (data.jaText && typeof data.jaText === 'object') {
        for (const [k, v] of Object.entries(data.jaText)) {
          if (learnedJaText[k] !== v) { learnedJaText[k] = v; changed = true; }
        }
      }
      if (data.idMaps && typeof data.idMaps === 'object') {
        for (const ns of ['user', 'status']) {
          const src = data.idMaps[ns];
          if (!src || typeof src !== 'object') continue;
          for (const [k, v] of Object.entries(src)) {
            if (learnedMap[ns][k] !== v) { learnedMap[ns][k] = v; changed = true; }
          }
        }
      }
      if (Array.isArray(data.unknownBooks)) {
        for (const ub of data.unknownBooks) {
          const key = String(ub.status_id ?? ub.name);
          if (!unknownBooks.has(key)) { unknownBooks.set(key, ub); changed = true; }
        }
      }
      if (Array.isArray(data.favorites)) {
        for (const id of data.favorites) favoriteBookIds.add(String(id));
        changed = true;
      }
      if (data.bookIcons && typeof data.bookIcons === 'object') {
        for (const [k, v] of Object.entries(data.bookIcons)) {
          if (seenBookIcons[k] !== v) { seenBookIcons[k] = v; changed = true; }
        }
      }

      if (changed) {
        chrome.storage.local.set({
          gbfHelperLearnedJaText: learnedJaText,
          gbfHelperStatusIdMap: learnedMap,
          gbfHelperUnknownBooks: [...unknownBooks.values()],
          gbfHelperFavoriteBooks: [...favoriteBookIds],
          gbfHelperSeenBookIcons: seenBookIcons,
        });
      }
      renderCodex();
      renderGuideBooks(latestGuideBooks);
      updateStatusBar('✓ Guidebook data imported');
    } catch (err) {
      updateStatusBar('✗ Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/** Remove progress/remaining-use suffixes for fuzzy matching:
 *  "(Remaining uses: x/y)", "(3/3 spaces)", "(0/5 spaces)", "(0% / Max: 100%)"
 *  — the game appends these counters but the wiki text omits them. */
function stripRemainingUses(s) {
  return String(s || '')
    .replace(/\(\s*remaining\s+uses\s*:\s*\d+\s*\/\s*\d+\s*\)/gi, '')
    .replace(/\(\s*\d+\s*\/\s*\d+\s*(?:spaces?|spaces?\s+moved)?\s*\)/gi, '')
    // live-value counters the game appends but the wiki omits:
    //   (+0 / Max: +10)  (+20% / Max: 100%)  (Max: +10)  (Max: 100%)
    .replace(/\(\s*[+-]?\d+%?\s*\/\s*max\s*:\s*[+-]?\d+%?\s*\)/gi, '')
    .replace(/\(\s*max\s*:\s*[+-]?\d+%?\s*\)/gi, '');
}

// Runtime-learned id maps (persisted in chrome.storage):
//   user: user_status_id → entry.id  (instance id, identical across EN/JA
//         for the same account — the fastest cross-language bridge)
//   status: status_id → entry.id     (effect id, language-independent)
let learnedMap = { user: {}, status: {} };
function learnStatusId(gameBook, entryId) {
  let changed = false;
  if (gameBook.status_id != null) {
    const k = String(gameBook.status_id);
    if (learnedMap.status[k] !== entryId) { learnedMap.status[k] = entryId; changed = true; }
  }
  if (gameBook.user_status_id != null) {
    const k = String(gameBook.user_status_id);
    if (learnedMap.user[k] !== entryId) { learnedMap.user[k] = entryId; changed = true; }
  }
  if (changed) chrome.storage.local.set({ gbfHelperStatusIdMap: learnedMap });
}
function loadLearnedStatusId() {
  chrome.storage.local.get('gbfHelperStatusIdMap', (res) => {
    const raw = res.gbfHelperStatusIdMap;
    if (raw && (raw.user || raw.status)) {
      // v2 shape
      learnedMap = { user: raw.user || {}, status: raw.status || {} };
    } else if (raw) {
      // v1 shape: plain status_id → id object
      learnedMap = { user: {}, status: raw };
    }
  });
}

/** Build a Map<status_id, wiki entry> for all currently owned books. */
function ownedCodexMap(books) {
  const m = new Map();
  for (const b of books) {
    const entry = matchCodexEntry(b);
    if (entry) m.set(entry.id, { gameBook: b, entry });
  }
  return m;
}

/** Reverse-lookup a wiki entry's game status_id (built-in or runtime maps). */
function statusIdOfEntry(entryId) {
  for (const [sid, eid] of Object.entries(GUIDEBOOK_STATUS_ID)) {
    if (eid === entryId) return sid;
  }
  for (const [sid, eid] of Object.entries(learnedMap.status || {})) {
    if (eid === entryId) return sid;
  }
  return null;
}

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

// Icon types seen from the game: status_id → icon_type. Recorded for EVERY
// book that appears in status_list (matched or not), so exported data can
// fill in real game icons for codex entries the player has encountered —
// even if they don't own them right now. The game only reveals icon_type
// for books it actually returns, so never-owned books stay placeholders.
let seenBookIcons = {}; // status_id → icon_type
function recordSeenIcon(b) {
  if (b == null || b.status_id == null || b.icon_type == null) return;
  const k = String(b.status_id);
  if (seenBookIcons[k] === b.icon_type) return;
  seenBookIcons[k] = b.icon_type;
  chrome.storage.local.set({ gbfHelperSeenBookIcons: seenBookIcons });
}
function loadSeenBookIcons() {
  chrome.storage.local.get('gbfHelperSeenBookIcons', (res) => {
    seenBookIcons = res.gbfHelperSeenBookIcons || {};
  });
}

// Unknown books: guidebooks seen in spacebook_status_list that don't match
// any wiki DB entry (new additions / localized text we haven't catalogued).
// Keyed by status_id so EN and JA clients dedupe correctly.
let unknownBooks = new Map(); // status_id → { status_id, name, rarity, icon_type, num }
function collectUnknownBooks(books) {
  if (!Array.isArray(books)) return;
  let changed = false;
  for (const b of books) {
    recordSeenIcon(b);
    // Collect JA text UNCONDITIONALLY — even books that fail to match the
    // DB must be searchable in JA (their status_id is the stable key).
    learnJaText(null, b.status_id, b.name);
    if (matchCodexEntry(b) != null) continue;
    const key = b.status_id != null ? String(b.status_id) : b.name;
    const prev = unknownBooks.get(key);
    const mergedNum = (prev?.num || 0) + (b.num || 1);
    if (!prev || prev.num !== mergedNum) {
      unknownBooks.set(key, {
        status_id: b.status_id,
        user_status_id: b.user_status_id,
        name: b.name || 'status:' + b.status_id,
        rarity: b.rarity,
        icon_type: b.icon_type,
        num: mergedNum,
      });
      changed = true;
    }
  }
  // Prune: drop entries that can now be matched (learned maps / built-in
  // map grew since they were collected).
  for (const [key, ub] of unknownBooks) {
    if (matchCodexEntry(ub) != null) { unknownBooks.delete(key); changed = true; }
  }
  if (changed) {
    chrome.storage.local.set({ gbfHelperUnknownBooks: [...unknownBooks.values()] });
  }
}
function loadUnknownBooks() {
  chrome.storage.local.get('gbfHelperUnknownBooks', (res) => {
    unknownBooks = new Map();
    for (const b of (res.gbfHelperUnknownBooks || [])) {
      unknownBooks.set(String(b.status_id ?? b.name), b);
    }
    // prune stale entries right after loading too
    collectUnknownBooks([]);
  });
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
      || String(getDisplayText(a.entry)).localeCompare(String(getDisplayText(b.entry)));
  });
  const rarLabel = { 1: '★', 2: '★★', 3: '★★★', 99: '☠' };

  let html = '<div class="guidebook-codex-grid">';
  html += rows.map(({ entry, isOwned, isFav, isMapped }) => {
    const label = getDisplayText(entry);
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
