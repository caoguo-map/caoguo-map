import { describe, it, expect, beforeEach } from 'vitest';
import { useEditor } from '../useEditor';
import { commit, undo, redo, canUndo, canRedo } from '../useHistory';

const e = useEditor();

beforeEach(() => {
  e.setConfig(e.createEmptyConfig());
  // 清空历史栈（模块级单例）：撤销到头，再 commit 清空 future
  while (canUndo()) undo();
  commit();
  while (canUndo()) undo();
});

describe('useHistory', () => {
  it('commit 后变更可撤销，撤销后可重做', () => {
    commit();
    e.addComponent('text', 0, 0);
    expect(e.activeScene.value!.components).toHaveLength(1);

    expect(canUndo()).toBe(true);
    undo();
    expect(e.activeScene.value!.components).toHaveLength(0);

    expect(canRedo()).toBe(true);
    redo();
    expect(e.activeScene.value!.components).toHaveLength(1);
  });

  it('setConfig（undo 路径）会重置选中节点', () => {
    const n = e.addComponent('text', 0, 0)!;
    expect(e.selectedId.value).toBe(n.id);
    commit();
    e.addComponent('clock', 0, 0);
    undo();
    expect(e.selectedId.value).toBeNull();
  });

  it('commit 会清空 redo 栈（分叉历史）', () => {
    commit();
    e.addComponent('text', 0, 0);
    undo();
    expect(canRedo()).toBe(true);
    commit();
    expect(canRedo()).toBe(false);
  });

  it('撤销深度快照：后续修改不影响已入栈快照', () => {
    commit();
    const sceneKey = e.activeScene.value!.key;
    e.addComponent('text', 1, 1);
    // 直接改 config 内部（不走 setConfig），undo 仍应恢复为快照
    e.state.config.scenes[0].title = 'modified';
    undo();
    expect(e.state.config.scenes[0].key).toBe(sceneKey);
    expect(e.state.config.scenes[0].title).not.toBe('modified');
  });
});
