import { describe, it, expect } from 'vitest';
import {
  classifyIntent,
  extractParams,
  generateCode,
  generateFromQuery,
  MapCopilot,
  PLACE_COORDINATES,
} from '../copilot';

describe('MapCopilot 意图识别', () => {
  it('识别创建地图意图', () => {
    const r = classifyIntent('创建一个武汉地图，暗色主题');
    expect(r.intent).toBe('create_map');
  });

  it('识别点标记意图', () => {
    const r = classifyIntent('在光谷添加一个红色标记点');
    expect(r.intent).toBe('add_marker');
  });

  it('识别线/面意图', () => {
    const r = classifyIntent('画一条从汉口到武昌的蓝色路线');
    expect(r.intent).toBe('add_line_polygon');
  });

  it('识别热力图意图', () => {
    const r = classifyIntent('把这些 POI 按热度做成热力图');
    expect(r.intent).toBe('heatmap');
  });

  it('识别交互弹窗意图', () => {
    const r = classifyIntent('点击标记弹出信息窗');
    expect(r.intent).toBe('popup_interaction');
  });
});

describe('MapCopilot 参数提取', () => {
  it('提取地点坐标', () => {
    const p = extractParams('武汉地图', 'create_map');
    expect(p.place).toBe('武汉');
    expect(p.center).toEqual(PLACE_COORDINATES['武汉']);
  });

  it('提取缩放级别', () => {
    const p = extractParams('缩放 15', 'create_map');
    expect(p.zoom).toBe(15);
  });

  it('提取主题', () => {
    expect(extractParams('暗色主题', 'create_map').style).toBe('caoguo-dark');
    expect(extractParams('亮色主题', 'create_map').style).toBe('caoguo-light');
  });

  it('提取颜色', () => {
    expect(extractParams('红色标记', 'add_marker').color).toBe('#ef4444');
    expect(extractParams('蓝色路线', 'add_line_polygon').color).toBe('#3b82f6');
  });
});

describe('MapCopilot 代码生成', () => {
  it('生成地图初始化代码', () => {
    const code = generateCode('create_map', { place: '武汉', center: PLACE_COORDINATES['武汉'], zoom: 12, style: 'caoguo-dark' });
    expect(code).toContain('new CaoguoMap.Map');
    expect(code).toContain('style: \'caoguo-dark\'');
    expect(code).toContain('114.305');
  });

  it('生成点标记代码', () => {
    const code = generateCode('add_marker', { color: '#ef4444', size: 8, center: [114.3, 30.5] });
    expect(code).toContain("type: 'circle'");
    expect(code).toContain("'circle-color': '#ef4444'");
  });

  it('生成热力图代码', () => {
    const code = generateCode('heatmap', { color: '#3b82f6' });
    expect(code).toContain("type: 'heatmap'");
  });

  it('生成弹窗交互代码', () => {
    const code = generateCode('popup_interaction', { layerId: 'marker', text: 'hello' });
    expect(code).toContain("map.on('click', 'marker'");
    expect(code).toContain('hello');
  });
});

describe('MapCopilot 上下文增量修改', () => {
  it('支持"把颜色改成红色"增量修改', () => {
    const copilot = new MapCopilot();
    const first = copilot.generate('在光谷添加一个蓝色标记点');
    expect(first.intent).toBe('add_marker');
    expect(first.params.color).toBe('#3b82f6');

    const second = copilot.generate('把颜色改成红色');
    expect(second.intent).toBe('add_marker');
    expect(second.params.color).toBe('#ef4444');
    expect(second.code).toContain("'circle-color': '#ef4444'");
  });

  it('reset 清空上下文', () => {
    const copilot = new MapCopilot();
    copilot.generate('创建地图');
    copilot.reset();
    expect(copilot.context.intent).toBe('create_map');
  });
});

describe('MapCopilot 端到端', () => {
  it('generateFromQuery 返回完整结果', () => {
    const r = generateFromQuery('创建一个武汉地图，暗色主题，缩放 12');
    expect(r.intent).toBe('create_map');
    expect(r.code).toContain('CaoguoMap.Map');
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.description).toContain('创建基础地图');
  });
});
