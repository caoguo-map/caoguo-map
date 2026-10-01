import { describe, it, expect, beforeEach } from 'vitest';
import { useEditor } from '../useEditor';
import { useHistory, commit } from '../useHistory';
import { useDragDrop, startMove } from '../useDragDrop';
import type { DashboardConfig } from '../../types';

function sceneWith(components: any[]): DashboardConfig {
  return {
    version: '1.0',
    theme: 'dark',
    canvas: { width: 1920, height: 1080, background: '#000' },
    scenes: [
      {
        key: 's1',
        title: 'S1',
        map: { center: [0, 0], zoom: 12, tiles: 'dark' },
        layers: [],
        components,
      },
    ],
  };
}

// node 环境无 window：用 EventTarget 模拟，满足 window.addEventListener / dispatchEvent
function fire(type: 'mousemove' | 'mouseup', clientX = 0, clientY = 0) {
  const ev = new Event(type) as any;
  ev.clientX = clientX;
  ev.clientY = clientY;
  (globalThis.window as any).dispatchEvent(ev);
}

describe('useDragDrop 拖动 / 对齐参考线 / 历史', () => {
  beforeEach(() => {
    (globalThis as any).window = new EventTarget();
    useEditor().setConfig(
      sceneWith([{ id: 'a', type: 'text', position: { x: 100, y: 100, w: 50, h: 50 }, config: {}, style: {} }]),
    );
  });

  it('拖动移动更新节点坐标并清理参考线', () => {
    const e = useEditor();
    const { guides } = useDragDrop();
    startMove({ clientX: 0, clientY: 0 } as MouseEvent, 'a');
    fire('mousemove', 30, 40);
    expect(e.findNode('a')!.node.position.x).toBe(130);
    expect(e.findNode('a')!.node.position.y).toBe(140);
    fire('mouseup');
    expect(guides.value).toEqual({ x: [], y: [] });
  });

  it('拖动对齐到其它节点参考线并生成 guides', () => {
    const e = useEditor();
    const { guides } = useDragDrop();
    e.state.snapToGrid = false; // 隔离网格吸附，单独验证参考线对齐
    e.setConfig(
      sceneWith([
        { id: 'a', type: 'text', position: { x: 100, y: 100, w: 50, h: 50 }, config: {}, style: {} },
        // 锚点 B 左缘在 x=200，作为对齐基准
        { id: 'b', type: 'text', position: { x: 200, y: 300, w: 50, h: 50 }, config: {}, style: {} },
      ]),
    );
    // 原始左缘 100，移动 +95 → 195，与基准 200 差 5px（命中阈值），应吸附到 200
    startMove({ clientX: 0, clientY: 0 } as MouseEvent, 'a');
    fire('mousemove', 95, 0);
    expect(guides.value.x).toContain(200);
    fire('mouseup');
    expect(e.findNode('a')!.node.position.x).toBe(200);
    expect(guides.value).toEqual({ x: [], y: [] });
  });

  it('仅点击（无位移）不写入历史，避免污染撤销栈', () => {
    const e = useEditor();
    const { undo, canRedo } = useHistory();
    commit(); // 落一条基线快照
    // 真实拖动：位移后应收录历史
    startMove({ clientX: 0, clientY: 0 } as MouseEvent, 'a');
    fire('mousemove', 50, 50);
    fire('mouseup');
    expect(e.findNode('a')!.node.position.x).toBe(150);
    undo();
    expect(e.findNode('a')!.node.position.x).toBe(100);
    expect(canRedo()).toBe(true); // 撤销后仍有可重做项
    // 仅点击（mousedown + mouseup，无 mousemove）
    startMove({ clientX: 0, clientY: 0 } as MouseEvent, 'a');
    fire('mouseup');
    // 修复前：此处会多 commit 一条快照并清空 future → canRedo 变 false
    expect(canRedo()).toBe(true);
  });
});
