/**
 * 武汉模拟交通网数据（Phase 3 交通网演示用）
 * - 路网：高速/国道/省道/城市道路
 * - 节点：交叉口 + 收费站 + 服务区 + 停车场 + 摄像头 + 救援站 + 医院
 * - 实时速度 + 事件
 *
 * 注意：合成数据，仅用于演示。
 */

import type { RoadNetworkDataset } from '@caoguo/maplibre-transport';

export const wuhanTransport: RoadNetworkDataset = {
  nodes: [
    // 交叉口
    { id: 'j01', kind: 'intersection', lng: 114.30, lat: 30.58, properties: { name: '汉口站' } },
    { id: 'j02', kind: 'intersection', lng: 114.34, lat: 30.58, properties: { name: '青年路' } },
    { id: 'j03', kind: 'intersection', lng: 114.38, lat: 30.58, properties: { name: '建设大道' } },
    { id: 'j04', kind: 'intersection', lng: 114.30, lat: 30.54, properties: { name: '解放大道' } },
    { id: 'j05', kind: 'intersection', lng: 114.34, lat: 30.54, properties: { name: '中山大道' } },
    { id: 'j06', kind: 'intersection', lng: 114.38, lat: 30.54, properties: { name: '沿江大道' } },
    { id: 'j07', kind: 'intersection', lng: 114.42, lat: 30.54, properties: { name: '二桥' } },
    // 收费站
    { id: 'toll01', kind: 'toll', lng: 114.42, lat: 30.60, properties: { name: '汉口北收费站' } },
    { id: 'toll02', kind: 'toll', lng: 114.46, lat: 30.58, properties: { name: '武汉东收费站' } },
    // 服务区
    { id: 'rest01', kind: 'service_area', lng: 114.50, lat: 30.60, properties: { name: '东西湖服务区' } },
    // 停车场
    { id: 'park01', kind: 'parking', lng: 114.32, lat: 30.59, properties: { name: '汉口站停车场' } },
    // 摄像头
    { id: 'cam01', kind: 'camera', lng: 114.31, lat: 30.57, properties: { name: '监控-01' } },
    { id: 'cam02', kind: 'camera', lng: 114.35, lat: 30.55, properties: { name: '监控-02' } },
    { id: 'cam03', kind: 'camera', lng: 114.39, lat: 30.55, properties: { name: '监控-03' } },
    // 救援站
    { id: 'res01', kind: 'rescue', lng: 114.36, lat: 30.57, properties: { name: '汉口救援站' } },
    // 医院
    { id: 'hosp01', kind: 'hospital', lng: 114.33, lat: 30.56, properties: { name: '武汉中心医院' } },
  ],
  edges: [
    // 高速（东西向 + 南北向）
    { id: 'r01', fromNode: 'j01', toNode: 'j02', roadClass: 'highway', properties: { roadName: '京汉高速', lanes: 6, speedLimit: 120, status: 'open' } },
    { id: 'r02', fromNode: 'j02', toNode: 'j03', roadClass: 'highway', properties: { roadName: '京汉高速', lanes: 6, speedLimit: 120, status: 'open' } },
    { id: 'r03', fromNode: 'j03', toNode: 'toll02', roadClass: 'highway', properties: { roadName: '京汉高速', lanes: 6, speedLimit: 120, status: 'open' } },
    // 国道
    { id: 'r04', fromNode: 'j01', toNode: 'j04', roadClass: 'national', properties: { roadName: 'G316 国道', lanes: 4, speedLimit: 80, status: 'open' } },
    { id: 'r05', fromNode: 'j02', toNode: 'j05', roadClass: 'national', properties: { roadName: 'G316 国道', lanes: 4, speedLimit: 80, status: 'construction' } },
    { id: 'r06', fromNode: 'j03', toNode: 'j06', roadClass: 'national', properties: { roadName: 'G107 国道', lanes: 4, speedLimit: 80, status: 'open' } },
    // 省道
    { id: 'r07', fromNode: 'j04', toNode: 'j05', roadClass: 'provincial', properties: { roadName: 'S101 省道', lanes: 2, speedLimit: 60, status: 'open' } },
    { id: 'r08', fromNode: 'j05', toNode: 'j06', roadClass: 'provincial', properties: { roadName: 'S101 省道', lanes: 2, speedLimit: 60, status: 'open' } },
    { id: 'r09', fromNode: 'j06', toNode: 'j07', roadClass: 'provincial', properties: { roadName: 'S202 省道', lanes: 2, speedLimit: 60, status: 'controlled' } },
    // 城市道路
    { id: 'r10', fromNode: 'j01', toNode: 'toll01', roadClass: 'urban', properties: { roadName: '汉口大道', lanes: 4, speedLimit: 50, status: 'open' } },
    { id: 'r11', fromNode: 'j02', toNode: 'park01', roadClass: 'urban', properties: { roadName: '解放路', lanes: 2, speedLimit: 40, status: 'open' } },
  ],
  speeds: [
    { edgeId: 'r01', speed: 25, flow: 1800 },
    { edgeId: 'r02', speed: 15, flow: 2200 },
    { edgeId: 'r03', speed: 45, flow: 1200 },
    { edgeId: 'r04', speed: 70, flow: 800 },
    { edgeId: 'r05', speed: 10, flow: 300 },
    { edgeId: 'r06', speed: 55, flow: 900 },
    { edgeId: 'r07', speed: 40, flow: 600 },
    { edgeId: 'r08', speed: 65, flow: 500 },
    { edgeId: 'r09', speed: 30, flow: 700 },
    { edgeId: 'r10', speed: 75, flow: 400 },
    { edgeId: 'r11', speed: 20, flow: 1500 },
  ],
  incidents: [
    { id: 'inc01', type: 'accident', lng: 114.34, lat: 30.58, edgeId: 'r02', properties: { title: '两车追尾', severity: 'high', status: 'handling', occurredAt: '2026-08-21T07:50:00Z', dispatchedAt: '2026-08-21T07:55:00Z' } },
    { id: 'inc02', type: 'construction', lng: 114.34, lat: 30.54, edgeId: 'r05', properties: { title: '道路施工', severity: 'medium', status: 'occurred', occurredAt: '2026-08-20T08:00:00Z' } },
    { id: 'inc03', type: 'weather', lng: 114.42, lat: 30.54, edgeId: 'r09', properties: { title: '暴雨积水', severity: 'low', status: 'occurred', occurredAt: '2026-08-21T08:30:00Z' } },
  ],
};

/** 路段 ID 列表 */
export const transportEdgeIds = wuhanTransport.edges.map((e) => e.id);
