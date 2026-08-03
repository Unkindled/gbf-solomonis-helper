// Node type registry — single source of truth for how every node type
// renders. Adding a new game node_type = one entry here + the icon asset
// file + i18n keys (nodeType.NN in shared/i18n.js).
//
// Previously this data lived in FOUR places (constants.js enum/labels/
// colors, filter-panel NODE_TYPE_ICON, map-renderer _loadAssets +
// tooltip typeNames) that could drift. Everything below derives from
// this registry.

// --- enum (game-facing ids) ---
export const DUNGEON_NODE_TYPE = {
  NONE: 0,
  ENCOUNTER_BOSS: 1,
  ENCOUNTER_NORMAL: 2,
  ENCOUNTER_HARD: 3,
  ENCOUNTER_GUARDIAN: 4,
  INCIDENT: 5,
  TREASURE_CHEST: 6,
  RECOVERY_HP: 7,
  SHOP: 8,
  TELEPORT: 9,
  SPECIAL: 10,
  ENCOUNTER_VERY_HARD: 11,
};

// --- per-type metadata ---
// iconAsset: file under assets/node_icon/ used for the node body.
// (Special type 10 may override with a special-incident icon instead.)
const NODE_TYPE_META = {
  0:  { label: 'Path',            color: '#9e9e9e', iconAsset: 'base.png' },
  1:  { label: 'Boss',            color: '#ff1744', iconAsset: '1.png' },
  2:  { label: 'Battle',          color: '#ef5350', iconAsset: '2.png' },
  3:  { label: 'Strong Foe',      color: '#c62828', iconAsset: '3.png' },
  4:  { label: 'Ruler',           color: '#ab47bc', iconAsset: '4.png' },
  5:  { label: 'Event',           color: '#42a5f5', iconAsset: '5.png' },
  6:  { label: 'Treasure',        color: '#ffd54f', iconAsset: '6.png' },
  7:  { label: 'Healing',         color: '#66bb6a', iconAsset: '7.png' },
  8:  { label: 'Shop',            color: '#ffa726', iconAsset: '8.png' },
  9:  { label: 'Teleporter',      color: '#26c6da', iconAsset: '9.png' },
  10: { label: 'Special',         color: '#ec407a', iconAsset: '10_incident.png' },
  11: { label: 'Terrifying Foe',  color: '#8e0000', iconAsset: '11.png' },
};

export const NODE_TYPE_LABELS = {};
export const NODE_TYPE_COLORS = {};
export const NODE_TYPE_ICON_ASSETS = {};
for (const [id, meta] of Object.entries(NODE_TYPE_META)) {
  NODE_TYPE_LABELS[Number(id)] = meta.label;
  NODE_TYPE_COLORS[Number(id)] = meta.color;
  NODE_TYPE_ICON_ASSETS[Number(id)] = meta.iconAsset;
}

// --- special-incident (node_type 10) icons ---
// special_incident_id → icon asset file (under assets/node_icon/).
export const SPECIAL_INCIDENT_ICONS = {
  1: '10_guru.png',       // Cult Founder
  2: '10_fanatic.png',    // Cultist I
  3: '10_fanatic.png',    // Cultist II
  4: '10_teleport.png',   // Floating Castle
  5: '10_teleport.png',   // FC Portal I
  6: '10_teleport.png',   // FC Portal II
  7: '10_teleport.png',   // FC Portal III
  8: '10_research.png',   // FC Researcher
};

/** Default icon asset for a node, or null. */
export function nodeIconAsset(node) {
  if (node.node_type === 10 && node.special_incident_id != null) {
    const sp = SPECIAL_INCIDENT_ICONS[node.special_incident_id];
    if (sp) return sp;
  }
  const meta = NODE_TYPE_META[node.node_type];
  return meta ? meta.iconAsset : null;
}
