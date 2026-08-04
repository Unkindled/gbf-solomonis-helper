// Background Service Worker
// Manages: helper window lifecycle, game state storage, message routing.

import {
  MSG_OPEN_WINDOW, MSG_GET_STATE, MSG_GET_MIASMA_LOG,
  MSG_OPEN_GUIDEBOOK_TAB, MSG_FETCH_BOOK_ICONS, MSG_GAME_DATA,
  MSG_DUNGEON_STATE,
  MSG_WINDOW_DATA,
  DATA_MAP_INIT, DATA_MOVE_NODE, DATA_FINISH_NODE, DATA_PROCEED,
  DATA_SPACEBOOK_ADD, DATA_SPACEBOOK_LIST, DATA_REPORT_BOOK, DATA_INCIDENT,
  DATA_PARTY_STATUS, DATA_SHOP_LINEUP, DATA_SHOP_PURCHASE, DATA_BATTLE_RESULT,
  DATA_UNLOCK_WEAPON, DATA_UNLOCK_SUMMON, DATA_PARTY_DECK, DATA_DUNGEON_RESULT,
  DATA_RAID_START,
  TYPE_MAP_INIT, TYPE_MOVE_UPDATE, TYPE_FINISH_NODE, TYPE_PROCEED,
  TYPE_PARTY_STATUS, TYPE_GUIDE_BOOKS, TYPE_GUIDEBOOK_ICONS, TYPE_DECK_WEAPONS,
  TYPE_DECK_SUMMONS,
  TYPE_GUIDEBOOKS_STALE, TYPE_GUIDEBOOK_REFRESH_STARTED,
  TYPE_GUIDEBOOK_REFRESH_FAILED, TYPE_GUIDEBOOK_NO_DUNGEON,
  TYPE_SHOP_STOCK, TYPE_SHOP_GUIDEBOOKS,
  TYPE_PICK_CANDIDATES, TYPE_PICK_DONE, TYPE_REPORT_BOOKS, TYPE_DUNGEON_POINT,
  TYPE_EVENT_DETAIL, TYPE_EVENT_DONE,
} from './shared/protocol.js';
import { applyMove, applyFinish } from './shared/dungeon-mutations.js';
import { EVENT_DB } from './shared/event-data.js';

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
  weaponDeck: null,       // normalized weapon slots from deck_weapon / party deck
  summonDeck: null,       // normalized summon slots (main + sub) from deck_summon / party deck
};

// Miasma data recorder — stores every miasma snapshot for formula analysis
let miasmaLog = [];

// --- Game-state persistence (chrome.storage.session) ---
//
// MV3 service workers are killed when idle; without persistence a
// restart loses the in-progress run (map, position, miasma...) until the
// next content/index. We snapshot the core fields to session storage so
// the helper window's get-state can restore them. shopStock is a Map →
// serialized to an object; guideBooks/parties are arrays (fine).
const SESSION_KEY = 'gbfHelperSessionState';
let persistTimer = null;

function snapshotGameState() {
  const { map, currentNodeId, totalTurn, dungeonStatus, miasmaInfo,
    partyStatus, dungeonPoint, guideBooks, guideBooksStale, shopGuidebooks,
    weaponDeck, summonDeck } = gameState;
  const shopStock = {};
  for (const [k, v] of gameState.shopStock) shopStock[k] = v;
  return { map, currentNodeId, totalTurn, dungeonStatus, miasmaInfo,
    partyStatus, dungeonPoint, guideBooks, guideBooksStale, shopGuidebooks,
    weaponDeck, summonDeck, shopStock };
}

function persistGameState() {
  // Debounce: multiple handlers fire in quick succession.
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    chrome.storage.session.set({ [SESSION_KEY]: snapshotGameState() }).catch(() => { /* non-fatal */ });
  }, 300);
}

async function restoreGameState() {
  try {
    const res = await chrome.storage.session.get(SESSION_KEY);
    const saved = res[SESSION_KEY];
    if (!saved) return;
    gameState.currentNodeId = saved.currentNodeId ?? null;
    gameState.totalTurn = saved.totalTurn ?? 0;
    gameState.dungeonStatus = saved.dungeonStatus ?? null;
    gameState.miasmaInfo = saved.miasmaInfo ?? null;
    gameState.partyStatus = saved.partyStatus ?? null;
    gameState.dungeonPoint = saved.dungeonPoint ?? 0;
    gameState.guideBooks = saved.guideBooks ?? [];
    gameState.guideBooksStale = !!saved.guideBooksStale;
    gameState.shopGuidebooks = saved.shopGuidebooks ?? {};
    gameState.weaponDeck = saved.weaponDeck ?? null;
    gameState.summonDeck = saved.summonDeck ?? null;
    gameState.map = saved.map ?? null;
    if (saved.shopStock) {
      // Object.entries yields STRING keys, but the handlers index with the
      // numeric currentNodeId — coerce back so get()/set() hit the same slot.
      gameState.shopStock = new Map(
        Object.entries(saved.shopStock).map(([k, v]) => [Number(k), v]),
      );
    }
  } catch (e) { /* non-fatal */ }
}

// --- Window management ---

// Default helper window size (landscape, generous); the last size the user
// closed the window at is remembered in storage.local and wins over this.
const DEFAULT_WIN_W = 1280;
const DEFAULT_WIN_H = 860;
const WIN_SIZE_KEY = 'gbfHelperWindowSize';

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

  let width = DEFAULT_WIN_W, height = DEFAULT_WIN_H;
  try {
    const stored = await chrome.storage.local.get(WIN_SIZE_KEY);
    const s = stored[WIN_SIZE_KEY];
    if (s && s.width >= 480 && s.height >= 360) { width = s.width; height = s.height; }
  } catch (e) { /* first run */ }

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('window/index.html'),
    type: 'popup',
    width,
    height,
  });
  helperWindowId = win.id;
}

// Remember the helper window's size (debounced) so the next open restores it.
let winSizeTimer = null;
chrome.windows.onBoundsChanged.addListener((win) => {
  if (win.id !== helperWindowId) return;
  clearTimeout(winSizeTimer);
  winSizeTimer = setTimeout(async () => {
    try {
      const w = await chrome.windows.get(helperWindowId);
      if (w && w.width && w.height && w.state === 'normal') {
        chrome.storage.local.set({ [WIN_SIZE_KEY]: { width: w.width, height: w.height } });
      }
    } catch (e) { /* window gone */ }
  }, 400);
});

// Track window close
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === helperWindowId) {
    helperWindowId = null;
  }
});

// --- Message handling ---

// Restore the in-progress run when the SW wakes (storage.session survives
// SW restarts within the browser session).
restoreGameState();

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

  if (msg.channel === MSG_DUNGEON_STATE) {
    // relay.js reports this tab's dungeon presence (hash-driven). Key by
    // sender.tab.id so multiple game tabs are tracked independently.
    const tabId = sender.tab && sender.tab.id;
    if (tabId != null) {
      if (msg.inDungeon) dungeonTabIds.add(tabId);
      else dungeonTabIds.delete(tabId);
    }
    return;
  }
});

// Drop dungeon-presence entries for closed tabs.
chrome.tabs.onRemoved.addListener((tabId) => {
  dungeonTabIds.delete(tabId);
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
    case DATA_UNLOCK_WEAPON:
      handleUnlockWeapon(data);
      break;
    case DATA_UNLOCK_SUMMON:
      handleUnlockSummon(data);
      break;
    case DATA_PARTY_DECK:
      handlePartyDeck(data);
      break;
    case DATA_BATTLE_RESULT:
      // Battle ended → guidebook drops may have happened silently.
      // Flag stale so the UI reminds the player to open the in-game
      // guidebook page (which triggers spacebook_status_list).
      gameState.guideBooksStale = true;
      broadcastToWindow(TYPE_GUIDEBOOKS_STALE, true);
      persistGameState();
      break;
    case DATA_DUNGEON_RESULT:
      // The whole EXPEDITION finished (dungeon result page) — the run is
      // over, so the party and owned guidebooks from that run are gone.
      // Clear them and reset the stale flag so the UI starts fresh.
      gameState.partyStatus = null;
      gameState.guideBooks = [];
      gameState.guideBooksStale = false;
      gameState.shopStock = new Map();
      broadcastToWindow(TYPE_PARTY_STATUS, []);
      broadcastToWindow(TYPE_GUIDE_BOOKS, []);
      broadcastToWindow(TYPE_GUIDEBOOKS_STALE, false);
      persistGameState();
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
  persistGameState();
}

// --- Background guidebook refresh window ---
//
// When guidebook data may be stale (e.g. after battle drops that didn't
// trigger a status_list response), the user can tap the guidebook button
// to open the in-game guidebook page in a TINY, INCONSPICUOUS popup
// window at the bottom-right corner. Unlike a background TAB, a VISIBLE
// popup window keeps document.hidden === false, so the browser does NOT
// throttle it — the game SPA runs immediately and fires
// spacebook_status_list on its own. The window is closed right after
// data arrives. The extension never sends any request itself — only the
// game does.
//
// CRITICAL (Windows): the window must be created FOCUSED and only then
// have focus handed back to the player's window. Creating it with
// focused:false makes Windows instantly MINIMIZE it; Chrome throttles
// minimized pages, so the SPA never loads and status_list never arrives
// (we'd only get data at the 12s timeout).

let guidebookWinId = null;
let guidebookTabId = null;
let guidebookTabTimer = null;
const GUIDEBOOK_URL = 'https://game.granbluefantasy.jp/#arcarum3/book';
const GUIDEBOOK_WIN_W = 340;
const GUIDEBOOK_WIN_H = 220;
const GUIDEBOOK_TAB_TIMEOUT_MS = 12000;

// Tabs whose relay script reports being inside the dungeon
// (#arcarum3/dungeon...). Maintained via MSG_DUNGEON_STATE; tab.url's
// fragment is unreliable (Chrome strips it), so we rely on page-side
// location.hash reports instead.
const dungeonTabIds = new Set();

function hasDungeonTab() {
  return dungeonTabIds.size > 0;
}

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
  // Don't open the refresh window when the player isn't in the dungeon
  // (e.g. they finished the run and are playing other content) — the game
  // SPA wouldn't fire spacebook_status_list anyway. Tell the helper window.
  if (!hasDungeonTab()) {
    broadcastToWindow(TYPE_GUIDEBOOK_NO_DUNGEON, true);
    return;
  }
  try {
    // Remember the currently focused window so we can hand focus back
    // right after creating the refresh window.
    let prevFocused = null;
    try { prevFocused = await chrome.windows.getLastFocused(); } catch (e) { /* ignore */ }

    const pos = await getCornerPosition();
    // IMPORTANT: do NOT create with focused:false. On Windows that makes
    // the popup instantly MINIMIZE, and Chrome throttles minimized pages
    // — the game SPA never runs, so spacebook_status_list never fires and
    // we'd only get data at the 12s timeout. Create normally (visible,
    // focused), then hand focus back to the previous window.
    const win = await chrome.windows.create({
      url: GUIDEBOOK_URL,
      type: 'popup',
      width: GUIDEBOOK_WIN_W,
      height: GUIDEBOOK_WIN_H,
      ...pos,
    });
    guidebookWinId = win.id;
    guidebookTabId = win.tabs && win.tabs[0] ? win.tabs[0].id : null;
    // Give focus back so we don't steal it from the player — the popup
    // stays a normal, non-minimized window (visible → not throttled).
    if (prevFocused && prevFocused.id != null && prevFocused.id !== win.id) {
      try { await chrome.windows.update(prevFocused.id, { focused: true }); } catch (e) { /* ignore */ }
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
    if (added) {
      // Broadcast THIS visit's lineups (not the accumulated pool) — the
      // overlay must show only what's on the current shelf. The pool stays
      // for the learning engine / persistence.
      broadcastToWindow(TYPE_SHOP_GUIDEBOOKS, shopBooks);
    }
  }
  persistGameState();
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
  persistGameState();
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
  persistGameState();
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
  persistGameState();
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

  // The event node completed → the player is back on the map. Close the
  // event detail overlay NOW (multi-step events may have shown several
  // choice rounds; closing on the first incident_choose was too early).
  // Harmless for battle nodes (no event overlay is open then).
  broadcastToWindow(TYPE_EVENT_DONE, true);
  persistGameState();
}

function handleProceed(data) {
  if (!data) return;
  if (data.dungeon_status) gameState.dungeonStatus = data.dungeon_status;
  if (data.miasma_info) gameState.miasmaInfo = data.miasma_info;
  if (data.total_turn !== undefined) gameState.totalTurn = data.total_turn;

  // Stationary miasma damage / event HP changes ride on proceed responses
  extractPartyStatus(data);
  // Weapon deck (action_type=200) may arrive on the same responses.
  extractWeaponDeck(data);
  // Summon deck (action_type=201) may arrive on the same responses.
  extractSummonDeck(data);

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

  // Collect EVENT choices (node_type 5/10): scenario_type=1 carries the
  // event description, scenario_type=2 carries choice_ids[]. Look the
  // event up in the static event DB by the choice_id family prefix
  // (choice_id/100) or special:special_incident_id, and surface it in a
  // bottom-center overlay. Handled separately from pick candidates so the
  // two overlays never fight for the same space.
  const eventDetail = extractEventDetail(data);
  if (eventDetail) {
    broadcastToWindow(TYPE_EVENT_DETAIL, eventDetail);
  }

  broadcastToWindow(TYPE_PROCEED, {
    dungeonStatus: data.dungeon_status,
    miasmaInfo: data.miasma_info,
    totalTurn: data.total_turn,
  });
  persistGameState();
}

/**
 * Extract event-choice detail from a proceed/incident response.
 * Returns null when the response has no event choices (e.g. a plain
 * battle/move proceed). The event DB lookup happens here (background has
 * the static EVENT_DB); the helper window only renders what it receives.
 */
function extractEventDetail(data) {
  const scenarios = Array.isArray(data.action_scenario_list) ? data.action_scenario_list : [];
  let description = '';
  let image = '';
  const choices = [];
  for (const s of scenarios) {
    const st = s.scenario_type != null ? Number(s.scenario_type) : null;
    if (st === 1) {
      if (typeof s.text === 'string') description = s.text;
      if (typeof s.image === 'string') image = s.image;
    } else if (st === 2 && Array.isArray(s.choice_ids)) {
      for (const c of s.choice_ids) {
        if (c == null) continue;
        choices.push({
          choiceId: c.choice_id != null ? Number(c.choice_id) : null,
          title: typeof c.title === 'string' ? c.title : '',
          text: typeof c.text === 'string' ? c.text : '',
          turn: c.turn != null ? Number(c.turn) : null,
        });
      }
    }
  }
  if (choices.length === 0) return null;

  // Special incident id (node_type 10) or infer from choice prefix.
  const specialIncidentId = data.special_incident_id != null
    ? Number(data.special_incident_id)
    : null;
  const eventIds = choices.map(c => c.choiceId).filter(id => id != null && id >= 10000);
  const key = specialIncidentId != null && specialIncidentId > 0
    ? 'special:' + specialIncidentId
    : (() => {
        const groups = [...new Set((eventIds.length ? eventIds : choices.map(c => c.choiceId).filter(id => id != null))
          .map(id => Math.trunc(id / 100)))];
        return groups.length === 1 ? String(groups[0]) : null;
      })();

  const entry = key != null ? (EVENT_DB[key] || null) : null;
  return {
    key,
    description,
    image,
    choices,
    db: entry ? {
      name: entry.name || {},
      description: entry.description || {},
      tips: entry.tips || [],
      optionTexts: Object.fromEntries(
        Object.entries(entry.options || {}).map(([k, o]) => [k, { title: o.title || {}, text: o.text || {} }]),
      ),
    } : null,
  };
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
    persistGameState();
  }
}

function handleIncident(data) {
  // incident_choose does NOT move the player — the response has no
  // current_node_id fields. Handle it as a proceed (scenario/miasma/turn
  // updates + guide book candidates) WITHOUT touching the position, which
  // was previously wiped to undefined here (player "disappeared" until the
  // next real move_node).
  // NOTE: do NOT close the event overlay here — a choice may be one of
  // several in a multi-step event; the overlay closes on finish_node_event
  // (the event node completed → back on the map).
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

// Weapon deck rides on proceed/incident responses (action_type=200,
// scenario_type=3). Normalize the 13 slots for display; sealed slots are
// flagged by is_position_locked (on the SLOT object, not param).
function normalizeWeaponSlots(weaponsObj) {
  const slots = [];
  if (!weaponsObj || typeof weaponsObj !== 'object') return slots;
  for (const [pos, w] of Object.entries(weaponsObj)) {
    if (!w) continue;
    const p = w.param || {};
    const m = w.master || {};
    const skills = [w.skill1, w.skill2, w.skill3, w.skill4]
      .filter(Boolean)
      .map(sk => ({ id: sk.id, name: sk.name || '', description: sk.description || '', image: sk.image || '' }));
    slots.push({
      position: Number(pos),
      imageId: p.image_id || m.id || '',
      name: m.name || '',
      attribute: m.attribute != null ? Number(m.attribute) : null,
      kind: m.kind != null ? Number(m.kind) : null,
      rarity: m.rarity != null ? Number(m.rarity) : null,
      level: p.level != null ? String(p.level) : '',
      sealed: !!w.is_position_locked,
      skills,
    });
  }
  slots.sort((a, b) => a.position - b.position);
  return slots;
}

function setWeaponDeck(deckPayload) {
  gameState.weaponDeck = deckPayload;
  broadcastToWindow(TYPE_DECK_WEAPONS, deckPayload);
  persistGameState();
}

function extractWeaponDeck(data) {
  if (!data || !Array.isArray(data.action_scenario_list)) return;
  for (const s of data.action_scenario_list) {
    const dw = s.deck_weapon;
    if (!dw || !dw.weapons || typeof dw.weapons !== 'object') continue;
    const slots = normalizeWeaponSlots(dw.weapons);
    if (slots.length === 0) continue;
    setWeaponDeck({
      slots,
      isOpenAdditional: !!dw.is_open_additional_weapon,
      isUseAdditional: !!dw.is_use_additional_weapon,
    });
    return;
  }
}

// unlock_weapon: the REQUEST carries weapon_positions (["4"]) — mark those
// slots unsealed immediately, then the follow-up proceed response will
// resend the full deck (extractWeaponDeck overwrites with full data).
function handleUnlockWeapon(data) {
  if (!data || !data._requestBody || !Array.isArray(data._requestBody.weapon_positions)) return;
  const cur = gameState.weaponDeck;
  if (!cur || !Array.isArray(cur.slots)) return;
  let changed = false;
  const positions = new Set(data._requestBody.weapon_positions.map(Number));
  for (const slot of cur.slots) {
    if (positions.has(slot.position) && slot.sealed) {
      slot.sealed = false;
      changed = true;
    }
  }
  if (changed) setWeaponDeck(cur);
}

// party page: /party/deck/{id} response has deck.pc.weapons (same shape).
function handlePartyDeck(data) {
  const pc = data && data.deck && data.deck.pc;
  if (!pc || !pc.weapons) return;
  const slots = normalizeWeaponSlots(pc.weapons);
  if (slots.length === 0) return;
  setWeaponDeck({
    slots,
    isOpenAdditional: !!pc.is_open_additional_weapon,
    isUseAdditional: !!pc.is_use_additional_weapon,
  });
  syncSummonFromPartyDeck(pc);
}

// --- Summon deck (parallel to weapons) ---
// deck_summon.summons = main 5 slots, .sub_summons = support 2 slots.
// is_position_locked sits on the SLOT object (like weapons).
function normalizeSummonSlots(summonsObj) {
  const slots = [];
  if (!summonsObj || typeof summonsObj !== 'object') return slots;
  for (const [pos, s] of Object.entries(summonsObj)) {
    if (!s) continue;
    const p = s.param || {};
    const m = s.master || {};
    const skills = [s.skill, s.sub_skill]
      .filter(Boolean)
      .map(sk => ({ id: sk.id, name: sk.name || '', description: sk.description || '' }));
    slots.push({
      position: Number(pos),
      imageId: p.image_id || m.id || '',
      name: m.name || '',
      attribute: m.attribute != null ? Number(m.attribute) : null,
      rarity: m.rarity != null ? Number(m.rarity) : null,
      level: p.level != null ? String(p.level) : '',
      sealed: !!s.is_position_locked,
      skills,
    });
  }
  slots.sort((a, b) => a.position - b.position);
  return slots;
}

function setSummonDeck(payload) {
  gameState.summonDeck = payload;
  broadcastToWindow(TYPE_DECK_SUMMONS, payload);
  persistGameState();
}

function extractSummonDeck(data) {
  if (!data || !Array.isArray(data.action_scenario_list)) return;
  for (const s of data.action_scenario_list) {
    const ds = s.deck_summon;
    if (!ds) continue;
    const main = normalizeSummonSlots(ds.summons);
    const sub = normalizeSummonSlots(ds.sub_summons);
    if (main.length === 0 && sub.length === 0) continue;
    setSummonDeck({
      main,
      sub,
      isOpenSub: !!ds.is_open_sub_summon,
      quickUserSummonId: ds.quick_user_summon_id != null ? Number(ds.quick_user_summon_id) : null,
    });
    return;
  }
}

// unlock_summon request body: {summon_positions:[], sub_summon_positions:[]}
function handleUnlockSummon(data) {
  if (!data || !data._requestBody) return;
  const body = data._requestBody;
  const cur = gameState.summonDeck;
  if (!cur) return;
  let changed = false;
  const unlock = (slots, positions) => {
    if (!Array.isArray(positions)) return;
    const set = new Set(positions.map(Number));
    for (const slot of slots) {
      if (set.has(slot.position) && slot.sealed) { slot.sealed = false; changed = true; }
    }
  };
  unlock(cur.main, body.summon_positions);
  unlock(cur.sub, body.sub_summon_positions);
  if (changed) setSummonDeck(cur);
}

// party page deck.pc also carries summons/sub_summons.
function syncSummonFromPartyDeck(pc) {
  if (!pc || (!pc.summons && !pc.sub_summons)) return;
  const main = normalizeSummonSlots(pc.summons);
  const sub = normalizeSummonSlots(pc.sub_summons);
  if (main.length === 0 && sub.length === 0) return;
  setSummonDeck({
    main,
    sub,
    isOpenSub: !!pc.is_open_sub_summon,
    quickUserSummonId: pc.quick_user_summon_id != null ? Number(pc.quick_user_summon_id) : null,
  });
}

function handlePartyStatus(data) {
  if (!Array.isArray(data)) return;
  gameState.partyStatus = data;
  broadcastToWindow(TYPE_PARTY_STATUS, data);
  persistGameState();
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
  persistGameState();
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
