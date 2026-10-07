"use client";

import { useState } from "react";
import { useEditor } from "@/lib/store";
import { localEdit } from "@/lib/ai/localEdit";

const SUGGESTIONS = [
  "Haz los textos más cortos y directos",
  "Agrega preguntas frecuentes",
  "Refuerza el pago contra entrega",
  "Cambia el color principal a verde",
  "Quita el contador",
];

export default function AiBar({ aiAvailable }: { aiAvailable: boolean }) {
  const spec = useEditor((s) => s.spec);
  const commit = useEditor((s) => s.commit);
  const busy = useEditor((s) => s.busy);
  const setBusy = useEditor((s) => s.setBusy);
  const setToast = useEditor((s) => s.setToast);
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  type Msg = { role: "user" | "ai"; text: string };
  const [log, setLog] = useState<Msg[]>([]);

  async function run(instruction: string) {
    const ins = instruction.trim();
    if (!ins || busy) return;
    setLog((l) => [...l, { role: "user", text: ins } as Msg].slice(-8));
    setText("");
    setBusy(true);
    try {
      if (!aiAvailable) {
        const res = localEdit(spec, ins);
        if (res.ops.length) commit(res.spec);
        setLog((l) => [...l, { role: "ai", text: res.reply } as Msg].slice(-8));
      } else {
        const r = await fetch("/api/ai/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec, instruction: ins, save: false }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Error de la IA");
        if (d.ops?.length) commit(d.spec);
        setLog((l) => [...l, { role: "ai", text: d.reply || "Listo." } as Msg].slice(-8));
      }
    } catch (e: any) {
      setToast({ msg: String(e.message || e), kind: "err" });
      setLog((l) => [...l, { role: "ai", text: `No pude aplicarlo: ${String(e.message || e)}` } as Msg].slice(-8));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`aibar${focus ? " open" : ""}`}>
      {log.length > 0 && (
        <div className="aibar__log">
          {log.map((m, i) => (
            <div key={i} className={`aibar__m ${m.role}`}>{m.text}</div>
          ))}
        </div>
      )}
      <div className="aibar__in">
        <span style={{ fontSize: 15, color: "var(--c-acc)" }}>✦</span>
        <input
          value={text}
          disabled={busy}
          placeholder={aiAvailable ? "Pídele un cambio a la IA: «cambia el precio a 129.900»" : "Pide un cambio: «color verde», «quita el contador», «precio 129900»"}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run(text); }}
        />
        <button className="btn pri sm" disabled={busy || !text.trim()} onClick={() => run(text)}>
          {busy ? "Aplicando…" : "Aplicar"}
        </button>
      </div>
      <div className="sugg">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => run(s)} disabled={busy}>{s}</button>
        ))}
      </div>
    </div>
  );
}
