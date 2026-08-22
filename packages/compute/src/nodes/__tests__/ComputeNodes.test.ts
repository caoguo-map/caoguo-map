import { describe, it, expect } from 'vitest';
import { ComputeNodes } from '../ComputeNodes';
import type { ComputeTopologyDataset } from '../../types';

const dataset: ComputeTopologyDataset = {
  nodes: [
    {
      id: 'n1',
      type: 'datacenter',
      lng: 116.4,
      lat: 39.9,
      name: '北京DC',
      properties: {
        totalCompute: '1000 TFLOPS',
        usedCompute: '400 TFLOPS',
        gpuCount: 8,
        gpuUtilization: 0.5,
        storage: '10 PB',
        networkBandwidth: '100 Gbps',
        status: 'online',
        region: '华北',
      },
    },
  ],
  links: [],
};

describe('ComputeNodes.getNodeDetail (C-2 节点详情面板)', () => {
  it('聚合节点全部详情字段', () => {
    const c = new ComputeNodes({ map: {} as never, dataset });
    const d = c.getNodeDetail('n1');
    expect(d).not.toBeNull();
    expect(d!.name).toBe('北京DC');
    expect(d!.type).toBe('datacenter');
    expect(d!.gpuCount).toBe(8);
    expect(d!.gpuUtilization).toBe(0.5);
    expect(d!.totalCompute).toBe('1000 TFLOPS');
    expect(d!.usedCompute).toBe('400 TFLOPS');
    expect(d!.storage).toBe('10 PB');
    expect(d!.networkBandwidth).toBe('100 Gbps');
    expect(d!.status).toBe('online');
    expect(d!.region).toBe('华北');
  });

  it('未知节点返回 null', () => {
    const c = new ComputeNodes({ map: {} as never, dataset });
    expect(c.getNodeDetail('nope')).toBeNull();
  });

  it('onNodeSelect 在节点点击时收到详情', () => {
    const mlMap = {
      addSource: () => {},
      addLayer: () => {},
      getSource: () => null,
      on: (_t: string, _l: string, h: (ev: { features?: Array<{ properties?: Record<string, unknown> }> }) => void) =>
        h({ features: [{ properties: { nodeId: 'n1' } }] }),
    };
    const map = { instance: mlMap } as never;
    let received: string | null = null;
    const c = new ComputeNodes({
      map,
      dataset,
      onNodeSelect: (d) => {
        received = d.nodeId;
      },
    });
    c.render();
    expect(received).toBe('n1');
  });
});
