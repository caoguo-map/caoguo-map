/**
 * MapCopilot v1（PRD phase-0 §5.5）
 *
 * 自然语言 → 草果地图 API 代码生成。
 *
 * v1 采用「意图识别 + 参数提取 + 模板生成」的规则引擎方案（不依赖大模型），
 * 覆盖 PRD 定义的 5 类核心交互意图：
 *   I-1 create_map        创建基础地图
 *   I-2 add_marker        添加点标记
 *   I-3 add_line_polygon  添加线/面
 *   I-4 heatmap           数据可视化（热力图）
 *   I-5 popup_interaction 交互功能（点击弹窗）
 *
 * 全部为纯函数，可离线运行。支持上下文增量修改（"把颜色改成红色"）。
 */

// ============================================================
// 一、类型定义
// ============================================================
export type CopilotIntent =
  | 'create_map'
  | 'add_marker'
  | 'add_line_polygon'
  | 'heatmap'
  | 'popup_interaction'
  | 'unknown';

/** 提取出的地图参数 */
export interface CopilotParams {
  /** 城市/地点名（用于映射中心坐标） */
  place?: string;
  /** 地图中心 [lng, lat] */
  center?: [number, number];
  /** 缩放级别 */
  zoom?: number;
  /** 主题样式 */
  style?: 'caoguo-dark' | 'caoguo-light';
  /** 要素颜色（hex） */
  color?: string;
  /** 线宽 / 半径 */
  size?: number;
  /** 图层 ID（用于交互意图） */
  layerId?: string;
  /** 文本内容（弹窗等） */
  text?: string;
}

export interface CopilotResult {
  intent: CopilotIntent;
  params: CopilotParams;
  /** 生成的代码 */
  code: string;
  /** 识别置信度 0-1 */
  confidence: number;
  /** 可读说明 */
  description: string;
}

// ============================================================
// 二、知识库（城市坐标 / 颜色 / 意图关键词）
// ============================================================
/** 常见城市/地点中心坐标（WGS84） */
export const PLACE_COORDINATES: Record<string, [number, number]> = {
  武汉: [114.305, 30.593],
  光谷: [114.428, 30.507],
  汉口: [114.268, 30.586],
  武昌: [114.316, 30.554],
  北京: [116.407, 39.904],
  上海: [121.474, 31.23],
  广州: [113.264, 23.129],
  深圳: [114.058, 22.543],
  成都: [104.067, 30.573],
  杭州: [120.155, 30.274],
  南京: [118.796, 32.06],
  重庆: [106.551, 29.563],
  西安: [108.94, 34.341],
  天津: [117.2, 39.084],
};

/** 颜色名 → hex */
export const COLOR_NAMES: Record<string, string> = {
  红: '#ef4444',
  红色: '#ef4444',
  橙: '#f97316',
  橙色: '#f97316',
  黄: '#f59e0b',
  黄色: '#f59e0b',
  绿: '#22c55e',
  绿色: '#22c55e',
  青: '#22d3ee',
  蓝色: '#3b82f6',
  蓝: '#3b82f6',
  紫: '#8b5cf6',
  紫色: '#8b5cf6',
  粉: '#ec4899',
  灰: '#6b7280',
  黑色: '#111827',
  白色: '#ffffff',
};

/** 意图关键词（按优先级匹配） */
const INTENT_PATTERNS: Array<{ intent: CopilotIntent; re: RegExp; confidence: number }> = [
  { intent: 'popup_interaction', re: /弹窗|信息窗|弹出|popup|点击.*?显示|点击.*?弹出|点击.*?信息/, confidence: 0.92 },
  { intent: 'heatmap', re: /热力|heatmap|热度|密度图|热图/, confidence: 0.9 },
  { intent: 'add_line_polygon', re: /路线|连线|线段|画.{0,2}(线|面)|多边形|折线|面要素|LineString|polygon/, confidence: 0.88 },
  { intent: 'add_marker', re: /标记|marker|点标记|加点|标注|mark/, confidence: 0.86 },
  { intent: 'create_map', re: /地图|初始化|创建|生成|画布|渲染|map/, confidence: 0.8 },
];

// ============================================================
// 三、意图识别
// ============================================================
export function classifyIntent(query: string): { intent: CopilotIntent; confidence: number } {
  let best: { intent: CopilotIntent; confidence: number } = { intent: 'unknown', confidence: 0 };
  for (const p of INTENT_PATTERNS) {
    const m = query.match(p.re);
    if (m) {
      const c = p.confidence * (1 + 0.03 * Math.min(m[0].length / query.length, 1));
      if (c > best.confidence) best = { intent: p.intent, confidence: Math.min(c, 1) };
    }
  }
  return best;
}

// ============================================================
// 四、参数提取
// ============================================================
export function extractParams(query: string, intent: CopilotIntent): CopilotParams {
  const params: CopilotParams = {};

  // 地点 → 中心坐标
  for (const [name, coord] of Object.entries(PLACE_COORDINATES)) {
    if (query.includes(name)) {
      params.place = name;
      params.center = coord;
      break;
    }
  }

  // 缩放级别
  const zoomMatch = query.match(/缩放\s*(\d{1,2})|zoom\s*(\d{1,2})|级别\s*(\d{1,2})/i);
  if (zoomMatch) {
    const z = parseInt(zoomMatch[1] ?? zoomMatch[2] ?? zoomMatch[3]);
    if (!Number.isNaN(z) && z >= 0 && z <= 22) params.zoom = z;
  }

  // 主题
  if (/暗色|暗黑|深色|dark|夜间/.test(query)) params.style = 'caoguo-dark';
  else if (/亮色|浅色|白色|light|白天/.test(query)) params.style = 'caoguo-light';

  // 颜色
  for (const [name, hex] of Object.entries(COLOR_NAMES)) {
    if (query.includes(name)) {
      params.color = hex;
      break;
    }
  }

  // 尺寸（线宽/半径）
  const sizeMatch = query.match(/(?:宽度|半径|大小|width|size)\s*(\d+)/i);
  if (sizeMatch) params.size = parseInt(sizeMatch[1]);

  // 图层 ID（交互意图用）
  const layerMatch = query.match(/(?:图层|layer)\s*["']?([\w-]+)["']?/i);
  if (layerMatch) params.layerId = layerMatch[1];

  // 文本内容（弹窗用）
  const textMatch = query.match(/["「『]([^"」』]+)["」』]/);
  if (textMatch) params.text = textMatch[1];

  return params;
}

// ============================================================
// 五、代码模板生成
// ============================================================
export function generateCode(intent: CopilotIntent, p: CopilotParams): string {
  const center = p.center ?? [114.305, 30.593];
  const zoom = p.zoom ?? 12;
  const style = p.style ?? 'caoguo-dark';
  const color = p.color ?? '#ef4444';
  const size = p.size ?? 8;
  const layerId = p.layerId ?? 'my-layer';

  switch (intent) {
    case 'create_map':
      return [
        `const map = new CaoguoMap.Map({`,
        `  container: 'map',`,
        `  center: [${center[0]}, ${center[1]}],`,
        `  zoom: ${zoom},`,
        `  style: '${style}',`,
        `});`,
      ].join('\n');

    case 'add_marker':
      return [
        `map.addSource('marker-src', {`,
        `  type: 'geojson',`,
        `  data: { type: 'Feature', geometry: { type: 'Point', coordinates: [${center[0]}, ${center[1]}] }, properties: {} },`,
        `});`,
        `map.addLayer({`,
        `  id: '${layerId}',`,
        `  type: 'circle',`,
        `  source: 'marker-src',`,
        `  paint: { 'circle-radius': ${size}, 'circle-color': '${color}' },`,
        `});`,
      ].join('\n');

    case 'add_line_polygon':
      return [
        `map.addSource('line-src', {`,
        `  type: 'geojson',`,
        `  data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[${center[0]}, ${center[1]}], [${(center[0] + 0.05).toFixed(3)}, ${(center[1] + 0.03).toFixed(3)}]] }, properties: {} },`,
        `});`,
        `map.addLayer({`,
        `  id: '${layerId}',`,
        `  type: 'line',`,
        `  source: 'line-src',`,
        `  paint: { 'line-color': '${color}', 'line-width': ${Math.max(2, size)} },`,
        `});`,
      ].join('\n');

    case 'heatmap':
      return [
        `map.addSource('heat-src', {`,
        `  type: 'geojson',`,
        `  data: { type: 'FeatureCollection', features: [] },`,
        `});`,
        `map.addLayer({`,
        `  id: '${layerId}',`,
        `  type: 'heatmap',`,
        `  source: 'heat-src',`,
        `  paint: {`,
        `    'heatmap-weight': 1,`,
        `    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(33,102,172,0)', 0.5, '${color}', 1, 'rgb(239,68,68)'],`,
        `    'heatmap-radius': ${Math.max(20, size * 4)},`,
        `  },`,
        `});`,
      ].join('\n');

    case 'popup_interaction':
      return [
        `map.on('click', '${layerId}', (e) => {`,
        `  const coords = e.features[0].geometry.coordinates.slice();`,
        `  new maplibregl.Popup()`,
        `    .setLngLat(coords)`,
        `    .setHTML('${p.text ?? '要素信息'}')`,
        `    .addTo(map.instance);`,
        `});`,
      ].join('\n');

    default:
      return `// 无法识别的意图：${intent}`;
  }
}

// ============================================================
// 六、MapCopilot 主入口（含上下文增量修改）
// ============================================================
export function generateFromQuery(query: string): CopilotResult {
  const { intent, confidence } = classifyIntent(query);
  const params = extractParams(query, intent);
  const code = generateCode(intent, params);
  return {
    intent,
    params,
    code,
    confidence,
    description: buildDescription(intent, params),
  };
}

function buildDescription(intent: CopilotIntent, p: CopilotParams): string {
  const parts: string[] = [];
  switch (intent) {
    case 'create_map':
      parts.push('创建基础地图');
      break;
    case 'add_marker':
      parts.push('添加点标记');
      break;
    case 'add_line_polygon':
      parts.push('添加线/面要素');
      break;
    case 'heatmap':
      parts.push('生成热力图');
      break;
    case 'popup_interaction':
      parts.push('绑定点击弹窗');
      break;
    default:
      parts.push('未知意图');
  }
  if (p.place) parts.push(`地点:${p.place}`);
  if (p.color) parts.push(`颜色:${p.color}`);
  return parts.join(' ');
}

/**
 * MapCopilot 组件类：维护当前会话上下文，支持增量修改。
 *
 * 用法：
 *   const copilot = new MapCopilot();
 *   copilot.generate('创建一个武汉地图，暗色主题，缩放 12'); // → 代码
 *   copilot.generate('把颜色改成红色');                     // → 增量修改后代码
 */
export class MapCopilot {
  private lastIntent: CopilotIntent = 'create_map';
  private lastParams: CopilotParams = {};

  /** 生成代码（支持上下文增量修改） */
  generate(query: string): CopilotResult {
    const { intent, confidence } = classifyIntent(query);
    const isModification = /改成|改为|换成|变成|调整为|设置成/.test(query);

    if (isModification && this.lastIntent !== 'unknown') {
      // 增量修改：提取新参数，合并到上一轮参数
      const delta = extractParams(query, this.lastIntent);
      this.lastParams = { ...this.lastParams, ...delta };
      const code = generateCode(this.lastIntent, this.lastParams);
      return {
        intent: this.lastIntent,
        params: { ...this.lastParams },
        code,
        confidence,
        description: buildDescription(this.lastIntent, this.lastParams),
      };
    }

    // 全新意图
    this.lastIntent = intent;
    this.lastParams = extractParams(query, intent);
    const code = generateCode(intent, this.lastParams);
    return {
      intent,
      params: { ...this.lastParams },
      code,
      confidence,
      description: buildDescription(intent, this.lastParams),
    };
  }

  /** 重置上下文 */
  reset(): void {
    this.lastIntent = 'create_map';
    this.lastParams = {};
  }

  /** 获取当前上下文 */
  get context(): { intent: CopilotIntent; params: CopilotParams } {
    return { intent: this.lastIntent, params: { ...this.lastParams } };
  }
}
