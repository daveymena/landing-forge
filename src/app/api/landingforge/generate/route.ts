import { NextResponse } from "next/server";
import { extractFromUrl, type ExtractedProduct } from "@/lib/extract";
import { saveSite } from "@/lib/db";
import { generateSpec } from "@/lib/ai/generate";

/* Compat con el bot: POST /api/landingforge/generate
   Recibe { productUrl?, productName?, productKind?, price?, currency?,
   checkoutUrl?, whatsapp?, description?, brand?, images[]?, videos[]?,
   prompt?, templateId?, pro? }
   Flujo: extract URL (si hay) o datos manuales -> generateSpec (IA) -> saveSite.
   Devuelve { ok, landingId, url, slug, productName, sectionsGenerated, sections }. */
export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const asHttp = (u: unknown): string => {
  const s = String(u || "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const url = String(body.productUrl || body.url || "").trim();
  const name = String(body.productName || body.title || "").trim();
  const kind = body.productKind === "digital" ? "digital" : "physical";
  const whatsapp = String(body.whatsapp || process.env.WHATSAPP_NUMBER || "573136174267").trim();

  let source: ExtractedProduct | undefined = undefined;
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
      warnings.push(`No pude leer la URL (${e?.message || e}), use los datos dados.`);
    }
  }

  // Sin ficha extraida (o incompleta): armar fuente manual con lo que mande
  // el bot/dashboard — nombre, precio, descripcion y FOTOS. Sin esto la IA
  // generaba a ciegas: sin datos reales ni imagenes que colocar.
  const manualImages = Array.isArray(body.images) ? body.images.map(asHttp).filter(Boolean).slice(0, 8) : [];
  const manualVideos = Array.isArray(body.videos) ? body.videos.map(asHttp).filter(Boolean).slice(0, 3) : [];
  const manualDesc = String(body.description || "").trim();
  const manualBrand = String(body.brand || "").trim();
  if (!source && (name || manualImages.length || manualDesc)) {
    const priceNum = Number(String(body.price ?? "").replace(/[^\d.-]/g, "")) || 0;
    source = {
      name: name || "Producto",
      description: manualDesc,
      price: priceNum,
      compareAtPrice: 0,
      currency: String(body.currency || "COP").toUpperCase().slice(0, 3),
      images: manualImages,
      videos: manualVideos,
      bullets: [],
      brand: manualBrand,
      sku: "",
      rating: 0,
      ratingCount: 0,
      availability: "",
      sources: { name: "bot", price: "bot", images: manualImages.length ? "bot" : "" },
      url: url,
      host: "catalogo",
    };
    // Completar con lo extraido si la URL aporto algo (fotos, precio).
  } else if (source) {
    if (!source.images?.length && manualImages.length) source = { ...source, images: manualImages };
    if (!(source as any).videos?.length && manualVideos.length) (source as any).videos = manualVideos;
    if (!source.description && manualDesc) source = { ...source, description: manualDesc };
    if ((!source.name || source.name === "Producto") && name) source = { ...source, name };
  }

  if (!source && !name) {
    return NextResponse.json({ ok: false, error: "productName o productUrl requerido" }, { status: 400 });
  }

  const productName = source?.name || name;
  const price = source?.price || body.price || body.precio || "";
  const currency = source?.currency || body.currency || "COP";
  const checkout = body.checkoutUrl || (source as any)?.checkoutUrl || url || "";

  // Prompt PRO: pais + precio + publico + promesa. Si el bot/Atlas manda un
  // prompt ya armado se respeta y se le suma el contexto operativo.
  const given = String(body.prompt || "").trim();
  const auto = [
    `Landing para vender ${productName}`,
    price ? `a ${price} ${currency}` : "",
    kind === "digital" ? "producto digital" : "con pago contra entrega en Colombia",
    source?.description ? `. ${String(source.description).slice(0, 400)}` : "",
    checkout ? `. El boton de compra lleva a ${checkout}` : "",
    whatsapp ? `. WhatsApp de contacto ${whatsapp}` : "",
  ].filter(Boolean).join(" ");
  const prompt = given ? `${given} ${checkout ? `El boton de compra lleva a ${checkout}. ` : ""}${whatsapp ? `WhatsApp de contacto ${whatsapp}.` : ""}`.trim() : auto;

  // Sin plantilla forzada: la IA elige flujo y tema segun vertical y brief
  // (antes siempre caia en cod-urgency/digital-vsl y todo se veia igual).
  const templateId = typeof body.templateId === "string" && body.templateId ? body.templateId : undefined;

  const res = await generateSpec(prompt, { source, templateId, pro: body.pro === true });
  const spec = res.spec;

  spec.settings.whatsapp = whatsapp || spec.settings.whatsapp || "";
  (spec.settings as any).checkoutUrl = checkout;
  await saveSite(spec);

  const base = process.env.PUBLIC_APP_URL || new URL(req.url).origin;

  /* El editor del bot espera sections { type, copy: {title,subtitle,body,cta},
     imageUrl } — mapeamos los blocks de la nueva app a ese shape. */
  const sections = spec.blocks
    .filter((b: any) => b.visible !== false)
    .map((b: any, i: number) => {
      const p = b.props || {};
      const copy: any = {
        title: String(p.title || p.heading || ""),
        subtitle: String(p.subtitle || ""),
        body: String(p.body || p.text || p.paragraph || ""),
        cta: String(p.ctaText || p.cta || ""),
      };
      if (p.eyebrow) copy.eyebrow = String(p.eyebrow);
      if (Array.isArray(p.bullets)) copy.bullets = p.bullets.map((x: any) => String(x?.text || x || ""));
      if (Array.isArray(p.items)) copy.items = p.items;
      const image = p.image || (Array.isArray(p.images) && p.images[0]) || "";
      return {
        id: b.id,
        sort: i,
        type: b.type,
        layout: b.variant,
        status: "done",
        sectionType: b.type,
        copy,
        imageUrl: image || undefined,
        props: p,
      };
    });

  return NextResponse.json({
    ok: true,
    landingId: spec.id,
    url: `${base}/l/${spec.slug}`,
    exportUrl: `${base}/api/export/${spec.id}`,
    editorUrl: `${base}/editor/${spec.id}`,
    slug: spec.slug,
    productName,
    sectionsGenerated: spec.blocks.length,
    sections,
    engine: res.engine,
    warnings,
  });
}
