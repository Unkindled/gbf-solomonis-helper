// Background Service Worker
// Manages: helper window lifecycle, game state storage, message routing.

let helperWindowId = null;
let gameState = {
  map: null,           // Full dungeon map data
  currentNodeId: null,
  totalTurn: 0,
  dungeonStatus: null,
  miasmaInfo: null,
  partyStatus: null,
};

// --- Window management ---

async function openHelperWindow() {
  // If window already exists, focus it
  if (helperWindowId !== null) {
    try {
      const win = await chrome.windows.get(helperWindowId);
      if (win) {
        await chrome.windows.update(helperWindowId, { focused: true });
        return;
      }
    } catch (e) {
      helperWindowId = null; // Window was closed
    }
  }

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('window/index.html'),
    type: 'popup',
    width: 820,
    height: 920,
  });
  helperWindowId = win.id;
}

// Track window close
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === helperWindowId) {
    helperWindowId = null;
  }
});

// --- Message handling ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.channel) return;

  if (msg.channel === 'gbf-helper:open-window') {
    openHelperWindow();
    return;
  }

  if (msg.channel === 'gbf-helper:get-state') {
    sendResponse(gameState);
    return true;
  }

  if (msg.channel === 'gbf-helper:game-data') {
    handleGameData(msg.type, msg.data);
    return;
  }
});

// --- Game data processing ---

function handleGameData(type, data) {
  switch (type) {
    case 'mapInit':
      handleMapInit(data);
      break;
    case 'moveNode':
      handleMoveNode(data);
      break;
    case 'finishNode':
      handleFinishNode(data);
      break;
    case 'proceed':
      handleProceed(data);
      break;
    case 'incident':
      handleIncident(data);
      break;
    case 'partyStatus':
      handlePartyStatus(data);
      break;
  }
}

function handleMapInit(data) {
  // data is the full response: { data: "...", option: {...}, display_list: {...} }
  const dungeon = data && data.option && data.option.dungeon;
  if (!dungeon) return;

  gameState.map = dungeon;
  gameState.currentNodeId = dungeon.current_node_id;
  gameState.totalTurn = dungeon.total_turn;
  gameState.dungeonStatus = dungeon.dungeon_status;
  gameState.miasmaInfo = dungeon.miasma_info;

  broadcastToWindow('map-init', dungeon);
}

function handleMoveNode(data) {
  if (!data) return;

  gameState.currentNodeId = data.after_current_node_id;
  gameState.totalTurn = data.total_turn;
  if (data.dungeon_status) gameState.dungeonStatus = data.dungeon_status;
  if (data.miasma_info) gameState.miasmaInfo = data.miasma_info;

  // Update node visited status in map
  if (gameState.map && gameState.map.node_list) {
    const node = gameState.map.node_list.find(n => n.node_id === data.after_current_node_id);
    if (node) node.is_visited = true;
  }

  broadcastToWindow('move-update', {
    currentNodeId: data.after_current_node_id,
    beforeNodeId: data.before_current_node_id,
    nodeType: data.node_type,
    totalTurn: data.total_turn,
    miasmaInfo: data.miasma_info,
    dungeonStatus: data.dungeon_status,
  });
}

function handleFinishNode(data) {
  if (!data) return;

  if (data.dungeon_status) gameState.dungeonStatus = data.dungeon_status;
  if (data.miasma_info) gameState.miasmaInfo = data.miasma_info;
  if (data.total_turn !== undefined) gameState.totalTurn = data.total_turn;

  // Update map nodes
  if (gameState.map && gameState.map.node_list) {
    if (data.is_delete_node && gameState.currentNodeId) {
      // Mark node as deleted (remove from adjacency)
      // For now just mark is_shrinking as indicator
    }
    // Update special incident appearances
    if (data.special_incident_appearance_info) {
      const info = data.special_incident_appearance_info;
      const appearances = Array.isArray(info) ? info : Object.values(info);
      for (const app of appearances) {
        if (app.appearance_list) {
          for (const a of app.appearance_list) {
            const node = gameState.map.node_list.find(n => n.node_id === a.node_id);
            if (node) node.special_incident_id = a.special_incident_id;
          }
        }
      }
    }
  }

  broadcastToWindow('finish-node', {
    miasmaInfo: data.miasma_info,
    dungeonStatus: data.dungeon_status,
    totalTurn: data.total_turn,
    isDeleteNode: data.is_delete_node,
    isVisitedNode: data.is_visited_node,
    specialIncidentAppearance: data.special_incident_appearance_info,
  });
}

function handleProceed(data) {
  if (!data) return;
  if (data.dungeon_status) gameState.dungeonStatus = data.dungeon_status;
  if (data.miasma_info) gameState.miasmaInfo = data.miasma_info;
  if (data.total_turn !== undefined) gameState.totalTurn = data.total_turn;

  broadcastToWindow('proceed', {
    dungeonStatus: data.dungeon_status,
    miasmaInfo: data.miasma_info,
    totalTurn: data.total_turn,
  });
}

function handleIncident(data) {
  // Same structure as move_node response
  handleMoveNode(data);
}

function handlePartyStatus(data) {
  if (!Array.isArray(data)) return;
  gameState.partyStatus = data;
  broadcastToWindow('party-status', data);
}

// --- Broadcast to helper window ---

function broadcastToWindow(type, payload) {
  chrome.runtime.sendMessage({
    channel: 'gbf-helper:window-data',
    type,
    payload,
  }).catch(() => { /* window may not be open */ });
}
