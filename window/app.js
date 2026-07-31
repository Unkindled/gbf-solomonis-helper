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
  renderer.setMap(dungeon);
  reEvaluatePath();
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
  const startId = dungeon.current_node_id;
  const endId = node.node_id;

  if (startId === endId) {
    clearCurrentPath();
    return;
  }

  const path = findShortestPath(nodeMap, startId, endId);
  if (!path) {
    updatePathInfo(null, null, 'No path found!');
    return;
  }

  currentPath = path;
  reEvaluatePath();
}

function handleEmptyClick() {
  clearCurrentPath();
}

function clearCurrentPath() {
  currentPath = null;
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

function updateStatusBar() {
  const el = document.getElementById('status-bar');
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
    el.innerHTML = '<span class="path-hint">Click a node to plan a route from your position. Press Esc to clear.</span>';
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
