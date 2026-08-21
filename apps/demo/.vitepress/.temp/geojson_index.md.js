import { defineComponent, withCtx, createVNode, createTextVNode, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle } from "vue/server-renderer";
import { D as DemoLayout, S as SimPanel } from "./SimPanel.Cvo5iSHw.js";
import { C as CodeViewer } from "./CodeViewer.CAOK_Ui0.js";
import { M as MapDemo } from "./MapDemo.DigDKiJJ.js";
import { w as wuhanPipes } from "./wuhan-pipes.T9gYoWj4.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
import "./index.BvU6W28e.js";
import "maplibre-gl";
const __pageData = JSON.parse('{"title":"D2 GeoJSON 可视化","description":"","frontmatter":{"title":"D2 GeoJSON 可视化"},"headers":[],"relativePath":"geojson/index.md","filePath":"geojson/index.md"}');
const __default__ = { name: "geojson/index.md" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  __ssrInlineRender: true,
  setup(__props) {
    const code = `import { Map } from '@caoguo/maplibre'
import { wuhanPipes } from './data/wuhan-pipes'

const map = new Map({ container: '#app', zoom: 11.4 })
map.on('load', () => {
  map.addSource('pipes', { type: 'geojson', data: wuhanPipes })
  map.addLayer({
    id: 'pipes',
    type: 'line',
    source: 'pipes',
    paint: { 'line-color': '#14b8a6', 'line-width': 3 },
  })
})`;
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)} data-v-a0c58ed4>`);
      _push(ssrRenderComponent(DemoLayout, {
        title: "D2 · GeoJSON 可视化",
        subtitle: "把一份武汉管线 GeoJSON 渲染为矢量线图层。"
      }, {
        map: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(MapDemo, {
              data: unref(wuhanPipes),
              zoom: 11.4,
              "color-by": "diameter",
              height: "100%"
            }, null, _parent2, _scopeId));
          } else {
            return [
              createVNode(MapDemo, {
                data: unref(wuhanPipes),
                zoom: 11.4,
                "color-by": "diameter",
                height: "100%"
              }, null, 8, ["data"])
            ];
          }
        }),
        panel: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(ssrRenderComponent(SimPanel, {
              title: "图层说明",
              hint: "4 条管线"
            }, {
              default: withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<p data-v-a0c58ed4${_scopeId2}>数据驱动声明式渲染：<code data-v-a0c58ed4${_scopeId2}>addSource</code> 注册数据，<code data-v-a0c58ed4${_scopeId2}>addLayer</code> 描述绘制。按管径<strong data-v-a0c58ed4${_scopeId2}>分级着色</strong>，端点自动生成节点圆点，支持动态 <code data-v-a0c58ed4${_scopeId2}>setData</code> 更新。</p><div class="legend" data-v-a0c58ed4${_scopeId2}><span data-v-a0c58ed4${_scopeId2}><i style="${ssrRenderStyle({ "background": "#38bdf8" })}" data-v-a0c58ed4${_scopeId2}></i>支管 ≤300</span><span data-v-a0c58ed4${_scopeId2}><i style="${ssrRenderStyle({ "background": "#14b8a6" })}" data-v-a0c58ed4${_scopeId2}></i>中压 600</span><span data-v-a0c58ed4${_scopeId2}><i style="${ssrRenderStyle({ "background": "#f59e0b" })}" data-v-a0c58ed4${_scopeId2}></i>主干 ≥800</span></div>`);
                } else {
                  return [
                    createVNode("p", null, [
                      createTextVNode("数据驱动声明式渲染："),
                      createVNode("code", null, "addSource"),
                      createTextVNode(" 注册数据，"),
                      createVNode("code", null, "addLayer"),
                      createTextVNode(" 描述绘制。按管径"),
                      createVNode("strong", null, "分级着色"),
                      createTextVNode("，端点自动生成节点圆点，支持动态 "),
                      createVNode("code", null, "setData"),
                      createTextVNode(" 更新。")
                    ]),
                    createVNode("div", { class: "legend" }, [
                      createVNode("span", null, [
                        createVNode("i", { style: { "background": "#38bdf8" } }),
                        createTextVNode("支管 ≤300")
                      ]),
                      createVNode("span", null, [
                        createVNode("i", { style: { "background": "#14b8a6" } }),
                        createTextVNode("中压 600")
                      ]),
                      createVNode("span", null, [
                        createVNode("i", { style: { "background": "#f59e0b" } }),
                        createTextVNode("主干 ≥800")
                      ])
                    ])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(ssrRenderComponent(CodeViewer, {
              code,
              lang: "ts"
            }, null, _parent2, _scopeId));
          } else {
            return [
              createVNode(SimPanel, {
                title: "图层说明",
                hint: "4 条管线"
              }, {
                default: withCtx(() => [
                  createVNode("p", null, [
                    createTextVNode("数据驱动声明式渲染："),
                    createVNode("code", null, "addSource"),
                    createTextVNode(" 注册数据，"),
                    createVNode("code", null, "addLayer"),
                    createTextVNode(" 描述绘制。按管径"),
                    createVNode("strong", null, "分级着色"),
                    createTextVNode("，端点自动生成节点圆点，支持动态 "),
                    createVNode("code", null, "setData"),
                    createTextVNode(" 更新。")
                  ]),
                  createVNode("div", { class: "legend" }, [
                    createVNode("span", null, [
                      createVNode("i", { style: { "background": "#38bdf8" } }),
                      createTextVNode("支管 ≤300")
                    ]),
                    createVNode("span", null, [
                      createVNode("i", { style: { "background": "#14b8a6" } }),
                      createTextVNode("中压 600")
                    ]),
                    createVNode("span", null, [
                      createVNode("i", { style: { "background": "#f59e0b" } }),
                      createTextVNode("主干 ≥800")
                    ])
                  ])
                ]),
                _: 1
              }),
              createVNode(CodeViewer, {
                code,
                lang: "ts"
              })
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("geojson/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a0c58ed4"]]);
export {
  __pageData,
  index as default
};
