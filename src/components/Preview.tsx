"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/lib/store";
import { renderPage } from "@/lib/render";

export default function Preview() {
  const spec = useEditor((s) => s.spec);
  const device = useEditor((s) => s.device);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const patchBlockProp = useEditor((s) => s.patchBlockProp);

  const ref = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0);

  /* ancho lógico por dispositivo + escalado para que quepa en el lienzo */
  const logicalW = device === "mobile" ? 412 : device === "tablet" ? 834 : 1440;
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const PAD = 24;
  const scale = box.w ? Math.min(1, (box.w - PAD * 2) / logicalW) : 1;

  const html = useMemo(() => {
    if (!spec?.blocks) return "";
    const endpoint = typeof window !== "undefined" ? window.location.origin : "";
    return renderPage(spec, { mode: "edit", endpoint });
  }, [spec]);

  /* mensajes desde el iframe */
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d: any = e.data;
      if (!d?.__lf) return;
      if (d.type === "select") select(d.blockId);
      if (d.type === "scroll") scrollY.current = d.y || 0;
      if (d.type === "patch" && d.blockId && d.path) {
        patchBlockProp(d.blockId, d.path, d.value);
      }
      if (d.type === "ready" && scrollY.current) {
        ref.current?.contentWindow?.postMessage({ __lfCmd: true, cmd: "scrollTo", y: scrollY.current }, "*");
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [select, patchBlockProp]);

  /* resaltar el bloque seleccionado desde el panel */
  useEffect(() => {
    if (!selectedId) return;
    const t = setTimeout(() => {
      ref.current?.contentWindow?.postMessage({ __lfCmd: true, cmd: "select", blockId: selectedId }, "*");
    }, 60);
    return () => clearTimeout(t);
  }, [selectedId, html]);

  return (
    <div className="canvas__stage" ref={stageRef}>
      <div
        className={`frame ${device}`}
        style={{
          width: logicalW,
          height: box.h ? Math.max(320, (box.h - PAD * 2) / scale) : "100%",
          transform: `translateX(-50%) scale(${scale})`,
        }}
      >
        <iframe
          ref={ref}
          title="Vista previa"
          srcDoc={html}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
      {scale < 0.999 && <div className="zoomchip">{Math.round(scale * 100)}%</div>}
    </div>
  );
}
