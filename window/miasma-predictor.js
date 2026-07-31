// Miasma prediction engine — data-driven model
//
// Key finding: miasma does NOT shrink as a simple circle.
// It spreads along predefined paths determined by (base_pattern_id, pattern_id).
// The server tells us which nodes are consumed at each step via shrink_node_ids.
//
// Model:
// - Track cumulative consumed nodes from shrink_node_ids in each response
// - For rendering: consumed nodes are "in miasma"
// - For prediction: extrapolate based on observed consumption rate
//   (nodes per step), applied to remaining path nodes ordered by their
//   typical consumption position in the pattern

import { MIASMA_RADIUS } from '../shared/constants.js';

/** Estimated turn when miasma first activates (observed: turn 9) */
export const MIASMA_ACTIVATION_TURN = 9;

/**
 * Miasma tracker — accumulates consumed nodes over time.
 * One instance per dungeon run.
 */
export class MiasmaTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.level = 0;
    this.step = 0;
    this.countdown = 0;
    this.cx = null;
    this.cy = null;
    this.centerNodeId = null;
    this.patternId = null;
    this.basePatternId = null;
    // Cumulative set of consumed node IDs
    this.consumedNodes = new Set();
    // History: step → [node_ids] consumed at that step
    this.history = [];
    // Activation step (first step where is_miasmic became true)
    this.activationStep = null;
  }

  /**
   * Feed a miasma_info response into the tracker.
   * @param {object} miasmaInfo - {before, after, shrink_node_ids}
   */
  update(miasmaInfo) {
    if (!miasmaInfo) return;
    const after = miasmaInfo.after;
    if (!after) return;

    const wasActive = this.active;
    this.active = after.is_miasmic;
    this.level = after.level || 0;
    this.step = after.step || 0;
    this.countdown = after.miasma_stop_countdown || 0;
    this.cx = after.center_position_x;
    this.cy = after.center_position_y;
    this.centerNodeId = after.center_node_id;
    this.patternId = after.pattern_id;
    this.basePatternId = after.base_pattern_id;

    if (!wasActive && this.active) {
      this.activationStep = this.step;
    }

    // Accumulate consumed nodes
    const ids = miasmaInfo.shrink_node_ids || [];
    if (ids.length > 0) {
      this.history.push({ step: this.step, ids: ids.map(Number) });
      for (const id of ids) {
        this.consumedNodes.add(Number(id));
      }
    }
  }

  /**
   * Is a specific node currently in miasma?
   */
  isNodeConsumed(nodeId) {
    return this.consumedNodes.has(Number(nodeId));
  }

  /**
   * Get average consumption rate (nodes per step) from history.
   */
  getConsumptionRate() {
    if (this.history.length === 0) return 0;
    const totalNodes = this.history.reduce((sum, h) => sum + h.ids.length, 0);
    const stepSpan = this.history[this.history.length - 1].step - this.history[0].step;
    if (stepSpan <= 0) return totalNodes; // all in one step
    return totalNodes / stepSpan;
  }

  /**
   * Predict which additional nodes will be consumed after N more steps.
   * Uses observed rate to estimate how many more nodes will be consumed,
   * then picks the closest unconsumed nodes to the miasma center.
   *
   * @param {number} stepsAhead - how many steps into the future
   * @param {Map<number,object>} nodeMap - all nodes
   * @returns {Set<number>} - predicted consumed node IDs (cumulative, including already consumed)
   */
  predictConsumedAt(stepsAhead, nodeMap) {
    const predicted = new Set(this.consumedNodes);

    if (!this.active || this.cx == null || this.cy == null) return predicted;

    const rate = this.getConsumptionRate();
    if (rate <= 0) return predicted;

    // How many more nodes will be consumed
    const additionalCount = Math.ceil(rate * stepsAhead);

    // Find unconsumed nodes sorted by distance from center (closest consumed last,
    // so farthest unconsumed get consumed first — miasma closes in)
    const unconsumed = [];
    for (const [id, node] of nodeMap) {
      if (this.consumedNodes.has(id)) continue;
      const dx = node.position_x - this.cx;
      const dy = node.position_y - this.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      unconsumed.push({ id, dist });
    }
    // Sort farthest first (they get consumed next as miasma closes in)
    unconsumed.sort((a, b) => b.dist - a.dist);

    for (let i = 0; i < Math.min(additionalCount, unconsumed.length); i++) {
      predicted.add(unconsumed[i].id);
    }

    return predicted;
  }

  /**
   * Get a safe-radius estimate for rendering the miasma boundary circle.
   * Based on the distance of the closest consumed node to center.
   * (The miasma boundary is roughly at the innermost consumed ring.)
   */
  getEstimatedBoundaryRadius(nodeMap) {
    if (!this.active || this.cx == null || this.cy == null) return Infinity;
    if (this.consumedNodes.size === 0) return 1600; // initial: whole map

    // Find the minimum distance among consumed nodes → that's roughly the inner edge
    let minDist = Infinity;
    for (const id of this.consumedNodes) {
      const node = nodeMap.get(id);
      if (!node) continue;
      const dx = node.position_x - this.cx;
      const dy = node.position_y - this.cy;
      minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
    }

    // The boundary is slightly inside the closest consumed node
    return Math.max(0, minDist - 30);
  }
}

/**
 * Annotate a path with per-step miasma danger using the tracker.
 * @param {number[]} path - node_id array
 * @param {Map<number,object>} nodeMap
 * @param {MiasmaTracker} tracker
 * @returns {{dangerSteps: Array<{step:number, nodeId:number, alreadyConsumed:boolean}>, firstDangerStep:number|null}}
 */
export function annotatePathWithMiasma(path, nodeMap, tracker) {
  const dangerSteps = [];

  if (!tracker.active) {
    return { dangerSteps: [], firstDangerStep: null };
  }

  const rate = tracker.getConsumptionRate();

  for (let i = 0; i < path.length; i++) {
    const nodeId = path[i];

    // Already consumed?
    if (tracker.isNodeConsumed(nodeId)) {
      dangerSteps.push({ step: i, nodeId, alreadyConsumed: true });
      continue;
    }

    // Predict: will this node be consumed by the time player reaches step i?
    if (rate > 0 && tracker.cx != null) {
      const predicted = tracker.predictConsumedAt(i, nodeMap);
      if (predicted.has(nodeId)) {
        dangerSteps.push({ step: i, nodeId, alreadyConsumed: false });
      }
    }
  }

  return {
    dangerSteps,
    firstDangerStep: dangerSteps.length > 0 ? dangerSteps[0].step : null,
  };
}
