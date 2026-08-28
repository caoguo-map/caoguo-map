/**
 * 告警提示音（PRD 扩展）。
 * 用 Web Audio API 实时合成短促 beep，无需任何音频资源文件。
 * 仅在浏览器环境可用；无 AudioContext（如 SSR / 测试）时静默降级。
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** 播放告警提示音：crit 双声高频、warn 单声低频 */
export function playAlertBeep(level: 'warn' | 'crit'): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const freq = level === 'crit' ? 880 : 600;
  const beeps = level === 'crit' ? 2 : 1;
  for (let i = 0; i < beeps; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t0 = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.16);
  }
}
