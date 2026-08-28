import { describe, it, expect } from 'vitest';
import { collectSceneAlerts } from '../store/useAlerts';
import type { Scene } from '../types';

function mkScene(thr: Record<string, any>, devices: Array<Record<string, any>>): Scene {
  return {
    key: 's1',
    title: '总览',
    map: { center: [0, 0], zoom: 10, tiles: 'tianditu' },
    components: [],
    layers: [
      {
        id: 'dl1',
        type: 'device-layer',
        position: { x: 0, y: 0, w: 10, h: 10 },
        config: { thrField: 'load', thrWarn: 70, thrCrit: 90, ...thr },
        children: [],
      },
    ],
  };
}

describe('useAlerts.collectSceneAlerts', () => {
  it('收集命中阈值规则的实时设备告警并按级别排序', () => {
    const devs = [
      { id: 'a', name: 'P1', load: 95 },
      { id: 'b', name: 'P2', load: 80 },
      { id: 'c', name: 'P3', load: 40 },
    ];
    const scene = mkScene({}, devs);
    const alerts = collectSceneAlerts(scene, { getDevices: () => devs });
    expect(alerts).toHaveLength(2);
    // crit 排在 warn 前
    expect(alerts[0]).toMatchObject({ deviceId: 'a', level: 'crit', field: 'load', value: 95 });
    expect(alerts[1]).toMatchObject({ deviceId: 'b', level: 'warn', value: 80 });
    expect(alerts[0].sceneName).toBe('总览');
  });

  it('未配置阈值字段时不产生告警', () => {
    const devs = [{ id: 'a', name: 'P1', load: 99 }];
    const scene = mkScene({ thrField: '' }, devs);
    expect(collectSceneAlerts(scene, { getDevices: () => devs })).toHaveLength(0);
  });

  it('容器内嵌套的设备图层也能被遍历', () => {
    const devs = [{ id: 'x', name: 'X', temp: 100 }];
    const scene: Scene = {
      key: 's2',
      title: 'T',
      map: { center: [0, 0], zoom: 10, tiles: 'tianditu' },
      layers: [],
      components: [
        {
          id: 'box',
          type: 'container',
          position: { x: 0, y: 0, w: 10, h: 10 },
          config: {},
          children: [
            {
              id: 'dl2',
              type: 'device-layer',
              position: { x: 0, y: 0, w: 10, h: 10 },
              config: { thrField: 'temp', thrCrit: 90 },
              children: [],
            },
          ],
        },
      ],
    };
    const alerts = collectSceneAlerts(scene, { getDevices: () => devs });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ deviceId: 'x', level: 'crit' });
  });
});
