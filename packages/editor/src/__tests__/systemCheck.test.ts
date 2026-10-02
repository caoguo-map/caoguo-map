import { describe, it, expect } from 'vitest';
import { runStaticCheck } from '../systemCheck';
import type { DashboardConfig, ManagedDataSource } from '../types';

function cfgWith(scenes: DashboardConfig['scenes'], managed: ManagedDataSource[] = []): DashboardConfig {
  return {
    version: '1.0',
    theme: 'dark',
    canvas: { width: 1920, height: 1080, background: '#0a0e1a' },
    scenes,
    dataSources: managed,
  };
}

const managed: ManagedDataSource[] = [
  { id: 'ds-1', name: '设备接口', type: 'rest', url: '/api/devices' },
];

describe('系统自检·静态体检 systemCheck', () => {
  it('健康配置：只有概览 ok，无 error/warn', () => {
    const list = runStaticCheck({
      config: cfgWith(
        [
          {
            key: 's1',
            title: '总览',
            layers: [
              {
                id: 'layer-1',
                type: 'device-layer',
                position: { x: 0, y: 0, w: 1920, h: 1080 },
                dataSourceId: 'ds-1',
              },
            ],
            components: [
              {
                id: 'c1',
                type: 'device-list',
                position: { x: 0, y: 0, w: 280, h: 400 },
                config: { deviceLayerId: 'layer-1' },
              },
            ],
          },
        ],
        managed,
      ),
      managedSources: managed,
    });
    expect(list.filter((i) => i.level === 'error')).toEqual([]);
    expect(list.filter((i) => i.level === 'warn')).toEqual([]);
    expect(list[0].level).toBe('ok');
    expect(list[0].title).toContain('1 个场景');
  });

  it('无场景 → error', () => {
    const list = runStaticCheck({ config: cfgWith([]) });
    expect(list.some((i) => i.level === 'error' && i.title === '没有场景')).toBe(true);
  });

  it('重复场景 key → error', () => {
    const list = runStaticCheck({
      config: cfgWith([
        { key: 'dup', title: 'A', layers: [], components: [] },
        { key: 'dup', title: 'B', layers: [], components: [] },
      ]),
      managedSources: managed,
    });
    expect(list.some((i) => i.level === 'error' && i.title.includes('重复场景 key'))).toBe(true);
  });

  it('重复节点 id → error；节点越界 → warn', () => {
    const list = runStaticCheck({
      config: cfgWith([
        {
          key: 's1',
          title: 'S',
          layers: [],
          components: [
            { id: 'same', type: 'text', position: { x: 0, y: 0, w: 100, h: 40 } },
            { id: 'same', type: 'text', position: { x: 1900, y: 0, w: 300, h: 40 } },
          ],
        },
      ]),
      managedSources: managed,
    });
    expect(list.some((i) => i.level === 'error' && i.title.includes('重复节点 id'))).toBe(true);
    expect(list.some((i) => i.level === 'warn' && i.title.includes('节点越界'))).toBe(true);
  });

  it('悬空 dataSourceId → error', () => {
    const list = runStaticCheck({
      config: cfgWith([
        {
          key: 's1',
          title: 'S',
          layers: [{ id: 'l1', type: 'device-layer', position: { x: 0, y: 0, w: 100, h: 100 }, dataSourceId: 'nope' }],
          components: [],
        },
      ]),
      managedSources: managed,
    });
    expect(list.some((i) => i.level === 'error' && i.title.includes('悬空数据源引用'))).toBe(true);
  });

  it('binding 指向不存在的节点 → error（新增检查）', () => {
    const list = runStaticCheck({
      config: cfgWith([
        {
          key: 's1',
          title: 'S',
          layers: [],
          components: [
            {
              id: 'pie',
              type: 'pie-chart',
              position: { x: 0, y: 0, w: 200, h: 200 },
              dataSource: { type: 'binding', source: 'ghost-layer', aggregate: 'status-count' },
            },
          ],
        },
      ]),
      managedSources: managed,
    });
    expect(list.some((i) => i.level === 'error' && i.title.includes('绑定源不存在'))).toBe(true);
  });

  it('deviceLayerId 指向不存在的图层 → error（新增检查）', () => {
    const list = runStaticCheck({
      config: cfgWith([
        {
          key: 's1',
          title: 'S',
          layers: [],
          components: [
            {
              id: 'dl',
              type: 'device-list',
              position: { x: 0, y: 0, w: 280, h: 400 },
              config: { deviceLayerId: 'ghost' },
            },
          ],
        },
      ]),
      managedSources: managed,
    });
    expect(list.some((i) => i.level === 'error' && i.title.includes('设备图层引用不存在'))).toBe(true);
  });

  it('drillDownSceneKey 指向不存在场景 → error（新增检查）', () => {
    const list = runStaticCheck({
      config: cfgWith([
        {
          key: 's1',
          title: 'S',
          layers: [
            {
              id: 'l1',
              type: 'device-layer',
              position: { x: 0, y: 0, w: 100, h: 100 },
              config: { drillDownSceneKey: 'ghost-scene' },
            },
          ],
          components: [],
        },
      ]),
      managedSources: managed,
    });
    expect(list.some((i) => i.level === 'error' && i.title.includes('下钻场景不存在'))).toBe(true);
  });

  it('图表 binding 缺 field → warn；status-count 不需要 field 故不报（新增检查）', () => {
    const list = runStaticCheck({
      config: cfgWith([
        {
          key: 's1',
          title: 'S',
          layers: [{ id: 'l1', type: 'device-layer', position: { x: 0, y: 0, w: 100, h: 100 } }],
          components: [
            {
              id: 'g1',
              type: 'gauge-chart',
              position: { x: 0, y: 0, w: 200, h: 200 },
              dataSource: { type: 'binding', source: 'l1', aggregate: 'avg' },
            },
            {
              id: 'p1',
              type: 'pie-chart',
              position: { x: 0, y: 300, w: 200, h: 200 },
              dataSource: { type: 'binding', source: 'l1', aggregate: 'status-count' },
            },
          ],
        },
      ]),
      managedSources: managed,
    });
    const warns = list.filter((i) => i.level === 'warn' && i.title.includes('图表聚合缺少字段'));
    expect(warns.length).toBe(1);
    expect(warns[0].detail).toContain('g1');
  });

  it('阈值规则不完整（有 thrField 无阈值）→ warn（新增检查）', () => {
    const list = runStaticCheck({
      config: cfgWith([
        {
          key: 's1',
          title: 'S',
          layers: [],
          components: [
            { id: 'c1', type: 'data-card', position: { x: 0, y: 0, w: 180, h: 80 }, config: { thrField: 'load' } },
          ],
        },
      ]),
      managedSources: managed,
    });
    expect(list.some((i) => i.level === 'warn' && i.title.includes('阈值规则不完整'))).toBe(true);
  });
});
