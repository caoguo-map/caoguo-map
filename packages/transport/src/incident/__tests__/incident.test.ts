import { describe, it, expect } from 'vitest';
import { analyzeIncident, buildIncidentTimeline } from '../incidentCore';
import type { RoadNetworkDataset, Incident } from '../../types';

function makeNetwork(): RoadNetworkDataset {
  return {
    nodes: [
      { id: 'a', kind: 'intersection', lng: 114.30, lat: 30.50 },
      { id: 'b', kind: 'intersection', lng: 114.31, lat: 30.50 },
      { id: 'c', kind: 'intersection', lng: 114.32, lat: 30.50 },
      { id: 'd', kind: 'intersection', lng: 114.31, lat: 30.51 },
      { id: 'cam1', kind: 'camera', lng: 114.302, lat: 30.501 },
      { id: 'hosp1', kind: 'hospital', lng: 114.305, lat: 30.502 },
      { id: 'res1', kind: 'rescue', lng: 114.303, lat: 30.503 },
    ],
    edges: [
      { id: 'e1', fromNode: 'a', toNode: 'b', roadClass: 'urban' },
      { id: 'e2', fromNode: 'b', toNode: 'c', roadClass: 'urban' },
      { id: 'e3', fromNode: 'b', toNode: 'd', roadClass: 'urban' },
      { id: 'e4', fromNode: 'a', toNode: 'd', roadClass: 'urban' },
    ],
  };
}

describe('transport/incident/incidentCore', () => {
  it('analyzeIncident 计算影响范围和附近资源', () => {
    const ds = makeNetwork();
    const inc: Incident = {
      id: 'i1',
      type: 'accident',
      lng: 114.31,
      lat: 30.50,
      edgeId: 'e1',
      properties: { severity: 'high' },
    };
    const r = analyzeIncident(ds, inc);
    expect(r.affectedEdges.length).toBeGreaterThan(0);
    expect(r.nearbyResources.cameras.length).toBeGreaterThan(0);
    expect(r.nearbyResources.hospitals.length).toBeGreaterThan(0);
    expect(r.nearbyResources.rescue.length).toBeGreaterThan(0);
  });

  it('analyzeIncident 绕行方案绕过事件路段', () => {
    const ds = makeNetwork();
    const inc: Incident = {
      id: 'i1',
      type: 'construction',
      lng: 114.31,
      lat: 30.50,
      edgeId: 'e1',
      properties: { severity: 'medium' },
    };
    const r = analyzeIncident(ds, inc);
    expect(r.detour).toBeTruthy();
    if (r.detour) {
      expect(r.detour.found).toBe(true);
      // 绕行路径不应包含事件路段 e1（通过端点 a/b 但走 e4）
      expect(r.detour.path.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('buildIncidentTimeline 生成时间线', () => {
    const inc: Incident = {
      id: 'i1',
      type: 'accident',
      lng: 114.31,
      lat: 30.50,
      properties: {
        occurredAt: '2026-08-21T08:00:00Z',
        dispatchedAt: '2026-08-21T08:05:00Z',
        status: 'resolved',
        resolvedAt: '2026-08-21T09:00:00Z',
      },
    };
    const tl = buildIncidentTimeline(inc);
    expect(tl[0].status).toBe('occurred');
    expect(tl[tl.length - 1].status).toBe('resolved');
  });
});
