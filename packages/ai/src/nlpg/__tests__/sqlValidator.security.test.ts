import { describe, it, expect } from 'vitest';
import { validateSql, parameterize, DEFAULT_ALLOWED_TABLES } from '../sqlValidator';

/**
 * N-5 安全校验层的危险输入覆盖（QA 审计 P0）。
 * 此前只有 6 个「正面/明显」样例，以下按攻击面逐类固化行为。
 */

describe('validateSql 危险输入覆盖（P0）', () => {
  it('空串 / 纯空白 → non_empty 且直接短路返回', () => {
    for (const sql of ['', '   ']) {
      const r = validateSql(sql);
      expect(r.valid).toBe(false);
      expect(r.issues[0].rule).toBe('non_empty');
      expect(r.issues).toHaveLength(1); // 短路，不再产生后续 issue
    }
  });

  it('大小写混淆仍被拦截（sElEcT / DrOp / FrOm secret_table）', () => {
    const mixed = validateSql('sElEcT * FrOm secret_table');
    expect(mixed.valid).toBe(false);
    expect(mixed.issues.some((i) => i.rule === 'table_whitelist')).toBe(true);

    const drop = validateSql('SELECT * FROM pipelines; DrOp TABLE nodes');
    expect(drop.issues.some((i) => i.rule === 'dangerous_keyword')).toBe(true);
    expect(drop.issues.some((i) => i.rule === 'injection')).toBe(true);
  });

  it('词边界保护：字段名含关键字片段不误伤（settings 不触发 SET）', () => {
    const r = validateSql('SELECT * FROM settings');
    expect(r.issues.some((i) => i.rule === 'dangerous_keyword')).toBe(false);
    // 但 settings 不在白名单，仍应被表校验拦截
    expect(r.issues.some((i) => i.rule === 'table_whitelist')).toBe(true);
  });

  it('多语句注入（; DROP）与块注释（/\*）', () => {
    const multi = validateSql('SELECT * FROM pipelines; DROP TABLE nodes');
    expect(multi.issues.some((i) => i.rule === 'injection')).toBe(true);

    const block = validateSql('SELECT /* hack */ * FROM pipelines');
    expect(block.issues.some((i) => i.rule === 'injection')).toBe(true);
  });

  it('UNION SELECT 恒真注入', () => {
    const r = validateSql('SELECT name FROM pipelines UNION SELECT name FROM users');
    expect(r.issues.some((i) => i.rule === 'injection')).toBe(true);
    expect(r.issues.some((i) => i.rule === 'dangerous_keyword')).toBe(true); // UNION
  });

  it('单引号未配对 / 括号未配对 → syntax', () => {
    const q = validateSql("SELECT * FROM pipelines WHERE name = 'x");
    expect(q.issues.some((i) => i.rule === 'syntax' && i.message.includes('单引号'))).toBe(true);

    const p = validateSql('SELECT count(id FROM pipelines');
    expect(p.issues.some((i) => i.rule === 'syntax' && i.message.includes('括号'))).toBe(true);
  });

  it('非白名单空间函数 → spatial_whitelist', () => {
    const r = validateSql('SELECT ST_X(geom) FROM pipelines');
    expect(r.issues.some((i) => i.rule === 'spatial_whitelist')).toBe(true);
    expect(r.valid).toBe(false);
  });

  it('ST_SetSRID 豁免与裸 SET 拦截并存', () => {
    // 合法空间查询：含 ST_SetSRID，不应被 SET 关键字误杀
    const good = validateSql(
      'SELECT ST_AsGeoJSON(geom) FROM pipelines WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(114.3, 30.5), 4326), 500)',
    );
    expect(good.issues.some((i) => i.rule === 'dangerous_keyword')).toBe(false);
    expect(good.valid).toBe(true);

    // 裸 SET（无 ST_SetSRID 语境）仍拦截
    const bad = validateSql('SELECT SET FROM pipelines');
    expect(bad.issues.some((i) => i.rule === 'dangerous_keyword')).toBe(true);
  });

  it('自定义空白名单：一切 FROM 查询都拒绝', () => {
    const r = validateSql('SELECT * FROM pipelines', []);
    expect(r.issues.some((i) => i.rule === 'table_whitelist')).toBe(true);
    expect(r.valid).toBe(false);
  });

  it('parameterize：字符串字面量按序替换为 $n', () => {
    const r = parameterize("SELECT * FROM pipelines WHERE material = 'steel' AND diameter > '300'");
    expect(r.sql).toBe('SELECT * FROM pipelines WHERE material = $1 AND diameter > $2');
    expect(r.params).toEqual(['steel', '300']);
  });

  it('DEFAULT_ALLOWED_TABLES 含 11 张授权表', () => {
    expect(DEFAULT_ALLOWED_TABLES).toHaveLength(11);
    expect(DEFAULT_ALLOWED_TABLES).toContain('pipelines');
  });
});
