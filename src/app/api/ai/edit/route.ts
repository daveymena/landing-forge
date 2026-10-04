import { NextResponse } from "next/server";
import { editSpec } from "@/lib/ai/generate";
import { PageSpecSchema } from "@/lib/schema";
import { saveSite } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = PageSpecSchema.safeParse(body.spec);
  if (!parsed.success) return NextResponse.json({ error: "PageSpec inválido" }, { status: 400 });
  const instruction = String(body.instruction || "").trim();
  if (!instruction) return NextResponse.json({ error: "Falta la instrucción" }, { status: 400 });

  const res = await editSpec(parsed.data, instruction);
  if (body.save !== false && res.ops.length) await saveSite(res.spec);
  return NextResponse.json(res);
}
