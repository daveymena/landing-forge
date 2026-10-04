"use client";

import { useState } from "react";
import { useEditor } from "@/lib/store";
import { localEdit } from "@/lib/ai/localEdit";

const SUGGESTIONS = [
  "Hazlo más agresivo y urgente",
  "Cambia el color de acento a verde",
  "Agrega una sección de preguntas frecuentes",
  "Reescribe el hero para mamás de 30 a 45 años",
  "Quita el contador",
  "Haz el copy más corto y directo",
];

export default function AiBar({ aiAvailable }: { aiAvailable: boolean }) {
  const spec = useEditor((s) => s.spec);
  const commit = useEditor((s) => s.commit);
  const busy = useEditor((s) => s.busy);
  const setBusy = useEditor((s) => s.setBusy);
  const setToast = useEditor((s) => s.setToast);
  const [text, setText] = useState("");
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
    <div className="aibar">
      {log.length > 0 && (
        <div className="aibar__log">
          {log.map((m, i) => (
            <div key={i} className={`aibar__m ${m.role}`}>{m.text}</div>
          ))}
        </div>
      )}
      <div className="aibar__in">
        <span style={{ fontSize: 16 }}>{aiAvailable ? "✨" : "⚙️"}</span>
        <input
          className="inp"
          value={text}
          disabled={busy}
          placeholder={
            aiAvailable
              ? "Describe el cambio: «hazlo más urgente», «agrega una comparativa», «cambia el precio a 129900»…"
              : "Modo sin IA: «cambia el color a verde», «quita el contador», «agrega testimonios», «precio 129900»"
          }
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run(text); }}
        />
        <button className="btn pri" disabled={busy || !text.trim()} onClick={() => run(text)}>
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
