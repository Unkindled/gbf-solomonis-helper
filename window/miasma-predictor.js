// Miasma (shrinking zone) state prediction engine
//
// Mechanics (from HAR + user feedback):
// - Miasma activates around turn 9 (is_miasmic: false → true)
// - miasma_stop_countdown decreases by 1 each turn (unit = turns), starts at 20
// - The miasma boundary gradually closes in from map edges toward the safe circle
// - Current miasma inner radius interpolates: at countdown=20 it's at max extent,
//   at countdown=0 it reaches the level's safe circle radius
// - When countdown hits 0: level advances (1→2), radius shrinks (670→67)
//
// Real-time miasma boundary formula:
//   innerRadius = safeRadius + (maxRadius - safeRadius) * (countdown / totalCountdown)
//   A node is in miasma if distance(node, center) > innerRadius

import { MIASMA_RADIUS } from '../shared/constants.js';

/** Estimated turn when miasma first activates (observed: turn 9) */
export const MIASMA_ACTIVATION_TURN = 9;

/** Total countdown for level 1 (observed: 20) */
const LEVEL1_TOTAL_COUNTDOWN = 20;

/** Assumed countdown for level 2 (no HAR data; conservative) */
const LEVEL2_TOTAL_COUNTDOWN = 10;

/** Max miasma radius at activation start (covers entire map ~2680x1830) */
const MAX_MIASMA_RADIUS = 1600;

/**
 * Calculate the current miasma inner boundary radius.
 * Level 1: closes from MAX_MIASMA_RADIUS (1600) → safe radius (670) over countdown
 * Level 2: closes from Lv1 safe radius (670) → Lv2 safe radius (67) over countdown
 * The boundary is continuous across levels.
 */
export function getMiasmaInnerRadius(level, countdown) {
  const safeRadius = MIASMA_RADIUS[level] || MIASMA_RADIUS[1];
  const totalCountdown = level === 1 ? LEVEL1_TOTAL_COUNTDOWN : LEVEL2_TOTAL_COUNTDOWN;
  const progress = Math.max(0, Math.min(1, countdown / totalCountdown));
  // Start radius: where this level's miasma begins closing from
  const startRadius = level === 1 ? MAX_MIASMA_RADIUS : MIASMA_RADIUS[1]; // Lv2 starts at Lv1 safe circle
  return safeRadius + (startRadius - safeRadius) * progress;
}

/**
 * Get the current real-time miasma state for rendering.
 * @param {object|null} miasmaInfo
 * @returns {{active:boolean, level:number, cx:number|null, cy:number|null, countdown:number, innerRadius:number, safeRadius:number}}
 */
export function getCurrentMiasmaState(miasmaInfo) {
  const after = miasmaInfo && miasmaInfo.after;
  if (!after || !after.is_miasmic) {
    return { active: false, level: 0, cx: null, cy: null, countdown: 0, innerRadius: Infinity, safeRadius: Infinity };
  }
  const level = after.level || 1;
  const countdown = after.miasma_stop_countdown || 0;
  const safeRadius = MIASMA_RADIUS[level] || MIASMA_RADIUS[1];
  const innerRadius = getMiasmaInnerRadius(level, countdown);
  return {
    active: true,
    level,
    cx: after.center_position_x,
    cy: after.center_position_y,
    countdown,
    innerRadius,
    safeRadius,
  };
}

/**
 * Predict the miasma state at a future turn.
 * @param {object|null} miasmaInfo - current miasma_info
 * @param {number} currentTurn - current total_turn
 * @param {number} targetTurn - the turn to predict for
 * @returns {{active:boolean, level:number, innerRadius:number, safeRadius:number, cx:number|null, cy:number|null, countdown:number, phase:string}}
 */
export function predictMiasmaAtTurn(miasmaInfo, currentTurn, targetTurn) {
  const turnsAhead = Math.max(0, targetTurn - currentTurn);
  const after = miasmaInfo && miasmaInfo.after;

  // Not yet active
  if (!after || !after.is_miasmic) {
    const activationIn = Math.max(0, MIASMA_ACTIVATION_TURN - currentTurn);
    if (turnsAhead < activationIn) {
      return { active: false, level: 0, innerRadius: Infinity, safeRadius: Infinity, cx: null, cy: null, countdown: 0, phase: 'inactive' };
    }
    // Predicted activation
    const elapsedSince = turnsAhead - activationIn;
    const countdown = LEVEL1_TOTAL_COUNTDOWN - elapsedSince;
    if (countdown > 0) {
      return { active: true, level: 1, innerRadius: getMiasmaInnerRadius(1, countdown), safeRadius: MIASMA_RADIUS[1], cx: null, cy: null, countdown, phase: 'predicted-lv1' };
    }
    const lv2Countdown = LEVEL2_TOTAL_COUNTDOWN + countdown;
    if (lv2Countdown > 0) {
      return { active: true, level: 2, innerRadius: getMiasmaInnerRadius(2, lv2Countdown), safeRadius: MIASMA_RADIUS[2], cx: null, cy: null, countdown: lv2Countdown, phase: 'predicted-lv2' };
    }
    return { active: true, level: 3, innerRadius: 0, safeRadius: 0, cx: null, cy: null, countdown: 0, phase: 'total' };
  }

  // Currently active
  const cx = after.center_position_x;
  const cy = after.center_position_y;
  const level = after.level || 1;
  const countdown = after.miasma_stop_countdown || 0;
  const totalCountdown = level === 1 ? LEVEL1_TOTAL_COUNTDOWN : LEVEL2_TOTAL_COUNTDOWN;

  const remaining = countdown - turnsAhead;

  if (level === 1) {
    if (remaining > 0) {
      return { active: true, level: 1, innerRadius: getMiasmaInnerRadius(1, remaining), safeRadius: MIASMA_RADIUS[1], cx, cy, countdown: remaining, phase: 'lv1' };
    }
    // Level 1 expired → level 2
    const lv2Remaining = LEVEL2_TOTAL_COUNTDOWN + remaining;
    if (lv2Remaining > 0) {
      return { active: true, level: 2, innerRadius: getMiasmaInnerRadius(2, lv2Remaining), safeRadius: MIASMA_RADIUS[2], cx, cy, countdown: lv2Remaining, phase: 'lv2' };
    }
    return { active: true, level: 3, innerRadius: 0, safeRadius: 0, cx, cy, countdown: 0, phase: 'total' };
  }

  // Already level 2+
  if (remaining > 0) {
    return { active: true, level, innerRadius: getMiasmaInnerRadius(level, remaining), safeRadius: MIASMA_RADIUS[level] || MIASMA_RADIUS[2], cx, cy, countdown: remaining, phase: 'lv2' };
  }
  return { active: true, level: level + 1, innerRadius: 0, safeRadius: 0, cx, cy, countdown: 0, phase: 'total' };
}

/**
 * Check if a node is in miasma for a given predicted state.
 */
export function isNodeInDanger(node, predicted) {
  if (!predicted.active || predicted.innerRadius === Infinity) return false;
  if (predicted.cx == null || predicted.cy == null) return false;
  if (predicted.innerRadius <= 0) return true;
  const dx = node.position_x - predicted.cx;
  const dy = node.position_y - predicted.cy;
  return Math.sqrt(dx * dx + dy * dy) > predicted.innerRadius;
}

/**
 * Annotate a path with per-step miasma danger.
 * @param {number[]} path - node_id array (index 0 = start)
 * @param {Map<number,object>} nodeMap
 * @param {object|null} miasmaInfo
 * @param {number} currentTurn
 * @param {number} startStepOffset - turn offset for path[0] (0 if starting now)
 * @returns {{dangerSteps: Array<{step:number, nodeId:number, phase:string, level:number}>, firstDangerStep:number|null, predictions: Map<number,object>}}
 */
export function annotatePathWithMiasma(path, nodeMap, miasmaInfo, currentTurn, startStepOffset = 0) {
  const dangerSteps = [];
  const predictions = new Map();
  let lastPhase = null;

  for (let i = 0; i < path.length; i++) {
    const node = nodeMap.get(path[i]);
    if (!node) continue;

    const turnAtStep = currentTurn + startStepOffset + i;
    const predicted = predictMiasmaAtTurn(miasmaInfo, currentTurn, turnAtStep);

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
