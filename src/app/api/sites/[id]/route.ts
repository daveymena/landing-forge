import { NextResponse } from "next/server";
import { deleteSite, getSite, saveSite } from "@/lib/db";
import { PageSpecSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ spec: site });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = PageSpecSchema.safeParse({ ...body.spec, id });
  if (!parsed.success) return NextResponse.json({ error: "PageSpec inválido", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  const saved = await saveSite(parsed.data);
  return NextResponse.json({ spec: saved });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteSite(id);
  return NextResponse.json({ ok: true });
}
