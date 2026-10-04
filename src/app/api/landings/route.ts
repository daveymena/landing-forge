import { NextResponse } from "next/server";
import { listSites } from "@/lib/db";

/* Compat con el bot: GET /api/landings - listar landings existentes.
   Mapea sites de landing-forge al shape { landings: [{ landing,
   productName }] } que consume landingforge-client. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sites = await listSites();
  return NextResponse.json({
    landings: sites.map((s: any) => ({
      landing: {
        id: s.id,
        slug: s.slug,
        status: "published",
        title: s.name,
        productId: s.id,
      },
      productName: s.name,
    })),
    total: sites.length,
  });
}