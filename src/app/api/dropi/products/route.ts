import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db";
import { createDropi } from "@/lib/providers/dropi";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const settings = await getSettings();
  if (!settings.dropi.token) return NextResponse.json({ products: [], error: "Dropi no está configurado." });
  const dropi = createDropi(settings);
  const products = await dropi.listProducts({
    keywords: url.searchParams.get("q") || "",
    pageSize: Number(url.searchParams.get("limit") || 24),
    start: Number(url.searchParams.get("start") || 0),
  });
  return NextResponse.json({ products });
}
