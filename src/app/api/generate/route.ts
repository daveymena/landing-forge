import { NextResponse } from "next/server";
import { generateSpec } from "@/lib/ai/generate";
import { saveSite, getSite } from "@/lib/db";
import { resolveProvider, PROVIDER_BY_ID } from "@/lib/ai/provider";
import { adaptarANuestro } from "@/lib/ai/adaptar";
import { extractFromUrl, type ExtractedProduct } from "@/lib/extract";
import { parseBrief } from "@/lib/ai/brief";
import { applyVisualPass } from "@/lib/visual-brain";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const p = await resolveProvider();
  return NextResponse.json({
    aiAvailable: p.id !== "none",
    provider: p.id,
    providerLabel: PROVIDER_BY_ID[p.id]?.label || "",
    model: p.model,
    source: p.source,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  let prompt = String(body.prompt || "").trim();
  const url = String(body.url || "").trim();

  // Se puede generar desde un prompt, desde la URL de una ficha de producto,
  // o desde ambos (la URL aporta los datos duros y el prompt el enfoque).
  let source: ExtractedProduct | undefined = body.source || undefined;
  const warnings: string[] = [];

  if (url && !source) {
    try {
      const ex = await extractFromUrl(url);
      source = ex.product;
      warnings.push(...ex.warnings);
      if (ex.confidence < 0.5) {
        warnings.push("Los datos de esa página son poco fiables: revisa nombre y precio en el editor.");
      }
    } catch (e: any) {
      return NextResponse.json({ error: `No pude leer esa URL: ${e?.message || e}` }, { status: 422 });
    }
  }

  // Ficha de OTRA tienda (lo normal al pegar una URL): referencia, no copia.
  // El nombre y el precio que el dueno dejo en la tarjeta de importacion son
  // los nuestros; marca, resenas y promesas de esa tienda no pasan.
  if (source) source = adaptarANuestro(source, { name: source.name, price: source.price, currency: source.currency }, warnings);

  if (source && prompt.length < 8) {
    // con una URL basta: construimos el brief a partir de lo extraído
    const parts = [
      `Landing para vender ${source.name || "este producto"}`,
      source.price ? `a ${source.price} ${source.currency || ""}`.trim() : "",

      source.description ? `. ${source.description.slice(0, 400)}` : "",
    ].filter(Boolean);
    prompt = parts.join(" ");
  }

  if (prompt.length < 8) {
    return NextResponse.json(
      { error: "Describe tu producto con un poco más de detalle (mínimo 8 caracteres), o pega la URL de su ficha." },
      { status: 400 },
    );
  }

  // Choque típico: la ficha está en USD y el brief habla de Colombia.
  // El LLM acaba mezclando monedas en envíos y garantías, así que lo avisamos.
  if (source?.currency && prompt) {
    const brief = parseBrief(prompt);
    if (brief.currency && brief.currency !== source.currency) {
      warnings.push(
        `La ficha está en ${source.currency} y tu brief apunta a ${brief.currency}: ` +
          `convierte el precio en el editor o alguna cifra suelta quedará en la moneda equivocada.`,
      );
    }
  }

  const res = await generateSpec(prompt, {
    source,
    pro: body.pro === true,
    templateId: typeof body.templateId === "string" ? body.templateId : undefined,
    baseSpec: body.baseSiteId ? (await getSite(String(body.baseSiteId))) || undefined : undefined,
    provider: body.aiProvider && typeof body.aiProvider === "object" ? body.aiProvider : undefined,
  });
  await applyVisualPass(res.spec, body.aiProvider && typeof body.aiProvider === "object" ? body.aiProvider : undefined);
  if (body.save !== false) await saveSite(res.spec);
  return NextResponse.json({
    ...res,
    warnings: [...warnings, ...(res.warnings || [])],
    source: source ? { name: source.name, price: source.price, currency: source.currency, images: source.images.length, host: source.host } : null,
  });
}
