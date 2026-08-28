/**
 * 本地阈值告警中心（PRD 扩展）。
 * 遍历所有场景的「设备图层」组件，依据其阈值规则（thrField/thrWarn/thrCrit）对实时设备数值评估，
 * 汇总生成「本地规则告警」列表，供预览态侧边告警面板展示与定位。
 * 与后端推送 status 解耦：完全基于用户在编辑器里声明的本地阈值。
 */
import { computed, ref, watch, onUnmounted } from 'vue';
import { useEditor } from './useEditor';
import { useDeviceStore, setDevices } from './useDeviceStore';
import { useDataSources } from './useDataSources';
import { useDataConnection } from './useDataConnection';
import { readThresholdRule, evalThreshold, ThresholdLevel } from '../thresholds';
import { playAlertBeep } from '../alertSound';
import type { EditorNode, Scene, DataSource } from '../types';
import type { DeviceItem } from '../devices';

export interface LiveAlert {
  key: string;
  sceneKey: string;
  sceneName: string;
  deviceId: string;
  deviceName: string;
  field: string;
  value: number;
  level: Exclude<ThresholdLevel, 'none'>;
}

export function collectSceneAlerts(scene: Scene, deviceStore: { getDevices(id: string): Array<Record<string, any>> }): LiveAlert[] {
  const out: LiveAlert[] = [];
  const walk = (nodes?: EditorNode[]) => {
    if (!nodes) return;
    for (const n of nodes) {
      if (n.type === 'device-layer') {
        const rule = readThresholdRule(n.config);
        if (rule.field) {
          const devs = deviceStore.getDevices(n.id);
          for (const d of devs) {
            const v = d[rule.field];
            if (typeof v !== 'number') continue;
            const level = evalThreshold(rule, v);
            if (level === 'none') continue;
            out.push({
              key: `${scene.key}:${n.id}:${d.id}:${rule.field}`,
              sceneKey: scene.key,
              sceneName: scene.title,
              deviceId: d.id,
              deviceName: d.name ?? d.id,
              field: rule.field,
              value: v,
              level,
            });
          }
        }
      }
      walk(n.children as EditorNode[] | undefined);
    }
  };
  walk([...scene.layers, ...scene.components]);
  return out;
}

export function useAlerts() {
  const { state } = useEditor();
  const deviceStore = useDeviceStore();
  const { resolveForNode } = useDataSources();
  const conn = useDataConnection();

  // ── 主动订阅：覆盖所有场景的设备图层（不仅激活场景），确保告警面板能跨场景汇总 ──
  // 对每个 device-layer 按其节点 id 作为 store key 订阅数据源；场景/绑定变化则增量同步。
  const subs = new Map<string, () => void>();
  function allDeviceLayers(): EditorNode[] {
    const out: EditorNode[] = [];
    const walk = (nodes?: EditorNode[]) => {
      if (!nodes) return;
      for (const n of nodes) {
        if (n.type === 'device-layer') out.push(n);
        walk(n.children as EditorNode[] | undefined);
      }
    };
    for (const scene of state.config.scenes ?? []) walk([...scene.layers, ...scene.components]);
    return out;
  }
  function syncSubscriptions() {
    const needed = new Map<string, DataSource>();
    for (const layer of allDeviceLayers()) {
      const ds = resolveForNode(layer as EditorNode);
      if (ds) needed.set(layer.id, ds);
    }
    // 移除已不存在的设备图层订阅
    for (const [id, unsub] of subs) {
      if (!needed.has(id)) {
        unsub();
        subs.delete(id);
        setDevices(id, []);
      }
    }
    // 新增未订阅的设备图层
    for (const [id, ds] of needed) {
      if (!subs.has(id)) {
        subs.set(
          id,
          conn.subscribe(ds, (list: DeviceItem[]) => setDevices(id, list)),
        );
      }
    }
  }
  syncSubscriptions();
  watch(() => state.config.scenes, syncSubscriptions, { deep: true });
  onUnmounted(() => {
    for (const unsub of subs.values()) unsub();
    subs.clear();
  });

  const alerts = computed<LiveAlert[]>(() => {
    const all: LiveAlert[] = [];
    for (const scene of state.config.scenes ?? []) {
      all.push(...collectSceneAlerts(scene, deviceStore));
    }
    // 告警优先、预警其次；同级别按名称排序，便于稳定展示
    const rank: Record<string, number> = { crit: 0, warn: 1 };
    return all.sort((a, b) => rank[a.level] - rank[b.level] || a.deviceName.localeCompare(b.deviceName));
  });

  const critCount = computed(() => alerts.value.filter((a) => a.level === 'crit').length);
  const warnCount = computed(() => alerts.value.filter((a) => a.level === 'warn').length);

  /** 定位到告警设备：必要时切换场景，并选中设备（地图将平移聚焦） */
  function locate(alert: LiveAlert) {
    if (state.activeSceneKey !== alert.sceneKey) {
      state.activeSceneKey = alert.sceneKey;
    }
    deviceStore.setSelectedDevice(alert.deviceId);
  }

  // ── 告警声音/推送反馈：仅当「新增」crit 告警出现时响一次（恢复后再次触发）──
  const soundEnabled = ref(true);
  function toggleSound() {
    soundEnabled.value = !soundEnabled.value;
  }
  let prevKeys = new Set<string>();
  watch(alerts, (list) => {
    if (soundEnabled.value) {
      for (const a of list) {
        if (!prevKeys.has(a.key) && a.level === 'crit') {
          playAlertBeep('crit');
          break; // 一次批量仅响一声，避免轰炸
        }
      }
    }
    prevKeys = new Set(list.map((a) => a.key));
  });

  return { alerts, critCount, warnCount, locate, soundEnabled, toggleSound };
}
