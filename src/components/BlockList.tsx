"use client";

import { useState } from "react";
import { useEditor } from "@/lib/store";
import { BY_TYPE } from "@/lib/blocks/catalog";

export default function BlockList({ onAdd }: { onAdd: (index?: number) => void }) {
  const spec = useEditor((s) => s.spec);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const toggleVisible = useEditor((s) => s.toggleVisible);
  const removeBlock = useEditor((s) => s.removeBlock);
  const duplicateBlock = useEditor((s) => s.duplicateBlock);
  const moveBlock = useEditor((s) => s.moveBlock);

  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  return (
    <div className="pane left">
      <div className="pane__h">
        Secciones de la página <span className="sp" />
        <span style={{ color: "var(--c-dim)" }}>{spec.blocks?.length ?? 0}</span>
      </div>
      <div className="pane__b">
        {(spec.blocks ?? []).map((b, i) => {
          const def = BY_TYPE[b.type];
          return (
            <div
              key={b.id}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => { e.preventDefault(); setOver(i); }}
              onDragEnd={() => { setDrag(null); setOver(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag !== null && drag !== i) moveBlock(drag, i);
                setDrag(null); setOver(null);
              }}
              className={`blk${selectedId === b.id ? " sel" : ""}${b.visible === false ? " off" : ""}${drag === i ? " drag" : ""}${over === i && drag !== null && drag !== i ? " over" : ""}`}
              onClick={() => select(b.id)}
              title={def?.label ?? b.type}
            >
              <span className="blk__i">{def?.icon ?? "▪"}</span>
              <span className="blk__n">{def?.label ?? b.type}</span>
              <span className="blk__a">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleVisible(b.id); }}
                  title={b.visible === false ? "Mostrar" : "Ocultar"}
                >
                  {b.visible === false ? "◌" : "◉"}
                </button>
                <button onClick={(e) => { e.stopPropagation(); duplicateBlock(b.id); }} title="Duplicar">⧉</button>
                <button onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }} title="Eliminar">✕</button>
              </span>
            </div>
          );
        })}
      </div>
      <div className="pane__f">
        <button className="btn" style={{ width: "100%" }} onClick={() => onAdd()}>
          + Agregar sección
        </button>
      </div>
    </div>
  );
}
