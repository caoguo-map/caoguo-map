/**
 * 设备元数据：类型 → SVG 图标 + 状态色。
 * 用于地图设备 marker 与设备列表/详情按统一视觉规范渲染（替代 emoji 图标）。
 */
import type { IconName } from './icons';

export type DeviceStatus = 'online' | 'warning' | 'offline' | 'fault';

/** 设备类型 → 图标名（复用 IconSvg 的矢量图标） */
export const DEVICE_TYPE_ICON: Record<string, IconName> = {
  machine: 'device-layer',
  sensor: 'box',
  pump: 'box',
  camera: 'box',
  weather: 'wind-rose',
  soil: 'soil-profile',
};

/** 设备状态 → 颜色（marker 描边/填充主色） */
export const DEVICE_STATUS_COLOR: Record<DeviceStatus, string> = {
  online: '#4ade80',
  warning: '#fbbf24',
  fault: '#f87171',
  offline: '#6b7280',
};

/** 设备状态中文标签 */
export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  online: '在线',
  warning: '预警',
  fault: '故障',
  offline: '离线',
};

export function deviceIcon(type: string): IconName {
  return DEVICE_TYPE_ICON[type] ?? 'device-layer';
}

export function deviceColor(status: string): string {
  return DEVICE_STATUS_COLOR[(status as DeviceStatus)] ?? DEVICE_STATUS_COLOR.offline;
}

/**
 * 设备主指标趋势（模拟时序）。
 * 根据设备业务字段挑一个主数值指标派生 12 点确定性曲线，供详情面板趋势图渲染。
 * 真实接入时可用 dataSource 返回的 history 替换。
 */
export function deviceTrendSeries(d: DeviceItem): { label: string; points: number[]; unit: string } {
  // 各类型主指标字段与中文名 / 单位
  const metricMap: Record<string, { field: string; label: string; unit: string; base: number; amp: number }> = {
    soil: { field: 'moisture', label: '土壤墒情', unit: '%', base: 42, amp: 8 },
    weather: { field: 'wind', label: '风速', unit: 'm/s', base: 10, amp: 6 },
    machine: { field: 'load', label: '负载率', unit: '%', base: 60, amp: 18 },
    pump: { field: 'flow', label: '流量', unit: 'm³/h', base: 20, amp: 12 },
    camera: { field: 'fps', label: '帧率', unit: 'fps', base: 25, amp: 0 },
  };
  const m = metricMap[d.type] ?? { field: 'value', label: '指标', unit: '', base: 50, amp: 15 };
  const current = typeof d[m.field] === 'number' ? (d[m.field] as number) : m.base;
  // 以当前值收尾、确定性伪随机波动生成 12 点
  const points: number[] = [];
  let seed = 0;
  for (let i = 0; i < d.id.length; i++) seed += d.id.charCodeAt(i) * (i + 1);
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const wave = Math.sin((t * 3 + seed % 7) * Math.PI) * m.amp;
    const noise = ((Math.sin(seed + i * 1.7) + 1) / 2 - 0.5) * m.amp * 0.4;
    const val = i === 11 ? current : m.base + wave + noise;
    points.push(Math.max(0, Math.round(val * 10) / 10));
  }
  return { label: m.label, points, unit: m.unit };
}

/** 归一化单条设备数据（按 dataSource.mapping 映射字段） */
export interface DeviceItem {
  id: string;
  name: string;
  type: string;
  status: DeviceStatus;
  lng: number;
  lat: number;
  [k: string]: unknown;
}

export function normalizeDevice(raw: Record<string, any>, mapping?: Record<string, string>): DeviceItem {
  const m = mapping ?? {};
  const get = (key: string, fb: string) => (m[key] ? raw[m[key]] : raw[key] ?? raw[fb] ?? '');
  return {
    id: String(get('id', 'id') || raw.id || Math.random().toString(36).slice(2)),
    name: String(get('name', 'name') || raw.name || ''),
    type: String(get('type', 'type') || raw.type || 'machine'),
    status: (get('status', 'status') || 'offline') as DeviceStatus,
    lng: Number(get('lng', 'lng') ?? raw.lng ?? raw.longitude ?? 0),
    lat: Number(get('lat', 'lat') ?? raw.lat ?? raw.latitude ?? 0),
    ...raw,
  };
}
