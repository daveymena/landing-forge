import { NextResponse } from "next/server";
import { TEMPLATES } from "@/lib/templates";
import { PRESETS } from "@/lib/theme";

export const runtime = "nodejs";

/** Catálogo para el picker del dashboard: plantillas + presets. */
export async function GET() {
  return NextResponse.json({
    templates: TEMPLATES.map((t) => ({
      id: t.id, name: t.name, vertical: t.vertical, hint: t.hint, preset: t.preset,
    })),
    presets: PRESETS.map((p) => ({ id: p.id, name: p.name, hint: p.hint })),
  });
}
