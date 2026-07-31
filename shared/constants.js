// GBF Evoking Solomonis - Game constants extracted from client source

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

export const NODE_TYPE_LABELS = {
  0: 'Path',
  1: 'Boss',
  2: 'Battle',
  3: 'Strong Foe',
  4: 'Ruler',
  5: 'Event',
  6: 'Treasure',
  7: 'Healing',
  8: 'Shop',
  9: 'Teleporter',
  10: 'Special',
  11: 'Terrifying Foe',
};

export const NODE_TYPE_COLORS = {
  0: '#9e9e9e',
  1: '#ff1744',
  2: '#ef5350',
  3: '#c62828',
  4: '#ab47bc',
  5: '#42a5f5',
  6: '#ffd54f',
  7: '#66bb6a',
  8: '#ffa726',
  9: '#26c6da',
  10: '#ec407a',
  11: '#8e0000',
};

export const DUNGEON_SPECIAL_NODE_TYPE = {
  GURU: 1,
  FANATIC_1: 2,
  FANATIC_2: 3,
  FLOATING_CASTLE: 4,
  FLOATING_CASTLE_TELEPORT_1: 5,
  FLOATING_CASTLE_TELEPORT_2: 6,
  FLOATING_CASTLE_TELEPORT_3: 7,
  FLOATING_CASTLE_RESEARCHER: 8,
  CLOCK_TOWER: 9,
  FLOWER_GARDEN: 10,
  PRISON: 11,
  HOT_SPRING: 12,
  BLACKSMITH_TABLE: 13,
  FORT: 14,
  CATHEDRAL: 15,
  CAVE: 16,
  STONE_FACE: 17,
  VILLAGE: 18,
};

export const SPECIAL_NODE_LABELS = {
  1: 'Cult Founder',
  2: 'Cultist I',
  3: 'Cultist II',
  4: 'Floating Castle',
  5: 'FC Portal I',
  6: 'FC Portal II',
  7: 'FC Portal III',
  8: 'FC Researcher',
  9: 'Clock Tower',
  10: 'Flower Garden',
  11: 'Prison',
  12: 'Hot Spring',
  13: 'Blacksmith',
  14: 'Fort',
  15: 'Cathedral',
  16: 'Cave',
  17: 'Stone Face',
  18: 'Village',
};

export const DUNGEON_STATUS = {
  BEFORE_START: 1,
  NODE_WAIT_MOVE: 2,
  NODE_WAIT_ACTION: 3,
  NODE_PROGRESS_ACTION: 4,
  FINISH_EXPLORE: 5,
  FINISHED: 6,
  NODE_BEFORE_ACTION: 7,
  NODE_AFTER_ACTION: 8,
};

export const DUNGEON_STATUS_LABELS = {
  1: 'Not Started',
  2: 'Waiting to Move',
  3: 'Waiting for Action',
  4: 'Action in Progress',
  5: 'Explore Finished',
  6: 'Finished',
  7: 'Before Action',
  8: 'After Action',
};

// Miasma (shrinking zone) constants
export const MIASMA_RADIUS = {
  1: 670,  // Level 1 safe zone radius in logical coordinates
  2: 67,   // Level 2 safe zone radius
};

export const MIASMA_NOTICE_TYPE = {
  START: 1,
  RESUME: 2,
  END: 3,
  BOSS_APPEAR: 4,
};
