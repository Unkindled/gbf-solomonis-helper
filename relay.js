// Relay script - runs in ISOLATED world (default content script world)
// Listens for window.postMessage from the MAIN world hook and forwards
// to the background service worker via chrome.runtime.sendMessage.

(function () {
  'use strict';

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
