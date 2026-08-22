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

/**
 * 原生 MapLibre source 操作的子集接口。
 *
 * 仅 `getSource` 为必填——它是所有 helper 判断「source 是否存在」的统一探针。
 * 其余方法全部可选，因为各业务 System 对 `this.map.instance` 的局部类型断言
 * 只声明了实际用到的若干方法（如 topology 只取 getSource/removeSource，
 * traffic 只取 addSource/addLayer），强制统一必填字段会与这些子集冲突。
 * helper 内部对每个要调用的方法做存在性检查，缺失时安全跳过或回退，
 * 保证类型与运行时都安全（真实 MapLibre 实例始终具备全部方法）。
 */
export interface MlMapSourceApi {
  getSource: (id: string) => unknown;
  addSource?: (id: string, source: unknown) => void;
  addLayer?: (layer: unknown) => void;
  setData?: (id: string, data: unknown) => void;
  removeSource?: (id: string) => void;
}

/**
 * 幂等地确保一个 GeoJSON source 存在并持有给定数据。
 *
 * - 若 source 已存在且具备 setData：setData 更新（避免重复 addSource 抛错）。
 * - 若 source 已存在但无 setData：回退为 addSource（MapLibre 对重复 id 会忽略/覆盖，
 *   不抛错，仍可达成渲染目标）。
 * - 若 source 不存在且具备 addSource：addSource 创建。
 *
 * 注意：若传入对象既无 setData 又无 addSource，则无法创建/更新 source。
 * 各 System 传入的 `this.map.instance` 为真实 MapLibre 实例，始终具备这些方法。
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
    if (mlMap.setData) {
      mlMap.setData(id, data);
    } else if (mlMap.addSource) {
      // 无 setData 时回退为 addSource：MapLibre 对同名 source 会忽略重复创建。
      mlMap.addSource(id, data);
    }
  } else if (mlMap.addSource) {
    mlMap.addSource(id, data);
  }
}

/**
 * 安全地移除 source：仅当存在且具备 removeSource 时才移除，避免不存在时抛错。
 *
 * @param mlMap 原生 MapLibre 实例
 * @param id    source 唯一标识
 */
export function removeSourceSafe(mlMap: MlMapSourceApi, id: string): void {
  if (mlMap.getSource(id) && mlMap.removeSource) {
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
