/**
 * 武汉模拟算力网数据（Phase 3 算力网演示用）
 * - 节点：数据中心/边缘节点/区域云
 * - 链路：光缆（带宽/延迟/利用率）
 *
 * 注意：合成数据，仅用于演示。
 */

import type { ComputeTopologyDataset } from '@caoguo/maplibre-compute';

export const wuhanCompute: ComputeTopologyDataset = {
  nodes: [
    { id: 'dc-wuhan', type: 'datacenter', name: '武汉数据中心', lng: 114.30, lat: 30.58, properties: { totalCompute: '1000 TFLOPS', usedCompute: '650 TFLOPS', gpuCount: 1000, gpuUtilization: 0.65, storage: '10 PB', networkBandwidth: '100 Gbps', status: 'online', region: '华中' } },
    { id: 'dc-guanggu', type: 'datacenter', name: '光谷超算中心', lng: 114.42, lat: 30.50, properties: { totalCompute: '2000 TFLOPS', usedCompute: '1900 TFLOPS', gpuCount: 2000, gpuUtilization: 0.95, storage: '20 PB', networkBandwidth: '200 Gbps', status: 'online', region: '华中' } },
    { id: 'edge-hankou', type: 'edge_node', name: '汉口边缘节点', lng: 114.26, lat: 30.60, properties: { totalCompute: '100 TFLOPS', usedCompute: '20 TFLOPS', gpuCount: 100, gpuUtilization: 0.2, storage: '1 PB', networkBandwidth: '40 Gbps', status: 'online', region: '华中' } },
    { id: 'edge-wuchang', type: 'edge_node', name: '武昌边缘节点', lng: 114.33, lat: 30.52, properties: { totalCompute: '100 TFLOPS', usedCompute: '30 TFLOPS', gpuCount: 100, gpuUtilization: 0.3, storage: '1 PB', networkBandwidth: '40 Gbps', status: 'online', region: '华中' } },
    { id: 'cloud-hz', type: 'cloud_region', name: '华东区域云', lng: 120.15, lat: 30.28, properties: { totalCompute: '5000 TFLOPS', usedCompute: '3000 TFLOPS', gpuCount: 5000, gpuUtilization: 0.6, storage: '50 PB', networkBandwidth: '400 Gbps', status: 'online', region: '华东' } },
    { id: 'dc-offline', type: 'datacenter', name: '备用数据中心', lng: 114.20, lat: 30.45, properties: { totalCompute: '500 TFLOPS', usedCompute: '0 TFLOPS', gpuCount: 500, gpuUtilization: 0.0, storage: '5 PB', networkBandwidth: '100 Gbps', status: 'offline', region: '华中' } },
  ],
  links: [
    { id: 'f01', fromNode: 'dc-wuhan', toNode: 'dc-guanggu', properties: { bandwidth: '100 Gbps', bandwidthGbps: 100, latencyMs: 5, utilization: 0.3, type: 'fiber' } },
    { id: 'f02', fromNode: 'dc-wuhan', toNode: 'edge-hankou', properties: { bandwidth: '40 Gbps', bandwidthGbps: 40, latencyMs: 3, utilization: 0.2, type: 'fiber' } },
    { id: 'f03', fromNode: 'dc-wuhan', toNode: 'edge-wuchang', properties: { bandwidth: '40 Gbps', bandwidthGbps: 40, latencyMs: 3, utilization: 0.25, type: 'fiber' } },
    { id: 'f04', fromNode: 'dc-guanggu', toNode: 'cloud-hz', properties: { bandwidth: '200 Gbps', bandwidthGbps: 200, latencyMs: 25, utilization: 0.9, type: 'fiber' } },
    { id: 'f05', fromNode: 'dc-wuhan', toNode: 'cloud-hz', properties: { bandwidth: '100 Gbps', bandwidthGbps: 100, latencyMs: 20, utilization: 0.7, type: 'fiber' } },
    { id: 'f06', fromNode: 'dc-wuhan', toNode: 'dc-offline', properties: { bandwidth: '10 Gbps', bandwidthGbps: 10, latencyMs: 2, utilization: 0.0, type: 'microwave' } },
  ],
};

/** 节点 ID 列表 */
export const computeNodeIds = wuhanCompute.nodes.map((n) => n.id);
