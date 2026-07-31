// Content Script - runs in MAIN world at document_start
// Passively hooks fetch/XHR to read game API responses.
// NEVER modifies requests, responses, or the DOM.

(function () {
  'use strict';

  const GAME_ORIGIN = 'https://game.granbluefantasy.jp';

  // URL patterns we care about
  const PATTERNS = {
    mapInit: /arcarum3\/dungeon\/content\/index\//,
    moveNode: /rest\/arcarum3\/dungeon\/move_node/,
    finishNode: /rest\/arcarum3\/dungeon\/finish_node_event/,
    proceed: /rest\/arcarum3\/dungeon\/proceed_node_event/,
    incident: /rest\/arcarum3\/dungeon\/incident_choose/,
    partyStatus: /rest\/arcarum3\/dungeon\/party_status/,
  };

  function classifyUrl(url) {
    for (const [type, re] of Object.entries(PATTERNS)) {
      if (re.test(url)) return type;
    }
    return null;
  }

  function postToExtension(type, data) {
    window.postMessage({
      source: 'gbf-rouge-helper',
      type,
      data,
    }, GAME_ORIGIN);
  }

  // --- Hook fetch ---
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const request = args[0];
    const url = typeof request === 'string' ? request : (request && request.url) || '';
    const type = classifyUrl(url);

    if (!type) return originalFetch.apply(this, args);

    return originalFetch.apply(this, args).then(response => {
      // Clone so we don't consume the body
      const clone = response.clone();
      clone.json().then(json => {
        postToExtension(type, json);
      }).catch(() => { /* ignore non-JSON */ });
      return response;
    });
  };

  // --- Hook XMLHttpRequest ---
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._gbfHelperUrl = typeof url === 'string' ? url : '';
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const type = classifyUrl(this._gbfHelperUrl || '');
    if (type) {
      this.addEventListener('load', function () {
        try {
          const json = JSON.parse(this.responseText);
          postToExtension(type, json);
        } catch (e) { /* ignore */ }
      });
    }
    return originalSend.apply(this, args);
  };

  console.log('[GBF Helper] Passive listener installed.');
})();
