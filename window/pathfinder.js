// Pathfinding on the dungeon node graph.
//
// Path scoring rule: among all SHORTEST paths to a target, prefer the one
// that passes through the most non-Path (node_type !== 0) nodes. That way a
// route visits encounters/treasures/etc. along the way instead of hugging
// empty corridors.
//
// Navigation helpers (compass menu) reuse the same weighted BFS:
//   - findBattleRoute: within a step cap, the route touching the most
//     battle nodes
//   - findNearestShop: shortest path to the closest shop
//   - findSafeZoneRoute: shortest path into the current safe zone

// Battle types for the battle-route navigation: Normal / Hard / Very Hard
// encounters. Boss (1) is deliberately excluded per requirement.
const BATTLE_TYPES = new Set([2, 3, 11]);

function isNonPath(node) {
  return node && node.node_type !== 0;
}

function isBattle(node) {
  return node && BATTLE_TYPES.has(node.node_type);
}

/**
 * Weighted BFS: path to a target set. Two selection modes:
 *   default (priority 'dist'): shortest path wins, ties broken by higher
 *     score (non-path bonus).
 *   priority 'score': the target with the highest score wins (e.g. most
 *     battle nodes), ties broken by shorter distance. Paths stop at the
 *     best target — no extra steps are walked beyond it.
 *
 * @param {Map<number,object>} nodeMap
 * @param {number} startId
 * @param {(node:object)=>boolean} isTarget
 * @param {object} [opts]
 *   @param {(node:object)=>boolean} [opts.score] - extra bonus per node
 *   @param {number} [opts.maxLen] - hard cap on path length (edges)
 *   @param {'dist'|'score'} [opts.priority]
 * @returns {{path:number[], score:number}|null}
 */
function searchBest(nodeMap, startId, isTarget, opts = {}) {
  if (!nodeMap.has(startId)) return null;
  const maxLen = opts.maxLen != null ? opts.maxLen : Infinity;
  const priorityScore = opts.priority === 'score';

  const bestDist = new Map([[startId, 0]]);
  const bestScore = new Map([[startId, 0]]);
  const parent = new Map();
  const queue = [startId];

  let best = null; // {nodeId, dist, score}

  while (queue.length > 0) {
    const cur = queue.shift();
    const dist = bestDist.get(cur);
    if (dist >= maxLen) continue; // cannot extend beyond the cap

    const node = nodeMap.get(cur);
    if (!node) continue;
    for (const nextId of (node.adjacent_node_ids || [])) {
      if (!nodeMap.has(nextId)) continue;
      const nextNode = nodeMap.get(nextId);
      const nd = dist + 1;
      // Score: base bonus for non-path nodes, plus any custom bonus.
      let ns = bestScore.get(cur) + (isNonPath(nextNode) ? 1 : 0);
      if (opts.score) ns += opts.score(nextNode) || 0;

      const knownD = bestDist.get(nextId);
      const knownS = bestScore.get(nextId);
      let better;
      if (priorityScore) {
        // More bonus first, then shorter — a longer route with more battles
        // may replace a shorter weaker one.
        better = knownD === undefined || ns > knownS || (ns === knownS && nd < knownD);
      } else {
        better = knownD === undefined || nd < knownD || (nd === knownD && ns > knownS);
      }
      if (better) {
        bestDist.set(nextId, nd);
        bestScore.set(nextId, ns);
        parent.set(nextId, cur);
        queue.push(nextId);
      }
    }
  }

  // Pick the best reachable target.
  for (const [id, node] of nodeMap) {
    if (!isTarget(node)) continue;
    if (!bestDist.has(id)) continue;
    const d = bestDist.get(id);
    const s = bestScore.get(id);
    let better;
    if (priorityScore) {
      better = !best || s > best.score || (s === best.score && d < best.dist);
    } else {
      better = !best || d < best.dist || (d === best.dist && s > best.score);
    }
    if (better) best = { nodeId: id, dist: d, score: s };
  }
  if (!best) return null;

  // Reconstruct path
  const path = [];
  let cur = best.nodeId;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = parent.get(cur);
  }
  return { path, score: best.score };
}

/**
 * Shortest path between two specific nodes, maximizing non-path nodes
 * among equal-length paths.
 */
export function findShortestPath(nodeMap, startId, endId) {
  if (startId === endId) return [startId];
  const res = searchBest(nodeMap, startId, (n) => n.node_id === endId);
  return res ? res.path : null;
}

// Farm-route target types:
//   - normal battles (2): top priority
//   - events (5) and treasure chests (6): equal, below battles
// Hard (3), Very Hard (11), Ruler (4) and Boss (1) are NOT farm targets,
// but ANY node may be passed through en route (reaching more farm nodes
// may require crossing them).
const FARM_BATTLE_TYPE = 2;
const FARM_EVENT_TYPE = 5;
const FARM_CHEST_TYPE = 6;

function isFarmNode(node) {
  if (!node) return false;
  return node.node_type === FARM_BATTLE_TYPE
    || node.node_type === FARM_EVENT_TYPE
    || node.node_type === FARM_CHEST_TYPE;
}

/**
 * Navigation: within maxLen steps, the farming route. Priority:
 *   1) most farm nodes total (battles + events + chests)
 *   2) ties → more normal battles, then shorter path
 * The path ENDS at the last farm node — never walks extra steps to fill
 * the cap. Implementation: for every reachable farm node, run a dist-first
 * BFS (acyclic) to it, count farm nodes along the route, pick the best.
 */
export function findFarmRoute(nodeMap, startId, maxLen = 9) {
  if (!nodeMap.has(startId) || maxLen <= 0) return null;

  // DFS over walks. Revisiting a node is allowed only when it leads to a
  // fresh farm node (scoring is de-duplicated: each farm node counts once).
  // The winner maximizes (distinctFarmNodes, distinctBattles); ties are
  // broken by the SMALLEST number of distinct nodes visited (fewest
  // wasted backtracking steps). Pruning: remaining steps bound how many
  // new farm nodes can still be collected.
  let best = null; // { path, farmNodes, battles, distinctNodes }

  const path = [startId];
  const pathSet = new Set([startId]);       // distinct nodes on the walk
  const farmCollected = new Set();          // farm ids already counted
  if (isFarmNode(nodeMap.get(startId))) farmCollected.add(startId);
  let farmNodes = 0;
  let battles = 0;

  (function dfs(cur, steps) {
    const node = nodeMap.get(cur);
    if (node && cur !== startId && isFarmNode(node) && !node.is_shrinking) {
      const better = !best
        || farmNodes > best.farmNodes
        || (farmNodes === best.farmNodes && battles > best.battles)
        || (farmNodes === best.farmNodes && battles === best.battles && pathSet.size < best.distinctNodes);
      if (better) best = { path: [...path], farmNodes, battles, distinctNodes: pathSet.size };
    }

    if (steps >= maxLen) return;

    // Prune (SAFE): even collecting a farm node on every remaining step
    // cannot beat the current best. farmNodes grows by at most 1 per step,
    // so this is a valid upper bound.
    const rem = maxLen - steps;
    if (best && farmNodes + rem < best.farmNodes) return;

    for (const nx of (node.adjacent_node_ids || [])) {
      if (!nodeMap.has(nx)) continue;
      const nn = nodeMap.get(nx);
      // Nodes submerged by the miasma (is_shrinking) are unsafe — never
      // route through them or treat them as targets.
      if (nn.is_shrinking) continue;
      const isNewFarm = isFarmNode(nn) && !farmCollected.has(nx);
      const isNewNode = !pathSet.has(nx);

      path.push(nx);
      if (isNewNode) pathSet.add(nx);
      if (isNewFarm) {
        farmCollected.add(nx);
        farmNodes++;
        if (nn.node_type === FARM_BATTLE_TYPE) battles++;
      }
      dfs(nx, steps + 1);
      if (isNewFarm) {
        if (nn.node_type === FARM_BATTLE_TYPE) battles--;
        farmNodes--;
        farmCollected.delete(nx);
      }
      if (isNewNode) pathSet.delete(nx);
      path.pop();
    }
  })(startId, 0);

  return best;
}

/** Navigation: shortest path to the closest shop node. */
export function findNearestShop(nodeMap, startId) {
  const res = searchBest(nodeMap, startId, (n) => n.node_type === 8);
  return res ? { path: res.path } : null;
}

// Hard-route target & scoring types.
// Ruler (4) is the destination; Terrifying Foe (11) scores highest,
// Strong Foe (3) below it. Both are safe to pass through or stop on.
const HARD_RULER_TYPE = 4;
const HARD_TERRIFYING_TYPE = 11;
const HARD_STRONG_TYPE = 3;
const HARD_WEIGHT_TERRIFYING = 10; // 10 strong foes ≈ 1 terrifying foe
const HARD_MAX_LEN = 20;

/**
 * Navigation: strong-foe route. Destination is the CLOSEST Ruler node
 * (shortest unweighted distance). Within maxLen steps, the walk maximizes
 * (terrifying foes × 10 + strong foes) among distinct nodes en route;
 * ties → shorter path. Reaching the closest Ruler stops the walk. A node
 * may be revisited at most once (bounded backtracking — enough to detour
 * around foes without exploding the search space). Returns null when no
 * Ruler is reachable within maxLen steps.
 */
export function findHardRoute(nodeMap, startId, maxLen = HARD_MAX_LEN) {
  if (!nodeMap.has(startId) || maxLen <= 0) return null;

  // 1. Find the closest Ruler node(s) via unweighted BFS.
  let rulerDist = Infinity;
  const closestRulers = new Set();
  {
    const dist = new Map([[startId, 0]]);
    const q = [startId];
    while (q.length) {
      const cur = q.shift();
      const d = dist.get(cur);
      if (d > rulerDist) continue; // no need to go deeper than the best found
      const node = nodeMap.get(cur);
      if (cur !== startId && node.node_type === HARD_RULER_TYPE) {
        if (d < rulerDist) { rulerDist = d; closestRulers.clear(); }
        if (d === rulerDist) closestRulers.add(cur);
        continue;
      }
      for (const nx of (node.adjacent_node_ids || [])) {
        if (!nodeMap.has(nx)) continue;
        if (nodeMap.get(nx).is_shrinking) continue;
        if (dist.has(nx)) continue;
        dist.set(nx, d + 1);
        q.push(nx);
      }
    }
  }
  if (closestRulers.size === 0) return null; // no Ruler reachable

  // 2. DFS walk within maxLen. Stop only on a closest Ruler; score =
  //    distinct terrifying foes ×10 + strong foes. Revisits are bounded.
  let best = null; // { path, score, terrifying, strong, pathLen }

  const path = [startId];
  const pathSet = new Set([startId]);
  const revisitCount = new Map();   // node id → times revisited while in path
  const foesCollected = new Set();  // ids counted toward score
  let score = 0;
  let terrifying = 0;
  let strong = 0;

  (function dfs(cur, steps) {
    const node = nodeMap.get(cur);
    if (node && cur !== startId && closestRulers.has(cur) && !node.is_shrinking) {
      // Reaching a closest Ruler is a valid destination — stop here.
      const better = !best
        || score > best.score
        || (score === best.score && path.length < best.pathLen);
      if (better) best = { path: [...path], score, terrifying, strong, pathLen: path.length };
      return;
    }

    if (steps >= maxLen) return;

    // Prune (SAFE): each remaining step adds at most one new foe (×10).
    const rem = maxLen - steps;
    if (best && score + rem * HARD_WEIGHT_TERRIFYING < best.score) return;

    for (const nx of (node.adjacent_node_ids || [])) {
      if (!nodeMap.has(nx)) continue;
      const nn = nodeMap.get(nx);
      if (nn.is_shrinking) continue;
      const isNewNode = !pathSet.has(nx);
      const isNewFoe = !foesCollected.has(nx)
        && (nn.node_type === HARD_TERRIFYING_TYPE || nn.node_type === HARD_STRONG_TYPE);
      // Bounded revisit: already on the path → allow only if it picks up
      // a fresh foe AND has been revisited < 2 times so far.
      if (!isNewNode) {
        const rc = revisitCount.get(nx) || 0;
        if (!isNewFoe || rc >= 2) continue;
      }

      path.push(nx);
      if (isNewNode) pathSet.add(nx);
      if (!isNewNode) revisitCount.set(nx, (revisitCount.get(nx) || 0) + 1);
      if (isNewFoe) {
        foesCollected.add(nx);
        if (nn.node_type === HARD_TERRIFYING_TYPE) { score += HARD_WEIGHT_TERRIFYING; terrifying++; }
        else { score += 1; strong++; }
      }
      dfs(nx, steps + 1);
      if (isNewFoe) {
        if (nn.node_type === HARD_TERRIFYING_TYPE) { score -= HARD_WEIGHT_TERRIFYING; terrifying--; }
        else { score -= 1; strong--; }
        foesCollected.delete(nx);
      }
      if (!isNewNode) revisitCount.set(nx, (revisitCount.get(nx) || 0) - 1);
      if (isNewNode) pathSet.delete(nx);
      path.pop();
    }
  })(startId, 0);

  return best;
}

/** Navigation: shortest path into the current safe zone (non-shrinking node). */
export function findSafeZoneRoute(nodeMap, startId) {
  const res = searchBest(nodeMap, startId, (n) => !n.is_shrinking);
  return res ? { path: res.path } : null;
}
