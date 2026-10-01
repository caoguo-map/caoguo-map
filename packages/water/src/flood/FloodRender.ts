/**
 * FloodRender 组件 - 淹没动态渲染
 *
 * PRD phase-2-grid-water §4.2（F-2 淹没动态渲染 / F-3 水深分级着色）：
 * - 接收 simulateFlood 的 FloodResult，将淹没范围画为多边形面层
 * - 按最大水深分级着色（depthColor）
 * - 支持动态水位：多次调用 render 即可更新淹没范围（模拟水位上涨）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import { upsertSource } from '@caoguo/maplibre';
import type { FloodResult } from '../types';
import type { EvacuationPlan } from './evacuation';
import type { FloodScenarioComparison } from './scenarioCompare';
import { buildScenarioComparisonGeoJSON } from './scenarioCompare';
import { depthColor } from './floodCore';

export interface FloodRenderOptions {
  map: CaoguoMap;
  /** 层 ID 前缀 */
  layerPrefix?: string;
}

/**
 * FloodRender 组件
 *
 * 用法：
 *   const flood = new FloodRender({ map });
 *   const result = simulateFlood(dataset, dem, input);
 *   flood.render(result);
 */
export class FloodRender {
  private map: CaoguoMap;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: FloodRenderOptions) {
    this.map = options.map;
    this.layerPrefix = options.layerPrefix ?? 'cg-flood';
  }

  private getMlMap(): {
    instance: {
      addSource: (id: string, source: unknown) => void;
      getSource: (id: string) => unknown;
      setData: (id: string, data: unknown) => void;
      addLayer: (layer: unknown) => void;
    };
  }['instance'] {
    return (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        getSource: (id: string) => unknown;
        setData: (id: string, data: unknown) => void;
        addLayer: (layer: unknown) => void;
      };
    }).instance;
  }

  /** 渲染一次淹没结果（水位上涨时重复调用可更新范围）
   * 主面层按最大水深单色着色（向后兼容）；如需真实分级着色请用 renderGraded。
   */
  render(result: FloodResult): void {
    this.clear();
    const mlMap = this.getMlMap();
    const prefix = this.layerPrefix;

    const ring = result.inundationPolygon.map(([x, y]) => [x, y] as [number, number]);
    // 闭合多边形
    if (ring.length > 0) ring.push(ring[0]);

    const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { maxDepth: result.maxDepth, inundatedArea: result.inundatedArea },
    };

    upsertSource(mlMap, `${prefix}-src`, {
      type: 'FeatureCollection',
      features: [feature],
    });
    mlMap.addLayer({
      id: `${prefix}-fill`,
      type: 'fill',
      source: `${prefix}-src`,
      paint: {
        'fill-color': depthColor(result.maxDepth),
        'fill-opacity': 0.45,
      },
    });
    this.layerIds.push(`${prefix}-fill`);
  }

  /**
   * 真实水深分级渲染（F-3）：直接绘制 data-driven 分级面层。
   * 传入由 gradedFloodFeatureCollection 生成的 GeoJSON（每格带 `depth` 属性）。
   * fill-color 用 `["interpolate"]` 表达式按水深连续映射 depthColor 分级档位。
   */
  renderGraded(graded: GeoJSON.FeatureCollection): void {
    this.clear();
    const mlMap = this.getMlMap();
    const prefix = this.layerPrefix;

    upsertSource(mlMap, `${prefix}-graded-src`, graded);
    mlMap.addLayer({
      id: `${prefix}-graded`,
      type: 'fill',
      source: `${prefix}-graded-src`,
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'depth'],
          0.5, depthColor(0.25),
          1, depthColor(0.75),
          2, depthColor(1.5),
          3, depthColor(2.5),
          4, depthColor(3.5),
        ] as never,
        'fill-opacity': 0.55,
      },
    });
    this.layerIds.push(`${prefix}-graded`);
  }

  /**
   * 撤退路径渲染（F-6 渲染薄壳）：把可达路线画为折线层。
   * 不可达起点不绘制（其路线无通路，画出来无意义）。
   */
  renderEvacuation(plan: EvacuationPlan): void {
    const mlMap = this.getMlMap();
    const prefix = this.layerPrefix;
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = plan.routes
      .filter((r) => r.reachable && r.pathCoords.length > 1)
      .map((r) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: r.pathCoords },
        properties: {
          originId: r.originId,
          shelterId: r.shelterId,
          distanceM: r.distanceM,
        },
      }));
    if (!features.length) return;

    upsertSource(mlMap, `${prefix}-evac-src`, { type: 'FeatureCollection', features });
    mlMap.addLayer({
      id: `${prefix}-evac-line`,
      type: 'line',
      source: `${prefix}-evac-src`,
      paint: { 'line-color': '#22d3ee', 'line-width': 3, 'line-opacity': 0.9 },
    });
    this.layerIds.push(`${prefix}-evac-line`);
  }

  /**
   * 多情景对比叠加渲染（F-5 渲染薄壳）。
   * 各情景淹没范围半透明填充 + 同色描边，配色由数据层 `properties.color` 提供
   * （data-driven `['get','color']`），情景数量不影响图层数量（恒为 2 层）。
   */
  renderScenarioComparison(
    comparison: FloodScenarioComparison,
    options: { fillOpacity?: number } = {},
  ): void {
    const fc = buildScenarioComparisonGeoJSON(comparison);
    if (!fc.features.length) return;
    const mlMap = this.getMlMap();
    const prefix = this.layerPrefix;

    upsertSource(mlMap, `${prefix}-cmp-src`, fc);
    mlMap.addLayer({
      id: `${prefix}-cmp-fill`,
      type: 'fill',
      source: `${prefix}-cmp-src`,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': options.fillOpacity ?? 0.25 },
    });
    mlMap.addLayer({
      id: `${prefix}-cmp-line`,
      type: 'line',
      source: `${prefix}-cmp-src`,
      paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
    });
    this.layerIds.push(`${prefix}-cmp-fill`, `${prefix}-cmp-line`);
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }
}
