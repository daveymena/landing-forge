"use client";

import { create } from "zustand";
import {
  applyOps,
  setPath,
  uid,
  type Block,
  type EditOp,
  type PageSpec,
} from "./schema";
import { withDefaults, BY_TYPE } from "./blocks/catalog";

type Panel = "block" | "theme" | "page" | "integrations";
type Device = "desktop" | "tablet" | "mobile";

interface State {
  spec: PageSpec;
  selectedId: string | null;
  panel: Panel;
  device: Device;
  dirty: boolean;
  saving: boolean;
  busy: boolean;
  toast: { msg: string; kind: "ok" | "err" | "info" } | null;
  past: PageSpec[];
  future: PageSpec[];
  log: { role: "user" | "ai"; text: string }[];

  init(spec: PageSpec): void;
  select(id: string | null): void;
  setPanel(p: Panel): void;
  setDevice(d: Device): void;
  commit(next: PageSpec): void;
  patchBlockProp(blockId: string, path: string, value: any): void;
  setVariant(blockId: string, variant: string): void;
  toggleVisible(blockId: string): void;
  removeBlock(blockId: string): void;
  duplicateBlock(blockId: string): void;
  moveBlock(from: number, to: number): void;
  addBlock(type: string, atIndex?: number): void;
  applyAiOps(ops: EditOp[]): void;
  patchTheme(patch: any): void;
  patchRoot(path: string, value: any): void;
  undo(): void;
  redo(): void;
  setToast(t: State["toast"]): void;
  setBusy(b: boolean): void;
  setSaving(b: boolean): void;
  markSaved(): void;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const useEditor = create<State>((set, get) => ({
  spec: {} as PageSpec,
  selectedId: null,
  panel: "block",
  device: "desktop",
  dirty: false,
  saving: false,
  busy: false,
  toast: null,
  past: [],
  future: [],
  log: [],

  init(spec) {
    set({ spec: clone(spec), selectedId: spec.blocks[0]?.id ?? null, past: [], future: [], dirty: false, log: [] });
  },
  select(id) { set({ selectedId: id, panel: id ? "block" : get().panel }); },
  setPanel(p) { set({ panel: p }); },
  setDevice(d) { set({ device: d }); },

  commit(next) {
    const { spec, past } = get();
    set({ past: [...past, clone(spec)].slice(-60), future: [], spec: next, dirty: true });
  },

  patchBlockProp(blockId, path, value) {
    const next = clone(get().spec);
    const b = next.blocks.find((x) => x.id === blockId);
    if (!b) return;
    setPath(b.props, path, value);
    get().commit(next);
  },

  setVariant(blockId, variant) {
    const next = clone(get().spec);
    const b = next.blocks.find((x) => x.id === blockId);
    if (!b) return;
    b.variant = variant;
    b.props = withDefaults(b.type, b.props);
    get().commit(next);
  },

  toggleVisible(blockId) {
    const next = clone(get().spec);
    const b = next.blocks.find((x) => x.id === blockId);
    if (!b) return;
    b.visible = b.visible === false;
    get().commit(next);
  },

  removeBlock(blockId) {
    const next = clone(get().spec);
    next.blocks = next.blocks.filter((x) => x.id !== blockId);
    get().commit(next);
    if (get().selectedId === blockId) set({ selectedId: next.blocks[0]?.id ?? null });
  },

  duplicateBlock(blockId) {
    const next = clone(get().spec);
    const i = next.blocks.findIndex((x) => x.id === blockId);
    if (i < 0) return;
    const copy: Block = { ...clone(next.blocks[i]), id: uid(next.blocks[i].type.slice(0, 3)) };
    next.blocks.splice(i + 1, 0, copy);
    get().commit(next);
    set({ selectedId: copy.id });
  },

  moveBlock(from, to) {
    const next = clone(get().spec);
    if (from === to || from < 0 || from >= next.blocks.length) return;
    const [b] = next.blocks.splice(from, 1);
    next.blocks.splice(Math.max(0, Math.min(next.blocks.length, to)), 0, b);
    get().commit(next);
  },

  addBlock(type, atIndex) {
    const def = BY_TYPE[type];
    if (!def) return;
    const next = clone(get().spec);
    const b: Block = {
      id: uid(type.slice(0, 3)),
      type,
      variant: def.variants[0].value,
      visible: true,
      props: withDefaults(type, {}),
    };
    const at = atIndex ?? next.blocks.length;
    next.blocks.splice(at, 0, b);
    get().commit(next);
    set({ selectedId: b.id, panel: "block" });
  },

  applyAiOps(ops) { get().commit(applyOps(get().spec, ops)); },
  patchTheme(patch) {
    const next = clone(get().spec);
    Object.assign(next.theme, { ...next.theme, ...patch });
    if (patch.colors) next.theme.colors = { ...next.theme.colors, ...patch.colors };
    if (patch.fonts) next.theme.fonts = { ...next.theme.fonts, ...patch.fonts };
    if (patch.effects) next.theme.effects = { ...next.theme.effects, ...patch.effects };
    get().commit(next);
  },
  patchRoot(path, value) {
    const next = clone(get().spec);
    setPath(next, path, value);
    get().commit(next);
  },

  undo() {
    const { past, spec, future } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    set({ spec: prev, past: past.slice(0, -1), future: [clone(spec), ...future].slice(0, 60), dirty: true });
  },
  redo() {
    const { future, spec, past } = get();
    if (!future.length) return;
    set({ spec: future[0], future: future.slice(1), past: [...past, clone(spec)].slice(-60), dirty: true });
  },

  setToast(t) { set({ toast: t }); if (t) setTimeout(() => set({ toast: null }), 3800); },
  setBusy(b) { set({ busy: b }); },
  setSaving(b) { set({ saving: b }); },
  markSaved() { set({ dirty: false, saving: false }); },
}));
