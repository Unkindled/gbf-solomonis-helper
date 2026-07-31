// Main application logic for the helper window

import { MapRenderer } from './map-renderer.js';
import { FilterPanel } from './filter-panel.js';
import { findShortestPath } from './pathfinder.js';
import { MiasmaTracker, annotatePathWithMiasma, MIASMA_ACTIVATION_TURN } from './miasma-predictor.js';
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
const miasmaTracker = new MiasmaTracker();

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
    miasmaTracker.reset();
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

  // Feed initial miasma state to tracker
  if (currentMiasmaInfo) miasmaTracker.update(currentMiasmaInfo);
  renderer.miasmaTracker = miasmaTracker;

  if (filterPanel) filterPanel.setPresentSpecials(getPresentSpecialIds());
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

      // Feed miasma data to tracker
      if (currentMiasmaInfo) miasmaTracker.update(currentMiasmaInfo);
      renderer.miasmaTracker = miasmaTracker;

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
      if (payload.miasmaInfo) {
        currentMiasmaInfo = payload.miasmaInfo;
        miasmaTracker.update(currentMiasmaInfo);
        renderer.miasmaTracker = miasmaTracker;
      }
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
  }
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
  const annotation = annotatePathWithMiasma(currentPath, nodeMap, miasmaTracker);
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
    el.innerHTML = '<span class="status-waiting">Waiting for game data...</span>';
    return;
  }

  const turn = currentTurn;
  const status = DUNGEON_STATUS_LABELS[dungeon.dungeon_status] || `status:${dungeon.dungeon_status}`;

  let miasmaHtml = '';
  if (miasmaTracker.active) {
    miasmaHtml = `<span class="status-miasma">☠ Miasma Lv${miasmaTracker.level} · ${miasmaTracker.countdown} turns left · ${miasmaTracker.consumedNodes.size} nodes consumed</span>`;
  } else {
    const turnsUntil = MIASMA_ACTIVATION_TURN - turn;
    if (turnsUntil > 0) {
      miasmaHtml = `<span class="status-safe">Miasma in ~${turnsUntil} turns</span>`;
    }
  }

  el.innerHTML = `<span class="status-turn">Turn ${turn}</span><span class="status-sep">·</span><span class="status-state">${status}</span>${miasmaHtml ? '<br>' + miasmaHtml : ''}`;
}

function updatePathInfo(path, annotation, error) {
  const el = document.getElementById('path-info');
  if (error) {
    el.innerHTML = `<span class="path-error">${error}</span>`;
    return;
  }
  if (!path) {
    el.innerHTML = '<span class="path-hint">Click a node to plan a route. Click again to extend. Click your position or Esc to clear.</span>';
    return;
  }

  const steps = path.length - 1;

  const counts = {};
  for (const id of path) {
    const n = nodeMap.get(id);
    if (!n) continue;
    const label = NODE_TYPE_LABELS[n.node_type] || `type:${n.node_type}`;
    counts[label] = (counts[label] || 0) + 1;
  }
  const summary = Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(', ');

  let dangerHtml = '';
  if (annotation && annotation.dangerSteps.length > 0) {
    const first = annotation.firstDangerStep;
    const details = annotation.dangerSteps.slice(0, 8).map(d => {
      const label = d.alreadyConsumed ? 'already in miasma' : 'predicted in miasma';
      return `step ${d.step} (#${d.nodeId}) ${label}`;
    });
    const more = annotation.dangerSteps.length > 8 ? ` +${annotation.dangerSteps.length - 8} more` : '';
    dangerHtml = `<div class="path-danger">⚠ ${annotation.dangerSteps.length}/${path.length} nodes affected — first at step ${first}<br><small>${details.join('<br>')}${more}</small></div>`;
  } else {
    dangerHtml = '<div class="path-safe">✓ Route is safe from miasma</div>';
  }

  el.innerHTML = `
    <div class="path-summary"><strong>${steps} step(s)</strong> — ${summary}</div>
    ${dangerHtml}
  `;
}

// --- Start ---

document.addEventListener('DOMContentLoaded', init);
