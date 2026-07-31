// Miasma (shrinking zone) state prediction engine
//
// Known mechanics (from HAR analysis):
// - Miasma activates around turn 9 (is_miasmic: false → true)
// - miasma_stop_countdown decreases by 1 each turn (unit = turns)
// - step increases by 5 each turn (drives spread animation only)
// - Level 1 safe zone: circle radius 670 at (center_position_x, center_position_y)
// - Level 2 safe zone: radius 67 (extreme shrink after level 1 countdown ends)
//
// Prediction model:
// - While countdown > 0: same level, same center, same radius
// - When countdown hits 0: level advances (1→2), radius shrinks
// - Level 2 assumed to persist (no HAR data beyond level 2 yet)

import { MIASMA_RADIUS } from '../shared/constants.js';

/** Estimated turn when miasma first activates (observed: turn 9) */
export const MIASMA_ACTIVATION_TURN = 9;

/** Assumed countdown for level 2+ (no HAR data yet; conservative estimate) */
const LEVEL2_COUNTDOWN = 10;

/**
 * Predict the miasma state at a future turn.
 * @param {object|null} miasmaInfo - current miasma_info ({before, after, shrink_node_ids})
 * @param {number} currentTurn - current total_turn
 * @param {number} targetTurn - the turn to predict for
 * @returns {{active:boolean, level:number, radius:number, cx:number|null, cy:number|null, countdown:number, phase:string}}
 */
export function predictMiasmaAtTurn(miasmaInfo, currentTurn, targetTurn) {
  const turnsAhead = Math.max(0, targetTurn - currentTurn);

  const after = miasmaInfo && miasmaInfo.after;

  // Not yet active
  if (!after || !after.is_miasmic) {
    const activationIn = MIASMA_ACTIVATION_TURN - currentTurn;
    if (turnsAhead < activationIn) {
      // Still safe at target turn
      return { active: false, level: 0, radius: Infinity, cx: null, cy: null, countdown: 0, phase: 'inactive' };
    }
    // Will have activated by target turn — predict as fresh level 1
    const elapsedSinceActivation = turnsAhead - Math.max(0, activationIn);
    const countdown = 20 - elapsedSinceActivation;
    if (countdown > 0) {
      return { active: true, level: 1, radius: MIASMA_RADIUS[1], cx: null, cy: null, countdown, phase: 'predicted-lv1' };
    }
    return { active: true, level: 2, radius: MIASMA_RADIUS[2], cx: null, cy: null, countdown: LEVEL2_COUNTDOWN + countdown, phase: 'predicted-lv2' };
  }

  // Currently active
  const cx = after.center_position_x;
  const cy = after.center_position_y;
  const level = after.level || 1;
  const countdown = after.miasma_stop_countdown || 0;

  const remaining = countdown - turnsAhead;

  if (level === 1) {
    if (remaining > 0) {
      return { active: true, level: 1, radius: MIASMA_RADIUS[1], cx, cy, countdown: remaining, phase: 'lv1' };
    }
    // Level 1 countdown expired → level 2
    const lv2Remaining = LEVEL2_COUNTDOWN + remaining;
    if (lv2Remaining > 0) {
      return { active: true, level: 2, radius: MIASMA_RADIUS[2], cx, cy, countdown: lv2Remaining, phase: 'lv2' };
    }
    // Level 2 countdown also expired → assume miasma fully covers map
    return { active: true, level: 3, radius: 0, cx, cy, countdown: 0, phase: 'total' };
  }

  // Already level 2+
  if (remaining > 0) {
    return { active: true, level, radius: MIASMA_RADIUS[level] || MIASMA_RADIUS[2], cx, cy, countdown: remaining, phase: 'lv2' };
  }
  return { active: true, level: level + 1, radius: 0, cx, cy, countdown: 0, phase: 'total' };
}

/**
 * Check if a node is outside the safe zone for a given predicted state.
 */
export function isNodeInDanger(node, predicted) {
  if (!predicted.active || predicted.radius === Infinity) return false;
  if (predicted.cx == null || predicted.cy == null) return false;
  if (predicted.radius <= 0) return true; // total coverage
  const dx = node.position_x - predicted.cx;
  const dy = node.position_y - predicted.cy;
  return Math.sqrt(dx * dx + dy * dy) > predicted.radius;
}

/**
 * Annotate a path with per-step miasma danger.
 * @param {number[]} path - node_id array (index 0 = current position)
 * @param {Map<number,object>} nodeMap
 * @param {object|null} miasmaInfo
 * @param {number} currentTurn
 * @returns {{dangerSteps: Array<{step:number, nodeId:number, phase:string, level:number}>, firstDangerStep:number|null, predictions: Map<number,object>}}
 */
export function annotatePathWithMiasma(path, nodeMap, miasmaInfo, currentTurn) {
  const dangerSteps = [];
  const predictions = new Map(); // step → predicted state (only for steps where state changes)

  let lastPhase = null;

  for (let i = 0; i < path.length; i++) {
    const node = nodeMap.get(path[i]);
    if (!node) continue;

    const predicted = predictMiasmaAtTurn(miasmaInfo, currentTurn, currentTurn + i);

    // Record phase transitions for circle preview rendering
    if (predicted.phase !== lastPhase) {
      predictions.set(i, predicted);
      lastPhase = predicted.phase;
    }

    if (isNodeInDanger(node, predicted)) {
      dangerSteps.push({ step: i, nodeId: path[i], phase: predicted.phase, level: predicted.level });
    }
  }

  return {
    dangerSteps,
    firstDangerStep: dangerSteps.length > 0 ? dangerSteps[0].step : null,
    predictions,
  };
}
