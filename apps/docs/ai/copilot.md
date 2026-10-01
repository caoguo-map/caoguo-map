# MapCopilot 自然语言生成地图代码

> 隶属 **`@caoguo/maplibre-ai`** 包，源码 `packages/ai/src/copilot/`。
> 导入：`import { MapCopilot, generateFromQuery } from '@caoguo/maplibre-ai/copilot'`

把中文描述转成可直接运行的地图代码（建图 / 加标记 / 画线 / 热力图 / 点击弹窗）。

---

## 快速上手

```ts
import { MapCopilot } from '@caoguo/maplibre-ai/copilot';

const copilot = new MapCopilot();
const r = copilot.generate('在光谷添加一个蓝色标记点');
r.intent;   // 'add_marker'
r.code;     // map.addSource('marker-src', ...) + map.addLayer({ type: 'circle', ... })
r.confidence;
r.description;
```

`MapCopilot` 带**会话上下文**，支持增量修改（触发词：改成 / 改为 / 换成 / 变成 / 调整为 / 设置成）：

```ts
copilot.generate('在光谷添加一个蓝色标记点');
copilot.generate('把颜色改成红色');   // 复用上文意图与参数，仅改 color
```

---

## 五类意图

匹配优先级与置信度：`popup_interaction` 0.92 → `heatmap` 0.9 → `add_line_polygon` 0.88 → `add_marker` 0.86 → `create_map` 0.8（实际值会按匹配串长度微调，上限 1）。

| intent | 输入示例 | 生成代码形态 |
|--------|---------|-------------|
| `create_map` | `创建一个武汉地图，暗色主题，缩放 12` | `new CaoguoMap.Map({ container, center, zoom, style })` |
| `add_marker` | `在光谷添加一个红色标记点` | `addSource('marker-src')` + `addLayer({ type: 'circle' })` |
| `add_line_polygon` | `画一条从汉口到武昌的蓝色路线` | `addSource('line-src')` + `addLayer({ type: 'line' })` |
| `heatmap` | `把这些 POI 按热度做成热力图` | `addSource('heat-src')` + `addLayer({ type: 'heatmap' })` |
| `popup_interaction` | `点击标记弹出信息窗` | `map.on('click', layerId, ...)` + `new maplibregl.Popup()` |
| `unknown` | 无匹配 | 注释 `// 无法识别的意图：...` |

---

## API

```ts
type CopilotIntent =
  | 'create_map' | 'add_marker' | 'add_line_polygon'
  | 'heatmap' | 'popup_interaction' | 'unknown';

interface CopilotParams {
  place?: string;                            // 城市/地点名（映射中心坐标）
  center?: [number, number];
  zoom?: number;
  style?: 'caoguo-dark' | 'caoguo-light';
  color?: string;                            // hex
  size?: number;                             // 线宽 / 半径
  layerId?: string;
  text?: string;                             // 弹窗文本等
}

interface CopilotResult {
  intent: CopilotIntent;
  params: CopilotParams;
  code: string;
  confidence: number;      // 0-1
  description: string;
}
```

| 导出 | 签名 | 用途 |
|------|------|------|
| `classifyIntent` | `(query: string) => { intent: CopilotIntent; confidence: number }` | 意图路由 |
| `extractParams` | `(query: string, intent: CopilotIntent) => CopilotParams` | 参数提取 |
| `generateCode` | `(intent: CopilotIntent, p: CopilotParams) => string` | 意图 + 参数 → 代码 |
| `generateFromQuery` | `(query: string) => CopilotResult` | 端到端（无上下文，纯函数） |
| `MapCopilot` | class：`generate(query)` / `reset()` / `get context()` | 带会话上下文 |
| `PLACE_COORDINATES` | `Record<string, [number, number]>` | 内置 13 个城市/地点中心（WGS84） |
| `COLOR_NAMES` | `Record<string, string>` | 中文颜色名 → hex |

`generateCode` 默认值：`center` `[114.305, 30.593]`、`zoom` `12`、`style` `'caoguo-dark'`、`color` `'#ef4444'`、`size` `8`、`layerId` `'my-layer'`。

参数提取实测：`武汉地图` → `place: '武汉'` + `center: [114.305, 30.593]`；`缩放 15` → `zoom: 15`；`暗色/亮色主题` → `'caoguo-dark'/'caoguo-light'`；`红色标记` → `'#ef4444'`；`蓝色路线` → `'#3b82f6'`。

> **命名口径**：PRD 早期文稿中的「intentRouter」对应本包的 **`classifyIntent`**，以此为准。

---

## LLM 增强（可选）

```ts
import { LlmMapCopilot } from '@caoguo/maplibre-ai/copilot';
import { DeepSeekClient } from '@caoguo/maplibre-ai/llm';

const copilot = new LlmMapCopilot({
  client: new DeepSeekClient({ apiKey: 'sk-...' }),
  enabled: true,   // 默认 true；false 则退化为纯规则引擎
});

const r = await copilot.generate('画一条从汉口到武昌的蓝色路线');
```

降级触发条件：LLM 返回 `intent === 'unknown'`、代码为空、或抛错 → 自动回落到 `generateFromQuery`。LLM 成功时 `params` 为 `{}`、`confidence` 为 `0.9`。

LLM 客户端配置（默认 DeepSeek `https://api.deepseek.com`、模型 `deepseek-chat`）见 [LLM Provider](/api/llm-provider)。
