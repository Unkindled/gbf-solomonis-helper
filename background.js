// Background Service Worker
// Manages: helper window lifecycle, game state storage, message routing.

import {
  MSG_OPEN_WINDOW, MSG_GET_STATE, MSG_GET_MIASMA_LOG,
  MSG_OPEN_GUIDEBOOK_TAB, MSG_FETCH_BOOK_ICONS, MSG_GAME_DATA,
  MSG_WINDOW_DATA,
  DATA_MAP_INIT, DATA_MOVE_NODE, DATA_FINISH_NODE, DATA_PROCEED,
  DATA_SPACEBOOK_ADD, DATA_SPACEBOOK_LIST, DATA_REPORT_BOOK, DATA_INCIDENT,
  DATA_PARTY_STATUS, DATA_SHOP_LINEUP, DATA_SHOP_PURCHASE, DATA_BATTLE_RESULT,
  DATA_RAID_START,
  TYPE_MAP_INIT, TYPE_MOVE_UPDATE, TYPE_FINISH_NODE, TYPE_PROCEED,
  TYPE_PARTY_STATUS, TYPE_GUIDE_BOOKS, TYPE_GUIDEBOOK_ICONS,
  TYPE_GUIDEBOOKS_STALE, TYPE_GUIDEBOOK_REFRESH_STARTED,
  TYPE_GUIDEBOOK_REFRESH_FAILED, TYPE_SHOP_STOCK, TYPE_SHOP_GUIDEBOOKS,
  TYPE_PICK_CANDIDATES, TYPE_PICK_DONE, TYPE_REPORT_BOOKS, TYPE_DUNGEON_POINT,
} from './shared/protocol.js';
import { applyMove, applyFinish } from './shared/dungeon-mutations.js';

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
  shopGuidebooks: {},     // status_id → {status_id,name,icon_type,rarity} from shop lineups
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

  if (msg.channel === MSG_OPEN_WINDOW) {
    openHelperWindow();
    return;
  }

  if (msg.channel === MSG_OPEN_GUIDEBOOK_TAB) {
    openGuidebookTab();
    return;
  }

  if (msg.channel === MSG_FETCH_BOOK_ICONS) {
    const types = Array.isArray(msg.iconTypes) ? msg.iconTypes : [];
    if (types.length > 0) fetchMissingBookIcons(types);
    return;
  }

  if (msg.channel === MSG_GET_STATE) {
    // shopStock is a Map — serialize to a plain object for the response
    const shopStock = {};
    for (const [k, v] of gameState.shopStock) shopStock[k] = v;
    sendResponse({ ...gameState, shopStock });
    return true;
  }

  if (msg.channel === MSG_GET_MIASMA_LOG) {
    sendResponse(miasmaLog);
    return true;
  }

  if (msg.channel === MSG_GAME_DATA) {
    handleGameData(msg.type, msg.data);
    return;
  }
});

// --- Game data processing ---

function handleGameData(type, data) {
  switch (type) {
    case DATA_MAP_INIT:
      handleMapInit(data);
      break;
    case DATA_MOVE_NODE:
      handleMoveNode(data);
      break;
    case DATA_FINISH_NODE:
      handleFinishNode(data);
      break;
    case DATA_PROCEED:
      handleProceed(data);
      break;
    case DATA_SPACEBOOK_LIST:
      handleSpacebookList(data);
      break;
    case DATA_REPORT_BOOK:
      // Battle-report page: per-run guidebook list. Do NOT overwrite the
      // owned list — just feed the books into the learning pool so the
      // codex gains mappings/icons/JA text (and fetch their icons).
      if (data && Array.isArray(data.status_list)) {
        const books = data.status_list.map(b => ({
          status_id: b.status_id,
          name: b.name || `status:${b.status_id}`,
          rarity: b.rarity,
          icon_type: b.icon_type,
        }));
        if (books.length > 0) {
          broadcastToWindow(TYPE_REPORT_BOOKS, books);
          const iconTypes = [...new Set(books.map(b => b.icon_type).filter(t => t != null))];
          fetchMissingBookIcons(iconTypes);
        }
      }
      break;
    case DATA_SPACEBOOK_ADD:
      handleSpacebookAdd(data);
      break;
    case DATA_INCIDENT:
      handleIncident(data);
      break;
    case DATA_PARTY_STATUS:
      handlePartyStatus(data);
      break;
    case DATA_RAID_START:
      handleRaidStart(data);
      break;
    case DATA_SHOP_LINEUP:
      handleShopLineup(data);
      break;
    case DATA_SHOP_PURCHASE:
      handleShopPurchase(data);
      break;
    case DATA_BATTLE_RESULT:
      // Battle ended → guidebook drops may have happened silently.
      // Flag stale so the UI reminds the player to open the in-game
      // guidebook page (which triggers spacebook_status_list).
      gameState.guideBooksStale = true;
      broadcastToWindow(TYPE_GUIDEBOOKS_STALE, true);
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
  broadcastToWindow(TYPE_GUIDE_BOOKS, books);
  broadcastToWindow(TYPE_GUIDEBOOKS_STALE, false);
  closeGuidebookTab(); // data refreshed → safe to close the background tab
  // Auto-fetch any guidebook icons we don't have bundled yet
  const iconTypes = [...new Set(books.map(b => b.icon_type).filter(t => t != null))];
  fetchMissingBookIcons(iconTypes);
}

// --- Background guidebook refresh window ---
//
// When guidebook data may be stale (e.g. after battle drops that didn't
// trigger a status_list response), the user can tap the guidebook button
// to open the in-game guidebook page in a TINY, INCONSPICUOUS popup
// window (bottom-right corner, unfocused). Unlike a background TAB, a
// visible popup window keeps document.hidden === false, so the browser
// does NOT throttle it — the game SPA runs immediately and fires
// spacebook_status_list on its own. The window is closed right after
// data arrives. The extension never sends any request itself — only the
// game does.

let guidebookWinId = null;
let guidebookTabId = null;
let guidebookTabTimer = null;
const GUIDEBOOK_URL = 'https://game.granbluefantasy.jp/#arcarum3/book';
const GUIDEBOOK_WIN_W = 340;
const GUIDEBOOK_WIN_H = 220;
const GUIDEBOOK_TAB_TIMEOUT_MS = 12000;

async function getCornerPosition() {
  try {
    const displays = await chrome.system.display.getInfo();
    const primary = displays.find(d => d.isPrimary) || displays[0];
    if (!primary) return {};
    const w = primary.workArea || primary.bounds;
    return {
      left: Math.max(0, w.left + w.width - GUIDEBOOK_WIN_W - 8),
      top: Math.max(0, w.top + w.height - GUIDEBOOK_WIN_H - 48), // above taskbar
    };
  } catch (e) {
    return {};
  }
}

async function openGuidebookTab() {
  // If a refresh is already pending, keep it.
  if (guidebookWinId != null) return;
  try {
    const pos = await getCornerPosition();
    const win = await chrome.windows.create({
      url: GUIDEBOOK_URL,
      type: 'popup',
      width: GUIDEBOOK_WIN_W,
      height: GUIDEBOOK_WIN_H,
      focused: false,
      ...pos,
    });
    guidebookWinId = win.id;
    guidebookTabId = win.tabs && win.tabs[0] ? win.tabs[0].id : null;
    // Re-assert unfocused (some platforms briefly focus a new window).
    if (guidebookWinId != null) {
      try { await chrome.windows.update(guidebookWinId, { focused: false }); } catch (e) { /* ignore */ }
    }
    broadcastToWindow(TYPE_GUIDEBOOK_REFRESH_STARTED, true);
    // Safety net: close and notify even if no status_list response arrives.
    guidebookTabTimer = setTimeout(() => {
      broadcastToWindow(TYPE_GUIDEBOOK_REFRESH_FAILED, true);
      closeGuidebookTab();
    }, GUIDEBOOK_TAB_TIMEOUT_MS);
  } catch (e) {
    guidebookWinId = null;
    guidebookTabId = null;
  }
}

function closeGuidebookTab() {
  if (guidebookTabTimer) { clearTimeout(guidebookTabTimer); guidebookTabTimer = null; }
  const winId = guidebookWinId;
  guidebookWinId = null;
  guidebookTabId = null;
  if (winId == null) return;
  try { chrome.windows.remove(winId); } catch (e) { /* window already gone */ }
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
    broadcastToWindow(TYPE_GUIDEBOOK_ICONS, fetched);
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
  broadcastToWindow(TYPE_SHOP_STOCK, { nodeId, stock: { items, coinAfter: prev.coinAfter } });

  // Collect guidebooks sold in the shop: the shop lineup reveals books the
  // player does NOT own, with their status_id + icon_type + rarity. These
  // feed the codex's unmapped pool — a fast way to gather book info beyond
  // what the player has obtained.
  const shopBooks = data.item_list.filter(it => String(it.item_type) === '4' && it.status_id != null);
  if (shopBooks.length > 0) {
    gameState.shopGuidebooks = gameState.shopGuidebooks || {};
    let added = false;
    for (const b of shopBooks) {
      const key = String(b.status_id);
      const rec = {
        status_id: b.status_id,
        name: b.name || '',
        icon_type: b.icon_type,
        rarity: b.rarity,
      };
      const prevRec = gameState.shopGuidebooks[key];
      if (!prevRec || prevRec.name !== rec.name || prevRec.icon_type !== rec.icon_type) {
        gameState.shopGuidebooks[key] = rec;
        added = true;
      }
    }
    if (added) broadcastToWindow(TYPE_SHOP_GUIDEBOOKS, gameState.shopGuidebooks);
  }
}

function handleShopPurchase(data) {
  if (!data) return;
  if (data.after_coin != null) {
    gameState.dungeonPoint = Number(data.after_coin);
    broadcastToWindow(TYPE_DUNGEON_POINT, gameState.dungeonPoint);
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

  broadcastToWindow(TYPE_MAP_INIT, dungeon);
  broadcastToWindow(TYPE_DUNGEON_POINT, gameState.dungeonPoint);
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

  // move_node carries a fresh party HP snapshot (before_party_status),
  // e.g. miasma damage per step. Sync it to the party bar.
  extractPartyStatus(data);

  // Update node visited status in map + accumulate miasma consumption
  if (gameState.map && gameState.map.node_list) {
    applyMove(
      gameState.map.node_list,
      data.after_current_node_id,
      (data.miasma_info && data.miasma_info.shrink_node_ids) || [],
    );
  }

  broadcastToWindow(TYPE_MOVE_UPDATE, {
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
    applyFinish(gameState.map.node_list, gameState.currentNodeId, data);
  }

  broadcastToWindow(TYPE_FINISH_NODE, {
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

  // Stationary miasma damage / event HP changes ride on proceed responses
  extractPartyStatus(data);

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
    // The 3-way pick UI reveals up to 3 guidebooks (status_id + name +
    // icon + rarity) — including ones the player doesn't own. Feed them
    // to the helper window for icon/JA-text/mapping collection.
    broadcastToWindow(TYPE_PICK_CANDIDATES, candidates);
  }

  broadcastToWindow(TYPE_PROCEED, {
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
  broadcastToWindow(TYPE_PICK_DONE, true); // 3-way choice resolved → hide overlay

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
    broadcastToWindow(TYPE_GUIDE_BOOKS, gameState.guideBooks);
  }
}

function handleIncident(data) {
  // incident_choose does NOT move the player — the response has no
  // current_node_id fields. Handle it as a proceed (scenario/miasma/turn
  // updates + guide book candidates) WITHOUT touching the position, which
  // was previously wiped to undefined here (player "disappeared" until the
  // next real move_node).
  handleProceed(data);
}

// Extract a party HP snapshot from any response that carries
// action_scenario_list[].before/after_party_status (move_node /
// proceed_node_event / incident_choose). This is how miasma damage
// reaches the party bar.
// after_party_status is the post-move HP (before_ lags one step behind —
// verified: move#N.after === move#N+1.before).
function extractPartyStatus(data) {
  if (!data || !Array.isArray(data.action_scenario_list)) return;
  for (const s of data.action_scenario_list) {
    const snap = Array.isArray(s.after_party_status) && s.after_party_status.length > 0
      ? s.after_party_status
      : (Array.isArray(s.before_party_status) && s.before_party_status.length > 0 ? s.before_party_status : null);
    if (snap) {
      gameState.partyStatus = snap;
      broadcastToWindow(TYPE_PARTY_STATUS, snap);
      return;
    }
  }
}

function handlePartyStatus(data) {
  if (!Array.isArray(data)) return;
  gameState.partyStatus = data;
  broadcastToWindow(TYPE_PARTY_STATUS, data);
}

// Battle start: raid/start.json carries a full snapshot of the player's
// party HP (player.param[] with hp/hpmax/pid/alive). BUT the pid format
// differs from party_status image_id (missing _01/_03 suffix), so NPC
// portraits would 404 during battle. Per user decision: DON'T sync the
// party bar during battle — the bar updates again on battle end via
// party_status / content/index. We still record the HP for state.
function handleRaidStart(data) {
  if (!data || !data.player || !Array.isArray(data.player.param)) return;
  const params = data.player.param;
  const party = params.map((p, i) => ({
    attribute: p.attr != null ? Number(p.attr) : null,
    // pid ≠ party_status image_id (missing _01/_03 suffix) → NPC portraits
    // would 404; drop the id so the bar shows a placeholder instead.
    image_id: i === 0 ? (p.pid || '') : '',
    max_hp: Number(p.hpmax) || 0,
    hp: String(p.hp != null ? p.hp : 0),
    is_pc: i === 0,
    user_npc_id: null,
    alive: p.alive,
  }));
  if (party.length === 0) return;
  gameState.partyStatus = party;
  // NOTE: deliberately no broadcast — battle-time portraits are broken
  // (pid ≠ image_id), and HP doesn't change mid-battle anyway.
}

// --- Broadcast to helper window ---

function broadcastToWindow(type, payload) {
  chrome.runtime.sendMessage({
    channel: MSG_WINDOW_DATA,
    type,
    payload,
  }).catch(() => { /* window may not be open */ });
}
