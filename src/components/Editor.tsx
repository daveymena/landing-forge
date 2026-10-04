"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageSpec } from "@/lib/schema";
import { useEditor } from "@/lib/store";
import Preview from "./Preview";
import BlockList from "./BlockList";
import Inspector from "./Inspector";
import BlockLibrary from "./BlockLibrary";
import AiBar from "./AiBar";
import { ThemePanel, PagePanel, IntegrationsPanel } from "./Panels";

export default function Editor({ initial }: { initial: PageSpec }) {
  const init = useEditor((s) => s.init);
  const spec = useEditor((s) => s.spec);
  const panel = useEditor((s) => s.panel);
  const setPanel = useEditor((s) => s.setPanel);
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  const dirty = useEditor((s) => s.dirty);
  const saving = useEditor((s) => s.saving);
  const setSaving = useEditor((s) => s.setSaving);
  const markSaved = useEditor((s) => s.markSaved);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.past.length);
  const future = useEditor((s) => s.future.length);
  const toast = useEditor((s) => s.toast);
  const setToast = useEditor((s) => s.setToast);

  const [libOpen, setLibOpen] = useState(false);
  const [libAt, setLibAt] = useState<number | undefined>(undefined);
  const [ai, setAi] = useState(false);
  const [side, setSide] = useState<"none" | "left" | "right">("none");
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    init(initial);
    fetch("/api/generate").then((r) => r.json()).then((d) => setAi(!!d.aiAvailable)).catch(() => {});
  }, [init, initial]);

  /* En móvil los paneles se abren como overlays: reflejamos el estado en el body
     para que el CSS los muestre/oculte (body.show-left / body.show-right). */
  useEffect(() => {
    document.body.classList.toggle("show-left", side === "left");
    document.body.classList.toggle("show-right", side === "right");
    return () => {
      document.body.classList.remove("show-left", "show-right");
    };
  }, [side]);

  const save = useCallback(async () => {
    const cur = useEditor.getState().spec;
    if (!cur?.id) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/sites/${cur.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: cur }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "No se pudo guardar");
      markSaved();
    } catch (e: any) {
      setToast({ msg: String(e.message || e), kind: "err" });
      setSaving(false);
    }
  }, [markSaved, setSaving, setToast]);

  /* autoguardado */
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(save, 1400);
    return () => clearTimeout(t);
  }, [dirty, spec, save]);

  /* atajos */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, save]);

  if (!spec?.id) return <div style={{ padding: 40, color: "var(--c-mut)" }}>Cargando editor…</div>;

  return (
    <div className="app">
      <div className="topbar">
        <a className="btn sm ghost" href="/" title="Volver">←</a>
        {/* En móvil primero: los paneles son lo primero que hace falta */}
        <button className="btn sm m-only" onClick={() => setSide(s => s === "left" ? "none" : "left")} title="Bloques" aria-pressed={side === "left"}>☰ Bloques</button>
        <button className="btn sm m-only" onClick={() => setSide(s => s === "right" ? "none" : "right")} title="Ajustes" aria-pressed={side === "right"}>⚙</button>
        <div className="brand d-only"><span className="mark">LF</span></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
            {spec.name}
          </div>
          <div style={{ fontSize: 10.8, color: "var(--c-dim)" }}>
            {saving ? "Guardando…" : dirty ? "Cambios sin guardar" : "Todo guardado"}
          </div>
        </div>

        <div className="sp" />

        <div className="seg d-only">
          {([["desktop", "🖥"], ["tablet", "▭"], ["mobile", "▯"]] as const).map(([d, ic]) => (
            <button key={d} aria-pressed={device === d} onClick={() => setDevice(d)} title={d}>{ic}</button>
          ))}
        </div>

        <button className="btn icon d-only" onClick={undo} disabled={!past} title="Deshacer (⌘Z)">↶</button>
        <button className="btn icon d-only" onClick={redo} disabled={!future} title="Rehacer (⌘⇧Z)">↷</button>

        <div className="sp" />

        <span className={`chip d-only ${ai ? "ok" : "warn"}`}>{ai ? "IA activa" : "Sin IA"}</span>
        <button className="btn" onClick={save} disabled={saving}>Guardar</button>
        <a className="btn d-only" href={`/api/export/${spec.id}?download=0`} target="_blank" rel="noreferrer">Ver página</a>
        <a className="btn pri d-only" href={`/api/export/${spec.id}`}>⬇ Exportar HTML</a>
      </div>

      <div className="main">
        <BlockList onAdd={(i) => { setLibAt(i); setLibOpen(true); }} />
        <div className="canvas">
          <div className="canvas__bar">
            <span className="chip">{spec.vertical}</span>
            <span className="chip">{spec.theme.preset}</span>
            <span className="chip">{spec.blocks.length} bloques</span>
            <div className="sp" />
            <span className="hint" style={{ margin: 0 }}>
              Clic en un bloque para seleccionarlo · clic en un texto para editarlo en el sitio
            </span>
          </div>
          <Preview />
        </div>

        <div className="pane right">
          <div className="tabs" role="tablist">
            {([["block", "Bloque"], ["theme", "Tema"], ["page", "Página"], ["integrations", "Conectar"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={panel === k} onClick={() => setPanel(k)}>{l}</button>
            ))}
          </div>
          {panel === "block" && <Inspector />}
          {panel === "theme" && <ThemePanel />}
          {panel === "page" && <PagePanel />}
          {panel === "integrations" && <IntegrationsPanel />}
        </div>
      </div>

      <AiBar aiAvailable={ai} />

      {libOpen && <BlockLibrary at={libAt} onClose={() => setLibOpen(false)} />}
      {side !== "none" && <div className="m-scrim" onClick={() => setSide("none")} />}
      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
    </div>
  );
}
