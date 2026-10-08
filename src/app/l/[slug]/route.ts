import { getSiteBySlug, getSettings } from "@/lib/db";
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
  // 08-10: píxel global del negocio. Las landings generadas antes de configurar
  // el píxel traen settings.pixels vacío y Meta no recibía ni un PageView
  // (el anuncio corría a ciegas). Si la landing no tiene píxel propio, se usa
  // el global de Configuración — sin regenerar nada.
  let siteParaRender = site;
  try {
    const g = await getSettings();
    const gp = (g as any)?.pixels || {};
    const sp = (site as any)?.settings?.pixels || {};
    if (!sp.metaPixelId && gp.metaPixelId) {
      siteParaRender = { ...site, settings: { ...(site as any).settings, pixels: { ...sp, metaPixelId: gp.metaPixelId } } } as any;
    }
  } catch { /* sin píxel global: se sirve igual */ }
  const html = renderPage(siteParaRender, { mode: "export", endpoint });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}