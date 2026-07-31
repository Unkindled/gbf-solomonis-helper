// Canvas-based map renderer for the dungeon

import { NODE_TYPE_COLORS, MIASMA_RADIUS } from '../shared/constants.js';

const NODE_RADIUS = 12;
const LINE_WIDTH = 1.5;
const PLAYER_RADIUS = 16;

export class MapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodeMap = new Map(); // node_id → node
    this.currentNodeId = null;
    this.miasmaInfo = null;
    this.path = null;         // number[] | null
    this.dangerNodes = null;  // Set<number> | null
    this.filterActive = new Set(); // node types to highlight (empty = show all)
    this.filterSpecial = new Set(); // special incident ids to highlight
    this.hoveredNode = null;

    // View transform
    this.scale = 0.35;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this._bindEvents();
  }

  _bindEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const oldScale = this.scale;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.max(0.1, Math.min(3, this.scale * delta));

      // Zoom toward cursor
      this.offsetX = mx - (mx - this.offsetX) * (this.scale / oldScale);
      this.offsetY = my - (my - this.offsetY) * (this.scale / oldScale);
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragOffsetX = this.offsetX;
      this.dragOffsetY = this.offsetY;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.offsetX = this.dragOffsetX + (e.clientX - this.dragStartX);
        this.offsetY = this.dragOffsetY + (e.clientY - this.dragStartY);
        this.render();
      } else {
        this._updateHover(e);
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      const wasDrag = Math.abs(e.clientX - this.dragStartX) > 3 || Math.abs(e.clientY - this.dragStartY) > 3;
      this.isDragging = false;
      if (!wasDrag) {
        this._handleClick(e);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.hoveredNode = null;
      this.render();
    });
  }

  _screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  _worldToScreen(wx, wy) {
    return {
      x: wx * this.scale + this.offsetX,
      y: wy * this.scale + this.offsetY,
    };
  }

  _updateHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this._screenToWorld(sx, sy);

    let found = null;
    const hitRadius = NODE_RADIUS / this.scale + 5;
    for (const [id, node] of this.nodeMap) {
      const dx = node.position_x - world.x;
      const dy = node.position_y - world.y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        found = node;
        break;
      }
    }

    if (found !== this.hoveredNode) {
      this.hoveredNode = found;
      this.render();
    }
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this._screenToWorld(sx, sy);

    const hitRadius = NODE_RADIUS / this.scale + 5;
    for (const [id, node] of this.nodeMap) {
      const dx = node.position_x - world.x;
      const dy = node.position_y - world.y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        if (this.onNodeClick) this.onNodeClick(node);
        return;
      }
    }
    // Clicked empty space
    if (this.onEmptyClick) this.onEmptyClick();
  }

  setMap(dungeon) {
    this.nodeMap.clear();
    if (dungeon && dungeon.node_list) {
      for (const node of dungeon.node_list) {
        this.nodeMap.set(node.node_id, node);
      }
    }
    this.currentNodeId = dungeon ? dungeon.current_node_id : null;
    this.miasmaInfo = dungeon ? dungeon.miasma_info : null;
    this._fitView();
    this.render();
  }

  updatePosition(nodeId, miasmaInfo) {
    this.currentNodeId = nodeId;
    if (miasmaInfo) this.miasmaInfo = miasmaInfo;
    this.render();
  }

  setPath(path, dangerNodes) {
    this.path = path;
    this.dangerNodes = dangerNodes;
    this.render();
  }

  clearPath() {
    this.path = null;
    this.dangerNodes = null;
    this.render();
  }

  setFilter(activeTypes, activeSpecials) {
    this.filterActive = activeTypes;
    this.filterSpecial = activeSpecials;
    this.render();
  }

  _fitView() {
    if (this.nodeMap.size === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [, node] of this.nodeMap) {
      minX = Math.min(minX, node.position_x);
      minY = Math.min(minY, node.position_y);
      maxX = Math.max(maxX, node.position_x);
      maxY = Math.max(maxY, node.position_y);
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const mapW = maxX - minX + 100;
    const mapH = maxY - minY + 100;
    this.scale = Math.min(w / mapW, h / mapH) * 0.9;
    this.offsetX = (w - mapW * this.scale) / 2 - minX * this.scale + 50 * this.scale;
    this.offsetY = (h - mapH * this.scale) / 2 - minY * this.scale + 50 * this.scale;
  }

  _isNodeHighlighted(node) {
    if (this.filterActive.size === 0 && this.filterSpecial.size === 0) return true;
    if (this.filterActive.size > 0 && this.filterActive.has(node.node_type)) return true;
    if (this.filterSpecial.size > 0 && node.special_incident_id != null && this.filterSpecial.has(node.special_incident_id)) return true;
    return false;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    if (this.nodeMap.size === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for game data...', w / 2, h / 2);
      ctx.fillText('Open Evoking Solomonis in the game tab.', w / 2, h / 2 + 24);
      return;
    }

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // Draw miasma safe zone circle
    this._drawMiasmaZone(ctx);

    // Draw edges
    this._drawEdges(ctx);

    // Draw path
    this._drawPath(ctx);

    // Draw nodes
    this._drawNodes(ctx);

    // Draw player
    this._drawPlayer(ctx);

    ctx.restore();

    // Draw tooltip (in screen space)
    this._drawTooltip(ctx);
  }

  _drawMiasmaZone(ctx) {
    if (!this.miasmaInfo || !this.miasmaInfo.after || !this.miasmaInfo.after.is_miasmic) return;
    const after = this.miasmaInfo.after;
    const cx = after.center_position_x;
    const cy = after.center_position_y;
    const level = after.level || 1;
    const radius = MIASMA_RADIUS[level] || MIASMA_RADIUS[1];
    if (cx == null || cy == null) return;

    // Draw danger overlay outside circle (large rect minus circle)
    ctx.save();
    ctx.beginPath();
    ctx.rect(-500, -500, 4000, 3000);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(180, 30, 60, 0.15)';
    ctx.fill();
    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawEdges(ctx) {
    ctx.lineWidth = LINE_WIDTH;
    const drawn = new Set();
    for (const [id, node] of this.nodeMap) {
      for (const adjId of (node.adjacent_node_ids || [])) {
        const key = id < adjId ? `${id}-${adjId}` : `${adjId}-${id}`;
        if (drawn.has(key)) continue;
        drawn.add(key);
        const adj = this.nodeMap.get(adjId);
        if (!adj) continue;

        ctx.beginPath();
        ctx.moveTo(node.position_x, node.position_y);
        ctx.lineTo(adj.position_x, adj.position_y);
        ctx.strokeStyle = 'rgba(100, 120, 140, 0.3)';
        ctx.stroke();
      }
    }
  }

  _drawPath(ctx) {
    if (!this.path || this.path.length < 2) return;

    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.nodeMap.get(this.path[i]);
      const b = this.nodeMap.get(this.path[i + 1]);
      if (!a || !b) continue;

      const isDanger = this.dangerNodes && (this.dangerNodes.has(this.path[i]) || this.dangerNodes.has(this.path[i + 1]));
      ctx.beginPath();
      ctx.moveTo(a.position_x, a.position_y);
      ctx.lineTo(b.position_x, b.position_y);
      ctx.strokeStyle = isDanger ? '#ff5252' : '#ffeb3b';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  _drawNodes(ctx) {
    for (const [id, node] of this.nodeMap) {
      const highlighted = this._isNodeHighlighted(node);
      const alpha = highlighted ? 1.0 : 0.2;
      const color = NODE_TYPE_COLORS[node.node_type] || '#9e9e9e';
      const isOnPath = this.path && this.path.includes(id);
      const isDanger = this.dangerNodes && this.dangerNodes.has(id);

      ctx.globalAlpha = alpha;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.position_x, node.position_y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Border
      ctx.lineWidth = isOnPath ? 3 : 1.5;
      ctx.strokeStyle = isDanger ? '#ff1744' : (isOnPath ? '#ffeb3b' : 'rgba(255,255,255,0.4)');
      ctx.stroke();

      // Visited indicator (small dot)
      if (node.is_visited) {
        ctx.beginPath();
        ctx.arc(node.position_x, node.position_y - NODE_RADIUS - 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#4caf50';
        ctx.fill();
      }

      // Hover ring
      if (this.hoveredNode && this.hoveredNode.node_id === id) {
        ctx.beginPath();
        ctx.arc(node.position_x, node.position_y, NODE_RADIUS + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
    }
  }

  _drawPlayer(ctx) {
    if (this.currentNodeId == null) return;
    const node = this.nodeMap.get(this.currentNodeId);
    if (!node) return;

    ctx.beginPath();
    ctx.arc(node.position_x, node.position_y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner marker
    ctx.beginPath();
    ctx.arc(node.position_x, node.position_y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  _drawTooltip(ctx) {
    if (!this.hoveredNode) return;
    const node = this.hoveredNode;
    const screen = this._worldToScreen(node.position_x, node.position_y);

    const label = `#${node.node_id} type:${node.node_type}` +
      (node.special_incident_id ? ` sp:${node.special_incident_id}` : '');

    ctx.font = '12px monospace';
    const tw = ctx.measureText(label).width + 12;
    const tx = Math.min(screen.x + 15, this.canvas.width - tw - 5);
    const ty = Math.max(screen.y - 25, 20);

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(tx, ty, tw, 20);
    ctx.fillStyle = '#eee';
    ctx.textAlign = 'left';
    ctx.fillText(label, tx + 6, ty + 14);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }
}
