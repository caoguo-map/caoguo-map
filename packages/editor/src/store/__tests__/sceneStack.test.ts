import { describe, it, expect, beforeEach } from 'vitest';
import { useEditor } from '../useEditor';

function setup() {
  const e: any = useEditor();
  e.setConfig({
    version: '1.0',
    name: 't',
    width: 1920,
    height: 1080,
    background: '#000',
    scenes: [
      { key: 'a', title: 'A', layers: [], components: [] },
      { key: 'b', title: 'B', layers: [], components: [] },
      { key: 'c', title: 'C', layers: [], components: [] },
    ],
    components: [],
    layers: [],
  });
  return e;
}

describe('useEditor 场景栈（下钻返回导航）', () => {
  let e: any;
  beforeEach(() => {
    e = setup();
    e.switchScene('a', false);
  });

  it('普通切换(record=false)不压栈', () => {
    const depth = e.sceneHistory.length;
    e.switchScene('b', false);
    expect(e.sceneHistory.length).toBe(depth);
    expect(e.state.activeSceneKey).toBe('b');
  });

  it('下钻(record=true)压栈，goBackScene 返回上一级', () => {
    const depth = e.sceneHistory.length;
    e.switchScene('b');
    expect(e.sceneHistory.length).toBe(depth + 1);
    expect(e.canGoBack()).toBe(true);
    const back = e.goBackScene();
    expect(back).toBe('a');
    expect(e.state.activeSceneKey).toBe('a');
    expect(e.canGoBack()).toBe(false);
  });

  it('多级下钻后逐级返回', () => {
    e.switchScene('b');
    e.switchScene('c');
    expect(e.goBackScene()).toBe('b');
    expect(e.goBackScene()).toBe('a');
    expect(e.goBackScene()).toBeNull();
  });

  it('重复下钻同一来源不重复压栈', () => {
    e.switchScene('b');
    const depth = e.sceneHistory.length;
    e.switchScene('b'); // 相同来源，不应重复入栈
    expect(e.sceneHistory.length).toBe(depth);
    expect(e.goBackScene()).toBe('a');
  });

  it('goBackScene 回到栈顶来源并清空该级', () => {
    e.switchScene('b');
    const back = e.goBackScene();
    expect(back).toBe('a');
    expect(e.canGoBack()).toBe(false);
  });
});
