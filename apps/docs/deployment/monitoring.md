# 部署 · 监控与运维

草果地图的部署面 = 静态站 + AI 代理（唯一常驻进程）+ PostGIS。监控 accordingly 分三层，本文给可落地的最小方案与仓库既有挂钩点。

## 现状：仓库自带的健康挂钩

- **`GET /api/health`**（ai-server）：内部 `SELECT 1` 探测 PostGIS，返回 `pgOk`——进程与数据库一条端点全探活；
- **compose healthcheck**：`docker/docker-compose.yml` 的 PostGIS 带 `pg_isready`（10s 间隔 / 5 次重试），pgAdmin 依赖其 healthy。

## 第 1 层：可用性探活

```yaml
# Prometheus blackbox / 任意拨测系统
- job_name: caoguo
  static_configs:
    - targets:
        - https://map.hb.cn/index.html        # 静态站
        - https://map.hb.cn/demo/index.html
        - https://map.hb.cn/editor/index.html
        - https://map.hb.cn/api/health        # ai-server + PostGIS
```

告警规则建议：`api/health` 连续 3 个周期非 200 或 `pgOk=false` → P1；静态站 5 分钟 5xx>1% → P2。

## 第 2 层：进程与资源

- 裸机/pm2：`pm2 monit` + `pm2 logs caoguo-ai`；系统级 `systemctl status`；
- k8s：readiness/liveness 已挂 `/api/health`（见《Kubernetes》），Pod 重启计数与 OOMKilled 由集群事件天然暴露；
- PostGIS：`pg_isready` 之外，关注连接数（ai-server 使用 pg 连接池）与磁盘余量（瓦片与 GeoJSON 导入会写库）。

## 第 3 层：业务可观测

| 观测点 | 方式 |
| --- | --- |
| LLM 调用成功率 / 延迟 | `/api/deepseek`、`/api/nlpg` 的 access log 按 status 与耗时统计（nginx `$request_time`） |
| 编辑器实时链路 | `/api` 的 WebSocket 断连次数（nginx log `$status` 101） |
| 前端真实体验 | 站点接入任意 RUM（如 web-vitals 上报），重点看地图容器首帧 |
| 引擎性能基线 | 参照 PRD 非功能指标：包体积 21.3 KB、NLPG P95 <3ms（不含 SQL 执行）——升级后回归对比 |

## 日志与等保

- ai-server 输出结构化 stdout，交给 journald / 容器 stdout 收集，**含 SQL 的 NLPG 查询日志保留 ≥ 6 个月**（等保审计要求，见《离线 / 空气隔离》校验清单）；
- 天地图 `tk`、`DEEPSEEK_API_KEY` 的使用量在各自控制台设配额告警，防止泄露后打爆。

## 最小运维手册

```bash
curl -fsS http://127.0.0.1:8787/api/health   # 一条命令判断「进程+库」是否健康
pm2 restart caoguo-ai                         # 进程级恢复
docker compose -f docker/docker-compose.yml up -d postgis   # 库级恢复
```
