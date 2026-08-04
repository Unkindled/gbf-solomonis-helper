// Content Script - runs in MAIN world at document_start
// Passively hooks fetch/XHR to read game API responses.
// NEVER modifies requests, responses, or the DOM.
// PATTERNS keys below MUST match DATA_* in shared/protocol.js
// (this file is an IIFE injected into MAIN world — it cannot import).

(function () {
  'use strict';

  const GAME_ORIGIN = 'https://game.granbluefantasy.jp';

  // URL patterns we care about
  const PATTERNS = {
    mapInit: /arcarum3\/dungeon\/content\/index\//,
    moveNode: /rest\/arcarum3\/dungeon\/move_node/,
    finishNode: /rest\/arcarum3\/dungeon\/finish_node_event/,
    proceed: /rest\/arcarum3\/dungeon\/proceed_node_event(\?|$)/,
    spacebookAdd: /rest\/arcarum3\/dungeon\/proceed_node_event_spacebook_status_add/,
    spacebookList: /rest\/arcarum3\/dungeon\/spacebook_status_list/,
    reportBook: /rest\/arcarum3\/dungeon\/report\/spacebook_status_list\//,
    incident: /rest\/arcarum3\/dungeon\/incident_choose/,
    partyStatus: /rest\/arcarum3\/dungeon\/party_status/,
    shopLineup: /rest\/arcarum3\/dungeon\/dungeon_shop_lineup\//,
    shopPurchase: /rest\/arcarum3\/dungeon\/purchase_dungeon_shop_item/,
    battleResult: /\/result\/content\/index\//,
    // Dungeon OVER (expedition finished) — the arcarum3 result page.
    // Distinct from battleResult (a single battle's result page).
    dungeonResult: /arcarum3\/dungeon\/result\/content\/index/,
    raidStart: /rest\/raid\/start\.json/,
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
        // Attach the request body BEFORE postMessage — postMessage clones
        // synchronously, so mutating after the call never reaches the
        // background (e.g. spacebook_status_add's picked status_ids).
        const body = (typeof args[1] === 'object' && args[1] != null) ? args[1].body : undefined;
        if (typeof body === 'string' && body.length > 0) {
          try { json._requestBody = JSON.parse(body); } catch (e) { /* not json */ }
        }
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
    this._gbfHelperMethod = method;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const type = classifyUrl(this._gbfHelperUrl || '');
    if (type) {
      const body = typeof args[0] === 'string' ? args[0] : (args[0] ? JSON.stringify(args[0]) : '');
      this.addEventListener('load', function () {
        try {
          const json = JSON.parse(this.responseText);
          // Attach the request body BEFORE postToExtension (see above).
          if (body) {
            try { json._requestBody = JSON.parse(body); } catch (e) { /* not json */ }
          }
          postToExtension(type, json);
        } catch (e) { /* ignore */ }
      });
    }
    return originalSend.apply(this, args);
  };

  console.log('[GBF Helper] Passive listener installed.');
})();
