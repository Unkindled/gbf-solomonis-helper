// Event learning engine — pure data + matching + persistence, no DOM.
//
// Mirrors guidebook-store.js. Owns runtime-learned pools for the event
// codex:
//   seenEvents     event key → { firstSeen, gameText, gameChoices }
//                  (a key is "100101" for normal events or "special:N")
//   unknownEvents  Map<key, rec>  events seen in-game but not in static
//                  EVENT_DB — collected for later codex updates.
//
// Background calls absorbEventDetail() on every proceed/incident that
// carries choice_ids; the codex UI reads these pools to mark events as
// "收录" / "未收录".

import { EVENT_DB } from './event-data.js';

// --- persistence keys ---
const K_SEEN = 'gbfHelperSeenEvents';
const K_UNKNOWN = 'gbfHelperUnknownEvents';

// --- runtime pools ---
export let seenEvents = {};        // key → { firstSeen, gameText, gameChoices }
export let unknownEvents = new Map(); // key → rec

export function _setSeenEvents(s) { seenEvents = s; }
export function _setUnknownEvents(u) { unknownEvents = u; }

/** Check whether an event key exists in the static EVENT_DB. */
export function isKnownEvent(key) {
  return key != null && Object.prototype.hasOwnProperty.call(EVENT_DB, key);
}

/**
 * Absorb an event detail (from extractEventDetail in background).
 * If the event's key is in EVENT_DB → mark seen.
 * If not → record into unknownEvents.
 * Returns { newSeen, newUnknown } counts for toast notifications.
 */
export function absorbEventDetail(detail, onChange) {
  if (!detail || !detail.key) return { newSeen: 0, newUnknown: 0 };
  const key = detail.key;
  let changed = false;
  let newSeen = 0;
  let newUnknown = 0;

  const gameText = detail.description || '';
  const gameChoices = (detail.choices || []).map(c => ({
    choiceId: c.choiceId,
    title: c.title || '',
    text: c.text || '',
    turn: c.turn,
  }));

  if (isKnownEvent(key)) {
    // Known event — record that we've seen it (first time only).
    if (!seenEvents[key]) {
      seenEvents[key] = {
        firstSeen: Date.now(),
        gameText,
        gameChoices,
      };
      newSeen++;
      changed = true;
    } else {
      // Update game text if we have new data (e.g. EN text learned later).
      const prev = seenEvents[key];
      if (gameText && !prev.gameText) {
        prev.gameText = gameText;
        changed = true;
      }
      // Update choices if we have more info now.
      if (gameChoices.length > 0 && (!prev.gameChoices || prev.gameChoices.length < gameChoices.length)) {
        prev.gameChoices = gameChoices;
        changed = true;
      }
    }
  } else {
    // Unknown event — collect into the uncatalogued pool.
    const prev = unknownEvents.get(key);
    if (!prev) {
      unknownEvents.set(key, {
        key,
        firstSeen: Date.now(),
        gameText,
        gameChoices,
        specialIncidentId: detail.specialIncidentId ?? null,
      });
      newUnknown++;
      changed = true;
    } else {
      // Update if we have richer data now.
      if (gameText && !prev.gameText) {
        prev.gameText = gameText;
        changed = true;
      }
      if (gameChoices.length > 0 && (!prev.gameChoices || prev.gameChoices.length < gameChoices.length)) {
        prev.gameChoices = gameChoices;
        changed = true;
      }
    }
  }

  if (changed) {
    chrome.storage.local.set({
      [K_SEEN]: seenEvents,
      [K_UNKNOWN]: [...unknownEvents.values()],
    });
    if (onChange) onChange();
  }
  return { newSeen, newUnknown };
}

// --- loaders ---
export function loadSeenEvents() {
  chrome.storage.local.get(K_SEEN, (res) => {
    seenEvents = res[K_SEEN] || {};
  });
}

export function loadUnknownEvents() {
  chrome.storage.local.get(K_UNKNOWN, (res) => {
    unknownEvents = new Map();
    for (const e of (res[K_UNKNOWN] || [])) {
      unknownEvents.set(e.key, e);
    }
  });
}

// --- export / import (same pattern as guidebook-store) ---
export function exportEventData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    seenEvents,
    unknownEvents: [...unknownEvents.values()],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gbf_event_data_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importEventData(file, onChange) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      let changed = false;
      if (data.seenEvents && typeof data.seenEvents === 'object') {
        for (const [k, v] of Object.entries(data.seenEvents)) {
          if (!seenEvents[k]) {
            seenEvents[k] = v;
            changed = true;
          } else {
            // Merge: fill in missing gameText/gameChoices.
            if (v.gameText && !seenEvents[k].gameText) {
              seenEvents[k].gameText = v.gameText;
              changed = true;
            }
            if (v.gameChoices && (!seenEvents[k].gameChoices || seenEvents[k].gameChoices.length < v.gameChoices.length)) {
              seenEvents[k].gameChoices = v.gameChoices;
              changed = true;
            }
          }
        }
      }
      if (Array.isArray(data.unknownEvents)) {
        for (const e of data.unknownEvents) {
          if (!unknownEvents.has(e.key)) {
            unknownEvents.set(e.key, e);
            changed = true;
          }
        }
      }
      if (changed) {
        chrome.storage.local.set({
          [K_SEEN]: seenEvents,
          [K_UNKNOWN]: [...unknownEvents.values()],
        });
      }
      if (onChange) onChange(changed);
    } catch (err) {
      if (onChange) onChange(false, err.message);
    }
  };
  reader.readAsText(file);
}