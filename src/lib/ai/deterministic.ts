import { uid, slugify, type Block, type PageSpec } from "../schema";
import { defaultsFor } from "../blocks/catalog";
import { themeFromPreset, suggestPreset } from "../theme";
import { pickTemplate } from "../templates";
import { money } from "../render/blocks";
import { parseBrief, BENEFIT_BY_CATEGORY, ICONS_BY_CATEGORY, type Brief, HEADLINE_DIGITAL, HEADLINE_SAAS, HEADLINE_SERVICE } from "./brief";

/* ------------------------------------------------------------------ *
 *  Generador determinista: prompt -> PageSpec sin LLM.
 *  Sirve de (a) fallback cuando no hay API key,
 *           (b) andamio que el LLM después reescribe,
 *           (c) modo "rápido y gratis" del producto.
 * ------------------------------------------------------------------ */

function B(type: string, variant: string, props: Record<string, any> = {}): Block {
  return { id: uid(type.slice(0, 3)), type, variant, visible: true, props: { ...defaultsFor(type), ...props } };
}

const CTA_BY_VERTICAL: Record<string, string> = {
  cod: "Pedir contra entrega",
  digital: "Quiero acceder ahora",
  saas: "Empezar gratis",
  service: "Agendar una llamada",
};

export function generateDeterministic(prompt: string, overrides: Partial<PageSpec> = {}): PageSpec {
  const brief = parseBrief(prompt);
  const template = pickTemplate(prompt, brief.vertical);
  const presetId = template?.preset || suggestPreset(prompt, brief.vertical);
  const theme = themeFromPreset(presetId);
  const blocks =
    brief.vertical === "cod" ? codBlocks(brief)
      : brief.vertical === "digital" ? digitalBlocks(brief)
        : brief.vertical === "saas" ? saasBlocks(brief)
          : serviceBlocks(brief);

  const spec: PageSpec = {
    schemaVersion: 1,
    id: overrides.id ?? uid("site"),
    name: brief.productName,
    slug: slugify(brief.productName),
    vertical: brief.vertical,
    locale: "es",
    meta: {
      title: `${brief.productName} — ${titleTag(brief)}`,
      description: metaDesc(brief),
      ogImage: "",
    },
    product: {
      name: brief.productName,
      sku: "",
      price: brief.price,
      compareAtPrice: brief.compareAtPrice,
      currency: brief.currency,
      images: [],
    },
    settings: {
      whatsapp: brief.whatsapp,
      whatsappMessage: `Hola, quiero información sobre ${brief.productName} 👋`,
      endpoint: "",
      consentText:
        "Autorizo el tratamiento de mis datos personales para gestionar mi pedido, conforme a la Política de Privacidad.",
      integration: {
        provider: brief.vertical === "cod" ? "dropi" : "webhook",
        webhookUrl: "",
        successMessage:
          brief.vertical === "cod"
            ? "¡Pedido recibido! Te escribimos por WhatsApp en los próximos minutos para confirmarlo."
            : "¡Listo! Revisa tu correo, te acabamos de enviar el acceso.",
        redirectUrl: "",
      },
      checkout: { provider: "none", url: "" },
      pixels: { metaPixelId: "", tiktokPixelId: "", ga4Id: "", googleAdsId: "", customHead: "" },
    },
    theme,
    blocks,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  return spec;
}

/* ----------------------------- textos ----------------------------- */

function titleTag(b: Brief): string {
  switch (b.vertical) {
    case "cod": return "Pide hoy y paga al recibir";
    case "digital": return "Acceso inmediato";
    case "saas": return "Empieza gratis hoy";
    default: return "Agenda tu diagnóstico gratis";
  }
}
function metaDesc(b: Brief): string {
  const ben = BENEFIT_BY_CATEGORY[b.category]?.[0] ?? "la solución que buscabas";
  return b.vertical === "cod"
    ? `${b.productName}: ${ben}. Pago contra entrega, envío en 24–72 h y garantía de 30 días.`
    : `${b.productName}: ${ben}. Empieza hoy mismo.`;
}

function ben(b: Brief, i: number): string {
  const arr = BENEFIT_BY_CATEGORY[b.category] ?? BENEFIT_BY_CATEGORY.general;
  return arr[i % arr.length];
}
function ico(b: Brief, i: number): string {
  const arr = ICONS_BY_CATEGORY[b.category] ?? ICONS_BY_CATEGORY.general;
  return arr[i % arr.length];
}

function benefitItems(b: Brief, n = 3) {
  const arr = BENEFIT_BY_CATEGORY[b.category] ?? BENEFIT_BY_CATEGORY.general;
  const titles = ["Resultado que se nota", "Sin complicaciones", "Hecho para durar", "Soporte real", "Precio justo", "Fácil de usar"];
  return Array.from({ length: n }, (_, i) => ({
    icon: ico(b, i),
    title: titles[i % titles.length],
    text: capitalize(arr[i % arr.length]) + ".",
  }));
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ----------------------------- COD ----------------------------- */

function codBlocks(b: Brief): Block[] {
  const cur = b.currency;
  const p1 = b.price;
  const p2 = Math.round(p1 * 1.7 / 100) * 100;
  const p3 = Math.round(p1 * 2.3 / 100) * 100;
  const save2 = b.compareAtPrice * 2 - p2;
  const save3 = b.compareAtPrice * 3 - p3;

  return [
    B("announcement", "gradient", { text: `🚚 Envío GRATIS a todo el país · Pagas al recibir`, dismissible: true }),
    B("navbar", "minimal", { logoText: b.productName, ctaText: "Pedir ahora", ctaHref: "#pedido" }),
    B("hero", "product", {
      eyebrow: "Pago contra entrega",
      title: `${b.productName}: ${ben(b, 0)}`,
      subtitle: `Diseñado para ${b.audience || "quienes buscan una solución que de verdad funcione"}. Recíbelo en 24–72 horas y paga solo cuando lo tengas en tus manos.`,
      ctaText: "Pedir contra entrega",
      ctaHref: "#pedido",
      ctaSub: "Sin pagos anticipados · Garantía de 30 días",
      price: b.price,
      compareAtPrice: b.compareAtPrice,
      rating: 4.8,
      ratingCount: "2.147",
      bullets: [
        { text: capitalize(ben(b, 0)) },
        { text: capitalize(ben(b, 1)) },
        { text: "Envío gratis y pago contra entrega en todo el país" },
      ],
    }),
    B("trustIcons", "row", {}),
    B("benefits", "grid", {
      eyebrow: "Beneficios",
      title: `Por qué ${b.productName} sí funciona`,
      subtitle: "",
      items: benefitItems(b, 3),
      bg: "surface",
    }),
    B("beforeAfter", "columns", {
      title: "La diferencia se nota desde el primer día",
      beforeLabel: "Antes",
      afterLabel: `Con ${b.productName}`,
      before: [{ text: "Gastas en soluciones que no duran" }, { text: "Pierdes tiempo probando opciones" }, { text: "El problema siempre vuelve" }],
      after: [{ text: capitalize(ben(b, 0)) }, { text: capitalize(ben(b, 1)) }, { text: "Resultado que se mantiene" }],
    }),
    B("reviewsUgc", "grid", {
      title: `Más de 2.000 clientes ya lo tienen`,
      rating: 4.8,
      ratingCount: "2.147",
      bg: "surface",
    }),
    B("comparison", "duel", {
      title: "Nosotros vs. el genérico del mercado",
      usLabel: b.productName,
      themLabel: "Producto genérico",
      rows: [
        { feature: "Pagas solo cuando lo recibes", themFeature: "Te toca pagar por adelantado", us: "sí", them: "no" },
        { feature: "Garantía de 30 días", themFeature: "Sin garantía: si falla, lo perdiste", us: "sí", them: "no" },
        { feature: "Soporte por WhatsApp", themFeature: "Soporte que nunca responde", us: "sí", them: "no" },
        { feature: "Envío en 24–72 horas", themFeature: "Envío de 7 a 15 días hábiles", us: "sí", them: "7–15 días" },
      ],
    }),
    B("bundle", "cards", {
      eyebrow: "Oferta de hoy",
      title: "Mientras más llevas, menos pagas",
      subtitle: "Envío gratis en todas las opciones · Pagas al recibir",
      currency: cur,
      options: [
        { label: "1 unidad", qty: 1, price: p1, compareAtPrice: b.compareAtPrice, featured: false, note: "Para probarlo" },
        { label: "2 unidades", qty: 2, price: p2, compareAtPrice: b.compareAtPrice * 2, badge: "Más vendido", featured: true, note: `Ahorras ${money(save2, cur)}` },
        { label: "3 unidades", qty: 3, price: p3, compareAtPrice: b.compareAtPrice * 3, badge: "Mejor precio", featured: false, note: `Ahorras ${money(save3, cur)}` },
      ],
      ctaText: "Pedir contra entrega",
      ctaHref: "#pedido",
    }),
    B("countdown", "block", {
      title: "Esta oferta termina en",
      subtitle: "Después de este tiempo el precio vuelve a su valor normal.",
      minutes: 15,
      stockLeft: 7,
      stockTotal: 40,
      bg: "accent",
    }),
    B("codForm", "split", {
      eyebrow: "Último paso",
      title: "Completa tus datos y paga al recibir",
      subtitle: "Te llamamos o escribimos por WhatsApp para confirmar antes de despachar. No pagas nada ahora.",
      submitText: "Confirmar pedido contra entrega",
    }),
    B("guarantee", "card", {
      badge: "30 días",
      title: "Si no te convence, te devolvemos el dinero",
      body: `Prueba ${b.productName} durante 30 días. Si no cumple lo que prometemos, escríbenos y coordinamos la recogida sin costo. Así de simple.`,
      bg: "default",
    }),
    B("faq", "accordion", {
      eyebrow: "Dudas",
      title: "Preguntas frecuentes",
      items: [
        { q: "¿Realmente pago cuando lo recibo?", a: "Sí. No pagas absolutamente nada ahora. Entregas el dinero al mensajero en el momento de la entrega." },
        { q: "¿Cuánto tarda el envío?", a: "Entre 24 y 72 horas hábiles según tu ciudad. Te enviamos el número de guía por WhatsApp apenas se despacha." },
        { q: "¿Hacen envíos a todo el país?", a: "Sí, cubrimos todo el territorio nacional con nuestras transportadoras aliadas." },
        { q: "¿Y si no me gusta o llega con algún problema?", a: "Tienes 30 días de garantía. Escríbenos por WhatsApp y coordinamos el cambio o la devolución sin costo." },
        { q: "¿Necesito dar datos de tarjeta?", a: "No. Solo tu nombre, teléfono y dirección de entrega. Nada más." },
      ],
      bg: "surface",
    }),
    B("ctaFinal", "gradient", {
      title: `Pide tu ${b.productName} hoy`,
      subtitle: "Stock limitado a este precio. Pagas cuando lo recibes.",
      ctaText: "Pedir contra entrega",
      ctaHref: "#pedido",
      ctaSub: "Envío gratis · Garantía de 30 días · Soporte por WhatsApp",
    }),
    B("footer", "simple", { brand: b.productName, tagline: metaDesc(b), copyright: `© ${new Date().getFullYear()} ${b.productName}. Todos los derechos reservados.` }),
    B("stickyCta", "bar", { label: "Pago contra entrega", price: b.price, compareAtPrice: b.compareAtPrice, ctaText: "Pedir ahora", ctaHref: "#pedido" }),
    ...(b.whatsapp ? [B("whatsappFab", "pill", { phone: b.whatsapp, label: "Escríbenos", message: `Hola, quiero información sobre ${b.productName} 👋` })] : []),
  ];
}

/* ----------------------------- DIGITAL ----------------------------- */

function digitalBlocks(b: Brief): Block[] {
  const cur = b.currency === "COP" ? "USD" : b.currency;
  const price = cur === "USD" ? Math.max(17, Math.round(b.price > 1000 ? b.price / 4000 : b.price)) : b.price;
  return [
    B("announcement", "solid", { text: "🎓 Cupos limitados para esta cohorte · Acceso inmediato", dismissible: true }),
    B("navbar", "minimal", { logoText: b.productName, ctaText: "Quiero entrar", ctaHref: "#oferta" }),
    B("hero", "vsl", {
      eyebrow: `${b.productName} · Acceso inmediato`,
      title: HEADLINE_DIGITAL[b.category] ?? HEADLINE_DIGITAL.general,
      subtitle: `El método paso a paso para ${b.audience || "quienes ya intentaron de todo"} — sin teoría de relleno, solo lo que mueve la aguja.`,
      ctaText: CTA_BY_VERTICAL.digital,
      ctaHref: "#oferta",
      ctaSub: "Acceso de por vida · Garantía de 14 días",
      videoUrl: "",
      rating: 4.9,
      ratingCount: "860",
    }),
    B("logos", "row", { title: "Nuestros estudiantes trabajan en" }),
    B("problem", "cards", {
      eyebrow: "El problema",
      title: "Si esto te suena familiar, no es culpa tuya",
      items: [
        { icon: "🌀", title: "Información dispersa", text: "Mil videos gratis y ninguno te dice en qué orden hacer las cosas." },
        { icon: "⏳", title: "Avanzas y te estancas", text: "Empiezas con energía y a las dos semanas vuelves al punto de partida." },
        { icon: "🙈", title: "Nadie te corrige", text: "Sin feedback real no sabes si vas bien hasta que ya perdiste meses." },
      ],
      bg: "surface",
    }),
    B("benefits", "list", {
      eyebrow: "Qué cambia",
      title: "Lo que vas a poder hacer al terminar",
      items: benefitItems(b, 4),
    }),
    B("curriculum", "accordion", {
      title: "El temario completo",
      subtitle: "Tres módulos, cero relleno.",
      items: [
        { title: "Módulo 1 · Fundamentos que nadie te explica", text: "Lo mínimo indispensable para no perder tiempo ni dinero en el camino.", meta: "6 lecciones · 48 min" },
        { title: "Módulo 2 · El método aplicado paso a paso", text: "Ejecutamos juntos, con plantillas y ejemplos reales que puedes copiar.", meta: "9 lecciones · 1 h 12 min" },
        { title: "Módulo 3 · Cómo escalar el resultado", text: "Qué hacer cuando ya funciona para multiplicarlo sin romperlo.", meta: "7 lecciones · 55 min" },
      ],
      bg: "surface",
    }),
    B("testimonials", "featured", {
      eyebrow: "Resultados",
      title: "Lo que lograron otros antes que tú",
      items: [
        { quote: "Apliqué solo el módulo 2 y en tres semanas ya había recuperado la inversión. El orden de los contenidos es lo que marca la diferencia.", name: "Carolina T.", role: "Emprendedora · Bogotá", rating: 5, result: "ROI en 3 semanas" },
        { quote: "Es la primera vez que termino un curso completo. Cada lección es corta y accionable.", name: "Julián R.", role: "Freelancer · Medellín", rating: 5 },
        { quote: "El soporte en la comunidad vale el precio por sí solo.", name: "Marcela D.", role: "Diseñadora · Cali", rating: 5 },
      ],
    }),
    B("valueStack", "list", {
      title: "Esto es todo lo que recibes hoy",
      currency: cur,
      items: [
        { title: `${b.productName} — programa completo`, text: "Acceso de por vida y actualizaciones incluidas", value: price * 3, bonus: false },
        { title: "Plantillas y recursos descargables", text: "Listas para usar desde el día 1", value: Math.round(price * 1.2), bonus: true },
        { title: "Comunidad privada", text: "Resuelve dudas con el equipo y otros alumnos", value: Math.round(price * 1.5), bonus: true },
      ],
      totalLabel: "Valor total",
      todayLabel: "Hoy pagas",
      todayPrice: price,
      bg: "default",
    }),
    B("guarantee", "card", {
      badge: "14 días",
      title: "Garantía incondicional de 14 días",
      body: "Entra, mira todo el contenido y aplícalo. Si no es para ti, escríbenos dentro de los primeros 14 días y te devolvemos el 100% sin preguntas.",
      bg: "surface",
    }),
    B("pricing", "single", {
      eyebrow: "Inscripción",
      title: "Empieza hoy mismo",
      showToggle: false,
      plans: [
        {
          name: "Acceso completo", price, priceAnnual: price, currency: cur, period: " pago único",
          description: "Todo incluido, para siempre", featured: true, badge: "Cupos limitados",
          ctaText: "Quiero mi acceso", ctaHref: "#",
          features: [{ text: "Programa completo" }, { text: "Plantillas y recursos" }, { text: "Comunidad privada" }, { text: "Actualizaciones de por vida" }],
        },
      ],
      bg: "default",
    }),
    B("faq", "accordion", {
      eyebrow: "Dudas",
      title: "Preguntas frecuentes",
      items: [
        { q: "¿Cuándo tengo acceso?", a: "Inmediatamente después del pago recibes un correo con tus credenciales." },
        { q: "¿Por cuánto tiempo puedo verlo?", a: "El acceso es de por vida, incluidas las actualizaciones futuras." },
        { q: "¿Necesito experiencia previa?", a: "No. El módulo 1 parte desde cero y avanza progresivamente." },
        { q: "¿Qué pasa si no me sirve?", a: "Tienes 14 días de garantía incondicional. Escribes, te devolvemos todo." },
      ],
      bg: "surface",
    }),
    B("ctaFinal", "gradient", {
      title: "Tu próxima versión empieza hoy",
      subtitle: "Acceso inmediato · Garantía de 14 días · Pago único",
      ctaText: CTA_BY_VERTICAL.digital,
      ctaHref: "#oferta",
    }),
    B("footer", "simple", { brand: b.productName, copyright: `© ${new Date().getFullYear()} ${b.productName}.`, disclaimer: "Los resultados mostrados corresponden a casos reales y no constituyen una garantía de resultados futuros." }),
  ];
}

/* ----------------------------- SAAS ----------------------------- */

function saasBlocks(b: Brief): Block[] {
  const cur = b.currency === "COP" ? "USD" : b.currency;
  const base = cur === "USD" ? 19 : b.price;
  return [
    B("navbar", "links", {
      logoText: b.productName,
      links: [{ label: "Producto", href: "#features" }, { label: "Precios", href: "#oferta" }, { label: "FAQ", href: "#faq" }],
      ctaText: "Empezar gratis",
      ctaHref: "#empezar",
    }),
    B("hero", "split", {
      eyebrow: `${b.productName} · Nuevo`,
      title: HEADLINE_SAAS[b.category] ?? HEADLINE_SAAS.general,
      subtitle: `La plataforma que usan ${b.audience || "los equipos que no quieren perder tiempo"} para dejar de hacer a mano lo que puede hacerse solo.`,
      ctaText: "Empezar gratis",
      ctaHref: "#empezar",
      ctaSub: "Sin tarjeta de crédito · Listo en 2 minutos",
      cta2Text: "Ver demo",
      cta2Href: "#demo",
      bullets: [{ text: "Se instala en minutos, no en semanas" }, { text: "Integra con lo que ya usas" }, { text: "Cancela cuando quieras" }],
    }),
    B("logos", "marquee", { title: "Equipos que ya lo usan" }),
    B("bento", "grid5", {
      eyebrow: "Características",
      title: "Todo lo que necesitas, sin el ruido",
      items: [
        { icon: ico(b, 0), title: "Automatización real", text: "Define la regla una vez y olvídate del resto.", span: "2" },
        { icon: ico(b, 1), title: "Integraciones", text: "Conecta tu stack actual en un clic.", span: "1" },
        { stat: "+37%", title: "Más productividad", text: "Promedio reportado por equipos en los primeros 60 días.", span: "1" },
        { icon: ico(b, 2), title: "Seguridad de verdad", text: "Cifrado en tránsito y en reposo, roles y auditoría.", span: "2" },
      ],
    }),
    B("steps", "horizontal", {
      eyebrow: "Cómo funciona",
      title: "Operativo en tres pasos",
      items: [
        { title: "Conecta", text: "Enlaza tus herramientas actuales en menos de 5 minutos." },
        { title: "Configura", text: "Elige una plantilla o define tus propias reglas." },
        { title: "Escala", text: "Mide resultados y replica lo que funciona." },
      ],
      bg: "surface",
    }),
    B("stats", "row", { items: [{ value: "12.400+", label: "Usuarios activos" }, { value: "4.8/5", label: "Calificación media" }, { value: "99.9%", label: "Disponibilidad" }, { value: "2 min", label: "Tiempo de setup" }] }),
    B("testimonials", "grid", {
      eyebrow: "Clientes",
      title: "Lo que dicen los equipos que ya migraron",
      bg: "surface",
    }),
    B("pricing", "tiers", {
      eyebrow: "Precios",
      title: "Planes que crecen contigo",
      subtitle: "Sin permanencia. Cambia o cancela cuando quieras.",
      showToggle: true,
      annualDiscountLabel: "2 meses gratis",
      plans: [
        { name: "Starter", price: base, priceAnnual: Math.round(base * 0.8), currency: cur, period: "/mes", description: "Para empezar hoy", featured: false, ctaText: "Empezar gratis", ctaHref: "#empezar", features: [{ text: "1 proyecto" }, { text: "Hasta 3 usuarios" }, { text: "Soporte por email" }] },
        { name: "Pro", price: base * 3, priceAnnual: Math.round(base * 2.4), currency: cur, period: "/mes", description: "El más elegido", featured: true, badge: "Más popular", ctaText: "Probar 14 días", ctaHref: "#empezar", features: [{ text: "Proyectos ilimitados" }, { text: "Usuarios ilimitados" }, { text: "Todas las integraciones" }, { text: "Soporte prioritario" }] },
        { name: "Business", price: base * 7, priceAnnual: Math.round(base * 5.6), currency: cur, period: "/mes", description: "Para equipos grandes", featured: false, ctaText: "Hablar con ventas", ctaHref: "#empezar", features: [{ text: "Todo en Pro" }, { text: "SSO y roles avanzados" }, { text: "SLA y soporte dedicado" }] },
      ],
    }),
    B("leadForm", "card", {
      title: "Crea tu cuenta en 30 segundos",
      subtitle: "Sin tarjeta. Sin llamadas de ventas.",
      submitText: "Crear mi cuenta gratis",
      askName: true,
      askCompany: true,
      note: "Al crear tu cuenta aceptas los términos del servicio.",
      bg: "surface",
    }),
    B("faq", "columns", {
      eyebrow: "Dudas",
      title: "Preguntas frecuentes",
      items: [
        { q: "¿Necesito tarjeta para la prueba?", a: "No. Puedes usar el plan gratuito indefinidamente y subir de plan cuando lo necesites." },
        { q: "¿Puedo cancelar cuando quiera?", a: "Sí, desde el panel y en un clic. Sin permanencia ni penalizaciones." },
        { q: "¿Mis datos están seguros?", a: "Cifrado TLS en tránsito y AES-256 en reposo, con backups diarios y control de accesos por rol." },
        { q: "¿Hacen migración desde otra herramienta?", a: "Sí. En los planes Pro y Business el equipo te acompaña en la migración sin costo." },
      ],
    }),
    B("ctaFinal", "gradient", {
      title: "Empieza gratis hoy",
      subtitle: "Configúralo en 2 minutos y mira la diferencia en la primera semana.",
      ctaText: "Crear mi cuenta",
      ctaHref: "#empezar",
      ctaSub: "Sin tarjeta de crédito · Cancela cuando quieras",
    }),
    B("footer", "columns", { brand: b.productName, tagline: metaDesc(b) }),
  ];
}

/* ----------------------------- SERVICIO ----------------------------- */

function serviceBlocks(b: Brief): Block[] {
  return [
    B("navbar", "minimal", { logoText: b.productName, ctaText: "Agendar llamada", ctaHref: "#empezar" }),
    B("hero", "split", {
      eyebrow: "Diagnóstico gratuito",
      title: HEADLINE_SERVICE[b.category] ?? HEADLINE_SERVICE.general,
      subtitle: `Trabajamos con ${b.audience || "negocios que ya facturan y quieren crecer sin romper lo que funciona"}. Diagnóstico gratuito de 30 minutos, sin compromiso.`,
      ctaText: "Agendar mi diagnóstico",
      ctaHref: "#empezar",
      ctaSub: "30 minutos · Sin costo · Sin compromiso",
      bullets: [{ text: "Plan de acción concreto en la primera llamada" }, { text: "Reportes claros, sin humo" }, { text: "Cancelas cuando quieras" }],
    }),
    B("logos", "row", { title: "Marcas con las que hemos trabajado" }),
    B("problem", "cards", {
      eyebrow: "El problema",
      title: "Por qué la mayoría se queda estancada",
      items: [
        { icon: "🎯", title: "Sin foco", text: "Se hacen muchas cosas a la vez y ninguna lo suficientemente bien." },
        { icon: "📉", title: "Sin medición", text: "No se sabe qué está funcionando, así que se repite lo que no funciona." },
        { icon: "🧩", title: "Sin sistema", text: "Todo depende de una persona y nada queda documentado." },
      ],
      bg: "surface",
    }),
    B("benefits", "alternating", { eyebrow: "Cómo ayudamos", title: "Nuestro enfoque", items: benefitItems(b, 3) }),
    B("steps", "vertical", {
      eyebrow: "Proceso",
      title: "Así trabajamos contigo",
      items: [
        { title: "Diagnóstico", text: "30 minutos para entender dónde estás y a dónde quieres llegar." },
        { title: "Plan", text: "Te entregamos una hoja de ruta priorizada, aunque no trabajes con nosotros." },
        { title: "Ejecución", text: "Implementamos, medimos y reportamos cada semana." },
      ],
      bg: "surface",
    }),
    B("testimonials", "grid", { eyebrow: "Clientes", title: "Resultados reales de clientes reales" }),
    B("stats", "cards", { items: [{ value: "+127%", label: "Crecimiento medio en 6 meses" }, { value: "48", label: "Proyectos entregados" }, { value: "4.9/5", label: "Satisfacción" }, { value: "92%", label: "Renovación" }] }),
    B("leadForm", "card", {
      title: "Agenda tu diagnóstico gratuito",
      subtitle: "Te respondemos el mismo día hábil.",
      submitText: "Quiero mi diagnóstico",
      askName: true,
      askPhone: true,
      askCompany: true,
      note: "Sin compromiso. Si no encajamos, te lo decimos de frente.",
      bg: "surface",
    }),
    B("faq", "accordion", { eyebrow: "Dudas", title: "Preguntas frecuentes" }),
    B("ctaFinal", "centered", {
      title: "Hablemos 30 minutos",
      subtitle: "Sin presentación comercial. Solo un diagnóstico honesto de tu situación.",
      ctaText: "Agendar llamada",
      ctaHref: "#empezar",
    }),
    B("footer", "simple", { brand: b.productName }),
  ];
}
