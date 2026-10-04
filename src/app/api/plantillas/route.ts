import { NextResponse } from "next/server";
import { listSites } from "@/lib/db";

/* Compat con el bot: GET /api/plantillas (familias/skeletons).
   Devuelve las 22 plantillas de la nueva app con shape parecido al del bot:
   { plantillas: [{ id, nombre, para, descripcion, familia }] }.
   `para` según ?productId (cod→physical, digital→digital) o query ?para=. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  let para = url.searchParams.get("para");
  if (!para) {
    const kind = url.searchParams.get("kind");
    para = kind === "digital" ? "digital" : "physical";
  }
  const { TEMPLATES } = await import("@/lib/templates");
  const templates = (TEMPLATES as any[]) || [];
  const familias = templates
    .filter((t) => (t.vertical === "cod" ? para === "physical" : t.vertical === para) || !para)
    .map((t) => ({
      id: t.id,
      nombre: t.name,
      para: t.vertical === "cod" ? "physical" : t.vertical === "digital" ? "digital" : t.vertical,
      familia: t.vertical,
      preset: t.preset,
      descripcion: t.hint || `${t.name} (${t.vertical})`,
      bloques: (t.flow || []).length,
    }));
  return NextResponse.json({ plantillas: familias, sugerida: para === "digital" ? "digital-vsl" : "cod-urgency" });
}