/**
 * 实时数据接入核心纯函数（PRD LH-3）
 *
 * 将实时指标（负荷率/状态等）应用到拓扑数据集，驱动负荷热力图/拓扑刷新。
 * 纯函数、无副作用（除原地更新 dataset.properties 外），可在 Node 环境单独测试。
 */

import type { GridDeviceStatus, GridTopologyDataset } from '../types';

/** 实时指标补丁（可扩展） */
export interface RealtimeMetricPatch {
  /** 负荷率 0-1 */
  loadRate?: number;
  /** 运行状态 */
  status?: GridDeviceStatus;
  /** 自由扩展属性（如温度、电流） */
  [key: string]: unknown;
}

/** 单条实时消息 */
export interface RealtimeMessage {
  deviceId: string;
  patch: RealtimeMetricPatch;
  /** 时间戳（可选） */
  ts?: number;
}

/**
 * 将指标补丁应用到数据集对应设备（原地更新 properties）。
 * @returns 是否找到并更新了设备
 */
export function applyMetricToDataset(
  dataset: GridTopologyDataset,
  deviceId: string,
  patch: RealtimeMetricPatch,
): boolean {
  const device = (dataset.devices ?? []).find((d) => d.id === deviceId);
  if (!device) return false;
  device.properties = { ...device.properties, ...patch };
  return true;
}

/**
 * 解析原始消息（JSON 字符串）为标准消息数组。
 * 支持三种格式：
 *  - 单条对象：`{"deviceId":"d1","loadRate":0.7,"status":"running"}`
 *  - 批量数组：`[{"deviceId":"d1",...},...]`
 *  - 精简数组：`[{"d":"d1","lr":0.7}]`（d=id, lr=loadRate, s=status）
 * @returns 解析出的消息数组（非法项被忽略）
 */
export function parseRealtimeMessage(raw: string): RealtimeMessage[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const arr = Array.isArray(data) ? data : [data];
  const out: RealtimeMessage[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const deviceId = (obj.deviceId ?? obj.d) as string | undefined;
    if (!deviceId || typeof deviceId !== 'string') continue;
    const patch: RealtimeMetricPatch = {};
    if (typeof obj.loadRate === 'number') patch.loadRate = obj.loadRate;
    else if (typeof obj.lr === 'number') patch.loadRate = obj.lr;
    if (typeof obj.status === 'string') patch.status = obj.status as GridDeviceStatus;
    else if (typeof obj.s === 'string') patch.status = obj.s as GridDeviceStatus;
    // 透传其余已知指标字段
    for (const k of Object.keys(obj)) {
      if (k !== 'deviceId' && k !== 'd' && k !== 'loadRate' && k !== 'lr' && k !== 'status' && k !== 's' && k !== 'ts') {
        patch[k] = obj[k];
      }
    }
    out.push({ deviceId, patch, ts: typeof obj.ts === 'number' ? obj.ts : undefined });
  }
  return out;
}
