# GeoAI · 数据入图管线

`@caoguo/maplibre-ai` 的 GeoAI 模块解决业务数据入图的最后一公里：拿到一张 Excel/CSV，自动识别表头、解析中文地址（含错别字与口语化表达）、判定坐标系纠偏、批量编码为 GeoJSON。全程规则引擎实现，**离线可用，不依赖 LLM**。

## 能力构成

| 能力 | 入口 | 说明 |
| --- | --- | --- |
| 表头识别 | `detectHeaders(headers)` | 自动定位地址/名称/分类/经度/纬度列（-1 表示未识别） |
| 地址解析 | `parseAddress(raw)` | 中文地址 → 结构化（省/市/区/街道/门牌），`isValidAddress` 校验 |
| 地址编码 | `geocode()` / `batchGeocode()` | 本地地名库（`LOCAL_GEO_DB`）优先；批量时已有经纬度直接复用 |
| 坐标系判定 | `detectCRS(samples)` | 抽样点自动判定 wgs84 / gcj02 / cgcs2000 / unknown |
| 一键入图 | `importToGeoJSON(headers, rows, opts)` | 串联以上全部，输出 FeatureCollection + 统计报告 |

## 快速上手：一键入图

```ts
import { importToGeoJSON } from '@caoguo/maplibre-ai'

const headers = ['名称', '详细地址', '类别', '经度', '纬度']
const rows = [
  ['市一医院', '武汉市江岸区胜利街26号', 'hospital', '', ''],
  ['水厂', '武昌区临江大道', 'factory', 114.316, 30.54],
]

const result = importToGeoJSON(headers, rows, { defaultCRS: 'gcj02' })
result.features      // GeoJSON.FeatureCollection（地址已解析、坐标已纠偏）
result.stats         // ImportStats：解析成功数/失败清单/坐标来源分布
```

优先级：**已有经纬度 > 地址解析 + 本地库编码**。地址解析失败的行不会中断导入，而是进入 `stats` 的失败清单由人工处理。

## 地址解析细节

```ts
import { parseAddress, isValidAddress, batchGeocode } from '@caoguo/maplibre-ai'

const p = parseAddress('武汉市江岸区胜利街26号')
p.province   // '湖北省'
p.city       // '武汉市'
p.district   // '江岸区'

isValidAddress(p)   // 结构完整性校验

// 批量：自带经纬度的行跳过解析（省时）
batchGeocode(rows, parseAddress)
```

解析器对错别字与口语化表达做了容错（如「武汉巿」→「武汉市」），设计目标是台账数据这种「基本规范但偶有手误」的输入。

## 坐标系自动判定

```ts
import { detectCRS } from '@caoguo/maplibre-ai'

detectCRS([[114.21, 30.57], [114.22, 30.58]])   // 抽样点 → 'wgs84' | 'gcj02' | 'cgcs2000' | 'unknown'
```

判定原理：GCJ-02 相对 WGS84 有固定方向的非线性偏移，国内点如果「像是被偏移过的 WGS84」即判 gcj02；`unknown` 时应让用户显式声明（对应引擎 `dataCRS`，见《坐标系与偏移纠偏》）。

## 边界声明

GeoAI 是**规则引擎**（启发式 + 本地地名库），不是大模型：它解决高频、结构化的入图前处理。语义级的地址理解（如「江滩公园旁边那个水厂」）属于 NLPG / Copilot 的范畴。本地地名库覆盖有限时，可注入外部编码服务替换 `parse`（`ImportOptions.parse`）。

::::: tip 相关页面
- 引擎侧坐标纠偏：《坐标系与偏移纠偏》
- 自然语言查询数据库：《NLPG 自然语言查询》
:::::
