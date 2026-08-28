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
  GridDeviceDetail,
  GridDeviceKind,
  GridLine,
  GridLevel,
} from '../types';
import { DEVICE_LEVEL } from '../types';
import { paintBy, paintLineWidthByVoltage } from '../style/paintRules';
import { readCardFields, renderCardHtml } from '@caoguo/maplibre';
import type { RenderCardOptions } from '@caoguo/maplibre';
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

  // ============================================================
  // 设备搜索与定位（PRD G-4）
  // ============================================================

  /**
   * 按 id / 名称 / 类型匹配设备（G-4 设备搜索）。
   * - 字符串：同时匹配 id、name、properties.code（大小写不敏感）
   * - 对象：按 id/kind/name 字段组合过滤
   * @returns 首个匹配设备，无匹配返回 undefined
   */
  findDevice(
    query: string | { id?: string; kind?: GridDeviceKind; name?: string },
  ): GridDevice | undefined {
    const devices = this.dataset.devices ?? [];
    if (typeof query === 'string') {
      const q = query.trim().toLowerCase();
      if (!q) return undefined;
      return devices.find(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.name?.toLowerCase().includes(q) ||
          d.properties?.code?.toLowerCase().includes(q),
      );
    }
    return devices.find(
      (d) =>
        (!query.id || d.id === query.id) &&
        (!query.kind || d.kind === query.kind) &&
        (!query.name || d.name?.toLowerCase().includes(query.name.toLowerCase())),
    );
  }

  /**
   * 搜索设备并定位（G-4 定位）：找到后用底层地图 flyTo 到设备坐标。
   * @returns 匹配到的设备（供上层高亮/弹卡片）；无匹配返回 undefined
   */
  locateDevice(
    query: string | { id?: string; kind?: GridDeviceKind; name?: string },
    opts?: { zoom?: number; duration?: number },
  ): GridDevice | undefined {
    const device = this.findDevice(query);
    if (!device || typeof device.lng !== 'number' || typeof device.lat !== 'number') {
      return device;
    }
    const mlMap = (this.map as unknown as {
      instance?: {
        flyTo?: (o: {
          center: [number, number];
          zoom?: number;
          duration?: number;
        }) => void;
      };
    }).instance;
    mlMap?.flyTo?.({
      center: [device.lng, device.lat],
      zoom: opts?.zoom ?? (this.currentLevel ? 13 : 14),
      duration: opts?.duration ?? 1200,
    });
    return device;
  }

  // ============================================================
  // 设备卡片数据层（PRD G-2）
  // ============================================================

  /**
   * 构建设备卡片所需的详情结构（G-2 设备卡片数据层）。
   * 纯数据层：补全关联线路数、供电下游用户数、卡片展示字段，
   * 供上层 UI 直接渲染，不依赖任何框架。
   * @returns 设备详情；设备不存在返回 undefined
   */
  getDeviceDetail(deviceId: string): GridDeviceDetail | undefined {
    const device = (this.dataset.devices ?? []).find((d) => d.id === deviceId);
    if (!device) return undefined;

    const lines = this.dataset.lines ?? [];
    const connectedLines = lines.filter(
      (l) => l.fromDevice === deviceId || l.toDevice === deviceId,
    ).length;

    // 供电下游用户数：以该设备为起点的上游可达性估算（沿 line.from === deviceId 的下游方向）
    const downstreamUserCount = this.countDownstreamUsers(deviceId);

    const statusLabel = device.properties?.status
      ? { running: '运行中', standby: '备用', fault: '故障', maintenance: '检修' }[
          device.properties.status
        ]
      : '未知';
    const levelLabel = device.level ?? DEVICE_LEVEL[device.kind];
    const capacity = device.properties?.capacity ?? device.properties?.installedCapacity;
    const capacityLabel =
      capacity != null
        ? device.kind === 'plant'
          ? `${capacity} MW（装机）`
          : `${capacity} MVA`
        : undefined;

    return {
      ...device,
      connectedLines,
      downstreamUserCount,
      cardInfo: {
        title: device.name ?? device.id,
        subtitle: `${kindLabel(device.kind)} · ${device.properties?.code ?? device.id}`,
        statusLabel,
        levelLabel,
        ...(capacityLabel ? { capacityLabel } : {}),
        // 图片与维护记录从 properties.extra 读取（跨包统一口径，见 @caoguo/maplibre cardFields）
        ...readCardFields(device.properties?.extra),
      },
    };
  }

  /**
   * 生成设备卡片 HTML（G-2 的零依赖 DOM 外壳，实现在 `@caoguo/maplibre cardFields`）。
   * `el.innerHTML = topo.renderCardHtml(id)` 即可用；`style:'class'` 模式配合自定义 CSS。
   */
  renderCardHtml(deviceId: string, opts?: RenderCardOptions): string | undefined {
    const d = this.getDeviceDetail(deviceId);
    if (!d) return undefined;
    const statusColor =
      d.properties?.status === 'fault'
        ? '#f87171'
        : d.properties?.status === 'maintenance'
          ? '#fbbf24'
          : '#4ade80';
    return renderCardHtml(
      {
        title: d.cardInfo.title,
        subtitle: d.cardInfo.subtitle,
        statusLabel: d.cardInfo.statusLabel,
        statusColor,
        rows: [
          { label: '电压等级', value: d.cardInfo.levelLabel },
          ...(d.cardInfo.capacityLabel
            ? [{ label: '额定容量', value: d.cardInfo.capacityLabel }]
            : []),
          { label: '关联线路', value: `${d.connectedLines} 条` },
          { label: '下游用户', value: `${d.downstreamUserCount} 户` },
        ],
        images: d.cardInfo.images,
        maintenance: d.cardInfo.maintenance,
      },
      opts
    );
  }

  /** 估算从某设备向下的供电用户数（沿线路下游方向 BFS） */
  private countDownstreamUsers(deviceId: string): number {
    const lines = this.dataset.lines ?? [];
    const adjacency = new Map<string, string[]>();
    for (const l of lines) {
      if (!adjacency.has(l.fromDevice)) adjacency.set(l.fromDevice, []);
      adjacency.get(l.fromDevice)!.push(l.toDevice);
    }
    const visited = new Set<string>([deviceId]);
    const queue = [deviceId];
    let userCount = 0;
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of adjacency.get(cur) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        const dev = (this.dataset.devices ?? []).find((d) => d.id === next);
        if (dev?.kind === 'user') userCount += 1;
        queue.push(next);
      }
    }
    return userCount;
  }
}

/** 设备类型中文标签 */
function kindLabel(kind: GridDeviceKind): string {
  return (
    {
      plant: '发电厂',
      tower: '输电铁塔',
      substation: '变电站',
      transformer: '配变',
      user: '用户',
    } as Record<GridDeviceKind, string>
  )[kind];
}
