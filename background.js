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
  dungeonPoint: 0,        // possession_arcarum3_dungeon_point (Sephira coins)
  guideBooks: [],         // collected guide book effects [{status_id,name,rarity,...}]
  guideBookCandidates: [], // recent pick candidates [{status_id,name,rarity,icon_type}]
  guideBooksStale: false, // set true after battle end (drops may be missed)
  shopStock: new Map(),   // node_id → {coinAfter, items:[{lineup_id,name,price,stock,canBuy}]}
};

// Miasma data recorder — stores every miasma snapshot for formula analysis
let miasmaLog = [];

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
    // shopStock is a Map — serialize to a plain object for the response
    const shopStock = {};
    for (const [k, v] of gameState.shopStock) shopStock[k] = v;
    sendResponse({ ...gameState, shopStock });
    return true;
  }

  if (msg.channel === 'gbf-helper:get-miasma-log') {
    sendResponse(miasmaLog);
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
    case 'spacebookList':
      handleSpacebookList(data);
      break;
    case 'spacebookAdd':
      handleSpacebookAdd(data);
      break;
    case 'incident':
      handleIncident(data);
      break;
    case 'partyStatus':
      handlePartyStatus(data);
      break;
    case 'shopLineup':
      handleShopLineup(data);
      break;
    case 'shopPurchase':
      handleShopPurchase(data);
      break;
    case 'battleResult':
      // Battle ended → guidebook drops may have happened silently.
      // Flag stale so the UI reminds the player to open the in-game
      // guidebook page (which triggers spacebook_status_list).
      gameState.guideBooksStale = true;
      broadcastToWindow('guidebooks-stale', true);
      break;
  }
}

// --- Guide book (spacebook) ---

function handleSpacebookList(data) {
  if (!data || !Array.isArray(data.status_list)) return;
  const books = data.status_list.map(b => ({
    status_id: b.status_id,
    user_status_id: b.user_status_id != null ? b.user_status_id : null,
    name: b.name || `status:${b.status_id}`,
    rarity: b.rarity,
    icon_type: b.icon_type,
    icon_category: b.icon_category,
    num: b.num,
  }));
  gameState.guideBooks = books;
  gameState.guideBooksStale = false; // full sync → no longer stale
  broadcastToWindow('guide-books', books);
  broadcastToWindow('guidebooks-stale', false);
  // Auto-fetch any guidebook icons we don't have bundled yet
  const iconTypes = [...new Set(books.map(b => b.icon_type).filter(t => t != null))];
  fetchMissingBookIcons(iconTypes);
}

// Fetch guidebook icon images from the game CDN that aren't bundled in the
// extension, store them as base64 data URLs in chrome.storage.local, and
// notify the helper window. Read-only: only fetches static image resources.
const BOOK_ICON_CACHE_KEY = 'gbf-helper-book-icons';

async function fetchMissingBookIcons(iconTypes) {
  try {
    const stored = await chrome.storage.local.get(BOOK_ICON_CACHE_KEY);
    const cache = stored[BOOK_ICON_CACHE_KEY] || {};
    const missing = iconTypes.filter(t => !cache[t]);
    if (missing.length === 0) return;

    const fetched = {};
    for (const t of missing) {
      const url = `https://prd-game-a-granbluefantasy.akamaized.net/assets_en/img/sp/arcarum3/assets/icon_book_effect/book_effect_${t}.png`;
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const dataUrl = await blobToDataURL(blob);
        fetched[t] = dataUrl;
      } catch (e) { /* ignore individual failures */ }
    }
    if (Object.keys(fetched).length === 0) return;

    const next = { ...cache, ...fetched };
    await chrome.storage.local.set({ [BOOK_ICON_CACHE_KEY]: next });
    broadcastToWindow('guidebook-icons', fetched);
  } catch (e) { /* storage may be unavailable */ }
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// --- Shop ---

function handleShopLineup(data) {
  if (!data || !Array.isArray(data.item_list)) return;
  // Which shop node are we at? The shop runs on the current node.
  const nodeId = gameState.currentNodeId;
  // The shop has two tabs: book (lineup/1) and item (lineup/2), both map to
  // the SAME node. Merge by lineup_id so one tab doesn't overwrite the other.
  const incoming = data.item_list.map(it => ({
    lineup_id: it.lineup_id,
    item_type: it.item_type,
    // Book tab (type 4) carries the guidebook name in `name`;
    // item tab carries it in `item_name`.
    name: it.item_name || it.name || (it.status_id != null ? `guidebook:${it.status_id}` : `type:${it.item_type}`),
    price: it.price,
    stock: it.stock_num,
    canBuy: it.can_purchase,
    image: it.item_image,
    isGuidebook: it.status_id != null,
    tab: it.item_type === '4' ? 'book' : 'item',
  }));

  const prev = gameState.shopStock.get(nodeId) || { items: [] };
  // Merge: keep existing items not in this response, replace those present
  const mergedMap = new Map(prev.items.map(it => [String(it.lineup_id), it]));
  for (const it of incoming) mergedMap.set(String(it.lineup_id), it);
  const items = [...mergedMap.values()].sort((a, b) => a.lineup_id - b.lineup_id);

  gameState.shopStock.set(nodeId, { items, coinAfter: prev.coinAfter });
  broadcastToWindow('shop-stock', { nodeId, stock: { items, coinAfter: prev.coinAfter } });
}

function handleShopPurchase(data) {
  if (!data) return;
  if (data.after_coin != null) {
    gameState.dungeonPoint = Number(data.after_coin);
    broadcastToWindow('dungeon-point', gameState.dungeonPoint);
  }
  // Refresh the current shop's stock (server re-sends lineup after purchase)
  const nodeId = gameState.currentNodeId;
  const entry = gameState.shopStock.get(nodeId);
  if (entry) {
    entry.coinAfter = data.after_coin != null ? Number(data.after_coin) : entry.coinAfter;
  }
  // The subsequent shopLineup call will update stock counts.
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
  if (dungeon.possession_arcarum3_dungeon_point != null) {
    gameState.dungeonPoint = Number(dungeon.possession_arcarum3_dungeon_point);
  }

  broadcastToWindow('map-init', dungeon);
  broadcastToWindow('dungeon-point', gameState.dungeonPoint);
}

function recordMiasma(source, data) {
  if (!data || !data.miasma_info) return;
  const m = data.miasma_info;
  miasmaLog.push({
    source,
    turn: data.total_turn,
    timestamp: Date.now(),
    before: m.before,
    after: m.after,
    shrink_node_ids: m.shrink_node_ids || [],
  });
  // Keep last 200 entries
  if (miasmaLog.length > 200) miasmaLog = miasmaLog.slice(-200);
}

function handleMoveNode(data) {
  if (!data) return;

  gameState.currentNodeId = data.after_current_node_id;
  gameState.totalTurn = data.total_turn;
  if (data.dungeon_status) gameState.dungeonStatus = data.dungeon_status;
  if (data.miasma_info) gameState.miasmaInfo = data.miasma_info;
  recordMiasma('move_node', data);

  // Update node visited status in map + accumulate miasma consumption
  if (gameState.map && gameState.map.node_list) {
    const node = gameState.map.node_list.find(n => n.node_id === data.after_current_node_id);
    if (node) node.is_visited = true;

    // Mark newly consumed nodes as shrinking (exact from server)
    const shrinkIds = (data.miasma_info && data.miasma_info.shrink_node_ids) || [];
    for (const sid of shrinkIds) {
      const sn = gameState.map.node_list.find(n => n.node_id === Number(sid));
      if (sn) sn.is_shrinking = true;
    }
  }

  broadcastToWindow('move-update', {
    currentNodeId: data.after_current_node_id,
    beforeNodeId: data.before_current_node_id,
    nodeType: data.node_type,
    totalTurn: data.total_turn,
    miasmaInfo: data.miasma_info,
    dungeonStatus: data.dungeon_status,
    shrinkNodeIds: (data.miasma_info && data.miasma_info.shrink_node_ids) || [],
  });
}

function handleFinishNode(data) {
  if (!data) return;

  if (data.dungeon_status) gameState.dungeonStatus = data.dungeon_status;
  if (data.miasma_info) gameState.miasmaInfo = data.miasma_info;
  if (data.total_turn !== undefined) gameState.totalTurn = data.total_turn;
  recordMiasma('finish_node', data);

  // Update map nodes
  if (gameState.map && gameState.map.node_list) {
    if (data.is_delete_node && gameState.currentNodeId) {
      // Mark node as deleted (remove from adjacency)
      // For now just mark is_shrinking as indicator
    }
    // Accumulate newly consumed nodes (exact from server)
    const shrinkIds = (data.miasma_info && data.miasma_info.shrink_node_ids) || [];
    for (const sid of shrinkIds) {
      const sn = gameState.map.node_list.find(n => n.node_id === Number(sid));
      if (sn) sn.is_shrinking = true;
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
    nodeType: data.node_type,
    nodeId: gameState.currentNodeId,
    beforeNodeId: data.before_current_node_id != null ? data.before_current_node_id : gameState.currentNodeId,
  });
}

function handleProceed(data) {
  if (!data) return;
  if (data.dungeon_status) gameState.dungeonStatus = data.dungeon_status;
  if (data.miasma_info) gameState.miasmaInfo = data.miasma_info;
  if (data.total_turn !== undefined) gameState.totalTurn = data.total_turn;

  // Collect guide book candidates from scenario status lists (3-way pick UI:
  // action_scenario_list[] with scenario_type CHOICE + status_list candidates)
  const candidates = [];
  const scenarioLists = (data.action_scenario_list || []).flatMap(s => {
    const lists = s.status_list || [];
    return lists;
  });
  for (const b of scenarioLists) {
    if (b.status_id != null) {
      candidates.push({
        status_id: b.status_id,
        name: b.name || `status:${b.status_id}`,
        rarity: b.rarity,
        icon_type: b.icon_type,
        icon_category: b.icon_category,
      });
    }
  }
  if (candidates.length > 0) {
    gameState.guideBookCandidates = candidates;
  }

  broadcastToWindow('proceed', {
    dungeonStatus: data.dungeon_status,
    miasmaInfo: data.miasma_info,
    totalTurn: data.total_turn,
  });
}

// spacebook_status_add: the 3-way pick confirm. The response body is empty of
// the book list, but the REQUEST carries status_ids of what the player picked.
// Resolve those against the cached candidates and add them to guideBooks.
function handleSpacebookAdd(data) {
  handleProceed(data); // still update common state

  const body = data && data._requestBody;
  const pickedIds = (body && Array.isArray(body.status_ids)) ? body.status_ids.map(Number) : [];
  if (pickedIds.length === 0) return;

  const candidates = gameState.guideBookCandidates;
  let added = false;
  for (const sid of pickedIds) {
    const cand = candidates.find(c => Number(c.status_id) === sid);
    if (!cand) continue;
    const existing = gameState.guideBooks.find(g => Number(g.status_id) === sid);
    if (existing) {
      existing.num = (existing.num || 1) + 1;
    } else {
      gameState.guideBooks.push({ ...cand, num: 1 });
    }
    added = true;
  }
  if (added) {
    broadcastToWindow('guide-books', gameState.guideBooks);
  }
}

function handleIncident(data) {
  // Same structure as move_node response
  handleMoveNode(data);
  // incident_choose may also carry guide book effects
  if (data.action_scenario_list) handleProceed(data);
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
