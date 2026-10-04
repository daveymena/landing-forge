"use client";

import { useState } from "react";

export interface Extracted {
  name: string;
  description: string;
  price: number;
  compareAtPrice: number;
  currency: string;
  images: string[];
  videos?: string[];
  bullets: string[];
  brand: string;
  rating: number;
  ratingCount: number;
  host: string;
  sources: Record<string, string>;
}

const SOURCE_LABEL: Record<string, string> = {
  "json-ld": "datos estructurados",
  microdata: "microdatos",
  meta: "metaetiquetas",
  html: "deducido del texto",
};

export default function UrlImport({
  onUse,
  busy,
}: {
  onUse: (data: Extracted, url: string) => void;
  busy?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState<Extracted | null>(null);
  const [conf, setConf] = useState(0);
  const [warns, setWarns] = useState<string[]>([]);
  const [drop, setDrop] = useState<Set<number>>(new Set());
  const [browserMode, setBrowserMode] = useState(false);
  const [shot, setShot] = useState<string | null>(null);

  async function analyze() {
    const u = url.trim();
    if (!u) return;
    setLoading(true);
    setErr("");
    setData(null);
    setShot(null);
    try {
      const r = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u, ...(browserMode ? { mode: "browser" } : {}) }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "No pude leer esa página.");
      setData(d.product);
      setConf(d.confidence);
      setWarns(d.warnings || []);
      if (d.screenshot) setShot(d.screenshot);
      setDrop(new Set());
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function toggleImg(i: number) {
    const next = new Set(drop);
    next.has(i) ? next.delete(i) : next.add(i);
    setDrop(next);
  }

  function use() {
    if (!data) return;
    onUse({ ...data, images: data.images.filter((_, i) => !drop.has(i)) }, url.trim());
  }

  const field = (k: string) => {
    const s = data?.sources?.[k];
    return s ? <span className="hint" style={{ marginLeft: 6 }}>· {SOURCE_LABEL[s] || s}</span> : null;
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="inp"
          style={{ flex: 1 }}
          placeholder="…o pega la URL de un producto (Shopify, WooCommerce, Dropi, tienda del proveedor)"
          value={url}
          spellCheck={false}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
        />
        <button className="btn" onClick={analyze} disabled={loading || !url.trim()}>
          {loading ? "Analizando…" : "Analizar"}
        </button>
      </div>
      <label className="row" style={{ gap: 6, marginTop: 8, cursor: "pointer", fontSize: 12.5 }}>
        <input type="checkbox" checked={browserMode} onChange={(e) => setBrowserMode(e.target.checked)} />
        Abrir con navegador real (Shein, AliExpress, páginas con JavaScript — tarda ~15 s)
      </label>

      {err && (
        <div className="chip err" style={{ marginTop: 8, whiteSpace: "normal" }}>
          {err}
        </div>
      )}

      {data && (
        <div className="card2" style={{ marginTop: 10 }}>
          <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 10 }}>
            <b style={{ fontSize: 13.5 }}>Datos encontrados en {data.host}</b>
            <span className={`chip ${conf >= 0.7 ? "ok" : conf >= 0.45 ? "warn" : "err"}`}>
              {conf >= 0.7 ? "fiables" : conf >= 0.45 ? "revisa antes de usar" : "poco fiables"}
            </span>
            <div className="sp" />
            <button className="btn pri sm" onClick={use} disabled={busy}>
              {busy ? "Generando…" : "Generar landing con estos datos"}
            </button>
          </div>

          <div className="row" style={{ gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", minWidth: 260 }}>
              <div className="lbl">Producto {field("name")}</div>
              <input className="inp" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />

              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="lbl">Precio {field("price")}</div>
                  <input
                    className="inp"
                    type="number"
                    value={data.price || ""}
                    onChange={(e) => setData({ ...data, price: Number(e.target.value) })}
                  />
                </div>
                <div style={{ width: 96 }}>
                  <div className="lbl">Moneda</div>
                  <input
                    className="inp"
                    value={data.currency}
                    onChange={(e) => setData({ ...data, currency: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              {(data.rating > 0 || data.bullets.length > 0) && (
                <div className="hint" style={{ marginTop: 10 }}>
                  {data.rating > 0 && `★ ${data.rating} (${data.ratingCount} reseñas) · `}
                  {data.bullets.length > 0 && `${data.bullets.length} características detectadas`}
                </div>
              )}
            </div>

            <div style={{ flex: "1 1 300px", minWidth: 240 }}>
              <div className="lbl">
                Imágenes · {data.images.length - drop.size} de {data.images.length}
                <span className="hint" style={{ marginLeft: 6 }}>(clic para descartar)</span>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {data.images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => toggleImg(i)}
                    title={drop.has(i) ? "Descartada" : "Clic para descartar"}
                    style={{
                      width: 62,
                      height: 62,
                      padding: 0,
                      borderRadius: 10,
                      overflow: "hidden",
                      border: `2px solid ${drop.has(i) ? "transparent" : "var(--c-pri)"}`,
                      opacity: drop.has(i) ? 0.3 : 1,
                      background: "var(--c-s2)",
                      cursor: "pointer",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
                {!data.images.length && <span className="hint">Ninguna. Tendrás que añadirlas en el editor.</span>}
              </div>
              {(data.videos?.length ?? 0) > 0 && (
                <div className="hint" style={{ marginTop: 6 }}>
                  🎬 {data.videos!.length} video(s) detectado(s) — la IA los pondrá en el hero VSL / bloque video.
                </div>
              )}
              {shot && (
                <div style={{ marginTop: 8 }}>
                  <div className="lbl">Captura de la página</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot} alt="captura" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--c-line)" }} />
                </div>
              )}
            </div>
          </div>

          {data.description && (
            <div style={{ marginTop: 12 }}>
              <div className="lbl">Descripción original {field("description")}</div>
              <div className="hint" style={{ maxHeight: 64, overflow: "auto", margin: 0 }}>
                {data.description}
              </div>
            </div>
          )}

          {warns.length > 0 && (
            <div className="hint" style={{ marginTop: 10, color: "var(--c-warn)" }}>
              {warns.join(" ")}
            </div>
          )}
          <div className="hint" style={{ marginTop: 8 }}>
            La IA reescribe todo el copy en español con enfoque de venta; el precio, el nombre y las fotos se toman
            tal cual de aquí. Puedes editar cualquier campo antes de generar.
          </div>
        </div>
      )}
    </div>
  );
}
