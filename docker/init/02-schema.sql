-- 草果地图六张网 schema（公共 public 下建表，字段名与 NLPG 白名单对齐）
-- 白名单表：pipelines / nodes / users / schools / hospitals / substations / base_stations / rivers / reservoirs / alarms / pois

-- 1) 地下管网：管段
CREATE TABLE IF NOT EXISTS pipelines (
  id SERIAL PRIMARY KEY,
  name TEXT,
  material TEXT,               -- cast_iron / ductile_iron / steel / pe / pvc / hdpe
  diameter INT,                -- 管径 mm
  pressure NUMERIC,            -- 压力 MPa
  status TEXT,                 -- normal / fault / maintenance / aging
  install_date DATE,
  region TEXT,
  geom GEOMETRY(LineString, 4326)
);

-- 2) 管网节点
CREATE TABLE IF NOT EXISTS nodes (
  id SERIAL PRIMARY KEY,
  name TEXT,
  kind TEXT,                   -- valve / junction / pump
  region TEXT,
  geom GEOMETRY(Point, 4326)
);

-- 3) 用户/建筑
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  address TEXT,
  region TEXT,
  geom GEOMETRY(Point, 4326)
);

-- 4) 学校
CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name TEXT,
  address TEXT,
  region TEXT,
  geom GEOMETRY(Point, 4326)
);

-- 5) 医院
CREATE TABLE IF NOT EXISTS hospitals (
  id SERIAL PRIMARY KEY,
  name TEXT,
  address TEXT,
  region TEXT,
  geom GEOMETRY(Point, 4326)
);

-- 6) 变电站（电网）
CREATE TABLE IF NOT EXISTS substations (
  id SERIAL PRIMARY KEY,
  name TEXT,
  voltage INT,                 -- kV
  load_rate NUMERIC,           -- 负载率 0-1
  status TEXT,
  region TEXT,
  geom GEOMETRY(Point, 4326)
);

-- 7) 基站（通信网）
CREATE TABLE IF NOT EXISTS base_stations (
  id SERIAL PRIMARY KEY,
  name TEXT,
  rsrp INT,                    -- 信号强度 dBm
  status TEXT,
  region TEXT,
  geom GEOMETRY(Point, 4326)
);

-- 8) 河流（水网）
CREATE TABLE IF NOT EXISTS rivers (
  id SERIAL PRIMARY KEY,
  name TEXT,
  water_level NUMERIC,         -- 水位 m
  region TEXT,
  geom GEOMETRY(LineString, 4326)
);

-- 9) 水库
CREATE TABLE IF NOT EXISTS reservoirs (
  id SERIAL PRIMARY KEY,
  name TEXT,
  storage_rate NUMERIC,        -- 蓄水率 0-1
  region TEXT,
  geom GEOMETRY(Point, 4326)
);

-- 10) 告警
CREATE TABLE IF NOT EXISTS alarms (
  id SERIAL PRIMARY KEY,
  level TEXT,                  -- info / warning / critical
  source_table TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  geom GEOMETRY(Point, 4326)
);

-- 11) POI
CREATE TABLE IF NOT EXISTS pois (
  id SERIAL PRIMARY KEY,
  name TEXT,
  category TEXT,
  address TEXT,
  geom GEOMETRY(Point, 4326)
);

-- 空间索引
CREATE INDEX IF NOT EXISTS idx_pipelines_geom ON pipelines USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_nodes_geom ON nodes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_schools_geom ON schools USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_hospitals_geom ON hospitals USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_substations_geom ON substations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_base_stations_geom ON base_stations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_pois_geom ON pois USING GIST (geom);
