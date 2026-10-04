import { NextResponse } from "next/server";
import { getSite } from "@/lib/db";
import { renderPage } from "@/lib/render";

/* Compat con el bot: GET /api/landings/:id/export
   Exporta el HTML standalone de la landing (zip ya no aplica:
   la nueva app renderiza un HTML único autocontenido). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) return new Response("No existe", { status: 404 });

  const endpoint = process.env.PUBLIC_APP_URL || new URL(req.url).origin;
  const html = renderPage(site, { mode: "export", endpoint });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${site.slug || id}.html"`,
    },
  });
}