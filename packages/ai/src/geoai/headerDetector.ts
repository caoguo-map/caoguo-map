/**
 * GeoAI 表头自动识别（PRD phase-0 §5.6 G-1）
 *
 * 从 CSV/Excel 表头中自动识别：
 *   - 地址列（addressCol）
 *   - 名称列（nameCol）
 *   - 分类列（categoryCol）
 *   - 经度列（lngCol）/ 纬度列（latCol）
 *
 * 采用「列名语义 + 正则匹配」方案，命中率目标 ≥ 90%。
 */

export interface HeaderDetection {
  /** 地址列索引（-1 表示未识别） */
  addressCol: number;
  /** 名称列索引 */
  nameCol: number;
  /** 分类列索引 */
  categoryCol: number;
  /** 经度列索引 */
  lngCol: number;
  /** 纬度列索引 */
  latCol: number;
  /** 识别详情（供上层展示/纠错） */
  detail: Record<string, string>;
}

/** 地址列候选关键词 */
const ADDRESS_KEYS = [
  '地址', '位置', '地点', '所在地', '详细地址', '住址', '地理位置', '联系地址',
  'address', 'addr', 'location', 'place',
];

/** 名称列候选关键词 */
const NAME_KEYS = ['名称', '名字', '单位', '机构', '站点', '场所', 'name', 'title', 'label'];

/** 分类列候选关键词 */
const CATEGORY_KEYS = ['类型', '分类', '类别', '行业', '业态', 'category', 'type', 'kind', 'class'];

/** 经度列候选关键词 */
const LNG_KEYS = ['经度', 'lng', 'lon', 'longitude', 'x坐标', '经度坐标', 'long', 'x'];

/** 纬度列候选关键词 */
const LAT_KEYS = ['纬度', 'lat', 'latitude', 'y坐标', '纬度坐标', 'y'];

/** 归一化：去空白、去下划线/连字符、转小写 */
function normalize(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/** 在表头中匹配指定关键词集合，返回首个命中索引 */
function matchHeader(headers: string[], keys: string[]): number {
  const normalized = headers.map(normalize);
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    for (const k of keys) {
      if (h === normalize(k) || h.includes(normalize(k))) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * 识别表头。
 * @param headers 表头数组（CSV 首行 / Excel 首行）
 */
export function detectHeaders(headers: string[]): HeaderDetection {
  const addressCol = matchHeader(headers, ADDRESS_KEYS);
  const nameCol = matchHeader(headers, NAME_KEYS);
  const categoryCol = matchHeader(headers, CATEGORY_KEYS);
  const lngCol = matchHeader(headers, LNG_KEYS);
  const latCol = matchHeader(headers, LAT_KEYS);

  const detail: Record<string, string> = {};
  if (addressCol >= 0) detail.address = headers[addressCol];
  if (nameCol >= 0) detail.name = headers[nameCol];
  if (categoryCol >= 0) detail.category = headers[categoryCol];
  if (lngCol >= 0) detail.lng = headers[lngCol];
  if (latCol >= 0) detail.lat = headers[latCol];

  return { addressCol, nameCol, categoryCol, lngCol, latCol, detail };
}
