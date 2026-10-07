import { NextResponse } from "next/server";
import { cookieDeSesion } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookieDeSesion("", 0));
  return res;
}
