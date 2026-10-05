import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/* Imágenes generadas (OpenAI) guardadas en data/img — se sirven públicas
 * para que las landings exportadas las carguen igual que cualquier CDN. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{16}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(process.cwd(), "data", "img", `${id}.png`));
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
