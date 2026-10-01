import { describe, it, expect, vi } from 'vitest';
import { PipelineTopology } from '../PipelineTopology';
import {
  splitPath,
  joinPath,
  levelName,
  isUnder,
  breadcrumb,
  parentPath,
  aggregateStats,
  listChildren,
  buildHierarchy,
} from '../hierarchy';
import type { PipelineTopologyDataset } from '../../types';

function createMockMap(): any {
  return {
    instance: {
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(() => undefined),
      on: vi.fn(),
      setPaintProperty: vi.fn(),
    },
    removeLayer: vi.fn(),
  };
}

/** 三级管网：江岸区下有 2 个街道，其中一元街道下有 2 个小区 */
const dataset: PipelineTopologyDataset = {
  nodes: [
    { id: 'n1', kind: 'valve', lng: 114.3, lat: 30.5, region: '江岸区/一元街道/滨江小区' },
    { id: 'n2', kind: 'junction', lng: 114.31, lat: 30.51, region: '江岸区/一元街道/同兴小区' },
    { id: 'n3', kind: 'junction', lng: 114.32, lat: 30.52, region: '江岸区/大智街道/先锋小区' },
    { id: 'n4', kind: 'source', lng: 114.4, lat: 30.6, region: '武昌区/黄鹤楼街道' },
  ],
  pipes: [
    { id: 'p1', fromNode: 'n1', toNode: 'n2', type: 'pipe', region: '江岸区/一元街道' },
    { id: 'p2', fromNode: 'n2', toNode: 'n3', type: 'pipe', region: '江岸区' },
    { id: 'p3', fromNode: 'n3', toNode: 'n4', type: 'pipe', region: '武昌区/黄鹤楼街道' },
  ],
  users: [
    { id: 'u1', kind: 'resident', lng: 114.3, lat: 30.5, region: '江岸区/一元街道/滨江小区' },
  ],
};

describe('P-2 层级钻取纯函数', () => {
  it('splitPath / joinPath 处理层级路径', () => {
    expect(splitPath('江岸区/一元街道/滨江小区')).toEqual(['江岸区', '一元街道', '滨江小区']);
    expect(splitPath(undefined)).toEqual([]);
    expect(joinPath(['江岸区', '一元街道'])).toBe('江岸区/一元街道');
  });

  it('levelName：预置 4 级，超出退化为「第 N 级」', () => {
    expect(levelName(0)).toBe('区域');
    expect(levelName(3)).toBe('楼栋');
    expect(levelName(5)).toBe('第6级');
  });

  it('isUnder：前缀匹配且必须是完整分段（避免「江岸区」误匹配「江岸新区」）', () => {
    expect(isUnder('江岸区', '江岸区/一元街道')).toBe(true);
    expect(isUnder('江岸区', '江岸区')).toBe(true);
    expect(isUnder('江岸区', '江岸新区/一元街道')).toBe(false);
    expect(isUnder(null, '任意区域')).toBe(true); // 不过滤
    expect(isUnder('江岸区', undefined)).toBe(false);
  });

  it('breadcrumb 逐级展开', () => {
    const bc = breadcrumb('江岸区/一元街道/滨江小区');
    expect(bc.map((b) => b.name)).toEqual(['江岸区', '一元街道', '滨江小区']);
    expect(bc.map((b) => b.levelName)).toEqual(['区域', '街道', '小区']);
    expect(bc[1].path).toBe('江岸区/一元街道');
  });

  it('parentPath 逐级回溯，顶层返回 null', () => {
    expect(parentPath('江岸区/一元街道')).toBe('江岸区');
    expect(parentPath('江岸区')).toBeNull();
    expect(parentPath(null)).toBeNull();
  });

  it('aggregateStats 汇总该层级及全部子级', () => {
    const all = aggregateStats(dataset, null);
    expect(all.nodes).toBe(4);
    expect(all.pipes).toBe(3);
    expect(all.users).toBe(1);

    const jiang = aggregateStats(dataset, '江岸区');
    expect(jiang.nodes).toBe(3);
    expect(jiang.pipes).toBe(2);
    // 武昌区的 n4 / p3 不应计入
  });

  it('listChildren 列出直接子级并带各自统计', () => {
    // 顺序按 Unicode 码点（稳定、不依赖 ICU 中文排序）：武 U+6B66 < 江 U+6C5F
    const tops = listChildren(dataset, null);
    expect(tops.map((e) => e.name)).toEqual(['武昌区', '江岸区']);
    expect(tops[0].levelName).toBe('区域');

    const streets = listChildren(dataset, '江岸区');
    expect(streets.map((e) => e.name)).toEqual(['一元街道', '大智街道']);
    expect(streets[0].levelName).toBe('街道');
    expect(streets[0].stats.nodes).toBe(2); // 滨江小区 + 同兴小区
    expect(streets[0].childCount).toBe(2); // 下含 2 个小区
  });

  it('buildHierarchy 构建到楼栋（4 级）的层级树', () => {
    const tree = buildHierarchy(dataset, null);
    expect(tree.length).toBe(2);
    const jiang = tree.find((t) => t.name === '江岸区')!;
    expect(jiang).toBeTruthy();
    expect(jiang.children.map((c) => c.name)).toEqual(['一元街道', '大智街道']);
    expect(jiang.children[0].children.map((c) => c.name)).toEqual(['同兴小区', '滨江小区']);
  });
});

describe('P-2 PipelineTopology 逐级钻取', () => {
  it('drillDown/drillUp 事件带上层级信息', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    const events: any[] = [];
    topo.onDrillDown((e) => events.push(e));

    topo.drillDown('江岸区');
    expect(events[0].to).toBe('江岸区');
    expect(events[0].level).toBe(0);

    topo.drillUp(); // 顶层 → 回到全量
    expect(events[1].to).toBe('');
    expect(events[1].level).toBeNull();
  });

  it('drillUp 逐级回溯（不再一次性回顶）', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    const events: any[] = [];
    topo.onDrillDown((e) => events.push(e));

    topo.drillTo('江岸区/一元街道/滨江小区');
    expect(topo.getCurrentPath()).toBe('江岸区/一元街道/滨江小区');
    expect(events[events.length - 1].level).toBe(2);

    topo.drillUp();
    expect(topo.getCurrentPath()).toBe('江岸区/一元街道'); // 只退一级
    topo.drillUp();
    expect(topo.getCurrentPath()).toBe('江岸区');
    topo.drillUp();
    expect(topo.getCurrentPath()).toBeNull(); // 再退才回全量
  });

  it('下钻后仅该层级及子级可见（前缀匹配，非等值）', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    topo.drillTo('江岸区/一元街道');
    const stats = topo.getLevelStats();
    // 一元街道下 2 个小区节点 + 管段 p1（region 为 江岸区/一元街道）
    expect(stats.nodes).toBe(2);
    expect(stats.pipes).toBe(1);
  });

  it('getBreadcrumb / listChildren / getHierarchy 委托可用', () => {
    const topo = new PipelineTopology({ map: createMockMap(), dataset });
    topo.drillTo('江岸区/一元街道');
    expect(topo.getBreadcrumb().map((b) => b.name)).toEqual(['江岸区', '一元街道']);
    expect(topo.listChildren().map((e) => e.name)).toEqual(['同兴小区', '滨江小区']);
    expect(topo.getHierarchy(null).find((t) => t.name === '江岸区')).toBeTruthy();
  });
});
