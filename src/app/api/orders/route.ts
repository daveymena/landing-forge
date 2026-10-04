import { NextResponse } from "next/server";
import { listOrders } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const siteId = url.searchParams.get("site") || undefined;
  return NextResponse.json({ orders: (await listOrders(siteId)).slice(0, 200) });
}
