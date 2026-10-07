"use client";

import { useMemo, useState } from "react";
import { CATALOG, GROUPS } from "@/lib/blocks/catalog";
import { useEditor } from "@/lib/store";

export default function BlockLibrary({ at, onClose }: { at?: number; onClose: () => void }) {
  const addBlock = useEditor((s) => s.addBlock);
  const vertical = useEditor((s) => s.spec.vertical);
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    return GROUPS.map((g) => ({
      name: g,
      items: CATALOG.filter(
        (b) =>
          b.group === g &&
          (!term || b.label.toLowerCase().includes(term) || b.type.toLowerCase().includes(term)),
      ),
    })).filter((g) => g.items.length);
  }, [q]);

  return (
    <div className="lib" onClick={onClose}>
      <div className="lib__p" onClick={(e) => e.stopPropagation()}>
        <div className="lib__h">
          <b style={{ fontSize: 14.5 }}>Agregar sección</b>
          <input
            className="inp"
            style={{ maxWidth: 240 }}
            autoFocus
            placeholder="Buscar: precio, reseñas, preguntas…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="sp" />
          <button className="btn sm" onClick={onClose}>Cerrar</button>
        </div>
        <div className="lib__b">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="grp">{g.name}</div>
              <div className="lib__g">
                {g.items.map((b) => {
                  const recommended = !b.verticals || b.verticals.includes(vertical);
                  return (
                    <button
                      key={b.type}
                      className="lib__c"
                      style={recommended ? undefined : { opacity: 0.55 }}
                      onClick={() => { addBlock(b.type, at); onClose(); }}
                    >
                      <span style={{ fontSize: 17 }}>{b.icon}</span>
                      <b>{b.label}</b>
                      <span>{b.variants.map((v) => v.label).join(" · ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
