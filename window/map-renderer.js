// Canvas-based map renderer using original game assets

import { NODE_TYPE_COLORS, MIASMA_RADIUS } from '../shared/constants.js';

// Game asset dimensions
const BG_W = 2680, BG_H = 1830;
const NODE_W = 90, NODE_H = 100;
const PIECE_W = 90, PIECE_H = 100;

const ASSET_BASE = '../assets/';

export class MapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodeMap = new Map();
    this.currentNodeId = null;
    this.miasmaInfo = null;
    this.totalTurn = 0;
    this.path = null;            // number[] | null
    this.pathAnnotation = null;  // {dangerSteps, predictions} | null
    this.filterActive = new Set();
    this.filterSpecial = new Set();
    this.hoveredNode = null;
    this.adjacentSet = new Set(); // nodes adjacent to player (reachable)

    // View transform
    this.scale = 0.35;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // Assets
    this.images = {};
    this.assetsLoaded = false;
    this._loadAssets();
    this._bindEvents();
  }

  _loadAssets() {
    const defs = {
      bg: 'map_bg/1.jpg',
      base: 'node_icon/base.png',
      baseCleared: 'node_icon/base_cleared.png',
      baseMiasma: 'node_icon/base_miasma.png',
      baseMiasmaCleared: 'node_icon/base_miasma_cleared.png',
      baseCanMove: 'node_icon/base_can_move.png',
      baseMiasmaCanMove: 'node_icon/base_miasma_can_move.png',
      piece: 'node_icon/piece_1.png',
      pieceGlow: 'node_icon/piece_glow.png',
      icon1: 'node_icon/1.png',
      icon2: 'node_icon/2.png',
      icon3: 'node_icon/3.png',
      icon4: 'node_icon/4.png',
      icon5: 'node_icon/5.png',
      icon6: 'node_icon/6.png',
      icon7: 'node_icon/7.png',
      icon8: 'node_icon/8.png',
      icon9: 'node_icon/9.png',
      icon10: 'node_icon/10_incident.png',
      icon11: 'node_icon/11.png',
    };

    let pending = Object.keys(defs).length;
    const done = () => {
      pending--;
      if (pending <= 0) {
        this.assetsLoaded = true;
        this.render();
      }
    };

    for (const [key, file] of Object.entries(defs)) {
      const img = new Image();
      img.onload = done;
      img.onerror = done; // continue even if one fails
      img.src = ASSET_BASE + file;
      this.images[key] = img;
    }
  }

  _iconForType(nodeType) {
    const key = 'icon' + nodeType;
    return this.images[key] || null;
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
      if (!wasDrag) this._handleClick(e);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.hoveredNode = null;
      this.render();
    });
  }

  _screenToWorld(sx, sy) {
    return { x: (sx - this.offsetX) / this.scale, y: (sy - this.offsetY) / this.scale };
  }

  _worldToScreen(wx, wy) {
    return { x: wx * this.scale + this.offsetX, y: wy * this.scale + this.offsetY };
  }

  _hitTest(e) {
    const rect = this.canvas.getBoundingClientRect();
    const world = this._screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hitW = NODE_W / 2 + 8;
    const hitH = NODE_H / 2 + 8;
    for (const [, node] of this.nodeMap) {
      if (Math.abs(node.position_x - world.x) < hitW && Math.abs(node.position_y - world.y) < hitH) {
        return node;
      }
    }
    return null;
  }

  _updateHover(e) {
    const found = this._hitTest(e);
    if (found !== this.hoveredNode) {
      this.hoveredNode = found;
      this.canvas.style.cursor = found ? 'pointer' : 'grab';
      this.render();
    }
  }

  _handleClick(e) {
    const node = this._hitTest(e);
    if (node) {
      if (this.onNodeClick) this.onNodeClick(node);
    } else {
      if (this.onEmptyClick) this.onEmptyClick();
    }
  }

  // --- Data setters ---

  setMap(dungeon) {
    this.nodeMap.clear();
    if (dungeon && dungeon.node_list) {
      for (const node of dungeon.node_list) {
        this.nodeMap.set(node.node_id, node);
      }
    }
    this.currentNodeId = dungeon ? dungeon.current_node_id : null;
    this.miasmaInfo = dungeon ? dungeon.miasma_info : null;
    this.totalTurn = dungeon ? (dungeon.total_turn || 0) : 0;
    this._updateAdjacentSet();
    this._fitView();
    this.render();
  }

  updatePosition(nodeId, miasmaInfo, totalTurn) {
    this.currentNodeId = nodeId;
    if (miasmaInfo) this.miasmaInfo = miasmaInfo;
    if (totalTurn !== undefined) this.totalTurn = totalTurn;
    this._updateAdjacentSet();
    this.render();
  }

  _updateAdjacentSet() {
    this.adjacentSet.clear();
    if (this.currentNodeId == null) return;
    const cur = this.nodeMap.get(this.currentNodeId);
    if (cur && cur.adjacent_node_ids) {
      for (const id of cur.adjacent_node_ids) this.adjacentSet.add(id);
    }
  }

  setPath(path, annotation) {
    this.path = path;
    this.pathAnnotation = annotation;
    this.render();
  }

  clearPath() {
    this.path = null;
    this.pathAnnotation = null;
    this.render();
  }

  setFilter(activeTypes, activeSpecials) {
    this.filterActive = activeTypes;
    this.filterSpecial = activeSpecials;
    this.render();
  }

  _fitView() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.scale = Math.min(w / (BG_W + 80), h / (BG_H + 80)) * 0.95;
    this.offsetX = (w - BG_W * this.scale) / 2;
    this.offsetY = (h - BG_H * this.scale) / 2;
  }

  _isNodeHighlighted(node) {
    if (this.filterActive.size === 0 && this.filterSpecial.size === 0) return true;
    if (this.filterActive.size > 0 && this.filterActive.has(node.node_type)) return true;
    if (this.filterSpecial.size > 0 && node.special_incident_id != null && this.filterSpecial.has(node.special_incident_id)) return true;
    return false;
  }

  _isNodeInCurrentMiasma(node) {
    if (!this.miasmaInfo || !this.miasmaInfo.after || !this.miasmaInfo.after.is_miasmic) return false;
    const a = this.miasmaInfo.after;
    if (a.center_position_x == null || a.center_position_y == null) return false;
    const radius = MIASMA_RADIUS[a.level || 1] || MIASMA_RADIUS[1];
    const dx = node.position_x - a.center_position_x;
    const dy = node.position_y - a.center_position_y;
    return Math.sqrt(dx * dx + dy * dy) > radius;
  }

  // --- Rendering ---

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);

    if (this.nodeMap.size === 0) {
      ctx.fillStyle = '#6e7681';
      ctx.font = '15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for game data...', w / 2, h / 2 - 12);
      ctx.font = '12px system-ui';
      ctx.fillText('Open Evoking Solomonis dungeon in the game tab.', w / 2, h / 2 + 14);
      return;
    }

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this._drawBackground(ctx);
    this._drawMiasmaOverlay(ctx);
    this._drawEdges(ctx);
    this._drawPath(ctx);
    this._drawPredictedCircles(ctx);
    this._drawNodes(ctx);
    this._drawPlayer(ctx);

    ctx.restore();

    this._drawTooltip(ctx);
  }

  _drawBackground(ctx) {
    const img = this.images.bg;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, BG_W, BG_H);
      // Slight darkening for readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, BG_W, BG_H);
    } else {
      ctx.fillStyle = '#111820';
      ctx.fillRect(0, 0, BG_W, BG_H);
    }
  }

  _drawMiasmaOverlay(ctx) {
    if (!this.miasmaInfo || !this.miasmaInfo.after || !this.miasmaInfo.after.is_miasmic) return;
    const a = this.miasmaInfo.after;
    const cx = a.center_position_x;
    const cy = a.center_position_y;
    if (cx == null || cy == null) return;
    const radius = MIASMA_RADIUS[a.level || 1] || MIASMA_RADIUS[1];

    // Purple miasma fog outside safe circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -200, BG_W + 400, BG_H + 400);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(90, 20, 120, 0.35)';
    ctx.fill();
    ctx.restore();

    // Animated dashed border
    const t = Date.now() / 1000;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200, 80, 255, 0.8)';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]);
    ctx.lineDashOffset = -t * 30;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawEdges(ctx) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.25)';
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
        ctx.stroke();
      }
    }
  }

  _drawPath(ctx) {
    if (!this.path || this.path.length < 2) return;
    const dangerSet = new Set();
    if (this.pathAnnotation) {
      for (const d of this.pathAnnotation.dangerSteps) dangerSet.add(d.step);
    }

    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.nodeMap.get(this.path[i]);
      const b = this.nodeMap.get(this.path[i + 1]);
      if (!a || !b) continue;

      const segDanger = dangerSet.has(i) || dangerSet.has(i + 1);
      ctx.beginPath();
      ctx.moveTo(a.position_x, a.position_y);
      ctx.lineTo(b.position_x, b.position_y);
      ctx.strokeStyle = segDanger ? 'rgba(255, 60, 60, 0.9)' : 'rgba(255, 230, 80, 0.9)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Step number labels on path nodes
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    for (let i = 1; i < this.path.length; i++) {
      const node = this.nodeMap.get(this.path[i]);
      if (!node) continue;
      const danger = dangerSet.has(i);
      ctx.fillStyle = danger ? '#ff4444' : '#ffe650';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      const label = String(i);
      ctx.strokeText(label, node.position_x, node.position_y - NODE_H / 2 - 8);
      ctx.fillText(label, node.position_x, node.position_y - NODE_H / 2 - 8);
    }
  }

  _drawPredictedCircles(ctx) {
    if (!this.pathAnnotation || !this.pathAnnotation.predictions) return;

    for (const [step, predicted] of this.pathAnnotation.predictions) {
      if (!predicted.active || predicted.cx == null || predicted.cy == null) continue;
      if (predicted.phase === 'inactive') continue;
      if (predicted.radius <= 0 || predicted.radius === Infinity) continue;

      // Only draw if different from current circle
      const a = this.miasmaInfo && this.miasmaInfo.after;
      const isCurrent = a && a.is_miasmic && a.level === predicted.level;
      if (isCurrent) continue;

      ctx.beginPath();
      ctx.arc(predicted.cx, predicted.cy, predicted.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.font = 'bold 20px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 120, 120, 0.9)';
      ctx.fillText(`Lv${predicted.level} @ step ${step}`, predicted.cx, predicted.cy - predicted.radius - 12);
    }
  }

  _drawNodes(ctx) {
    const hasFilter = this.filterActive.size > 0 || this.filterSpecial.size > 0;

    for (const [id, node] of this.nodeMap) {
      const highlighted = this._isNodeHighlighted(node);
      const inMiasma = this._isNodeInCurrentMiasma(node);
      const isAdjacent = this.adjacentSet.has(id);
      const isCurrent = id === this.currentNodeId;
      const isOnPath = this.path && this.path.includes(id);

      const alpha = hasFilter && !highlighted ? 0.25 : 1.0;
      ctx.globalAlpha = alpha;

      const x = node.position_x - NODE_W / 2;
      const y = node.position_y - NODE_H / 2;

      // Choose base image
      let baseImg;
      if (inMiasma) {
        baseImg = isAdjacent ? this.images.baseMiasmaCanMove : this.images.baseMiasma;
        if (node.is_visited) baseImg = this.images.baseMiasmaCleared;
      } else {
        baseImg = isAdjacent ? this.images.baseCanMove : this.images.base;
        if (node.is_visited) baseImg = this.images.baseCleared;
      }

      if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
        ctx.drawImage(baseImg, x, y, NODE_W, NODE_H);
      } else {
        // Fallback circle
        ctx.beginPath();
        ctx.arc(node.position_x, node.position_y, 20, 0, Math.PI * 2);
        ctx.fillStyle = NODE_TYPE_COLORS[node.node_type] || '#9e9e9e';
        ctx.fill();
      }

      // Type icon
      const icon = this._iconForType(node.node_type);
      if (icon && icon.complete && icon.naturalWidth > 0) {
        ctx.drawImage(icon, x, y, NODE_W, NODE_H);
      }

      // Path highlight ring
      if (isOnPath && !isCurrent) {
        ctx.beginPath();
        ctx.arc(node.position_x, node.position_y, NODE_W / 2 + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 230, 80, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Hover ring
      if (this.hoveredNode && this.hoveredNode.node_id === id) {
        ctx.beginPath();
        ctx.arc(node.position_x, node.position_y, NODE_W / 2 + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
    }
  }

  _drawPlayer(ctx) {
    if (this.currentNodeId == null) return;
    const node = this.nodeMap.get(this.currentNodeId);
    if (!node) return;

    const x = node.position_x - PIECE_W / 2;
    const y = node.position_y - PIECE_H / 2;

    // Glow (pulsing)
    const t = Date.now() / 1000;
    const pulse = 0.6 + 0.4 * Math.sin(t * 3);
    const glow = this.images.pieceGlow;
    if (glow && glow.complete && glow.naturalWidth > 0) {
      ctx.globalAlpha = pulse * 0.7;
      ctx.drawImage(glow, x - 8, y - 8, PIECE_W + 16, PIECE_H + 16);
      ctx.globalAlpha = 1.0;
    }

    // Piece
    const piece = this.images.piece;
    if (piece && piece.complete && piece.naturalWidth > 0) {
      ctx.drawImage(piece, x, y, PIECE_W, PIECE_H);
    } else {
      ctx.beginPath();
      ctx.arc(node.position_x, node.position_y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }

  _drawTooltip(ctx) {
    if (!this.hoveredNode) return;
    const node = this.hoveredNode;
    const screen = this._worldToScreen(node.position_x, node.position_y);

    const typeNames = { 0: 'Path', 1: 'Boss', 2: 'Battle', 3: 'Strong Foe', 4: 'Ruler', 5: 'Event', 6: 'Treasure', 7: 'Healing', 8: 'Shop', 9: 'Teleporter', 10: 'Special', 11: 'Terrifying' };
    let label = `#${node.node_id} ${typeNames[node.node_type] || node.node_type}`;
    if (node.special_incident_id) label += ` [sp:${node.special_incident_id}]`;
    if (node.is_visited) label += ' ✓';

    ctx.font = '12px system-ui';
    const tw = ctx.measureText(label).width + 16;
    const tx = Math.min(screen.x + 18, this.canvas.width - tw - 5);
    const ty = Math.max(screen.y - 32, 20);

    ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
    ctx.strokeStyle = 'rgba(100, 120, 140, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, 24, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e6edf3';
    ctx.textAlign = 'left';
    ctx.fillText(label, tx + 8, ty + 16);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }
}
