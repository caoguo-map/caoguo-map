import { describe, it, expect, vi } from 'vitest';
import { ComputeNodes } from '../ComputeNodes';
import { renderNodeDetailHtml, renderAssignmentPanelHtml } from '../panels';
import type { ComputeTopologyDataset, ComputeNodeDetail } from '../../types';
import type { AssignmentResult } from '../assignment';

const dataset: ComputeTopologyDataset = {
  nodes: [
    {
      id: 'c1',
      type: 'datacenter',
      lng: 114.3,
      lat: 30.5,
      name: '光谷数据中心',
      properties: {
        totalCompute: '1000 TFLOPS',
        usedCompute: '600 TFLOPS',
        gpuCount: 64,
        gpuUtilization: 0.6,
        storage: '10 PB',
        networkBandwidth: '100 Gbps',
        status: 'online',
        region: '洪山',
      },
    },
  ],
  links: [],
};

function makeMap() {
  return {
    removeLayer: vi.fn(),
    instance: { addSource: vi.fn(), addLayer: vi.fn(), getSource: vi.fn(() => undefined) },
  } as any;
}

const detail: ComputeNodeDetail = {
  nodeId: 'c1',
  name: '光谷数据中心',
  type: 'datacenter',
  totalCompute: '1000 TFLOPS',
  usedCompute: '600 TFLOPS',
  gpuCount: 64,
  gpuUtilization: 0.6,
  storage: '10 PB',
  networkBandwidth: '100 Gbps',
  status: 'online',
  region: '洪山',
};

describe('renderNodeDetailHtml（C-2 详情面板）', () => {
  it('包含算力/GPU/状态全字段', () => {
    const html = renderNodeDetailHtml(detail);
    expect(html).toContain('光谷数据中心');
    expect(html).toContain('1000 TFLOPS');
    expect(html).toContain('60%');
    expect(html).toContain('online');
    expect(html).toContain('10 PB');
  });

  it('offline 状态标红', () => {
    expect(renderNodeDetailHtml({ ...detail, status: 'offline' })).toContain('#f87171');
  });
});

describe('ComputeNodes.renderNodeDetailHtml（组件委托）', () => {
  it('命中返回 HTML，未命中返回 null', () => {
    const cn = new ComputeNodes({ map: makeMap(), dataset, layerPrefix: 'cp' });
    expect(cn.renderNodeDetailHtml('c1')).toContain('光谷数据中心');
    expect(cn.renderNodeDetailHtml('nope')).toBeNull();
  });
});

describe('renderAssignmentPanelHtml（C-4 调度面板）', () => {
  const results: AssignmentResult[] = [
    { taskId: 't1', nodeId: 'c1', nodeName: '光谷数据中心', strategy: 'balanced', utilizationAfter: 0.7 },
    { taskId: 't2', strategy: 'balanced', reason: 'insufficient-capacity' },
  ];

  it('成功行显示节点与利用率', () => {
    const html = renderAssignmentPanelHtml([results[0]]);
    expect(html).toContain('t1');
    expect(html).toContain('光谷数据中心');
    expect(html).toContain('70%');
  });

  it('失败行标红并显示原因', () => {
    const html = renderAssignmentPanelHtml([results[1]]);
    expect(html).toContain('#f87171');
    expect(html).toContain('insufficient-capacity');
  });

  it('内容转义防注入', () => {
    const html = renderAssignmentPanelHtml([
      { taskId: '<script>', nodeId: 'x', strategy: 'balanced' },
    ]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
