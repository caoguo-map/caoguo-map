/**
 * 设备 Mock 数据源（并入 AI 代理服务）。
 * 提供：
 *   GET /api/devices  → 设备列表快照（REST 轮询用）
 *   WS  /api/ws       → 设备实时推送（每 2s 一帧，与编辑器设备图层联动）
 *
 * 说明：原独立 tools/mock-server.mjs 与本服务抢 8787 端口，已合并至此——
 * 一个进程同时提供 AI 代理（deepseek/nlpg/db/webhook）与设备 Mock。
 */

import crypto from 'node:crypto';

// ── 设备池（与编辑器示例一致，坐标/类型对齐，指标实时抖动）──
const DEVICES = [
  { id: 'd1', name: '无人农机 A', type: 'machine', status: 'online', lng: 114.305, lat: 30.592, load: 62 },
  { id: 'd2', name: '土壤传感器 1', type: 'soil', status: 'online', lng: 114.312, lat: 30.585, moisture: 41 },
  { id: 'd3', name: '气象站', type: 'weather', status: 'warning', lng: 114.298, lat: 30.578, wind: 12 },
  { id: 'd4', name: '灌溉泵站', type: 'pump', status: 'offline', lng: 114.32, lat: 30.6, flow: 0 },
  { id: 'd5', name: '监控摄像头', type: 'camera', status: 'fault', lng: 114.29, lat: 30.605, fps: 0 },
];

const STATUSES = ['online', 'warning', 'fault', 'offline'];

// 指标字段（按类型抖动）
const METRICS = {
  machine: { field: 'load', min: 20, max: 98 },
  soil: { field: 'moisture', min: 20, max: 80 },
  weather: { field: 'wind', min: 0, max: 30 },
  pump: { field: 'flow', min: 0, max: 45 },
  camera: { field: 'fps', min: 0, max: 30 },
};

function jitter(device) {
  const m = METRICS[device.type];
  if (!m) return device;
  const cur = device[m.field] ?? (m.min + m.max) / 2;
  const next = Math.round(Math.min(m.max, Math.max(m.min, cur + (Math.random() - 0.5) * (m.max - m.min) * 0.3)));
  // 偶发状态切换（约 8% 概率）
  const status = Math.random() < 0.08 ? STATUSES[Math.floor(Math.random() * STATUSES.length)] : device.status;
  // 离线/故障设备指标归零
  const value = status === 'offline' ? 0 : status === 'fault' && m.field === 'fps' ? 0 : next;
  return { ...device, [m.field]: value, status };
}

/** 当前设备快照（纯数组，前端数据源 path 留空即可直接当数组解析） */
export function snapshot() {
  return DEVICES.map(jitter);
}

// ── 最小 WebSocket 服务端（RFC6455 握手 + 文本帧发送）──
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const wsClients = new Set();

/** 处理 /api/ws 的 protocol upgrade（由 index.js 的 server.on('upgrade') 调用） */
export function handleUpgrade(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  wsClients.add(socket);

  // 解析客户端帧（仅读取，忽略 payload），处理关闭
  socket.on('data', (buf) => {
    if (buf.length === 0) return;
    const opcode = buf[0] & 0x0f;
    if (opcode === 0x8) {
      // close
      wsClients.delete(socket);
      socket.end();
    }
  });
  socket.on('close', () => wsClients.delete(socket));
  socket.on('error', () => wsClients.delete(socket));
}

// 发送未掩码文本帧（server → client）
function sendFrame(socket, text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

// 每 2s 向所有 WS 客户端推送最新设备快照
setInterval(() => {
  if (wsClients.size === 0) return;
  const frame = JSON.stringify(snapshot());
  for (const sock of wsClients) {
    try {
      sendFrame(sock, frame);
    } catch {
      wsClients.delete(sock);
    }
  }
}, 2000);
