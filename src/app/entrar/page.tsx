"use client";

import { useState } from "react";

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const next = (() => {
    const n = params?.get("next") || "/";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/";
  })();
  const enlaceVencido = params?.get("error") === "enlace";

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.error || "No se pudo entrar");
      window.location.href = next;
    } catch (e: any) {
      setErr(String(e.message || e));
      setBusy(false);
    }
  }

  return (
    <div className="dash" style={{ display: "grid", placeItems: "center", padding: 20 }}>
      <form onSubmit={entrar} className="card2" style={{ width: "min(380px, 100%)", padding: 26, gap: 14 }}>
        <div className="brand"><span className="mark">LF</span> Landing Forge</div>
        <p className="hint" style={{ fontSize: 13.5, margin: 0 }}>
          {enlaceVencido
            ? "El enlace de entrada venció. Ábrelo de nuevo desde Landing Studio en VentasPro o entra con tu clave."
            : "Entra desde Landing Studio en VentasPro, o con tu correo y contraseña."}
        </p>
        <div>
          <label className="lbl" htmlFor="email">Correo</label>
          <input id="email" className="inp" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="lbl" htmlFor="pass">Contraseña</label>
          <input
            id="pass"
            className="inp"
            type="password"
            autoComplete="current-password"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && <div className="chip err" style={{ whiteSpace: "normal" }}>{err}</div>}
        <button className="btn pri" type="submit" disabled={busy || !password}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}
