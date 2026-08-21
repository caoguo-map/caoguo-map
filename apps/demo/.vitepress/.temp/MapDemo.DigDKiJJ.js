import { defineComponent, ref, onMounted, watch, onUnmounted, mergeProps, useSSRContext } from "vue";
import { ssrRenderAttrs } from "vue/server-renderer";
import { W as WUHAN_CENTER, M as Map } from "./index.BvU6W28e.js";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "MapDemo",
  __ssrInlineRender: true,
  props: {
    center: { default: () => WUHAN_CENTER },
    zoom: { default: 11 },
    data: { default: null },
    lineColor: { default: "#14b8a6" },
    height: { default: "100%" },
    colorBy: { default: null },
    highlight: { default: () => [] },
    flyTo: { default: null }
  },
  emits: ["ready"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const el = ref(null);
    let map = null;
    function lineColorExpr() {
      if (props.colorBy) {
        return [
          "interpolate",
          ["linear"],
          ["get", props.colorBy],
          300,
          "#38bdf8",
          600,
          "#14b8a6",
          800,
          "#f59e0b",
          1e3,
          "#f43f5e"
        ];
      }
      return props.lineColor;
    }
    function highlightFilter() {
      return ["in", ["get", "name"], ["literal", props.highlight ?? []]];
    }
    onMounted(() => {
      if (!el.value) return;
      map = new Map({ container: el.value, center: props.center, zoom: props.zoom });
      map.on("load", () => {
        if (props.data) {
          map == null ? void 0 : map.addSource("demo", { type: "geojson", data: props.data });
          map == null ? void 0 : map.addLayer({
            id: "demo-line",
            type: "line",
            source: "demo",
            paint: {
              "line-color": lineColorExpr(),
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 4],
              "line-opacity": 0.85
            }
          });
          map == null ? void 0 : map.addLayer({
            id: "demo-highlight",
            type: "line",
            source: "demo",
            filter: highlightFilter(),
            paint: {
              "line-color": "#f43f5e",
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 7],
              "line-blur": 0.6
            }
          });
          map == null ? void 0 : map.addLayer({
            id: "demo-nodes",
            type: "circle",
            source: "demo",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 14, 5],
              "circle-color": "#04141a",
              "circle-stroke-color": props.lineColor,
              "circle-stroke-width": 1.5
            }
          });
        }
        if (map) emit("ready", map.instance);
      });
    });
    watch(
      () => props.highlight,
      () => {
        if (map && props.data && map.instance.getLayer("demo-highlight")) {
          map.instance.setFilter("demo-highlight", highlightFilter());
        }
      }
    );
    watch(
      () => props.flyTo,
      (to) => {
        if (map && to) map.flyTo({ center: to, zoom: 12.5 });
      }
    );
    onUnmounted(() => map == null ? void 0 : map.remove());
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        ref_key: "el",
        ref: el,
        class: "map-demo",
        style: { height: __props.height }
      }, _attrs))} data-v-5fd7aaf4></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("common/MapDemo.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const MapDemo = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5fd7aaf4"]]);
export {
  MapDemo as M
};
