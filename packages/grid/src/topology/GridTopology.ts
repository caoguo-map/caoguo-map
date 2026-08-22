/**
 * GridTopology 组件 - 电网拓扑浏览器
 *
 * PRD phase-2-grid-water §3.1：
 * - 5 级钻取（发电→输电→变电→配电→用户）
 * - 设备/线路按电压等级/状态/负载/年份着色
 * - 供电路径追踪（从任一用户反向追踪到发电侧）
 *
 * 设计原则（沿用 pipeline 包）：渲染薄壳 + 命令式 API。
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { removeSourceSafe, upsertSource } from '@caoguo/maplibre';
import type {
  GridTopologyDataset,
  GridColorByMode,
  GridDevice,
  GridLine,
  GridLevel,
} from '../types';
import { DEVICE_LEVEL } from '../types';
import { paintBy, paintLineWidthByVoltage } from '../style/paintRules';
import { buildGridAdjacency, gridBfs, deviceById } from '../graph/gridGraph';

export interface GridTopologyOptions {
  map: CaoguoMap;
  dataset: GridTopologyDataset;
  /** 默认着色模式 */
  colorBy?: GridColorByMode;
  /** 层 ID 前缀 */
  layerPrefix?: string;
}

type DeviceListener = (d: GridDevice) => void;
type LineListener = (l: GridLine) => void;

/**
 * GridTopology 组件
 *
 * 用法：
 *   const topo = new GridTopology({ map, dataset, colorBy: 'voltage' });
 *   topo.render();
 *   topo.setLevel('L1'); // 只显示发电层
 *   topo.traceSupply('user-01'); // 追踪供电路径
 */
export class GridTopology {
  private map: CaoguoMap;
  private dataset: GridTopologyDataset;
  private colorBy: GridColorByMode;
  private layerPrefix: string;
  private currentLevel: GridLevel | null = null;
  private layerIds: string[] = [];
  private deviceListeners = new Set<DeviceListener>();
  private lineListeners = new Set<LineListener>();

  constructor(options: GridTopologyOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? 'voltage';
    this.layerPrefix = options.layerPrefix ?? 'cg-grid-topo';
  }

  /** 渲染设备 + 线路到地图 */
  render(): void {
    this.clear();
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const devices = this.visibleDevices();
    const lines = this.visibleLines();

    const lineGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: lines.flatMap((l) => {
        const from = deviceById(this.dataset, l.fromDevice);
        const to = deviceById(this.dataset, l.toDevice);
        if (!from || !to) return [];
        const coords: [number, number][] =
          l.geometry && l.geometry.length >= 2
            ? (l.geometry as [number, number][])
            : [
                [from.lng, from.lat],
                [to.lng, to.lat],
              ];
        return [
          {
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates: coords },
            properties: {
              lineId: l.id,
              voltage: l.properties?.voltage ?? '10',
              status: l.properties?.status ?? 'running',
              loadRate: l.properties?.loadRate ?? 0,
              commissionYear: l.properties?.commissionYear ?? 2020,
            },
          },
        ];
      }),
    };

    const deviceGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: devices.map((d) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [d.lng, d.lat] },
        properties: {
          deviceId: d.id,
          kind: d.kind,
          voltage: d.properties?.voltage ?? '10',
          status: d.properties?.status ?? 'running',
          loadRate: d.properties?.loadRate ?? 0,
          commissionYear: d.properties?.commissionYear ?? 2020,
        },
      })),
    };

    // 幂等：层级切换重渲染时 source 可能已存在（clear 不移除 source），
    // 用 upsertSource 避免抛 "Source already exists" 导致面板交互静默失败。
    upsertSource(mlMap, `${prefix}-lines-src`, lineGeoJSON);
    upsertSource(mlMap, `${prefix}-devices-src`, deviceGeoJSON);
    mlMap.addLayer({
      id: `${prefix}-lines`,
      type: 'line',
      source: `${prefix}-lines-src`,
      paint: {
        'line-color': paintBy(this.colorBy) as never,
        'line-width': paintLineWidthByVoltage() as never,
        'line-opacity': 0.9,
      },
    });
    mlMap.addLayer({
      id: `${prefix}-devices`,
      type: 'circle',
      source: `${prefix}-devices-src`,
      paint: {
        'circle-radius': 5,
        'circle-color': paintBy(this.colorBy) as never,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    this.layerIds.push(`${prefix}-lines`, `${prefix}-devices`);
  }

  /** 切换着色模式 */
  setColorBy(mode: GridColorByMode): void {
    this.colorBy = mode;
    const mlMap = (this.map as unknown as {
      instance: { setPaintProperty: (id: string, prop: string, value: unknown) => void };
    }).instance;
    try {
      mlMap.setPaintProperty(`${this.layerPrefix}-lines`, 'line-color', paintBy(mode) as never);
      mlMap.setPaintProperty(`${this.layerPrefix}-devices`, 'circle-color', paintBy(mode) as never);
    } catch {
      // ignore
    }
  }

  /** 5 级钻取：设置当前展示层级（null = 全部） */
  setLevel(level: GridLevel | null): void {
    this.currentLevel = level;
    this.render();
  }

  /**
   * 供电路径追踪（PRD G-3）：
   * 从任一用户反向追踪到发电侧（upstream BFS），返回路径上的设备/线路 id 集合
   */
  traceSupply(deviceId: string): { deviceIds: Set<string>; lineIds: Set<string> } {
    const adj = buildGridAdjacency(this.dataset);
    const reached = gridBfs(adj, this.dataset, deviceId, 'upstream');
    const lineIds = new Set<string>();
    for (const l of this.dataset.lines) {
      if (reached.has(l.fromDevice) && reached.has(l.toDevice)) lineIds.add(l.id);
    }
    return { deviceIds: reached, lineIds };
  }

  /** 清空所有图层 */
  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
    // 同时移除 source，否则重渲染时 addSource 会因已存在而抛错
    const mlMap = (this.map as unknown as {
      instance: { getSource: (id: string) => unknown; removeSource: (id: string) => void };
    }).instance;
    for (const suffix of ['lines-src', 'devices-src']) {
      const sid = `${this.layerPrefix}-${suffix}`;
      removeSourceSafe(mlMap, sid);
    }
  }

  destroy(): void {
    this.clear();
    this.deviceListeners.clear();
    this.lineListeners.clear();
  }

  onDeviceSelect(fn: DeviceListener): () => void {
    this.deviceListeners.add(fn);
    return () => this.deviceListeners.delete(fn);
  }

  onLineSelect(fn: LineListener): () => void {
    this.lineListeners.add(fn);
    return () => this.lineListeners.delete(fn);
  }

  private visibleDevices(): GridDevice[] {
    if (!this.currentLevel) return this.dataset.devices;
    return this.dataset.devices.filter((d) => {
      const lv = d.level ?? DEVICE_LEVEL[d.kind];
      return lv === this.currentLevel;
    });
  }

  private visibleLines(): GridLine[] {
    if (!this.currentLevel) return this.dataset.lines;
    return this.dataset.lines.filter((l) => {
      const from = deviceById(this.dataset, l.fromDevice);
      const to = deviceById(this.dataset, l.toDevice);
      if (!from || !to) return false;
      const lv1 = from.level ?? DEVICE_LEVEL[from.kind];
      const lv2 = to.level ?? DEVICE_LEVEL[to.kind];
      return lv1 === this.currentLevel || lv2 === this.currentLevel;
    });
  }
}
