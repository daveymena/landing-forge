import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db";

export const runtime = "nodejs";

/* POST /api/ai/image {prompt, size?, model?, quality?} -> {image (dataURL|url), model, quality, ms}
   Usa OpenAI Images API (gpt-image-1 por defecto). quality: low ($0.011, pruebas) |
   medium ($0.042, final) | high ($0.167, premium). Requiere OPENAI_API_KEY
   en ajustes (panel Motor IA -> OpenAI) o en .env */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim();
  if (prompt.length < 4) {
    return NextResponse.json({ error: "prompt muy corto" }, { status: 400 });
  }
  const size = String(body.size || "1024x1024");
  const allowed = ["1024x1024", "1536x1024", "1024x1536", "512x512"];
  const finalSize = allowed.includes(size) ? size : "1024x1024";
  const quality = ["low", "medium", "high"].includes(String(body.quality)) ? String(body.quality) : "medium";

  const settings = await getSettings().catch(() => null);
  const apiKey =
    (settings?.ai?.provider === "openai" && settings?.ai?.apiKey) ||
    process.env.OPENAI_API_KEY ||
    "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta OPENAI_API_KEY: configúrala en el panel Motor IA (OpenAI) o en .env" },
      { status: 400 },
    );
  }
  const model = String(body.model || "gpt-image-1");
  const t = Date.now();
  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt, size: finalSize, quality }),
    });
    const txt = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        { error: `OpenAI images ${r.status}: ${txt.slice(0, 400)}` },
        { status: 502 },
      );
    }
    const data = JSON.parse(txt);
    const item = data?.data?.[0];
    const b64: string | undefined = item?.b64_json;
    const url: string | undefined = item?.url;
    if (b64) {
      return NextResponse.json({
        image: `data:image/png;base64,${b64}`,
        model,
        quality,
        ms: Date.now() - t,
      });
    }
    if (url) {
      return NextResponse.json({ image: url, model, quality, ms: Date.now() - t });
    }
    return NextResponse.json({ error: "OpenAI no devolvió imagen" }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Fallo imágenes: ${String(e?.message || e).slice(0, 300)}` },
      { status: 502 },
    );
  }
}
