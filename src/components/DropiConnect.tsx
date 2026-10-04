"use client";

import { useEffect, useState } from "react";

interface DropiSettings {
  enabled: boolean;
  env: "test" | "prod";
  token: string;
  hasToken?: boolean;
  authScheme: "bearer" | "integration-key";
  country: string;
  baseUrlOverride: string;
}

const COUNTRIES = [
  ["co", "Colombia"], ["mx", "México"], ["ec", "Ecuador"], ["pe", "Perú"], ["cl", "Chile"],
  ["pa", "Panamá"], ["cr", "Costa Rica"], ["gt", "Guatemala"], ["py", "Paraguay"],
  ["ar", "Argentina"], ["ve", "Venezuela"], ["es", "España"],
];

export default function DropiConnect() {
  const [s, setS] = useState<DropiSettings | null>(null);
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; detail: string; baseUrl?: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setS(d.settings?.dropi ?? null));
  }, []);

  async function save(patch: Partial<DropiSettings>) {
    setBusy(true);
    const r = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropi: { ...patch, ...(token ? { token } : {}) } }),
    });
    const d = await r.json();
    setS(d.settings?.dropi ?? null);
    setToken("");
    setBusy(false);
  }

  async function test() {
    setBusy(true); setRes(null);
    if (token) await save({});
    const r = await fetch("/api/dropi/test", { method: "POST" });
    setRes(await r.json());
    setBusy(false);
  }

  if (!s) return <div className="hint">Cargando integraciones…</div>;

  return (
    <div className="card2" style={{ marginTop: 10 }}>
      <div className="row">
        <span style={{ fontSize: 20 }}>📦</span>
        <div>
          <h3 style={{ margin: 0 }}>Dropi</h3>
          <div className="hint" style={{ margin: 0 }}>
            Dropshipping contraentrega en LATAM · catálogo, ciudades y creación de órdenes
          </div>
        </div>
        <div className="sp" />
        <span className={`chip ${s.hasToken ? (s.enabled ? "ok" : "warn") : ""}`}>
          {s.hasToken ? (s.enabled ? `Activo · ${s.env}` : "Token guardado · inactivo") : "Sin conectar"}
        </span>
        <button className="btn sm" onClick={() => setOpen(!open)}>{open ? "Cerrar" : "Configurar"}</button>
      </div>

      {open && (
        <div className="col" style={{ marginTop: 10 }}>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px" }}>
              <label className="lbl">Token de integración</label>
              <input
                className="inp"
                type="password"
                placeholder={s.hasToken ? s.token : "Pega aquí tu token de Dropi"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div style={{ flex: "0 0 150px" }}>
              <label className="lbl">Autenticación</label>
              <select className="sel" value={s.authScheme} onChange={(e) => save({ authScheme: e.target.value as any })}>
                <option value="bearer">Authorization: Bearer</option>
                <option value="integration-key">dropi-integracion-key</option>
              </select>
            </div>
            <div style={{ flex: "0 0 120px" }}>
              <label className="lbl">Entorno</label>
              <select className="sel" value={s.env} onChange={(e) => save({ env: e.target.value as any })}>
                <option value="test">Pruebas</option>
                <option value="prod">Producción</option>
              </select>
            </div>
            <div style={{ flex: "0 0 130px" }}>
              <label className="lbl">País</label>
              <select className="sel" value={s.country} onChange={(e) => save({ country: e.target.value })}>
                {COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="lbl">URL base personalizada (opcional)</label>
            <input
              className="inp"
              placeholder="https://api.dropi.co/api"
              defaultValue={s.baseUrlOverride}
              onBlur={(e) => e.target.value !== s.baseUrlOverride && save({ baseUrlOverride: e.target.value })}
            />
            <div className="hint">
              Úsala si tu cuenta está en un subdominio distinto. En blanco usa{" "}
              <code>{s.env === "test" ? "https://test-api.dropi.co/api" : `https://api.dropi.${s.country}/api`}</code>.
            </div>
          </div>

          <div className="row">
            <label className="row" style={{ gap: 7, cursor: "pointer" }}>
              <input className="sw" type="checkbox" checked={s.enabled} onChange={(e) => save({ enabled: e.target.checked })} />
              <span style={{ fontSize: 13 }}>Usar Dropi para ciudades y órdenes</span>
            </label>
            <div className="sp" />
            <button className="btn" onClick={() => save({})} disabled={busy || !token}>Guardar token</button>
            <button className="btn pri" onClick={test} disabled={busy}>{busy ? "Probando…" : "Probar conexión"}</button>
          </div>

          {res && (
            <div className={`chip ${res.ok ? "ok" : "err"}`} style={{ display: "block", padding: "8px 11px", lineHeight: 1.45 }}>
              {res.ok ? "✓ " : "✕ "}{res.detail}
            </div>
          )}

          <details className="sect">
            <summary>¿Cómo obtengo el token?</summary>
            <div className="sect__b hint" style={{ fontSize: 12.2 }}>
              1. Entra a <b>app.dropi.co</b> con tu cuenta.<br />
              2. Menú <b>Integraciones</b> (o Configuración → Tiendas) → botón <b>+ Agregar</b>.<br />
              3. Ponle un nombre (ej. «Landing Forge») y elige el tipo de integración.<br />
              4. Guarda y copia el <b>token</b> que se genera.<br />
              5. Pégalo arriba, elige entorno <b>Pruebas</b> primero y presiona <b>Probar conexión</b>.<br />
              <br />
              Si «Bearer» devuelve 401, cambia el esquema a <b>dropi-integracion-key</b>: Dropi usa uno u
              otro según cómo se haya creado la credencial.
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
