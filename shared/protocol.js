// Message protocol between content script, background, and helper window.
//
// Single source of truth for every channel/type string used across:
//   content.js (MAIN world) → relay.js → background.js → window/app.js
// Add a new game endpoint by: PATTERNS entry (content) + handleGameData
// case (background) + window message case (app.js) — all using these
// constants so a rename is one edit, not six.

// --- window → background (chrome.runtime.sendMessage) ---
export const MSG_OPEN_WINDOW = 'gbf-helper:open-window';
export const MSG_GET_STATE = 'gbf-helper:get-state';
export const MSG_GET_MIASMA_LOG = 'gbf-helper:get-miasma-log';
export const MSG_OPEN_GUIDEBOOK_TAB = 'gbf-helper:open-guidebook-tab';
export const MSG_FETCH_BOOK_ICONS = 'gbf-helper:fetch-book-icons';

// --- content → background (via window.postMessage → relay) ---
export const MSG_GAME_DATA = 'gbf-helper:game-data';
// relay.js (ISOLATED) → background: page-level dungeon presence report
// (hashchange-driven, tab-scoped). Lets the background know whether a
// game tab is inside the dungeon WITHOUT reading tab.url (whose fragment
// is unreliable across browsers).
export const MSG_DUNGEON_STATE = 'gbf-helper:dungeon-state';

// --- background → window (broadcastToWindow, via chrome.runtime.sendMessage) ---
export const MSG_WINDOW_DATA = 'gbf-helper:window-data';

// --- Payload types for MSG_WINDOW_DATA (background → window) ---
export const TYPE_MAP_INIT = 'map-init';                 // full map from content/index
export const TYPE_MOVE_UPDATE = 'move-update';           // move_node response
export const TYPE_FINISH_NODE = 'finish-node';           // finish_node_event response
export const TYPE_PROCEED = 'proceed';                   // proceed_node_event response
export const TYPE_PARTY_STATUS = 'party-status';         // party_status response
export const TYPE_DECK_WEAPONS = 'deck-weapons';         // deck_weapon from proceed/incident
export const TYPE_GUIDE_BOOKS = 'guide-books';           // spacebook_status_list
export const TYPE_GUIDEBOOK_ICONS = 'guidebook-icons';   // fetched icon data URLs
export const TYPE_GUIDEBOOKS_STALE = 'guidebooks-stale';
export const TYPE_GUIDEBOOK_REFRESH_STARTED = 'guidebook-refresh-started';
export const TYPE_GUIDEBOOK_REFRESH_FAILED = 'guidebook-refresh-failed';
export const TYPE_GUIDEBOOK_NO_DUNGEON = 'guidebook-no-dungeon';
export const TYPE_SHOP_STOCK = 'shop-stock';             // {nodeId, stock}
export const TYPE_SHOP_GUIDEBOOKS = 'shop-guidebooks';   // status_id → rec
export const TYPE_PICK_CANDIDATES = 'pick-candidates';   // 3-way pick options
export const TYPE_PICK_DONE = 'pick-done';
export const TYPE_EVENT_DETAIL = 'event-detail';          // event choice overlay
export const TYPE_EVENT_DONE = 'event-done';              // event choice resolved
export const TYPE_REPORT_BOOKS = 'report-books';         // battle-report books
export const TYPE_DUNGEON_POINT = 'dungeon-point';       // Sephira coins

// --- Payload types for MSG_GAME_DATA (content → background via relay) ---
// Same names as the PATTERNS keys in content.js.
export const DATA_MAP_INIT = 'mapInit';
export const DATA_MOVE_NODE = 'moveNode';
export const DATA_FINISH_NODE = 'finishNode';
export const DATA_PROCEED = 'proceed';
export const DATA_SPACEBOOK_ADD = 'spacebookAdd';
export const DATA_SPACEBOOK_LIST = 'spacebookList';
export const DATA_REPORT_BOOK = 'reportBook';
export const DATA_INCIDENT = 'incident';
export const DATA_PARTY_STATUS = 'partyStatus';
export const DATA_SHOP_LINEUP = 'shopLineup';
export const DATA_SHOP_PURCHASE = 'shopPurchase';
export const DATA_BATTLE_RESULT = 'battleResult';
export const DATA_DUNGEON_RESULT = 'dungeonResult';
export const DATA_RAID_START = 'raidStart';
