/**
 * 坐标系类型与变换接口（F-1.1）。
 *
 * 草果地图内部统一以 WGS84（EPSG:4326）为渲染基准。
 * 业务数据可能为 GCJ-02（火星坐标）或 CGCS2000（国家2000），
 * 通过 `createTransformer` 以 WGS84 为枢纽做相互转换。
 */

export type CRS = 'WGS84' | 'GCJ02' | 'CGCS2000';

export type LngLat = [number, number];

/** 一个坐标对（经/纬），与 MapLibre [lng, lat] 顺序一致 */
export type Point = LngLat;

/** 地理范围 [west, south, east, north] */
export type Bounds = [number, number, number, number];

export interface Transformer {
  /** 正向变换：from -> to */
  forward(lng: number, lat: number): LngLat;
  /** 逆向变换：to -> from（数学逆） */
  inverse(lng: number, lat: number): LngLat;
}

/**
 * CGCS2000 高精度偏移提供方（可选）。
 * Phase 0 默认不接入官方格网，使用等价实现（误差 < 0.5m）。
 * 测绘级场景可注入区域 7 参数 / 格网平移表。
 */
export interface GridShiftProvider {
  /** 返回相对 WGS84 的 [dLng, dLat] 偏移（单位：度） */
  shift(lng: number, lat: number): LngLat;
}
