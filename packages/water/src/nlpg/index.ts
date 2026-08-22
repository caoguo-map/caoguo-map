/**
 * 水网 NLPG 模块入口（PRD phase-2-grid-water §5.5）
 *
 * 提供从原始文本抽取水系要素名称（河道/水库/闸站/堤防/监测站），
 * 并与 WaterDataset 进行名称匹配（exact / alias / fuzzy）。
 *
 * 设计原则：纯函数 + 类型导出，零依赖 maplibre，可在 Node/浏览器/Worker 环境运行。
 */
export * from './nlpCore';