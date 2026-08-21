-- 示例数据（武汉中心区域，WGS84 / SRID 4326）
-- 用于 NLPG 自然语言查询演示

-- 管段
INSERT INTO pipelines (name, material, diameter, pressure, status, install_date, region, geom) VALUES
('光谷大道燃气管段A', 'cast_iron', 300, 0.4, 'normal', '1995-06-01', '洪山区', ST_GeomFromText('LINESTRING(114.40 30.50, 114.42 30.51)', 4326)),
('光谷大道燃气管段B', 'steel', 400, 0.6, 'normal', '2010-05-01', '洪山区', ST_GeomFromText('LINESTRING(114.42 30.51, 114.44 30.52)', 4326)),
('关山大道供水管段', 'pe', 200, 0.3, 'aging', '2002-09-01', '洪山区', ST_GeomFromText('LINESTRING(114.40 30.52, 114.43 30.53)', 4326)),
('珞喻路铸铁管段', 'cast_iron', 250, 0.4, 'maintenance', '1988-03-01', '武昌区', ST_GeomFromText('LINESTRING(114.35 30.52, 114.40 30.52)', 4326)),
('雄楚大道PE管段', 'pe', 150, 0.2, 'fault', '2015-01-01', '洪山区', ST_GeomFromText('LINESTRING(114.38 30.49, 114.40 30.49)', 4326));

-- 节点
INSERT INTO nodes (name, kind, region, geom) VALUES
('阀门V001', 'valve', '洪山区', ST_SetSRID(ST_MakePoint(114.42, 30.51), 4326)),
('阀门V002', 'valve', '武昌区', ST_SetSRID(ST_MakePoint(114.36, 30.52), 4326)),
('节点J001', 'junction', '洪山区', ST_SetSRID(ST_MakePoint(114.43, 30.53), 4326));

-- 学校
INSERT INTO schools (name, address, region, geom) VALUES
('华中科技大学', '洪山区珞喻路1037号', '洪山区', ST_SetSRID(ST_MakePoint(114.418, 30.513), 4326)),
('武汉大学', '武昌区八一路299号', '武昌区', ST_SetSRID(ST_MakePoint(114.362, 30.541), 4326)),
('光谷实验小学', '洪山区光谷大道', '洪山区', ST_SetSRID(ST_MakePoint(114.41, 30.505), 4326));

-- 医院
INSERT INTO hospitals (name, address, region, geom) VALUES
('湖北省人民医院', '武昌区解放路', '武昌区', ST_SetSRID(ST_MakePoint(114.30, 30.53), 4326)),
('同济医院光谷院区', '洪山区光谷大道', '洪山区', ST_SetSRID(ST_MakePoint(114.43, 30.50), 4326));

-- 变电站（电网）
INSERT INTO substations (name, voltage, load_rate, status, region, geom) VALUES
('光谷变电站', 110, 0.72, 'normal', '洪山区', ST_SetSRID(ST_MakePoint(114.45, 30.51), 4326)),
('关山变电站', 220, 0.95, 'overload', '洪山区', ST_SetSRID(ST_MakePoint(114.40, 30.50), 4326)),
('武昌变电站', 110, 0.45, 'normal', '武昌区', ST_SetSRID(ST_MakePoint(114.34, 30.53), 4326));

-- 基站（通信网）
INSERT INTO base_stations (name, rsrp, status, region, geom) VALUES
('光谷广场宏站', -85, 'normal', '洪山区', ST_SetSRID(ST_MakePoint(114.40, 30.507), 4326)),
('街道口宏站', -95, 'normal', '武昌区', ST_SetSRID(ST_MakePoint(114.35, 30.53), 4326)),
('软件园微站', -110, 'weak', '洪山区', ST_SetSRID(ST_MakePoint(114.42, 30.47), 4326));

-- 河流（水网）
INSERT INTO rivers (name, water_level, region, geom) VALUES
('长江武汉段', 22.5, '武汉', ST_GeomFromText('LINESTRING(114.28 30.57, 114.32 30.56, 114.36 30.55)', 4326)),
('汉江武汉段', 20.1, '武汉', ST_GeomFromText('LINESTRING(114.20 30.55, 114.25 30.56)', 4326));

-- 水库
INSERT INTO reservoirs (name, storage_rate, region, geom) VALUES
('东湖水库', 0.82, '武昌区', ST_SetSRID(ST_MakePoint(114.40, 30.55), 4326));

-- POI
INSERT INTO pois (name, category, address, geom) VALUES
('光谷广场', '商业', '洪山区', ST_SetSRID(ST_MakePoint(114.40, 30.507), 4326)),
('江汉路步行街', '商业', '江汉区', ST_SetSRID(ST_MakePoint(114.278, 30.581), 4326)),
('黄鹤楼', '景点', '武昌区', ST_SetSRID(ST_MakePoint(114.302, 30.544), 4326));

-- 告警
INSERT INTO alarms (level, source_table, message, geom) VALUES
('critical', 'pipelines', '雄楚大道PE管段爆管', ST_SetSRID(ST_MakePoint(114.39, 30.49), 4326)),
('warning', 'substations', '关山变电站过载', ST_SetSRID(ST_MakePoint(114.40, 30.50), 4326));
