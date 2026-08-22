/**
 * 原生 MapLibre 地图 source 操作的幂等工具。
 *
 * 各业务 System（grid/water/pipeline/telecom/compute/transport）的 render()
 * 通过 `this.map.instance` 直接调用原生 MapLibre，而非经 CaoguoMap 包装类的
 * 幂等 addSource。为避免在每个 System 内重复书写 `if (!mlMap.getSource(id))`
 * 样板，并根治「层级切换重渲染崩溃」（Source already exists），统一在此提供
 * 幂等 upsert 与安全的 removeSource。
 *
 * 仅依赖原生 MapLibre 的 source 子集接口，便于各 System 直接传入 instance。
 */

/** 原生 MapLibre source 操作的子集接口 */
export interface MlMapSourceApi {
  addSource: (id: string, source: unknown) => void;
  getSource: (id: string) => unknown;
  setData: (id: string, data: unknown) => void;
  removeSource: (id: string) => void;
}

/**
 * 幂等地确保一个 GeoJSON source 存在并持有给定数据。
 *
 * - 若 source 已存在：直接 setData 更新（避免重复 addSource 抛错）。
 * - 若 source 不存在：addSource 创建。
 *
 * @param mlMap 原生 MapLibre 实例（或任意满足 MlMapSourceApi 的对象）
 * @param id    source 唯一标识
 * @param data  GeoJSON 数据（或 addSource 所需的 source spec）
 */
export function upsertSource(
  mlMap: MlMapSourceApi,
  id: string,
  data: unknown,
): void {
  if (mlMap.getSource(id)) {
    mlMap.setData(id, data);
  } else {
    mlMap.addSource(id, data);
  }
}

/**
 * 安全地移除 source：仅当存在时才 removeSource，避免不存在时抛错。
 *
 * @param mlMap 原生 MapLibre 实例
 * @param id    source 唯一标识
 */
export function removeSourceSafe(mlMap: MlMapSourceApi, id: string): void {
  if (mlMap.getSource(id)) {
    mlMap.removeSource(id);
  }
}

/**
 * 安全地批量移除 source。
 *
 * @param mlMap 原生 MapLibre 实例
 * @param ids   source 标识数组
 */
export function removeSourcesSafe(mlMap: MlMapSourceApi, ids: string[]): void {
  for (const id of ids) {
    removeSourceSafe(mlMap, id);
  }
}
