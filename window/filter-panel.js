// Filter panel - node type and special incident checkboxes
// Uses game-native icons (scaled) + i18n labels.

import { NODE_TYPE_LABELS, NODE_TYPE_COLORS, SPECIAL_NODE_LABELS } from '../shared/constants.js';

// Node type → icon asset file (type 0 'Path' has no icon; show base plate)
const NODE_TYPE_ICON = {
  0: 'base.png',
  1: '1.png',
  2: '2.png',
  3: '3.png',
  4: '4.png',
  5: '5.png',
  6: '6.png',
  7: '7.png',
  8: '8.png',
  9: '9.png',
  10: '10_incident.png',
  11: '11.png',
};

const ASSET_BASE = '../assets/node_icon/';
const ICON_W = 20, ICON_H = 22; // scaled display size (90x100 → 20x22)

export class FilterPanel {
  constructor(container, onChange) {
    this.container = container;
    this.onChange = onChange;
    this.activeTypes = new Set();
    this.activeSpecials = new Set();
    this.presentSpecials = new Set();
    this.specialRows = new Map();
    this.typeCountsEls = new Map();
    this._build();
  }

  _build() {
    this.container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'filter-header';
    header.innerHTML = `<span>${I18N.t('filter.title')}</span>`;
    const btnClear = document.createElement('button');
    btnClear.textContent = I18N.t('filter.clearAll');
    btnClear.className = 'btn-small';
    btnClear.addEventListener('click', () => this.clearAll());
    header.appendChild(btnClear);
    this.container.appendChild(header);

    // Node type section (collapsible)
    const typeSection = document.createElement('details');
    typeSection.className = 'filter-section';
    typeSection.open = true; // default expanded
    typeSection.innerHTML = `<summary class="filter-section-title">${I18N.t('filter.nodeType')}</summary><div class="filter-section-body"></div>`;
    const typeBody = typeSection.querySelector('.filter-section-body');
    for (const [typeStr] of Object.entries(NODE_TYPE_LABELS)) {
      const type = parseInt(typeStr);
      const row = this._createTypeRow(type);
      typeBody.appendChild(row);
    }
    this.container.appendChild(typeSection);

    // Special incident section (collapsible)
    const spSection = document.createElement('details');
    spSection.className = 'filter-section';
    spSection.open = true; // expanded by default; present events sort first
    spSection.innerHTML = `<summary class="filter-section-title">${I18N.t('filter.specialEvent')} <span class="filter-present-hint">${I18N.t('filter.presentHint')}</span></summary><div class="filter-section-body"></div>`;
    const spBody = spSection.querySelector('.filter-section-body');
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

  _createTypeRow(type) {
    const row = document.createElement('label');
    row.className = 'filter-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => {
      if (this.activeTypes.has(type)) this.activeTypes.delete(type);
      else this.activeTypes.add(type);
      this._emit();
    });
    const icon = document.createElement('img');
    icon.className = 'filter-icon';
    icon.src = ASSET_BASE + NODE_TYPE_ICON[type];
    icon.width = ICON_W;
    icon.height = ICON_H;
    const text = document.createElement('span');
    text.className = 'filter-label';
    text.textContent = I18N.t('nodeType.' + type) || NODE_TYPE_LABELS[type] || type;
    const count = document.createElement('span');
    count.className = 'filter-count';
    count.textContent = '0';
    row.appendChild(cb);
    row.appendChild(icon);
    row.appendChild(text);
    row.appendChild(count);
    this.typeCountsEls.set(type, count);
    return row;
  }

  /**
   * Update per-type node counts shown next to each type label,
   * e.g. "Ruler (3)". Pass a Map of node_type -> count.
   */
  setTypeCounts(counts) {
    for (const [type, el] of this.typeCountsEls) {
      const c = counts.get(type) || 0;
      el.textContent = c > 0 ? `(${c})` : '';
    }
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
    // Re-sort rows: present events first (stable within groups)
    const body = this.container.querySelector('.filter-section-body:last-of-type');
    if (body) {
      const rows = [...body.children].sort((a, b) => {
        const pa = a.dataset.present === 'true' ? 0 : 1;
        const pb = b.dataset.present === 'true' ? 0 : 1;
        return pa - pb || Number(a.dataset.sid) - Number(b.dataset.sid);
      });
      rows.forEach(r => body.appendChild(r));
    }
    for (const [id, row] of this.specialRows) {
      const present = presentIds.has(id);
      row.dataset.present = present ? 'true' : 'false';
      row.classList.toggle('filter-row-present', present);
      row.classList.toggle('filter-row-absent', !present);
    }
  }

  clearAll() {
    this.activeTypes.clear();
    this.activeSpecials.clear();
    this.container.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    this._emit();
  }

  _emit() {
    if (this.onChange) this.onChange(this.activeTypes, this.activeSpecials);
  }
}
