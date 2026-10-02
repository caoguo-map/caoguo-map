import { describe, it, expect, vi } from 'vitest';
import { parseScreenJSON } from '../parseScreen';
import type { DashboardConfig } from '../../types';

/**
 * §5 / §7 渲染运行时的错误路径覆盖（QA 审计 P0）。
 *
 * 结构说明：parseScreenJSON 是纯函数（已拆到 parseScreen.ts，无 Vue/DOM 依赖）；
 * renderScreen/renderFromJSON 依赖 Vue 组件（editor 的 vitest 无 vue 插件，无法加载 .vue），
 * 因此用 vi.mock 拦截组件模块后动态加载，只验证「解析失败先于 DOM 触碰」的抛错路径。
 */

vi.mock('../../editor/ScreenViewer.vue', () => ({ default: {} }));

const good: DashboardConfig = {
  version: '1.0',
  theme: 'dark',
  canvas: { width: 1920, height: 1080, background: '#0a0e1a' },
  scenes: [{ key: 's1', title: 'S', layers: [], components: [] }],
};

describe('parseScreenJSON 错误路径（P0）', () => {
  it('合法配置 → config 非空', () => {
    const r = parseScreenJSON(JSON.stringify(good));
    expect(r.config).not.toBeNull();
    expect(r.config?.scenes).toHaveLength(1);
    expect(r.reason).toBeUndefined();
  });

  it('非法 JSON 语法 → config null，reason 含语法错误', () => {
    const r = parseScreenJSON('{ not json !!!');
    expect(r.config).toBeNull();
    expect(r.reason).toContain('JSON 语法错误');
  });

  it('JSON 但不是对象（字符串/数字/null/布尔）→ 配置不是对象', () => {
    for (const raw of ['"hello"', '123', 'null', 'true']) {
      const r = parseScreenJSON(raw);
      expect(r.config).toBeNull();
      expect(r.reason).toBe('配置不是对象');
    }
  });

  it('缺 scenes 数组', () => {
    const r = parseScreenJSON(JSON.stringify({ version: '1.0', canvas: good.canvas }));
    expect(r.config).toBeNull();
    expect(r.reason).toBe('缺少 scenes 数组');
  });

  it('scenes 为空数组', () => {
    const r = parseScreenJSON(JSON.stringify({ ...good, scenes: [] }));
    expect(r.config).toBeNull();
    expect(r.reason).toBe('scenes 为空（至少需一个场景）');
  });

  it('缺 canvas.width', () => {
    const r = parseScreenJSON(
      JSON.stringify({ ...good, canvas: { height: 1080, background: '#000' } }),
    );
    expect(r.config).toBeNull();
    expect(r.reason).toBe('缺少 canvas.width');
  });
});

describe('renderFromJSON 抛错路径（P0）', () => {
  it('非法 JSON → 在触碰 DOM / 挂载组件之前抛错，message 含原因', async () => {
    const { renderFromJSON } = await import('../renderScreen');
    expect(() => renderFromJSON('#app', '{ broken')).toThrow(/大屏配置无效/);
    expect(() => renderFromJSON('#app', JSON.stringify({ ...good, scenes: [] }))).toThrow(
      /大屏配置无效/,
    );
  });
});
