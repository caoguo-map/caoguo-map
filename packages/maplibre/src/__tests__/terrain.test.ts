import { describe, it, expect, vi } from 'vitest';
import { applyTerrain, removeTerrain, DEFAULT_TERRAIN_TILES } from '../terrain';
import type { Map as MlMap } from 'maplibre-gl';

/**
 * 注意：地形逻辑是操作原生 maplibre-gl Map 的纯函数，因此直接 mock 原生实例，
 * 不构造 CaoguoMap（避免加载 WebGL / CSS）。
 */
function makeMlMap(initialSources: Record<string, unknown> = {}) {
  const sources: Record<string, unknown> = { ...initialSources };
  return {
    sources,
    getSource: vi.fn((id: string) => sources[id]),
    addSource: vi.fn((id: string, data: unknown) => {
      sources[id] = data;
    }),
    setTerrain: vi.fn(),
    removeSource: vi.fn((id: string) => {
      delete sources[id];
    }),
  } as unknown as MlMap & { sources: Record<string, unknown> };
}

describe('F-1.5 3D 地形渲染', () => {
  it('注入 raster-dem 源并 setTerrain（默认 Terrarium 源 + exaggeration 1.5）', () => {
    const mlMap = makeMlMap();
    applyTerrain(mlMap);

    expect(mlMap.addSource).toHaveBeenCalledWith(
      'cg-dem',
      expect.objectContaining({
        type: 'raster-dem',
        tiles: DEFAULT_TERRAIN_TILES,
        encoding: 'terrarium',
      }),
    );
    expect(mlMap.setTerrain).toHaveBeenCalledWith({ source: 'cg-dem', exaggeration: 1.5 });
  });

  it('支持覆盖 exaggeration 与 DEM 瓦片源', () => {
    const mlMap = makeMlMap();
    applyTerrain(mlMap, { exaggeration: 3, tiles: ['https://mine/dem/{z}/{x}/{y}.png'] });
    expect(mlMap.setTerrain).toHaveBeenCalledWith({ source: 'cg-dem', exaggeration: 3 });
    expect(mlMap.addSource).toHaveBeenCalledWith(
      'cg-dem',
      expect.objectContaining({ tiles: ['https://mine/dem/{z}/{x}/{y}.png'] }),
    );
  });

  it('源已存在时不重复 addSource（避免 Source already exists）', () => {
    const mlMap = makeMlMap({ 'cg-dem': { type: 'raster-dem' } });
    applyTerrain(mlMap);
    expect(mlMap.addSource).not.toHaveBeenCalled();
    expect(mlMap.setTerrain).toHaveBeenCalled();
  });

  it('removeTerrain 清除地形并移除 DEM 源', () => {
    const mlMap = makeMlMap({ 'cg-dem': { type: 'raster-dem' } });
    removeTerrain(mlMap);
    expect(mlMap.setTerrain).toHaveBeenCalledWith(null);
    expect(mlMap.removeSource).toHaveBeenCalledWith('cg-dem');
  });
});
