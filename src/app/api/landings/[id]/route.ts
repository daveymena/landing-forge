import { NextResponse } from "next/server";
import { getSite } from "@/lib/db";

/* Compat con el bot: GET /api/landings/:id - detalle de una landing.
   Devuelve { landing, product, sections } con datos del site. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const price = Number(site.product?.price) || 0;
  return NextResponse.json({
    landing: {
      id: site.id,
      slug: site.slug,
      status: "published",
      title: site.name,
      productId: site.id,
      meta: { whatsapp: site.settings?.whatsapp },
      createdAt: site.updatedAt,
    },
    product: {
      id: site.id,
      name: site.product?.name || site.name,
      priceCents: Math.round(price * (String(site.product?.currency).toUpperCase() === "COP" ? 100 : 100)),
      currency: site.product?.currency || "COP",
      checkoutUrl: (site.settings as any)?.checkoutUrl || site.settings?.checkout?.url || "",
      kind: site.vertical === "cod" ? "physical" : "digital",
    },
    sections: site.blocks
      .filter((b: any) => b.visible !== false)
      .map((b: any, i: number) => ({
        id: b.id || `b${i}`,
        landingId: site.id,
        sort: i,
        sectionType: b.type,
        layout: b.variant || "default",
        status: "done",
        hidden: b.visible === false,
      })),
    _spec: site,
  });
}