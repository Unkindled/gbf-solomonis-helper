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
      const next = nodeMap.get(nextId);
      if (!next || next.is_deleted) continue; // consumed nodes are impassable

      const newPath = [...path, nextId];
      if (nextId === endId) return newPath;

      visited.add(nextId);
      queue.push(newPath);
    }
  }

  return null; // unreachable
}
