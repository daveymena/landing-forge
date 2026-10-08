import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { TIPOS, carpetaMedia } from "@/lib/media-store";

/* Subir fotos y videos desde el editor (08-10).
 * El dueño: "trato de poner un video y no aparece; el editor debería tener
 * opción para subir desde la aplicación". Antes solo se podía pegar una URL.
 * Se guarda en data/media (volumen persistente en EasyPanel) y se sirve
 * público por /api/media/<archivo>, para que la landing publicada lo cargue.
 * Protegido por la sesión (src/proxy.ts): solo el dueño sube. */

export const runtime = "nodejs";

const MAX_IMAGEN = 10 * 1024 * 1024;
const MAX_VIDEO = 90 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "No llegó ningún archivo (¿pesa más de 90 MB?)." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });

  const ext = TIPOS[file.type]?.ext;
  if (!ext) {
    return NextResponse.json({ error: `Formato no soportado (${file.type || "desconocido"}). Usa JPG, PNG, WEBP, GIF, MP4, WEBM o MOV.` }, { status: 415 });
  }
  const esVideo = file.type.startsWith("video/");
  if (file.size > (esVideo ? MAX_VIDEO : MAX_IMAGEN)) {
    return NextResponse.json({ error: esVideo ? "El video pesa más de 90 MB. Recórtalo o súbelo a YouTube y pega el enlace." : "La imagen pesa más de 10 MB." }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // El nombre sale del contenido: subir dos veces el mismo archivo no duplica.
  const id = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const nombre = `${id}.${ext}`;
  const dir = carpetaMedia();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, nombre), buf);

  // URL absoluta: la landing exportada o vista desde otro dominio la encuentra igual.
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const url = host ? `${proto}://${host}/api/media/${nombre}` : `/api/media/${nombre}`;
  return NextResponse.json({ url, tipo: esVideo ? "video" : "imagen", bytes: file.size });
}
