/**
 * FloodInundation 组件 - 端到端洪水淹没模拟与渲染封装
 *
 * 整合 floodCore（SCS-CN 径流 / 推理公式 / flood fill）与 FloodRender，
 * 对外暴露一个易用类（README 承诺的 `FloodInundation` API）。
 *
 * 用法：
 *   const flood = new FloodInundation({ map, dem, demBounds });
 *   const result = flood.simulate({ rainfall: 200, curveNumber: 75 }, [1, 1]);
 *   flood.render(result);        // 单色淹没面
 *   flood.renderGraded(result);  // 真实水深分级（推荐）
 */

import type { Map as CaoguoMap } from '@caoguo/maplibre';
import type { FloodInput, FloodResult, WaterDataset } from '../types';
import {
  simulateFlood,
  gradedFloodFeatureCollection,
  inundateCells,
  maxDepth,
} from './floodCore';
import { FloodRender } from './FloodRender';

export interface FloodInundationOptions {
  map: CaoguoMap;
  /** DEM 栅格（海拔，单位 m） */
  dem: number[][];
  /**
   * DEM 栅格对应的经纬度范围 [[minLng,minLat],[maxLng,maxLat]]。
   * 提供后淹没多边形 / 分级面会自动换算为真实经纬度；否则保持栅格坐标。
   */
  demBounds?: [[number, number], [number, number]];
  /** 单栅格边长（米），用于面积换算。默认 30m */
  cellSizeM?: number;
  /** 层 ID 前缀 */
  layerPrefix?: string;
}

export class FloodInundation {
  private map: CaoguoMap;
  private dem: number[][];
  private demBounds?: [[number, number], [number, number]];
  private cellSizeM: number;
  private render_: FloodRender;
  /** 缓存最近一次 simulate 计算的水位，供 renderGraded 复用（保证与 simulate 一致） */
  private lastWaterLevel = 0;

  constructor(options: FloodInundationOptions) {
    this.map = options.map;
    this.dem = options.dem;
    this.demBounds = options.demBounds;
    this.cellSizeM = options.cellSizeM ?? 30;
    this.render_ = new FloodRender({ map: options.map, layerPrefix: options.layerPrefix });
  }

  /** 运行洪水淹没模拟（纯算法），返回 FloodResult */
  simulate(input: FloodInput, seedCell: [number, number] = [0, 0], dataset: WaterDataset = { features: [] }): FloodResult {
    const result = simulateFlood(dataset, this.dem, input, seedCell, {
      cellSizeM: this.cellSizeM,
      demBounds: this.demBounds,
    });
    // 复算水位（与 floodCore.simulateFlood 内部公式保持一致）
    const runoff = result.runoff;
    const inflow = input.inflow ?? 0;
    this.lastWaterLevel = runoff / 10 + (inflow > 0 ? inflow / 500 : 0);
    return result;
  }

  /** 单色淹没面渲染（保持向后兼容的行为） */
  render(result: FloodResult): void {
    this.render_.render(result);
  }

  /**
   * 真实水深分级渲染：
   * 基于 simulate 缓存的水位对 DEM 重算淹没格，生成带 `depth` 属性的分级面并绘制。
   */
  renderGraded(seedCell: [number, number] = [0, 0]): void {
    const waterLevel = this.lastWaterLevel;
    const flooded = inundateCells(this.dem, waterLevel, seedCell);
    const graded = gradedFloodFeatureCollection(this.dem, flooded, waterLevel, this.demBounds);
    this.render_.renderGraded(graded);
  }

  clear(): void {
    this.render_.clear();
  }
}

export { inundateCells, maxDepth };
