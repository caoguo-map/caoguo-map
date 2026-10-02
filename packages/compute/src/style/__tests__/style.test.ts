import { describe, it, expect } from 'vitest';
import {
  paintNodeByType,
  paintNodeByGpuUtil,
  paintNodeByStatus,
  paintLinkByUtilization,
  paintLinkByType,
  paintLinkWidthByBandwidth,
  paintNodeBy,
  paintLinkBy,
} from '../paintRules';
import { NODE_TYPE_COLORS, NODE_STATUS_COLORS, LINK_TYPE_COLORS } from '../computeTheme';
import { buildComputeLegend, legendByGpuUtil } from '../legend';

/**
 * C-1 着色层（QA 审计 P1）：compute 此前是唯一没有 style 测试文件的包，
 * 6 个 paint 纯函数 + 色板常量 + legend 全零守护。
 * paint 函数返回 MapLibre 表达式（由 feature 属性运行时取值），按表达式结构断言。
 */

const s = (v: unknown) => JSON.stringify(v);

describe('C-1 着色层 paint 规则', () => {
  it('GPU 利用率色阶：0 绿 → 0.95 红，属性缺省回退 0', () => {
    const expr = paintNodeByGpuUtil() as unknown[];
    expect(expr[0]).toBe('interpolate');
    const str = s(expr);
    expect(str).toContain('gpuUtilization');
    expect(str).toContain('#4ade80'); // 空闲绿
    expect(str).toContain('#ef4444'); // 满载红
    expect(str).toContain('coalesce'); // 缺省兜底
  });

  it('链路利用率色阶：0 绿 / 0.5 黄 / 0.8 红', () => {
    const str = s(paintLinkByUtilization());
    expect(str).toContain('#4ade80');
    expect(str).toContain('#fbbf24');
    expect(str).toContain('#ef4444');
  });

  it('线宽按带宽分档：100→4 / 40→3 / 10→2 / 兜底 1', () => {
    const expr = paintLinkWidthByBandwidth() as unknown[];
    expect(expr[0]).toBe('match');
    const str = s(expr);
    expect(str).toContain('bandwidthGbps');
    // 分档锚点齐全
    for (const anchor of [100, 40, 10]) expect(str).toContain(String(anchor));
  });

  it('工厂函数：未知 mode 回退默认（node→按类型，link→按利用率）', () => {
    expect(s(paintNodeBy('unknown-mode' as never))).toBe(s(paintNodeByType()));
    expect(s(paintLinkBy('unknown-mode' as never))).toBe(s(paintLinkByUtilization()));
  });

  it('状态/类型着色是 match 表达式且含属性名与全部分档色', () => {
    expect((paintNodeByStatus() as unknown[])[0]).toBe('match');
    expect(s(paintNodeByStatus())).toContain('status');
    const linkType = s(paintLinkByType());
    expect((paintLinkByType() as unknown[])[0]).toBe('match');
    expect(linkType).toContain('"type"'); // 注意：属性名是 type，不是 linkType
    expect(linkType).toContain('#3b82f6'); // fiber
    expect(linkType).toContain('#f59e0b'); // microwave
  });
});

describe('C-1 色板常量与 legend', () => {
  it('节点/链路类型与状态色板固化（改色必须显式改测试）', () => {
    expect(NODE_TYPE_COLORS).toEqual({
      datacenter: '#3b82f6',
      edge_node: '#4ade80',
      cloud_region: '#a78bfa',
    });
    expect(NODE_STATUS_COLORS.online).toBe('#4ade80');
    expect(NODE_STATUS_COLORS.offline).toBe('#6b7280');
    expect(NODE_STATUS_COLORS.maintenance).toBe('#fbbf24');
    expect(LINK_TYPE_COLORS.fiber).toBe('#3b82f6');
    expect(LINK_TYPE_COLORS.microwave).toBe('#f59e0b');
    expect(LINK_TYPE_COLORS.satellite).toBe('#a78bfa');
  });

  it('legend：条目非空、颜色合法、default 分支回退节点类型', () => {
    const gpu = legendByGpuUtil();
    expect(gpu.items.length).toBeGreaterThan(0);
    for (const item of gpu.items) expect(item.color).toMatch(/^#/);

    const fallback = buildComputeLegend('unknown' as never);
    expect(fallback.title).toBeTruthy();
    expect(fallback.items.length).toBeGreaterThan(0);
  });
});
