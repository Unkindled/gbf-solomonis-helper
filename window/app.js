// Main application logic for the helper window

import { MapRenderer } from './map-renderer.js';
import { FilterPanel } from './filter-panel.js';
import { findShortestPath } from './pathfinder.js';
import { annotatePathWithMiasma, MIASMA_ACTIVATION_TURN } from './miasma-predictor.js';
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
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (renderer) renderer.resize(canvas.width, canvas.height);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

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

  // Focus button
  document.getElementById('btn-focus').addEventListener('click', () => {
    if (renderer) renderer.focusPlayer();
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
    langBtn.textContent = I18N.t('btn.lang');
    langBtn.title = I18N.getLang() === 'zh' ? 'Switch to English' : '切换到中文';
    updateStatusBar();
    updatePathInfo(currentPath ? currentPath : null, currentPath ? annotatePathWithMiasma(currentPath, nodeMap, currentMiasmaInfo, currentTurn) : null);
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
    renderer.nodeMap = nodeMap;
    renderer.currentNodeId = dungeon.current_node_id;
    renderer.miasmaInfo = currentMiasmaInfo;
    renderer.totalTurn = currentTurn;
    renderer._updateAdjacentSet();
    renderer.render();
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

      // Path auto-advance
      if (currentPath && currentPath.length > 1) {
        if (payload.currentNodeId === currentPath[1]) {
          currentPath = currentPath.slice(1);
        } else if (!currentPath.includes(payload.currentNodeId)) {
          clearCurrentPath();
        }
      } else if (currentPath && currentPath.length === 1) {
        if (payload.currentNodeId === currentPath[0]) clearCurrentPath();
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
      renderer.miasmaInfo = currentMiasmaInfo;
      renderer.totalTurn = currentTurn;
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

    case 'dungeon-point':
      renderDungeonPoint(payload);
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
  el.textContent = `🪙 ${value}`;
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
    const pct = Math.max(0, Math.min(100, Math.round(hp / maxHp * 100)));
    const color = pct > 50 ? '#4caf50' : pct > 25 ? '#ffa726' : '#f44336';
    const label = m.is_pc ? 'PC' : `N${i}`;
    return `<div class="party-member" title="${label}">
      <div class="party-hpbar"><div class="party-hpfill" style="width:${pct}%;background:${color}"></div></div>
      <span class="party-hptext">${hp}</span>
    </div>`;
  }).join('');
}

function renderGuideBooks(books) {
  // Update the popup (map top-right)
  const body = document.getElementById('guidebook-popup-body');
  if (!body) return;
  if (!Array.isArray(books) || books.length === 0) {
    body.innerHTML = '<div class="guidebook-popup-empty">No guide books yet</div>';
    return;
  }
  const rows = books.map(b => {
    const iconUrl = b.icon_type ? `../assets/icon_book_effect/book_effect_${b.icon_type}.png` : '';
    const rarLabel = { 1: '★', 2: '★★', 3: '★★★', 99: '?' }[b.rarity] || '';
    const name = (b.name || '').replace(/@@/g, ' ');
    return `<div class="guidebook-popup-row">
      ${iconUrl ? `<img class="gb-icon" src="${iconUrl}" alt="">` : '<div class="gb-icon"></div>'}
      <span class="gb-name">${name}</span>
      <span class="gb-rarity">${rarLabel}</span>
    </div>`;
  }).join('');
  body.innerHTML = rows;
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
    updatePathInfo(null, null, 'No path found!');
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
  const annotation = annotatePathWithMiasma(currentPath, nodeMap, currentMiasmaInfo, currentTurn);
  renderer.setPath(currentPath, annotation);
  updatePathInfo(currentPath, annotation);
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

function updatePathInfo(path, annotation, error) {
  const el = document.getElementById('path-info');
  if (error) {
    el.innerHTML = `<span class="path-error">${error}</span>`;
    return;
  }
  if (!path) {
    el.innerHTML = `<span class="path-hint">${I18N.t('path.hint')}</span>`;
    return;
  }

  const steps = path.length - 1;

  const counts = {};
  for (const id of path) {
    const n = nodeMap.get(id);
    if (!n) continue;
    const label = I18N.t('nodeType.' + n.node_type) || NODE_TYPE_LABELS[n.node_type] || `type:${n.node_type}`;
    counts[label] = (counts[label] || 0) + 1;
  }
  const summary = Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(', ');

  let dangerHtml = '';
  if (annotation && annotation.dangerSteps.length > 0) {
    const first = annotation.firstDangerStep;
    const details = annotation.dangerSteps.slice(0, 8).map(d => {
      const phaseLabel = d.phase === 'lv2' || d.phase === 'predicted-lv2' ? I18N.t('path.phaseLv2') : I18N.t('path.phaseMiasma');
      return `step ${d.step} (#${d.nodeId}) ${phaseLabel}`;
    });
    const more = annotation.dangerSteps.length > 8 ? ` +${annotation.dangerSteps.length - 8} more` : '';
    dangerHtml = `<div class="path-danger">${I18N.t('path.affected', { affected: annotation.dangerSteps.length, total: path.length, first })}<br><small>${details.join('<br>')}${more}</small></div>`;
  } else {
    dangerHtml = `<div class="path-safe">${I18N.t('path.safe')}</div>`;
  }

  el.innerHTML = `
    <div class="path-summary"><strong>${I18N.t('path.summary', { steps, summary })}</strong></div>
    ${dangerHtml}
  `;
}

// --- Start ---

document.addEventListener('DOMContentLoaded', init);
