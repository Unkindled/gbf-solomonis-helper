// BFS shortest path on the dungeon node graph

/**
 * Find shortest path between two nodes using BFS.
 * @param {Map<number, object>} nodeMap - node_id → node object
 * @param {number} startId
 * @param {number} endId
 * @returns {number[]|null} - array of node_ids from start to end, or null if unreachable
 */
export function findShortestPath(nodeMap, startId, endId) {
  if (startId === endId) return [startId];
  if (!nodeMap.has(startId) || !nodeMap.has(endId)) return null;

  const visited = new Set();
  const queue = [[startId]];
  visited.add(startId);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    const node = nodeMap.get(current);
    if (!node) continue;

    const neighbors = node.adjacent_node_ids || [];
    for (const nextId of neighbors) {
      if (visited.has(nextId)) continue;
      if (!nodeMap.has(nextId)) continue;

      const newPath = [...path, nextId];
      if (nextId === endId) return newPath;

      visited.add(nextId);
      queue.push(newPath);
    }
  }

  return null; // unreachable
}

/**
 * Check which nodes in a path are outside the miasma safe zone.
 * @param {number[]} path - array of node_ids
 * @param {Map<number, object>} nodeMap
 * @param {object|null} miasmaInfo - { after: { is_miasmic, center_position_x, center_position_y, level } }
 * @param {object} radiusMap - { 1: 670, 2: 67 }
 * @returns {Set<number>} - set of node_ids that are in danger
 */
export function getMiasmaDangerNodes(path, nodeMap, miasmaInfo, radiusMap) {
  const danger = new Set();
  if (!miasmaInfo || !miasmaInfo.after || !miasmaInfo.after.is_miasmic) return danger;

  const after = miasmaInfo.after;
  const cx = after.center_position_x;
  const cy = after.center_position_y;
  const level = after.level || 1;
  const radius = radiusMap[level] || radiusMap[1];

  if (cx == null || cy == null) return danger;

  for (const nodeId of path) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const dx = node.position_x - cx;
    const dy = node.position_y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) {
      danger.add(nodeId);
    }
  }

  return danger;
}
