const wuhanPipeline = {
  nodes: [
    // 制水厂
    { id: "plant-east", kind: "source", lng: 114.42, lat: 30.51, pipelineType: "water", properties: { capacity: 2e3, code: "EAST" } },
    { id: "plant-west", kind: "source", lng: 114.22, lat: 30.55, pipelineType: "water", properties: { capacity: 1500, code: "WEST" } },
    // 主干管阀门
    { id: "v01", kind: "valve", lng: 114.4, lat: 30.52, pipelineType: "water", properties: { valveStatus: "open", code: "V01" } },
    { id: "v02", kind: "valve", lng: 114.38, lat: 30.54, pipelineType: "water", properties: { valveStatus: "open", code: "V02" } },
    { id: "v03", kind: "valve", lng: 114.34, lat: 30.55, pipelineType: "water", properties: { valveStatus: "open", code: "V03" } },
    { id: "v04", kind: "valve", lng: 114.3, lat: 30.56, pipelineType: "water", properties: { valveStatus: "open", code: "V04" } },
    { id: "v05", kind: "valve", lng: 114.26, lat: 30.56, pipelineType: "water", properties: { valveStatus: "open", code: "V05" } },
    { id: "v06", kind: "valve", lng: 114.36, lat: 30.51, pipelineType: "water", properties: { valveStatus: "open", code: "V06" } },
    { id: "v07", kind: "valve", lng: 114.32, lat: 30.5, pipelineType: "water", properties: { valveStatus: "open", code: "V07" } },
    // 支管分水节点
    { id: "t01", kind: "meter", lng: 114.39, lat: 30.55, pipelineType: "water" },
    { id: "t02", kind: "meter", lng: 114.35, lat: 30.57, pipelineType: "water" },
    { id: "t03", kind: "meter", lng: 114.33, lat: 30.58, pipelineType: "water" },
    { id: "t04", kind: "meter", lng: 114.28, lat: 30.59, pipelineType: "water" },
    { id: "t05", kind: "meter", lng: 114.24, lat: 30.58, pipelineType: "water" },
    { id: "t06", kind: "meter", lng: 114.34, lat: 30.49, pipelineType: "water" },
    // 储水罐
    { id: "tank-1", kind: "tank", lng: 114.3, lat: 30.54, pipelineType: "water" }
  ],
  pipes: [
    { id: "p01", fromNode: "plant-east", toNode: "v01", type: "pipe", pipelineType: "water", properties: { diameter: 1200, material: "ductile_iron", installDate: "2010-01-01", pressure: 0.4, ratedPressure: 0.6, status: "normal" } },
    { id: "p02", fromNode: "v01", toNode: "v06", type: "pipe", pipelineType: "water", properties: { diameter: 1e3, material: "ductile_iron", installDate: "2010-06-01", pressure: 0.38, ratedPressure: 0.6, status: "normal" } },
    { id: "p03", fromNode: "v06", toNode: "v02", type: "pipe", pipelineType: "water", properties: { diameter: 800, material: "cast_iron", installDate: "1985-03-15", pressure: 0.32, ratedPressure: 0.6, status: "aging" } },
    { id: "p04", fromNode: "v02", toNode: "v03", type: "pipe", pipelineType: "water", properties: { diameter: 600, material: "pe", installDate: "2020-05-01", pressure: 0.3, ratedPressure: 0.6, status: "normal" } },
    { id: "p05", fromNode: "v03", toNode: "v04", type: "pipe", pipelineType: "water", properties: { diameter: 500, material: "pe", installDate: "2020-05-01", pressure: 0.28, ratedPressure: 0.6, status: "normal" } },
    { id: "p06", fromNode: "v04", toNode: "v05", type: "pipe", pipelineType: "water", properties: { diameter: 400, material: "cast_iron", installDate: "1990-08-20", pressure: 0.25, ratedPressure: 0.6, status: "aging" } },
    { id: "p07", fromNode: "v05", toNode: "plant-west", type: "pipe", pipelineType: "water", properties: { diameter: 600, material: "pvc", installDate: "2015-04-01", pressure: 0.22, ratedPressure: 0.5, status: "normal" } },
    { id: "p08", fromNode: "v01", toNode: "v07", type: "pipe", pipelineType: "water", properties: { diameter: 600, material: "pe", installDate: "2018-09-10", pressure: 0.3, ratedPressure: 0.6, status: "normal" } },
    { id: "p09", fromNode: "v07", toNode: "tank-1", type: "pipe", pipelineType: "water", properties: { diameter: 800, material: "ductile_iron", installDate: "2005-07-01", pressure: 0.32, ratedPressure: 0.6, status: "normal" } },
    // 支管到用户表
    { id: "p10", fromNode: "v02", toNode: "t01", type: "pipe", pipelineType: "water", properties: { diameter: 200, material: "pe", installDate: "2020-01-01", pressure: 0.22, ratedPressure: 0.4, status: "normal" } },
    { id: "p11", fromNode: "v03", toNode: "t02", type: "pipe", pipelineType: "water", properties: { diameter: 200, material: "pe", installDate: "2018-06-01", pressure: 0.22, ratedPressure: 0.4, status: "normal" } },
    { id: "p12", fromNode: "v04", toNode: "t03", type: "pipe", pipelineType: "water", properties: { diameter: 200, material: "pe", installDate: "2018-06-01", pressure: 0.2, ratedPressure: 0.4, status: "normal" } },
    { id: "p13", fromNode: "v05", toNode: "t04", type: "pipe", pipelineType: "water", properties: { diameter: 150, material: "cast_iron", installDate: "1988-01-01", pressure: 0.18, ratedPressure: 0.4, status: "aging" } },
    { id: "p14", fromNode: "plant-west", toNode: "t05", type: "pipe", pipelineType: "water", properties: { diameter: 150, material: "pe", installDate: "2019-01-01", pressure: 0.18, ratedPressure: 0.4, status: "normal" } },
    { id: "p15", fromNode: "v06", toNode: "t06", type: "pipe", pipelineType: "water", properties: { diameter: 200, material: "pe", installDate: "2019-01-01", pressure: 0.22, ratedPressure: 0.4, status: "normal" } }
  ],
  users: [
    { id: "u01", kind: "residential", name: "常青花园小区", nodeId: "t01", lng: 114.39, lat: 30.55 },
    { id: "u02", kind: "important", name: "武汉市第一中学", nodeId: "t02", lng: 114.35, lat: 30.57 },
    { id: "u03", kind: "residential", name: "汉口站家属区", nodeId: "t03", lng: 114.33, lat: 30.58 },
    { id: "u04", kind: "commercial", name: "武汉国际广场", nodeId: "t04", lng: 114.28, lat: 30.59 },
    { id: "u05", kind: "industrial", name: "东西湖工业区", nodeId: "t05", lng: 114.24, lat: 30.58 },
    { id: "u06", kind: "residential", name: "光谷社区", nodeId: "t06", lng: 114.34, lat: 30.49 }
  ]
};
const pipeIds = wuhanPipeline.pipes.map((p) => p.id);
export {
  pipeIds as p,
  wuhanPipeline as w
};
