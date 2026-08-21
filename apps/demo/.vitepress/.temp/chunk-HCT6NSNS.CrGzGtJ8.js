var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
function buildAdjacency(dataset) {
  const adj = /* @__PURE__ */ new Map();
  for (const node of dataset.nodes) {
    if (!adj.has(node.id)) adj.set(node.id, []);
  }
  for (const pipe of dataset.pipes) {
    const len = pipe.length ?? pipeLengthFromGeometry(pipe, dataset.nodes) ?? 0;
    const fromList = adj.get(pipe.fromNode) ?? [];
    fromList.push({
      pipeId: pipe.id,
      to: pipe.toNode,
      length: len
    });
    adj.set(pipe.fromNode, fromList);
    const toList = adj.get(pipe.toNode) ?? [];
    toList.push({
      pipeId: pipe.id,
      to: pipe.fromNode,
      length: len
    });
    adj.set(pipe.toNode, toList);
  }
  return adj;
}
function pipeLengthFromGeometry(pipe, nodes) {
  if (pipe.length && pipe.length > 0) return pipe.length;
  if (pipe.geometry && pipe.geometry.length >= 2) {
    let total = 0;
    for (let i = 1; i < pipe.geometry.length; i++) {
      total += haversine(
        pipe.geometry[i - 1][0],
        pipe.geometry[i - 1][1],
        pipe.geometry[i][0],
        pipe.geometry[i][1]
      );
    }
    return total;
  }
  const from = nodes.find((n) => n.id === pipe.fromNode);
  const to = nodes.find((n) => n.id === pipe.toNode);
  if (!from || !to) return 0;
  return haversine(from.lng, from.lat, to.lng, to.lat);
}
function haversine(lng1, lat1, lng2, lat2) {
  const R = 6371e3;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function bfs(adj, start, opts = {}) {
  const visited = [];
  const parents = /* @__PURE__ */ new Map();
  const visitedSet = /* @__PURE__ */ new Set();
  if (!adj.has(start)) {
    parents.set(start, null);
    return { visited, parents, start };
  }
  if (opts.allowStart && !opts.allowStart(start)) {
    return { visited: [], parents, start };
  }
  const queue = [{ id: start, depth: 0 }];
  parents.set(start, null);
  visitedSet.add(start);
  visited.push(start);
  let foundEnd;
  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (opts.until && opts.until(id)) {
      foundEnd = id;
      break;
    }
    if (opts.maxDepth !== void 0 && depth >= opts.maxDepth) continue;
    const edges = adj.get(id) ?? [];
    for (const e of edges) {
      if (opts.allowEdge && !opts.allowEdge(e, id, e.to)) continue;
      if (visitedSet.has(e.to)) continue;
      visitedSet.add(e.to);
      parents.set(e.to, id);
      visited.push(e.to);
      queue.push({ id: e.to, depth: depth + 1 });
    }
  }
  return { visited, parents, start, end: foundEnd };
}
function findPaths(adj, start, end, opts = {}) {
  const maxPaths = opts.maxPaths ?? 3;
  const maxDepth = opts.maxDepth ?? 20;
  const all = [];
  const path = [];
  const onPath = /* @__PURE__ */ new Set();
  const dfsLocal = (cur) => {
    if (all.length >= maxPaths) return;
    if (cur === end) {
      all.push([...path]);
      return;
    }
    if (path.length >= maxDepth) return;
    onPath.add(cur);
    path.push(cur);
    const edges = adj.get(cur) ?? [];
    for (const e of edges) {
      if (onPath.has(e.to)) continue;
      dfsLocal(e.to);
      if (all.length >= maxPaths) return;
    }
    path.pop();
    onPath.delete(cur);
  };
  dfsLocal(start);
  return all;
}
function dijkstra(adj, start, end, opts = {}) {
  if (!adj.has(start) || !adj.has(end)) {
    return { distance: Infinity, path: [], found: false };
  }
  const weight = opts.weight ?? ((e) => e.length || 1);
  const dist = /* @__PURE__ */ new Map();
  const parents = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
  const pq = [{ id: start, d: 0 }];
  for (const n of adj.keys()) {
    dist.set(n, Infinity);
    parents.set(n, null);
  }
  dist.set(start, 0);
  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const cur2 = pq.shift();
    if (visited.has(cur2.id)) continue;
    visited.add(cur2.id);
    if (cur2.id === end) break;
    const edges = adj.get(cur2.id) ?? [];
    for (const e of edges) {
      if (visited.has(e.to)) continue;
      const w = weight(e);
      const alt = (dist.get(cur2.id) ?? Infinity) + w;
      if (alt < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, alt);
        parents.set(e.to, cur2.id);
        pq.push({ id: e.to, d: alt });
      }
    }
    if (opts.until && opts.until(cur2.id, cur2.d)) break;
  }
  if ((dist.get(end) ?? Infinity) === Infinity) {
    return { distance: Infinity, path: [], found: false };
  }
  const path = [];
  let cur = end;
  while (cur) {
    path.unshift(cur);
    const p = parents.get(cur);
    if (p === void 0) break;
    cur = p;
  }
  return { distance: dist.get(end) ?? 0, path, found: true };
}
function simulateBurst(dataset, pipeId, opts = {}) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const scenario = opts.scenario ?? "gas";
  const skipClosed = opts.skipClosedValves ?? true;
  const maxAlt = opts.maxAlternatives ?? 2;
  const pipe = dataset.pipes.find((p) => p.id === pipeId);
  if (!pipe) {
    throw new Error(`BurstSimulator: pipe '${pipeId}' not found in dataset`);
  }
  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n]));
  const adj = buildAdjacency(dataset);
  const upstreamValves = findValvesFromEndpoint(adj, pipe, dataset, pipe.fromNode, skipClosed);
  const downstreamValves = findValvesFromEndpoint(adj, pipe, dataset, pipe.toNode, skipClosed);
  const candidateClose = mergeCandidateValves(upstreamValves, downstreamValves);
  const closedSet = new Set(candidateClose.map((v) => v.id));
  const downstream = bfs(adj, pipe.toNode, {
    allowEdge: (_e, _f, to) => {
      if (closedSet.has(to)) return false;
      return true;
    },
    maxDepth: 1e3
  });
  const affectedSet = new Set(downstream.visited);
  affectedSet.add(pipe.fromNode);
  const affectedNodes = [];
  for (const id of affectedSet) {
    const n = nodeById.get(id);
    if (n) affectedNodes.push(n);
  }
  const affectedPipes = dataset.pipes.filter(
    (p) => affectedSet.has(p.fromNode) || affectedSet.has(p.toNode)
  );
  const users = dataset.users ?? [];
  const affectedUsers = users.filter((u) => {
    if (!u.nodeId) return false;
    return affectedSet.has(u.nodeId);
  });
  const importantUsers = affectedUsers.filter((u) => u.kind === "important");
  const impactArea = computeImpactArea(affectedNodes, affectedPipes);
  const valvePlan = buildValvePlan(
    adj,
    dataset,
    pipe,
    candidateClose,
    affectedNodes,
    maxAlt,
    scenario
  );
  const durationMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return {
    pipe,
    affectedNodes,
    affectedPipes,
    affectedUsers,
    affectedUserCount: affectedUsers.length,
    importantUsers,
    impactArea,
    valvePlan,
    durationMs
  };
}
function findValvesFromEndpoint(adj, pipe, dataset, startId, skipClosed) {
  var _a, _b;
  const faultPipeId = pipe.id;
  const nodeById = new Map(dataset.nodes.map((n) => [n.id, n]));
  const out = [];
  const endpoint = startId === pipe.fromNode ? "from" : "to";
  const startNode = nodeById.get(startId);
  if (!startNode) return [];
  if (startNode.kind === "valve") {
    if (!skipClosed || ((_a = startNode.properties) == null ? void 0 : _a.valveStatus) !== "closed") {
      out.push({ node: startNode, hops: 0, distance: 0, endpoint });
    }
    return out;
  }
  const visited = /* @__PURE__ */ new Set();
  const queue = [
    { id: startId, hops: 0, dist: 0 }
  ];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    const n = nodeById.get(cur.id);
    if (!n) continue;
    if (n.kind === "valve" && (!skipClosed || ((_b = n.properties) == null ? void 0 : _b.valveStatus) !== "closed")) {
      out.push({ node: n, hops: cur.hops, distance: cur.dist, endpoint });
      return out;
    }
    const edges = adj.get(cur.id) ?? [];
    for (const e of edges) {
      if (e.pipeId === faultPipeId) continue;
      if (visited.has(e.to)) continue;
      queue.push({
        id: e.to,
        hops: cur.hops + 1,
        dist: cur.dist + (e.length || 0)
      });
    }
  }
  return out;
}
function mergeCandidateValves(upstream, downstream) {
  const seen = /* @__PURE__ */ new Set();
  const all = [...upstream, ...downstream].sort((a, b) => a.distance - b.distance);
  const out = [];
  for (const c of all) {
    if (seen.has(c.node.id)) continue;
    seen.add(c.node.id);
    out.push(c.node);
  }
  return out;
}
function computeImpactArea(nodes, pipes) {
  const features = [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [n.lng, n.lat] },
      properties: { kind: "node" }
    });
  }
  for (const p of pipes) {
    let coords = [];
    if (p.geometry && p.geometry.length >= 2) {
      coords = p.geometry;
    } else {
      const from = nodeById.get(p.fromNode);
      const to = nodeById.get(p.toNode);
      if (from && to) coords = [[from.lng, from.lat], [to.lng, to.lat]];
    }
    if (coords.length >= 2) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: { kind: "pipe" }
      });
    }
  }
  const hull = convexHull(nodes.map((n) => [n.lng, n.lat]));
  return { type: "FeatureCollection", features, hull };
}
function buildValvePlan(adj, dataset, pipe, closeValves, _affectedNodes, maxAlt, scenario) {
  var _a;
  const closeSet = new Set(closeValves.map((v) => v.id));
  const openValves = [];
  for (const n of _affectedNodes) {
    if (n.kind !== "valve") continue;
    if (closeSet.has(n.id)) continue;
    if (((_a = n.properties) == null ? void 0 : _a.valveStatus) !== "open") continue;
    const from = dataset.nodes.find((m) => m.id === pipe.fromNode);
    const to = dataset.nodes.find((m) => m.id === pipe.toNode);
    if (!from || !to) continue;
    const d1 = haversine(n.lng, n.lat, from.lng, from.lat);
    const d2 = haversine(n.lng, n.lat, to.lng, to.lat);
    if (Math.min(d1, d2) < 1e3) openValves.push(n);
  }
  const alternativePaths = [];
  if (closeValves.length) {
    const sources = dataset.nodes.filter((n) => n.kind === "source");
    for (const s of sources) {
      const r = dijkstra(adj, closeValves[0].id, s.id, {
        weight: (e) => closeSet.has(e.to) ? Infinity : e.length || 1
      });
      if (r.found) {
        const paths = findPaths(adj, closeValves[0].id, s.id, {
          maxPaths: maxAlt,
          maxDepth: 20
        });
        for (const p of paths) alternativePaths.push(p);
        break;
      }
    }
  }
  const userCount = (dataset.users ?? []).filter(
    (u) => _affectedNodes.some((n) => n.id === u.nodeId)
  ).length;
  const baseHours = userCount / 200;
  const scenarioFactor = scenario === "water" ? 1.5 : scenario === "heating" ? 2 : 1;
  const hours = Math.max(0.5, Math.min(8, baseHours * scenarioFactor));
  const estimatedShutdownTime = hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(hours * 60)}min`;
  const summary = buildSummary(closeValves, openValves, userCount, scenario);
  return {
    closeValves,
    openValves,
    alternativePaths,
    estimatedShutdownTime,
    summary
  };
}
function buildSummary(closeValves, openValves, userCount, scenario) {
  const labels = {
    gas: "停气",
    water: "停水",
    drainage: "排水中断",
    heating: "停热"
  };
  const label = labels[scenario] ?? "受影响";
  const parts = [];
  parts.push(`预计${label}${userCount}户`);
  if (closeValves.length) {
    parts.push(`关闭阀门 ${closeValves.map((v) => {
      var _a;
      return ((_a = v.properties) == null ? void 0 : _a.code) ?? v.id;
    }).join(", ")}`);
  } else {
    parts.push("未找到上游隔离阀门（建议人工指定）");
  }
  if (openValves.length) {
    parts.push(`打开阀门 ${openValves.map((v) => {
      var _a;
      return ((_a = v.properties) == null ? void 0 : _a.code) ?? v.id;
    }).join(", ")}（泄压）`);
  }
  return parts.join("；");
}
function convexHull(points) {
  if (points.length < 3) return [...points];
  const pts = [...points];
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}
function toMapLayerData(result) {
  const hull = result.impactArea.hull;
  const hullPolygon = hull.length >= 3 ? {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [hull] },
    properties: { score: 1, affected: result.affectedUserCount }
  } : null;
  const nodeCoords = /* @__PURE__ */ new Map();
  for (const n of result.affectedNodes) nodeCoords.set(n.id, n);
  const affectedPipes = {
    type: "FeatureCollection",
    features: result.affectedPipes.map((p) => ({
      type: "Feature",
      geometry: pipeToLineString(p, nodeCoords),
      properties: { pipeId: p.id, scenario: "affected" }
    })).filter((f) => f.geometry.coordinates.length >= 2)
  };
  const affectedNodes = {
    type: "FeatureCollection",
    features: result.affectedNodes.map((n) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [n.lng, n.lat] },
      properties: { nodeId: n.id, kind: n.kind }
    }))
  };
  return { hullPolygon, affectedPipes, affectedNodes };
}
function pipeToLineString(p, nodes) {
  if (p.geometry && p.geometry.length >= 2) {
    return { type: "LineString", coordinates: p.geometry };
  }
  const from = nodes.get(p.fromNode);
  const to = nodes.get(p.toNode);
  if (from && to) {
    return {
      type: "LineString",
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat]
      ]
    };
  }
  return { type: "LineString", coordinates: [] };
}
var BurstSimulator = class {
  constructor(options) {
    __publicField(this, "map");
    __publicField(this, "dataset");
    __publicField(this, "scenario");
    __publicField(this, "affectedPipePaint");
    __publicField(this, "affectedNodePaint");
    __publicField(this, "valvePaint");
    __publicField(this, "hullPaint");
    __publicField(this, "layerPrefix");
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "lastResult", null);
    __publicField(this, "layerIds", []);
    this.map = options.map;
    this.dataset = options.dataset;
    this.scenario = options.scenario ?? "gas";
    this.affectedPipePaint = options.affectedPipePaint ?? {
      "line-color": "#ef4444",
      "line-width": 4,
      "line-opacity": 0.85,
      "line-blur": 1.5
    };
    this.affectedNodePaint = options.affectedNodePaint ?? {
      "circle-radius": 6,
      "circle-color": "#ef4444",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff"
    };
    this.valvePaint = options.valvePaint ?? {
      "circle-radius": 8,
      "circle-color": "#fbbf24",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#000000"
    };
    this.hullPaint = options.hullPaint ?? {
      "fill-color": "#ef4444",
      "fill-opacity": 0.15,
      "fill-outline-color": "#ef4444"
    };
    this.layerPrefix = options.layerPrefix ?? "cg-burst";
  }
  /** 触发爆管推演 */
  simulate(pipeId, overrideOpts) {
    const result = simulateBurst(this.dataset, pipeId, {
      scenario: (overrideOpts == null ? void 0 : overrideOpts.scenario) ?? this.scenario,
      skipClosedValves: (overrideOpts == null ? void 0 : overrideOpts.skipClosedValves) ?? true,
      maxAlternatives: (overrideOpts == null ? void 0 : overrideOpts.maxAlternatives) ?? 2
    });
    this.lastResult = result;
    this.render(result);
    for (const l of this.listeners) l(result);
    return result;
  }
  /** 清空所有受影响区域图层 */
  clear() {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
  /** 销毁并清空所有资源 */
  destroy() {
    this.clear();
    this.listeners.clear();
    this.lastResult = null;
  }
  /** 订阅推演结果 */
  onResult(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  /** 取最后一次结果 */
  getLastResult() {
    return this.lastResult;
  }
  // ------------------------------------------------------
  // 内部：把结果渲染为 MapLibre 图层
  // ------------------------------------------------------
  render(result) {
    this.clear();
    const layerData = toMapLayerData(result);
    const mlMap = this.map.instance;
    const prefix = this.layerPrefix;
    const sourcesToAdd = [];
    const layersToAdd = [];
    if (layerData.hullPolygon) {
      sourcesToAdd.push({ id: `${prefix}-hull-src`, data: layerData.hullPolygon });
      layersToAdd.push({
        id: `${prefix}-hull-fill`,
        type: "fill",
        source: `${prefix}-hull-src`,
        paint: this.hullPaint
      });
    }
    sourcesToAdd.push({ id: `${prefix}-pipes-src`, data: layerData.affectedPipes });
    layersToAdd.push({
      id: `${prefix}-pipes-line`,
      type: "line",
      source: `${prefix}-pipes-src`,
      paint: this.affectedPipePaint
    });
    sourcesToAdd.push({ id: `${prefix}-nodes-src`, data: layerData.affectedNodes });
    layersToAdd.push({
      id: `${prefix}-nodes-pt`,
      type: "circle",
      source: `${prefix}-nodes-src`,
      paint: this.affectedNodePaint
    });
    for (const src of sourcesToAdd) {
      if (!mlMap.getSource(src.id)) mlMap.addSource(src.id, src.data);
    }
    for (const layer of layersToAdd) {
      try {
        mlMap.addLayer(layer);
        this.layerIds.push(layer.id);
      } catch {
      }
    }
  }
};
export {
  BurstSimulator as B
};
