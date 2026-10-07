import type { Block, PageSpec } from "../schema";
import { withDefaults } from "../blocks/catalog";

export interface Ctx {
  spec: PageSpec;
  mode: "edit" | "export";
  index: number;
}

/* ----------------------------- helpers ----------------------------- */

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Permite <b> <i> <br> <mark> escritos por el usuario, escapa el resto */
export function rich(s: unknown): string {
  const t = esc(s);
  return t
    .replace(/&lt;(\/?(?:b|i|em|strong|br|mark|u|span))&gt;/g, "<$1>")
    .replace(/\n/g, "<br>");
}

const CURRENCY_LOCALE: Record<string, string> = {
  COP: "es-CO", MXN: "es-MX", ARS: "es-AR", CLP: "es-CL", PEN: "es-PE",
  USD: "en-US", EUR: "es-ES", BRL: "pt-BR", GTQ: "es-GT", CRC: "es-CR", PAB: "es-PA",
};
const NO_DECIMALS = new Set(["COP", "CLP", "PYG", "GTQ", "ARS"]);

export function money(n: number | string | undefined, currency = "COP"): string {
  const v = Number(n ?? 0);
  if (!isFinite(v)) return "";
  const loc = CURRENCY_LOCALE[currency] ?? "es-CO";
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency,
      minimumFractionDigits: NO_DECIMALS.has(currency) ? 0 : v % 1 === 0 ? 0 : 2,
      maximumFractionDigits: NO_DECIMALS.has(currency) ? 0 : 2,
    }).format(v);
  } catch {
    return `$${v.toLocaleString("es-CO")}`;
  }
}

/** atributo de campo editable (solo en modo edición) */
function f(ctx: Ctx, path: string): string {
  return ctx.mode === "edit" ? ` data-lf-f="${esc(path)}"` : "";
}

function secAttrs(ctx: Ctx, b: Block, extraClass = ""): string {
  const bgClass =
    b.props.bg && b.props.bg !== "default" ? ` sec--${esc(b.props.bg)}` : "";
  const edit = ctx.mode === "edit" ? ` data-lf-b="${esc(b.id)}" data-lf-type="${esc(b.type)}"` : "";
  return `class="sec${bgClass}${extraClass ? " " + extraClass : ""}"${edit} id="${esc(b.id)}"`;
}

function head(ctx: Ctx, p: any, center = true): string {
  const parts: string[] = [];
  if (p.eyebrow) parts.push(`<p class="eyebrow"${f(ctx, "eyebrow")}>${rich(p.eyebrow)}</p>`);
  if (p.title) parts.push(`<h2 class="h2"${f(ctx, "title")}>${rich(p.title)}</h2>`);
  if (p.subtitle) parts.push(`<p class="lead"${f(ctx, "subtitle")}>${rich(p.subtitle)}</p>`);
  if (!parts.length) return "";
  return `<div class="sec__head${center ? " sec__head--center" : ""} reveal">${parts.join("")}</div>`;
}

function btn(
  ctx: Ctx,
  text: string,
  href: string,
  variant: "primary" | "ghost" | "soft" = "primary",
  path?: string,
  big = false,
): string {
  if (!text) return "";
  return `<a class="btn btn--${variant}${big ? " btn--lg" : ""}" href="${esc(href || "#")}" data-lf-cta><span${path ? f(ctx, path) : ""}>${rich(text)}</span><span class="btn__arrow">→</span></a>`;
}

function stars(n: number): string {
  const k = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return `<span class="stars" aria-label="${k} de 5">${"★".repeat(k)}${"☆".repeat(5 - k)}</span>`;
}

/* Modo del render en curso: el recuadro "Imagen" es una guia del editor;
   publicado, un hueco gris con la palabra "Imagen" es peor que nada. */
let MODO: Ctx["mode"] = "export";

function img(src: string, alt = "", cls = "", eager = false): string {
  if (!src) return MODO === "edit" ? `<div class="ph">Imagen</div>` : "";
  return `<img src="${esc(src)}" alt="${esc(alt)}" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ` fetchpriority="high"` : ""}${cls ? ` class="${cls}"` : ""}>`;
}

/* Iconos de linea uniformes. Los emojis que elige el LLM (biberon, hilo,
   mochila, caramelo para "funda lavable") se ven de plantilla barata: el
   icono se decide por el TEXTO del item y todos comparten trazo y color. */
const SVG: Record<string, string> = {
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  back: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  chat: '<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.5z"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l7-7"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  feather: '<path d="M20 4c-7 0-12 5-12 12v4h4c7 0 8-9 8-16z"/><path d="M8 20L16 10"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',
};
const ICON_RULES: Array<[RegExp, string]> = [
  [/env[ií]o|entrega a domicilio|domicilio|despacho|llega|transportadora/i, "truck"],
  [/contra ?entrega|pag(a|o|as) (al|cuando) (recibir|llegue)|al recibir|efectivo|pago/i, "cash"],
  [/garant[ií]a|original|segur[oa]|certificad|protecci|confianza/i, "shield"],
  [/devoluci|reembols/i, "back"],
  [/r[aá]pid|minutos|horas|tiempo|24 ?h|48 ?h/i, "clock"],
  [/whatsapp|asesor|soporte|atenci[oó]n|chat/i, "chat"],
  [/natural|hipoalerg|org[aá]nic|piel|suave/i, "leaf"],
  [/lav|agua|impermeab|limpi|higien|fresc|transpir|respir/i, "drop"],
  [/ligera|liviana|ligero|port[aá]til|c[oó]mod|ergon/i, "feather"],
  [/potencia|energ[ií]a|bater[ií]a|carga|r[eé]sultad/i, "bolt"],
  [/calidad|premium|valorad|rese[ñn]a|estrella/i, "star"],
  [/salud|bienestar|cuida|amor|beb[eé]|familia/i, "heart"],
];
function lineIcon(titulo: unknown, texto?: unknown): string {
  // El titulo manda; la descripcion solo desempata cuando el titulo no dice
  // nada ("Ligera y portatil" no es devolucion por decir "cambios de entorno").
  const pick = (t: unknown) => ICON_RULES.find(([re]) => re.test(String(t ?? "")))?.[1];
  const k = pick(titulo) ?? pick(texto) ?? "check";
  return `<svg class="lico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[k]}</svg>`;
}

function initials(name: string): string {
  return String(name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

function offPct(price: number, was: number): string {
  if (!was || !price || was <= price) return "";
  return `-${Math.round((1 - price / was) * 100)}%`;
}

/** Devuelve siempre una lista de objetos.
 *  Tolera que un LLM (o una edición manual) haya dejado ["texto"] donde el
 *  bloque espera [{text:"texto"}]: así nunca se renderiza una viñeta vacía. */
function list(p: any, key: string): any[] {
  const v = p[key];
  if (!Array.isArray(v)) return [];
  return v.map((x) =>
    x && typeof x === "object"
      ? x
      : { text: String(x ?? ""), title: String(x ?? ""), label: String(x ?? ""), q: String(x ?? "") },
  );
}

/* ----------------------------- bloques ----------------------------- */

type Renderer = (ctx: Ctx, b: Block, p: any) => string;

const R: Record<string, Renderer> = {
  /* ---------------- estructura ---------------- */
  announcement: (ctx, b, p) => {
    const inner = `${rich(p.text)}${p.linkText ? ` <a href="${esc(p.linkHref)}"${f(ctx, "linkText")}>${rich(p.linkText)}</a>` : ""}`;
    const cls = `ann${p.bg === "gradient" || b.variant === "gradient" ? " ann--gradient" : ""}`;
    const editAttr = ctx.mode === "edit" ? ` data-lf-b="${esc(b.id)}" data-lf-type="announcement"` : "";
    if (b.variant === "marquee") {
      const t = `<span style="margin-right:56px">${inner}</span>`;
      return `<div class="${cls}"${editAttr} id="${esc(b.id)}"><div class="marquee"><div class="marquee__track">${t.repeat(8)}</div></div></div>`;
    }
    return `<div class="${cls}"${editAttr} id="${esc(b.id)}"><span${f(ctx, "text")}>${rich(p.text)}</span>${
      p.linkText ? ` <a href="${esc(p.linkHref)}">${rich(p.linkText)}</a>` : ""
    }${p.dismissible ? `<button class="ann__x" data-lf-dismiss aria-label="Cerrar">×</button>` : ""}</div>`;
  },

  navbar: (ctx, b, p) => {
    const editAttr = ctx.mode === "edit" ? ` data-lf-b="${esc(b.id)}" data-lf-type="navbar"` : "";
    const logo = `<a class="nav__logo" href="#top">${p.logoImage ? `<img src="${esc(p.logoImage)}" alt="${esc(p.logoText)}">` : `<span${f(ctx, "logoText")}>${rich(p.logoText)}</span>`}</a>`;
    const links = list(p, "links").length
      ? `<nav class="nav__links">${list(p, "links").map((l: any) => `<a href="${esc(l.href || "#")}">${esc(l.label)}</a>`).join("")}</nav>`
      : "";
    const cta = p.ctaText
      ? `<a class="btn btn--primary" href="${esc(p.ctaHref || "#")}" data-lf-cta style="padding:11px 20px;font-size:14.5px"><span${f(ctx, "ctaText")}>${rich(p.ctaText)}</span></a>`
      : "";
    return `<header class="nav${p.sticky ? " nav--sticky" : ""}${b.variant === "centered" ? " nav--centered" : ""}"${editAttr} id="${esc(b.id)}"><div class="wrap nav__in">${logo}${b.variant === "links" ? links : ""}${b.variant === "centered" ? "" : cta}</div></header>`;
  },

  stickyCta: (ctx, b, p) => {
    const editAttr = ctx.mode === "edit" ? ` data-lf-b="${esc(b.id)}" data-lf-type="stickyCta"` : "";
    const cur = ctx.spec.product.currency || "COP";
    const price = Number(p.price) || Number(ctx.spec.product.price) || 0;
    const was = Number(p.compareAtPrice) || Number(ctx.spec.product.compareAtPrice) || 0;
    const priceHtml =
      b.variant === "bar" && price
        ? `<div class="sticky-bar__p"><div class="sticky-bar__l"${f(ctx, "label")}>${rich(p.label)}</div><div class="sticky-bar__v">${money(price, cur)}${was > price ? ` <span style="font-size:13px;font-weight:400;text-decoration:line-through;opacity:.6">${money(was, cur)}</span>` : ""}</div></div>`
        : "";
    return `<div class="sticky-bar" data-lf-sticky${p.onlyMobile ? ' data-only-mobile="1"' : ""}${editAttr} id="${esc(b.id)}">${priceHtml}<a class="btn btn--primary" href="${esc(p.ctaHref || "#pedido")}" data-lf-cta><span${f(ctx, "ctaText")}>${rich(p.ctaText)}</span></a></div>`;
  },

  whatsappFab: (ctx, b, p) => {
    const phone = String(p.phone || ctx.spec.settings.whatsapp || "").replace(/\D/g, "");
    if (!phone) return "";
    const editAttr = ctx.mode === "edit" ? ` data-lf-b="${esc(b.id)}" data-lf-type="whatsappFab"` : "";
    const href = `https://wa.me/${phone}?text=${encodeURIComponent(p.message || "Hola 👋")}`;
    const ico = `<svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.157 5.335 5.495 0 12.057 0a11.82 11.82 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 001.599 5.317l-.999 3.648 3.889-.664zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;
    return `<a class="fab${b.variant === "icon" ? " fab--icon" : ""}" href="${esc(href)}" target="_blank" rel="noopener" data-lf-wa${editAttr} id="${esc(b.id)}">${ico}${b.variant === "icon" ? "" : `<span${f(ctx, "label")}>${rich(p.label)}</span>`}</a>`;
  },

  footer: (ctx, b, p) => {
    const editAttr = ctx.mode === "edit" ? ` data-lf-b="${esc(b.id)}" data-lf-type="footer"` : "";
    const links = list(p, "links").map((l: any) => `<a href="${esc(l.href || "#")}">${esc(l.label)}</a>`).join("");
    return `<footer class="foot"${editAttr} id="${esc(b.id)}"><div class="wrap">
  <div class="foot__in">
    <div style="max-width:380px"><div class="foot__b"${f(ctx, "brand")}>${rich(p.brand)}</div>${p.tagline ? `<p style="margin:10px 0 0"${f(ctx, "tagline")}>${rich(p.tagline)}</p>` : ""}</div>
    <div class="foot__links">${links}</div>
  </div>
  <div class="foot__bottom"><span${f(ctx, "copyright")}>${rich(p.copyright)}</span>${p.disclaimer ? `<span style="max-width:560px;opacity:.8"${f(ctx, "disclaimer")}>${rich(p.disclaimer)}</span>` : ""}</div>
</div></footer>`;
  },

  /* ---------------- apertura ---------------- */
  hero: (ctx, b, p) => {
    const cur = ctx.spec.product.currency || "COP";
    const eyebrow = p.eyebrow ? `<p class="eyebrow"${f(ctx, "eyebrow")}>${rich(p.eyebrow)}</p>` : "";
    const title = `<h1 class="h1"${f(ctx, "title")}>${rich(p.title)}</h1>`;
    const sub = p.subtitle ? `<p class="lead"${f(ctx, "subtitle")}>${rich(p.subtitle)}</p>` : "";
    const ctas = `<div class="cta-row">${btn(ctx, p.ctaText, p.ctaHref, "primary", "ctaText", true)}${btn(ctx, p.cta2Text, p.cta2Href, "ghost", "cta2Text", true)}</div>`;
    const ctaSub = p.ctaSub ? `<p class="cta-sub"${f(ctx, "ctaSub")}>${rich(p.ctaSub)}</p>` : "";
    const bullets = list(p, "bullets").length
      ? `<ul class="hero__bullets">${list(p, "bullets").map((x: any, i: number) => `<li><span class="check">✓</span><span${f(ctx, `bullets.${i}.text`)}>${rich(x.text)}</span></li>`).join("")}</ul>`
      : "";
    const rating = Number(p.rating)
      ? `<div class="rating-row" style="margin-top:18px">${stars(p.rating)}<span><b style="color:var(--text)">${esc(p.rating)}</b>${p.ratingCount ? ` · ${esc(p.ratingCount)} reseñas` : ""}</span></div>`
      : "";

    if (b.variant === "centered") {
      return `<section ${secAttrs(ctx, b, "hero")}><div class="wrap ta-c" style="max-width:860px">
        <div class="reveal">${eyebrow}${title}${sub}${rating}${ctas}${ctaSub}</div>
        ${p.image ? `<div class="hero__media reveal" style="margin-top:46px">${img(p.image, p.title, "", true)}</div>` : ""}
      </div></section>`;
    }

    if (b.variant === "vsl") {
      return `<section ${secAttrs(ctx, b, "hero")}><div class="wrap ta-c" style="max-width:920px">
        <div class="reveal">${eyebrow}${title}${sub}</div>
        <div class="vframe reveal" style="margin:36px 0 30px">${videoEmbed(p.videoUrl, p.image)}</div>
        <div class="reveal">${ctas}${ctaSub}${rating}</div>
      </div></section>`;
    }

    if (b.variant === "product") {
      const imgs: string[] = list(p, "images").map((x: any) => x.src).filter(Boolean);
      const all = imgs.length ? imgs : ctx.spec.product.images || [];
      const price = Number(p.price) || Number(ctx.spec.product.price) || 0;
      const was = Number(p.compareAtPrice) || Number(ctx.spec.product.compareAtPrice) || 0;
      const pct = offPct(price, was);
      const gal = `<div class="gal reveal" data-lf-gallery>
        <div class="gal__main">${all[0] ? img(all[0], p.title, "", true) : `<div class="ph">Foto del producto</div>`}</div>
        ${all.length > 1 ? `<div class="gal__thumbs">${all.map((s, i) => `<button type="button" aria-selected="${i === 0}" data-i="${i}" data-src="${esc(s)}">${img(s, "")}</button>`).join("")}</div>` : ""}
      </div>`;
      const priceBox = price
        ? `<div class="price" style="margin-top:22px"><span class="price__now">${money(price, cur)}</span>${was > price ? `<span class="price__was">${money(was, cur)}</span><span class="price__off">${pct}</span>` : ""}</div>`
        : "";
      return `<section ${secAttrs(ctx, b, "hero")}><div class="wrap"><div class="split">
        ${gal}
        <div class="reveal">${eyebrow}${title}${sub}${rating}${priceBox}${bullets}${ctas}${ctaSub}</div>
      </div></div></section>`;
    }

    // split (default)
    return `<section ${secAttrs(ctx, b, "hero")}><div class="wrap"><div class="split">
      <div class="reveal">${eyebrow}${title}${sub}${bullets}${rating}${ctas}${ctaSub}</div>
      <div class="hero__media reveal">${p.videoUrl ? `<div class="vframe">${videoEmbed(p.videoUrl, p.image)}</div>` : img(p.image, p.title, "", true)}</div>
    </div></div></section>`;
  },

  logos: (ctx, b, p) => {
    const items = list(p, "items");
    const one = (l: any) => (l.image ? `<img src="${esc(l.image)}" alt="${esc(l.name)}" loading="lazy" decoding="async">` : `<span class="logo">${esc(l.name)}</span>`);
    const body =
      b.variant === "marquee"
        ? `<div class="marquee"><div class="marquee__track">${[...items, ...items].map(one).join("")}</div></div>`
        : `<div class="logos">${items.map(one).join("")}</div>`;
    return `<section ${secAttrs(ctx, b, "sec--tight")}><div class="wrap">
      ${p.title ? `<p class="small muted ta-c" style="margin:0 0 26px;letter-spacing:.04em"${f(ctx, "title")}>${rich(p.title)}</p>` : ""}
      ${body}</div></section>`;
  },

  trustIcons: (ctx, b, p) => {
    const items = list(p, "items");
    const cards = items
      .map(
        (x: any, i: number) => `<div class="${b.variant === "cards" ? "card" : ""} trust__i ta-c reveal">
      <div class="trust__ico">${lineIcon(x.title, x.text)}</div>
      <div style="font-weight:650;font-size:15.4px"${f(ctx, `items.${i}.title`)}>${rich(x.title)}</div>
      ${x.text ? `<div class="small muted" style="margin-top:3px"${f(ctx, `items.${i}.text`)}>${rich(x.text)}</div>` : ""}
    </div>`,
      )
      .join("");
    // 3 sellos en 2 columnas dejaban uno huerfano en el movil: la grilla
    // sigue la cantidad real.
    const n = Math.min(items.length, 4);
    return `<section ${secAttrs(ctx, b, "sec--tight")}><div class="wrap"><div class="grid trust trust--${n}">${cards}</div></div></section>`;
  },

  /* ---------------- persuasión ---------------- */
  problem: (ctx, b, p) => {
    if (b.variant === "cards" && list(p, "items").length) {
      return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
        <div class="grid g3">${list(p, "items")
          .map(
            (x: any, i: number) => `<div class="card reveal"><div class="card__ico">${esc(x.icon || "⚠️")}</div>
          <h3 class="h3"${f(ctx, `items.${i}.title`)}>${rich(x.title)}</h3><p${f(ctx, `items.${i}.text`)}>${rich(x.text)}</p></div>`,
          )
          .join("")}</div></div></section>`;
    }
    return `<section ${secAttrs(ctx, b)}><div class="wrap" style="max-width:760px">
      <div class="sec__head sec__head--center reveal" style="margin-bottom:0">
        ${p.eyebrow ? `<p class="eyebrow"${f(ctx, "eyebrow")}>${rich(p.eyebrow)}</p>` : ""}
        <h2 class="h2"${f(ctx, "title")}>${rich(p.title)}</h2>
        ${p.body ? `<p class="lead"${f(ctx, "body")}>${rich(p.body)}</p>` : ""}
      </div></div></section>`;
  },

  benefits: (ctx, b, p) => {
    const items = list(p, "items");
    const center = p.align !== "left";
    if (b.variant === "list") {
      return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p, center)}
        <div class="grid g2" style="max-width:900px;margin-inline:auto">${items
          .map(
            (x: any, i: number) => `<div class="reveal" style="display:flex;gap:14px;align-items:flex-start">
            <span class="check" style="flex:0 0 24px;width:24px;height:24px">✓</span>
            <div><div style="font-weight:650;font-size:16px"${f(ctx, `items.${i}.title`)}>${rich(x.title)}</div>
            <div class="muted" style="font-size:15px;margin-top:3px"${f(ctx, `items.${i}.text`)}>${rich(x.text)}</div></div></div>`,
          )
          .join("")}</div></div></section>`;
    }
    if (b.variant === "alternating") {
      return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p, center)}
        <div style="display:grid;gap:clamp(40px,6vw,88px)">${items
          .map(
            (x: any, i: number) => `<div class="split reveal"${i % 2 ? ' style="direction:rtl"' : ""}>
            <div style="direction:ltr"><div class="card__ico">${lineIcon(x.title, x.text)}</div>
              <h3 class="h2" style="font-size:clamp(1.5rem,2.6vw,2.1rem)"${f(ctx, `items.${i}.title`)}>${rich(x.title)}</h3>
              <p class="lead" style="margin-top:12px"${f(ctx, `items.${i}.text`)}>${rich(x.text)}</p></div>
            ${x.image ? `<div style="direction:ltr">${img(x.image, x.title)}</div>` : ""}</div>`,
          )
          .join("")}</div></div></section>`;
    }
    const cols = items.length === 4 ? "g4" : items.length >= 5 ? "g3" : "g3";
    return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p, center)}
      <div class="grid ${cols} bens">${items
        .map(
          (x: any, i: number) => `<div class="card reveal"><div class="card__ico">${lineIcon(x.title, x.text)}</div>
        <h3 class="h3"${f(ctx, `items.${i}.title`)}>${rich(x.title)}</h3><p${f(ctx, `items.${i}.text`)}>${rich(x.text)}</p></div>`,
        )
        .join("")}</div></div></section>`;
  },

  bento: (ctx, b, p) => {
    const items = list(p, "items");
    return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
      <div class="bento">${items
        .map((x: any, i: number) => {
          const span = String(x.span || "1");
          return `<div class="tile reveal${span === "2" ? " span2" : span === "3" ? " span3" : ""}">
          ${x.stat ? `<div class="tile__stat"${f(ctx, `items.${i}.stat`)}>${rich(x.stat)}</div>` : x.icon ? `<div class="card__ico" style="margin-bottom:auto">${esc(x.icon)}</div>` : ""}
          ${x.image ? `<div style="margin-bottom:16px">${img(x.image, x.title)}</div>` : ""}
          <h3 class="h3"${f(ctx, `items.${i}.title`)}>${rich(x.title)}</h3>
          <p${f(ctx, `items.${i}.text`)}>${rich(x.text)}</p></div>`;
        })
        .join("")}</div></div></section>`;
  },

  steps: (ctx, b, p) => {
    const items = list(p, "items");
    return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
      <div class="steps ${b.variant === "vertical" ? "steps--v" : "steps--h"}">${items
        .map(
          (x: any, i: number) => `<div class="step reveal"><h3 class="h3"${f(ctx, `items.${i}.title`)}>${rich(x.title)}</h3>
        <p class="muted" style="margin:8px 0 0;font-size:15.3px"${f(ctx, `items.${i}.text`)}>${rich(x.text)}</p></div>`,
        )
        .join("")}</div></div></section>`;
  },

  beforeAfter: (ctx, b, p) => {
    const li = (arr: any[], key: string, ok: boolean) =>
      arr
        .map(
          (x: any, i: number) =>
            `<li><span style="color:${ok ? "var(--ok)" : "var(--danger)"};font-weight:800">${ok ? "✓" : "✕"}</span><span${f(ctx, `${key}.${i}.text`)}>${rich(x.text)}</span></li>`,
        )
        .join("");
    return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
      <div class="ba">
        <div class="ba__c reveal"><div class="ba__t"${f(ctx, "beforeLabel")}>${rich(p.beforeLabel)}</div>
          ${p.beforeImage ? `<div style="margin-bottom:16px">${img(p.beforeImage, "antes")}</div>` : ""}
          <ul>${li(list(p, "before"), "before", false)}</ul></div>
        <div class="ba__c ba__c--a reveal"><div class="ba__t"${f(ctx, "afterLabel")}>${rich(p.afterLabel)}</div>
          ${p.afterImage ? `<div style="margin-bottom:16px">${img(p.afterImage, "después")}</div>` : ""}
          <ul>${li(list(p, "after"), "after", true)}</ul></div>
      </div></div></section>`;
  },

  video: (ctx, b, p) =>
    `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
      <div class="vframe${b.variant === "vertical" ? " vframe--v" : ""} reveal">${videoEmbed(p.url, p.poster)}</div>
      ${p.ctaText ? `<div class="ta-c"><div class="cta-row">${btn(ctx, p.ctaText, p.ctaHref, "primary", "ctaText", true)}</div></div>` : ""}
    </div></section>`,

  gallery: (ctx, b, p) => {
    const items = list(p, "items");
    const cards = items
      .map(
        (x: any, i: number) =>
          `<figure class="reveal">${img(x.src, x.caption)}${x.caption ? `<figcaption${f(ctx, `items.${i}.caption`)}>${rich(x.caption)}</figcaption>` : ""}</figure>`,
      )
      .join("");
    return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
      <div class="${b.variant === "scroll" ? "scroller" : "ggrid"}">${cards}</div></div></section>`;
  },

  comparison: (ctx, b, p) => {
    const rows = list(p, "rows");
    const cell = (v: string) =>
      /^s[ií]$/i.test(String(v)) ? `<span class="yes">✓</span>` : /^no$/i.test(String(v)) ? `<span class="no">✕</span>` : esc(v);
    if (b.variant === "duel") {
      return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
        <div class="duel">
          <div class="duel__col duel__col--us reveal"><h3 class="h3"${f(ctx, "usLabel")}>${rich(p.usLabel)}</h3>
            <ul>${rows.map((r: any, i: number) => `<li><span class="yes">✓</span><span${f(ctx, `rows.${i}.feature`)}>${rich(r.feature)}</span></li>`).join("")}</ul></div>
          <div class="duel__col reveal"><h3 class="h3"${f(ctx, "themLabel")}>${rich(p.themLabel)}</h3>
            <ul>${rows.map((r: any, i: number) => `<li><span class="no">✕</span><span class="muted"${f(ctx, `rows.${i}.themFeature`)}>${rich(r.themFeature || r.feature)}</span></li>`).join("")}</ul></div>
        </div></div></section>`;
    }
    return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
      <div class="reveal" style="overflow-x:auto"><table class="ctable">
        <thead><tr><th></th><th${f(ctx, "usLabel")}>${rich(p.usLabel)}</th><th${f(ctx, "themLabel")}>${rich(p.themLabel)}</th></tr></thead>
        <tbody>${rows
          .map(
            (r: any, i: number) =>
              `<tr><td${f(ctx, `rows.${i}.feature`)}>${rich(r.feature)}</td><td class="us">${cell(r.us)}</td><td>${cell(r.them)}</td></tr>`,
          )
          .join("")}</tbody></table></div></div></section>`;
  },

  stats: (ctx, b, p) =>
    `<section ${secAttrs(ctx, b, "sec--tight")}><div class="wrap">${p.title ? head(ctx, p) : ""}
      <div class="stats">${list(p, "items")
        .map(
          (x: any, i: number) =>
            `<div class="${b.variant === "cards" ? "card ta-c" : ""} reveal"><div class="stat__v"${f(ctx, `items.${i}.value`)}>${rich(x.value)}</div><div class="stat__l"${f(ctx, `items.${i}.label`)}>${rich(x.label)}</div></div>`,
        )
        .join("")}</div></div></section>`,

  /* ---------------- prueba ---------------- */
  testimonials: (ctx, b, p) => {
    const items = list(p, "items");
    const card = (x: any, i: number) => `<div class="quote reveal">
      ${x.rating ? stars(x.rating) : ""}
      <p${f(ctx, `items.${i}.quote`)}>“${rich(x.quote)}”</p>
      ${x.result ? `<span class="result"${f(ctx, `items.${i}.result`)}>${rich(x.result)}</span>` : ""}
      <div class="who">${x.avatar ? `<img class="av" src="${esc(x.avatar)}" alt="${esc(x.name)}" loading="lazy" decoding="async">` : `<div class="av">${esc(initials(x.name))}</div>`}
        <div><div class="who__n"${f(ctx, `items.${i}.name`)}>${rich(x.name)}</div><div class="who__r"${f(ctx, `items.${i}.role`)}>${rich(x.role)}</div></div></div>
    </div>`;
    if (b.variant === "featured" && items.length) {
      const [first, ...rest] = items;
      return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
        <div class="quote reveal" style="padding:clamp(28px,4vw,48px);margin-bottom:18px">
          ${first.rating ? stars(first.rating) : ""}
          <p style="font-size:clamp(1.15rem,2.1vw,1.55rem);font-family:var(--ff-display);line-height:1.4;letter-spacing:-.015em"${f(ctx, "items.0.quote")}>“${rich(first.quote)}”</p>
          <div class="who">${first.avatar ? `<img class="av" src="${esc(first.avatar)}" alt="" loading="lazy" decoding="async">` : `<div class="av">${esc(initials(first.name))}</div>`}
            <div><div class="who__n"${f(ctx, "items.0.name")}>${rich(first.name)}</div><div class="who__r"${f(ctx, "items.0.role")}>${rich(first.role)}</div></div></div></div>
        <div class="grid g3">${rest.map((x: any, i: number) => card(x, i + 1)).join("")}</div></div></section>`;
    }
    return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
      <div class="${b.variant === "scroll" ? "scroller" : "grid g3"}">${items.map(card).join("")}</div></div></section>`;
  },

  reviewsUgc: (ctx, b, p) => {
    const items = list(p, "items");
    const topline = Number(p.rating)
      ? `<div class="rating-row ta-c" style="justify-content:center;margin:-18px 0 32px">${stars(p.rating)}<span><b style="color:var(--text)">${esc(p.rating)}/5</b> · ${esc(p.ratingCount)} reseñas verificadas</span></div>`
      : "";
    const card = (x: any, i: number) => `<div class="ugc__card reveal">
      <div class="ugc__img">${img(x.image, x.name)}</div>
      <div class="ugc__body">${stars(x.rating || 5)}
        <p style="margin:9px 0 0;font-size:15px"${f(ctx, `items.${i}.quote`)}>“${rich(x.quote)}”</p>
        <div style="font-weight:620;font-size:14px;margin-top:10px"${f(ctx, `items.${i}.name`)}>${rich(x.name)}</div>
        ${x.verified ? `<div class="verified">✓ Compra verificada</div>` : ""}</div></div>`;
    return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}${topline}
      <div class="${b.variant === "scroll" ? "scroller" : "ugc"}">${items.map(card).join("")}</div></div></section>`;
  },

  /* ---------------- oferta ---------------- */
  pricing: (ctx, b, p) => {
    const plans = list(p, "plans");
    const toggle = p.showToggle
      ? `<div class="toggle" data-lf-billing><button type="button" data-b="m" aria-pressed="true">Mensual</button><button type="button" data-b="a" aria-pressed="false">Anual<span class="save">${esc(p.annualDiscountLabel || "")}</span></button></div>`
      : "";
    const card = (x: any, i: number) => `<div class="plan${x.featured ? " plan--featured" : ""} reveal">
      ${x.badge ? `<span class="badge">${esc(x.badge)}</span>` : ""}
      <div><div class="plan__name"${f(ctx, `plans.${i}.name`)}>${rich(x.name)}</div>
        ${x.description ? `<div class="muted small" style="margin-top:4px"${f(ctx, `plans.${i}.description`)}>${rich(x.description)}</div>` : ""}</div>
      <div class="plan__p"><b data-price-m="${money(x.price, x.currency || "USD")}" data-price-a="${money(x.priceAnnual ?? x.price, x.currency || "USD")}">${money(x.price, x.currency || "USD")}</b><span class="muted">${esc(x.period || "")}</span></div>
      <ul>${list(x, "features").map((ft: any, j: number) => `<li><span class="check">✓</span><span${f(ctx, `plans.${i}.features.${j}.text`)}>${rich(ft.text)}</span></li>`).join("")}</ul>
      <div style="margin-top:auto">${btn(ctx, x.ctaText, x.ctaHref, x.featured ? "primary" : "ghost", `plans.${i}.ctaText`)}<span style="display:block"></span></div>
    </div>`;
    const grid = b.variant === "single" ? `<div style="max-width:460px;margin-inline:auto">${plans.slice(0, 1).map(card).join("")}</div>` : `<div class="plans">${plans.map(card).join("")}</div>`;
    return `<section ${secAttrs(ctx, b)} ${ctx.mode === "edit" ? "" : 'data-anchor="oferta"'}><a id="oferta"></a><div class="wrap">${head(ctx, p)}${toggle}${grid}</div></section>`;
  },

  bundle: (ctx, b, p) => {
    const cur = p.currency || ctx.spec.product.currency || "COP";
    const opts = list(p, "options");
    const card = (x: any, i: number) => `<button type="button" class="bundle reveal" data-lf-bundle data-qty="${esc(x.qty)}" data-price="${esc(x.price)}" data-label="${esc(x.label)}" aria-pressed="${x.featured ? "true" : "false"}">
      ${x.badge ? `<span class="badge">${esc(x.badge)}</span>` : ""}
      <span class="bundle__radio"></span>
      <div class="bundle__l"${f(ctx, `options.${i}.label`)}>${rich(x.label)}</div>
      <div><span class="bundle__p">${money(x.price, cur)}</span>${x.compareAtPrice > x.price ? `<span class="bundle__was">${money(x.compareAtPrice, cur)}</span>` : ""}</div>
      ${x.note ? `<div class="bundle__n"${f(ctx, `options.${i}.note`)}>${rich(x.note)}</div>` : ""}
    </button>`;
    return `<section ${secAttrs(ctx, b)}><a id="oferta"></a><div class="wrap">${head(ctx, p)}
      <div class="bundles">${opts.map(card).join("")}</div>
      <div class="ta-c"><div class="cta-row">${btn(ctx, p.ctaText, p.ctaHref, "primary", "ctaText", true)}</div></div>
    </div></section>`;
  },

  valueStack: (ctx, b, p) => {
    const cur = p.currency || "USD";
    const items = list(p, "items");
    const total = items.reduce((a: number, x: any) => a + (Number(x.value) || 0), 0);
    return `<section ${secAttrs(ctx, b)}><div class="wrap" style="max-width:780px">${head(ctx, p)}
      <div class="vstack reveal">
        ${items
          .map(
            (x: any, i: number) => `<div class="vrow"><div><div style="font-weight:620"${f(ctx, `items.${i}.title`)}>${x.bonus ? "🎁 " : ""}${rich(x.title)}</div>
          ${x.text ? `<div class="muted small"${f(ctx, `items.${i}.text`)}>${rich(x.text)}</div>` : ""}</div>
          <div class="vrow__v">${money(x.value, cur)}</div></div>`,
          )
          .join("")}
        <div class="vrow vrow--total"><div${f(ctx, "totalLabel")}>${rich(p.totalLabel)}</div><div class="vrow__v">${money(total, cur)}</div></div>
        <div class="vrow vrow--today"><div style="font-weight:700"${f(ctx, "todayLabel")}>${rich(p.todayLabel)}</div><div class="vrow__v">${money(p.todayPrice, cur)}</div></div>
      </div></div></section>`;
  },

  curriculum: (ctx, b, p) => {
    const items = list(p, "items");
    if (b.variant === "list") {
      return `<section ${secAttrs(ctx, b)}><div class="wrap" style="max-width:820px">${head(ctx, p)}
        <div class="grid" style="gap:12px">${items
          .map(
            (x: any, i: number) => `<div class="card reveal"><h3 class="h3"${f(ctx, `items.${i}.title`)}>${rich(x.title)}</h3>
          <p${f(ctx, `items.${i}.text`)}>${rich(x.text)}</p>${x.meta ? `<div class="acc__m">${esc(x.meta)}</div>` : ""}</div>`,
          )
          .join("")}</div></div></section>`;
    }
    return `<section ${secAttrs(ctx, b)}><div class="wrap" style="max-width:820px">${head(ctx, p)}
      <div class="acc reveal">${items
        .map(
          (x: any, i: number) => `<details${i === 0 ? " open" : ""}><summary${f(ctx, `items.${i}.title`)}>${rich(x.title)}</summary>
        <div class="acc__b"><span${f(ctx, `items.${i}.text`)}>${rich(x.text)}</span>${x.meta ? `<div class="acc__m">${esc(x.meta)}</div>` : ""}</div></details>`,
        )
        .join("")}</div></div></section>`;
  },

  guarantee: (ctx, b, p) =>
    `<section ${secAttrs(ctx, b)}><div class="wrap" style="max-width:900px">
      <div class="guar reveal"><div class="seal"${f(ctx, "badge")}>${rich(p.badge)}</div>
        <div><h3 class="h2" style="font-size:clamp(1.3rem,2.3vw,1.85rem)"${f(ctx, "title")}>${rich(p.title)}</h3>
        <p class="lead" style="margin-top:10px"${f(ctx, "body")}>${rich(p.body)}</p></div></div>
    </div></section>`,

  countdown: (ctx, b, p) => {
    const mins = Math.max(1, Number(p.minutes) || 15);
    const stock = Number(p.stockLeft) || 0;
    const total = Number(p.stockTotal) || 0;
    const pct = total ? Math.max(4, Math.round((stock / total) * 100)) : 0;
    const bar = total
      ? `<div class="stockbar"><div class="stockbar__t"><div class="stockbar__f" style="width:${pct}%"></div></div>
         <div class="stockbar__x">Quedan <b style="color:var(--danger)">${stock}</b> de ${total} unidades a este precio</div></div>`
      : "";
    return `<section ${secAttrs(ctx, b, "sec--tight")}><div class="wrap ta-c">
      <h3 class="h2" style="font-size:clamp(1.3rem,2.4vw,1.9rem)"${f(ctx, "title")}>${rich(p.title)}</h3>
      <div class="cdown" data-lf-countdown data-minutes="${mins}">
        <div class="cdown__u"><div class="cdown__n" data-h>00</div><div class="cdown__l">horas</div></div>
        <div class="cdown__u"><div class="cdown__n" data-m>${String(mins).padStart(2, "0")}</div><div class="cdown__l">min</div></div>
        <div class="cdown__u"><div class="cdown__n" data-s>00</div><div class="cdown__l">seg</div></div>
      </div>
      ${p.subtitle ? `<p class="small muted" style="margin-top:14px"${f(ctx, "subtitle")}>${rich(p.subtitle)}</p>` : ""}
      ${bar}</div></section>`;
  },

  /* ---------------- conversión ---------------- */
  codForm: (ctx, b, p) => {
    const cur = ctx.spec.product.currency || "COP";
    const price = Number(ctx.spec.product.price) || 0;
    const ship = Number(p.shippingPrice) || 0;
    const sp = ctx.spec;

    // Variantes (color/talla/modelo): pills de selección simple por grupo.
    // Solo si el producto las trae y el bloque no las apagó.
    const variants = (Array.isArray((sp.product as any).variants) ? (sp.product as any).variants : [])
      .filter((v: any) => v?.name && Array.isArray(v.options) && v.options.length > 0)
      .map((v: any) => ({ name: String(v.name).slice(0, 24), options: v.options.map((o: any) => String(o).slice(0, 24)).filter(Boolean).slice(0, 8) }))
      .filter((v: any) => v.options.length > 0)
      .slice(0, 3);
    const showVariants = (p as any).askVariants !== false && variants.length > 0;
    const comboInicial = variants.map((v: any) => v.options[0]).join(" / ");
    const varHtml = showVariants
      ? variants
          .map(
            (v: any) => `<div class="field"><label>${esc(v.name)}</label>
        <div class="vpills" data-lf-variant="${esc(v.name)}" role="group" aria-label="${esc(v.name)}">
          ${v.options.map((o: any, i: number) => `<button type="button" data-val="${esc(o)}" aria-pressed="${i === 0 ? "true" : "false"}">${esc(o)}</button>`).join("")}
        </div></div>`,
          )
          .join("")
      : "";

    const fieldsHtml = `
      <div class="frow">
        <div class="field"><label for="lf-name">Nombre *</label><input class="input" id="lf-name" name="name" required autocomplete="given-name" placeholder="Tu nombre"></div>
        <div class="field"><label for="lf-surname">Apellido *</label><input class="input" id="lf-surname" name="surname" required autocomplete="family-name" placeholder="Tu apellido"></div>
      </div>
      <div class="field"><label for="lf-phone">WhatsApp / Celular *</label><input class="input" id="lf-phone" name="phone" required inputmode="tel" autocomplete="tel" placeholder="300 123 4567"></div>
      ${p.askEmail ? `<div class="field"><label for="lf-email">Correo</label><input class="input" id="lf-email" name="email" type="email" autocomplete="email" placeholder="tu@correo.com"></div>` : ""}
      ${p.askDni ? `<div class="field"><label for="lf-dni">Cédula</label><input class="input" id="lf-dni" name="dni" inputmode="numeric" placeholder="Número de documento"></div>` : ""}
      <div class="frow">
        <div class="field"><label for="lf-state">Departamento *</label><select class="select" id="lf-state" name="state" required data-lf-state><option value="">Selecciona…</option></select></div>
        <div class="field"><label for="lf-city">Ciudad *</label><select class="select" id="lf-city" name="city" required data-lf-city><option value="">Selecciona…</option></select></div>
      </div>
      <div class="field"><label for="lf-dir">Dirección completa *</label><input class="input" id="lf-dir" name="dir" required autocomplete="street-address" placeholder="Calle 10 # 5-20, Apto 301, Barrio…"></div>
      ${p.askNotes ? `<div class="field"><label for="lf-notes">Indicaciones para el mensajero</label><textarea class="input" id="lf-notes" name="notes" placeholder="Punto de referencia, horario preferido…"></textarea></div>` : ""}
      ${varHtml}
      ${
        p.askQuantity
          ? `<div class="field"><label>Cantidad</label><div class="qty"><button type="button" data-lf-qty="-1" aria-label="Quitar">−</button><input name="quantity" value="1" inputmode="numeric" data-lf-qtyinput><button type="button" data-lf-qty="1" aria-label="Agregar">+</button></div></div>`
          : `<input type="hidden" name="quantity" value="1" data-lf-qtyinput>`
      }
      <label class="consent"><input type="checkbox" name="consent" required><span>${rich(sp.settings.consentText)}</span></label>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn--primary btn--lg btn--block" type="submit"><span${f(ctx, "submitText")}>${rich(p.submitText)}</span></button>
      <div class="formnote"${f(ctx, "securityNote")}>${rich(p.securityNote)}</div>
      <div class="formmsg" data-lf-msg></div>`;

    const summary =
      p.showSummary && price
        ? `<div class="summary">
        <div class="srow"><span>${esc(sp.product.name || "Producto")} <span data-lf-sumqty>× 1</span></span><span data-lf-sumsub>${money(price, cur)}</span></div>
        ${showVariants ? `<div class="srow"><span>Variante</span><span data-lf-sumvar>${esc(comboInicial)}</span></div>` : ""}
        <div class="srow"><span>Envío</span><span style="color:var(--ok);font-weight:600"${f(ctx, "shippingLabel")}>${ship ? money(ship, cur) : rich(p.shippingLabel)}</span></div>
        <div class="srow srow--total"><span>Pagas al recibir</span><span data-lf-sumtotal>${money(price + ship, cur)}</span></div>
      </div>`
        : "";

    const formEl = `<form class="form" data-lf-form
      data-endpoint="${esc(sp.settings.endpoint || "")}"
      data-site="${esc(sp.id)}" data-slug="${esc(sp.slug)}"
      data-unit-price="${price}" data-shipping="${ship}" data-currency="${esc(cur)}"
      data-success="${esc(sp.settings.integration.successMessage)}"
      data-redirect="${esc(sp.settings.integration.redirectUrl || "")}"
      data-variation-map='${esc(JSON.stringify((sp.product as any).dropiVariationMap || {})).replace(/'/g, "&#39;")}'
      data-whatsapp="${esc(String(sp.settings.whatsapp || "").replace(/\D/g, ""))}">
      ${fieldsHtml}</form>`;

    if (b.variant === "split") {
      return `<section ${secAttrs(ctx, b)}><a id="pedido"></a><div class="wrap"><div class="split" style="align-items:start">
        <div class="reveal">${p.eyebrow ? `<p class="eyebrow"${f(ctx, "eyebrow")}>${rich(p.eyebrow)}</p>` : ""}
          <h2 class="h2"${f(ctx, "title")}>${rich(p.title)}</h2>
          <p class="lead"${f(ctx, "subtitle")}>${rich(p.subtitle)}</p>
          <div style="margin-top:26px">${summary}</div></div>
        <div class="formcard reveal">${formEl}</div>
      </div></div></section>`;
    }
    return `<section ${secAttrs(ctx, b)}><a id="pedido"></a><div class="wrap" style="max-width:620px">
      ${head(ctx, p)}
      <div class="formcard reveal">${summary ? summary + '<div style="height:18px"></div>' : ""}${formEl}</div>
    </div></section>`;
  },

  leadForm: (ctx, b, p) => {
    const sp = ctx.spec;
    const inner = `<form class="form" data-lf-form data-kind="lead"
      data-endpoint="${esc(sp.settings.endpoint || "")}" data-site="${esc(sp.id)}" data-slug="${esc(sp.slug)}"
      data-success="${esc(sp.settings.integration.successMessage)}"
      data-redirect="${esc(sp.settings.checkout.url || sp.settings.integration.redirectUrl || "")}">
      ${p.askName ? `<div class="field"><label for="lfl-name">Nombre</label><input class="input" id="lfl-name" name="name" required placeholder="Tu nombre"></div>` : ""}
      <div class="field"><label for="lfl-email">Correo</label><input class="input" id="lfl-email" name="email" type="email" required placeholder="tu@correo.com"></div>
      ${p.askPhone ? `<div class="field"><label for="lfl-phone">Teléfono</label><input class="input" id="lfl-phone" name="phone" inputmode="tel" placeholder="+57 300 123 4567"></div>` : ""}
      ${p.askCompany ? `<div class="field"><label for="lfl-co">Empresa</label><input class="input" id="lfl-co" name="company" placeholder="Nombre de la empresa"></div>` : ""}
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn--primary btn--lg btn--block" type="submit"><span${f(ctx, "submitText")}>${rich(p.submitText)}</span></button>
      ${p.note ? `<div class="formnote"${f(ctx, "note")}>${rich(p.note)}</div>` : ""}
      <div class="formmsg" data-lf-msg></div></form>`;
    return `<section ${secAttrs(ctx, b)}><a id="empezar"></a><div class="wrap" style="max-width:${b.variant === "card" ? "560px" : "720px"}">
      ${head(ctx, p)}<div class="${b.variant === "card" ? "formcard" : ""} reveal">${inner}</div></div></section>`;
  },

  faq: (ctx, b, p) => {
    const items = list(p, "items");
    const det = (x: any, i: number) =>
      `<details${i === 0 ? " open" : ""}><summary${f(ctx, `items.${i}.q`)}>${rich(x.q)}</summary><div class="acc__b"${f(ctx, `items.${i}.a`)}>${rich(x.a)}</div></details>`;
    if (b.variant === "columns") {
      const half = Math.ceil(items.length / 2);
      return `<section ${secAttrs(ctx, b)}><div class="wrap">${head(ctx, p)}
        <div class="grid g2"><div class="acc reveal">${items.slice(0, half).map(det).join("")}</div>
        <div class="acc reveal">${items.slice(half).map((x: any, i: number) => det(x, i + half)).join("")}</div></div></div></section>`;
    }
    return `<section ${secAttrs(ctx, b)}><div class="wrap" style="max-width:820px">${head(ctx, p)}
      <div class="acc reveal">${items.map(det).join("")}</div></div></section>`;
  },

  ctaFinal: (ctx, b, p) => {
    const body = `${p.eyebrow ? `<p class="eyebrow"${f(ctx, "eyebrow")}>${rich(p.eyebrow)}</p>` : ""}
      <h2 class="h1" style="font-size:clamp(2rem,4.4vw,3.3rem)"${f(ctx, "title")}>${rich(p.title)}</h2>
      ${p.subtitle ? `<p class="lead"${f(ctx, "subtitle")}>${rich(p.subtitle)}</p>` : ""}
      <div class="cta-row">${btn(ctx, p.ctaText, p.ctaHref, "primary", "ctaText", true)}</div>
      ${p.ctaSub ? `<p class="cta-sub"${f(ctx, "ctaSub")}>${rich(p.ctaSub)}</p>` : ""}`;
    if (b.variant === "split") {
      return `<section ${secAttrs(ctx, b)}><div class="wrap"><div class="split">
        <div class="reveal">${body}</div><div class="reveal">${img(p.image, "")}</div></div></div></section>`;
    }
    const cls = b.variant === "gradient" ? "sec--gradient" : "";
    return `<section class="sec ${cls}"${ctx.mode === "edit" ? ` data-lf-b="${esc(b.id)}" data-lf-type="ctaFinal"` : ""} id="${esc(b.id)}">
      <div class="wrap ta-c reveal" style="max-width:760px">${body}</div></section>`;
  },
};

function videoEmbed(url: string, poster?: string): string {
  const u = String(url || "");
  if (!u) return poster ? img(poster, "", "", true) : `<div class="ph" style="aspect-ratio:16/9">Agrega la URL del video</div>`;
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0" title="Video" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `<iframe src="https://player.vimeo.com/video/${vm[1]}" title="Video" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u))
    return `<video controls playsinline preload="metadata"${poster ? ` poster="${esc(poster)}"` : ""}><source src="${esc(u)}"></video>`;
  return `<iframe src="${esc(u)}" title="Video" allowfullscreen loading="lazy"></iframe>`;
}

export function renderBlock(ctx: Ctx, b: Block): string {
  if (b.visible === false) return "";
  const fn = R[b.type];
  if (!fn) {
    return ctx.mode === "edit"
      ? `<section class="sec" data-lf-b="${esc(b.id)}"><div class="wrap"><div class="card">Bloque desconocido: <b>${esc(b.type)}</b></div></div></section>`
      : "";
  }
  const p = withDefaults(b.type, b.props);
  MODO = ctx.mode;
  try {
    return fn(ctx, b, p);
  } catch (e) {
    return ctx.mode === "edit"
      ? `<section class="sec" data-lf-b="${esc(b.id)}"><div class="wrap"><div class="card" style="border-color:var(--danger)">Error al pintar <b>${esc(b.type)}</b>: ${esc(String(e))}</div></div></section>`
      : "";
  }
}

export const RENDERABLE_TYPES = Object.keys(R);
