import { createServer } from '/Users/yangtanfang/project/2026/AI/caoguo-map/node_modules/.pnpm/vite@5.4.21/node_modules/vite/dist/node/index.js';

const root = process.cwd();
const server = await createServer({
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
});

for (const page of ['water/flood.md', 'water/dam.md', 'grid/topology.md', 'water/river.md']) {
  try {
    await server.ssrLoadModule('/' + page);
    console.log(`[OK] ${page}`);
  } catch (e) {
    console.log(`[ERR] ${page}: ${e.message}`);
  }
}
await server.close();
