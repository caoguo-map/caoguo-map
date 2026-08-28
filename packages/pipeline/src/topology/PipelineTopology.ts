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
  PipelineUser,
  UserKind,
  NodeSelectEvent,
  PipeSelectEvent,
  DrillDownEvent,
} from '../types';
import { paintPipeBy } from '../style/paintRules';
import type { PipelineNodeDetail, PipelinePipeDetail } from './nodeCard';
import { getNodeDetail, getPipeDetail } from './nodeCard';
import { renderCardHtml } from '@caoguo/maplibre';
import type { RenderCardOptions } from '@caoguo/maplibre';
import type { ImportantUserMarker } from '../burst/importantUsers';
import { buildImportantUserMarkers, importantUserColor } from '../burst/importantUsers';

/** 节点类型 → emoji 图标（P-1 节点图标；junction 无专用图标，仅按色区分） */
export const NODE_KIND_ICONS: Record<string, string> = {
  junction: '',
  valve: '🚰',
  pump: '⚙️',
  meter: '🌡️',
  source: '🏭',
  tank: '🛢️',
  junction_box: '🔌',
};

/** 节点类型配色（P-1：按设备类型区分） */
export const NODE_KIND_COLORS: Record<string, string> = {
  source: '#22c55e',
  pump: '#38bdf8',
  valve: '#f59e0b',
  meter: '#a78bfa',
  tank: '#f97316',
  junction_box: '#94a3b8',
  junction: '#64748b',
};

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
 *  - [x] 设备卡片（点击绑定 onNodeSelect / onPipeSelect + `getNodeDetail`/`getPipeDetail` 数据层）
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
          properties: {
            nodeId: n.id,
            kind: n.kind,
            kindIcon: NODE_KIND_ICONS[n.kind] ?? '',
            pipelineType: n.pipelineType ?? '',
          },
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
        // P-1 节点按设备类型着色（源头绿/泵蓝/阀橙/表紫/罐橙红/井灰）
        'circle-radius': ['match', ['get', 'kind'], 'source', 7, 'pump', 6, 4],
        'circle-color': [
          'match',
          ['get', 'kind'],
          ...Object.entries(NODE_KIND_COLORS).flatMap(([k, v]) => [k, v]),
          '#64748b',
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
    this.layerIds.push(`${prefix}-pipes-line`, `${prefix}-nodes-pt`);
    // P-1 节点 emoji 图标层（text-field 无需注册图片，junction 为空串不显示）
    mlMap.addLayer({
      id: `${prefix}-nodes-icon`,
      type: 'symbol',
      source: `${prefix}-nodes-src`,
      layout: {
        'text-field': ['get', 'kindIcon'],
        'text-size': 11,
        'text-allow-overlap': true,
      },
    });
    this.layerIds.push(`${prefix}-nodes-icon`);
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
  /**
   * P-6 搜索并定位：`search()` 命中后飞行到首个节点。
   * @returns 搜索结果；无命中返回 undefined
   */
  locate(query: string): SearchResult | undefined {
    const r = this.search(query);
    if (r.nodes.length === 0 && r.pipes.length === 0) return undefined;
    const target = r.nodes[0];
    if (target) {
      (this.map as unknown as { instance: { flyTo?: (o: unknown) => void } }).instance.flyTo?.({
        center: [target.lng, target.lat],
        zoom: 15,
        duration: 800,
      });
    }
    return r;
  }

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

  // ============================================================
  // 拓扑编辑数据层（PRD P-5）
  // ============================================================

  /**
   * P-5 新增节点：写入数据集并重渲染。
   * @param node 缺 `id` 时自动生成（`node-<timestamp>`）；region 用于层级钻取
   * @returns 实际写入的节点（含生成的 id）
   */
  addNode(node: Omit<PipelineNode, 'id'> & { id?: string }): PipelineNode {
    const full: PipelineNode = { ...node, id: node.id ?? `node-${Date.now()}` };
    if (this.dataset.nodes.some((n) => n.id === full.id)) {
      throw new Error(`节点 id 已存在：${full.id}`);
    }
    this.dataset.nodes.push(full);
    this.render();
    return full;
  }

  /**
   * P-5 新增管段：端点必须已存在（保证连通性），写入后重渲染。
   * @param pipe 缺 `id` 时自动生成（`pipe-<timestamp>`）；`type` 缺省为 'pipe'
   */
  addPipe(pipe: Omit<PipelinePipe, 'id' | 'type'> & { id?: string; type?: 'pipe' }): PipelinePipe {
    const nodeIds = new Set(this.dataset.nodes.map((n) => n.id));
    if (!nodeIds.has(pipe.fromNode) || !nodeIds.has(pipe.toNode)) {
      throw new Error(`管段端点不存在：${pipe.fromNode} → ${pipe.toNode}`);
    }
    const full: PipelinePipe = {
      ...pipe,
      id: pipe.id ?? `pipe-${Date.now()}`,
      type: pipe.type ?? 'pipe',
    };
    if (this.dataset.pipes.some((p) => p.id === full.id)) {
      throw new Error(`管段 id 已存在：${full.id}`);
    }
    this.dataset.pipes.push(full);
    this.render();
    return full;
  }

  /** P-5 删除管段：从数据集移除并重渲染；不存在时静默 */
  removePipe(pipeId: string): void {
    const idx = this.dataset.pipes.findIndex((p) => p.id === pipeId);
    if (idx < 0) return;
    this.dataset.pipes.splice(idx, 1);
    this.render();
  }

  /**
   * P-5 删除节点：**级联删除**与之相连的管段（保证拓扑一致性），并重渲染。
   */
  removeNode(nodeId: string): void {
    const idx = this.dataset.nodes.findIndex((n) => n.id === nodeId);
    if (idx < 0) return;
    this.dataset.pipes = this.dataset.pipes.filter(
      (p) => p.fromNode !== nodeId && p.toNode !== nodeId
    );
    this.dataset.nodes.splice(idx, 1);
    this.render();
  }

  // ============================================================
  // 设备卡片数据层（PRD P-3）

  // ============================================================

  /**
   * 构建节点详情与卡片字段（P-3 数据层，实现见 `nodeCard.ts` 纯函数）。
   * @returns 节点不存在时返回 undefined
   */
  getNodeDetail(nodeId: string): PipelineNodeDetail | undefined {
    return getNodeDetail(this.dataset, nodeId);
  }

  /**
   * 构建管段详情与卡片字段（P-3 数据层）。
   * @returns 管段不存在时返回 undefined
   */
  getPipeDetail(pipeId: string): PipelinePipeDetail | undefined {
    return getPipeDetail(this.dataset, pipeId);
  }

  /**
   * 生成节点卡片 HTML（P-3 的零依赖 DOM 外壳）。
   */
  renderNodeCardHtml(nodeId: string, opts?: RenderCardOptions): string | undefined {
    const d = this.getNodeDetail(nodeId);
    if (!d) return undefined;
    const statusColor =
      d.properties?.valveStatus === 'open'
        ? '#4ade80'
        : d.properties?.valveStatus === 'partial'
          ? '#fbbf24'
          : d.properties?.valveStatus === 'closed'
            ? '#f87171'
            : undefined;
    return renderCardHtml(
      {
        title: d.cardInfo.title,
        subtitle: d.cardInfo.subtitle,
        statusLabel: d.cardInfo.statusLabel,
        statusColor,
        rows: [
          { label: '相连管段', value: `${d.connectedPipes} 条` },
          { label: '挂接用户', value: `${d.userCount} 户` },
          { label: '重要用户', value: `${d.importantUserCount} 处` },
          ...(d.cardInfo.capacityLabel
            ? [{ label: '流量/供气能力', value: d.cardInfo.capacityLabel }]
            : []),
        ],
        images: d.cardInfo.images,
        maintenance: d.cardInfo.maintenance,
      },
      opts
    );
  }

  /**
   * 生成管段卡片 HTML（P-3）。
   */
  renderPipeCardHtml(pipeId: string, opts?: RenderCardOptions): string | undefined {
    const d = this.getPipeDetail(pipeId);
    if (!d) return undefined;
    const statusColor =
      d.properties?.status === 'damaged'
        ? '#f87171'
        : d.properties?.status === 'aging'
          ? '#fbbf24'
          : '#4ade80';
    return renderCardHtml(
      {
        title: d.cardInfo.title,
        subtitle: d.cardInfo.subtitle,
        statusLabel: d.cardInfo.statusLabel,
        statusColor,
        rows: [
          { label: '材质', value: d.cardInfo.materialLabel },
          { label: '规格', value: d.cardInfo.specLabel ?? '-' },
          { label: '起止点', value: `${d.fromNode} → ${d.toNode}` },
        ],
        images: d.cardInfo.images,
        maintenance: d.cardInfo.maintenance,
      },
      opts
    );
  }

  // ============================================================
  // 重要用户标注（PRD B-5）
  // ============================================================

  /**
   * 标注重要用户（医院/学校/政府/消防等，PRD B-5）。
   * 使用独立 source / layer（`<prefix>-important-*`），可重复调用（幂等），
   * 不影响拓扑主图层。
   * @param users 用户列表（默认取 dataset.users）
   * @param opts.kinds 需要标注的类型（默认 `['important']`）
   * @returns 已渲染的标注点（按严重度降序）
   */
  renderImportantUsers(
    users?: PipelineUser[],
    opts: { kinds?: UserKind[] } = {}
  ): ImportantUserMarker[] {
    const list = users ?? this.dataset.users ?? [];
    const markers = buildImportantUserMarkers(list, { kinds: opts.kinds });
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const data: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: markers.map((m) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
        properties: { userId: m.userId, name: m.name, label: m.label, severity: m.severity },
      })),
    };

    upsertSource(mlMap, `${prefix}-important-src`, data);
    try {
      mlMap.addLayer({
        id: `${prefix}-important-pt`,
        type: 'circle',
        source: `${prefix}-important-src`,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'severity'],
            1, 5,
            20, 6,
            50, 7,
            100, 9,
          ],
          'circle-color': [
            'case',
            ['>=', ['get', 'severity'], 100], importantUserColor(100),
            ['>=', ['get', 'severity'], 50], importantUserColor(50),
            ['>=', ['get', 'severity'], 20], importantUserColor(20),
            importantUserColor(1),
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      this.layerIds.push(`${prefix}-important-pt`);
    } catch {
      // 图层已存在时忽略（幂等重渲染）
    }
    return markers;
  }

  /** 清除重要用户标注图层 */
  clearImportantUsers(): void {
    const id = `${this.layerPrefix}-important-pt`;
    try {
      this.map.removeLayer(id);
    } catch {
      // ignore
    }
    this.layerIds = this.layerIds.filter((x) => x !== id);
  }
}
