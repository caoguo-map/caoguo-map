import { describe, it, expect, vi } from 'vitest';
import {
  upsertSource,
  removeSourceSafe,
  removeSourcesSafe,
  type MlMapSourceApi,
} from '../sourceUtils';

/** 构造一个最小的 MlMapSourceApi mock，模拟原生 MapLibre 的 source 行为 */
function makeMlMap(initialSources: Record<string, unknown> = {}) {
  const sources: Record<string, unknown> = { ...initialSources };
  return {
    sources,
    getSource: vi.fn((id: string) => sources[id]),
    addSource: vi.fn((id: string, data: unknown) => {
      sources[id] = data;
    }),
    setData: vi.fn((id: string, data: unknown) => {
      sources[id] = data;
    }),
    removeSource: vi.fn((id: string) => {
      delete sources[id];
    }),
  } as unknown as MlMapSourceApi & { sources: Record<string, unknown> };
}

describe('sourceUtils.upsertSource', () => {
  it('当 source 不存在时调用 addSource', () => {
    const mlMap = makeMlMap();
    const data = { type: 'geojson', data: {} };
    upsertSource(mlMap, 'x-src', data);
    expect(mlMap.addSource).toHaveBeenCalledWith('x-src', data);
    expect(mlMap.setData).not.toHaveBeenCalled();
  });

  it('当 source 已存在时调用 setData 而非 addSource（避免 Source already exists）', () => {
    const mlMap = makeMlMap({ 'x-src': { type: 'geojson', data: { a: 1 } } });
    const data2 = { type: 'geojson', data: { b: 2 } };
    upsertSource(mlMap, 'x-src', data2);
    expect(mlMap.setData).toHaveBeenCalledWith('x-src', data2);
    expect(mlMap.addSource).not.toHaveBeenCalled();
  });

  it('可安全用于层级切换重渲染：先 add 后 upsert 不抛错且数据被更新', () => {
    const mlMap = makeMlMap();
    const first = { type: 'geojson', data: { v: 1 } };
    const second = { type: 'geojson', data: { v: 2 } };
    upsertSource(mlMap, 'y-src', first);
    expect(() => upsertSource(mlMap, 'y-src', second)).not.toThrow();
    expect(mlMap.sources['y-src']).toEqual(second);
  });
});

describe('sourceUtils.removeSourceSafe', () => {
  it('存在时移除', () => {
    const mlMap = makeMlMap({ 'z-src': {} });
    removeSourceSafe(mlMap, 'z-src');
    expect(mlMap.removeSource).toHaveBeenCalledWith('z-src');
  });

  it('不存在时不调用 removeSource（避免抛错）', () => {
    const mlMap = makeMlMap();
    removeSourceSafe(mlMap, 'z-src');
    expect(mlMap.removeSource).not.toHaveBeenCalled();
  });
});

describe('sourceUtils.removeSourcesSafe', () => {
  it('批量安全移除，仅移除存在的', () => {
    const mlMap = makeMlMap({ 'a-src': {}, 'b-src': {} });
    removeSourcesSafe(mlMap, ['a-src', 'b-src', 'c-src']);
    expect(mlMap.removeSource).toHaveBeenCalledWith('a-src');
    expect(mlMap.removeSource).toHaveBeenCalledWith('b-src');
    expect(mlMap.removeSource).not.toHaveBeenCalledWith('c-src');
  });
});
