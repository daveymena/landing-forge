"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DropiConnect from "@/components/DropiConnect";
import AiConnect from "@/components/AiConnect";
import UrlImport, { type Extracted } from "@/components/UrlImport";

interface SiteRow {
  id: string; name: string; slug: string; vertical: string;
  preset: string; blocks: number; updatedAt: string;
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

  return (
    <div className="dash">
      <div className="dash__w">
        <div className="row" style={{ marginBottom: 30 }}>
          <div className="brand">
            <span className="mark">LF</span> Landing&nbsp;Forge
          </div>
          <div className="sp" />
          {ai && (
            <span className={`chip ${ai.aiAvailable ? "ok" : "warn"}`}>
              {ai.aiAvailable ? `IA activa · ${ai.providerLabel || ai.provider} · ${ai.model}` : "Sin IA · motor determinista"}
            </span>
          )}
        </div>

        <h1 className="hero-h">Describe tu producto.<br />Recibe una landing lista para vender.</h1>
        <p className="sub">
          Genera landings modernas para <b>dropshipping contraentrega</b>, <b>productos digitales</b> y{" "}
          <b>suscripciones</b>. Edítalas a mano o por instrucciones, conéctalas a Dropi y expórtalas
          como un único archivo HTML.
        </p>

        <div className="promptbox">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(); }}

            placeholder="Ej: Landing para vender una freidora de aire de 5L en México a $1,290 MXN con pago contra entrega, envío gratis y garantía de 30 días. Público: familias que quieren cocinar más sano sin complicarse."
          />
          <div className="promptbox__f">
            <span className="hint" style={{ margin: 0 }}>
              Menciona país, precio, público y promesa. ⌘/Ctrl + Enter para generar.
            </span>
            <div className="sp" />
            {err && <span className="chip err">{err}</span>}
            <button className="btn pri" onClick={() => generate()} disabled={busy}>
              {busy ? "Generando…" : "✨ Generar landing"}
            </button>
          </div>
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <select className="sel" value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ flex: 2, minWidth: 220 }}>
            <option value="">Plantilla: automática (la IA elige)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} · {t.hint.slice(0, 60)}</option>
            ))}
          </select>
          <select className="sel" value={baseSiteId} onChange={(e) => setBaseSiteId(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
            <option value="">Desde cero</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>Remix: {s.name}</option>
            ))}
          </select>
          <label className="row" style={{ gap: 6, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={pro} onChange={(e) => setPro(e.target.checked)} />
            Modo pro (diseño libre)
          </label>
        </div>

        <UrlImport busy={busy} onUse={(source, url) => generate({ source, url })} />

        <div className="examples">
          {EXAMPLES.map((e) => (
            <button key={e.t} className="ex" onClick={() => setPrompt(e.p)}>
              <b>{e.t}</b>
              <span>{e.p.slice(0, 105)}…</span>
            </button>
          ))}
        </div>

        <div className="sec-h">Integraciones</div>
        <AiConnect onChanged={loadAi} />
        <DropiConnect />

        <div className="sec-h">Tus landings {sites.length ? `(${sites.length})` : ""}</div>
        {!sites.length && (
          <p className="hint" style={{ fontSize: 13 }}>
            Todavía no hay ninguna. Genera la primera con el cuadro de arriba.
          </p>
        )}
        <div className="cards">
          {sites.map((s) => (
            <div key={s.id} className="card2">
              <div className="row">
                <h3>{s.name}</h3>
                <div className="sp" />
                <span className="chip">{s.vertical}</span>
              </div>
              <div className="hint" style={{ margin: 0 }}>
                {s.blocks} bloques · tema {s.preset} · {new Date(s.updatedAt).toLocaleString("es-CO")}
              </div>
              <div className="row" style={{ marginTop: 2 }}>
                <a className="btn sm pri" href={`/editor/${s.id}`}>Abrir editor</a>
                <a className="btn sm" href={`/api/export/${s.id}`}>Exportar HTML</a>
                <div className="sp" />
                <button className="btn sm danger" onClick={() => remove(s.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
