// Shared dungeon node mutations — the SAME graph updates are applied in
// background.js (its gameState.map cache) and window/app.js (its renderer
// nodeMap). Keeping them in one module prevents the two copies drifting
// (they previously used different lookups: array.find O(n) vs Map.get O(1)).
//
// All functions mutate the given node objects in place and accept the node
// list as a plain array — pass gameState.map.node_list or [...nodeMap.values()].

/** Build a node_id → node index for the given node list. */
function indexNodes(nodeList) {
  const byId = new Map();
  if (Array.isArray(nodeList)) {
    for (const n of nodeList) byId.set(n.node_id, n);
  }
  return byId;
}

/** Move: mark the destination node visited + newly consumed nodes shrinking. */
export function applyMove(nodeList, afterNodeId, shrinkNodeIds) {
  const byId = indexNodes(nodeList);
  const dest = afterNodeId != null ? byId.get(afterNodeId) : null;
  if (dest) dest.is_visited = true;
  applyShrinkIds(byId, shrinkNodeIds);
}

/** Finish event: the cleared node becomes a Path (node_type=0), stays
 *  visited; newly consumed nodes shrink; special incidents may appear.
 *  Accepts EITHER the raw server response (is_delete_node / is_visited_node
 *  / special_incident_appearance_info) OR the background's broadcast payload
 *  (isDeleteNode / isVisitedNode / nodeId / specialIncidentAppearance /
 *  shrinkNodeIds). */
export function applyFinish(nodeList, currentNodeIdOrNodeId, data) {
  const byId = indexNodes(nodeList);
  const isDel = data.is_delete_node || data.isDeleteNode;
  const isVis = data.is_visited_node || data.isVisitedNode;
  if ((isDel || isVis) && currentNodeIdOrNodeId != null) {
    const cleared = byId.get(currentNodeIdOrNodeId);
    if (cleared) {
      cleared.node_type = 0;
      cleared.is_visited = true;
    }
  }
  const shrinkIds = (data.miasma_info && data.miasma_info.shrink_node_ids)
    || data.shrinkNodeIds || [];
  applyShrinkIds(byId, shrinkIds);
  applySpecialAppearance(byId, data.special_incident_appearance_info || data.specialIncidentAppearance);
}

/** Mark the given node ids as miasma-consumed (is_shrinking = true). */
export function applyShrinkIds(nodeListOrIndex, shrinkNodeIds) {
  const byId = nodeListOrIndex instanceof Map ? nodeListOrIndex : indexNodes(nodeListOrIndex);
  for (const sid of (shrinkNodeIds || [])) {
    const sn = byId.get(Number(sid));
    if (sn) sn.is_shrinking = true;
  }
}

/** Update node special_incident_id from special_incident_appearance_info. */
export function applySpecialAppearance(nodeListOrIndex, info) {
  if (!info) return;
  const byId = nodeListOrIndex instanceof Map ? nodeListOrIndex : indexNodes(nodeListOrIndex);
  const appearances = Array.isArray(info) ? info : Object.values(info);
  for (const app of appearances) {
    if (app && app.appearance_list) {
      for (const a of app.appearance_list) {
        const node = byId.get(a.node_id);
        if (node) node.special_incident_id = a.special_incident_id;
      }
    }
  }
}
