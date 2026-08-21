/**
 * AI Debug 工具（PRD phase-3 §7）
 *
 * 功能点：
 * - AD-1 性能 Profiler 分析：分析渲染瓶颈
 * - AD-2 瓦片加载监控：实时显示瓦片请求/命中率/加载时间
 * - AD-3 内存泄漏检测：监控 GeoJSON/瓦片资源内存占用趋势
 * - AD-4 优化建议引擎：基于规则匹配常见问题
 *
 * 全部为纯函数，输入指标快照，输出诊断报告。
 */

// ============================================================
// 一、性能 Profiler 指标
// ============================================================
export interface ProfilerMetrics {
  /** 帧率（fps） */
  fps?: number;
  /** Draw call 数量 */
  drawCalls?: number;
  /** 活动图层数 */
  activeLayers?: number;
  /** 主线程长任务数（>50ms） */
  longTasks?: number;
  /** 渲染耗时（ms） */
  renderTimeMs?: number;
}

export interface ProfilerIssue {
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail: string;
  suggestion: string;
}

/**
 * AD-1 性能 Profiler 分析
 */
export function analyzePerformance(m: ProfilerMetrics): ProfilerIssue[] {
  const issues: ProfilerIssue[] = [];

  if (m.fps !== undefined && m.fps < 30) {
    issues.push({
      severity: 'error',
      title: '帧率过低',
      detail: `当前 FPS=${m.fps}，低于流畅阈值 30`,
      suggestion: '减少图层数量、启用 LOD 按需加载、降低数据密度',
    });
  } else if (m.fps !== undefined && m.fps < 60) {
    issues.push({
      severity: 'warning',
      title: '帧率偏低',
      detail: `当前 FPS=${m.fps}，未达满帧`,
      suggestion: '检查是否有频繁 setData 或 re-render',
    });
  }

  if (m.drawCalls !== undefined && m.drawCalls > 100) {
    issues.push({
      severity: 'warning',
      title: 'Draw call 数量异常',
      detail: `Draw calls=${m.drawCalls}`,
      suggestion: '合并图层，减少 paint 属性复杂度（PRD §7.2 Shader 过复杂）',
    });
  }

  if (m.activeLayers !== undefined && m.activeLayers > 50) {
    issues.push({
      severity: 'warning',
      title: '活动图层过多',
      detail: `活动图层=${m.activeLayers}`,
      suggestion: '合并同类图层，减少图层数量',
    });
  }

  if (m.longTasks !== undefined && m.longTasks > 5) {
    issues.push({
      severity: 'warning',
      title: '主线程长任务过多',
      detail: `长任务数=${m.longTasks}`,
      suggestion: '检查静态数据是否意外触发 re-render（PRD §7.2 频繁重绘）',
    });
  }

  return issues;
}

// ============================================================
// 二、瓦片加载监控（AD-2）
// ============================================================
export interface TileMetrics {
  /** 已请求瓦片数 */
  requested: number;
  /** 命中缓存数 */
  cached: number;
  /** 总加载时间（ms） */
  totalLoadMs: number;
}

export interface TileMonitorReport {
  /** 缓存命中率 */
  hitRate: number;
  /** 平均加载时间 */
  avgLoadMs: number;
  /** 是否瓦片过载 */
  overloaded: boolean;
}

/**
 * AD-2 瓦片加载监控
 */
export function analyzeTiles(m: TileMetrics, overloadThreshold = 200): TileMonitorReport {
  const hitRate = m.requested > 0 ? m.cached / m.requested : 0;
  const avgLoadMs = m.requested > 0 ? m.totalLoadMs / m.requested : 0;
  return {
    hitRate,
    avgLoadMs,
    overloaded: m.requested > overloadThreshold,
  };
}

// ============================================================
// 三、内存泄漏检测（AD-3）
// ============================================================
export interface MemorySnapshot {
  /** 时间戳 */
  timestamp: number;
  /** 占用字节 */
  bytes: number;
}

export interface MemoryLeakReport {
  /** 是否疑似泄漏 */
  suspectedLeak: boolean;
  /** 增长率（bytes/ms） */
  growthRate: number;
  /** 快照数 */
  snapshotCount: number;
}

/**
 * AD-3 内存泄漏检测：分析内存占用趋势
 */
export function detectMemoryLeak(snapshots: MemorySnapshot[]): MemoryLeakReport {
  if (snapshots.length < 2) {
    return { suspectedLeak: false, growthRate: 0, snapshotCount: snapshots.length };
  }
  const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const dt = last.timestamp - first.timestamp;
  const growthRate = dt > 0 ? (last.bytes - first.bytes) / dt : 0;

  // 持续增长 + 增长率 > 0 视为疑似泄漏
  let monotonic = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].bytes < sorted[i - 1].bytes) {
      monotonic = false;
      break;
    }
  }

  return {
    suspectedLeak: monotonic && growthRate > 0 && sorted.length >= 3,
    growthRate,
    snapshotCount: sorted.length,
  };
}

// ============================================================
// 四、优化建议引擎（AD-4）
// ============================================================
/**
 * PRD §7.2 常见问题诊断规则
 */
export const DIAGNOSIS_RULES: Array<{
  id: string;
  /** 规则描述 */
  problem: string;
  /** 检测函数 */
  detect: (m: ProfilerMetrics & Partial<TileMetrics>) => boolean;
  /** 建议 */
  suggestion: string;
}> = [
  {
    id: 'tile_overload',
    problem: '瓦片过载',
    detect: (m) => (m.requested ?? 0) > 200,
    suggestion: '增加 simplification tolerance',
  },
  {
    id: 'shader_complex',
    problem: 'Shader 过复杂',
    detect: (m) => (m.drawCalls ?? 0) > 100,
    suggestion: '合并图层，减少 paint 属性复杂度',
  },
  {
    id: 'frequent_rerender',
    problem: '频繁重绘',
    detect: (m) => (m.longTasks ?? 0) > 5,
    suggestion: '检查 data/source 是否意外更新',
  },
  {
    id: 'label_overlap',
    problem: '标注压盖',
    detect: (m) => (m.activeLayers ?? 0) > 50,
    suggestion: '启用文字避让或降低标注密度',
  },
];

/**
 * AD-4 优化建议引擎：运行规则匹配，返回命中的建议
 */
export function suggestOptimizations(
  m: ProfilerMetrics & Partial<TileMetrics>
): Array<{ id: string; problem: string; suggestion: string }> {
  return DIAGNOSIS_RULES.filter((r) => r.detect(m)).map((r) => ({
    id: r.id,
    problem: r.problem,
    suggestion: r.suggestion,
  }));
}

/** 综合诊断（AD-1~AD-4 汇总） */
export interface DebugReport {
  perfIssues: ProfilerIssue[];
  tiles?: TileMonitorReport;
  memory?: MemoryLeakReport;
  suggestions: Array<{ id: string; problem: string; suggestion: string }>;
}

export function diagnose(opts: {
  perf: ProfilerMetrics;
  tiles?: TileMetrics;
  memory?: MemorySnapshot[];
}): DebugReport {
  const perfIssues = analyzePerformance(opts.perf);
  const suggestions = suggestOptimizations({
    ...opts.perf,
    ...(opts.tiles ?? {}),
  });
  return {
    perfIssues,
    tiles: opts.tiles ? analyzeTiles(opts.tiles) : undefined,
    memory: opts.memory ? detectMemoryLeak(opts.memory) : undefined,
    suggestions,
  };
}
