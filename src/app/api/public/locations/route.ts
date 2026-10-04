import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db";
import { CO_STATES, createDropi } from "@/lib/providers/dropi";

export const runtime = "nodejs";

/** Caché en memoria para no golpear Dropi en cada visita a la landing */
const cache = new Map<string, { at: number; data: any }>();
const TTL = 1000 * 60 * 30;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.data);
  return fn().then((data) => {
    cache.set(key, { at: Date.now(), data });
    return data;
  });
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=1800",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "GET,OPTIONS" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const settings = await getSettings();
  const useDropi = settings.dropi.enabled && !!settings.dropi.token;

  if (!state) {
    const states = await cached("states", async () => {
      if (useDropi) {
        const r = await createDropi(settings).listStates();
        if (r.length) return r;
      }
      return CO_STATES.map((s) => ({ id: s.id, name: s.name }));
    });
    return NextResponse.json({ states, source: useDropi ? "dropi" : "local" }, { headers: CORS });
  }

  const cities = await cached(`cities:${state}`, async () => {
    if (useDropi) {
      const r = await createDropi(settings).listCities(state);
      if (r.length) return r;
    }
    const found =
      CO_STATES.find((s) => String(s.id) === String(state)) ||
      CO_STATES.find((s) => s.name.toUpperCase() === String(state).toUpperCase());
    return (found?.cities ?? []).map((c, i) => ({ id: `${found?.id}-${i}`, name: c }));
  });
  return NextResponse.json({ cities, source: useDropi ? "dropi" : "local" }, { headers: CORS });
}
