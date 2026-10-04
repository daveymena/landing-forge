import { NextResponse } from "next/server";
import { extractFromUrl } from "@/lib/extract";
import { saveSite } from "@/lib/db";
import { generateSpec } from "@/lib/ai/generate";

/* Compat con el bot: POST /api/landingforge/generate
   Recibe { productUrl?, productName?, productKind?, price?, currency?, checkoutUrl?, whatsapp? }
   Nuevo flujo: extract URL → generateSpec (IA) → saveSite.
   Devuelve { ok, landingId, url, slug, productName, sectionsGenerated }. */
export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const url = String(body.productUrl || body.url || "").trim();
  const name = String(body.productName || body.title || "").trim();
  const kind = body.productKind === "digital" ? "digital" : "physical";
  const whatsapp = String(body.whatsapp || process.env.WHATSAPP_NUMBER || "573136174267").trim();

  let source: any = undefined;
  const warnings: string[] = [];

  if (url) {
    try {
      const ex = await extractFromUrl(url);
      source = ex.product;
      warnings.push(...ex.warnings);
    } catch (e: any) {
      if (!name) {
        return NextResponse.json({ ok: false, error: `No pude leer esa URL: ${e?.message || e}` }, { status: 422 });
      }
      warnings.push(`No pude leer la URL (${e?.message || e}), usé los datos dados.`);
    }
  }

  if (!source && !name) {
    return NextResponse.json({ ok: false, error: "productName o productUrl requerido" }, { status: 400 });
  }

  const productName = source?.name || name;
  const price = source?.price || body.price || body.precio || "";
  const currency = source?.currency || body.currency || "COP";
  const checkout = body.checkoutUrl || source?.checkoutUrl || url || "";

  const parts = [
    String(body.prompt || "").trim() ||
      [
        `Landing para vender ${productName}`,
        price ? `a ${price} ${currency}` : "",
        kind === "digital" ? "producto digital" : "con pago contra entrega en Colombia",
        source?.description ? `. ${String(source.description).slice(0, 400)}` : "",
        checkout ? `. El botón de compra lleva a ${checkout}` : "",
        whatsapp ? `. WhatsApp de contacto ${whatsapp}` : "",
      ]
        .filter(Boolean)
        .join(" "),
  ];
  const prompt = parts.join(" ");

  const vertical = kind === "digital" ? "digital" : "cod";
  const templateId =
    typeof body.templateId === "string" && body.templateId
      ? body.templateId
      : vertical === "digital"
        ? "digital-vsl"
        : "cod-urgency";

  const res = await generateSpec(prompt, { source, templateId });
  const spec = res.spec;

  spec.settings.whatsapp = whatsapp || spec.settings.whatsapp || "";
  (spec.settings as any).checkoutUrl = checkout;
  await saveSite(spec);

  const base = process.env.PUBLIC_APP_URL || new URL(req.url).origin;

  return NextResponse.json({
    ok: true,
    landingId: spec.id,
    url: `${base}/l/${spec.slug}`,
    exportUrl: `${base}/api/export/${spec.id}`,
    editorUrl: `${base}/editor/${spec.id}`,
    slug: spec.slug,
    productName,
    sectionsGenerated: spec.blocks.length,
    engine: res.engine,
    warnings,
  });
}