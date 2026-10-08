"use client";

import { useRef, useState } from "react";

/* Subir una foto o un video desde el celular o la compu (08-10). Antes el
 * editor solo aceptaba pegar una URL, y el dueño no tenía dónde alojar el
 * video del producto. Sube a /api/media y devuelve la URL pública. */
export default function UploadButton({
  accept,
  label,
  onUploaded,
}: {
  accept: "image" | "video" | "both";
  label?: string;
  onUploaded: (url: string, tipo: "imagen" | "video") => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState("");
  const [err, setErr] = useState("");
  const mime =
    accept === "image" ? "image/jpeg,image/png,image/webp,image/gif"
    : accept === "video" ? "video/mp4,video/webm,video/quicktime"
    : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

  const subir = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr("");
    for (const file of Array.from(files)) {
      setEstado(`Subiendo ${file.name} (${(file.size / 1048576).toFixed(1)} MB)…`);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/media", { method: "POST", body: fd });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || `No se pudo subir (${r.status})`);
        onUploaded(d.url, d.tipo);
      } catch (e: any) {
        setErr(String(e?.message || e).slice(0, 180));
        break;
      }
    }
    setEstado("");
    if (ref.current) ref.current.value = "";
  };

  return (
    <div style={{ marginTop: 6 }}>
      <input ref={ref} type="file" accept={mime} multiple={accept !== "video"} hidden onChange={(e) => subir(e.target.files)} />
      <button type="button" className="btn sm" disabled={!!estado} onClick={() => ref.current?.click()}>
        {estado ? "Subiendo…" : label || (accept === "video" ? "⬆️ Subir video" : accept === "image" ? "⬆️ Subir foto" : "⬆️ Subir archivo")}
      </button>
      {estado && <div className="hint">{estado}</div>}
      {err && <div className="hint" style={{ color: "#b42318" }}>{err}</div>}
    </div>
  );
}
