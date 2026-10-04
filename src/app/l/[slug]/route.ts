import { getSiteBySlug } from "@/lib/db";
import { renderPage } from "@/lib/render";

/* Landing pública por slug: la URL que va en el anuncio.
   Compat con el bot: la app vieja publicaba en BASE/l/<slug>. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  if (!site) {
    return new Response("Landing no encontrada", { status: 404 });
  }
  const endpoint = process.env.PUBLIC_APP_URL || new URL(req.url).origin;
  const html = renderPage(site, { mode: "export", endpoint });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}