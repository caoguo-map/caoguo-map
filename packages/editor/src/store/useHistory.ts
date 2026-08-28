import { ref, toRaw, isReactive, isRef } from 'vue';
import type { DashboardConfig } from '../types';
import { useEditor } from './useEditor';

/**
 * 撤销/重做历史栈
 * 通过深拷贝 config 做快照，简化实现且足够覆盖编辑器场景。
 */

/**
 * 递归剥离 Vue reactive/ref 代理并深拷贝。
 * 直接用 structuredClone(reactiveObj) 会抛 DataCloneError（proxy 不可结构化克隆），
 * 需先 toRaw；嵌套 reactive 同样需要递归 toRaw。
 */
function deepToRaw<T>(value: T): T {
  if (isRef(value)) return deepToRaw(value.value) as T;
  if (isReactive(value)) return deepToRaw(toRaw(value));
  if (Array.isArray(value)) return value.map((v) => deepToRaw(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>)) {
      out[k] = deepToRaw((value as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  return value;
}

function snapshot(): DashboardConfig {
  return deepToRaw(toRaw(useEditor().state.config));
}

const past = ref<DashboardConfig[]>([]);
const future = ref<DashboardConfig[]>([]);
const MAX_HISTORY = 50;

let editor: ReturnType<typeof useEditor> | null = null;

function ensure() {
  if (!editor) editor = useEditor();
  return editor;
}

/** 记录当前状态到 past（在执行一次可变操作前调用） */
export function commit() {
  past.value.push(snapshot());
  if (past.value.length > MAX_HISTORY) past.value.shift();
  future.value = [];
}

export function undo() {
  const e = ensure();
  if (past.value.length === 0) return;
  future.value.push(snapshot());
  const prev = past.value.pop()!;
  e.setConfig(prev);
}

export function redo() {
  const e = ensure();
  if (future.value.length === 0) return;
  past.value.push(snapshot());
  const next = future.value.pop()!;
  e.setConfig(next);
}

export function canUndo() {
  return past.value.length > 0;
}

export function canRedo() {
  return future.value.length > 0;
}

export function useHistory() {
  return { commit, undo, redo, canUndo, canRedo };
}
