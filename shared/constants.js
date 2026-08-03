// GBF Evoking Solomonis - Game constants extracted from client source
//
// Node-type data (enum / labels / colors / icons) now lives in the
// single source of truth: shared/node-registry.js. Re-exported here for
// backward compatibility.

export { DUNGEON_NODE_TYPE, NODE_TYPE_LABELS, NODE_TYPE_COLORS } from './node-registry.js';
export {
  DUNGEON_SPECIAL_NODE_TYPE,
  SPECIAL_INCIDENT_LABELS as SPECIAL_NODE_LABELS,
} from './node-registry.js';

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
