# 部署 · Docker

草果地图的展示层（落地页 / 文档站 / 演示中心）均为静态产物，可由任意静态服务器托管。以下以 Nginx 容器为例。

## 1. 构建静态产物

```bash
pnpm install
pnpm build
# 产物位于 apps/landing/dist、apps/docs/dist、apps/demo/dist
```

## 2. 反向代理配置（Nginx）

三站点通过 `base` 路径区分：

| 站点 | base | 访问路径 |
| --- | --- | --- |
| 落地页 | `/` | `https://map.hb.cn/` |
| 文档站 | `/docs/` | `https://map.hb.cn/docs/` |
| 演示中心 | `/demo/` | `https://map.hb.cn/demo/` |

```nginx
server {
  listen 80;
  server_name map.hb.cn;

  location /docs/  { alias /srv/caoguo/docs/dist/; try_files $uri $uri/ /docs/index.html; }
  location /demo/  { alias /srv/caoguo/demo/dist/; try_files $uri $uri/ /demo/index.html; }
  location /       { alias /srv/caoguo/landing/dist/; try_files $uri $uri/ /index.html; }
}
```

## 3. 容器化

```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/landing/dist   /srv/caoguo/landing/dist
COPY apps/docs/dist      /srv/caoguo/docs/dist
COPY apps/demo/dist      /srv/caoguo/demo/dist
```

```bash
docker build -t caoguo-map .
docker run -d -p 80:80 caoguo-map
```

::: tip HTTPS
生产环境务必启用 HTTPS（Let's Encrypt / 内部 CA），并通过 HSTS 加固。
:::
