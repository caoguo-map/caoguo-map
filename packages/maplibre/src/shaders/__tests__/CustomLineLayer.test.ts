import { describe, it, expect } from 'vitest';
import { CustomLineLayer } from '../CustomLineLayer';
import type { GlowLine } from '../glowGeometry';

describe('CustomLineLayer setLines T6', () => {
  const initial: GlowLine[] = [
    { group: 'pipe', coordinates: [[114.3, 30.5], [114.31, 30.51]] },
  ];

  it('构造时未配置的新分组会被补充兜底色', () => {
    const layer = new CustomLineLayer({
      lines: initial,
      colors: { pipe: [1, 0, 0] },
    });
    // 反射私有字段（仅测试用）
    const colors = (layer as unknown as { colors: Record<string, number[]> }).colors;
    expect(colors.pipe).toEqual([1, 0, 0]);
  });

  it('setLines 重建几何并补齐新分组兜底色（无 gl 环境）', () => {
    const layer = new CustomLineLayer({ lines: initial });
    const updated: GlowLine[] = [
      { group: 'road', coordinates: [[114.3, 30.5], [114.4, 30.6], [114.5, 30.7]] },
    ];
    layer.setLines(updated);
    const colors = (layer as unknown as { colors: Record<string, number[]> }).colors;
    expect(colors.road).toBeDefined();
    const geometry = (layer as unknown as { geometry: { groups: string[] } }).geometry;
    expect(geometry.groups).toEqual(['road']);
  });
});
