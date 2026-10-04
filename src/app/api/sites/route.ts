import { NextResponse } from "next/server";
import { listSites, saveSite } from "@/lib/db";
import { PageSpecSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET() {
  const sites = await listSites();
  return NextResponse.json({
    sites: sites.map((s) => ({
      id: s.id, name: s.name, slug: s.slug, vertical: s.vertical,
      preset: s.theme.preset, blocks: s.blocks.length, updatedAt: s.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = PageSpecSchema.safeParse(body.spec);
  if (!parsed.success) return NextResponse.json({ error: "PageSpec inválido", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  const saved = await saveSite(parsed.data);
  return NextResponse.json({ spec: saved });
}
