/**
 * 武汉模拟通信网数据（Phase 3 通信网演示用）
 * - 基站：宏站/微站（运营商/技术/扇区）
 * - 覆盖区域：多边形
 *
 * 注意：合成数据，仅用于演示。
 */

import type { TelecomTopologyDataset, SignalSample } from '@caoguo/maplibre-telecom';

export const wuhanTelecom: TelecomTopologyDataset = {
  baseStations: [
    { id: 'bs-m1', type: 'macro', name: '移动宏站-汉口', carrier: '中国移动', lng: 114.30, lat: 30.58, properties: { technology: '5G', frequency: '3.5GHz', powerDbm: 46, heightM: 30, azimuth: [0, 120, 240], tilt: 6, status: 'online', userCount: 150, throughputMbps: 500, region: '江汉' } },
    { id: 'bs-m2', type: 'macro', name: '移动宏站-光谷', carrier: '中国移动', lng: 114.42, lat: 30.50, properties: { technology: '5G', frequency: '2.6GHz', powerDbm: 46, heightM: 28, azimuth: [0, 120, 240], tilt: 5, status: 'online', userCount: 200, throughputMbps: 600, region: '洪山' } },
    { id: 'bs-u1', type: 'macro', name: '联通宏站-汉口', carrier: '中国联通', lng: 114.32, lat: 30.56, properties: { technology: '4G', frequency: '1.8GHz', powerDbm: 43, heightM: 25, azimuth: [0, 120, 240], tilt: 8, status: 'fault', userCount: 120, throughputMbps: 20, region: '江汉' } },
    { id: 'bs-t1', type: 'macro', name: '电信宏站-武昌', carrier: '中国电信', lng: 114.33, lat: 30.52, properties: { technology: '5G', frequency: '3.5GHz', powerDbm: 46, heightM: 32, azimuth: [0, 120, 240], tilt: 6, status: 'online', userCount: 180, throughputMbps: 550, region: '武昌' } },
    { id: 'bs-g1', type: 'micro', name: '广电微站-江岸', carrier: '中国广电', lng: 114.28, lat: 30.60, properties: { technology: '4G', frequency: '700MHz', powerDbm: 30, heightM: 15, azimuth: [0], tilt: 4, status: 'online', userCount: 60, throughputMbps: 100, region: '江岸' } },
  ],
  coverageAreas: [
    { stationId: 'bs-m1', sectorId: 's0', signalLevel: 'excellent', geom: [[114.29, 30.57], [114.31, 30.57], [114.31, 30.59], [114.29, 30.59]] },
    { stationId: 'bs-m2', sectorId: 's0', signalLevel: 'excellent', geom: [[114.41, 30.49], [114.43, 30.49], [114.43, 30.51], [114.41, 30.51]] },
    { stationId: 'bs-u1', sectorId: 's0', signalLevel: 'poor', geom: [[114.31, 30.55], [114.33, 30.55], [114.33, 30.57], [114.31, 30.57]] },
    { stationId: 'bs-t1', sectorId: 's0', signalLevel: 'good', geom: [[114.32, 30.51], [114.34, 30.51], [114.34, 30.53], [114.32, 30.53]] },
    { stationId: 'bs-g1', sectorId: 's0', signalLevel: 'fair', geom: [[114.27, 30.59], [114.29, 30.59], [114.29, 30.61], [114.27, 30.61]] },
  ],
};

/** 信号采样点（路测数据，热力图/盲区识别用） */
export const wuhanSignalSamples: SignalSample[] = [
  { lng: 114.30, lat: 30.58, rsrp: -70 },
  { lng: 114.31, lat: 30.575, rsrp: -82 },
  { lng: 114.42, lat: 30.50, rsrp: -68 },
  { lng: 114.33, lat: 30.56, rsrp: -112 },
  { lng: 114.35, lat: 30.55, rsrp: -120 },
  { lng: 114.30, lat: 30.55, rsrp: -95 },
  { lng: 114.28, lat: 30.60, rsrp: -78 },
  { lng: 114.40, lat: 30.53, rsrp: -108 },
];

/** 基站 ID 列表 */
export const telecomStationIds = wuhanTelecom.baseStations.map((s) => s.id);
