// Relay script - runs in ISOLATED world (default content script world)
// Listens for window.postMessage from the MAIN world hook and forwards
// to the background service worker via chrome.runtime.sendMessage.

(function () {
  'use strict';

  // Report whether THIS game tab is inside the Solomonis dungeon
  // (#arcarum3/dungeon...). The background keys it by sender.tab.id so it
  // knows if any open game tab is in a run — used to decide whether the
  // guidebook auto-refresh window is worth opening.
  const DUNGEON_HASH_RE = /#arcarum3\/dungeon(?:\/|$)/;
  function reportDungeonState() {
    const inDungeon = DUNGEON_HASH_RE.test(location.hash || '');
    chrome.runtime.sendMessage({
      channel: 'gbf-helper:dungeon-state', // == shared/protocol.js MSG_DUNGEON_STATE
      inDungeon,
    }).catch(() => { /* service worker may be inactive */ });
  }
  window.addEventListener('hashchange', reportDungeonState);
  // SPA route changes sometimes happen without a hashchange event (history
  // API / direct game routing) — poll every 2s as a cheap safety net.
  setInterval(reportDungeonState, 2000);
  reportDungeonState();

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.origin !== 'https://game.granbluefantasy.jp') return;
    const msg = event.data;
    if (!msg || msg.source !== 'gbf-rouge-helper') return;

    chrome.runtime.sendMessage({
      channel: 'gbf-helper:game-data', // == shared/protocol.js MSG_GAME_DATA
      type: msg.type,
      data: msg.data,
    }).catch(() => { /* service worker may be inactive */ });
  });
})();
