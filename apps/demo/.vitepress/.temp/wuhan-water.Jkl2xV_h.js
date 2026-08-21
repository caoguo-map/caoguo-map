const wuhanWater = {
  features: [
    // 流域（面，用点表示中心）
    { id: "basin-yangtze", kind: "basin", name: "长江流域", lng: 114.3, lat: 30.6, properties: { code: "BS-YZ", level: "basin" } },
    // 干流（长江武汉段）
    {
      id: "main-yangtze",
      kind: "mainstream",
      name: "长江干流",
      lng: 114.28,
      lat: 30.58,
      parentId: "basin-yangtze",
      properties: { code: "MS-YZ", level: "mainstream", flowRate: 1200 },
      geometry: [
        [114.15, 30.62],
        [114.22, 30.6],
        [114.3, 30.58],
        [114.38, 30.57],
        [114.46, 30.55]
      ]
    },
    // 支流（汉江）
    {
      id: "trib-hanjiang",
      kind: "tributary",
      name: "汉江支流",
      lng: 114.25,
      lat: 30.55,
      parentId: "basin-yangtze",
      properties: { code: "TB-HJ", level: "tributary", flowRate: 600 },
      geometry: [
        [114.05, 30.6],
        [114.15, 30.57],
        [114.25, 30.55],
        [114.3, 30.58]
      ]
    },
    // 河段（府河）
    {
      id: "reach-fuhe",
      kind: "reach",
      name: "府河河段",
      lng: 114.35,
      lat: 30.62,
      parentId: "trib-hanjiang",
      properties: { code: "RC-FH", level: "reach", flowRate: 150 },
      geometry: [
        [114.3, 30.58],
        [114.35, 30.62],
        [114.42, 30.65]
      ]
    },
    // 水库
    { id: "res-1", kind: "reservoir", name: "丹江口水库", lng: 114.1, lat: 30.58, properties: { code: "RES-DJK", capacity: 2e5, storageRate: 0.75, waterLevel: 165, inflow: 800, outflow: 600, reservoirStatus: "balanced" } },
    { id: "res-2", kind: "reservoir", name: "梅店水库", lng: 114.48, lat: 30.62, properties: { code: "RES-MD", capacity: 3e4, storageRate: 0.92, waterLevel: 88, inflow: 300, outflow: 250, reservoirStatus: "discharging" } },
    { id: "res-3", kind: "reservoir", name: "沙河水库", lng: 114.52, lat: 30.6, properties: { code: "RES-SH", capacity: 15e3, storageRate: 0.28, waterLevel: 52, inflow: 100, outflow: 50, reservoirStatus: "storing" } },
    // 闸站
    { id: "gate-1", kind: "gate", name: "府河闸", lng: 114.36, lat: 30.63, properties: { code: "GATE-FH", gateType: "sluice", gateStatus: "open", dischargeCapacity: 500 } },
    { id: "gate-2", kind: "gate", name: "汉江闸站", lng: 114.26, lat: 30.55, properties: { code: "GATE-HJ", gateType: "floodgate", gateStatus: "partial", dischargeCapacity: 800 } },
    // 堤防
    {
      id: "dike-1",
      kind: "dike",
      name: "长江干堤",
      lng: 114.3,
      lat: 30.58,
      properties: { code: "DK-YZ", safetyLevel: "safe", dikeGrade: 1, dikeLength: 45, warningLevel: 27.3 },
      geometry: [
        [114.15, 30.63],
        [114.22, 30.61],
        [114.3, 30.59],
        [114.38, 30.58],
        [114.46, 30.56]
      ]
    },
    {
      id: "dike-2",
      kind: "dike",
      name: "府河堤防",
      lng: 114.36,
      lat: 30.63,
      properties: { code: "DK-FH", safetyLevel: "warning", dikeGrade: 2, dikeLength: 20, warningLevel: 26.5 },
      geometry: [
        [114.3, 30.59],
        [114.36, 30.64],
        [114.42, 30.66]
      ]
    },
    // 雨量站
    { id: "rain-1", kind: "rainStation", name: "汉口雨量站", lng: 114.3, lat: 30.59, properties: { code: "RAIN-HK", rainfall: 35 } },
    { id: "rain-2", kind: "rainStation", name: "府河雨量站", lng: 114.36, lat: 30.63, properties: { code: "RAIN-FH", rainfall: 80 } },
    // 水位站
    { id: "ws-1", kind: "waterStation", name: "汉口站", lng: 114.3, lat: 30.58, properties: { code: "WS-HK", waterLevel: 25.8, warningLevel: 27.3 } },
    { id: "ws-2", kind: "waterStation", name: "府河站", lng: 114.36, lat: 30.63, properties: { code: "WS-FH", waterLevel: 26.1, warningLevel: 26.5 } }
  ]
};
wuhanWater.features.map((f) => f.id);
const reservoirIds = wuhanWater.features.filter((f) => f.kind === "reservoir").map((f) => f.id);
export {
  reservoirIds as r,
  wuhanWater as w
};
