/**
 * PipelineTopology 类（Phase 1 管网拓扑编辑器）
 *
 * 完整实现：
 *  - 拓扑渲染（管段/节点按类型着色）
 *  - 层级钻取（区域→街道→小区→楼栋，drillDown / drillUp）
 *  - 设备卡片（点击节点/管段触发 onNodeSelect / onPipeSelect）
 *  - 连通性高亮（选中管线后高亮上下游，highlightConnectivity）
 *  - 搜索定位（按编号/地址/区域，search）
 *  - 分层控制（按管径/材质/年代/状态，setLayerFilter）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type {
  PipelineTopologyDataset,
  ColorByMode,
  PipelineType,
  PipelineNode,
  PipelinePipe,
  NodeSelectEvent,
  PipeSelectEvent,
  DrillDownEvent,
} from '../types';
import { paintPipeBy } from '../style/paintRules';

export interface PipelineTopologyOptions {
  map: CaoguoMap;
  dataset: PipelineTopologyDataset;
  /** 默认着色模式 */
  colorBy?: ColorByMode;
  /** 仅显示指定管线类型（空 = 全显示） */
  pipelineTypes?: PipelineType[];
  /** 层 ID 前缀 */
  layerPrefix?: string;
}

type NodeListener = (e: NodeSelectEvent) => void;
type PipeListener = (e: PipeSelectEvent) => void;
type DrillListener = (e: DrillDownEvent) => void;

/** 分层控制过滤器（按管径/材质/状态/年代） */
export interface LayerFilter {
  /** 最小管径（mm） */
  minDiameter?: number;
  /** 最大管径（mm） */
  maxDiameter?: number;
  /** 管材 */
  material?: string;
  /** 状态 */
  status?: string;
  /** 最小使用年限 */
  minAgeYears?: number;
}

/** 搜索结果 */
export interface SearchResult {
  /** 匹配节点 */
  nodes: PipelineNode[];
  /** 匹配管段 */
  pipes: PipelinePipe[];
}

/**
 * PipelineTopology 组件（Phase 1 MVP 完整实现）
 *
 * 实现进度：
 *  - [x] 渲染数据接入
 *  - [x] 层级钻取（drillDown / drillUp）
 *  - [x] 设备卡片（点击绑定 onNodeSelect / onPipeSelect）
 *  - [x] 连通性高亮（highlightConnectivity）
 *  - [x] 搜索定位（search）
 *  - [x] 分层控制（setLayerFilter / clearLayerFilter）
 */
export class PipelineTopology {
  private map: CaoguoMap;
  private dataset: PipelineTopologyDataset;
  private colorBy: ColorByMode;
  private layerPrefix: string;
  private pipelineTypes?: PipelineType[];
  private layerIds: string[] = [];
  private nodeListeners = new Set<NodeListener>();
  private pipeListeners = new Set<PipeListener>();
  private drillListeners = new Set<DrillListener>();
  /** 当前钻取区域（null = 全量） */
  private currentRegion: string | null = null;
  /** 当前分层过滤器 */
  private layerFilter: LayerFilter | null = null;
  /** click 事件是否已绑定 */
  private clickBound = false;

  constructor(options: PipelineTopologyOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.colorBy = options.colorBy ?? 'type';
    this.pipelineTypes = options.pipelineTypes;
    this.layerPrefix = options.layerPrefix ?? 'cg-topo';
  }

  /** 渲染管段+节点到地图 */
  render(): void {
    this.clear();
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
        on: (event: string, layerId: string, cb: (e: unknown) => void) => void;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const pipeGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: 'FeatureCollection',
      features: this.dataset.pipes
        .filter((p) => this.isPipeVisible(p))
        .flatMap((p) => {
          const from = this.dataset.nodes.find((n) => n.id === p.fromNode);
          const to = this.dataset.nodes.find((n) => n.id === p.toNode);
          if (!from || !to) return [];
          const coords: [number, number][] =
            p.geometry && p.geometry.length >= 2
              ? (p.geometry as [number, number][])
              : [
                  [from.lng, from.lat],
                  [to.lng, to.lat],
                ];
          return [
            {
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: coords },
              properties: {
                pipeId: p.id,
                pipelineType: p.pipelineType ?? '',
                diameter: p.properties?.diameter ?? 0,
                status: p.properties?.status ?? 'unknown',
                material: p.properties?.material ?? 'unknown',
              },
            },
          ];
        }),
    };

    const nodeGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: this.dataset.nodes
        .filter((n) => this.isNodeVisible(n))
        .map((n) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
          properties: { nodeId: n.id, kind: n.kind, pipelineType: n.pipelineType ?? '' },
        })),
    };

    // 幂等：层级/着色切换重渲染时 source 可能已存在，先判断避免抛 "already exists"
    upsertSource(mlMap, `${prefix}-pipes-src`, pipeGeoJSON);
    upsertSource(mlMap, `${prefix}-nodes-src`, nodeGeoJSON);
    mlMap.addLayer({
      id: `${prefix}-pipes-line`,
      type: 'line',
      source: `${prefix}-pipes-src`,
      paint: {
        'line-color': paintPipeBy(this.colorBy, { types: this.pipelineTypes }) as never,
        'line-width': 2,
        'line-opacity': 0.85,
      },
    });
    mlMap.addLayer({
      id: `${prefix}-nodes-pt`,
      type: 'circle',
      source: `${prefix}-nodes-src`,
      paint: {
        'circle-radius': 4,
        'circle-color': '#f59e0b',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    this.layerIds.push(`${prefix}-pipes-line`, `${prefix}-nodes-pt`);
    this.bindClickEvents(mlMap, prefix);
  }

  /**
   * 绑定点击事件（设备卡片：点击节点/管段触发订阅回调）。
   * 只绑定一次（render 重建图层后事件仍指向固定 layerId）。
   */
  private bindClickEvents(
    mlMap: {
      on: (event: string, layerId: string, cb: (e: unknown) => void) => void;
    },
    prefix: string
  ): void {
    if (this.clickBound) return;
    this.clickBound = true;

    const nodeById = new Map(this.dataset.nodes.map((n) => [n.id, n] as const));
    const pipeById = new Map(this.dataset.pipes.map((p) => [p.id, p] as const));

    mlMap.on('click', `${prefix}-pipes-line`, (e) => {
      const features = (e as { features?: Array<{ properties?: { pipeId?: string } }> }).features ?? [];
      const f = features[0];
      const pipe = f?.properties?.pipeId ? pipeById.get(f.properties.pipeId) : undefined;
      if (pipe) {
        for (const l of this.pipeListeners) l({ pipe });
      }
    });

    mlMap.on('click', `${prefix}-nodes-pt`, (e) => {
      const features = (e as { features?: Array<{ properties?: { nodeId?: string } }> }).features ?? [];
      const f = features[0];
      const node = f?.properties?.nodeId ? nodeById.get(f.properties.nodeId) : undefined;
      if (node) {
        for (const l of this.nodeListeners) l({ node });
      }
    });
  }

  /** 切换着色模式 */
  setColorBy(mode: ColorByMode): void {
    this.colorBy = mode;
    const mlMap = (this.map as unknown as {
      instance: { setPaintProperty: (id: string, prop: string, value: unknown) => void };
    }).instance;
    if (mlMap.setPaintProperty) {
      try {
        mlMap.setPaintProperty(
          `${this.layerPrefix}-pipes-line`,
          'line-color',
          paintPipeBy(mode, { types: this.pipelineTypes }) as never
        );
      } catch {
        // ignore
      }
    }
  }

  /** 清空所有图层 */
  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  /** 销毁组件 */
  destroy(): void {
    this.clear();
    this.nodeListeners.clear();
    this.pipeListeners.clear();
    this.drillListeners.clear();
  }

  /** 订阅节点点击事件 */
  onNodeSelect(fn: NodeListener): () => void {
    this.nodeListeners.add(fn);
    return () => this.nodeListeners.delete(fn);
  }

  /** 订阅管段点击事件 */
  onPipeSelect(fn: PipeListener): () => void {
    this.pipeListeners.add(fn);
    return () => this.pipeListeners.delete(fn);
  }

  /** 订阅钻取事件 */
  onDrillDown(fn: DrillListener): () => void {
    this.drillListeners.add(fn);
    return () => this.drillListeners.delete(fn);
  }

  /** 管段是否可见（管线类型 + 区域钻取 + 分层过滤） */
  private isPipeVisible(p: PipelinePipe): boolean {
    if (this.pipelineTypes?.length && !this.pipelineTypes.includes(p.pipelineType as PipelineType)) {
      return false;
    }
    if (this.currentRegion && p.region !== this.currentRegion) return false;
    const f = this.layerFilter;
    if (f) {
      const props = p.properties ?? {};
      if (f.minDiameter !== undefined && (props.diameter ?? 0) < f.minDiameter) return false;
      if (f.maxDiameter !== undefined && (props.diameter ?? Infinity) > f.maxDiameter) return false;
      if (f.material && props.material !== f.material) return false;
      if (f.status && props.status !== f.status) return false;
      if (f.minAgeYears !== undefined && props.installDate) {
        if (this.ageInYears(props.installDate) < f.minAgeYears) return false;
      }
    }
    return true;
  }

  /** 节点是否可见（管线类型 + 区域钻取） */
  private isNodeVisible(n: PipelineNode): boolean {
    if (this.pipelineTypes?.length && !this.pipelineTypes.includes(n.pipelineType as PipelineType)) {
      return false;
    }
    if (this.currentRegion && n.region !== this.currentRegion) return false;
    return true;
  }

  /** 计算管段使用年限（年） */
  private ageInYears(installDate: string): number {
    const d = new Date(installDate).getTime();
    if (Number.isNaN(d)) return 0;
    return (Date.now() - d) / (365.25 * 24 * 3600 * 1000);
  }

  /**
   * 搜索定位（按编号/地址/区域/类型）。
   * 返回匹配的节点与管段，供上层 flyTo 定位。
   */
  search(query: string): SearchResult {
    const q = query.trim().toLowerCase();
    if (!q) return { nodes: [], pipes: [] };
    const nodes = this.dataset.nodes.filter(
      (n) =>
        n.id.toLowerCase().includes(q) ||
        (n.properties?.code ?? '').toLowerCase().includes(q) ||
        (n.region ?? '').toLowerCase().includes(q) ||
        n.kind.toLowerCase().includes(q)
    );
    const pipes = this.dataset.pipes.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.region ?? '').toLowerCase().includes(q) ||
        (p.properties?.material ?? '').toLowerCase().includes(q)
    );
    return { nodes, pipes };
  }

  /** 层级钻取：下钻到指定区域（过滤渲染 + 触发事件） */
  drillDown(region: string): void {
    const from = this.currentRegion;
    this.currentRegion = region;
    this.render();
    for (const l of this.drillListeners) l({ from, to: region });
  }

  /** 层级钻取：返回上一级（清空区域过滤） */
  drillUp(): void {
    const from = this.currentRegion;
    this.currentRegion = null;
    this.render();
    for (const l of this.drillListeners) l({ from, to: '' });
  }

  /** 分层控制：按管径/材质/状态/年代过滤 */
  setLayerFilter(filter: LayerFilter): void {
    this.layerFilter = filter;
    this.render();
  }

  /** 清空分层过滤器 */
  clearLayerFilter(): void {
    this.layerFilter = null;
    this.render();
  }

  /** 高亮连通路径（基于节点 ID） */
  highlightConnectivity(centerId: string): Set<string> {
    const adj = new Map<string, Set<string>>();
    for (const p of this.dataset.pipes) {
      if (!adj.has(p.fromNode)) adj.set(p.fromNode, new Set());
      if (!adj.has(p.toNode)) adj.set(p.toNode, new Set());
      adj.get(p.fromNode)!.add(p.toNode);
      adj.get(p.toNode)!.add(p.fromNode);
    }

    const visited = new Set<string>();
    const stack = [centerId];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const neighbors = adj.get(cur) ?? new Set();
      for (const n of neighbors) {
        if (!visited.has(n)) stack.push(n);
      }
    }
    return visited;
  }
}
