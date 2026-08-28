import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useEditor } from '../useEditor';
import { useDataSources } from '../useDataSources';
import type { ComponentNode } from '../../types';

const e = useEditor();
const ds = useDataSources();

beforeEach(() => {
  e.setConfig(e.createEmptyConfig());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useDataSources', () => {
  it('create/update/get/remove 基本闭环', () => {
    const d = ds.create('农机数据', { type: 'rest', url: '/api/devices' });
    expect(ds.get(d.id)?.name).toBe('农机数据');

    ds.update(d.id, { url: '/api/devices2', name: '农机数据2' });
    expect(ds.get(d.id)).toMatchObject({ url: '/api/devices2', name: '农机数据2' });

    ds.remove(d.id);
    expect(ds.get(d.id)).toBeUndefined();
  });

  it('remove 解除所有引用节点的 dataSourceId', () => {
    const d = ds.create('库数据', { type: 'mysql', host: 'x' });
    const node = e.addComponent('data-card', 0, 0) as ComponentNode;
    node.dataSourceId = d.id;

    ds.remove(d.id);
    expect(node.dataSourceId).toBeUndefined();
  });

  it('resolveForNode 优先全局托管，回退内联 dataSource', () => {
    const managed = ds.create('托管', { type: 'rest', url: '/managed' });
    const node = e.addComponent('data-card', 0, 0) as ComponentNode;
    node.dataSource = { type: 'static', staticData: [1, 2] };

    // 无引用 → 内联
    expect(ds.resolveForNode(node)).toMatchObject({ type: 'static' });
    // 有引用 → 托管
    node.dataSourceId = managed.id;
    expect(ds.resolveForNode(node)).toMatchObject({ url: '/managed' });
    // 引用悬空 → 回退内联
    node.dataSourceId = 'not-exist';
    expect(ds.resolveForNode(node)).toMatchObject({ type: 'static' });
    // 无节点 → undefined
    expect(ds.resolveForNode(undefined)).toBeUndefined();
  });

  it('test()：static 返回行数', async () => {
    const d = ds.create('静态', { type: 'static', staticData: [{ a: 1 }, { a: 2 }] });
    const res = await ds.test(d);
    expect(res).toMatchObject({ ok: true, count: 2 });
  });

  it('test()：binding 提示绑定来源', async () => {
    const d = ds.create('绑定', { type: 'binding', source: 'device-layer-1' });
    const res = await ds.test(d);
    expect(res.ok).toBe(true);
    expect(res.message).toContain('device-layer-1');
  });

  it('test()：rest 经 fetch 探测并统计 path 提取的行数', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ data: { devices: [{ id: 1 }, { id: 2 }, { id: 3 }] } }), { status: 200 }),
      ),
    );
    const d = ds.create('接口', { type: 'rest', url: '/api/devices', path: 'data.devices' });
    const res = await ds.test(d);
    expect(res).toMatchObject({ ok: true, count: 3 });
  });

  it('test()：rest 未配置地址返回失败', async () => {
    const d = ds.create('无地址', { type: 'rest' });
    const res = await ds.test(d);
    expect(res.ok).toBe(false);
  });

  it('test()：HTTP 非 2xx 返回失败', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })));
    const d = ds.create('坏接口', { type: 'rest', url: '/broken' });
    const res = await ds.test(d);
    expect(res).toMatchObject({ ok: false, message: 'HTTP 500' });
  });
});
