import { describe, it, expect, vi } from 'vitest';
import {
  beaufortToMs,
  parseCompassDirection,
  windDegToRadians,
  normalizeWeather,
  toWindParams,
} from '../weather';
import { LeakagePlume } from '../LeakagePlume';

function makeMap() {
  return {
    instance: {
      addSource: vi.fn(),
      getSource: vi.fn(() => null),
      setData: vi.fn(),
      addLayer: vi.fn(),
    },
    removeLayer: vi.fn(),
  };
}

describe('L-5 气象数据接入 weather', () => {
  it('蒲福风级转 m/s', () => {
    expect(beaufortToMs(0)).toBe(0);
    expect(beaufortToMs(3)).toBeCloseTo(3.4, 6);
    expect(beaufortToMs(12)).toBeCloseTo(32.7, 6);
  });

  it('方位解析：英文大小写不敏感，中文两字词优先于单字', () => {
    expect(parseCompassDirection('NW')).toBe(315);
    expect(parseCompassDirection('nw')).toBe(315);
    // 关键：'东北' 不能被 '东' 抢先命中
    expect(parseCompassDirection('东北')).toBe(45);
    expect(parseCompassDirection('东')).toBe(90);
    expect(parseCompassDirection('西南')).toBe(225);
    expect(parseCompassDirection('乱码')).toBeNull();
  });

  it('风向（来向度）→ 烟羽弧度：北风向南、东风向西', () => {
    // 0=东、π/2=北，故南为 -π/2
    expect(windDegToRadians(0)).toBeCloseTo(-Math.PI / 2, 6);
    // 东风（来向 90°）→ 下风向西 → ±π
    expect(Math.abs(toWindParams({ windDirectionDeg: 90, windSpeed: 3 }).windDirection)).toBeCloseTo(Math.PI, 6);
  });

  it('normalizeWeather 统一单位：km/h 与蒲福风级都折算为 m/s', () => {
    expect(normalizeWeather({ windSpeedKmh: 36, windDir: 0 }).windSpeed).toBeCloseTo(10, 6);
    expect(normalizeWeather({ windLevel: 6, windDir: 0 }).windSpeed).toBeCloseTo(10.8, 6);
    expect(normalizeWeather({ windSpeed: 4.2, windDir: 0 }).windSpeed).toBeCloseTo(4.2, 6);
  });

  it('normalizeWeather 接受方位字符串并归一化角度', () => {
    expect(normalizeWeather({ windDir: 'NW', windSpeed: 3 }).windDirectionDeg).toBe(315);
    expect(normalizeWeather({ windDir: -30, windSpeed: 3 }).windDirectionDeg).toBe(330);
  });

  it('toWindParams 输出可直接并入 GasLeakParams', () => {
    const p = toWindParams({ windDirectionDeg: 0, windSpeed: 5 });
    expect(p.windSpeed).toBe(5);
    expect(Number.isFinite(p.windDirection)).toBe(true);
  });
});

describe('L-5 LeakagePlume 气象接入（provider 注入）', () => {
  it('注入 provider 后可拉取并缓存气象，并转成烟羽风场参数', async () => {
    const plume = new LeakagePlume({ map: makeMap() as never });
    plume.setWeatherProvider(async () => ({ windDir: 'NW', windSpeedKmh: 36, source: 'mock' }));

    const obs = await plume.refreshWeather({ lng: 114.3, lat: 30.5 });
    expect(obs.windDirectionDeg).toBe(315);
    expect(obs.windSpeed).toBeCloseTo(10, 6);
    expect(obs.source).toBe('mock');
    expect(plume.getLastWeather()).toEqual(obs);

    const wind = plume.windParamsFrom();
    expect(wind.windSpeed).toBeCloseTo(10, 6);
    expect(Number.isFinite(wind.windDirection)).toBe(true);
  });

  it('未注入 provider 时明确报错，不静默用 0 值算错方向', async () => {
    const plume = new LeakagePlume({ map: makeMap() as never });
    await expect(plume.refreshWeather({ lng: 114.3, lat: 30.5 })).rejects.toThrow(/WeatherProvider/);
  });
});
