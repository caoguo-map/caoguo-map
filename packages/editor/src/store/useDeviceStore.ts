import { reactive } from 'vue';
import type { DeviceItem } from '../devices';

/**
 * 设备数据场景级缓存（单例）。
 * - devicesByLayer：按 device-layer 节点 id 缓存设备列表，供 MapNode / 详情 / 列表 / 筛选共享，避免重复 fetch。
 * - selectedDeviceId：当前选中的设备（点击地图 marker 或列表项设置），用于详情面板联动。
 * - filterStatus：当前筛选状态（'all' | 具体状态），FilterTabs 设置，MapNode/DeviceList 据此过滤。
 * 注意：仅缓存运行时数据，不进入可序列化的大屏配置（导出 JSON 不含设备明细）。
 */
const store = reactive<{
  devicesByLayer: Record<string, DeviceItem[]>;
  selectedDeviceId: string | null;
  filterStatus: string;
}>({
  devicesByLayer: {},
  selectedDeviceId: null,
  filterStatus: 'all',
});

export function setDevices(layerId: string, list: DeviceItem[]) {
  store.devicesByLayer[layerId] = list;
}

export function getDevices(layerId: string | undefined): DeviceItem[] {
  if (!layerId) return [];
  return store.devicesByLayer[layerId] ?? [];
}

export function setSelectedDevice(id: string | null) {
  store.selectedDeviceId = id;
}

export function setFilterStatus(status: string) {
  store.filterStatus = status;
}

export function useDeviceStore() {
  return {
    store,
    setDevices,
    getDevices,
    setSelectedDevice,
    setFilterStatus,
  };
}

