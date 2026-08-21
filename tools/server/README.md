# 草果地图 · PostGIS + AI 服务

用 Docker 跑起 PostGIS 数据库，配合 Node 代理服务打通「自然语言 → SQL → PostGIS → 结果」的完整链路。

## 架构

```
浏览器/前端
    │  fetch
    ▼
Node 代理服务 (tools/server, :8787)
    ├─ /api/deepseek  → DeepSeek 大模型（代理转发，保护密钥 + 解决 CORS）
    ├─ /api/nlpg      → 自然语言 → LLM 生成 SQL → 安全校验 → PostGIS 执行
    └─ /api/health    → 健康检查
              │  pg
              ▼
PostGIS 容器 (docker, :5433)
    11 张业务表 + 示例数据（武汉中心区域）
```

## 快速开始

### 1. 启动 PostGIS

```bash
cd docker
cp .env.example .env          # 填入 DEEPSEEK_API_KEY
docker compose up -d postgis  # 启动数据库（首次会自动拉镜像并初始化 schema + 示例数据）
```

- 镜像：`postgis/postgis:16-3.4`（PostgreSQL 16 + PostGIS 3.4）
- 端口：宿主 `5433` → 容器 `5432`
- 数据库：`caoguo` / 用户 `caoguo` / 密码 `caoguo123`
- 初始化 SQL 在 `docker/init/`（`01-extensions` / `02-schema` / `03-seed`）

可选 pgAdmin（可视化管理）：`docker compose up -d` → http://localhost:5050

### 2. 启动 AI 代理服务

```bash
cd tools/server
npm install
node src/index.js              # 监听 127.0.0.1:8787
```

### 3. 调用

```bash
# 健康检查
curl http://127.0.0.1:8787/api/health

# 自然语言查询（核心能力）
curl -X POST http://127.0.0.1:8787/api/nlpg \
  -H "Content-Type: application/json" \
  -d '{"query":"查出使用超过20年的铸铁燃气管"}'

# DeepSeek 直连代理
curl -X POST http://127.0.0.1:8787/api/deepseek \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

## 数据库表（NLPG 白名单）

| 表 | 说明 | 关键字段 |
|---|---|---|
| `pipelines` | 地下管网管段 | material / diameter / pressure / status / install_date |
| `nodes` | 管网节点 | kind / region |
| `schools` / `hospitals` | 学校 / 医院 | name / address / region |
| `substations` | 变电站（电网） | voltage / load_rate / status |
| `base_stations` | 基站（通信） | rsrp / status |
| `rivers` / `reservoirs` | 河流 / 水库 | water_level / storage_rate |
| `alarms` | 告警 | level / message |
| `pois` | POI | name / category |

所有表均含 `geom` 几何字段（WGS84 / SRID 4326）+ GiST 空间索引。

## 安全设计

1. **密钥保护**：DeepSeek API Key 只存在 `docker/.env`（已被 `.gitignore` 忽略），不进入浏览器、不进 git。
2. **SQL 安全校验**：无论 LLM 还是规则引擎生成的 SQL，执行前必经校验层：
   - 仅允许 `SELECT`（拒绝 DROP/DELETE/UPDATE/INSERT 等写操作）
   - 表白名单（只允许查询上述 11 张表）
   - SQL 注入特征拦截（注释、`OR 1=1` 等）
   - 空间函数白名单

## 已知限制

- LLM 生成 SQL 依赖 system prompt 中的「实体-表映射」和「字段存储格式」字典，新增表/字段需同步更新 `tools/server/src/index.js` 的 `NLPG_SYSTEM_PROMPT`。
- 示例数据为武汉中心区域合成数据，用于演示；真实六张网数据需另行导入。
