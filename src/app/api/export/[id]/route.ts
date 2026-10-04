import { getSite } from "@/lib/db";
import { renderPage } from "@/lib/render";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const site = await getSite(id);
  if (!site) return new Response("No existe", { status: 404 });

  const endpoint = process.env.PUBLIC_APP_URL || url.origin;
  const html = renderPage(site, { mode: "export", endpoint });
  const download = url.searchParams.get("download") !== "0";

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(download ? { "Content-Disposition": `attachment; filename="${site.slug || "landing"}.html"` } : {}),
    },
  });
}
