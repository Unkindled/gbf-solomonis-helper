// Canvas-based map renderer using original game assets

import { NODE_TYPE_COLORS, MIASMA_RADIUS } from '../shared/constants.js';

// Game asset dimensions
const BG_W = 2680, BG_H = 1830;
const NODE_W = 90, NODE_H = 100;
const PIECE_W = 90, PIECE_H = 100;

const ASSET_BASE = '../assets/';

// 游戏里 base 图标的"地面点/pin 尖"位于图标内坐标 (44, 86)
// （= 游戏 NODE_CONNECT_LINE_OFFSET，连线端点 = coordinate + 此偏移，即连到地面点）。
// 服务器 center_position 等于中心节点的地面点；而本插件把节点地面点画在 position，
// 故白圈圆心需减去此偏移，才能与节点坐标系对齐。
const MIASMA_CENTER_OFFSET = { X: 44, Y: 86 };

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
    this.customWaypoints = [];   // node ids picked in custom-path mode
    this.focusArrowUntil = 0;    // timestamp; >now → draw blinking arrow
    this.filterActive = new Set();
    this.filterSpecial = new Set();
    this.hoveredNode = null;
    this.adjacentSet = new Set(); // nodes adjacent to player (reachable)
    this.shopStock = {}; // node_id → {items:[{lineup_id,name,price,stock,canBuy}], coinAfter}

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
      icon10fanatic: 'node_icon/10_fanatic.png',
      icon10guru: 'node_icon/10_guru.png',
      icon10teleport: 'node_icon/10_teleport.png',
      icon10research: 'node_icon/10_research.png',
      icon11: 'node_icon/11.png',
      miasmaCircle1: 'miasma_circle_1.png',
      miasmaCircle2: 'miasma_circle_2.png',
    };

    // Circle image radii (from PNG dimensions / 2)
    this.miasmaCircleRadius = { 1: 670, 2: 67 };

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

  _iconForNode(node) {
    if (node.node_type === 10 && node.special_incident_id != null) {
      const sp = node.special_incident_id;
      if (sp === 1) return this.images.icon10guru || null;          // Cult Founder
      if (sp === 2 || sp === 3) return this.images.icon10fanatic || null; // Cultists
      if (sp === 4) return this.images.icon10teleport || null;      // Floating Castle
      if (sp === 5 || sp === 6 || sp === 7) return this.images.icon10teleport || null; // FC Portals
      if (sp === 8) return this.images.icon10research || null;      // FC Researcher
    }
    const key = 'icon' + node.node_type;
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
    const hitH = NODE_H + 8; // icon extends upward from ground point
    for (const [, node] of this.nodeMap) {
      // Node coordinate is at bottom-center of icon
      if (Math.abs(node.position_x - world.x) < hitW &&
          world.y > node.position_y - hitH && world.y < node.position_y + 12) {
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

  setCustomWaypoints(ids) {
    this.customWaypoints = ids || [];
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
    const dpr = this.dpr || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
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
    // Exact from server: is_shrinking flag on the node itself
    return !!node.is_shrinking;
  }

  // --- Rendering ---

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Map logical (CSS px) coordinates onto the physical backing store so
    // we draw at full device resolution once, not a scaled-up bitmap.
    const dpr = this.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w / dpr, h / dpr);
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w / dpr, h / dpr);

    if (this.nodeMap.size === 0) {
      ctx.fillStyle = '#6e7681';
      ctx.font = '15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for game data...', w / dpr / 2, h / dpr / 2 - 12);
      ctx.font = '12px system-ui';
      ctx.fillText('Open Evoking Solomonis dungeon in the game tab.', w / dpr / 2, h / dpr / 2 + 14);
      return;
    }

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this._drawBackground(ctx);
    this._drawMiasmaOverlay(ctx);
    this._drawEdges(ctx);
    this._drawTeleporterLinks(ctx);
    this._drawCustomWaypoints(ctx);
    this._drawPath(ctx);
    this._drawNodes(ctx);
    this._drawPlayer(ctx);
    this._drawFocusArrow(ctx);

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

  // Miasma shrink model:
  //   Lv1: fit boundary from is_shrinking state (no cumulative pollution in Lv1).
  //   Lv2: interpolate between the Lv1 safe circle (center C1, radius 670) and
  //        the Lv2 safe circle (center C2, radius 67) over 20 turns — both
  //        center and radius lerp linearly, so the circles are NOT concentric.
  _fitMiasmaRadius(cx, cy) {
    const items = [];
    for (const [, n] of this.nodeMap) {
      items.push({ d: Math.hypot(n.position_x - cx, n.position_y - cy), s: !!n.is_shrinking });
    }
    if (items.length === 0) return null;
    items.sort((a, b) => a.d - b.d);

    const prefix = new Array(items.length);
    let cnt = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].s) cnt++;
      prefix[i] = cnt;
    }
    const totalShrink = cnt;
    const totalSafe = items.length - totalShrink;

    let bestR = null, bestErr = Infinity;
    for (let i = 0; i < items.length; i++) {
      const R = items[i].d;
      const shrinkIn = prefix[i];
      const safeOut = totalSafe - (i + 1 - shrinkIn);
      const err = shrinkIn + safeOut;
      if (err < bestErr) {
        bestErr = err;
        bestR = R;
      }
    }
    return { R: bestR, err: bestErr, total: items.length };
  }

  // Lv2 shrink model: the center_position is NOT the miasma circle center.
  // Fit center + radius with a STRICT guarantee: every polluted node must be
  // OUTSIDE the circle and every safe node INSIDE. This requires
  // max(dist(safe,center)) < min(dist(polluted,center)). We search the center
  // to maximize that gap, then pick R at the midpoint of the gap.
  _fitMiasmaCircle() {
    const items = [];
    for (const [, n] of this.nodeMap) {
      items.push({ x: n.position_x, y: n.position_y, s: !!n.is_shrinking });
    }
    if (items.length === 0) return null;

    const safe = items.filter(i => !i.s);
    const shr = items.filter(i => i.s);
    if (safe.length === 0 || shr.length === 0) {
      return { x: 0, y: 0, R: 0, err: items.length, strict: false };
    }

    // Start from safe-node centroid, then hill-climb / grid-search the center
    // to maximize gap = min(dist(shr)) - max(dist(safe)).
    let cx = safe.reduce((a, s) => a + s.x, 0) / safe.length;
    let cy = safe.reduce((a, s) => a + s.y, 0) / safe.length;

    const gapAt = (x, y) => {
      let maxSafe = 0, minShr = Infinity;
      for (const s of safe) { const d = Math.hypot(s.x - x, s.y - y); if (d > maxSafe) maxSafe = d; }
      for (const s of shr) { const d = Math.hypot(s.x - x, s.y - y); if (d < minShr) minShr = d; }
      return { gap: minShr - maxSafe, maxSafe, minShr };
    };

    // Grid search around the centroid (coarse then fine).
    let best = { gap: -Infinity, x: cx, y: cy };
    const scan = (step) => {
      for (let dx = -400; dx <= 400; dx += step) {
        for (let dy = -400; dy <= 400; dy += step) {
          const g = gapAt(cx + dx, cy + dy);
          if (g.gap > best.gap) {
            best = { gap: g.gap, x: cx + dx, y: cy + dy, maxSafe: g.maxSafe, minShr: g.minShr };
          }
        }
      }
    };
    scan(40);  // coarse
    scan(8);   // fine around best
    // Refine at the best center
    const g = gapAt(best.x, best.y);

    // Strict separation possible?
    if (g.gap > 0) {
      const R = (g.maxSafe + g.minShr) / 2; // midpoint of the valid range
      return { x: best.x, y: best.y, R, err: 0, strict: true, gap: g.gap };
    }
    // No strict circle possible (overlapping sets) — fall back to centroid + min-err
    const dists = items.map(i => ({ d: Math.hypot(i.x - cx, i.y - cy), s: i.s })).sort((a, b) => a.d - b.d);
    const prefix = new Array(dists.length);
    let cnt = 0;
    for (let i = 0; i < dists.length; i++) {
      if (dists[i].s) cnt++;
      prefix[i] = cnt;
    }
    const totalShrink = cnt;
    const totalSafe = dists.length - totalShrink;
    let bestR = null, bestErr = Infinity;
    for (let i = 0; i < dists.length; i++) {
      const R = dists[i].d;
      const err = prefix[i] + (totalSafe - (i + 1 - prefix[i]));
      if (err < bestErr) {
        bestErr = err;
        bestR = R;
      }
    }
    return { x: cx, y: cy, R: bestR, err: bestErr, strict: false };
  }

  _drawMiasmaOverlay(ctx) {
    const a = this.miasmaInfo && this.miasmaInfo.after;
    if (!a || !a.is_miasmic) return;
    if (a.center_position_x == null || a.center_position_y == null) return;

    const level = a.level || 1;
    const safeRadius = this.miasmaCircleRadius[level] || this.miasmaCircleRadius[1];
    const img = level === 2 ? this.images.miasmaCircle2 : this.images.miasmaCircle1;
    // center_position 是中心节点的地面点；本插件节点地面点 = position，
    // 而 position = 地面点 - MIASMA_CENTER_OFFSET，故圆心需减去该偏移对齐。
    const OFFSET = MIASMA_CENTER_OFFSET;

    let cx, cy, miasmaR;
    if (level === 1) {
      // Lv1: fit boundary from is_shrinking (center = center_position)
      cx = a.center_position_x - OFFSET.X;
      cy = a.center_position_y - OFFSET.Y;
      const fit = this._fitMiasmaRadius(cx, cy);
      miasmaR = fit ? Math.max(fit.R, safeRadius) : 1600;
    } else {
      // Lv2: center_position is NOT the circle center — fit center + radius
      // from the polluted/unpolluted node states (strict: no misclassification).
      const fit = this._fitMiasmaCircle();
      if (fit && fit.R > 0) {
        cx = fit.x;
        cy = fit.y;
        miasmaR = fit.R;
      } else {
        cx = a.center_position_x - OFFSET.X;
        cy = a.center_position_y - OFFSET.Y;
        miasmaR = safeRadius;
      }
    }

    // --- Pollution effect: purple-red haze outside the miasma boundary ---
    // Draw a full-map rect, punch out the safe circle with even-odd fill.
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -200, BG_W + 400, BG_H + 400);
    ctx.arc(cx, cy, miasmaR, 0, Math.PI * 2, true); // counter-clockwise => hole
    ctx.fillStyle = 'rgba(150, 30, 160, 0.30)';
    ctx.fill('evenodd');
    ctx.restore();

    // Soft inner edge glow (miasma creep front)
    const t = Date.now() / 1000;
    const grad = ctx.createRadialGradient(cx, cy, miasmaR - 40, cx, cy, miasmaR + 40);
    grad.addColorStop(0, 'rgba(200, 60, 220, 0)');
    grad.addColorStop(0.5, 'rgba(200, 60, 220, 0.45)');
    grad.addColorStop(1, 'rgba(160, 40, 190, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, miasmaR + 40, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Animated miasma front ring
    ctx.beginPath();
    ctx.arc(cx, cy, miasmaR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(220, 90, 240, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -t * 30;
    ctx.stroke();
    ctx.setLineDash([]);

    // --- Safe zone white circle (game-native ring) ---
    // The white ring marks the server-provided safe zone (center_position),
    // NOT the fitted miasma boundary center.
    const safeCx = a.center_position_x - OFFSET.X;
    const safeCy = a.center_position_y - OFFSET.Y;
    if (img && img.complete && img.naturalWidth > 0) {
      // Game anchors the circle image so its center sits at (safeCx, safeCy)
      ctx.drawImage(img, safeCx - safeRadius, safeCy - safeRadius, safeRadius * 2, safeRadius * 2);
    } else {
      ctx.beginPath();
      ctx.arc(safeCx, safeCy, safeRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Center marker
    ctx.beginPath();
    ctx.arc(safeCx, safeCy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
  }

  _drawEdges(ctx) {
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
        ctx.strokeStyle = 'rgba(200, 215, 230, 0.45)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  }

  // When hovering a teleporter node, draw thick blue gradient links to all
  // other teleporter nodes (they form warp pairs).
  _drawTeleporterLinks(ctx) {
    if (!this.hoveredNode || this.hoveredNode.node_type !== 9) return;
    const src = this.hoveredNode;
    const srcX = src.position_x;
    const srcY = src.position_y;

    for (const [, node] of this.nodeMap) {
      if (node.node_type !== 9 || node.node_id === src.node_id) continue;

      const dx = node.position_x - srcX;
      const dy = node.position_y - srcY;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;

      // Gradient: cyan-blue across the link
      const grad = ctx.createLinearGradient(srcX, srcY, node.position_x, node.position_y);
      grad.addColorStop(0, 'rgba(0, 180, 255, 0.15)');
      grad.addColorStop(0.5, 'rgba(0, 220, 255, 0.9)');
      grad.addColorStop(1, 'rgba(0, 120, 255, 0.15)');

      // Outer glow pass
      ctx.beginPath();
      ctx.moveTo(srcX, srcY);
      ctx.lineTo(node.position_x, node.position_y);
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.25)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Main gradient line
      ctx.beginPath();
      ctx.moveTo(srcX, srcY);
      ctx.lineTo(node.position_x, node.position_y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  _drawCustomWaypoints(ctx) {
    if (!this.customWaypoints || this.customWaypoints.length === 0) return;
    this.customWaypoints.forEach((id, i) => {
      const n = this.nodeMap.get(id);
      if (!n) return;
      const x = n.position_x;
      const y = n.position_y;
      // Glow ring + numbered marker
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(88, 166, 255, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#58a6ff';
      ctx.fill();
      ctx.fillStyle = '#0d1117';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x, y + 1);
    });
  }

  _drawPath(ctx) {
    if (!this.path || this.path.length < 2) return;

    // Outer glow pass
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.nodeMap.get(this.path[i]);
      const b = this.nodeMap.get(this.path[i + 1]);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.position_x, a.position_y);
      ctx.lineTo(b.position_x, b.position_y);
      ctx.strokeStyle = 'rgba(255, 220, 50, 0.3)';
      ctx.lineWidth = 14;
      ctx.stroke();
    }

    // Main line pass
    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.nodeMap.get(this.path[i]);
      const b = this.nodeMap.get(this.path[i + 1]);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.position_x, a.position_y);
      ctx.lineTo(b.position_x, b.position_y);
      ctx.strokeStyle = 'rgba(255, 230, 80, 0.95)';
      ctx.lineWidth = 7;
      ctx.stroke();
    }

    // Step number labels on path nodes (above the icon)
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    for (let i = 1; i < this.path.length; i++) {
      const node = this.nodeMap.get(this.path[i]);
      if (!node) continue;
      const label = String(i);
      const tw = ctx.measureText(label).width + 14;
      const ly = node.position_y - NODE_H - 16;
      ctx.fillStyle = 'rgba(160, 130, 0, 0.9)';
      ctx.beginPath();
      ctx.roundRect(node.position_x - tw / 2, ly, tw, 26, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, node.position_x, ly + 19);
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

      // Anchor at bottom-center: coordinate is the "ground", icon sits on top
      const x = node.position_x - NODE_W / 2;
      const y = node.position_y - NODE_H;

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
      const icon = this._iconForNode(node);
      if (icon && icon.complete && icon.naturalWidth > 0) {
        ctx.drawImage(icon, x, y, NODE_W, NODE_H);
      }

      // Visited shop → checkmark badge
      if (node.node_type === 8 && node.is_visited) {
        const bx = node.position_x + NODE_W / 2 - 4;
        const by = node.position_y - NODE_H + 4;
        ctx.beginPath();
        ctx.arc(bx, by, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#26a69a';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx - 4, by);
        ctx.lineTo(bx - 1, by + 3);
        ctx.lineTo(bx + 4, by - 3);
        ctx.stroke();
      }

      // Path highlight ring (centered on icon body)
      if (isOnPath && !isCurrent) {
        ctx.beginPath();
        ctx.arc(node.position_x, node.position_y - NODE_H / 2, NODE_W / 2 + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 230, 80, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Hover ring
      if (this.hoveredNode && this.hoveredNode.node_id === id) {
        ctx.beginPath();
        ctx.arc(node.position_x, node.position_y - NODE_H / 2, NODE_W / 2 + 8, 0, Math.PI * 2);
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

    // Anchor at bottom-center
    const x = node.position_x - PIECE_W / 2;
    const y = node.position_y - PIECE_H;

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

  /** Blinking large arrow above the player for a few seconds after focus. */
  _drawFocusArrow(ctx) {
    const now = Date.now();
    if (now >= this.focusArrowUntil || this.currentNodeId == null) return;
    const node = this.nodeMap.get(this.currentNodeId);
    if (!node) return;
    // Blink at ~2.5 Hz
    const t = now / 1000;
    const alpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 5));
    const x = node.position_x;
    const y = node.position_y - PIECE_H - 46;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Down-pointing triangle (arrow) pointing at the player
    const s = 26; // half-size
    ctx.beginPath();
    ctx.moveTo(x, y + s * 1.6);       // tip
    ctx.lineTo(x - s, y - s);         // left
    ctx.lineTo(x + s, y - s);         // right
    ctx.closePath();
    ctx.fillStyle = '#ffd54a';
    ctx.shadowColor = 'rgba(255,213,74,0.9)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();
  }

  _drawTooltip(ctx) {
    if (!this.hoveredNode) return;
    const node = this.hoveredNode;
    const screen = this._worldToScreen(node.position_x, node.position_y);

    const typeNames = { 0: 'Path', 1: 'Boss', 2: 'Battle', 3: 'Strong Foe', 4: 'Ruler', 5: 'Event', 6: 'Treasure', 7: 'Healing', 8: 'Shop', 9: 'Teleporter', 10: 'Special', 11: 'Terrifying' };
    const spNames = { 1: 'Cult Founder', 2: 'Cultist I', 3: 'Cultist II', 4: 'Floating Castle', 5: 'FC Portal I', 6: 'FC Portal II', 7: 'FC Portal III', 8: 'FC Researcher', 9: 'Clock Tower', 10: 'Flower Garden', 11: 'Prison', 12: 'Hot Spring', 13: 'Blacksmith', 14: 'Fort', 15: 'Cathedral', 16: 'Cave', 17: 'Stone Face', 18: 'Village' };

    let label;
    if (node.node_type === 10 && node.special_incident_id != null) {
      // Special event: show name instead of generic "Special [sp:N]"
      const spName = spNames[node.special_incident_id] || `Special ${node.special_incident_id}`;
      label = `#${node.node_id} ${spName}`;
    } else {
      label = `#${node.node_id} ${typeNames[node.node_type] || node.node_type}`;
    }
    if (node.is_visited) label += ' ✓';

    // Shop stock lines (if this shop node has been visited and stock captured)
    const stockLines = [];
    const stock = this.shopStock[node.node_id];
    const MAX_LINE = 64; // max chars per line; longer text is truncated
    const truncate = (s) => (s.length > MAX_LINE ? s.slice(0, MAX_LINE - 1) + '…' : s);
    // Guidebook names use '@@' as an in-game line break — collapse to a space
    const cleanName = (s) => truncate((s || '').replace(/@@/g, ' '));
    if (node.node_type === 8) {
      if (stock && stock.items && stock.items.length > 0) {
        stockLines.push(`— Stock (coin ${stock.coinAfter != null ? stock.coinAfter : '?'}) —`);
        const books = stock.items.filter(it => it.tab === 'book');
        const items = stock.items.filter(it => it.tab !== 'book');
        if (books.length > 0) stockLines.push('📖 Guidebooks:');
        for (const it of books) {
          const sold = it.stock <= 0 ? ' [SOLD OUT]' : '';
          stockLines.push(`  ${cleanName(it.name)} · ${it.price}c · x${it.stock}${sold}`);
        }
        if (items.length > 0) stockLines.push('🎒 Items:');
        for (const it of items) {
          const sold = it.stock <= 0 ? ' [SOLD OUT]' : '';
          const name = it.name || `item:${it.lineup_id}`;
          stockLines.push(`  ${cleanName(name)} · ${it.price}c · x${it.stock}${sold}`);
        }
      } else {
        stockLines.push('— not visited —');
      }
    }

    ctx.font = '12px system-ui';
    const allLines = [label, ...stockLines];
    // Cap tooltip height: show at most MAX_TOOLTIP_LINES, fold the rest
    const MAX_TOOLTIP_LINES = 15;
    let displayLines = allLines;
    let folded = 0;
    if (allLines.length > MAX_TOOLTIP_LINES) {
      displayLines = allLines.slice(0, MAX_TOOLTIP_LINES - 1);
      folded = allLines.length - displayLines.length;
      displayLines.push(`  … +${folded} more`);
    }
    const lineH = 16;
    const tw = Math.min(Math.max(...displayLines.map(l => ctx.measureText(l).width)) + 16, 480);
    const th = lineH * displayLines.length + 8;
    const dpr = this.dpr || 1;
    const cw = this.canvas.width / dpr;
    const tx = Math.min(screen.x + 18, cw - tw - 5);
    const ty = Math.max(screen.y - NODE_H * this.scale - 34 - (displayLines.length - 1) * lineH, 20);

    ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
    ctx.strokeStyle = 'rgba(100, 120, 140, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e6edf3';
    ctx.textAlign = 'left';
    displayLines.forEach((ln, i) => {
      ctx.fillStyle = i === 0 ? '#e6edf3' : (ln.includes('SOLD OUT') ? '#f85149' : '#c9d1d9');
      ctx.fillText(ln, tx + 8, ty + 16 + i * lineH);
    });
  }

  /** Center view on the player's current node */
  focusPlayer() {
    if (this.currentNodeId == null) return;
    const node = this.nodeMap.get(this.currentNodeId);
    if (!node) return;
    const dpr = this.dpr || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;
    this.offsetX = w / 2 - node.position_x * this.scale;
    this.offsetY = h / 2 - (node.position_y - NODE_H / 2) * this.scale;
    this.focusArrowUntil = Date.now() + 2500; // show blinking arrow 2.5s
    this.render();
  }

  resize(width, height, dpr) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.dpr = dpr || 1;
    this.render();
  }
}
