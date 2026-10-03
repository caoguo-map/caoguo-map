# 部署 · Kubernetes

多副本 / 高可用形态：静态站走无状态 Deployment，AI 代理独立伸缩，Ingress 按路径分流。以下清单基于本仓库真实拓扑（三站静态产物 + editor-app + ai-server + PostGIS）。

## 架构

```
Ingress（map.hb.cn）
 ├─ /           → web-svc:80   （landing，含 /docs/ /demo/ /editor/ 同源路径）
 └─ /api/       → ai-svc:8787  （@caoguo/ai-server，含 WS）
                                  └─ PostGIS（StatefulSet 或外部 RDS）
```

静态四站可合并进**一个** nginx 容器（同一镜像内四份 dist，路径划分同《Nginx 单机部署》），编辑器构建时设 `base: '/editor/'`。

## 静态站 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: caoguo-web
spec:
  replicas: 2
  selector: { matchLabels: { app: caoguo-web } }
  template:
    metadata: { labels: { app: caoguo-web } }
    spec:
      containers:
        - name: nginx
          image: registry.internal/caoguo-web:latest   # nginx:alpine + 四份 dist
          ports: [{ containerPort: 80 }]
          readinessProbe:
            httpGet: { path: /index.html, port: 80 }
            initialDelaySeconds: 2
          resources:
            requests: { cpu: 50m, memory: 64Mi }
            limits: { cpu: 200m, memory: 128Mi }
---
apiVersion: v1
kind: Service
metadata: { name: web-svc }
spec:
  selector: { app: caoguo-web }
  ports: [{ port: 80, targetPort: 80 }]
```

## AI 代理 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: caoguo-ai
spec:
  replicas: 2
  selector: { matchLabels: { app: caoguo-ai } }
  template:
    metadata: { labels: { app: caoguo-ai } }
    spec:
      containers:
        - name: ai-server
          image: registry.internal/caoguo-ai:latest    # node:20 + tools/server
          ports: [{ containerPort: 8787 }]
          envFrom:
            - secretRef: { name: caoguo-ai-secrets }   # DEEPSEEK_API_KEY、POSTGRES_*
          readinessProbe:
            httpGet: { path: /api/health, port: 8787 } # 内部做 SELECT 1，pgOk 即就绪
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /api/health, port: 8787 }
            initialDelaySeconds: 15
            periodSeconds: 30
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { cpu: 500m, memory: 512Mi }
---
apiVersion: v1
kind: Secret
metadata: { name: caoguo-ai-secrets }
stringData:
  PROXY_PORT: "8787"
  POSTGRES_HOST: postgis.caoguo.svc
  POSTGRES_PORT: "5432"
  POSTGRES_DB: caoguo
  POSTGRES_USER: caoguo
  POSTGRES_PASSWORD: "<从密钥管理注入，勿提交仓库>"
  DEEPSEEK_API_KEY: "<同上>"
```

> `/api/health` 是 ai-server 内置的探活端点（`SELECT 1` 探测 PostGIS 并返回 `pgOk`），readiness/liveness 都挂它——数据库不可用时自动摘除流量。

## Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: caoguo
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"   # LLM 长响应
spec:
  rules:
    - host: map.hb.cn
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend: { service: { name: ai-svc, port: { number: 8787 } } }
          - path: /
            pathType: Prefix
            backend: { service: { name: web-svc, port: { number: 80 } } }
```

## 发布与回滚

```bash
kubectl apply -f k8s/
kubectl set image deploy/caoguo-web nginx=registry.internal/caoguo-web:v2026.10.3
kubectl rollout status deploy/caoguo-web
kubectl rollout undo deploy/caoguo-web          # 回滚
```

::::: warning 别踩坑
- Ingress 必须配 `proxy-read-timeout ≥ 300s`，否则 LLM 长响应被网关掐断。
- 静态镜像里四份 dist 来自 `pnpm build`，CI 里产物路径以 `apps/*/.vitepress/dist` 与 `apps/editor-app/dist` 为准。
- 密钥一律走 Secret/外部密钥系统；仓库根的 `docker/.env.example` 只是字段清单。
:::::
