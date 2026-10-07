"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DropiConnect from "@/components/DropiConnect";
import AiConnect from "@/components/AiConnect";
import UrlImport, { type Extracted } from "@/components/UrlImport";
import { VERTICAL_LABEL, type Vertical } from "@/lib/schema";

interface SiteRow {
  id: string; name: string; slug: string; vertical: string;
  preset: string; blocks: number; updatedAt: string; thumb?: string;
}

const EXAMPLES = [
  {
    t: "Contraentrega · Colombia",
    p: "Landing para vender un masajeador cervical eléctrico en Colombia a $89.900 con pago contra entrega, envío gratis 24-72h y garantía de 30 días. Público: personas con dolor de cuello por trabajar frente al computador.",
  },
  {
    t: "Infoproducto",
    p: "Landing para un curso online 'Dropshipping Rentable en 30 días' con video de ventas, temario de 3 módulos, bonos, garantía de 14 días y precio único de 97 USD.",
  },
  {
    t: "SaaS · suscripción",
    p: "Landing para un SaaS de automatización de WhatsApp para pymes, con planes mensuales desde 19 USD, prueba gratis sin tarjeta, bento grid de features e integraciones.",
  },
  {
    t: "Servicio · agencia",
    p: "Landing para una agencia de marketing de resultados en Cali que ofrece diagnóstico gratuito de 30 minutos a negocios que ya facturan y quieren escalar con Meta Ads.",
  },
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [ai, setAi] = useState<{ aiAvailable: boolean; provider: string; providerLabel?: string; model: string } | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string; vertical: string; hint: string }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [pro, setPro] = useState(false);
  const [baseSiteId, setBaseSiteId] = useState("");
  const [mode, setMode] = useState<"text" | "url">("text");
  const [showOpts, setShowOpts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  async function loadAi() {
    try {
      setAi(await fetch("/api/generate").then((r) => r.json()));
    } catch { /* noop */ }
  }

  async function load() {
    try {
      const [s, a, t] = await Promise.all([
        fetch("/api/sites").then((r) => r.json()),
        fetch("/api/generate").then((r) => r.json()),
        fetch("/api/templates").then((r) => r.json()).catch(() => ({ templates: [] })),
      ]);
      setSites(s.sites ?? []);
      setAi(a);
      setTemplates(t.templates ?? []);
    } catch { /* noop */ }
  }
  useEffect(() => { load(); }, []);

  async function generate(extra?: { source?: Extracted; url?: string }) {
    if (!extra?.source && prompt.trim().length < 8) {
      setErr("Describe tu producto con un poco más de detalle.");
      return;
    }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          ...(templateId ? { templateId } : {}),
          ...(pro ? { pro: true } : {}),
          ...(baseSiteId ? { baseSiteId } : {}),
          ...(extra?.source ? { source: extra.source, url: extra.url } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo generar");
      router.push(`/editor/${d.spec.id}`);
    } catch (e: any) {
      setErr(String(e.message || e));
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta landing?")) return;
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    load();
  }

  const aiOk = !!ai?.aiAvailable;

  return (
    <div className="dash">
      <div className="dash__top">
        <div>
          <div className="brand">
            <span className="mark">LF</span> Landing Forge
          </div>
          <div className="sp" />
          {ai && (
            <span
              className={`chip ${aiOk ? "ok" : "warn"}`}
              title={aiOk ? `${ai.providerLabel || ai.provider} · ${ai.model}` : "Sin IA: se usa el motor básico"}
            >
              <span className="dot" /> {aiOk ? "IA" : "Sin IA"}<span className="hide-m">{aiOk ? " conectada" : ""}</span>
            </span>
          )}
          <button className="btn sm" onClick={() => setShowSettings((v) => !v)} aria-pressed={showSettings}>
            ⚙<span className="hide-m"> Configuración</span>
          </button>
          <button
            className="btn sm ghost"
            title="Cerrar sesión"
            onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/entrar"; }}
          >
            Salir
          </button>
        </div>
      </div>

      <div className="dash__w">
        {showSettings && (
          <div style={{ marginBottom: 32 }}>
            <div className="sec-h" style={{ marginTop: 0 }}>Configuración</div>
            <p className="hint" style={{ fontSize: 13, marginBottom: 12 }}>
              El motor de IA que redacta las landings y la conexión con Dropi para los pedidos contraentrega.
            </p>
            <AiConnect onChanged={loadAi} />
            <DropiConnect />
          </div>
        )}

        <h1 className="hero-h">Crea una landing que vende</h1>
        <p className="sub">
          Cuéntanos qué vendes o pega el enlace del producto. Te entregamos la página lista: textos, fotos y
          formulario de pedido. Después la ajustas con un clic o pidiéndoselo a la IA.
        </p>

        <div className="creator">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === "text"} onClick={() => setMode("text")}>Describir producto</button>
            <button role="tab" aria-selected={mode === "url"} onClick={() => setMode("url")}>Desde un enlace</button>
          </div>

          {mode === "text" ? (
            <div className="promptbox">
              <textarea
                value={prompt}
                autoFocus
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(); }}
                placeholder="Ej: Masajeador cervical eléctrico, $89.900, pago contra entrega en Colombia. Para personas con dolor de cuello por trabajar en computador."
              />
              <div className="promptbox__f">
                <span className="hint" style={{ margin: 0 }}>Incluye producto, precio, país y para quién es.</span>
                <div className="sp" />
                <button className="linkbtn" onClick={() => setShowOpts((v) => !v)}>
                  {showOpts ? "Ocultar opciones" : "Opciones"}
                </button>
                <button className="btn pri" onClick={() => generate()} disabled={busy}>
                  {busy ? "Generando… (≈1 min)" : "Generar landing"}
                </button>
              </div>
              {err && <div className="chip err" style={{ marginTop: 10, whiteSpace: "normal" }}>{err}</div>}
            </div>
          ) : (
            <div className="promptbox" style={{ paddingTop: 14 }}>
              <UrlImport busy={busy} onUse={(source, url) => generate({ source, url })} />
              {err && <div className="chip err" style={{ marginTop: 10, whiteSpace: "normal" }}>{err}</div>}
            </div>
          )}

          {showOpts && mode === "text" && (
            <div className="adv-opts">
              <select className="sel" value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ flex: 2, minWidth: 200 }}>
                <option value="">Diseño: lo elige la IA</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select className="sel" value={baseSiteId} onChange={(e) => setBaseSiteId(e.target.value)} style={{ flex: 1, minWidth: 170 }}>
                <option value="">Empezar desde cero</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>Basarse en: {s.name}</option>
                ))}
              </select>
              <label className="row" style={{ gap: 7, cursor: "pointer", fontSize: 13 }} title="La IA arma la estructura libremente en vez de seguir el diseño">
                <input className="sw" type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
                Diseño libre
              </label>
            </div>
          )}
        </div>

        {mode === "text" && (
          <div className="examples">
            <span className="hint">Prueba con:</span>
            {EXAMPLES.map((e) => (
              <button key={e.t} className="ex" onClick={() => setPrompt(e.p)}>{e.t}</button>
            ))}
          </div>
        )}

        <div className="sec-h">
          Tus landings {sites.length ? <small>{sites.length}</small> : null}
        </div>
        {!sites.length && (
          <div className="empty">Todavía no tienes landings. Crea la primera arriba.</div>
        )}
        <div className="cards">
          {sites.map((s) => (
            <div key={s.id} className="card2 site">
              <a className="site__thumb" href={`/editor/${s.id}`} aria-label={`Editar ${s.name}`}>
                {s.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.thumb} alt="" loading="lazy" />
                ) : (
                  initials(s.name)
                )}
              </a>
              <div className="site__b">
                <div>
                  <h3 title={s.name}>{s.name}</h3>
                  <div className="hint" style={{ margin: "3px 0 0" }}>
                    {VERTICAL_LABEL[s.vertical as Vertical]?.split(" · ")[0] ?? s.vertical} · {haceCuanto(s.updatedAt)}
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <a className="btn sm pri" href={`/editor/${s.id}`}>Editar</a>
                  <a className="btn sm" href={`/l/${s.slug}`} target="_blank" rel="noreferrer">Ver</a>
                  <div className="sp" />
                  <a className="btn sm ghost" href={`/api/export/${s.id}`} title="Descargar HTML">⬇</a>
                  <button className="btn sm ghost danger" onClick={() => remove(s.id)} title="Eliminar">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const w = name.replace(/[-_]+/g, " ").trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? "")).toUpperCase() || "LF";
}

function haceCuanto(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? "día" : "días"}`;
  return new Date(iso).toLocaleDateString("es-CO");
}
