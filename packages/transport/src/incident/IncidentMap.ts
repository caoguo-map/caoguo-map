/**
 * IncidentMap 事件响应组件（地图集成层）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import type { RoadNetworkDataset, Incident } from '../types';
import { analyzeIncident, buildIncidentTimeline } from './incidentCore';
import { INCIDENT_TYPE_COLORS, INCIDENT_SEVERITY_COLORS } from '../style/transportTheme';

export interface IncidentMapOptions {
  map: CaoguoMap;
  dataset: RoadNetworkDataset;
  layerPrefix?: string;
}

/**
 * IncidentMap 组件
 */
export class IncidentMap {
  private map: CaoguoMap;
  private dataset: RoadNetworkDataset;
  private layerPrefix: string;
  private layerIds: string[] = [];

  constructor(options: IncidentMapOptions) {
    this.map = options.map;
    this.dataset = options.dataset;
    this.layerPrefix = options.layerPrefix ?? 'cg-incident';
  }

  /** 渲染事件标记 */
  renderIncidents(incidents: Incident[]): void {
    const mlMap = (this.map as unknown as {
      instance: {
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
      };
    }).instance;
    const prefix = this.layerPrefix;

    const features = incidents.map((inc) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [inc.lng, inc.lat] },
      properties: {
        id: inc.id,
        type: inc.type,
        severity: inc.properties?.severity ?? 'medium',
      },
    }));

    if (!mlMap.getSource(`${prefix}-src`)) {
      mlMap.addSource(`${prefix}-src`, { type: 'FeatureCollection', features } as never);
      mlMap.addLayer({
        id: `${prefix}-pt`,
        type: 'circle',
        source: `${prefix}-src`,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'severity'], 0, 5, 1, 12],
          'circle-color': [
            'match',
            ['get', 'severity'],
            ...Object.entries(INCIDENT_SEVERITY_COLORS).flatMap(([k, v]) => [k, v]),
            '#6b7280',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      this.layerIds.push(`${prefix}-pt`);
    }
  }

  /** 分析事件并返回影响范围（供上层高亮 + 展示） */
  analyze(incident: Incident) {
    return analyzeIncident(this.dataset, incident);
  }

  /** 事件时间线 */
  timeline(incident: Incident) {
    return buildIncidentTimeline(incident);
  }

  /** 事件类型颜色（供 UI 用） */
  colorFor(type: Incident['type']): string {
    return INCIDENT_TYPE_COLORS[type] ?? '#6b7280';
  }

  clear(): void {
    for (const id of this.layerIds) {
      this.map.removeLayer(id);
    }
    this.layerIds = [];
  }

  destroy(): void {
    this.clear();
  }
}
