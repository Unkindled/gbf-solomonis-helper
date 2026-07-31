// Message protocol between content script, background, and window

// content.js → background.js (via window.postMessage → relayed)
export const MSG_GAME_DATA = 'gbf-helper:game-data';

// background.js → window (via chrome.runtime.sendMessage)
export const MSG_MAP_UPDATE = 'gbf-helper:map-update';
export const MSG_MOVE_UPDATE = 'gbf-helper:move-update';
export const MSG_STATUS_UPDATE = 'gbf-helper:status-update';

// window → background.js
export const MSG_OPEN_WINDOW = 'gbf-helper:open-window';
export const MSG_GET_STATE = 'gbf-helper:get-state';

// Payload types for MSG_GAME_DATA
export const PAYLOAD_MAP_INIT = 'map-init';       // Full map from content/index
export const PAYLOAD_MOVE = 'move';               // move_node response
export const PAYLOAD_FINISH_NODE = 'finish-node'; // finish_node_event response
export const PAYLOAD_PROCEED = 'proceed';         // proceed_node_event response
export const PAYLOAD_INCIDENT = 'incident';       // incident_choose response
