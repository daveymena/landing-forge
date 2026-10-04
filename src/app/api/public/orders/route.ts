import { NextResponse } from "next/server";
import { addOrder, getSettings, getSite, type OrderRecord } from "@/lib/db";
import { createDropi } from "@/lib/providers/dropi";
import { uid } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/* ---- rate limit sencillo en memoria (por IP) ---- */
const hits = new Map<string, number[]>();
function limited(ip: string, max = 12, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

function clean(s: unknown, max = 200): string {
  return String(s ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  if (limited(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429, headers: CORS });
  }

  const body = await req.json().catch(() => ({} as any));

  // honeypot
  if (clean(body.website)) {
    return NextResponse.json({ ok: true, orderId: "skipped" }, { headers: CORS });
  }

  const kind = body.kind === "lead" ? "lead" : "cod";
  const siteId = clean(body.siteId, 64);
  const site = siteId ? await getSite(siteId) : null;

  const payload = {
    name: clean(body.name, 60),
    surname: clean(body.surname, 60),
    phone: clean(body.phone, 30).replace(/[^\d+]/g, ""),
    email: clean(body.email, 120),
    dni: clean(body.dni, 30),
    state: clean(body.state, 80),
    city: clean(body.city, 80),
    dir: clean(body.dir, 240),
    notes: clean(body.notes, 400),
    company: clean(body.company, 120),
    quantity: Math.max(1, Math.min(99, Number(body.quantity) || 1)),
    total: Math.max(0, Number(body.total) || 0),
    shipping: Math.max(0, Number(body.shipping) || 0),
    currency: clean(body.currency, 4) || "COP",
    bundle: clean(body.bundle, 60),
    pageUrl: clean(body.pageUrl, 400),
    utm: clean(body.utm, 300),
    ip,
  };

  /* Si el formulario no envió el total (o llega en 0), lo reconstruimos desde el spec
     para que el pedido guardado y el mensaje de WhatsApp nunca digan "0". */
  if (!payload.total && site) {
    const unit = Number(body.unitPrice) || site.product?.price || 0;
    payload.total = unit * payload.quantity + payload.shipping;
    if (!body.currency && site.product?.currency) payload.currency = site.product.currency;
  }

  if (kind === "cod") {
    const missing = ["name", "phone", "city", "dir"].filter((k) => !(payload as any)[k]);
    if (missing.length) {
      return NextResponse.json({ error: `Faltan datos obligatorios: ${missing.join(", ")}` }, { status: 400, headers: CORS });
    }
  } else if (!payload.email) {
    return NextResponse.json({ error: "El correo es obligatorio." }, { status: 400, headers: CORS });
  }

  const record: OrderRecord = {
    id: uid("ord"),
    siteId,
    slug: clean(body.slug, 80),
    kind,
    status: "nuevo",
    provider: "none",
    payload,
    createdAt: new Date().toISOString(),
  };

  const provider = site?.settings.integration.provider ?? "none";
  const settings = await getSettings();

  /* ---------- Dropi ---------- */
  if (kind === "cod" && provider === "dropi" && settings.dropi.token) {
    try {
      const dropi = createDropi(settings);
      const res = await dropi.createOrder({
        name: payload.name,
        surname: payload.surname || ".",
        phone: payload.phone,
        email: payload.email || undefined,
        dni: payload.dni || undefined,
        state: payload.state,
        city: payload.city,
        address: payload.dir,
        notes: [payload.notes, payload.bundle ? `Oferta: ${payload.bundle}` : ""].filter(Boolean).join(" · "),
        quantity: payload.quantity,
        total: payload.total,
        withCollection: true,
        productId: site?.product.dropiProductId,
        variationId: site?.product.dropiVariationId,
      });
      record.provider = "dropi";
      if (res.ok) {
        record.status = "enviado_proveedor";
        record.providerOrderId = res.orderId;
      } else {
        record.status = "error";
        record.providerError = res.error;
      }
    } catch (e: any) {
      record.provider = "dropi";
      record.status = "error";
      record.providerError = String(e?.message || e).slice(0, 300);
    }
  }

  /* ---------- Webhook genérico (Make / n8n / Zapier / CRM) ---------- */
  const hook = site?.settings.integration.webhookUrl;
  if (hook && /^https?:\/\//.test(hook)) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: kind === "cod" ? "order.created" : "lead.created", site: { id: siteId, slug: record.slug }, order: record }),
      });
      if (record.provider === "none") record.provider = "webhook";
    } catch {
      /* el pedido igual queda guardado */
    }
  }

  await addOrder(record);

  /* ---------- Link de confirmación por WhatsApp ---------- */
  let whatsappUrl = "";
  const wa = String(site?.settings.whatsapp || "").replace(/\D/g, "");
  if (wa && kind === "cod") {
    const msg =
      `Hola ${payload.name}! 👋 Confirmamos tu pedido${site?.product.name ? ` de *${site.product.name}*` : ""}.\n` +
      `• Cantidad: ${payload.quantity}${payload.bundle ? ` (${payload.bundle})` : ""}\n` +
      `• Total a pagar al recibir: ${payload.total.toLocaleString("es-CO")} ${payload.currency}\n` +
      `• Dirección: ${payload.dir}, ${payload.city} (${payload.state})\n` +
      `¿Confirmas que los datos están correctos?`;
    whatsappUrl = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  }

  return NextResponse.json(
    {
      ok: true,
      orderId: record.providerOrderId ?? record.id,
      localId: record.id,
      provider: record.provider,
      status: record.status,
      ...(record.providerError ? { providerWarning: record.providerError } : {}),
      whatsappUrl,
    },
    { headers: CORS },
  );
}
