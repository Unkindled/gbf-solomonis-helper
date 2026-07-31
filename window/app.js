// Main application logic for the helper window

import { MapRenderer } from './map-renderer.js';
import { FilterPanel } from './filter-panel.js';
import { findShortestPath, getMiasmaDangerNodes } from './pathfinder.js';
import { DUNGEON_STATUS_LABELS, NODE_TYPE_LABELS, SPECIAL_NODE_LABELS, MIASMA_RADIUS } from '../shared/constants.js';

let renderer = null;
let filterPanel = null;
let dungeon = null;
let nodeMap = new Map();
let currentMiasmaInfo = null;

// --- Init ---

function init() {
  const canvas = document.getElementById('map-canvas');
  const sidebar = document.getElementById('sidebar');
  const statusEl = document.getElementById('status-bar');

  // Size canvas to container
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
      dungeon = state.map;
      buildNodeMap();
      renderer.setMap(dungeon);
      currentMiasmaInfo = state.miasmaInfo;
      updateStatusBar();
    }
  });

  // Listen for live updates
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.channel !== 'gbf-helper:window-data') return;
    handleWindowMessage(msg.type, msg.payload);
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      renderer.clearPath();
      updatePathInfo(null, null);
    }
  });
}

function buildNodeMap() {
  nodeMap.clear();
  if (dungeon && dungeon.node_list) {
    for (const node of dungeon.node_list) {
      nodeMap.set(node.node_id, node);
    }
  }
}

// --- Message handling ---

function handleWindowMessage(type, payload) {
  switch (type) {
    case 'map-init':
      dungeon = payload;
      buildNodeMap();
      renderer.setMap(dungeon);
      currentMiasmaInfo = payload.miasma_info;
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
      currentMiasmaInfo = payload.miasmaInfo;
      renderer.updatePosition(payload.currentNodeId, payload.miasmaInfo);
      updateStatusBar();
      // Re-evaluate path danger if path exists
      reEvaluatePath();
      break;

    case 'finish-node':
      if (payload.dungeonStatus && dungeon) dungeon.dungeon_status = payload.dungeonStatus;
      if (payload.totalTurn !== undefined && dungeon) dungeon.total_turn = payload.totalTurn;
      currentMiasmaInfo = payload.miasmaInfo;
      // Update special incident appearances
      if (payload.specialIncidentAppearance && dungeon) {
        const info = payload.specialIncidentAppearance;
        const appearances = Array.isArray(info) ? info : Object.values(info);
        for (const app of appearances) {
          if (app.appearance_list) {
            for (const a of app.appearance_list) {
              const node = nodeMap.get(a.node_id);
              if (node) node.special_incident_id = a.special_incident_id;
            }
          }
        }
      }
      renderer.miasmaInfo = currentMiasmaInfo;
      renderer.render();
      updateStatusBar();
      break;

    case 'proceed':
      if (payload.dungeonStatus && dungeon) dungeon.dungeon_status = payload.dungeonStatus;
      if (payload.miasmaInfo) currentMiasmaInfo = payload.miasmaInfo;
      renderer.miasmaInfo = currentMiasmaInfo;
      renderer.render();
      updateStatusBar();
      break;
  }
}

// --- Path planning ---

let currentPath = null;

function handleNodeClick(node) {
  if (!dungeon || dungeon.current_node_id == null) return;
  const startId = dungeon.current_node_id;
  const endId = node.node_id;

  if (startId === endId) {
    renderer.clearPath();
    currentPath = null;
    updatePathInfo(null, null);
    return;
  }

  const path = findShortestPath(nodeMap, startId, endId);
  if (!path) {
    updatePathInfo(null, null, 'No path found!');
    return;
  }

  currentPath = path;
  const danger = getMiasmaDangerNodes(path, nodeMap, currentMiasmaInfo, MIASMA_RADIUS);
  renderer.setPath(path, danger);
  updatePathInfo(path, danger);
}

function handleEmptyClick() {
  renderer.clearPath();
  currentPath = null;
  updatePathInfo(null, null);
}

function reEvaluatePath() {
  if (!currentPath) return;
  const danger = getMiasmaDangerNodes(currentPath, nodeMap, currentMiasmaInfo, MIASMA_RADIUS);
  renderer.setPath(currentPath, danger);
  updatePathInfo(currentPath, danger);
}

// --- UI updates ---

function updateStatusBar() {
  const el = document.getElementById('status-bar');
  if (!dungeon) {
    el.textContent = 'Waiting for game data...';
    return;
  }

  const turn = dungeon.total_turn || 0;
  const status = DUNGEON_STATUS_LABELS[dungeon.dungeon_status] || `status:${dungeon.dungeon_status}`;
  let miasmaText = '';

  if (currentMiasmaInfo && currentMiasmaInfo.after && currentMiasmaInfo.after.is_miasmic) {
    const a = currentMiasmaInfo.after;
    miasmaText = ` | ☠ Miasma Lv${a.level} - ${a.miasma_stop_countdown} turns left`;
  }

  el.textContent = `Turn: ${turn} | ${status}${miasmaText}`;
}

function updatePathInfo(path, danger, error) {
  const el = document.getElementById('path-info');
  if (error) {
    el.innerHTML = `<span class="path-error">${error}</span>`;
    return;
  }
  if (!path) {
    el.innerHTML = '<span class="path-hint">Click a node to plan a route from your position.</span>';
    return;
  }

  const steps = path.length - 1;
  const nodeTypes = path.map(id => {
    const n = nodeMap.get(id);
    return n ? (NODE_TYPE_LABELS[n.node_type] || `type:${n.node_type}`) : '?';
  });

  // Count types
  const counts = {};
  for (const t of nodeTypes) counts[t] = (counts[t] || 0) + 1;
  const summary = Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(', ');

  let dangerHtml = '';
  if (danger && danger.size > 0) {
    const dangerSteps = path.filter(id => danger.has(id)).map(id => {
      const idx = path.indexOf(id);
      return `step ${idx}`;
    });
    dangerHtml = `<div class="path-danger">⚠ ${danger.size} node(s) in miasma zone: ${dangerSteps.join(', ')}</div>`;
  }

  el.innerHTML = `
    <div class="path-summary">Route: ${steps} step(s) — ${summary}</div>
    ${dangerHtml}
  `;
}

// --- Start ---

document.addEventListener('DOMContentLoaded', init);
