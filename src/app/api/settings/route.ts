import { NextResponse } from "next/server";
import { getSettings, redactSettings, saveSettings } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ settings: redactSettings(s) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const patch: any = {};
  if (body.dropi) {
    patch.dropi = {};
    const d = body.dropi;
    if (typeof d.enabled === "boolean") patch.dropi.enabled = d.enabled;
    if (d.env === "test" || d.env === "prod") patch.dropi.env = d.env;
    if (typeof d.token === "string" && d.token && !d.token.includes("••")) patch.dropi.token = d.token.trim();
    if (d.clearToken === true) patch.dropi.token = "";
    if (d.authScheme === "bearer" || d.authScheme === "integration-key") patch.dropi.authScheme = d.authScheme;
    if (typeof d.country === "string") patch.dropi.country = d.country.toLowerCase().slice(0, 2);
    if (typeof d.baseUrlOverride === "string") patch.dropi.baseUrlOverride = d.baseUrlOverride.trim();
  }
  if (body.ai) {
    const a = body.ai;
    patch.ai = {};
    const VALID = ["auto", "openai", "anthropic", "gemini", "groq", "ollama", "ollama-cloud", "github-models", "openrouter", "opencode", "custom"];
    if (typeof a.provider === "string" && VALID.includes(a.provider)) patch.ai.provider = a.provider;
    if (typeof a.model === "string") patch.ai.model = a.model.trim();
    if (typeof a.baseUrl === "string") patch.ai.baseUrl = a.baseUrl.trim().replace(/\/+$/, "");
    if (typeof a.apiKey === "string" && a.apiKey && !a.apiKey.includes("••")) patch.ai.apiKey = a.apiKey.trim();
    // Antes: `apiKey === ""` BORRABA la clave guardada, y el formulario manda
    // vacio cada vez que se cambia de proveedor o no se reescribe la clave.
    // Borrar ahora es una accion explicita.
    if (a.clearApiKey === true) patch.ai.apiKey = "";
    if (Array.isArray(a.fallbacks)) patch.ai.fallbacks = a.fallbacks.filter((x: any) => typeof x === "string" && x).slice(0, 5);
    if (typeof a.temperature === "number") patch.ai.temperature = Math.min(1.5, Math.max(0, a.temperature));
  }

  const saved = await saveSettings(patch);
  return NextResponse.json({ settings: redactSettings(saved) });
}
