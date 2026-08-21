/**
 * GeoAI 中文地址解析（PRD phase-0 §5.6 G-2）
 *
 * 将非标准中文地址（含口语化、简称）解析为标准化结构：
 *   province / city / district / street / poi / number
 *
 * 采用「词典匹配 + 规则」的传统 NLP 方案（不依赖大模型），保证速度与可控性。
 */

export interface ParsedAddress {
  /** 原始输入 */
  raw: string;
  /** 省 */
  province?: string;
  /** 市 */
  city?: string;
  /** 区/县 */
  district?: string;
  /** 街道/路/道 */
  street?: string;
  /** 门牌号 */
  number?: string;
  /** 地标/POI（如"光谷""汉口火车站"） */
  poi?: string;
  /** 标准化地址（可读拼接） */
  normalized: string;
  /** 解析置信度 0-1 */
  confidence: number;
}

/** 行政区词典（省/市/区） */
const PROVINCES = [
  '北京', '上海', '天津', '重庆',
  '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南',
  '四川', '贵州', '云南', '陕西', '甘肃', '青海',
  '内蒙古', '广西', '西藏', '宁夏', '新疆',
  '香港', '澳门', '台湾',
];

const CITIES: Record<string, string[]> = {
  湖北: ['武汉', '黄石', '襄阳', '宜昌', '荆州', '十堰', '孝感', '黄冈', '咸宁', '随州', '恩施', '鄂州', '荆门', '仙桃', '天门', '潜江'],
  广东: ['广州', '深圳', '珠海', '佛山', '东莞', '中山', '惠州', '江门', '湛江', '茂名', '肇庆', '汕头', '韶关'],
  江苏: ['南京', '苏州', '无锡', '常州', '南通', '徐州', '扬州', '镇江', '泰州', '盐城', '连云港', '淮安', '宿迁'],
  浙江: ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水'],
  四川: ['成都', '绵阳', '德阳', '宜宾', '泸州', '南充', '达州', '乐山', '内江', '自贡'],
};

/** 扁平城市列表（含直辖市，用于无省名时的城市识别） */
const FLAT_CITIES = [
  ...Object.values(CITIES).flat(),
  '北京', '上海', '天津', '重庆',
];

/** 武汉各区（项目背景城市，优先覆盖） */
const WUHAN_DISTRICTS = [
  '江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区',
  '东西湖区', '汉南区', '蔡甸区', '江夏区', '黄陂区', '新洲区',
];

/** 通用区县后缀 */
const DISTRICT_SUFFIX = /(区|县|市)$/;

/** 常见地标/POI 词典（用于口语化地址识别） */
const POI_DICT = [
  '光谷', '光谷广场', '汉口火车站', '武昌火车站', '武汉站', '天河机场',
  '武汉大学', '华中科技大学', '黄鹤楼', '东湖', '长江大桥', '江汉路',
  '楚河汉街', '街道口', '中南路', '徐东', '王家湾', '钟家村', '汉正街',
  '软件园', '金融港', '生物城', '未来科技城',
];

/** 街道通名 */
const STREET_SUFFIX = /(路|街|道|大道|大街|巷|里|弄|街坊|桥|港)$/;

/**
 * 解析中文地址。
 *
 * 覆盖：
 * - 完整地址："湖北省武汉市洪山区光谷大道 1 号"
 * - 简称："武汉光谷"、"洪山区"
 * - 口语化："光谷那边"、"汉口火车站附近"
 */
export function parseAddress(raw: string): ParsedAddress {
  const input = (raw ?? '').trim();
  if (!input) return { raw: input, normalized: '', confidence: 0 };

  const result: ParsedAddress = { raw: input, normalized: input, confidence: 0.3 };
  let matched = 0;

  // 1) 省
  for (const p of PROVINCES) {
    if (input.includes(p)) {
      result.province = p;
      matched++;
      break;
    }
  }

  // 2) 市（先按省匹配，无省则从扁平城市列表匹配）
  if (result.province) {
    const provinceCities = CITIES[result.province] ?? [];
    for (const c of provinceCities) {
      if (input.includes(c)) {
        result.city = c;
        matched++;
        break;
      }
    }
    // 直辖市本身即市
    if (!result.city && ['北京', '上海', '天津', '重庆'].includes(result.province)) {
      result.city = result.province;
      matched++;
    }
  }
  if (!result.city) {
    for (const c of FLAT_CITIES) {
      if (input.includes(c)) {
        result.city = c;
        matched++;
        break;
      }
    }
  }

  // 3) 区/县
  for (const d of WUHAN_DISTRICTS) {
    if (input.includes(d)) {
      result.district = d;
      matched++;
      break;
    }
  }
  if (!result.district) {
    const districtMatch = input.match(/[\u4e00-\u9fa5]{2,4}(区|县)/);
    if (districtMatch && !districtMatch[0].startsWith('武汉')) {
      result.district = districtMatch[0];
      matched++;
    }
  }

  // 4) 地标/POI（口语化识别）
  for (const poi of POI_DICT) {
    if (input.includes(poi)) {
      result.poi = poi;
      matched++;
      break;
    }
  }

  // 5) 街道/路/道
  const streetMatch = input.match(/[\u4e00-\u9fa5]{2,8}(?:路|街|道|大道|大街)/);
  if (streetMatch) {
    result.street = streetMatch[0];
    matched++;
  }

  // 6) 门牌号
  const numMatch = input.match(/(\d+)\s*号/);
  if (numMatch) {
    result.number = numMatch[1];
    matched++;
  }

  // 标准化拼接 + 置信度
  result.normalized = [
    result.province,
    result.city && result.city !== result.province ? result.city : '',
    result.district,
    result.poi,
    result.street,
    result.number ? `${result.number}号` : '',
  ].filter(Boolean).join('');

  result.confidence = Math.min(0.95, 0.3 + matched * 0.15);
  return result;
}

/** 判断是否为有效地址（至少命中省/市/区/POI 之一） */
export function isValidAddress(parsed: ParsedAddress): boolean {
  return Boolean(parsed.province || parsed.city || parsed.district || parsed.poi);
}
