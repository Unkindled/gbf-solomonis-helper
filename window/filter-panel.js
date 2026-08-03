// Filter panel - node type chips (topbar, horizontal) + special incident
// rows (dropdown, collapsed by default). Uses game-native icons + i18n.

import { NODE_TYPE_LABELS, SPECIAL_NODE_LABELS } from '../shared/constants.js';
import { NODE_TYPE_ICON_ASSETS } from '../shared/node-registry.js';

// Node type → icon asset file (type 0 'Path' has no icon; show base plate)
const NODE_TYPE_ICON = NODE_TYPE_ICON_ASSETS;

const ASSET_BASE = '../assets/node_icon/';
const ICON_W = 30, ICON_H = 34; // the icon IS the button (90x100 ratio)

export class FilterPanel {
  /**
   * @param {HTMLElement} chipContainer - topbar row for node-type chips
   * @param {HTMLElement} specialContainer - dropdown body for special rows
   * @param {(types:Set<number>, specials:Set<number>)=>void} onChange
   */
  constructor(chipContainer, specialContainer, onChange) {
    this.chipContainer = chipContainer;
    this.container = specialContainer;
    this.onChange = onChange;
    this.activeTypes = new Set();
    this.activeSpecials = new Set();
    this.presentSpecials = new Set();
    this.specialRows = new Map();
    this.typeChips = new Map();      // type → chip button
    this.typeCountsEls = new Map();  // type → count span
    this._buildChips();
    this._buildSpecials();
  }

  // --- Node type chips: horizontal icon toggles in the topbar ---

  _buildChips() {
    this.chipContainer.innerHTML = '';
    this.typeChips.clear();
    this.typeCountsEls.clear();
    for (const [typeStr] of Object.entries(NODE_TYPE_LABELS)) {
      const type = parseInt(typeStr);
      const chip = document.createElement('button');
      chip.className = 'type-chip';
      chip.title = I18N.t('nodeType.' + type) || NODE_TYPE_LABELS[type] || type;
      chip.setAttribute('aria-pressed', 'false');
      const icon = document.createElement('img');
      icon.className = 'chip-icon';
      icon.src = ASSET_BASE + NODE_TYPE_ICON[type];
      icon.width = ICON_W;
      icon.height = ICON_H;
      icon.alt = '';
      const count = document.createElement('span');
      count.className = 'chip-count';
      chip.appendChild(icon);
      chip.appendChild(count);
      chip.addEventListener('click', () => {
        if (this.activeTypes.has(type)) this.activeTypes.delete(type);
        else this.activeTypes.add(type);
        this._syncChip(type);
        this._emit();
      });
      this.chipContainer.appendChild(chip);
      this.typeChips.set(type, chip);
      this.typeCountsEls.set(type, count);
    }
  }

  _syncChip(type) {
    const chip = this.typeChips.get(type);
    if (!chip) return;
    const on = this.activeTypes.has(type);
    chip.classList.toggle('active', on);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  /**
   * Update per-type node counts shown in each chip, e.g. "3".
   * Pass a Map of node_type -> count.
   */
  setTypeCounts(counts) {
    for (const [type, el] of this.typeCountsEls) {
      const c = counts.get(type) || 0;
      el.textContent = c > 0 ? String(c) : '';
    }
  }

  // --- Special incident rows (dropdown, collapsed by default) ---

  _buildSpecials() {
    this.container.innerHTML = '';

    const spSection = document.createElement('details');
    spSection.className = 'filter-section';
    spSection.open = true; // one click on the topbar button = list visible
    spSection.innerHTML = `<summary class="filter-section-title">${I18N.t('filter.specialEvent')} <span class="filter-present-hint">${I18N.t('filter.presentHint')}</span></summary><div class="filter-section-body"></div>`;
    const spBody = spSection.querySelector('.filter-section-body');
    this.specialBody = spBody;
    this.specialRows.clear();
    const ids = Object.keys(SPECIAL_NODE_LABELS).map(Number);
    // Present (in this run) special events first, then the rest in order
    ids.sort((a, b) => {
      const pa = this.presentSpecials.has(a) ? 0 : 1;
      const pb = this.presentSpecials.has(b) ? 0 : 1;
      return pa - pb || a - b;
    });
    for (const id of ids) {
      const row = this._createSpecialRow(id);
      spBody.appendChild(row);
      this.specialRows.set(id, row);
    }
    this.container.appendChild(spSection);
  }

  _createSpecialRow(id) {
    const row = document.createElement('label');
    row.className = 'filter-row filter-row-special';
    row.dataset.present = 'false';
    row.dataset.sid = String(id);
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => {
      if (this.activeSpecials.has(id)) this.activeSpecials.delete(id);
      else this.activeSpecials.add(id);
      this._emit();
    });
    const dot = document.createElement('span');
    dot.className = 'filter-dot filter-dot-special';
    const text = document.createElement('span');
    text.className = 'filter-label';
    text.textContent = I18N.t('sp.' + id) || SPECIAL_NODE_LABELS[id] || `sp:${id}`;
    row.appendChild(cb);
    row.appendChild(dot);
    row.appendChild(text);
    return row;
  }

  /**
   * Update which special events are present in the current run.
   */
  setPresentSpecials(presentIds) {
    this.presentSpecials = presentIds;
    // Dynamically add rows for UNKNOWN special events seen this run
    // (ids not in the bundled labels — game added new incidents).
    for (const id of presentIds) {
      if (!this.specialRows.has(id)) {
        const row = this._createSpecialRow(id);
        this.specialBody.appendChild(row);
        this.specialRows.set(id, row);
      }
    }
    // 1) update markers first
    for (const [id, row] of this.specialRows) {
      const present = presentIds.has(id);
      row.dataset.present = present ? 'true' : 'false';
      row.classList.toggle('filter-row-present', present);
      row.classList.toggle('filter-row-absent', !present);
    }
    // 2) THEN re-sort: present events first (stable within groups)
    const body = this.specialBody;
    if (body) {
      const rows = [...body.children].sort((a, b) => {
        const pa = a.dataset.present === 'true' ? 0 : 1;
        const pb = b.dataset.present === 'true' ? 0 : 1;
        return pa - pb || Number(a.dataset.sid) - Number(b.dataset.sid);
      });
      rows.forEach(r => body.appendChild(r));
    }
  }

  clearAll() {
    this.activeTypes.clear();
    this.activeSpecials.clear();
    for (const type of this.typeChips.keys()) this._syncChip(type);
    this.container.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    this._emit();
  }

  _emit() {
    if (this.onChange) this.onChange(this.activeTypes, this.activeSpecials);
  }
}
