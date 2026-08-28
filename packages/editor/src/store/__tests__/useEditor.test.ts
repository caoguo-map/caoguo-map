import { describe, it, expect, beforeEach } from 'vitest';
import { useEditor } from '../useEditor';
import { useDataSources } from '../useDataSources';

/** 编辑器 store 为模块级单例，用 createEmptyConfig 在每个用例前重置 */
const e = useEditor();

beforeEach(() => {
  e.setConfig(e.createEmptyConfig());
});

function scene() {
  return e.state.config.scenes[0];
}

describe('useEditor', () => {
  it('addComponent 加入当前场景并选中', () => {
    const n = e.addComponent('text', 10, 20);
    expect(n).not.toBeNull();
    expect(scene().components).toHaveLength(1);
    expect(scene().components[0].position).toMatchObject({ x: 10, y: 20 });
    expect(e.selectedId.value).toBe(n!.id);
  });

  it('未知类型返回 null', () => {
    expect(e.addComponent('not-exist', 0, 0)).toBeNull();
    expect(scene().components).toHaveLength(0);
  });

  it('指定 parentId 时嵌套进容器 children（相对定位）', () => {
    const parent = e.addComponent('card-container', 0, 0)!;
    const child = e.addComponent('text', 5, 5, parent.id)!;
    expect(parent.children).toHaveLength(1);
    expect(parent.children![0].id).toBe(child.id);
    expect(scene().components).toHaveLength(1); // 子组件不进场景顶层
  });

  it('addLayer 加入图层列表', () => {
    const l = e.addLayer('device-layer');
    expect(l).not.toBeNull();
    expect(scene().layers).toHaveLength(1);
  });

  it('removeNode 支持递归删除嵌套子组件', () => {
    const parent = e.addComponent('card-container', 0, 0)!;
    const child = e.addComponent('text', 0, 0, parent.id)!;
    e.removeNode(child.id);
    expect(parent.children).toHaveLength(0);
    e.removeNode(parent.id);
    expect(scene().components).toHaveLength(0);
  });

  it('removeNode 清除选中状态', () => {
    const n = e.addComponent('text', 0, 0)!;
    e.removeNode(n.id);
    expect(e.selectedId.value).toBeNull();
  });

  it('updatePosition 更新嵌套节点位置', () => {
    const parent = e.addComponent('card-container', 0, 0)!;
    const child = e.addComponent('text', 0, 0, parent.id)!;
    e.updatePosition(child.id, { x: 33, y: 44 });
    expect(child.position).toMatchObject({ x: 33, y: 44 });
  });

  it('bringForward / sendBackward 调整层级顺序', () => {
    const a = e.addComponent('text', 0, 0)!;
    const b = e.addComponent('clock', 0, 0)!;
    e.bringForward(a.id);
    expect(scene().components.map((c) => c.id)).toEqual([b.id, a.id]);
    e.sendBackward(a.id);
    expect(scene().components.map((c) => c.id)).toEqual([a.id, b.id]);
  });

  it('exportJSON 默认剔除 proxyBase 与数据源密码', () => {
    e.state.config.proxyBase = 'http://localhost:8787';
    const ds = useDataSourcesHelper();
    const created = ds.create('db1', { type: 'mysql', host: '10.0.0.1', password: 'secret' });
    scene().components.forEach(() => void created);

    const json = e.exportJSON();
    const parsed = JSON.parse(json);
    expect(parsed.proxyBase).toBeUndefined();
    expect(parsed.dataSources[0].password).toBeUndefined();
    expect(parsed.dataSources[0].host).toBe('10.0.0.1');
  });

  it('exportJSON({ includeSecrets: true }) 保留密码（仅草稿用）', () => {
    const ds = useDataSourcesHelper();
    ds.create('db1', { type: 'mysql', password: 'secret' });
    const parsed = JSON.parse(e.exportJSON({ includeSecrets: true }));
    expect(parsed.dataSources[0].password).toBe('secret');
  });
});

function useDataSourcesHelper() {
  return useDataSources();
}
