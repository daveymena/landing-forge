import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { CONTENT_TYPE, NOMBRE_VALIDO, carpetaMedia } from "@/lib/media-store";

/* Archivos subidos desde el editor, públicos para las landings.
 * Con soporte de Range: Safari en iPhone NO reproduce un <video> si el
 * servidor no responde 206 a pedidos por rangos. */

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!NOMBRE_VALIDO.test(file)) return new NextResponse("Not found", { status: 404 });
  const ruta = path.join(carpetaMedia(), file);
  let size: number;
  try {
    size = (await fsp.stat(ruta)).size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const tipo = CONTENT_TYPE[file.split(".").pop() || ""] || "application/octet-stream";
  const base = { "Content-Type": tipo, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable" };

  const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") || "");
  if (rango) {
    let ini = rango[1] ? Number(rango[1]) : NaN;
    let fin = rango[2] ? Number(rango[2]) : size - 1;
    if (Number.isNaN(ini)) { ini = Math.max(0, size - fin); fin = size - 1; } // bytes=-N
    fin = Math.min(fin, size - 1);
    if (ini > fin || ini >= size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(fs.createReadStream(ruta, { start: ini, end: fin })) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${ini}-${fin}/${size}`, "Content-Length": String(fin - ini + 1) },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(ruta)) as ReadableStream;
  return new NextResponse(stream, { headers: { ...base, "Content-Length": String(size) } });
}
