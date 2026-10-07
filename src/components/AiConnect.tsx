"use client";

import { useCallback, useEffect, useState } from "react";

interface Meta {
  id: string;
  label: string;
  kind: string;
  defaultBaseUrl: string;
  defaultModel: string;
  needsKey: boolean;
  keyUrl: string;
  help: string;
  suggested: { id: string; label: string; free?: boolean }[];
  envKeys: string[];
  envReady: boolean;
}

export default function AiConnect({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Meta[]>([]);
  const [active, setActive] = useState<{ id: string; model: string; source: string } | null>(null);

  const [pid, setPid] = useState("custom");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [keyHint, setKeyHint] = useState("");
  const [fallbacks, setFallbacks] = useState("");

  const [live, setLive] = useState<{ id: string; label: string; free?: boolean }[] | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const meta = providers.find((p) => p.id === pid);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch("/api/ai/providers").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]);
    setProviders(a.providers || []);
    setActive(a.active || null);
    const s = b.settings?.ai || {};
    const chosen = s.provider && s.provider !== "auto" ? s.provider : a.active?.id !== "none" ? a.active?.id : "custom";
    const m = (a.providers || []).find((p: Meta) => p.id === chosen);
    setPid(chosen || "custom");
    setModel(s.model || m?.defaultModel || "");
    setBaseUrl(s.baseUrl || m?.defaultBaseUrl || "");
    // El campo arranca SIEMPRE vacio: la clave guardada nunca vuelve al
    // navegador completa; solo se indica que existe (y sus ultimos 4).
    setApiKey("");
    setHasKey(!!s.hasApiKey);
    setKeyHint(String(s.apiKey || ""));
    setFallbacks((s.fallbacks || []).join(", "));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function pick(id: string) {
    const m = providers.find((p) => p.id === id);
    setPid(id);
    setModel(m?.defaultModel || "");
    setBaseUrl(m?.defaultBaseUrl || "");
    setApiKey("");
    setHasKey(false);
    setLive(null);
    setMsg(null);
  }

  const payload = () => ({
    provider: pid,
    model,
    baseUrl,
    apiKey,
    fallbacks: fallbacks.split(",").map((s) => s.trim()).filter(Boolean),
  });

  async function act(action: "test" | "models") {
    setBusy(action);
    setMsg(null);
    try {
      const r = await fetch("/api/ai/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload() }),
      });
      const d = await r.json();
      if (action === "models") {
        setLive(d.models || []);
        setMsg({
          ok: !!d.ok,
          text: d.ok ? `${d.count} modelos disponibles.` : `No pude listar: ${d.detail}`,
        });
      } else {
        setMsg({
          ok: !!d.ok,
          text: d.ok ? `Conectado en ${d.ms} ms. Respuesta: «${d.detail}»` : `Falló: ${d.detail}`,
        });
      }
    } catch (e: any) {
      setMsg({ ok: false, text: String(e.message || e) });
    } finally {
      setBusy("");
    }
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    try {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai: payload() }),
      });
      const d = await r.json();
      setHasKey(!!d.settings?.ai?.hasApiKey);
      setApiKey("");
      setKeyHint(String(d.settings?.ai?.apiKey || ""));
      setMsg({ ok: true, text: "Guardado. Las próximas generaciones usarán este modelo." });
      await load();
      onChanged?.();
    } catch (e: any) {
      setMsg({ ok: false, text: String(e.message || e) });
    } finally {
      setBusy("");
    }
  }

  const options = live && live.length ? live : meta?.suggested || [];
  const freeCount = options.filter((o) => o.free).length;

  return (
    <div className="card2" style={{ gridColumn: "1 / -1" }}>
      <div className="row" style={{ alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>🧠</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <b style={{ fontSize: 14.5 }}>Motor de IA</b>
          <div className="hint" style={{ margin: "2px 0 0" }}>
            Ollama local, OpenCode Zen, OpenRouter free o cualquier endpoint OpenAI-compatible
          </div>
        </div>
        <span className={`chip ${active && active.id !== "none" ? "ok" : "warn"}`}>
          {active && active.id !== "none"
            ? `${providers.find((p) => p.id === active.id)?.label || active.id} · ${active.model}`
            : "Sin IA · motor determinista"}
        </span>
        <button className="btn sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cerrar" : "Configurar"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          <div>
            <div className="lbl">Proveedor</div>
            <div className="row" style={{ flexWrap: "wrap", gap: 7 }}>
              {providers.map((p) => (
                <button
                  key={p.id}
                  className={`btn sm ${pid === p.id ? "pri" : ""}`}
                  onClick={() => pick(p.id)}
                  title={p.help}
                >
                  {p.label}
                  {p.envReady && <span style={{ opacity: 0.7, marginLeft: 5 }}>·env</span>}
                </button>
              ))}
            </div>
            {meta && <div className="hint">{meta.help}</div>}
          </div>

          <div className="row" style={{ gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", minWidth: 240 }}>
              <div className="lbl">
                Modelo {freeCount > 0 && <span style={{ color: "var(--c-ok)" }}>· {freeCount} gratuitos</span>}
              </div>
              <input
                className="inp"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={meta?.defaultModel || "id del modelo"}
                list="lf-models"
              />
              <datalist id="lf-models">
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </datalist>
              {options.length > 0 && (
                <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                  {options.slice(0, 12).map((o) => (
                    <button
                      key={o.id}
                      className="chip"
                      style={{
                        cursor: "pointer",
                        borderColor: model === o.id ? "var(--c-pri)" : undefined,
                        color: model === o.id ? "var(--c-txt)" : undefined,
                      }}
                      onClick={() => setModel(o.id)}
                    >
                      {o.free ? "🆓 " : ""}
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: "1 1 280px", minWidth: 220 }}>
              <div className="lbl">URL base</div>
              <input
                className="inp"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={meta?.defaultBaseUrl}
                spellCheck={false}
              />
              <div className="lbl" style={{ marginTop: 10 }}>
                API key {meta && !meta.needsKey && <span style={{ opacity: 0.6 }}>(opcional)</span>}
              </div>
              <input
                className="inp"
                type="password"
                autoComplete="new-password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? `Guardada ${keyHint} · escribe una nueva para cambiarla` : meta?.needsKey ? "pega tu key" : "no hace falta"}
                spellCheck={false}
              />
              {hasKey && (
                <button
                  type="button"
                  className="btn sm ghost danger"
                  style={{ marginTop: 6 }}
                  onClick={async () => {
                    if (!confirm("¿Quitar la clave guardada de este proveedor?")) return;
                    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ai: { clearApiKey: true } }) });
                    setHasKey(false);
                    setKeyHint("");
                  }}
                >
                  Quitar clave guardada
                </button>
              )}
              {meta?.keyUrl && (
                <div className="hint">
                  Consíguela en{" "}
                  <a href={meta.keyUrl} target="_blank" rel="noreferrer" style={{ color: "var(--c-pri)" }}>
                    {meta.keyUrl.replace(/^https?:\/\//, "")}
                  </a>
                  . También puedes ponerla en <code>.env</code> como <code>{meta.envKeys[0]}</code>.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="lbl">Modelos de respaldo (opcional, separados por coma)</div>
            <input
              className="inp"
              value={fallbacks}
              onChange={(e) => setFallbacks(e.target.value)}
              placeholder="big-pickle, nemotron-3-ultra-free"
              spellCheck={false}
            />
            <div className="hint">Si el principal falla o se queda sin cuota, se prueban estos en orden.</div>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => act("models")} disabled={!!busy}>
              {busy === "models" ? "Cargando…" : "Cargar modelos"}
            </button>
            <button className="btn" onClick={() => act("test")} disabled={!!busy}>
              {busy === "test" ? "Probando…" : "Probar conexión"}
            </button>
            <div className="sp" />
            <button className="btn pri" onClick={save} disabled={!!busy}>
              {busy === "save" ? "Guardando…" : "Guardar"}
            </button>
          </div>

          {msg && <div className={`chip ${msg.ok ? "ok" : "err"}`} style={{ whiteSpace: "normal" }}>{msg.text}</div>}

          {pid === "custom" && (
            <div className="hint" style={{ borderTop: "1px solid var(--c-line)", paddingTop: 10 }}>
              <b style={{ color: "var(--c-txt)" }}>Modelos gratis sin API key:</b> en otra terminal ejecuta{" "}
              <code>npm run bridge</code>. Levanta opencode y expone sus 10 modelos gratuitos en{" "}
              <code>http://127.0.0.1:8787/v1</code>. Luego pulsa «Cargar modelos».
            </div>
          )}
          {pid === "ollama" && (
            <div className="hint" style={{ borderTop: "1px solid var(--c-line)", paddingTop: 10 }}>
              <b style={{ color: "var(--c-txt)" }}>Ollama:</b> instala desde ollama.com, ejecuta{" "}
              <code>ollama pull qwen2.5:7b-instruct</code> y pulsa «Cargar modelos». Necesita ~6 GB de RAM libre;
              por debajo de 7B el JSON sale peor y conviene dejar el motor determinista.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
