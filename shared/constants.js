// GBF Evoking Solomonis - Game constants extracted from client source
//
// Node-type data (enum / labels / colors / icons) now lives in the
// single source of truth: shared/node-registry.js. Re-exported here for
// backward compatibility.

export { DUNGEON_NODE_TYPE, NODE_TYPE_LABELS, NODE_TYPE_COLORS } from './node-registry.js';

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
