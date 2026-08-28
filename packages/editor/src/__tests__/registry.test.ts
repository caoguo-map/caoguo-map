import { describe, it, expect } from 'vitest';
import {
  COMPONENT_REGISTRY,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getComponentsByCategory,
  findComponentDef,
  createComponent,
  createLayer,
  genId,
} from '../components';
import { TEMPLATES, getTemplate } from '../templates';
import type { ComponentNode } from '../types';

describe('COMPONENT_REGISTRY', () => {
  it('type 唯一', () => {
    const types = COMPONENT_REGISTRY.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('每个分类都有组件，且分类顺序完整', () => {
    const grouped = getComponentsByCategory();
    for (const cat of CATEGORY_ORDER) {
      expect(grouped[cat].length).toBeGreaterThan(0);
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });

  it('defaultSize 为正数', () => {
    for (const def of COMPONENT_REGISTRY) {
      expect(def.defaultSize.w).toBeGreaterThan(0);
      expect(def.defaultSize.h).toBeGreaterThan(0);
    }
  });

  it('createComponent 按定义实例化，未知类型返回 null', () => {
    const def = findComponentDef('text')!;
    expect(def).toBeTruthy();
    const node = createComponent('text', 10, 20) as ComponentNode;
    expect(node.type).toBe('text');
    expect(node.position).toEqual({ x: 10, y: 20, w: def.defaultSize.w, h: def.defaultSize.h });
    expect(node.config).toEqual(def.defaultConfig);
    expect(createComponent('not-exist', 0, 0)).toBeNull();
  });

  it('createLayer 仅接受 isLayer 定义', () => {
    expect(createLayer('device-layer')).not.toBeNull();
    expect(createLayer('text')).toBeNull(); // 非 isLayer
    expect(createLayer('not-exist')).toBeNull();
  });

  it('genId 唯一且带前缀', () => {
    const a = genId('x');
    const b = genId('x');
    expect(a).not.toBe(b);
    expect(a.startsWith('x-')).toBe(true);
  });
});

describe('TEMPLATES', () => {
  it('每个模板 build 出合法配置（canvas/scenes 完整）', () => {
    for (const t of TEMPLATES) {
      const cfg = t.build();
      expect(cfg.canvas?.width).toBeGreaterThan(0);
      expect(cfg.scenes.length).toBeGreaterThan(0);
      expect(cfg.version).toBeTruthy();
    }
  });

  it('模板引用的所有组件类型都存在于注册表（含嵌套 children）', () => {
    const known = new Set(COMPONENT_REGISTRY.map((d) => d.type));
    const walk = (nodes: { type: string; children?: { type: string }[] }[]) => {
      for (const n of nodes) {
        expect(known.has(n.type)).toBe(true);
        if (n.children) walk(n.children);
      }
    };
    for (const t of TEMPLATES) {
      for (const scene of t.build().scenes) {
        walk(scene.layers);
        walk(scene.components);
      }
    }
  });

  it('getTemplate 按 key 查找', () => {
    expect(TEMPLATES.length).toBeGreaterThan(0);
    expect(getTemplate(TEMPLATES[0].key)?.key).toBe(TEMPLATES[0].key);
    expect(getTemplate('not-exist')).toBeUndefined();
  });
});
