/**
 * 解析用户上传的数据文件为对象数组（供 static/excel/csv 数据源使用）。
 * - CSV：纯前端解析（首行表头），parseDataFile 同步返回。
 * - Excel：xlsx 体积较大（~900KB），拆为 parseExcelBuffer 按需动态加载，不进主包。
 * 返回 { rows, error }。
 */
export function parseDataFile(fileName: string, raw: ArrayBuffer | string): { rows: Record<string, unknown>[]; error?: string } {
  try {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv')) {
      const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
      return { rows: parseCsv(text) };
    }
    return { rows: [], error: '不支持的文件类型：' + fileName };
  } catch (e) {
    return { rows: [], error: '解析失败：' + (e as Error).message };
  }
}

/** Excel 解析：动态 import('xlsx')，首次调用时才加载该 chunk */
export async function parseExcelBuffer(raw: ArrayBuffer): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(raw, { type: 'array' });
    const first = wb.SheetNames[0];
    const sheet = wb.Sheets[first];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    return { rows };
  } catch (e) {
    return { rows: [], error: '解析失败：' + (e as Error).message };
  }
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const split = (line: string) =>
    line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  const header = split(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const obj: Record<string, unknown> = {};
    header.forEach((h, i) => (obj[h] = cells[i] ?? ''));
    return obj;
  });
}
