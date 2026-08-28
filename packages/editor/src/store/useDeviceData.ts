import { ref, watch, onUnmounted, type Ref } from 'vue';
import type { DataSource, MapLayer } from '../types';
import type { DeviceItem } from '../devices';
import { setDevices } from './useDeviceStore';
import { useDataSources } from './useDataSources';
import { useDataConnection } from './useDataConnection';

/**
 * 组件级取数 composable（保持原有返回签名）。
 *
 * P0 #3 修复：不再各自开连接，而是订阅「共享数据连接池」(useDataConnection)。
 * 相同数据源全局只建一个轮询/WS/PM 连接，本组件只是其中一个消费者；
 * 卸载时仅取消自身订阅（引用计数 -1），归零才真正关闭连接，杜绝泄漏。
 */
export function useDeviceData(layer: Ref<MapLayer | undefined>): {
  devices: Ref<DeviceItem[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  lastUpdate: Ref<number | null>;
} {
  const { resolveForNode } = useDataSources();
  const conn = useDataConnection();
  const devices = ref<DeviceItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdate = ref<number | null>(null);

  let unsub: (() => void) | null = null;
  const layerId = layer.value?.id;

  function connect() {
    const ds: DataSource | undefined = resolveForNode(layer.value);
    if (!ds) {
      devices.value = [];
      loading.value = false;
      error.value = null;
      lastUpdate.value = null;
      if (layerId) setDevices(layerId, []);
      return;
    }
    unsub = conn.subscribe(ds, (list, meta) => {
      devices.value = list;
      loading.value = meta.loading;
      error.value = meta.error;
      lastUpdate.value = Date.now();
      if (layerId) setDevices(layerId, list);
    });
  }

  connect();

  // 数据源变化（切换引用 / 内联配置改 key）→ 重新订阅，旧连接自动引用计数回收
  watch(
    () => conn.keyOf(resolveForNode(layer.value) ?? ({} as DataSource)),
    () => {
      if (unsub) { unsub(); unsub = null; }
      connect();
    },
  );

  onUnmounted(() => {
    if (unsub) unsub();
  });

  return { devices, loading, error, lastUpdate };
}
