// Main application logic for the helper window

import { MapRenderer } from './map-renderer.js';
import { FilterPanel } from './filter-panel.js';
import { findShortestPath } from './pathfinder.js';
import { annotatePathWithMiasma, MIASMA_ACTIVATION_TURN } from './miasma-predictor.js';
import { DUNGEON_STATUS_LABELS, NODE_TYPE_LABELS, MIASMA_RADIUS } from '../shared/constants.js';

let renderer = null;
let filterPanel = null;
let dungeon = null;
let nodeMap = new Map();
let currentMiasmaInfo = null;
let currentTurn = 0;
let currentPath = null;
let pathStartId = null; // The node the current path starts from
let prevMiasmic = false; // Track miasma state for disappear detection

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
    if (renderer) renderer.focusOnPlayer();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearCurrentPath();
    }
  });

  // Animation loop for pulsing effects
  requestAnimationFrame(function animLoop() {
    if (renderer && renderer.nodeMap.size > 0) renderer.render();
    requestAnimationFrame(animLoop);
  });
}

function applyFullMap(mapData) {
  dungeon = mapData;
  nodeMap.clear();
  if (dungeon.node_list) {
    for (const node of dungeon.node_list) nodeMap.set(node.node_id, node);
  }
  currentMiasmaInfo = dungeon.miasma_info;
  currentTurn = dungeon.total_turn || 0;
  prevMiasmic = !!(currentMiasmaInfo && currentMiasmaInfo.after && currentMiasmaInfo.after.is_miasmic);
  // Fallback: if miasma is active but no node is flagged shrinking (e.g. window
  // opened after activation, or cached pre-miasma map), mark by geometry using
  // the fixed safe-zone radius (authoritative per game client).
  const ma = currentMiasmaInfo && currentMiasmaInfo.after;
  const anyShrinking = [...nodeMap.values()].some(n => n.is_shrinking);
  if (ma && ma.is_miasmic && ma.center_position_x != null && !anyShrinking) {
    const r = MIASMA_RADIUS[ma.level || 1] || MIASMA_RADIUS[1];
    for (const [, node] of nodeMap) {
      const d = Math.hypot(node.position_x - ma.center_position_x, node.position_y - ma.center_position_y);
      if (d > r) node.is_shrinking = true;
    }
  }
  renderer.setMap(dungeon);
  // Update filter panel with present special events
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

// --- Miasma disappear detection (Issue 1) ---

function checkMiasmaTransition(newMiasmaInfo) {
  const wasMiasmic = prevMiasmic;
  const isMiasmic = !!(newMiasmaInfo && newMiasmaInfo.after && newMiasmaInfo.after.is_miasmic);
  prevMiasmic = isMiasmic;

  if (wasMiasmic && !isMiasmic) {
    // Miasma disappeared → new phase/day, map will refresh
    clearCurrentPath();
    clearAllShrinking();
    updateStatusBar('New phase — map refreshing...');
  }
}

/** Update node is_shrinking flags from miasma_info.shrink_node_ids (incremental) */
function applyShrinkNodeIds(miasmaInfo) {
  if (!miasmaInfo) return;
  const shrinkIds = miasmaInfo.shrink_node_ids;
  if (!shrinkIds || shrinkIds.length === 0) return;
  // Incremental: only ADD nodes to shrinking set, never clear existing
  for (const id of shrinkIds) {
    const node = nodeMap.get(Number(id));
    if (node) node.is_shrinking = true;
  }
}

/** Clear all is_shrinking flags (called when miasma ends) */
function clearAllShrinking() {
  for (const [, node] of nodeMap) {
    node.is_shrinking = false;
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
      applyShrinkNodeIds(currentMiasmaInfo);
      renderer.updatePosition(payload.currentNodeId, currentMiasmaInfo, currentTurn);
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
      applyShrinkNodeIds(currentMiasmaInfo);
      // Update special incident appearances
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
        // Refresh filter panel highlights
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

  // Clicking player's current position → clear path
  if (clickedId === dungeon.current_node_id) {
    clearCurrentPath();
    return;
  }

  // If we have a path and clicked a node already on it → truncate path to that node
  if (currentPath && currentPath.length > 0) {
    const idx = currentPath.indexOf(clickedId);
    if (idx >= 0) {
      // Re-target: keep path up to (and including) clicked node
      currentPath = currentPath.slice(0, idx + 1);
      if (currentPath.length <= 1) {
        clearCurrentPath();
      } else {
        reEvaluatePath();
      }
      return;
    }
  }

  // Determine start: extend from last path node, or from player position
  const startId = (currentPath && currentPath.length > 0)
    ? currentPath[currentPath.length - 1]
    : dungeon.current_node_id;

  const segment = findShortestPath(nodeMap, startId, clickedId);
  if (!segment) {
    updatePathInfo(null, null, 'No path found!');
    return;
  }

  // Append segment (avoid duplicating junction node)
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
  // Calculate turn offset: path[0] is at currentTurn (player is there now or was there)
  const annotation = annotatePathWithMiasma(currentPath, nodeMap, currentMiasmaInfo, currentTurn, 0);
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
  const a = currentMiasmaInfo && currentMiasmaInfo.after;
  if (a && a.is_miasmic) {
    miasmaHtml = `<span class="status-miasma">☠ Miasma Lv${a.level} · ${a.miasma_stop_countdown} turns until shrink</span>`;
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

  // Node type summary
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
      const phaseLabel = d.phase === 'lv2' || d.phase === 'predicted-lv2' ? 'after Lv2 shrink' : 'in miasma';
      return `step ${d.step} (#${d.nodeId}) ${phaseLabel}`;
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
