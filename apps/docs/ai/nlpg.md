# NLPG 自然语言查询

> 隶属 **`@caoguo/maplibre-ai`** 包，源码 `packages/ai/src/nlpg/`。
> 导入：`import { nlpgQuery } from '@caoguo/maplibre-ai/nlpg'`

把中文自然语言转成 **PostGIS SQL**，并经安全校验层过滤后返回可直接执行的语句。

---

## 快速上手

```ts
import { nlpgQuery } from '@caoguo/maplibre-ai/nlpg';

const r = nlpgQuery('查出使用超过 20 年的铸铁燃气管');
r.query.sql;          // SELECT * FROM pipelines WHERE ...
r.valid;              // 是否通过安全校验
r.parameterized;      // { sql: '... $1 ...', params: ['cast_iron'] }
```

空间查询（默认参考点为武汉中心 `[114.305, 30.593]`，可用 `center` 覆盖）：

```ts
const r = nlpgQuery('500 米内有几所学校', { center: [114.3, 30.5] });
r.query.sql; // ... ST_DWithin(geom, ST_SetSRID(ST_MakePoint(114.3, 30.5), 4326), 500)
```

---

## API

### `nlpgQuery(text, opts?)`

主入口：生成 → 校验 → 通过则参数化。

```ts
function nlpgQuery(text: string, opts: GenerateOptions = {}): NlpgResult

interface NlpgResult {
  query: GeneratedQuery;          // 生成的查询
  valid: boolean;                 // 是否通过安全校验
  validation: ValidationResult;   // 校验详情
  parameterized?: { sql: string; params: string[] };
}
```

> **注意**：`nlpgQuery` 固定使用**默认表白名单**，不接受自定义 `allowedTables`。
> 需要放宽白名单时，请自行调用 `validateSql(sql, 你的白名单)` 复核。

### `generatePostGISQuery(text, opts?)`

只要生成、不做校验的纯规则引擎。

```ts
function generatePostGISQuery(text: string, opts: GenerateOptions = {}): GeneratedQuery

type NlpgIntent = 'attribute_filter' | 'spatial_nearby' | 'spatial_within' | 'mixed' | 'unknown';
type Operator = '>' | '<' | '>=' | '<=' | '=' | '!=' | 'LIKE';

interface AttributeCondition { field: string; operator: Operator; value: string | number }

interface SpatialCondition {
  relation: 'dwithin' | 'within' | 'intersects' | 'contains' | 'buffer';
  point?: [number, number];     // 参考点 [lng, lat]
  radius?: number;              // 半径/缓冲（米）
  referenceColumn?: string;     // 进阶：与某几何列做空间关系
  geometryColumn: string;
}

interface GeneratedQuery {
  intent: NlpgIntent;
  table: string;                          // 白名单表
  conditions: AttributeCondition[];
  spatial: SpatialCondition | null;
  sql: string;
  confidence: number;                     // 0-1
}

interface GenerateOptions {
  center?: [number, number];    // 默认 [114.305, 30.593]
  geometryColumn?: string;      // 默认 'geom'
}
```

默认行为：非 `dwithin` 且未给 `radius` 时补 `1000`；置信度基线 `0.3`，有属性条件 +0.3、有空间条件 +0.3、表名非 `pois` +0.1，上限 `0.95`。

### 分步识别（便于调试/二次加工）

```ts
detectTable(text: string): string                                   // 未命中返回 'pois'
detectField(text: string): string | null
detectValue(text: string, field: string): string | number | null
detectSpatial(text: string, geometryColumn = 'geom'): SpatialCondition | null
```

---

## 安全校验层

```ts
import { validateSql, parameterize, DEFAULT_ALLOWED_TABLES } from '@caoguo/maplibre-ai/nlpg';

validateSql(sql: string, allowedTables: string[] = DEFAULT_ALLOWED_TABLES): ValidationResult
parameterize(sql: string): { sql: string; params: string[] }

interface ValidationResult { valid: boolean; issues: ValidationIssue[] }
interface ValidationIssue { severity: 'error' | 'warning'; rule: string; message: string }
```

`valid` = 无 `error` 级问题。校验规则（`rule` 取值）：

| rule | 说明 |
|------|------|
| `non_empty` | 空 SQL |
| `read_only` | 必须以 `SELECT` 开头 |
| `dangerous_keyword` | 拦截 DROP/DELETE/UPDATE/INSERT/ALTER/TRUNCATE/GRANT/UNION/INTO/SET…（`ST_SetSRID` 中的 `SET` 为例外） |
| `injection` | 注入特征：`--`、`/*`、`; DROP`、`' OR '`、`OR 1=1`、`UNION SELECT` 等 |
| `table_whitelist` | `FROM` 后首个表名须命中白名单 |
| `syntax` | 单引号未配对 / 括号未配对 |
| `spatial_whitelist` | `ST_xxx` 须在允许列表内 |

默认白名单（11 张表）：`pipelines, nodes, users, schools, hospitals, substations, base_stations, rivers, reservoirs, alarms, pois`

允许的空间函数：`ST_DWithin, ST_Within, ST_Intersects, ST_Contains, ST_Buffer, ST_MakePoint, ST_SetSRID, ST_Distance, ST_AsGeoJSON, ST_Transform`

---

## LLM 增强（可选）

规则引擎覆盖不到的复杂表述可叠加 LLM；**LLM 失败一律降级**为规则引擎。

```ts
import { LlmNlpg } from '@caoguo/maplibre-ai/nlpg';
import { DeepSeekClient } from '@caoguo/maplibre-ai/llm';

const nlpg = new LlmNlpg({
  client: new DeepSeekClient({ apiKey: 'sk-...' }),
  enabled: true,                 // 默认 true
  allowedTables: ['pipelines'],  // 默认 DEFAULT_ALLOWED_TABLES
});

const r = await nlpg.query('查出铸铁管');
// { query, valid, parameterized } —— 注意：无 validation 字段（与 nlpgQuery 不同）
```

降级触发条件：LLM 返回空 SQL、校验不通过、或抛错。LLM 成功时 `intent` 固定为 `'mixed'`、`confidence` 为 `0.9`。
