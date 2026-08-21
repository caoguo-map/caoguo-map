# @caoguo/maplibre-ai

> 草果地图 AI 工具链 — MapCopilot 代码生成 / GeoAI 数据入图 / NLPG 自然语言查询 / DeepSeek LLM 接入 / 性能诊断 / 样式生成器 v2

[![npm version](https://img.shields.io/npm/v/@caoguo/maplibre-ai.svg)](https://www.npmjs.com/package/@caoguo/maplibre-ai)
[![license](https://img.shields.io/npm/l/@caoguo/maplibre-ai.svg)](LICENSE)

## 安装

```bash
npm install @caoguo/maplibre-ai
```

## 功能模块

| 模块 | 子路径 | 说明 |
|------|--------|------|
| DeepSeek | `@caoguo/maplibre-ai/llm` | DeepSeek 大模型客户端（OpenAI 兼容 / 流式 / 重试 / 降级） |
| MapCopilot | `@caoguo/maplibre-ai/copilot` | 自然语言 → 地图代码生成（规则引擎 + LLM 增强） |
| GeoAI | `@caoguo/maplibre-ai/geoai` | 数据入图管线（表头识别 / 中文地址解析 / 坐标系纠偏 / 批量编码） |
| NLPG | `@caoguo/maplibre-ai/nlpg` | 自然语言 → PostGIS SQL + 安全校验层（规则引擎 + LLM） |
| AI Debug | `@caoguo/maplibre-ai/debug` | 诊断工具（性能 Profiler / 瓦片监控 / 内存泄漏 / 优化建议） |
| 样式生成 | `@caoguo/maplibre-ai/stylegen` | 样式生成器 v2（色板提取 / 行业模板 / 品牌定制 / 运营商主题 / 昼夜切换） |

## 快速开始

### 接入 DeepSeek 大模型

```ts
import { DeepSeekClient } from '@caoguo/maplibre-ai/llm';

// 浏览器环境传入你的 DeepSeek API Key（生产环境建议经服务端代理，勿在前端暴露密钥）
const client = new DeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  model: 'deepseek-chat',          // 或 'deepseek-reasoner'（深度推理）
  temperature: 0.3,
});

// 普通对话
const r = await client.chat([{ role: 'user', content: '武汉有多少个区？' }]);
console.log(r.content);

// JSON 输出（用于结构化提取）
const j = await client.chatJson<{ answer: string }>([
  { role: 'user', content: '返回 JSON' },
]);

// 流式输出
await client.chat([{ role: 'user', content: '写一首诗' }], {
  onChunk: (delta) => process.stdout.write(delta),
});
```

### MapCopilot（LLM 优先 + 规则引擎降级）

```ts
import { DeepSeekClient } from '@caoguo/maplibre-ai/llm';
import { LlmMapCopilot } from '@caoguo/maplibre-ai/copilot';

const copilot = new LlmMapCopilot({ client: new DeepSeekClient({ apiKey: '...' }) });
const r = await copilot.generate('创建一个武汉地图，暗色主题，缩放 12');
console.log(r.code); // LLM 生成；若 LLM 失败自动降级规则引擎
```

### NLPG（LLM 生成 SQL + 安全校验兜底）

```ts
import { LlmNlpg } from '@caoguo/maplibre-ai/nlpg';

const nlpg = new LlmNlpg({ client: new DeepSeekClient({ apiKey: '...' }) });
const r = await nlpg.query('查出使用超过 20 年的铸铁燃气管');
console.log(r.query.sql); // 生成的 SQL（必经安全校验层）
console.log(r.valid);      // 危险 SQL 会被拒绝并降级规则引擎
```

### GeoAI（数据自动入图）

```ts
import { importToGeoJSON } from '@caoguo/maplibre-ai/geoai';

const headers = ['名称', '地址', '类型'];
const rows = [
  ['网点A', '武汉光谷', '商业'],
  ['网点B', '武汉江汉区', '政务'],
];
const result = importToGeoJSON(headers, rows);
console.log(result.stats.successRate); // 编码成功率
// result.features 为 GeoJSON FeatureCollection
```

### NLPG（自然语言查询）

```ts
import { nlpgQuery } from '@caoguo/maplibre-ai/nlpg';

const r = nlpgQuery('查出使用超过 20 年的铸铁燃气管');
console.log(r.query.sql);    // SELECT * FROM pipelines WHERE ...
console.log(r.valid);        // 是否通过安全校验（白名单表/危险操作拦截）
```

### 性能诊断

```ts
import { diagnose } from '@caoguo/maplibre-ai/debug';

const report = diagnose({
  perf: { fps: 24, drawCalls: 120, activeLayers: 60 },
  tiles: { requested: 300, cached: 150, totalLoadMs: 1200 },
});
console.log(report.suggestions); // 命中的优化建议
```

### 样式生成器 v2

```ts
import { generateBrandStyle, generateIndustryStyle } from '@caoguo/maplibre-ai/stylegen';

const brand = generateBrandStyle({ brandColor: '#4a9eff', mode: 'dark' });
const industry = generateIndustryStyle('pipeline', 'dark'); // 六张网行业模板
```

## 设计原则

1. **AI 增强，非 AI 替代**：工具加速开发流程，不替代工程师判断。
2. **双模式架构**：规则引擎（离线、可控、可解释）+ LLM 增强（DeepSeek，复杂自由意图）。LLM 优先，失败自动降级规则引擎。
3. **安全第一**：NLPG 生成的 SQL 无论来自规则引擎还是 LLM，都必须通过安全校验层（白名单表 / 危险操作拦截 / 注入检测）方可执行。
4. **密钥安全**：`DeepSeekClient` 仅接收 API Key，不内置任何密钥。生产环境请在服务端代理调用，避免前端暴露密钥。

## 浏览器 / 环境要求

- 现代浏览器（Chrome 90+）
- Node.js 18+（`DeepSeekClient` 依赖原生 `fetch`/`ReadableStream`，或注入自定义 `fetchImpl`）
- 所有模块在 Node.js 可测（已含 89 个 vitest 用例，LLM 相关测试使用 mock fetch，不产生真实 API 调用）

## 许可

Apache-2.0