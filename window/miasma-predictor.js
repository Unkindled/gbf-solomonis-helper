// Miasma (shrinking zone) state engine
//
// Mechanics (confirmed from game client map.js + parser.js + HAR):
// - The miasma boundary is a FIXED circle per level (Lv1 r=670, Lv2 r=67).
//   The circle does NOT gradually shrink; it is drawn at the safe-zone radius.
// - "Shrinking" happens by the server flagging more nodes via shrink_node_ids
//   each turn (incremental). The client accumulates these (never clears until
//   miasma ends). A node is "in miasma" iff its is_shrinking flag is true.
// - miasma_stop_countdown decreases by 1 per turn; at 0 the level advances
//   (Lv1 → Lv2), jumping the fixed radius from 670 to 67.
// - For PREDICTION (future turns, where we have no is_shrinking data) we use
//   geometry against the fixed radius of the predicted level.

import { MIASMA_RADIUS } from '../shared/constants.js';

/** Estimated turn when miasma first activates (observed: turn 9) */
export const MIASMA_ACTIVATION_TURN = 9;

/** Total countdown for level 1 (observed: 20) */
const LEVEL1_TOTAL_COUNTDOWN = 20;

/** Assumed countdown for level 2 (no HAR data; conservative) */
const LEVEL2_TOTAL_COUNTDOWN = 10;

/** Fixed radius for a given level (the circle the game actually draws). */
export function radiusForLevel(level) {
  return MIASMA_RADIUS[level] || MIASMA_RADIUS[1];
}

/**
 * Current miasma state for rendering the fixed safe-zone circle.
 */
export function getCurrentMiasmaState(miasmaInfo) {
  const after = miasmaInfo && miasmaInfo.after;
  if (!after || !after.is_miasmic) {
    return { active: false, level: 0, cx: null, cy: null, countdown: 0, radius: Infinity };
  }
  const level = after.level || 1;
  return {
    active: true,
    level,
    cx: after.center_position_x,
    cy: after.center_position_y,
    countdown: after.miasma_stop_countdown || 0,
    radius: radiusForLevel(level),
  };
}

/**
 * Predict the miasma state at a future turn (geometry-based, fixed radius).
 */
export function predictMiasmaAtTurn(miasmaInfo, currentTurn, targetTurn) {
  const turnsAhead = Math.max(0, targetTurn - currentTurn);
  const after = miasmaInfo && miasmaInfo.after;

  if (!after || !after.is_miasmic) {
    const activationIn = Math.max(0, MIASMA_ACTIVATION_TURN - currentTurn);
    if (turnsAhead < activationIn) {
      return { active: false, level: 0, radius: Infinity, cx: null, cy: null, countdown: 0, phase: 'inactive' };
    }
    const elapsedSince = turnsAhead - activationIn;
    const countdown = LEVEL1_TOTAL_COUNTDOWN - elapsedSince;
    if (countdown > 0) {
      return { active: true, level: 1, radius: radiusForLevel(1), cx: null, cy: null, countdown, phase: 'predicted-lv1' };
    }
    const lv2 = LEVEL2_TOTAL_COUNTDOWN + countdown;
    if (lv2 > 0) {
      return { active: true, level: 2, radius: radiusForLevel(2), cx: null, cy: null, countdown: lv2, phase: 'predicted-lv2' };
    }
    return { active: true, level: 3, radius: 0, cx: null, cy: null, countdown: 0, phase: 'total' };
  }

  const cx = after.center_position_x;
  const cy = after.center_position_y;
  const level = after.level || 1;
  const countdown = after.miasma_stop_countdown || 0;
  const remaining = countdown - turnsAhead;

  if (level === 1) {
    if (remaining > 0) {
      return { active: true, level: 1, radius: radiusForLevel(1), cx, cy, countdown: remaining, phase: 'lv1' };
    }
    const lv2 = LEVEL2_TOTAL_COUNTDOWN + remaining;
    if (lv2 > 0) {
      return { active: true, level: 2, radius: radiusForLevel(2), cx, cy, countdown: lv2, phase: 'lv2' };
    }
    return { active: true, level: 3, radius: 0, cx, cy, countdown: 0, phase: 'total' };
  }

  if (remaining > 0) {
    return { active: true, level, radius: radiusForLevel(level), cx, cy, countdown: remaining, phase: 'lv2' };
  }
  return { active: true, level: level + 1, radius: 0, cx, cy, countdown: 0, phase: 'total' };
}

/** Is a node outside the predicted safe circle? */
export function isNodeInDanger(node, predicted) {
  if (!predicted.active || predicted.radius === Infinity) return false;
  if (predicted.cx == null || predicted.cy == null) return false;
  if (predicted.radius <= 0) return true;
  const dx = node.position_x - predicted.cx;
  const dy = node.position_y - predicted.cy;
  return Math.sqrt(dx * dx + dy * dy) > predicted.radius;
}

/**
 * Annotate a path with per-step miasma danger (geometry-based prediction).
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
