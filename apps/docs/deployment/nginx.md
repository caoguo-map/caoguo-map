# 部署 · Nginx 单机部署

生产最简形态：一台主机 + Nginx 托管全部静态站 + 反代 AI 代理服务。适用于中小规模与私有化单机交付。

## 站点与路径规划

四个前端均为静态产物，经 `base` 路径共存于一个域名：

| 站点 | base | 产物目录（仓库内路径） |
| --- | --- | --- |
| 落地页 | `/` | `apps/landing/.vitepress/dist` |
| 文档站 | `/docs/` | `apps/docs/.vitepress/dist` |
| 演示中心 | `/demo/` | `apps/demo/.vitepress/dist` |
| 大屏编辑器 | `/editor/` | `apps/editor-app/dist`（构建时需设 `base: '/editor/'`） |

AI 代理服务（`@caoguo/ai-server`）是唯一的动态进程，监听 `127.0.0.1:8787`，路径 `/api/deepseek`、`/api/nlpg`、`/api/health`（含 WebSocket）。

## 构建

```bash
pnpm install
pnpm build                     # pnpm -r build：全部包 + 四个应用
```

## nginx.conf 参考

```nginx
server {
  listen 80;
  server_name map.hb.cn;

  # --- 静态站：HTML 回退，assets 走下方长缓存 ---
  location /docs/  { alias /srv/caoguo/docs/dist/;   try_files $uri $uri/ /docs/index.html; }
  location /demo/  { alias /srv/caoguo/demo/dist/;   try_files $uri $uri/ /demo/index.html; }
  location /editor/ { alias /srv/caoguo/editor/dist/; try_files $uri $uri/ /editor/index.html; }
  location /       { alias /srv/caoguo/landing/dist/; try_files $uri $uri/ /index.html; }

  location ~* \.(js|css|woff2?|png|svg|pbf)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  # --- AI 代理：editor-app 的 /api 经此转发（含 WS） ---
  location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # WebSocket
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 300s;                     # LLM 长响应
    client_max_body_size 20m;                    # GeoJSON 导入
  }

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
}
```

## 进程管理（ai-server）

```bash
# 直接跑（读取 docker/.env 的 PROXY_PORT / POSTGRES_* / DEEPSEEK_API_KEY）
node tools/server/src/index.js

# 或 pm2 守护
pm2 start tools/server/src/index.js --name caoguo-ai
pm2 save && pm2 startup
```

数据库依赖见仓库 `docker/docker-compose.yml`（PostGIS 16-3.4，宿主 `5433→5432`，自带 `pg_isready` healthcheck；pgAdmin 5050）。

## 上线检查单

- [ ] HTTPS（Let's Encrypt / 内部 CA）+ HSTS
- [ ] 天地图 `tk` 密钥仅经服务端使用，不打包进前端（见《瓦片服务》）
- [ ] `DEEPSEEK_API_KEY` 等密钥只存在于 ai-server 的环境变量
- [ ] 编辑器站点构建时 `base` 与 Nginx 路径一致，否则资源 404

::::: tip 下一步
- 内网完全断网形态：见《离线 / 空气隔离》
- 容器编排形态：见《Kubernetes 部署》
:::::
