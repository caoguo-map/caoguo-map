var ROAD_CLASS_COLORS = {
  highway: "#f59e0b",
  // 高速 橙色
  national: "#ef4444",
  // 国道 红色
  provincial: "#8b5cf6",
  // 省道 紫色
  urban: "#6b7280"
  // 城市道路 灰色
};
var ROAD_CLASS_LABELS = {
  highway: "高速",
  national: "国道",
  provincial: "省道",
  urban: "城市道路"
};
var ROAD_STATUS_COLORS = {
  open: "#4ade80",
  // 绿 开放
  closed: "#ef4444",
  // 红 封闭
  construction: "#fbbf24",
  // 黄 施工
  controlled: "#8b5cf6"
  // 紫 管制
};
var ROAD_STATUS_LABELS = {
  open: "开放",
  closed: "封闭",
  construction: "施工",
  controlled: "管制"
};
var INCIDENT_TYPE_COLORS = {
  accident: "#ef4444",
  // 事故 红
  construction: "#f59e0b",
  // 施工 橙
  control: "#8b5cf6",
  // 管制 紫
  weather: "#22d3ee"
  // 天气 青
};
var INCIDENT_TYPE_LABELS = {
  accident: "事故",
  construction: "施工",
  control: "管制",
  weather: "天气"
};
var INCIDENT_SEVERITY_COLORS = {
  low: "#fbbf24",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#7f1d1d"
};
function classifySpeed(speed) {
  if (speed >= 60) return speed >= 80 ? "free" : "smooth";
  if (speed >= 40) return "slow";
  if (speed >= 20) return "congested";
  return "jammed";
}
var ROAD_CLASS_WIDTHS = {
  highway: 5,
  national: 4,
  provincial: 3,
  urban: 2
};
const wuhanTransport = {
  nodes: [
    // 交叉口
    { id: "j01", kind: "intersection", lng: 114.3, lat: 30.58, properties: { name: "汉口站" } },
    { id: "j02", kind: "intersection", lng: 114.34, lat: 30.58, properties: { name: "青年路" } },
    { id: "j03", kind: "intersection", lng: 114.38, lat: 30.58, properties: { name: "建设大道" } },
    { id: "j04", kind: "intersection", lng: 114.3, lat: 30.54, properties: { name: "解放大道" } },
    { id: "j05", kind: "intersection", lng: 114.34, lat: 30.54, properties: { name: "中山大道" } },
    { id: "j06", kind: "intersection", lng: 114.38, lat: 30.54, properties: { name: "沿江大道" } },
    { id: "j07", kind: "intersection", lng: 114.42, lat: 30.54, properties: { name: "二桥" } },
    // 收费站
    { id: "toll01", kind: "toll", lng: 114.42, lat: 30.6, properties: { name: "汉口北收费站" } },
    { id: "toll02", kind: "toll", lng: 114.46, lat: 30.58, properties: { name: "武汉东收费站" } },
    // 服务区
    { id: "rest01", kind: "service_area", lng: 114.5, lat: 30.6, properties: { name: "东西湖服务区" } },
    // 停车场
    { id: "park01", kind: "parking", lng: 114.32, lat: 30.59, properties: { name: "汉口站停车场" } },
    // 摄像头
    { id: "cam01", kind: "camera", lng: 114.31, lat: 30.57, properties: { name: "监控-01" } },
    { id: "cam02", kind: "camera", lng: 114.35, lat: 30.55, properties: { name: "监控-02" } },
    { id: "cam03", kind: "camera", lng: 114.39, lat: 30.55, properties: { name: "监控-03" } },
    // 救援站
    { id: "res01", kind: "rescue", lng: 114.36, lat: 30.57, properties: { name: "汉口救援站" } },
    // 医院
    { id: "hosp01", kind: "hospital", lng: 114.33, lat: 30.56, properties: { name: "武汉中心医院" } }
  ],
  edges: [
    // 高速（东西向 + 南北向）
    { id: "r01", fromNode: "j01", toNode: "j02", roadClass: "highway", properties: { roadName: "京汉高速", lanes: 6, speedLimit: 120, status: "open" } },
    { id: "r02", fromNode: "j02", toNode: "j03", roadClass: "highway", properties: { roadName: "京汉高速", lanes: 6, speedLimit: 120, status: "open" } },
    { id: "r03", fromNode: "j03", toNode: "toll02", roadClass: "highway", properties: { roadName: "京汉高速", lanes: 6, speedLimit: 120, status: "open" } },
    // 国道
    { id: "r04", fromNode: "j01", toNode: "j04", roadClass: "national", properties: { roadName: "G316 国道", lanes: 4, speedLimit: 80, status: "open" } },
    { id: "r05", fromNode: "j02", toNode: "j05", roadClass: "national", properties: { roadName: "G316 国道", lanes: 4, speedLimit: 80, status: "construction" } },
    { id: "r06", fromNode: "j03", toNode: "j06", roadClass: "national", properties: { roadName: "G107 国道", lanes: 4, speedLimit: 80, status: "open" } },
    // 省道
    { id: "r07", fromNode: "j04", toNode: "j05", roadClass: "provincial", properties: { roadName: "S101 省道", lanes: 2, speedLimit: 60, status: "open" } },
    { id: "r08", fromNode: "j05", toNode: "j06", roadClass: "provincial", properties: { roadName: "S101 省道", lanes: 2, speedLimit: 60, status: "open" } },
    { id: "r09", fromNode: "j06", toNode: "j07", roadClass: "provincial", properties: { roadName: "S202 省道", lanes: 2, speedLimit: 60, status: "controlled" } },
    // 城市道路
    { id: "r10", fromNode: "j01", toNode: "toll01", roadClass: "urban", properties: { roadName: "汉口大道", lanes: 4, speedLimit: 50, status: "open" } },
    { id: "r11", fromNode: "j02", toNode: "park01", roadClass: "urban", properties: { roadName: "解放路", lanes: 2, speedLimit: 40, status: "open" } }
  ],
  speeds: [
    { edgeId: "r01", speed: 25, flow: 1800 },
    { edgeId: "r02", speed: 15, flow: 2200 },
    { edgeId: "r03", speed: 45, flow: 1200 },
    { edgeId: "r04", speed: 70, flow: 800 },
    { edgeId: "r05", speed: 10, flow: 300 },
    { edgeId: "r06", speed: 55, flow: 900 },
    { edgeId: "r07", speed: 40, flow: 600 },
    { edgeId: "r08", speed: 65, flow: 500 },
    { edgeId: "r09", speed: 30, flow: 700 },
    { edgeId: "r10", speed: 75, flow: 400 },
    { edgeId: "r11", speed: 20, flow: 1500 }
  ],
  incidents: [
    { id: "inc01", type: "accident", lng: 114.34, lat: 30.58, edgeId: "r02", properties: { title: "两车追尾", severity: "high", status: "handling", occurredAt: "2026-08-21T07:50:00Z", dispatchedAt: "2026-08-21T07:55:00Z" } },
    { id: "inc02", type: "construction", lng: 114.34, lat: 30.54, edgeId: "r05", properties: { title: "道路施工", severity: "medium", status: "occurred", occurredAt: "2026-08-20T08:00:00Z" } },
    { id: "inc03", type: "weather", lng: 114.42, lat: 30.54, edgeId: "r09", properties: { title: "暴雨积水", severity: "low", status: "occurred", occurredAt: "2026-08-21T08:30:00Z" } }
  ]
};
const transportEdgeIds = wuhanTransport.edges.map((e) => e.id);
export {
  INCIDENT_SEVERITY_COLORS as I,
  ROAD_CLASS_COLORS as R,
  INCIDENT_TYPE_COLORS as a,
  INCIDENT_TYPE_LABELS as b,
  ROAD_CLASS_LABELS as c,
  ROAD_STATUS_COLORS as d,
  ROAD_STATUS_LABELS as e,
  ROAD_CLASS_WIDTHS as f,
  classifySpeed as g,
  transportEdgeIds as t,
  wuhanTransport as w
};
