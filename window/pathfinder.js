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
// Hard (3), Very Hard (11), Ruler (4) and Boss (1) are deliberately
// excluded — farming wants easy encounters, not threats.
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

  const dist = new Map([[startId, 0]]);
  const queue = [startId];
  while (queue.length > 0) {
    const cur = queue.shift();
    const d = dist.get(cur);
    if (d >= maxLen) continue;
    const node = nodeMap.get(cur);
    if (!node) continue;
    for (const nx of (node.adjacent_node_ids || [])) {
      if (!nodeMap.has(nx) || dist.has(nx)) continue;
      const nn = nodeMap.get(nx);
      // Do NOT route through hard encounters (3, 4, 11) or the boss (1):
      // farming avoids forced hard fights. Shop (8) / teleporter (9) etc.
      // remain passable.
      if (nn.node_type === 3 || nn.node_type === 4 || nn.node_type === 11 || nn.node_type === 1) continue;
      dist.set(nx, d + 1);
      queue.push(nx);
    }
  }

  let best = null;
  for (const [targetId, node] of nodeMap) {
    if (!isFarmNode(node) || targetId === startId) continue;
    if (!dist.has(targetId)) continue;

    const prev = new Map([[startId, null]]);
    const q = [startId];
    let found = false;
    while (q.length > 0 && !found) {
      const cur = q.shift();
      for (const nx of (nodeMap.get(cur).adjacent_node_ids || [])) {
        if (!nodeMap.has(nx) || prev.has(nx)) continue;
        const nn = nodeMap.get(nx);
        if (nn.node_type === 3 || nn.node_type === 4 || nn.node_type === 11 || nn.node_type === 1) continue;
        prev.set(nx, cur);
        if (nx === targetId) { found = true; break; }
        q.push(nx);
      }
    }
    if (!found) continue;

    const path = [];
    let c = targetId;
    while (c !== null) { path.unshift(c); c = prev.get(c); }
    const farmNodes = path.filter(id => isFarmNode(nodeMap.get(id))).length;
    const battles = path.filter(id => nodeMap.get(id).node_type === FARM_BATTLE_TYPE).length;
    // farmNodes*1000 dominates; battles*1 breaks ties
    const score = farmNodes * 1000 + battles;
    if (!best || score > best.score || (score === best.score && path.length < best.path.length)) {
      best = { path, farmNodes, battles, score };
    }
  }
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
