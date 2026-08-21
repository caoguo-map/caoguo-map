/**
 * 草果地图演示中心 —— AI 代理客户端
 *
 * 通过 VitePress 的 vite 代理（/.vitepress/config.ts 已配置）将 /api 转发到
 * tools/server（默认 8787）。生产构建时同样走相对路径 /api。
 *
 * 端点说明见 tools/server/src/index.js：
 *   POST /api/nlpg      —— 自然语言 → SQL → PostGIS 执行 → 结果
 *   POST /api/deepseek  —— DeepSeek Chat Completions 代理
 *   GET  /api/health    —— 健康检查
 */

export interface NlpgRow {
  [key: string]: unknown;
}

export interface NlpgResult {
  ok: boolean;
  source?: string;
  sql?: string;
  rowCount?: number;
  rows?: NlpgRow[];
  validation?: { valid: boolean; issues: string[] };
  message?: string;
}

export interface DeepseekResult {
  ok: boolean;
  content?: string;
  message?: string;
}

/** 调用 NLPG 代理：自然语言 → 真实 PostGIS 查询 */
export async function queryNlpg(q: string): Promise<NlpgResult> {
  const res = await fetch('/api/nlpg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  return (await res.json()) as NlpgResult;
}

/** 调用 DeepSeek 代理 */
export async function callDeepseek(
  messages: { role: string; content: string }[],
  opts: { json?: boolean } = {},
): Promise<DeepseekResult> {
  const res = await fetch('/api/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, json: opts.json ?? false }),
  });
  return (await res.json()) as DeepseekResult;
}

/** 健康检查 */
export async function checkHealth(): Promise<{
  ok: boolean;
  postgis: boolean;
  deepseek: boolean;
}> {
  try {
    const res = await fetch('/api/health');
    return (await res.json()) as { ok: boolean; postgis: boolean; deepseek: boolean };
  } catch {
    return { ok: false, postgis: false, deepseek: false };
  }
}
