// 统一预览服务器：把三个 VitePress 站点挂在同一端口、按 base 路由。
// 落地页 /  → apps/landing/.vitepress/dist
// 文档站 /docs/ → apps/docs/.vitepress/dist
// 演示中心 /demo/ → apps/demo/.vitepress/dist
// 处理 VitePress cleanUrls：/docs/api/map → api/map.html，并回退到对应站点 index.html。
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 5180;

const APPS = [
  { base: '/docs', root: path.join(ROOT, 'apps/docs/.vitepress/dist') },
  { base: '/demo', root: path.join(ROOT, 'apps/demo/.vitepress/dist') },
  { base: '/', root: path.join(ROOT, 'apps/landing/.vitepress/dist') },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.gz': 'application/gzip',
  '.map': 'application/json; charset=utf-8',
};

function pickApp(urlPath) {
  if (urlPath === '/docs' || urlPath.startsWith('/docs/')) return APPS[0];
  if (urlPath === '/demo' || urlPath.startsWith('/demo/')) return APPS[1];
  return APPS[2];
}

async function exists(file) {
  try {
    const s = await stat(file);
    return s.isFile();
  } catch {
    return false;
  }
}

async function resolve(app, rel) {
  // rel 是去掉 base 前缀后的站内路径，如 /api/map
  const cands = [
    rel,
    rel + '.html',
    path.join(rel, 'index.html'),
  ];
  for (const c of cands) {
    const f = path.join(app.root, c);
    if (await exists(f)) return f;
  }
  // 回退到本站首页（供 hash 路由 / 客户端导航使用）
  return path.join(app.root, 'index.html');
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    const app = pickApp(urlPath);
    const rel = urlPath.startsWith(app.base) ? urlPath.slice(app.base.length) || '/' : urlPath;
    const file = await resolve(app, rel === '' ? '/' : rel);
    const data = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`草果地图预览: http://localhost:${PORT}/`);
  console.log(`  文档: http://localhost:${PORT}/docs/`);
  console.log(`  演示: http://localhost:${PORT}/demo/`);
});
