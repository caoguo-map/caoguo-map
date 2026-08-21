function haversine(lng1, lat1, lng2, lat2) {
  const R = 6371e3;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function buildGridAdjacency(dataset) {
  var _a, _b;
  const adj = /* @__PURE__ */ new Map();
  const deviceById2 = new Map(dataset.devices.map((d) => [d.id, d]));
  for (const d of dataset.devices) {
    if (!adj.has(d.id)) adj.set(d.id, []);
  }
  for (const line of dataset.lines) {
    const from = deviceById2.get(line.fromDevice);
    const to = deviceById2.get(line.toDevice);
    const len = line.length && line.length > 0 ? line.length : from && to ? haversine(from.lng, from.lat, to.lng, to.lat) : 0;
    (_a = adj.get(line.fromDevice)) == null ? void 0 : _a.push({ lineId: line.id, to: line.toDevice, length: len });
    (_b = adj.get(line.toDevice)) == null ? void 0 : _b.push({ lineId: line.id, to: line.fromDevice, length: len });
  }
  return adj;
}
function gridBfs(adj, dataset, start, direction = "both", maxDepth = 1e3) {
  const visited = /* @__PURE__ */ new Set();
  const queue = [{ id: start, depth: 0 }];
  visited.add(start);
  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= maxDepth) continue;
    const edges = adj.get(id) ?? [];
    for (const e of edges) {
      if (visited.has(e.to)) continue;
      const line = dataset.lines.find((l) => l.id === e.lineId);
      if (direction === "downstream" && line && line.toDevice === id) continue;
      if (direction === "upstream" && line && line.fromDevice === id) continue;
      visited.add(e.to);
      queue.push({ id: e.to, depth: depth + 1 });
    }
  }
  return visited;
}
function deviceById(dataset, id) {
  return dataset.devices.find((d) => d.id === id);
}
export {
  buildGridAdjacency as b,
  deviceById as d,
  gridBfs as g
};
