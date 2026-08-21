const wuhanPipes = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "主干管 A", diameter: 800, pressure: 0.42 },
      geometry: {
        type: "LineString",
        coordinates: [
          [114.3055, 30.5928],
          [114.321, 30.601],
          [114.34, 30.615]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "主干管 B", diameter: 600, pressure: 0.36 },
      geometry: {
        type: "LineString",
        coordinates: [
          [114.28, 30.57],
          [114.3055, 30.5928],
          [114.33, 30.585]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "支管 C", diameter: 300, pressure: 0.28 },
      geometry: {
        type: "LineString",
        coordinates: [
          [114.3055, 30.5928],
          [114.298, 30.61],
          [114.29, 30.625]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "支管 D", diameter: 300, pressure: 0.25 },
      geometry: {
        type: "LineString",
        coordinates: [
          [114.34, 30.615],
          [114.355, 30.63],
          [114.37, 30.62]
        ]
      }
    }
  ]
};
export {
  wuhanPipes as w
};
