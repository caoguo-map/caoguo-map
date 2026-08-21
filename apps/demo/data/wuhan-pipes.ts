// 武汉模拟管线数据（GCJ-02 近似，合成数据，仅用于演示）
// 约束：背景为武汉、要素 < 1000、暗色主题。
export const wuhanPipes = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: '主干管 A', diameter: 800, pressure: 0.42 },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [114.3055, 30.5928],
          [114.321, 30.601],
          [114.34, 30.615],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: '主干管 B', diameter: 600, pressure: 0.36 },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [114.28, 30.57],
          [114.3055, 30.5928],
          [114.33, 30.585],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: '支管 C', diameter: 300, pressure: 0.28 },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [114.3055, 30.5928],
          [114.298, 30.61],
          [114.29, 30.625],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: '支管 D', diameter: 300, pressure: 0.25 },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [114.34, 30.615],
          [114.355, 30.63],
          [114.37, 30.62],
        ],
      },
    },
  ],
};
