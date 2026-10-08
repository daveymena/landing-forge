"use client";

import { useState } from "react";
import { useEditor } from "@/lib/store";
import { BY_TYPE, type Field } from "@/lib/blocks/catalog";
import { getPath } from "@/lib/schema";
import UploadButton from "@/components/UploadButton";

function AiImageButton({ path, onChange }: { path: string; onChange: (path: string, v: any) => void }) {
  const productName = useEditor((s) => s.spec.product?.name || s.spec.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [quality, setQuality] = useState("low");
  return (
    <div className="row" style={{ marginTop: 6, gap: 6 }}>
      <select className="sel" value={quality} onChange={(e) => setQuality(e.target.value)} title="Calidad (costo)">
        <option value="low">Baja · $0.011</option>
        <option value="medium">Media · $0.042</option>
        <option value="high">Alta · $0.167</option>
      </select>
      <button
        className="btn sm"
        disabled={busy}
        onClick={async () => {
          const desc = window.prompt("Describe la imagen a generar:", `${productName}, foto comercial fondo neutro`);
          if (!desc) return;
          setBusy(true); setErr("");
          try {
            const r = await fetch("/api/ai/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: desc, size: "1024x1024", model: "gpt-image-1", quality }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "No se pudo generar");
            onChange(path, d.image);
          } catch (e: any) {
            setErr(String(e.message || e).slice(0, 160));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Generando…" : "✨ Generar con IA"}
      </button>
      {err ? <div className="hint" style={{ color: "#f87171" }}>{err}</div> : null}
    </div>
  );
}

function FieldInput({
  field, value, path, onChange,
}: { field: Field; value: any; path: string; onChange: (path: string, v: any) => void }) {
  const common = { id: path };

  if (field.type === "list") {
    const arr: any[] = Array.isArray(value) ? value : [];
    const blank = () =>
      Object.fromEntries((field.item ?? []).map((f) => [f.key, f.type === "boolean" ? false : f.type === "number" ? 0 : ""]));
    return (
      <details className="sect" open>
        <summary>
          {field.label} <span style={{ color: "var(--c-dim)", fontWeight: 400 }}>({arr.length})</span>
        </summary>
        <div className="sect__b">
          {arr.map((it, i) => (
            <div className="item" key={i}>
              <div className="item__h">
                <span className="item__t">
                  {String(it?.[field.itemLabelKey ?? "title"] ?? `Ítem ${i + 1}`).slice(0, 34) || `Ítem ${i + 1}`}
                </span>
                <button className="btn sm ghost" disabled={i === 0}
                  onClick={() => { const n = [...arr]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(path, n); }}>↑</button>
                <button className="btn sm ghost" disabled={i === arr.length - 1}
                  onClick={() => { const n = [...arr]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; onChange(path, n); }}>↓</button>
                <button className="btn sm ghost danger"
                  onClick={() => onChange(path, arr.filter((_, j) => j !== i))}>✕</button>
              </div>
              {(field.item ?? []).map((sub) => (
                <div className="fld" key={sub.key} style={{ marginBottom: 9 }}>
                  <FieldInput
                    field={sub}
                    value={it?.[sub.key]}
                    path={`${path}.${i}.${sub.key}`}
                    onChange={onChange}
                  />
                </div>
              ))}
            </div>
          ))}
          <button className="btn sm" style={{ width: "100%" }} onClick={() => onChange(path, [...arr, blank()])}>
            + Agregar {field.label.toLowerCase()}
          </button>
        </div>
      </details>
    );
  }

  const label = (
    <label className="lbl" htmlFor={path}>
      {field.label}
      {field.max ? <span style={{ color: "var(--c-dim)", fontWeight: 400 }}> · máx {field.max}</span> : null}
    </label>
  );

  switch (field.type) {
    case "boolean":
      return (
        <label className="row" style={{ gap: 8, cursor: "pointer" }}>
          <input className="sw" type="checkbox" checked={!!value} onChange={(e) => onChange(path, e.target.checked)} />
          <span style={{ fontSize: 13 }}>{field.label}</span>
        </label>
      );
    case "number":
      return (
        <>
          {label}
          <input {...common} className="inp" type="number" value={value ?? 0}
            onChange={(e) => onChange(path, Number(e.target.value))} />
        </>
      );
    case "color":
      return (
        <>
          {label}
          <div className="colorrow">
            <input type="color" value={value || "#000000"} onChange={(e) => onChange(path, e.target.value)} />
            <input className="inp" value={value || ""} onChange={(e) => onChange(path, e.target.value)} />
          </div>
        </>
      );
    case "select":
      return (
        <>
          {label}
          <select {...common} className="sel" value={value ?? ""} onChange={(e) => onChange(path, e.target.value)}>
            {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </>
      );
    case "textarea":
      return (
        <>
          {label}
          <textarea {...common} className="inp" value={value ?? ""} placeholder={field.placeholder}
            onChange={(e) => onChange(path, e.target.value)} />
          {field.help && <div className="hint">{field.help}</div>}
        </>
      );
    case "image":
      return (
        <>
          {label}
          <input {...common} className="inp" value={value ?? ""} placeholder="https://… o data:image/…"
            onChange={(e) => onChange(path, e.target.value)} />
          <UploadButton accept="image" onUploaded={(url) => onChange(path, url)} />
          <AiImageButton path={path} onChange={onChange} />
          {value ? (
            <img src={value} alt="" style={{ marginTop: 6, width: "100%", borderRadius: 8, border: "1px solid var(--c-line)" }} />
          ) : null}
        </>
      );
    default:
      return (
        <>
          {label}
          <input {...common} className="inp" value={value ?? ""} placeholder={field.placeholder}
            onChange={(e) => onChange(path, e.target.value)} />
          {/* Campos de video: además de pegar el enlace, subir el archivo. */}
          {/video|vimeo/i.test(field.label) && <UploadButton accept="video" onUploaded={(url) => onChange(path, url)} />}
          {field.help && <div className="hint">{field.help}</div>}
        </>
      );
  }
}

export default function Inspector() {
  const spec = useEditor((s) => s.spec);
  const selectedId = useEditor((s) => s.selectedId);
  const patchBlockProp = useEditor((s) => s.patchBlockProp);
  const setVariant = useEditor((s) => s.setVariant);
  const toggleVisible = useEditor((s) => s.toggleVisible);

  const block = spec.blocks?.find((b) => b.id === selectedId);
  if (!block) {
    return (
      <div className="pane__b">
        <div className="empty" style={{ marginTop: 6 }}>
          <b style={{ display: "block", color: "var(--c-txt)", marginBottom: 6 }}>Elige una sección</b>
          Haz clic en cualquier parte de la página para editarla. Los textos se cambian escribiendo directamente encima.
        </div>
      </div>
    );
  }
  const def = BY_TYPE[block.type];
  if (!def) return <div className="pane__b"><p className="hint">Bloque sin definición: {block.type}</p></div>;

  return (
    <div className="pane__b">
      <div className="insp-h">
        <span className="blk__i">{def.icon}</span>
        <b>{def.label}</b>
        <div className="sp" />
        <button className="btn sm" onClick={() => toggleVisible(block.id)}>
          {block.visible === false ? "Mostrar" : "Ocultar"}
        </button>
      </div>

      <div className="fld">
        <label className="lbl">Estilo de la sección</label>
        <select className="sel" value={block.variant} onChange={(e) => setVariant(block.id, e.target.value)}>
          {def.variants.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>

      {def.fields.map((f) => (
        <div className="fld" key={f.key}>
          <FieldInput
            field={f}
            value={getPath(block.props, f.key)}
            path={f.key}
            onChange={(p, v) => patchBlockProp(block.id, p, v)}
          />
        </div>
      ))}

      <details className="sect adv">
        <summary>Avanzado (JSON)</summary>
        <div className="sect__b">
          <textarea
            className="inp"
            style={{ fontFamily: "var(--mono)", fontSize: 11.4, minHeight: 170 }}
            defaultValue={JSON.stringify(block.props, null, 2)}
            onBlur={(e) => {
              try {
                const v = JSON.parse(e.target.value);
                Object.entries(v).forEach(([k, val]) => patchBlockProp(block.id, k, val));
              } catch { /* ignora JSON inválido */ }
            }}
          />
          <div className="hint">Edita y sal del campo para aplicar. JSON inválido se ignora.</div>
        </div>
      </details>
    </div>
  );
}
