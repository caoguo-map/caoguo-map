const wuhanGrid = {
  devices: [
    // L1 发电
    { id: "plant-thermal", kind: "plant", name: "阳逻火电厂", lng: 114.55, lat: 30.67, level: "L1", region: "新洲区", properties: { code: "YL-1", voltage: "500", plantType: "thermal", installedCapacity: 1200, status: "running", commissionYear: 2008 } },
    { id: "plant-hydro", kind: "plant", name: "汉江水电站", lng: 114.02, lat: 30.55, level: "L1", region: "蔡甸区", properties: { code: "HJ-1", voltage: "220", plantType: "hydro", installedCapacity: 600, status: "running", commissionYear: 2012 } },
    { id: "plant-solar", kind: "plant", name: "江夏光伏电站", lng: 114.42, lat: 30.35, level: "L1", region: "江夏区", properties: { code: "JX-PV", voltage: "110", plantType: "solar", installedCapacity: 300, status: "running", commissionYear: 2019 } },
    // L2 输电铁塔
    { id: "tower-t01", kind: "tower", name: "铁塔 T01", lng: 114.48, lat: 30.62, level: "L2", properties: { code: "T01", voltage: "500", status: "running", commissionYear: 2008 } },
    { id: "tower-t02", kind: "tower", name: "铁塔 T02", lng: 114.4, lat: 30.6, level: "L2", properties: { code: "T02", voltage: "500", status: "running", commissionYear: 2008 } },
    { id: "tower-t03", kind: "tower", name: "铁塔 T03", lng: 114.25, lat: 30.58, level: "L2", properties: { code: "T03", voltage: "220", status: "running", commissionYear: 2010 } },
    // L3 变电站
    { id: "sub-center", kind: "substation", name: "汉口中心变电站", lng: 114.3, lat: 30.58, level: "L3", region: "江岸区", properties: { code: "SUB-220", voltage: "220", capacity: 720, status: "running", commissionYear: 2010 } },
    { id: "sub-guanggu", kind: "substation", name: "光谷变电站", lng: 114.42, lat: 30.5, level: "L3", region: "洪山区", properties: { code: "SUB-110", voltage: "110", capacity: 360, status: "running", commissionYear: 2015 } },
    { id: "sub-jiangxia", kind: "substation", name: "江夏变电站", lng: 114.35, lat: 30.38, level: "L3", region: "江夏区", properties: { code: "SUB-110B", voltage: "110", capacity: 180, status: "maintenance", commissionYear: 2005 } },
    // L4 配变
    { id: "trans-a01", kind: "transformer", name: "配变 A01", lng: 114.29, lat: 30.57, level: "L4", region: "江岸区", properties: { code: "PT-001", voltage: "10", capacity: 2.5, status: "running", loadRate: 0.55, commissionYear: 2016 } },
    { id: "trans-a02", kind: "transformer", name: "配变 A02", lng: 114.32, lat: 30.59, level: "L4", region: "江岸区", properties: { code: "PT-002", voltage: "10", capacity: 2, status: "running", loadRate: 0.88, commissionYear: 2012 } },
    { id: "trans-b01", kind: "transformer", name: "配变 B01", lng: 114.43, lat: 30.49, level: "L4", region: "洪山区", properties: { code: "PT-003", voltage: "10", capacity: 3, status: "running", loadRate: 0.72, commissionYear: 2018 } },
    { id: "trans-b02", kind: "transformer", name: "配变 B02", lng: 114.4, lat: 30.52, level: "L4", region: "洪山区", properties: { code: "PT-004", voltage: "10", capacity: 2.5, status: "fault", loadRate: 0, commissionYear: 2014 } },
    { id: "trans-c01", kind: "transformer", name: "配变 C01", lng: 114.36, lat: 30.37, level: "L4", region: "江夏区", properties: { code: "PT-005", voltage: "10", capacity: 2, status: "running", loadRate: 0.35, commissionYear: 2020 } }
  ],
  lines: [
    // 500kV 输电
    { id: "tl-01", fromDevice: "plant-thermal", toDevice: "tower-t01", lineType: "transmission", properties: { voltage: "500", status: "running", loadRate: 0.6, commissionYear: 2008 } },
    { id: "tl-02", fromDevice: "tower-t01", toDevice: "tower-t02", lineType: "transmission", properties: { voltage: "500", status: "running", loadRate: 0.6, commissionYear: 2008 } },
    { id: "tl-03", fromDevice: "tower-t02", toDevice: "sub-center", lineType: "transmission", properties: { voltage: "500", status: "running", loadRate: 0.55, commissionYear: 2008 } },
    // 220kV 输电
    { id: "tl-04", fromDevice: "plant-hydro", toDevice: "tower-t03", lineType: "transmission", properties: { voltage: "220", status: "running", loadRate: 0.5, commissionYear: 2012 } },
    { id: "tl-05", fromDevice: "tower-t03", toDevice: "sub-center", lineType: "transmission", properties: { voltage: "220", status: "running", loadRate: 0.5, commissionYear: 2012 } },
    { id: "tl-06", fromDevice: "plant-solar", toDevice: "sub-jiangxia", lineType: "transmission", properties: { voltage: "110", status: "running", loadRate: 0.4, commissionYear: 2019 } },
    // 10kV 配电
    { id: "dl-01", fromDevice: "sub-center", toDevice: "trans-a01", lineType: "distribution", properties: { voltage: "10", status: "running", loadRate: 0.55, commissionYear: 2016 } },
    { id: "dl-02", fromDevice: "sub-center", toDevice: "trans-a02", lineType: "distribution", properties: { voltage: "10", status: "running", loadRate: 0.88, commissionYear: 2012 } },
    { id: "dl-03", fromDevice: "sub-guanggu", toDevice: "trans-b01", lineType: "distribution", properties: { voltage: "10", status: "running", loadRate: 0.72, commissionYear: 2018 } },
    { id: "dl-04", fromDevice: "sub-guanggu", toDevice: "trans-b02", lineType: "distribution", properties: { voltage: "10", status: "fault", loadRate: 0, commissionYear: 2014 } },
    { id: "dl-05", fromDevice: "sub-jiangxia", toDevice: "trans-c01", lineType: "distribution", properties: { voltage: "10", status: "running", loadRate: 0.35, commissionYear: 2020 } },
    // 备用线路（跨区联络）
    { id: "dl-06", fromDevice: "sub-center", toDevice: "sub-guanggu", lineType: "distribution", properties: { voltage: "110", status: "standby", loadRate: 0, commissionYear: 2015 } }
  ],
  users: [
    { id: "u01", name: "常青花园小区", kind: "residential", deviceId: "trans-a01", lng: 114.29, lat: 30.56, region: "江岸区", scale: 3200 },
    { id: "u02", name: "汉口火车站", kind: "important", deviceId: "trans-a02", lng: 114.32, lat: 30.59, region: "江岸区", scale: 5e3, reason: "交通枢纽" },
    { id: "u03", name: "武汉市中心医院", kind: "important", deviceId: "trans-a02", lng: 114.31, lat: 30.58, region: "江岸区", scale: 2e3, reason: "医院" },
    { id: "u04", name: "光谷软件园", kind: "industrial", deviceId: "trans-b01", lng: 114.44, lat: 30.49, region: "洪山区", scale: 8e3 },
    { id: "u05", name: "华中科技大学", kind: "important", deviceId: "trans-b01", lng: 114.42, lat: 30.51, region: "洪山区", scale: 5e4, reason: "高校" },
    { id: "u06", name: "光谷步行街", kind: "commercial", deviceId: "trans-b02", lng: 114.4, lat: 30.5, region: "洪山区", scale: 6e3 },
    { id: "u07", name: "江夏纸坊街道", kind: "residential", deviceId: "trans-c01", lng: 114.36, lat: 30.37, region: "江夏区", scale: 4e3 }
  ]
};
const gridDeviceIds = wuhanGrid.devices.map((d) => d.id);
const gridLineIds = wuhanGrid.lines.map((l) => l.id);
export {
  gridLineIds as a,
  gridDeviceIds as g,
  wuhanGrid as w
};
