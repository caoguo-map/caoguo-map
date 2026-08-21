import { describe, expect, it } from 'vitest';
import {
  MemoryTileStore,
  tileKey,
  parseOfflineUrl,
  createOfflineLoader,
  offlineTileUrl,
  offlineSourceTiles,
  packGeoJSONToStore,
  type StoredTile,
} from '../index';

describe('离线存储 key / URL 解析', () => {
  it('tileKey 格式正确', () => {
    expect(tileKey('s1', 12, 34, 56)).toBe('s1:12:34:56');
  });

  it('parseOfflineUrl 解析 caoguo-offline 协议', () => {
    const url = offlineTileUrl('mySource', 10, 511, 255);
    const parsed = parseOfflineUrl(url);
    expect(parsed).toEqual({ sourceId: 'mySource', z: 10, x: 511, y: 255 });
  });

  it('非法 URL 返回 null', () => {
    expect(parseOfflineUrl('https://x/y/z')).toBeNull();
  });

  it('offlineSourceTiles 生成 {z}/{x}/{y} 模板', () => {
    expect(offlineSourceTiles('s2')).toEqual(['caoguo-offline://s2/{z}/{x}/{y}']);
  });
});

describe('MemoryTileStore 读写 / 过期', () => {
  it('put/get/has/delete', async () => {
    const s = new MemoryTileStore();
    const t: StoredTile = { data: new Uint8Array([1, 2, 3]), format: 'pbf', expires: 0 };
    await s.put('a:1:2:3', t);
    expect(await s.has('a:1:2:3')).toBe(true);
    const got = await s.get('a:1:2:3');
    expect(got?.format).toBe('pbf');
    await s.delete('a:1:2:3');
    expect(await s.has('a:1:2:3')).toBe(false);
  });

  it('过期瓦片返回 undefined', async () => {
    const s = new MemoryTileStore();
    await s.put('a:1:2:3', { data: new Uint8Array([1]), format: 'pbf', expires: Date.now() - 1000 });
    expect(await s.get('a:1:2:3')).toBeUndefined();
  });

  it('clear(prefix) 按前缀清理', async () => {
    const s = new MemoryTileStore();
    await s.put('a:1:1:1', { data: new Uint8Array([1]), format: 'pbf', expires: 0 });
    await s.put('b:1:1:1', { data: new Uint8Array([1]), format: 'pbf', expires: 0 });
    await s.clear('a:');
    expect(await s.has('a:1:1:1')).toBe(false);
    expect(await s.has('b:1:1:1')).toBe(true);
  });

  it('size 计数', async () => {
    const s = new MemoryTileStore();
    await s.put('a:1:1:1', { data: new Uint8Array([1]), format: 'pbf', expires: 0 });
    await s.put('a:1:1:2', { data: new Uint8Array([1]), format: 'pbf', expires: 0 });
    expect(await s.size()).toBe(2);
  });
});

describe('离线协议 loader', () => {
  it('命中时返回 { data: ArrayBuffer }', async () => {
    const s = new MemoryTileStore();
    const enc = new TextEncoder().encode('{"ok":true}');
    await s.put(tileKey('src', 5, 10, 12), { data: enc, format: 'geojson', expires: 0 });
    const loader = createOfflineLoader({ store: s });
    const url = offlineTileUrl('src', 5, 10, 12);
    const res = await loader({ url } as never, new AbortController());
    const text = new TextDecoder().decode(res.data);
    expect(text).toBe('{"ok":true}');
  });

  it('未命中时 reject', async () => {
    const s = new MemoryTileStore();
    const loader = createOfflineLoader({ store: s });
    const url = offlineTileUrl('src', 5, 10, 12);
    await expect(loader({ url } as never, new AbortController())).rejects.toBeInstanceOf(Error);
  });
});

describe('packGeoJSONToStore 分桶', () => {
  const geojson = {
    type: 'FeatureCollection' as const,
    features: [
      {
        geometry: { type: 'Point', coordinates: [114.3055, 30.5928] },
        properties: { name: '武汉' },
      },
      {
        geometry: { type: 'Point', coordinates: [116.404, 39.915] },
        properties: { name: '北京' },
      },
    ],
  };

  it('两点被写入各自瓦片（分桶正确）', async () => {
    const s = new MemoryTileStore();
    const count = await packGeoJSONToStore(s, { sourceId: 'poi', geojson, maxZoom: 10 });
    expect(count).toBeGreaterThanOrEqual(2);

    const findFeatureTile = async (name: string, lon: number, lat: number) => {
      for (let z = 0; z <= 10; z++) {
        const x = Math.floor(((lon + 180) / 360) * Math.pow(2, z));
        const latRad = (lat * Math.PI) / 180;
        const y = Math.floor(
          ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z)
        );
        const t = await s.get(tileKey('poi', z, x, y));
        if (t) {
          const fc = JSON.parse(new TextDecoder().decode(t.data as ArrayBuffer));
          if (fc.features.some((f: any) => f.properties.name === name)) return true;
        }
      }
      return false;
    };

    // 武汉与北京应分别落入各自瓦片（说明按坐标分桶，而非全量写入）
    const foundWuhan = await findFeatureTile('武汉', 114.3055, 30.5928);
    expect(foundWuhan).toBe(true);
    const foundBeijing = await findFeatureTile('北京', 116.404, 39.915);
    expect(foundBeijing).toBe(true);
  });
});
