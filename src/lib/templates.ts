/* ------------------------------------------------------------------ *
 *  Plantillas de landing: recetas de estructura por nicho.
 *  Cada plantilla define el flujo de bloques + tema sugerido + tono.
 *  La IA elige plantilla según el brief; el determinista la usa
 *  como fallback. Inspirado en patrones Mastershop (social proof
 *  agresivo, comparativas, escasez, VSL, valor apilado).
 * ------------------------------------------------------------------ */

export interface TemplateStep {
  type: string;
  variant: string;
}

export interface LandingTemplate {
  id: string;
  name: string;
  vertical: "cod" | "digital" | "saas" | "service";
  hint: string;
  preset: string;
  tone: string;
  keywords: string[];
  flow: TemplateStep[];
}

const T = (type: string, variant: string): TemplateStep => ({ type, variant });

export const TEMPLATES: LandingTemplate[] = [
  /* ==================== DROPSHIPPING / COD (6) ==================== */
  {
    id: "cod-urgency",
    name: "COD Urgencia Total",
    vertical: "cod",
    hint: "Oferta flash contraentrega: anuncio + hero producto + escasez + bundle 2x1",
    preset: "urgency",
    tone: "Directo, urgente, precio primero. Frases cortas, emojis, stock limitado.",
    keywords: ["oferta", "descuento", "2x1", "urgente", "flash", "hoy", "agotado", "promo"],
    flow: [
      T("announcement", "marquee"), T("navbar", "minimal"), T("hero", "product"),
      T("trustIcons", "row"), T("countdown", "bar"), T("benefits", "grid"),
      T("gallery", "scroll"), T("reviewsUgc", "scroll"), T("comparison", "duel"),
      T("bundle", "cards"), T("countdown", "block"), T("codForm", "split"),
      T("guarantee", "banner"), T("faq", "accordion"), T("ctaFinal", "gradient"),
      T("footer", "simple"), T("stickyCta", "bar"), T("whatsappFab", "pill"),
    ],
  },
  {
    id: "cod-premium",
    name: "COD Premium Minimal",
    vertical: "cod",
    hint: "Producto aspiracional (belleza, hogar, premium): mucho aire, galería grande",
    preset: "premium",
    tone: "Elegante y aspiracional. Menos emojis, más beneficio emocional y detalle.",
    keywords: ["premium", "lujo", "belleza", "skincare", "hogar", "decor", "elegante", "reloj", "perfume"],
    flow: [
      T("announcement", "solid"), T("navbar", "centered"), T("hero", "split"),
      T("logos", "row"), T("benefits", "alternating"), T("gallery", "grid"),
      T("beforeAfter", "images"), T("testimonials", "featured"), T("comparison", "table"),
      T("bundle", "cards"), T("guarantee", "card"), T("codForm", "card"),
      T("faq", "columns"), T("ctaFinal", "centered"), T("footer", "columns"),
      T("stickyCta", "button"), T("whatsappFab", "icon"),
    ],
  },
  {
    id: "cod-video",
    name: "COD Video Vendedor",
    vertical: "cod",
    hint: "Hero con video + demo del producto en uso, ideal gadgets y cocina",
    preset: "retail",
    tone: "Demostrativo: mira cómo funciona, antes/después, preguntas que rompen objeciones.",
    keywords: ["video", "demo", "gadget", "cocina", "limpieza", "masajeador", "audífonos", "linterna"],
    flow: [
      T("announcement", "gradient"), T("navbar", "minimal"), T("hero", "vsl"),
      T("trustIcons", "cards"), T("video", "wide"), T("benefits", "list"),
      T("beforeAfter", "columns"), T("reviewsUgc", "grid"), T("stats", "row"),
      T("bundle", "cards"), T("countdown", "block"), T("codForm", "split"),
      T("guarantee", "card"), T("faq", "accordion"), T("ctaFinal", "gradient"),
      T("footer", "simple"), T("stickyCta", "bar"), T("whatsappFab", "pill"),
    ],
  },
  {
    id: "cod-comparison",
    name: "COD Comparativa Agresiva",
    vertical: "cod",
    hint: "Duelo nosotros vs otros + stats + reseñas, para nichos competidos (adelgazar, dolor)",
    preset: "urgency",
    tone: "Comparativo y retador: por qué este sí funciona y los otros no.",
    keywords: ["dolor", "adelgazar", "postura", "comparar", "original", "copia", "mejor", "versus"],
    flow: [
      T("announcement", "marquee"), T("navbar", "minimal"), T("hero", "product"),
      T("trustIcons", "row"), T("problem", "cards"), T("benefits", "grid"),
      T("comparison", "table"), T("stats", "cards"), T("testimonials", "scroll"),
      T("bundle", "rows"), T("countdown", "bar"), T("codForm", "split"),
      T("guarantee", "banner"), T("faq", "accordion"), T("ctaFinal", "split"),
      T("footer", "simple"), T("stickyCta", "bar"), T("whatsappFab", "pill"),
    ],
  },
  {
    id: "cod-bundle",
    name: "COD Bundle 2x1",
    vertical: "cod",
    hint: "Packs y escalera de precio como protagonista (lleva 2, lleva 3)",
    preset: "retail",
    tone: "Ahorro por cantidad: el pack del medio es la estrella, urgencia de stock.",
    keywords: ["pack", "combo", "kit", "2x1", "3x2", "mayor", "familia", "pareja"],
    flow: [
      T("announcement", "gradient"), T("navbar", "minimal"), T("hero", "product"),
      T("trustIcons", "row"), T("benefits", "grid"), T("gallery", "scroll"),
      T("bundle", "cards"), T("reviewsUgc", "scroll"), T("countdown", "block"),
      T("codForm", "split"), T("guarantee", "card"), T("faq", "accordion"),
      T("ctaFinal", "gradient"), T("footer", "simple"), T("stickyCta", "bar"),
      T("whatsappFab", "pill"),
    ],
  },
  {
    id: "cod-ugc",
    name: "COD Prueba Social UGC",
    vertical: "cod",
    hint: "Reseñas con foto/video al frente, estilo TikTok, para viralizar",
    preset: "mono",
    tone: "Voz de cliente real: testimonios con nombre y ciudad mandan.",
    keywords: ["viral", "tiktok", "reseñas", "opiniones", "tendencia", "famoso", "moda", "bolso", "ropa"],
    flow: [
      T("announcement", "marquee"), T("navbar", "minimal"), T("hero", "centered"),
      T("stats", "row"), T("reviewsUgc", "grid"), T("gallery", "scroll"),
      T("benefits", "list"), T("beforeAfter", "images"), T("comparison", "duel"),
      T("bundle", "cards"), T("codForm", "split"), T("guarantee", "banner"),
      T("faq", "accordion"), T("ctaFinal", "gradient"), T("footer", "simple"),
      T("stickyCta", "bar"), T("whatsappFab", "pill"),
    ],
  },
  /* ==================== DIGITAL / INFOPRODUCTO (4) ==================== */
  {
    id: "digital-vsl",
    name: "Digital VSL Directo",
    vertical: "digital",
    hint: "Video de ventas + pila de valor + precio único, para cursos y mentorías",
    preset: "vsl",
    tone: "Mentor directo: problema doloroso, promesa medible, prueba y oferta con deadline.",
    keywords: ["curso", "mentoría", "aprende", "gana dinero", "academia", "coaching", "trading"],
    flow: [
      T("announcement", "gradient"), T("navbar", "minimal"), T("hero", "vsl"),
      T("logos", "marquee"), T("problem", "cards"), T("benefits", "list"),
      T("video", "wide"), T("curriculum", "accordion"), T("testimonials", "featured"),
      T("valueStack", "cards"), T("guarantee", "banner"), T("pricing", "single"),
      T("countdown", "block"), T("faq", "accordion"), T("ctaFinal", "gradient"),
      T("footer", "columns"), T("stickyCta", "button"),
    ],
  },
  {
    id: "digital-webinar",
    name: "Digital Webinar / Reto",
    vertical: "digital",
    hint: "Captura + reto en vivo de 3-7 días, ideal para escalar con scarcity",
    preset: "obsidian",
    tone: "Evento en vivo: plazas limitadas, lo que aprenderás día por día.",
    keywords: ["webinar", "reto", "en vivo", "masterclass", "clase gratis", "workshop", "seminario"],
    flow: [
      T("announcement", "marquee"), T("navbar", "minimal"), T("hero", "centered"),
      T("countdown", "bar"), T("benefits", "grid"), T("steps", "vertical"),
      T("curriculum", "list"), T("testimonials", "grid"), T("stats", "cards"),
      T("leadForm", "card"), T("guarantee", "card"), T("faq", "columns"),
      T("ctaFinal", "split"), T("footer", "simple"), T("stickyCta", "bar"),
    ],
  },
  {
    id: "digital-ebook",
    name: "Digital Ebook / Lead Magnet",
    vertical: "digital",
    hint: "Portada + beneficios + captura simple, para ebooks y plantillas",
    preset: "fresh",
    tone: "Claro y rápido de leer: qué incluye, para quién es, descarga inmediata.",
    keywords: ["ebook", "libro", "guía", "pdf", "plantilla", "descarga", "recetario", "manual"],
    flow: [
      T("announcement", "solid"), T("navbar", "centered"), T("hero", "split"),
      T("trustIcons", "row"), T("benefits", "alternating"), T("gallery", "grid"),
      T("testimonials", "grid"), T("valueStack", "list"), T("pricing", "single"),
      T("leadForm", "inline"), T("guarantee", "card"), T("faq", "accordion"),
      T("ctaFinal", "centered"), T("footer", "simple"),
    ],
  },
  {
    id: "digital-saas",
    name: "Digital App / Software",
    vertical: "digital",
    hint: "Estilo plataforma (Mastershop): hero split + bento + métricas + planes",
    preset: "midnight",
    tone: "Producto tech: qué automatiza, números reales, integraciones, planes.",
    keywords: ["software", "app", "plataforma", "bot", "whatsapp", "automatiza", "herramienta", "saas", "sistema"],
    flow: [
      T("navbar", "links"), T("hero", "split"), T("logos", "marquee"),
      T("bento", "grid5"), T("steps", "horizontal"), T("stats", "row"),
      T("testimonials", "grid"), T("comparison", "table"), T("pricing", "tiers"),
      T("leadForm", "card"), T("faq", "columns"), T("ctaFinal", "gradient"),
      T("footer", "columns"), T("stickyCta", "button"), T("whatsappFab", "icon"),
    ],
  },
  /* ==================== SERVICIO / MARCA (2) ==================== */
  {
    id: "service-agency",
    name: "Servicio Agencia",
    vertical: "service",
    hint: "Agencias y servicios locales: problema + proceso + casos + agenda",
    preset: "clean",
    tone: "Consultivo: diagnóstico del problema, proceso en pasos, casos con números.",
    keywords: ["agencia", "servicio", "consultoría", "clínica", "abogado", "odontología", "marketing"],
    flow: [
      T("navbar", "links"), T("hero", "split"), T("logos", "row"),
      T("problem", "cards"), T("benefits", "alternating"), T("steps", "vertical"),
      T("stats", "cards"), T("testimonials", "featured"), T("pricing", "tiers"),
      T("leadForm", "card"), T("faq", "accordion"), T("ctaFinal", "split"),
      T("footer", "columns"), T("whatsappFab", "pill"),
    ],
  },
  {
    id: "saas-platform",
    name: "Plataforma Mastershop-style",
    vertical: "saas",
    hint: "Página de plataforma completa: métricas, integraciones, testimonios video, app",
    preset: "aurora",
    tone: "Plataforma líder: mercado, logística, números de clientes, prueba gratis.",
    keywords: ["marketplace", "ecommerce", "dropshipping", "proveedores", "logística", "emprendedores"],
    flow: [
      T("announcement", "gradient"), T("navbar", "links"), T("hero", "split"),
      T("logos", "marquee"), T("stats", "row"), T("bento", "grid4"),
      T("steps", "horizontal"), T("video", "wide"), T("testimonials", "scroll"),
      T("comparison", "table"), T("pricing", "tiers"), T("leadForm", "card"),
      T("faq", "columns"), T("ctaFinal", "gradient"), T("footer", "columns"),
      T("stickyCta", "button"),
    ],
  },
  {
    id: "lead-squeeze",
    name: "Lead Squeeze Minimal",
    vertical: "digital",
    hint: "Captura en una pantalla: lead magnet gratis, ebook, checklist, plantilla",
    preset: "clean",
    tone: "Mínimo y directo: qué recibes gratis, 3 bullets, formulario arriba y abajo.",
    keywords: ["gratis", "descarga", "checklist", "plantilla gratis", "guía gratis", "ebook gratis", "lead magnet"],
    flow: [
      T("announcement", "solid"), T("navbar", "minimal"), T("hero", "centered"),
      T("trustIcons", "row"), T("benefits", "list"), T("testimonials", "grid"),
      T("leadForm", "inline"), T("guarantee", "card"), T("faq", "accordion"),
      T("ctaFinal", "centered"), T("footer", "simple"),
    ],
  },
  {
    id: "lead-waitlist",
    name: "Waitlist Pre-lanzamiento",
    vertical: "saas",
    hint: "Lista de espera con contador: beta, acceso anticipado, lanzamiento",
    preset: "aurora",
    tone: "Expectativa y escasez: sé de los primeros, plazas limitadas, fecha.",
    keywords: ["lanzamiento", "preventa", "lista de espera", "proximamente", "beta", "acceso anticipado", "waitlist"],
    flow: [
      T("announcement", "gradient"), T("navbar", "minimal"), T("hero", "centered"),
      T("countdown", "bar"), T("benefits", "grid"), T("stats", "row"),
      T("testimonials", "scroll"), T("leadForm", "card"), T("faq", "accordion"),
      T("ctaFinal", "gradient"), T("footer", "simple"), T("stickyCta", "button"),
    ],
  },
  {
    id: "service-local",
    name: "Negocio Local (reserva)",
    vertical: "service",
    hint: "Restaurante, clínica, spa, barbería: galería + reseñas + reserva/WhatsApp",
    preset: "sand",
    tone: "Cercano y local: dirección, horarios, fotos reales, reserva en 1 clic.",
    keywords: ["restaurante", "reserva", "clinica", "cita", "domicilio", "menu", "hotel", "spa", "barberia", "veterinaria"],
    flow: [
      T("announcement", "solid"), T("navbar", "links"), T("hero", "split"),
      T("trustIcons", "cards"), T("gallery", "grid"), T("benefits", "alternating"),
      T("reviewsUgc", "grid"), T("stats", "cards"), T("testimonials", "featured"),
      T("leadForm", "card"), T("faq", "columns"), T("ctaFinal", "split"),
      T("footer", "columns"), T("whatsappFab", "pill"),
    ],
  },
  {
    id: "service-realestate",
    name: "Inmobiliaria (visita)",
    vertical: "service",
    hint: "Propiedades: galería, video tour, comparativa y agenda tu visita",
    preset: "clean",
    tone: "Confianza y números: ubicación, área, precio, financiación, visita guiada.",
    keywords: ["apartamento", "casa", "lote", "arriendo", "inmobiliaria", "propiedad", "inversion", "finca"],
    flow: [
      T("navbar", "links"), T("hero", "split"), T("stats", "row"),
      T("gallery", "scroll"), T("benefits", "list"), T("video", "wide"),
      T("testimonials", "featured"), T("comparison", "table"), T("leadForm", "card"),
      T("faq", "accordion"), T("ctaFinal", "gradient"), T("footer", "columns"),
      T("whatsappFab", "pill"),
    ],
  },
  {
    id: "service-fitness",
    name: "Fitness / Reto",
    vertical: "service",
    hint: "Gym y retos: transformación antes/después, planes y prueba gratis",
    preset: "emerald",
    tone: "Energía y reto: transformaciones reales, plan por niveles, empieza hoy.",
    keywords: ["gym", "gimnasio", "fitness", "reto", "bajar de peso", "entrenamiento", "crossfit", "yoga"],
    flow: [
      T("announcement", "marquee"), T("navbar", "minimal"), T("hero", "vsl"),
      T("stats", "cards"), T("beforeAfter", "images"), T("benefits", "grid"),
      T("pricing", "tiers"), T("testimonials", "scroll"), T("guarantee", "card"),
      T("countdown", "block"), T("leadForm", "card"), T("faq", "accordion"),
      T("ctaFinal", "gradient"), T("footer", "simple"), T("stickyCta", "bar"),
    ],
  },
  {
    id: "digital-newsletter",
    name: "Newsletter / Comunidad",
    vertical: "digital",
    hint: "Captación de suscriptores: boletín, comunidad, canal",
    preset: "fresh",
    tone: "Editorial y cercano: qué recibes cada semana, quién lo escribe, gratis.",
    keywords: ["newsletter", "boletin", "suscripcion", "comunidad", "canal", "email"],
    flow: [
      T("announcement", "solid"), T("navbar", "centered"), T("hero", "centered"),
      T("benefits", "list"), T("testimonials", "grid"), T("stats", "row"),
      T("valueStack", "list"), T("leadForm", "inline"), T("guarantee", "card"),
      T("faq", "accordion"), T("ctaFinal", "centered"), T("footer", "simple"),
    ],
  },
  {
    id: "saas-mobileapp",
    name: "App Móvil (descarga)",
    vertical: "saas",
    hint: "Apps iOS/Android: pantallazos, reseñas de tienda y botones de descarga",
    preset: "midnight",
    tone: "Producto móvil: qué resuelve, pantallazos, rating, descarga gratis.",
    keywords: ["app", "aplicacion", "descargar", "ios", "android", "movil", "play store"],
    flow: [
      T("navbar", "minimal"), T("hero", "split"), T("logos", "row"),
      T("gallery", "scroll"), T("benefits", "alternating"), T("reviewsUgc", "scroll"),
      T("stats", "row"), T("pricing", "tiers"), T("faq", "accordion"),
      T("ctaFinal", "gradient"), T("footer", "columns"), T("stickyCta", "button"),
    ],
  },
  {
    id: "saas-ai-tool",
    name: "Herramienta IA",
    vertical: "saas",
    hint: "SaaS de IA: hero con demo, bento de casos y planes",
    preset: "aurora",
    tone: "Tech moderno: qué automatiza, demo, integraciones, prueba gratis.",
    keywords: ["ia", "inteligencia artificial", "chatbot", "herramienta ia", "automatizacion"],
    flow: [
      T("announcement", "gradient"), T("navbar", "links"), T("hero", "centered"),
      T("logos", "marquee"), T("bento", "grid5"), T("video", "wide"),
      T("testimonials", "grid"), T("pricing", "tiers"), T("faq", "columns"),
      T("ctaFinal", "gradient"), T("footer", "columns"), T("stickyCta", "button"),
    ],
  },
  {
    id: "service-portfolio",
    name: "Portafolio / Marca personal",
    vertical: "service",
    hint: "Freelancers y creativos: trabajos, clientes y contacto",
    preset: "mono",
    tone: "Carácter y prueba: trabajos destacados, clientes, proceso, hablemos.",
    keywords: ["portafolio", "diseñador", "fotografo", "freelancer", "creativo", "marca personal"],
    flow: [
      T("navbar", "links"), T("hero", "centered"), T("logos", "row"),
      T("gallery", "grid"), T("stats", "cards"), T("testimonials", "featured"),
      T("pricing", "tiers"), T("leadForm", "card"), T("faq", "accordion"),
      T("ctaFinal", "split"), T("footer", "columns"), T("whatsappFab", "icon"),
    ],
  },
  {
    id: "cod-minimal-ads",
    name: "COD Anuncio Directo",
    vertical: "cod",
    hint: "Tráfico de anuncios: foto, precio, prueba y formulario sin distracciones",
    preset: "urgency",
    tone: "Respuesta directa: oferta clara, precio visible, pide ya.",
    keywords: ["barato", "envio gratis", "ultimas", "unidades", "oferta", "directo", "anuncio"],
    flow: [
      T("announcement", "solid"), T("navbar", "minimal"), T("hero", "centered"),
      T("trustIcons", "row"), T("benefits", "list"), T("reviewsUgc", "grid"),
      T("bundle", "rows"), T("codForm", "card"), T("guarantee", "card"),
      T("faq", "accordion"), T("ctaFinal", "centered"), T("footer", "simple"),
      T("stickyCta", "bar"), T("whatsappFab", "pill"),
    ],
  },
];

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Elige plantilla por keywords del prompt; cae a la primera del vertical. */
export function pickTemplate(prompt: string, vertical: string): LandingTemplate {
  const p = norm(prompt);
  let best: LandingTemplate | null = null;
  let bestScore = 0;
  for (const t of TEMPLATES.filter((t) => t.vertical === vertical)) {
    let score = 0;
    for (const k of t.keywords) if (p.includes(norm(k))) score += 1;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  if (best) return best;
  return TEMPLATES.find((t) => t.vertical === vertical) ?? TEMPLATES[0];
}

export function templateListForPrompt(): string {
  return TEMPLATES.map((t) => `${t.id} [${t.vertical}] ${t.name}: ${t.hint}`).join("\n");
}
