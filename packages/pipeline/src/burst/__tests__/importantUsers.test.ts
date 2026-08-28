import { describe, it, expect } from 'vitest';
import type { PipelineUser } from '../../types';
import {
  buildImportantUserMarkers,
  importantUserColor,
  IMPORTANT_USER_COLORS,
} from '../importantUsers';

const users: PipelineUser[] = [
  { id: 'u1', name: '市第一医院', kind: 'important', nodeId: 'n1', lng: 114.3, lat: 30.5, scale: 3 },
  { id: 'u2', name: '阳光小区', kind: 'residential', nodeId: 'n1', lng: 114.31, lat: 30.51, scale: 800 },
  { id: 'u3', name: '化工厂', kind: 'industrial', nodeId: 'n2', lng: 114.32, lat: 30.52, scale: 2 },
  { id: 'u4', name: '实验中学', kind: 'important', nodeId: 'n2', lng: 114.33, lat: 30.53 },
  { id: 'u5', name: '万达广场', kind: 'commercial', nodeId: 'n2', lng: 114.34, lat: 30.54, scale: 5 },
];

describe('buildImportantUserMarkers（B-5 重要用户标注数据层）', () => {
  it('默认只标注重要用户（医院/学校/政府/消防）', () => {
    const markers = buildImportantUserMarkers(users);
    expect(markers.length).toBe(2);
    expect(markers.map((m) => m.userId).sort()).toEqual(['u1', 'u4']);
  });

  it('按严重度降序排列', () => {
    const markers = buildImportantUserMarkers(users);
    expect(markers[0].severity).toBeGreaterThanOrEqual(markers[1].severity);
    // 规模越大严重度越高：u1(scale 3) > u4(scale 1)
    expect(markers[0].userId).toBe('u1');
  });

  it('kinds 可扩展标注范围并正确排序（重要 > 工业 > 商业）', () => {
    const markers = buildImportantUserMarkers(users, {
      kinds: ['important', 'industrial', 'commercial'],
    });
    expect(markers.length).toBe(4);
    const order = markers.map((m) => m.kind);
    expect(order.indexOf('important')).toBeLessThan(order.indexOf('industrial'));
    expect(order.indexOf('industrial')).toBeLessThan(order.indexOf('commercial'));
  });

  it('minSeverity 过滤低严重度用户', () => {
    const markers = buildImportantUserMarkers(users, { minSeverity: 100 });
    // u4 未给 scale（默认 1）→ severity = 100；u1 scale=3 → 300
    expect(markers.length).toBe(2);
    const only = buildImportantUserMarkers(users, { minSeverity: 101 });
    expect(only.map((m) => m.userId)).toEqual(['u1']);
  });

  it('标签含名称与类型，缺失名称时回退为 id', () => {
    const [u1] = buildImportantUserMarkers(users);
    expect(u1.label).toContain('市第一医院');
    expect(u1.label).toContain('重要用户');

    const anonymous = buildImportantUserMarkers([
      { id: 'u9', kind: 'important', lng: 114, lat: 30 },
    ]);
    expect(anonymous[0].name).toBe('u9');
    expect(anonymous[0].label).toContain('u9');
  });

  it('保留关联节点与备注', () => {
    const [u1] = buildImportantUserMarkers(users);
    expect(u1.nodeId).toBe('n1');
    expect(u1.scale).toBe(3);
  });

  it('空列表 / undefined 返回空数组', () => {
    expect(buildImportantUserMarkers([])).toEqual([]);
    expect(buildImportantUserMarkers(undefined)).toEqual([]);
  });
});

describe('importantUserColor', () => {
  it('按严重度分档', () => {
    expect(importantUserColor(300)).toBe(IMPORTANT_USER_COLORS.critical);
    expect(importantUserColor(100)).toBe(IMPORTANT_USER_COLORS.critical);
    expect(importantUserColor(50)).toBe(IMPORTANT_USER_COLORS.high);
    expect(importantUserColor(20)).toBe(IMPORTANT_USER_COLORS.medium);
    expect(importantUserColor(1)).toBe(IMPORTANT_USER_COLORS.low);
  });
});
