import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db";
import { createDropi, dropiBaseUrl } from "@/lib/providers/dropi";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const settings = await getSettings();
  const dropi = createDropi(settings);
  const res = await dropi.testConnection();
  return NextResponse.json({ ...res, baseUrl: dropiBaseUrl(settings.dropi), authScheme: settings.dropi.authScheme });
}
