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

  // DFS over walks (revisiting nodes IS allowed — crossing an already-visited
  // node may lead to fresh farm nodes). Scoring is de-duplicated: a farm
  // node (battle/event/chest) counts only the FIRST time it is visited.
  // Battle priority: farmNodes total first, battles second, steps third.
  // Optimistic pruning: remaining steps bound how many new farm nodes can
  // still be collected, cutting branches that cannot beat the current best.
  let best = null; // { path, farmNodes, battles }

  const path = [startId];
  const farmCollected = new Set(); // farm node ids already counted
  // The player's own node is "already visited" — if it's a farm node, mark
  // it collected so backtracking through it never double-counts. It does
  // NOT contribute to the score (the player stands on it already).
  if (isFarmNode(nodeMap.get(startId))) farmCollected.add(startId);
  let farmNodes = 0;
  let battles = 0;

  (function dfs(cur, steps) {
    const node = nodeMap.get(cur);
    if (node && cur !== startId && isFarmNode(node)) {
      const better = !best
        || farmNodes > best.farmNodes
        || (farmNodes === best.farmNodes && battles > best.battles)
        || (farmNodes === best.farmNodes && battles === best.battles && path.length < best.path.length);
      if (better) best = { path: [...path], farmNodes, battles };
    }

    if (steps >= maxLen) return;

    // Prune: even collecting a farm node on every remaining step cannot
    // beat the current best.
    const rem = maxLen - steps;
    if (best && farmNodes + rem < best.farmNodes) return;
    if (best && farmNodes === best.farmNodes && battles + rem <= best.battles) return;

    for (const nx of (node.adjacent_node_ids || [])) {
      if (!nodeMap.has(nx)) continue;
      const nn = nodeMap.get(nx);
      const isNewFarm = isFarmNode(nn) && !farmCollected.has(nx);
      path.push(nx);
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

/** Navigation: shortest path into the current safe zone (non-shrinking node). */
export function findSafeZoneRoute(nodeMap, startId) {
  const res = searchBest(nodeMap, startId, (n) => !n.is_shrinking);
  return res ? { path: res.path } : null;
}
