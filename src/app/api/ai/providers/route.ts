import { NextResponse } from "next/server";
import { PROVIDERS, PROVIDER_BY_ID, listModels, pingProvider, resolveProvider, type ResolvedProvider } from "@/lib/ai/provider";
import { getSettings } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Catálogo de proveedores + cuáles tienen credenciales en el entorno + el activo. */
export async function GET() {
  const active = await resolveProvider();
  const providers = PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    kind: p.kind,
    defaultBaseUrl: p.defaultBaseUrl,
    defaultModel: p.defaultModel,
    needsKey: p.needsKey,
    keyUrl: p.keyUrl || "",
    help: p.help,
    suggested: p.suggested,
    envKeys: p.envKeys,
    envReady: p.envKeys.some((k) => !!process.env[k]),
  }));
  return NextResponse.json({
    providers,
    active: { id: active.id, model: active.model, baseUrl: active.baseUrl, source: active.source },
  });
}

/** Construye una config "candidata" mezclando lo que manda el panel con lo guardado. */
async function candidate(body: any): Promise<ResolvedProvider> {
  const saved = (await getSettings()).ai;
  const id = (body.provider && body.provider !== "auto" ? body.provider : saved.provider) as ResolvedProvider["id"];
  if (!id || id === "none" || !PROVIDER_BY_ID[id]) return resolveProvider();
  const meta = PROVIDER_BY_ID[id];

  // la key enmascarada del panel (abcd••••wxyz) significa "usa la que ya está guardada"
  const incoming = typeof body.apiKey === "string" && body.apiKey && !body.apiKey.includes("••") ? body.apiKey.trim() : "";
  const envKey = meta.envKeys.filter((k) => k.includes("KEY")).map((k) => process.env[k]).find(Boolean) || "";
  const apiKey = incoming || (body.provider === saved.provider ? saved.apiKey : "") || envKey;

  return {
    id: meta.id,
    model: String(body.model || saved.model || meta.defaultModel),
    baseUrl: String(body.baseUrl || meta.defaultBaseUrl).replace(/\/+$/, ""),
    apiKey,
    fallbacks: Array.isArray(body.fallbacks) ? body.fallbacks.filter(Boolean) : [],
    temperature: typeof body.temperature === "number" ? body.temperature : 0.7,
    source: "settings",
  };
}

/** POST {action:"test"|"models", provider, model, baseUrl, apiKey} */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const cfg = await candidate(body);

  if (cfg.id === "none") {
    return NextResponse.json({ ok: false, detail: "No hay proveedor configurado." }, { status: 400 });
  }
  const meta = PROVIDER_BY_ID[cfg.id];
  // Para listar modelos no siempre hace falta key (OpenRouter y OpenCode Zen
  // publican su catálogo abierto), así el usuario ve qué hay gratis antes de registrarse.
  const PUBLIC_CATALOG = new Set(["openrouter", "opencode", "ollama-cloud", "github-models"]);
  const needsKeyNow = meta.needsKey && !(body.action === "models" && PUBLIC_CATALOG.has(cfg.id));
  if (needsKeyNow && !cfg.apiKey) {
    return NextResponse.json({ ok: false, detail: `${meta.label} necesita una API key.` }, { status: 400 });
  }

  if (body.action === "models") {
    try {
      const models = await listModels(cfg);
      return NextResponse.json({ ok: true, models, count: models.length });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, detail: String(e.message || e).slice(0, 400), models: meta.suggested },
        { status: 200 },
      );
    }
  }

  const r = await pingProvider(cfg);
  return NextResponse.json({ ...r, provider: cfg.id, model: cfg.model, baseUrl: cfg.baseUrl });
}
