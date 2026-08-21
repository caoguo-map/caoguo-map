import { describe, it, expect } from 'vitest';
import {
  generatePostGISQuery,
  detectTable,
  detectField,
  detectSpatial,
} from '../sqlGenerator';
import { validateSql, parameterize } from '../sqlValidator';
import { nlpgQuery } from '../nlpg';

describe('NLPG 表名识别', () => {
  it('识别管线表', () => {
    expect(detectTable('铸铁燃气管')).toBe('pipelines');
  });
  it('识别学校表', () => {
    expect(detectTable('500米内的学校')).toBe('schools');
  });
  it('识别基站表', () => {
    expect(detectTable('5G 基站')).toBe('base_stations');
  });
  it('默认 POI', () => {
    expect(detectTable('随便什么')).toBe('pois');
  });
});

describe('NLPG 字段识别', () => {
  it('识别材质字段', () => {
    expect(detectField('铸铁管')).toBe('material');
  });
  it('识别压力字段', () => {
    expect(detectField('压力低于 0.2MPa')).toBe('pressure');
  });
  it('识别电压字段', () => {
    expect(detectField('10kV 线路')).toBe('voltage');
  });
});

describe('NLPG 空间关系识别', () => {
  it('识别距离邻近', () => {
    const s = detectSpatial('500米内的学校');
    expect(s).not.toBeNull();
    expect(s!.relation).toBe('dwithin');
    expect(s!.radius).toBe(500);
  });
  it('识别公里距离（换算米）', () => {
    const s = detectSpatial('3公里内的医院');
    expect(s!.radius).toBe(3000);
  });
  it('识别缓冲', () => {
    const s = detectSpatial('这个范围内');
    expect(s!.relation).toBe('buffer');
  });
});

describe('NLPG SQL 生成', () => {
  it('属性过滤', () => {
    const q = generatePostGISQuery('查出使用超过 20 年的铸铁燃气管');
    expect(q.intent).toBe('attribute_filter');
    expect(q.table).toBe('pipelines');
    expect(q.sql).toContain('SELECT * FROM pipelines');
    expect(q.sql).toContain('material');
  });

  it('空间邻近', () => {
    const q = generatePostGISQuery('500 米内有几所学校', { center: [114.3, 30.5] });
    expect(q.intent).toBe('spatial_nearby');
    expect(q.sql).toContain('ST_DWithin');
    expect(q.sql).toContain('schools');
  });
});

describe('NLPG SQL 安全校验', () => {
  it('合法 SELECT 通过', () => {
    const r = validateSql("SELECT * FROM pipelines WHERE material='cast_iron'");
    expect(r.valid).toBe(true);
  });

  it('拒绝 DROP', () => {
    const r = validateSql('DROP TABLE pipelines');
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.rule === 'dangerous_keyword')).toBe(true);
  });

  it('拒绝 DELETE', () => {
    const r = validateSql('DELETE FROM users');
    expect(r.valid).toBe(false);
  });

  it('拒绝非 SELECT', () => {
    const r = validateSql("UPDATE users SET name='x'");
    expect(r.valid).toBe(false);
  });

  it('拒绝白名单外表', () => {
    const r = validateSql('SELECT * FROM secret_table');
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.rule === 'table_whitelist')).toBe(true);
  });

  it('拒绝 SQL 注入', () => {
    const r = validateSql("SELECT * FROM users WHERE name='x' OR '1'='1'");
    expect(r.valid).toBe(false);
  });

  it('拒绝注释注入', () => {
    const r = validateSql("SELECT * FROM users -- comment");
    expect(r.valid).toBe(false);
  });
});

describe('NLPG 参数化', () => {
  it('字面量转占位符', () => {
    const { sql, params } = parameterize("SELECT * FROM pipelines WHERE material='cast_iron'");
    expect(sql).toContain('$1');
    expect(params).toContain('cast_iron');
  });
});

describe('NLPG 端到端', () => {
  it('nlpgQuery 返回完整结果', () => {
    const r = nlpgQuery('查出使用超过 20 年的铸铁燃气管');
    expect(r.query.table).toBe('pipelines');
    expect(r.valid).toBe(true);
    expect(r.parameterized).toBeDefined();
  });

  it('空间查询通过校验', () => {
    const r = nlpgQuery('500 米内有几所学校', { center: [114.3, 30.5] });
    expect(r.valid).toBe(true);
    expect(r.query.sql).toContain('ST_DWithin');
  });
});
