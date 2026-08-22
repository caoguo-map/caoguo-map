/**
 * DamRender 组件 - 闸站控制面板渲染
 *
 * PRD phase-2-grid-water §4.1 / R-3（闸站控制面板）：
 * - 渲染数据集中的闸站（kind === 'gate'）为点层
 * - 按启闭状态着色（开/关/半开）
 * - 点击闸站触发选中事件（业务层弹出控制面板/详情，与 C-2 联动模式一致）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { WaterDataset, WaterFeature, GateStatus, GateType } from '../types';

export interface DamRenderOptions {
  map: CaoguoMap;
  dataset: WaterDataset;
  /** 层 ID 前缀 */
  layerPrefix?: string;
  /** 闸站点击回调 */
  onGateSelect?: (feature: WaterFeature) => void;
}

/** 闸站详情（纯函数，可单测） */
export interface GateDetail {
  id: string;
  name?: string;
  type?: GateType;
  status: GateStatus;
  /** 过流能力（m³/s） */
  dischargeCapacity?: number;
}

/** 闸门启闭状态配色（PRD §4.1.3 闸站启闭状态图标） */
export function paintGateByStatus(): unknown {
  return [
    'match',
    ['coalesce', ['get', 'gateStatus'], 'open'],
    'open', '#22c55e', // 开启 绿
    'partial', '#eab308', // 半开 黄
    'closed', '#ef4444', // 关闭 红
    '#6b7280',
  ];
}

/** 提取闸站详情（纯函数） */
export function getGateDetail(feature: WaterFeature): GateDetail {
  const p = feature.properties ?? {};
  return {
    id: feature.id,
    name: feature.name,
    type: p.gateType,
    status: p.gateStatus ?? 'open',
    dischargeCapacity: p.dischargeCapacity,
  };
}

/**
 * DamRender 组件
 *
 * 用法：
 *   const dam = new DamRender({ map, dataset, onGateSelect: (f) => showPanel(getGateDetail(f)) });
 *   dam.render();
 */
export class DamRender {
  private map: CaoguoMap;
  private dataset: WaterDataset;
  private layerPrefix: string;
  private layerIds: string[] = [];
  private onGateSelect?: (feature: WaterFeature) => void;

  constructor(options: DamRenderOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-dam';
    this.onGateSelect = options.onGateSelect;
  }

  private getMlMap(): {
    instance: {
      addSource: (id: string, source: unknown) => void;
      getSource: (id: string) => unknown;
      setData: (id: string, data: unknown) => void;
      addLayer: (layer: unknown) => void;
      on?: (
        type: string,
        layerId: string,
        handler: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void,
      ) => void;
    };
  }['instance'] {
    return (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        setData: (id: string, data: unknown) => void;
        addLayer: (layer: unknown) => void;
        on?: (
          type: string,
          layerId: string,
          handler: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void,
        ) => void;
      };
    }).instance;
  }

  /** 渲染闸站点层 */
  render(): void {
    this.clear();
    const mlMap = this.getMlMap();
    const prefix = this.layerPrefix;

    const gateById = new Map<string, WaterFeature>();

    const features = this.dataset.features
      .filter((f) => f.kind === 'gate')
      .map((f) => {
        gateById.set(f.id, f);
        const p = f.properties ?? {};
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [f.lng, f.lat] },
          properties: {
            gateId: f.id,
            gateStatus: p.gateStatus ?? 'open',
          },
        };
      });

    upsertSource(mlMap, `${prefix}-src`, {
      type: 'FeatureCollection',
      features,
    });
    mlMap.addLayer({
      id: `${prefix}-gate`,
      type: 'circle',
      source: `${prefix}-src`,
      paint: {
        'circle-color': paintGateByStatus() as never,
        'circle-radius': 6,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    this.layerIds.push(`${prefix}-gate`);

    if (this.onGateSelect && mlMap.on) {
      mlMap.on('click', `${prefix}-gate`, (ev) => {
        const gateId = ev.features?.[0]?.properties?.gateId as string | undefined;
        if (gateId) {
          const feature = gateById.get(gateId);
          if (feature) this.onGateSelect?.(feature);
        }
      });
    }
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
}
