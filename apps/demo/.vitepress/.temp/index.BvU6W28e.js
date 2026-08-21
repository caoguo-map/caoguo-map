import maplibregl from "maplibre-gl";
var dark_default = {
  version: 8,
  name: "caoguo-dark",
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "caoguo-basemap": {
      type: "vector",
      url: "https://demotiles.maplibre.org/tiles/tiles.json",
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#0a0f1e" } },
    {
      id: "water",
      type: "fill",
      source: "caoguo-basemap",
      "source-layer": "water",
      paint: { "fill-color": "#0d1b2a", "fill-opacity": 0.9 }
    },
    {
      id: "landuse",
      type: "fill",
      source: "caoguo-basemap",
      "source-layer": "landuse",
      paint: { "fill-color": "#121a2e", "fill-opacity": 0.6 }
    },
    {
      id: "landcover",
      type: "fill",
      source: "caoguo-basemap",
      "source-layer": "landcover",
      paint: { "fill-color": "#0f1d16", "fill-opacity": 0.5 }
    },
    {
      id: "road-minor",
      type: "line",
      source: "caoguo-basemap",
      "source-layer": "roads",
      minzoom: 12,
      filter: ["==", ["get", "class"], "minor"],
      paint: { "line-color": "#1e293b", "line-width": 0.5 }
    },
    {
      id: "road-major",
      type: "line",
      source: "caoguo-basemap",
      "source-layer": "roads",
      filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "tertiary", "motorway"]]],
      paint: {
        "line-color": "#334155",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 2, 18, 6]
      }
    },
    {
      id: "road-label",
      type: "symbol",
      source: "caoguo-basemap",
      "source-layer": "roads",
      minzoom: 13,
      filter: ["has", "name"],
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-size": 11
      },
      paint: { "text-color": "#94a3b8", "text-halo-color": "#0a0f1e", "text-halo-width": 1.2 }
    },
    {
      id: "boundary",
      type: "line",
      source: "caoguo-basemap",
      "source-layer": "boundaries",
      paint: { "line-color": "#22d3ee", "line-width": 1, "line-dasharray": [2, 2], "line-opacity": 0.5 }
    },
    {
      id: "place-label",
      type: "symbol",
      source: "caoguo-basemap",
      "source-layer": "places",
      filter: ["has", "name"],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 10, 15]
      },
      paint: { "text-color": "#e5e7eb", "text-halo-color": "#0a0f1e", "text-halo-width": 1.4 }
    }
  ]
};
var light_default = {
  version: 8,
  name: "caoguo-light",
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "caoguo-basemap": {
      type: "vector",
      url: "https://demotiles.maplibre.org/tiles/tiles.json",
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#f8fafc" } },
    {
      id: "water",
      type: "fill",
      source: "caoguo-basemap",
      "source-layer": "water",
      paint: { "fill-color": "#bae6fd", "fill-opacity": 0.9 }
    },
    {
      id: "landuse",
      type: "fill",
      source: "caoguo-basemap",
      "source-layer": "landuse",
      paint: { "fill-color": "#e2e8f0", "fill-opacity": 0.6 }
    },
    {
      id: "landcover",
      type: "fill",
      source: "caoguo-basemap",
      "source-layer": "landcover",
      paint: { "fill-color": "#dcfce7", "fill-opacity": 0.5 }
    },
    {
      id: "road-minor",
      type: "line",
      source: "caoguo-basemap",
      "source-layer": "roads",
      minzoom: 12,
      filter: ["==", ["get", "class"], "minor"],
      paint: { "line-color": "#cbd5e1", "line-width": 0.5 }
    },
    {
      id: "road-major",
      type: "line",
      source: "caoguo-basemap",
      "source-layer": "roads",
      filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "tertiary", "motorway"]]],
      paint: {
        "line-color": "#94a3b8",
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 2, 18, 6]
      }
    },
    {
      id: "road-label",
      type: "symbol",
      source: "caoguo-basemap",
      "source-layer": "roads",
      minzoom: 13,
      filter: ["has", "name"],
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-size": 11
      },
      paint: { "text-color": "#475569", "text-halo-color": "#ffffff", "text-halo-width": 1.2 }
    },
    {
      id: "boundary",
      type: "line",
      source: "caoguo-basemap",
      "source-layer": "boundaries",
      paint: { "line-color": "#0284c7", "line-width": 1, "line-dasharray": [2, 2], "line-opacity": 0.5 }
    },
    {
      id: "place-label",
      type: "symbol",
      source: "caoguo-basemap",
      "source-layer": "places",
      filter: ["has", "name"],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 10, 15]
      },
      paint: { "text-color": "#0f172a", "text-halo-color": "#ffffff", "text-halo-width": 1.4 }
    }
  ]
};
var NOTO_FONTSTACKS = ["Noto Sans SC Regular", "Noto Sans SC Bold"];
function withNotoFonts(style) {
  const next = structuredClone(style);
  for (const layer of next.layers) {
    if (layer.type === "symbol" && layer.layout && "text-font" in layer.layout) {
      layer.layout["text-font"] = NOTO_FONTSTACKS;
    }
  }
  return next;
}
function buildStyle(theme, opts = {}) {
  var _a;
  let style = theme === "caoguo-dark" ? dark_default : light_default;
  if (opts.notoFonts) style = withNotoFonts(style);
  const next = structuredClone(style);
  const source = (_a = next.sources) == null ? void 0 : _a["caoguo-basemap"];
  if (opts.sourceUrl && source) source.url = opts.sourceUrl;
  if (opts.glyphs) next.glyphs = opts.glyphs;
  else if (source == null ? void 0 : source.glyphs) next.glyphs = source.glyphs;
  return next;
}
function injectTheme(name) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", name);
  }
}
var WUHAN_CENTER = [114.3055, 30.5928];
var WUHAN_ZOOM = 11;
function caoguoStyle(theme = "caoguo-dark") {
  return buildStyle(theme);
}
function osmRasterStyle() {
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "osm-raster": {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#0a0f1e" }
      },
      {
        id: "osm-raster",
        type: "raster",
        source: "osm-raster",
        paint: {
          "raster-opacity": 0.85,
          "raster-saturation": -0.6,
          "raster-brightness-max": 0.7,
          "raster-contrast": 0.1
        }
      }
    ]
  };
}
var LAYER_MAP = {
  vector: { base: "vec", label: "cva" },
  satellite: { base: "img", label: "cia" },
  terrain: { base: "ter", label: "cta" }
};
var LAYER_LABEL_EN = {
  cva: "eva",
  cia: "eia",
  cta: "eta"
};
function tiandituTileUrls(layer, opts) {
  const sub = opts.subdomains ?? [0, 1, 2, 3, 4, 5, 6, 7];
  const labelLayer = opts.lang === "en" ? LAYER_LABEL_EN[layer] ?? layer : layer;
  return sub.map(
    (s) => `https://t${s}.tianditu.gov.cn/${labelLayer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${labelLayer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${encodeURIComponent(opts.token)}`
  );
}
function buildTiandituSources(type, opts) {
  const { base, label } = LAYER_MAP[type];
  const tileSize = opts.tileSize ?? 256;
  const maxzoom = opts.maxzoom ?? 18;
  const attr = "© 天地图 GS(2023)3295号";
  return [
    {
      id: `tianditu-${base}`,
      isLabel: false,
      source: {
        type: "raster",
        tiles: tiandituTileUrls(base, opts),
        tileSize,
        maxzoom,
        attribution: attr
      }
    },
    {
      id: `tianditu-${label}`,
      isLabel: true,
      source: {
        type: "raster",
        tiles: tiandituTileUrls(label, opts),
        tileSize,
        maxzoom,
        attribution: attr
      }
    }
  ];
}
var MissingTokenError = class extends Error {
  constructor() {
    super("天地图 token 缺失：调用 addTiandituBaseMap 必须传入 tianditu: { token } 选项。");
    this.name = "MissingTokenError";
  }
};
function tiandituStyle(type, opts) {
  if (!opts.token) throw new MissingTokenError();
  const sources = buildTiandituSources(type, opts);
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: Object.fromEntries(
      sources.map((s) => [s.id, s.source])
    ),
    layers: sources.map((s) => ({
      id: s.id,
      type: "raster",
      source: s.id,
      // 注记层置于底图之上
      ...s.isLabel ? { minzoom: 0 } : {}
    }))
  };
}
function addTiandituBaseMap(opts) {
  if (!opts.token) throw new MissingTokenError();
  const type = opts.type ?? "vector";
  const sources = buildTiandituSources(type, opts);
  const map = opts.map;
  for (const s of sources) {
    if (!map.getSource(s.id)) {
      map.addSource(s.id, s.source);
    }
    if (!map.getLayer(s.id)) {
      map.addLayer({
        id: s.id,
        type: "raster",
        source: s.id
      });
    }
  }
}
var MemoryTileStore = class {
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  async get(key) {
    const t = this.map.get(key);
    if (!t) return void 0;
    if (t.expires && t.expires < Date.now()) {
      this.map.delete(key);
      return void 0;
    }
    return t;
  }
  async put(key, tile) {
    this.map.set(key, tile);
  }
  async has(key) {
    return await this.get(key) !== void 0;
  }
  async delete(key) {
    this.map.delete(key);
  }
  async clear(prefix) {
    if (!prefix) {
      this.map.clear();
      return;
    }
    for (const k of [...this.map.keys()]) {
      if (k.startsWith(prefix)) this.map.delete(k);
    }
  }
  async size() {
    return this.map.size;
  }
};
function tileKey(sourceId, z, x, y) {
  return `${sourceId}:${z}:${x}:${y}`;
}
var OFFLINE_PROTOCOL = "caoguo-offline";
function parseOfflineUrl(url) {
  const m = /^caoguo-offline:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)$/.exec(url);
  if (!m) return null;
  return {
    sourceId: decodeURIComponent(m[1]),
    z: Number(m[2]),
    x: Number(m[3]),
    y: Number(m[4])
  };
}
function offlineSourceTiles(sourceId) {
  return [`${OFFLINE_PROTOCOL}://${encodeURIComponent(sourceId)}/{z}/{x}/{y}`];
}
function toArrayBuffer(data) {
  if (data instanceof Uint8Array) {
    const out2 = new ArrayBuffer(data.byteLength);
    new Uint8Array(out2).set(data);
    return out2;
  }
  const src = data;
  const out = new ArrayBuffer(src.byteLength);
  new Uint8Array(out).set(new Uint8Array(src));
  return out;
}
function createOfflineLoader(ctx) {
  return (params) => {
    const url = params.url;
    const parsed = parseOfflineUrl(url);
    if (!parsed) {
      return Promise.reject(new Error(`非法离线 URL: ${url}`));
    }
    const key = tileKey(parsed.sourceId, parsed.z, parsed.x, parsed.y);
    return ctx.store.get(key).then((tile) => {
      if (!tile) {
        throw new Error(`离线瓦片缺失: ${key}`);
      }
      return { data: toArrayBuffer(tile.data) };
    });
  };
}
function registerOfflineProtocol(maplibregl2, ctx) {
  maplibregl2.addProtocol(OFFLINE_PROTOCOL, createOfflineLoader(ctx));
}
var MAX_ZOOM_DEFAULT = 14;
function lon2x(lon, z) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}
function lat2y(lat, z) {
  const rad = lat * Math.PI / 180;
  return Math.floor(
    (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z)
  );
}
function tileBounds(z, x, y) {
  const n = Math.pow(2, z);
  const lonWest = x / n * 360 - 180;
  const lonEast = (x + 1) / n * 360 - 180;
  const latNorth = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const latSouth = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  return [lonWest, latSouth, lonEast, latNorth];
}
function coordInTile(lon, lat, z, x, y) {
  const [w, s, e, n] = tileBounds(z, x, y);
  return lon >= w && lon <= e && lat >= s && lat <= n;
}
async function packGeoJSONToStore(store, opts) {
  var _a;
  const maxZoom = opts.maxZoom ?? MAX_ZOOM_DEFAULT;
  const expires = opts.expires ?? 0;
  const buckets = /* @__PURE__ */ new Map();
  for (const f of opts.geojson.features) {
    const g = f.geometry;
    const coords = [];
    if (g.type === "Point" || g.type === "Circle") {
      coords.push(g.coordinates);
    } else if (g.type === "LineString" || g.type === "MultiPoint") {
      coords.push(...g.coordinates);
    } else if (g.type === "Polygon" || g.type === "MultiLineString") {
      for (const ring of g.coordinates) coords.push(...ring);
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) {
        for (const ring of poly) coords.push(...ring);
      }
    }
    for (const [lon, lat] of coords) {
      for (let z = 0; z <= maxZoom; z++) {
        const x = lon2x(lon, z);
        const y = lat2y(lat, z);
        if (coordInTile(lon, lat, z, x, y)) {
          const k = tileKey(opts.sourceId, z, x, y);
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k).push(f);
        }
      }
    }
  }
  const total = buckets.size;
  let done = 0;
  for (const [k, features] of buckets) {
    const fc = { type: "FeatureCollection", features };
    const tile = {
      data: new TextEncoder().encode(JSON.stringify(fc)),
      format: "geojson",
      expires
    };
    await store.put(k, tile);
    done++;
    (_a = opts.onProgress) == null ? void 0 : _a.call(opts, done, total);
  }
  return total;
}
var dbPromise = null;
function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { openDB } = await import("./index.DM8teIR9.js");
      return openDB("caoguo-offline", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("tiles")) {
            const store = db.createObjectStore("tiles", { keyPath: "key" });
            store.createIndex("sourceId", "sourceId");
          }
        }
      });
    })();
  }
  return dbPromise;
}
var IdbTileStore = class {
  async get(key) {
    const db = await getDb();
    const row = await db.get("tiles", key);
    if (!row) return void 0;
    if (row.expires && row.expires < Date.now()) {
      await this.delete(key);
      return void 0;
    }
    return { data: row.data, format: row.format, expires: row.expires };
  }
  async put(key, tile) {
    const db = await getDb();
    const sourceId = key.split(":")[0];
    await db.put("tiles", {
      key,
      sourceId,
      data: tile.data,
      format: tile.format,
      expires: tile.expires
    });
  }
  async has(key) {
    return await this.get(key) !== void 0;
  }
  async delete(key) {
    const db = await getDb();
    await db.delete("tiles", key);
  }
  async clear(prefix) {
    const db = await getDb();
    if (!prefix) {
      await db.clear("tiles");
      return;
    }
    const tx = db.transaction("tiles", "readwrite");
    const idx = tx.store.index("sourceId");
    let cursor = await idx.openCursor(prefix);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
  async size() {
    const db = await getDb();
    return db.count("tiles");
  }
};
function createDefaultStore() {
  if (typeof indexedDB !== "undefined") {
    try {
      return new IdbTileStore();
    } catch {
    }
  }
  return new MemoryTileStore();
}
var PI = Math.PI;
var A = 6378245;
var EE = 0.006693421622965943;
function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}
function transformLat(lng, lat) {
  let ret = -100 + 2 * lng + 3 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2 / 3;
  ret += (20 * Math.sin(lat * PI) + 40 * Math.sin(lat / 3 * PI)) * 2 / 3;
  ret += (160 * Math.sin(lat / 12 * PI) + 320 * Math.sin(lat * PI / 30)) * 2 / 3;
  return ret;
}
function transformLng(lng, lat) {
  let ret = 300 + lng + 2 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20 * Math.sin(6 * lng * PI) + 20 * Math.sin(2 * lng * PI)) * 2 / 3;
  ret += (20 * Math.sin(lng * PI) + 40 * Math.sin(lng / 3 * PI)) * 2 / 3;
  ret += (150 * Math.sin(lng / 12 * PI) + 300 * Math.sin(lng / 30 * PI)) * 2 / 3;
  return ret;
}
function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105, lat - 35);
  let dLng = transformLng(lng - 105, lat - 35);
  const radLat = lat / 180 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = dLat * 180 / (A * (1 - EE) / (magic * sqrtMagic) * PI);
  dLng = dLng * 180 / (A / sqrtMagic * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}
function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) return [lng, lat];
  let [mlng, mlat] = wgs84ToGcj02(lng, lat);
  let dlng = mlng - lng;
  let dlat = mlat - lat;
  [mlng, mlat] = wgs84ToGcj02(lng - dlng, lat - dlat);
  dlng = mlng - lng;
  dlat = mlat - lat;
  [mlng, mlat] = wgs84ToGcj02(lng - dlng, lat - dlat);
  dlng = mlng - lng;
  dlat = mlat - lat;
  return [lng - dlng, lat - dlat];
}
function wgs84ToCgcs2000(lng, lat) {
  return [lng, lat];
}
function cgcs2000ToWgs84(lng, lat) {
  return [lng, lat];
}
function toWgs84(crs, lng, lat) {
  switch (crs) {
    case "WGS84":
      return [lng, lat];
    case "GCJ02":
      return gcj02ToWgs84(lng, lat);
    case "CGCS2000":
      return cgcs2000ToWgs84(lng, lat);
  }
}
function fromWgs84(crs, lng, lat) {
  switch (crs) {
    case "WGS84":
      return [lng, lat];
    case "GCJ02":
      return wgs84ToGcj02(lng, lat);
    case "CGCS2000":
      return wgs84ToCgcs2000(lng, lat);
  }
}
function createTransformer(from, to) {
  if (from === to) {
    const identity = (lng, lat) => [lng, lat];
    return { forward: identity, inverse: identity };
  }
  const forward = (lng, lat) => {
    const [wLng, wLat] = toWgs84(from, lng, lat);
    return fromWgs84(to, wLng, wLat);
  };
  const inverse = (lng, lat) => {
    const [wLng, wLat] = toWgs84(to, lng, lat);
    return fromWgs84(from, wLng, wLat);
  };
  return { forward, inverse };
}
var EARTH_RADIUS = 6378137;
function computeScaleBar(latitude, zoom, opts = {}) {
  const dpiScale = opts.dpiScale ?? 1;
  const maxWidth = opts.maxWidth ?? 100;
  const tileSize = opts.tileSize ?? 512;
  const latRad = latitude * Math.PI / 180;
  const metersPerPixel = Math.cos(latRad) * 2 * Math.PI * EARTH_RADIUS / (tileSize * Math.pow(2, zoom) * dpiScale);
  let meters = metersPerPixel * maxWidth;
  const pow = Math.pow(10, Math.floor(Math.log10(meters)));
  const base = meters / pow;
  const step = base >= 5 ? 5 : base >= 2 ? 2 : 1;
  meters = step * pow;
  const pixels = meters / metersPerPixel;
  const label = meters >= 1e3 ? `${(meters / 1e3).toLocaleString()} km` : `${Math.round(meters)} m`;
  return { meters, pixels, label };
}
var ScaleControl = class {
  constructor(map, options = {}) {
    var _a;
    this.onMove = (ev) => this.handleMove(ev);
    this.onZoom = () => this.update();
    this.map = map;
    this.opts = {
      showCoordinate: options.showCoordinate ?? true,
      maxWidth: options.maxWidth ?? 100
    };
    this.el = options.container ?? document.createElement("div");
    this.el.className = "caoguo-scale-control";
    this.el.style.cssText = "position:absolute;left:10px;bottom:24px;padding:4px 8px;background:rgba(10,15,30,.7);color:#cfe;border-radius:4px;font:12px/1.4 system-ui,sans-serif;pointer-events:none;z-index:2;";
    this.barEl = document.createElement("div");
    this.barEl.style.cssText = "height:6px;border:1px solid #cfe;border-top:none;margin-bottom:2px;";
    this.labelEl = document.createElement("div");
    if (this.opts.showCoordinate) {
      this.coordEl = document.createElement("div");
      this.coordEl.style.cssText = "opacity:.85;margin-top:2px;";
      this.el.append(this.barEl, this.labelEl, this.coordEl);
    } else {
      this.el.append(this.barEl, this.labelEl);
    }
    map.on("zoom", this.onZoom);
    map.on("move", this.onZoom);
    const canvas = (_a = map.getCanvas) == null ? void 0 : _a.call(map);
    canvas == null ? void 0 : canvas.addEventListener("mousemove", this.onMove);
  }
  /** 把控件挂到地图容器（无预设容器时调用） */
  addTo(container) {
    if (!this.el.parentElement) container.appendChild(this.el);
    this.update();
    return this;
  }
  /** 计算并刷新显示 */
  update() {
    const center = this.map.getCenter();
    const bar = computeScaleBar(center.lat, this.map.getZoom(), { maxWidth: this.opts.maxWidth });
    this.barEl.style.width = `${Math.round(bar.pixels)}px`;
    this.labelEl.textContent = bar.label;
  }
  handleMove(ev) {
    if (!this.coordEl) return;
    const e = ev;
    const ll = e.lngLat;
    if (!ll) return;
    this.coordEl.textContent = `${ll.lng.toFixed(5)}, ${ll.lat.toFixed(5)}`;
  }
  /** 移除控件与事件监听 */
  remove() {
    var _a, _b;
    this.map.off("zoom", this.onZoom);
    this.map.off("move", this.onZoom);
    const canvas = (_b = (_a = this.map).getCanvas) == null ? void 0 : _b.call(_a);
    canvas == null ? void 0 : canvas.removeEventListener("mousemove", this.onMove);
    this.el.remove();
  }
};
function oppositeTheme(theme) {
  return theme === "caoguo-dark" ? "caoguo-light" : "caoguo-dark";
}
function themeFromStyle(style, fallback = "caoguo-dark") {
  if (!style) return fallback;
  const name = typeof style === "string" ? style : style.name;
  if (name === "caoguo-dark" || name === "caoguo-light") return name;
  return fallback;
}
var ThemeSwitcher = class {
  constructor(map, options = {}) {
    var _a;
    this.map = map;
    this.current = options.initial ?? themeFromStyle((_a = map.getStyle) == null ? void 0 : _a.call(map), "caoguo-dark");
    this.el = options.container ?? document.createElement("div");
    this.el.className = "caoguo-theme-switcher";
    this.el.style.cssText = "position:absolute;right:10px;top:10px;z-index:3;";
    this.btn = document.createElement("button");
    this.btn.type = "button";
    this.applyLabel();
    this.btn.style.cssText = "cursor:pointer;padding:4px 10px;border:1px solid #2a3550;border-radius:6px;background:rgba(10,15,30,.7);color:#cfe;font:12px system-ui,sans-serif;";
    this.btn.addEventListener("click", () => this.toggle());
    this.el.append(this.btn);
  }
  applyLabel() {
    this.btn.textContent = this.current === "caoguo-dark" ? "🌙 暗色" : "☀ 亮色";
  }
  /** 当前主题 */
  getTheme() {
    return this.current;
  }
  /** 切换到指定主题（保留视图，diff 模式避免闪烁） */
  setTheme(theme) {
    if (theme === this.current) return;
    this.current = theme;
    this.applyLabel();
    this.map.setStyle(caoguoStyle(theme), { diff: true });
  }
  /** 在明暗之间切换 */
  toggle() {
    this.setTheme(oppositeTheme(this.current));
  }
  /** 挂到容器 */
  addTo(container) {
    if (!this.el.parentElement) container.appendChild(this.el);
    return this;
  }
  /** 移除 */
  remove() {
    this.btn.removeEventListener("click", () => this.toggle());
    this.el.remove();
  }
};
function glowPasses(passes = 4, coreOpacity = 1) {
  if (passes < 1) passes = 1;
  const out = [];
  for (let i = 0; i < passes; i++) {
    const t = passes === 1 ? 1 : 1 - i / (passes - 1);
    out.push({
      widthScale: 1 + (1 - t) * (passes - 1) * 1.5,
      opacity: coreOpacity * (0.12 + 0.88 * t)
    });
  }
  return out;
}
function projectSimple(lng, lat) {
  const x = lng / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI;
  return [x, Math.max(-1, Math.min(1, y))];
}
function buildGlowGeometry(lines, opts = {}) {
  const passes = glowPasses(opts.passes ?? 4, opts.coreOpacity ?? 1);
  let vertexCount = 0;
  const projected = lines.map((l) => {
    const points = l.coordinates.map(([lng, lat]) => projectSimple(lng, lat));
    vertexCount += Math.max(0, points.length - 1) * 2;
    return { points, group: l.group };
  });
  return { lines: projected, passes, vertexCount };
}
var DEFAULT_COLORS = {
  pipe: [0.2, 0.85, 1],
  // 青蓝：管线
  road: [0.6, 0.7, 0.9],
  // 灰蓝：路网
  water: [0.25, 0.55, 0.95]
  // 深蓝：水系
};
var VERT = `
attribute vec2 aPos;
attribute float aMiter;
uniform mat4 uMatrix;
uniform float uWidth;
uniform vec2 uResolution;
void main() {
  // 简化：沿法线方向偏移 width（屏幕空间），这里仅演示核心投影
  vec4 clip = uMatrix * vec4(aPos, 0.0, 1.0);
  vec2 screen = clip.xy / clip.w;
  // 注：精确线宽需法线计算，示范层用点宽近似
  vec2 offset = vec2(aMiter * uWidth / uResolution.x * 2.0, 0.0);
  gl_Position = vec4(screen + offset * clip.w, clip.z, clip.w);
}
`;
var FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  gl_FragColor = vec4(uColor, uOpacity);
}
`;
function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}
var CustomLineLayer = class {
  constructor(opts) {
    this.type = "custom";
    this.renderingMode = "2d";
    this.id = opts.id ?? "caoguo-glow-line";
    this.lines = opts.lines;
    this.colors = { ...DEFAULT_COLORS, ...opts.colors };
    this.baseWidth = opts.baseWidth ?? 3;
    this.passes = opts.passes ?? 4;
    this.geometry = buildGlowGeometry(this.lines, { passes: this.passes });
  }
  onAdd(map, gl) {
    this.map = map;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    this.program = prog;
    const verts = [];
    for (const line of this.geometry.lines) {
      const pts = line.points;
      for (let i = 0; i < pts.length - 1; i++) {
        verts.push(pts[i][0], pts[i][1], 0, pts[i + 1][0], pts[i + 1][1], 0);
      }
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    this.buffer = buf;
  }
  render(gl, matrix) {
    var _a, _b;
    if (!this.program || !this.buffer) return;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const aPos = gl.getAttribLocation(this.program, "aPos");
    const aMiter = gl.getAttribLocation(this.program, "aMiter");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(aMiter);
    gl.vertexAttribPointer(aMiter, 1, gl.FLOAT, false, 24, 16);
    const uMatrix = gl.getUniformLocation(this.program, "uMatrix");
    gl.uniformMatrix4fv(uMatrix, false, new Float32Array(matrix));
    const uWidth = gl.getUniformLocation(this.program, "uWidth");
    const uColor = gl.getUniformLocation(this.program, "uColor");
    const uOpacity = gl.getUniformLocation(this.program, "uOpacity");
    const uRes = gl.getUniformLocation(this.program, "uResolution");
    const canvas = (_a = this.map) == null ? void 0 : _a.getCanvas();
    gl.uniform2f(uRes, (canvas == null ? void 0 : canvas.width) ?? 1024, (canvas == null ? void 0 : canvas.height) ?? 768);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    const color = this.colors[((_b = this.lines[0]) == null ? void 0 : _b.group) ?? "pipe"] ?? this.colors.pipe;
    for (const pass of this.geometry.passes) {
      gl.uniform1f(uWidth, this.baseWidth * pass.widthScale);
      gl.uniform3f(uColor, color[0], color[1], color[2]);
      gl.uniform1f(uOpacity, pass.opacity);
      gl.drawArrays(gl.LINES, 0, this.geometry.vertexCount);
    }
  }
  onRemove(_map, gl) {
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    this.buffer = void 0;
    this.program = void 0;
  }
};
function resolveLod(zoom, levels) {
  let best = null;
  for (const lv of levels) {
    const max = lv.maxZoom ?? Infinity;
    if (zoom >= lv.minZoom && zoom <= max) {
      if (!best || lv.minZoom > best.minZoom) best = lv;
    }
  }
  return best;
}
var LodController = class {
  constructor(map, levels, onChange) {
    this.current = null;
    this.map = map;
    this.levels = levels;
    this.onChange = onChange;
    this.handler = () => this.evaluate(false);
    map.on("zoom", this.handler);
    map.on("move", this.handler);
  }
  /** 立即评估当前 zoom 并（按需）触发回调 */
  evaluate(force = false) {
    var _a;
    const zoom = this.map.getZoom();
    const next = resolveLod(zoom, this.levels);
    if (!next) return this.current;
    const changed = force || next.id !== ((_a = this.current) == null ? void 0 : _a.id);
    if (changed || force) {
      this.current = next;
      this.onChange({ level: next, changed, zoom });
    }
    return next;
  }
  /** 当前等级 */
  getLevel() {
    return this.current;
  }
  /** 更新分级配置（如权限/数据就绪后） */
  setLevels(levels) {
    this.levels = levels;
    this.evaluate(false);
  }
  /** 卸载监听 */
  remove() {
    this.map.off("zoom", this.handler);
    this.map.off("move", this.handler);
  }
};
var Map$1 = class Map2 {
  constructor(options) {
    this._store = createDefaultStore();
    this._dataCRS = options.dataCRS ?? "WGS84";
    this._map = new maplibregl.Map({
      container: options.container,
      center: options.center ?? WUHAN_CENTER,
      zoom: options.zoom ?? WUHAN_ZOOM,
      style: options.style ?? osmRasterStyle(),
      pitch: options.pitch ?? 0,
      bearing: options.bearing ?? 0,
      attributionControl: { compact: true }
    });
  }
  /**
   * 把业务坐标系坐标转换到地图渲染基准（WGS84）。
   * 用于叠加 GCJ-02 / CGCS2000 数据前的纠偏。
   */
  transformToMap(lng, lat) {
    return toWgs84(this._dataCRS, lng, lat);
  }
  /** 设定叠加数据坐标系 */
  setDataCRS(crs) {
    this._dataCRS = crs;
  }
  /** 读取叠加数据坐标系 */
  getDataCRS() {
    return this._dataCRS;
  }
  /** 生成当前 dataCRS -> WGS84 的变换器（供批量转换使用） */
  getTransformer() {
    return createTransformer(this._dataCRS, "WGS84");
  }
  /**
   * 切换为底图为天地图（国内权威底图，CGCS2000 / Web Mercator）。
   * token 必须由调用方注入，缺失时抛出 MissingTokenError。
   */
  useTianditu(type, opts) {
    this._map.setStyle(tiandituStyle(type, opts));
  }
  /** 向当前地图注入天地图底图（叠加在现有 style 之上） */
  addTianditu(opts) {
    addTiandituBaseMap({ ...opts, map: this._map });
  }
  /** 注册离线协议并启用离线瓦片读取（F-1.4） */
  enableOffline(store) {
    if (store) this._store = store;
    registerOfflineProtocol(maplibregl, { store: this._store });
  }
  /** 当前离线存储实例 */
  getOfflineStore() {
    return this._store;
  }
  /** 构造离线源 tiles（供 source.tiles 使用） */
  offlineTiles(sourceId) {
    return offlineSourceTiles(sourceId);
  }
  /** 把 GeoJSON 打包进离线存储（分桶到瓦片网格） */
  async packGeoJSON(sourceId, geojson, opts = {}) {
    return packGeoJSONToStore(this._store, {
      sourceId,
      geojson,
      maxZoom: opts.maxZoom,
      expires: opts.expires
    });
  }
  addLayer(layer) {
    this._map.addLayer(layer);
  }
  removeLayer(id) {
    if (this._map.getLayer(id)) this._map.removeLayer(id);
  }
  on(event, layerId, cb) {
    if (cb && layerId) this._map.on(event, layerId, cb);
    else this._map.on(event, cb);
  }
  addSource(id, source) {
    this._map.addSource(id, source);
  }
  getSource(id) {
    return this._map.getSource(id);
  }
  flyTo(opts) {
    this._map.flyTo(opts);
  }
  remove() {
    this._map.remove();
  }
  /**
   * 挂载比例尺 + 实时坐标控件（T8 / F-1.8）。
   * 返回控件实例，可调用 .remove() 卸载。
   */
  addScaleControl(options) {
    const ctrl = new ScaleControl(this._map, options);
    const container = this._map.getContainer();
    ctrl.addTo(container);
    return ctrl;
  }
  /**
   * 挂载主题切换控件（T8 / F-1.9），在 caoguo-dark / caoguo-light 间切换。
   * 返回控件实例，可调用 .toggle() / .setTheme() / .remove()。
   */
  addThemeSwitcher(initial) {
    const ctrl = new ThemeSwitcher(this._map, { initial });
    const container = this._map.getContainer();
    ctrl.addTo(container);
    return ctrl;
  }
  /**
   * 挂载辉光管线 Custom Layer（T6 / F-1.3）。
   * 传入 GeoJSON 线集合，叠加渲染管线/路网/水系辉光效果。
   * @returns 图层 id（可用于 removeLayer）
   */
  addGlowLayer(opts) {
    const layer = new CustomLineLayer(opts);
    this._map.addLayer(layer);
    return layer.id;
  }
  /**
   * 挂载 LOD 控制器（T7 / F-1.7）。
   * 随 zoom 切换数据密度等级，并在等级变化时回调（调用方据此 setData / 切源）。
   * @returns LodController 实例（可 .getLevel() / .remove()）
   */
  addLodController(levels, onLod) {
    const ctrl = new LodController(this._map, levels, onLod);
    ctrl.evaluate(true);
    return ctrl;
  }
  get instance() {
    return this._map;
  }
};
export {
  Map$1 as M,
  WUHAN_CENTER as W,
  injectTheme as i
};
