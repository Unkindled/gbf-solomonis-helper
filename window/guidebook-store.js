// Guidebook learning engine — pure data + matching + persistence, no DOM.
//
// Owns every runtime-learned pool for the codex:
//   learnedMap    user/status status_id → wiki entry id
//   learnedJaText entry:/status: → JA effect text
//   seenBookIcons status_id → icon_type (real icons for seen books)
//   unknownBooks  uncatalogued books (status_id → rec)
// Rendering glue stays in window/app.js; absorbBookInfo takes an
// onChange callback so the caller can re-render after mutations.

import {
  GUIDEBOOK_DB,
  GUIDEBOOK_STATUS_ID,
} from '../shared/guidebook-data.js';
import { GUIDEBOOK_ICONS } from '../shared/guidebook-icons.js';

// --- persistence keys ---
const K_JA = 'gbfHelperLearnedJaText';
const K_MAP = 'gbfHelperStatusIdMap';
const K_ICONS = 'gbfHelperSeenBookIcons';
const K_UNKNOWN = 'gbfHelperUnknownBooks';

// --- runtime-learned pools ---
export let learnedMap = { user: {}, status: {} };
export let learnedJaText = {};
export let seenBookIcons = {};
export let unknownBooks = new Map(); // status_id → rec

export function _setLearnedMap(m) { learnedMap = m; }
export function _setLearnedJaText(t) { learnedJaText = t; }
export function _setSeenBookIcons(i) { seenBookIcons = i; }
export function _setUnknownBooks(u) { unknownBooks = u; }

// --- normalization ---
export function normText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+% ]/gu, ' ')
    .replace(/\+\s*(?=\p{N})/gu, '')
    .replace(/\s*([+%])\s*/g, (m, c) => c)
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripRemainingUses(s) {
  return String(s || '')
    .replace(/\(\s*remaining\s+uses\s*:\s*\d+\s*\/\s*\d+\s*\)/gi, '')
    .replace(/\(\s*\d+\s*\/\s*\d+\s*(?:spaces?|spaces?\s+moved)?\s*\)/gi, '')
    .replace(/\(\s*[+-]?\d+%?\s*\/\s*max\s*:\s*[+-]?\d+%?\s*\)/gi, '')
    .replace(/\(\s*max\s*:\s*[+-]?\d+%?\s*\)/gi, '');
}

// --- learning ---
export function learnStatusId(gameBook, entryId) {
  let changed = false;
  if (gameBook.status_id != null) {
    const k = String(gameBook.status_id);
    if (learnedMap.status[k] !== entryId) { learnedMap.status[k] = entryId; changed = true; }
  }
  if (gameBook.user_status_id != null) {
    const k = String(gameBook.user_status_id);
    if (learnedMap.user[k] !== entryId) { learnedMap.user[k] = entryId; changed = true; }
  }
  if (changed) chrome.storage.local.set({ [K_MAP]: learnedMap });
}

export function learnJaText(entryId, statusId, name) {
  if (!name || !/[\u3040-\u30ff\u4e00-\u9fff]/.test(name)) return;
  let changed = false;
  if (entryId != null) {
    const k = 'entry:' + entryId;
    if (learnedJaText[k] !== name) { learnedJaText[k] = name; changed = true; }
  }
  if (statusId != null) {
    const k = 'status:' + statusId;
    if (learnedJaText[k] !== name) { learnedJaText[k] = name; changed = true; }
  }
  if (changed) chrome.storage.local.set({ [K_JA]: learnedJaText });
}

export function recordSeenIcon(b) {
  if (b == null || b.status_id == null || b.icon_type == null) return;
  const k = String(b.status_id);
  if (seenBookIcons[k] === b.icon_type) return;
  seenBookIcons[k] = b.icon_type;
  chrome.storage.local.set({ [K_ICONS]: seenBookIcons });
}

// --- matching ---
export function matchCodexEntry(gameBook) {
  if (gameBook == null) return null;
  const sid = gameBook.status_id != null ? String(gameBook.status_id) : null;
  const uid = gameBook.user_status_id != null ? String(gameBook.user_status_id) : null;
  if (uid != null && learnedMap.user[uid] != null) {
    return GUIDEBOOK_DB.find(b => b.id === learnedMap.user[uid]) || null;
  }
  if (sid != null && learnedMap.status[sid] != null) {
    return GUIDEBOOK_DB.find(b => b.id === learnedMap.status[sid]) || null;
  }
  if (sid != null && GUIDEBOOK_STATUS_ID[sid] != null) {
    return GUIDEBOOK_DB.find(b => b.id === GUIDEBOOK_STATUS_ID[sid]) || null;
  }
  const n = normText(gameBook.name);
  const nStripped = normText(stripRemainingUses(gameBook.name));
  let hit = null;
  for (const b of GUIDEBOOK_DB) {
    // Compare against the primary text and any alt alias texts (game's
    // in-client wording may differ from the wiki phrasing, e.g. id20
    // 'Autorevive (Keeps buffs / Once per battle)' vs wiki 'All allies
    // gain Autorevived (with buffs) at battle start').
    const haystack = [b.text, b.ja, b.zh, ...(b.alt || [])];
    for (const t of haystack) {
      if (!t) continue;
      const tn = normText(t);
      if (tn === n || (n.length >= 12 && tn.startsWith(n))) { hit = b; break; }
      const tnStripped = normText(stripRemainingUses(t));
      if (nStripped.length >= 12 && (tnStripped.startsWith(nStripped) || nStripped.startsWith(tnStripped))) { hit = b; break; }
    }
    if (hit) break;
  }
  if (hit) {
    learnStatusId(gameBook, hit.id);
    learnJaText(hit.id, gameBook.status_id, gameBook.name);
  }
  return hit || null;
}

/** Reverse-lookup a wiki entry's game status_id (built-in or runtime maps). */
export function statusIdOfEntry(entryId) {
  for (const [sid, eid] of Object.entries(GUIDEBOOK_STATUS_ID)) {
    if (eid === entryId) return sid;
  }
  for (const [sid, eid] of Object.entries(learnedMap.status || {})) {
    if (eid === entryId) return sid;
  }
  return null;
}

/** Whether a wiki entry has a known status_id mapping (built-in or learned). */
export function entryHasStatusMap(entryId) {
  const vals = [
    ...Object.values(GUIDEBOOK_STATUS_ID),
    ...Object.values(learnedMap.status || {}),
    ...Object.values(learnedMap.user || {}),
  ];
  return vals.includes(entryId);
}

/** Build a Map<entry id, {gameBook, entry}> for all currently owned books. */
export function ownedCodexMap(books) {
  const m = new Map();
  for (const b of books) {
    const entry = matchCodexEntry(b);
    if (entry) m.set(entry.id, { gameBook: b, entry });
  }
  return m;
}

/** Display text for a codex entry in the selected language (zh → ja → en). */
export function getDisplayText(entry, codexLang) {
  if (codexLang === 'zh') return entry.zh || entry.text;
  if (codexLang === 'ja') {
    if (entry.ja) return entry.ja;
    const entryJa = learnedJaText['entry:' + entry.id];
    if (entryJa) return entryJa;
    const statusKey = Object.entries(GUIDEBOOK_STATUS_ID).find(([, eid]) => eid === entry.id)?.[0];
    if (statusKey && learnedJaText['status:' + statusKey]) return learnedJaText['status:' + statusKey];
    return entry.text;
  }
  return entry.text;
}

/** Real icon_type for a codex entry: owned → seen (learned/known) → null. */
export function entryIconType(entryId) {
  const sid = statusIdOfEntry(entryId);
  if (sid == null) return null;
  return seenBookIcons[sid] ?? GUIDEBOOK_ICONS[sid] ?? null;
}

// --- absorption (shop / 3-way pick / battle report) ---
export function absorbBookInfo(recs, onChange) {
  let reRender = false;
  let newMappings = 0;
  let newJa = 0;
  const unmappedJaBooks = [];
  const newIconTypes = new Set();
  for (const rec of recs) {
    const sid = rec.status_id != null ? String(rec.status_id) : null;
    if (sid == null) continue;
    if (rec.icon_type != null && seenBookIcons[sid] !== rec.icon_type) {
      seenBookIcons[sid] = rec.icon_type;
      newIconTypes.add(rec.icon_type);
      reRender = true;
    }
    if (rec.name && /[\u3040-\u30ff\u4e00-\u9fff]/.test(rec.name) && learnedJaText['status:' + sid] !== rec.name) {
      learnedJaText['status:' + sid] = rec.name;
      reRender = true;
    }
    if (rec.name) {
      const alreadyMapped = learnedMap.status[sid] != null || GUIDEBOOK_STATUS_ID[sid] != null;
      const hit = matchCodexEntry({ status_id: rec.status_id, name: rec.name, rarity: rec.rarity, icon_type: rec.icon_type });
      if (hit && hit.id != null) {
        if (!alreadyMapped) newMappings++;
        reRender = true;
        const jaText = (learnedJaText['status:' + sid] || (hit.ja || '')).replace(/@@/g, ' ');
        if (jaText && hit.ja !== jaText) {
          hit.ja = jaText;
          newJa++;
        }
      } else {
        // Unmatched book (from a shop shelf / 3-way pick). Collect it into
        // the uncatalogued pool too — previously only the guidebook page
        // path (collectUnknownBooks) did this, so books seen in shops or
        // pick choices never showed up in the codex's 'Uncatalogued' list.
        const key = sid;
        const prev = unknownBooks.get(key);
        const mergedNum = (prev?.num || 0) + (rec.num || 1);
        if (!prev || prev.num !== mergedNum) {
          unknownBooks.set(key, {
            status_id: rec.status_id,
            user_status_id: rec.user_status_id,
            name: rec.name || 'status:' + sid,
            rarity: rec.rarity,
            icon_type: rec.icon_type,
            num: mergedNum,
          });
          reRender = true;
        }
        if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(rec.name)) {
          unmappedJaBooks.push((rec.name || '').replace(/@@/g, ' '));
        }
      }
    }
  }
  if (newIconTypes.size > 0) {
    chrome.runtime.sendMessage({ channel: 'gbf-helper:fetch-book-icons', iconTypes: [...newIconTypes] });
  }
  if (reRender) {
    chrome.storage.local.set({
      [K_JA]: learnedJaText,
      [K_MAP]: learnedMap,
      [K_ICONS]: seenBookIcons,
      [K_UNKNOWN]: [...unknownBooks.values()],
    });
    if (onChange) onChange();
  }
  return { newMappings, newJa, unmappedJaBooks };
}

// --- unknown (uncatalogued) books ---
export function collectUnknownBooks(books) {
  if (!Array.isArray(books)) return;
  let changed = false;
  for (const b of books) {
    recordSeenIcon(b);
    learnJaText(null, b.status_id, b.name);
    if (matchCodexEntry(b) != null) continue;
    const key = b.status_id != null ? String(b.status_id) : b.name;
    const prev = unknownBooks.get(key);
    const mergedNum = (prev?.num || 0) + (b.num || 1);
    if (!prev || prev.num !== mergedNum) {
      unknownBooks.set(key, {
        status_id: b.status_id,
        user_status_id: b.user_status_id,
        name: b.name || 'status:' + b.status_id,
        rarity: b.rarity,
        icon_type: b.icon_type,
        num: mergedNum,
      });
      changed = true;
    }
  }
  // Prune entries that can now be matched (maps grew since collection).
  for (const [key, ub] of unknownBooks) {
    if (matchCodexEntry(ub) != null) { unknownBooks.delete(key); changed = true; }
  }
  if (changed) {
    chrome.storage.local.set({ [K_UNKNOWN]: [...unknownBooks.values()] });
  }
}

// --- loaders ---
export function loadLearnedJaText() {
  chrome.storage.local.get(K_JA, (res) => {
    const raw = res[K_JA] || {};
    learnedJaText = {};
    for (const [k, v] of Object.entries(raw)) {
      learnedJaText[k.startsWith('entry:') || k.startsWith('status:') ? k : 'entry:' + k] = v;
    }
  });
}
export function loadLearnedStatusId() {
  chrome.storage.local.get(K_MAP, (res) => {
    const raw = res[K_MAP];
    if (raw && (raw.user || raw.status)) {
      learnedMap = { user: raw.user || {}, status: raw.status || {} };
    } else if (raw) {
      learnedMap = { user: {}, status: raw };
    }
  });
}
export function loadSeenBookIcons() {
  chrome.storage.local.get(K_ICONS, (res) => {
    seenBookIcons = res[K_ICONS] || {};
  });
}
export function loadUnknownBooks() {
  chrome.storage.local.get(K_UNKNOWN, (res) => {
    unknownBooks = new Map();
    for (const b of (res[K_UNKNOWN] || [])) {
      unknownBooks.set(String(b.status_id ?? b.name), b);
    }
    collectUnknownBooks([]);
  });
}

// --- export / import ---
export function exportGuidebookData() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    jaText: learnedJaText,
    idMaps: learnedMap,
    bookIcons: seenBookIcons,
    unknownBooks: [...unknownBooks.values()],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gbf_guidebook_data_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importGuidebookData(file, onChange) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      let changed = false;
      if (data.jaText && typeof data.jaText === 'object') {
        for (const [k, v] of Object.entries(data.jaText)) {
          if (learnedJaText[k] !== v) { learnedJaText[k] = v; changed = true; }
        }
      }
      if (data.idMaps && typeof data.idMaps === 'object') {
        for (const ns of ['user', 'status']) {
          const src = data.idMaps[ns];
          if (!src || typeof src !== 'object') continue;
          for (const [k, v] of Object.entries(src)) {
            if (learnedMap[ns][k] !== v) { learnedMap[ns][k] = v; changed = true; }
          }
        }
      }
      if (Array.isArray(data.unknownBooks)) {
        for (const ub of data.unknownBooks) {
          const key = String(ub.status_id ?? ub.name);
          if (!unknownBooks.has(key)) { unknownBooks.set(key, ub); changed = true; }
        }
      }
      if (data.bookIcons && typeof data.bookIcons === 'object') {
        for (const [k, v] of Object.entries(data.bookIcons)) {
          if (seenBookIcons[k] !== v) { seenBookIcons[k] = v; changed = true; }
        }
      }
      if (changed) {
        chrome.storage.local.set({
          [K_JA]: learnedJaText,
          [K_MAP]: learnedMap,
          [K_UNKNOWN]: [...unknownBooks.values()],
          [K_ICONS]: seenBookIcons,
        });
      }
      if (onChange) onChange(changed);
    } catch (err) {
      if (onChange) onChange(false, err.message);
    }
  };
  reader.readAsText(file);
}
