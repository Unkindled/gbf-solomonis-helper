// Filter panel - node type and special incident checkboxes

import { NODE_TYPE_LABELS, NODE_TYPE_COLORS, SPECIAL_NODE_LABELS } from '../shared/constants.js';

export class FilterPanel {
  constructor(container, onChange) {
    this.container = container;
    this.onChange = onChange;
    this.activeTypes = new Set();
    this.activeSpecials = new Set();
    this.presentSpecials = new Set(); // special ids present in current run
    this.specialRows = new Map(); // id → row element
    this._build();
  }

  _build() {
    this.container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'filter-header';
    header.innerHTML = '<span>Filters</span>';
    const btnClear = document.createElement('button');
    btnClear.textContent = 'Clear All';
    btnClear.className = 'btn-small';
    btnClear.addEventListener('click', () => this.clearAll());
    header.appendChild(btnClear);
    this.container.appendChild(header);

    // Node type section
    const typeSection = document.createElement('div');
    typeSection.className = 'filter-section';
    typeSection.innerHTML = '<div class="filter-section-title">Node Type</div>';
    for (const [typeStr, label] of Object.entries(NODE_TYPE_LABELS)) {
      const type = parseInt(typeStr);
      const row = this._createCheckbox(label, NODE_TYPE_COLORS[type], () => {
        if (this.activeTypes.has(type)) this.activeTypes.delete(type);
        else this.activeTypes.add(type);
        this._emit();
      });
      typeSection.appendChild(row);
    }
    this.container.appendChild(typeSection);

    // Special incident section
    const spSection = document.createElement('div');
    spSection.className = 'filter-section';
    spSection.innerHTML = '<div class="filter-section-title">Special Event <span class="filter-present-hint">(● = in this run)</span></div>';
    this.specialRows.clear();
    for (const [idStr, label] of Object.entries(SPECIAL_NODE_LABELS)) {
      const id = parseInt(idStr);
      const row = this._createSpecialCheckbox(id, label);
      spSection.appendChild(row);
      this.specialRows.set(id, row);
    }
    this.container.appendChild(spSection);
  }

  _createCheckbox(label, color, onToggle) {
    const row = document.createElement('label');
    row.className = 'filter-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', onToggle);
    const dot = document.createElement('span');
    dot.className = 'filter-dot';
    dot.style.background = color;
    const text = document.createElement('span');
    text.textContent = label;
    row.appendChild(cb);
    row.appendChild(dot);
    row.appendChild(text);
    return row;
  }

  _createSpecialCheckbox(id, label) {
    const row = document.createElement('label');
    row.className = 'filter-row filter-row-special';
    row.dataset.present = 'false';
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
    text.textContent = label;
    row.appendChild(cb);
    row.appendChild(dot);
    row.appendChild(text);
    return row;
  }

  /**
   * Update which special events are present in the current run.
   * Present events get highlighted; absent ones are dimmed.
   */
  setPresentSpecials(presentIds) {
    this.presentSpecials = presentIds;
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
