/* ------------------------------------------------------------------ *
 *  Catálogo de bloques.
 *  Una sola definición alimenta: el inspector del editor, los valores
 *  por defecto del renderer y el schema condensado que recibe la IA.
 * ------------------------------------------------------------------ */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "color"
  | "select"
  | "image"
  | "list";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  item?: Field[]; // para type === "list"
  itemLabelKey?: string;
  placeholder?: string;
  help?: string;
  max?: number; // límite de caracteres sugerido (se le pasa a la IA)
}

export interface BlockDef {
  type: string;
  label: string;
  group: "Estructura" | "Apertura" | "Persuasión" | "Prueba" | "Oferta" | "Conversión";
  icon: string;
  variants: { value: string; label: string }[];
  fields: Field[];
  defaults: Record<string, any>;
  /** Línea condensada que se inyecta al system prompt del LLM */
  ai: string;
  verticals?: string[]; // si se define, el bloque es típico de esos verticales
}

const BG_FIELD: Field = {
  key: "bg",
  label: "Fondo",
  type: "select",
  options: [
    { value: "default", label: "Base" },
    { value: "surface", label: "Superficie" },
    { value: "accent", label: "Acento" },
    { value: "gradient", label: "Degradado" },
  ],
};

const ALIGN_FIELD: Field = {
  key: "align",
  label: "Alineación",
  type: "select",
  options: [
    { value: "center", label: "Centrado" },
    { value: "left", label: "Izquierda" },
  ],
};

export const CATALOG: BlockDef[] = [
  /* ============================ ESTRUCTURA ============================ */
  {
    type: "announcement",
    label: "Barra de anuncio",
    group: "Estructura",
    icon: "⚡",
    variants: [
      { value: "solid", label: "Sólida" },
      { value: "gradient", label: "Degradado" },
      { value: "marquee", label: "Marquesina" },
    ],
    fields: [
      { key: "text", label: "Texto", type: "text", max: 80 },
      { key: "linkText", label: "Texto del enlace", type: "text", max: 24 },
      { key: "linkHref", label: "Destino", type: "text" },
      { key: "dismissible", label: "Se puede cerrar", type: "boolean" },
    ],
    defaults: {
      text: "🚚 Envío GRATIS hoy · Pagas al recibir",
      linkText: "",
      linkHref: "#oferta",
      dismissible: false,
    },
    ai: "announcement{text<=80, linkText?, linkHref?} variant: solid|gradient|marquee",
  },
  {
    type: "navbar",
    label: "Navegación",
    group: "Estructura",
    icon: "▤",
    variants: [
      { value: "minimal", label: "Mínima (logo + CTA)" },
      { value: "links", label: "Con enlaces" },
      { value: "centered", label: "Logo centrado" },
    ],
    fields: [
      { key: "logoText", label: "Logo (texto)", type: "text", max: 24 },
      { key: "logoImage", label: "Logo (imagen)", type: "image" },
      {
        key: "links",
        label: "Enlaces",
        type: "list",
        itemLabelKey: "label",
        item: [
          { key: "label", label: "Texto", type: "text" },
          { key: "href", label: "Destino", type: "text" },
        ],
      },
      { key: "ctaText", label: "Botón", type: "text", max: 24 },
      { key: "ctaHref", label: "Destino del botón", type: "text" },
      { key: "sticky", label: "Fija al hacer scroll", type: "boolean" },
    ],
    defaults: {
      logoText: "Tu Marca",
      logoImage: "",
      links: [],
      ctaText: "Pedir ahora",
      ctaHref: "#oferta",
      sticky: true,
    },
    ai: "navbar{logoText<=24, links[{label,href}], ctaText<=24, ctaHref} variant: minimal|links|centered",
  },
  {
    type: "stickyCta",
    label: "CTA fijo móvil",
    group: "Estructura",
    icon: "📌",
    variants: [
      { value: "bar", label: "Barra con precio" },
      { value: "button", label: "Solo botón" },
    ],
    fields: [
      { key: "label", label: "Etiqueta", type: "text", max: 30 },
      { key: "price", label: "Precio", type: "number" },
      { key: "compareAtPrice", label: "Precio tachado", type: "number" },
      { key: "ctaText", label: "Botón", type: "text", max: 24 },
      { key: "ctaHref", label: "Destino", type: "text" },
      { key: "onlyMobile", label: "Solo en móvil", type: "boolean" },
    ],
    defaults: {
      label: "Pago contra entrega",
      price: 0,
      compareAtPrice: 0,
      ctaText: "Pedir ahora",
      ctaHref: "#pedido",
      onlyMobile: true,
    },
    ai: "stickyCta{label<=30, price, compareAtPrice, ctaText<=24, ctaHref} variant: bar|button",
  },
  {
    type: "whatsappFab",
    label: "Botón flotante WhatsApp",
    group: "Estructura",
    icon: "💬",
    variants: [
      { value: "icon", label: "Ícono" },
      { value: "pill", label: "Píldora con texto" },
    ],
    fields: [
      { key: "label", label: "Texto", type: "text", max: 24 },
      { key: "phone", label: "Teléfono (con indicativo)", type: "text", placeholder: "573001234567" },
      { key: "message", label: "Mensaje precargado", type: "textarea" },
    ],
    defaults: { label: "Escríbenos", phone: "", message: "Hola, quiero más información 👋" },
    ai: "whatsappFab{label<=24, phone, message} variant: icon|pill",
  },
  {
    type: "footer",
    label: "Pie de página",
    group: "Estructura",
    icon: "▬",
    variants: [
      { value: "simple", label: "Simple" },
      { value: "columns", label: "Columnas" },
    ],
    fields: [
      { key: "brand", label: "Marca", type: "text", max: 24 },
      { key: "tagline", label: "Descripción", type: "textarea", max: 160 },
      {
        key: "links",
        label: "Enlaces legales",
        type: "list",
        itemLabelKey: "label",
        item: [
          { key: "label", label: "Texto", type: "text" },
          { key: "href", label: "Destino", type: "text" },
        ],
      },
      { key: "copyright", label: "Copyright", type: "text" },
      { key: "disclaimer", label: "Aviso legal", type: "textarea" },
    ],
    defaults: {
      brand: "Tu Marca",
      tagline: "",
      links: [
        { label: "Política de privacidad", href: "#" },
        { label: "Términos y condiciones", href: "#" },
      ],
      copyright: "© 2026 Tu Marca. Todos los derechos reservados.",
      disclaimer: "",
    },
    ai: "footer{brand, tagline, links[{label,href}], copyright, disclaimer} variant: simple|columns",
  },

  /* ============================ APERTURA ============================ */
  {
    type: "hero",
    label: "Hero",
    group: "Apertura",
    icon: "★",
    variants: [
      { value: "split", label: "Dividido (texto + imagen)" },
      { value: "centered", label: "Centrado" },
      { value: "product", label: "Producto COD (galería + precio)" },
      { value: "vsl", label: "Video de ventas" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta superior", type: "text", max: 40 },
      { key: "title", label: "Titular", type: "textarea", max: 70, help: "Promete un resultado, no una característica" },
      { key: "subtitle", label: "Subtitular", type: "textarea", max: 160 },
      { key: "ctaText", label: "Botón principal", type: "text", max: 28 },
      { key: "ctaHref", label: "Destino", type: "text" },
      { key: "ctaSub", label: "Micro-texto bajo el botón", type: "text", max: 60 },
      { key: "cta2Text", label: "Botón secundario", type: "text", max: 28 },
      { key: "cta2Href", label: "Destino secundario", type: "text" },
      { key: "image", label: "Imagen principal", type: "image" },
      { key: "images", label: "Galería (COD)", type: "list", itemLabelKey: "src", item: [{ key: "src", label: "URL", type: "image" }] },
      { key: "videoUrl", label: "Video (YouTube, TikTok, Instagram, Vimeo, MP4 o súbelo)", type: "text" },
      { key: "price", label: "Precio", type: "number" },
      { key: "compareAtPrice", label: "Precio tachado", type: "number" },
      { key: "rating", label: "Calificación (0-5)", type: "number" },
      { key: "ratingCount", label: "Nº de reseñas", type: "text" },
      {
        key: "bullets",
        label: "Bullets",
        type: "list",
        itemLabelKey: "text",
        item: [{ key: "text", label: "Texto", type: "text" }],
      },
    ],
    defaults: {
      eyebrow: "",
      title: "Un titular que promete un resultado concreto",
      subtitle: "Una frase que explica el diferencial: precio, velocidad, garantía o alcance.",
      ctaText: "Quiero el mío",
      ctaHref: "#oferta",
      ctaSub: "",
      cta2Text: "",
      cta2Href: "#",
      image: "",
      images: [],
      videoUrl: "",
      price: 0,
      compareAtPrice: 0,
      rating: 0,
      ratingCount: "",
      bullets: [],
    },
    ai: "hero{eyebrow<=40, title<=70, subtitle<=160, ctaText<=28, ctaHref, ctaSub?, cta2Text?, price?, compareAtPrice?, rating?, ratingCount?, bullets[{text}]} variant: split|centered|product|vsl",
  },
  {
    type: "logos",
    label: "Barra de logos",
    group: "Apertura",
    icon: "◇",
    variants: [
      { value: "row", label: "Fila" },
      { value: "marquee", label: "Marquesina" },
    ],
    fields: [
      { key: "title", label: "Texto superior", type: "text", max: 70 },
      {
        key: "items",
        label: "Logos",
        type: "list",
        itemLabelKey: "name",
        item: [
          { key: "name", label: "Nombre", type: "text" },
          { key: "image", label: "Imagen", type: "image" },
        ],
      },
    ],
    defaults: {
      title: "Con la confianza de equipos en",
      items: [{ name: "Acme" }, { name: "Globex" }, { name: "Initech" }, { name: "Umbrella" }, { name: "Stark" }],
    },
    ai: "logos{title<=70, items[{name,image?}]} variant: row|marquee",
  },
  {
    type: "trustIcons",
    label: "Garantías rápidas",
    group: "Apertura",
    icon: "🛡",
    variants: [
      { value: "row", label: "Fila de íconos" },
      { value: "cards", label: "Tarjetas" },
    ],
    fields: [
      {
        key: "items",
        label: "Garantías",
        type: "list",
        itemLabelKey: "title",
        item: [
          { key: "icon", label: "Ícono (emoji)", type: "text" },
          { key: "title", label: "Título", type: "text" },
          { key: "text", label: "Descripción", type: "text" },
        ],
      },
    ],
    defaults: {
      items: [
        // Sellos que valen para cualquier negocio contraentrega. Plazos,
        // garantia o "despacho el mismo dia" solo si el dueno los da (hechos).
        { icon: "💵", title: "Pago contra entrega", text: "Pagas cuando lo recibes" },
        { icon: "🚚", title: "Envío a domicilio", text: "Hasta la puerta de tu casa" },
        { icon: "💬", title: "Confirmación por WhatsApp", text: "Te escribimos antes de enviarlo" },
      ],
    },
    ai: "trustIcons{items[{icon:emoji,title,text}]} variant: row|cards",
  },

  /* ============================ PERSUASIÓN ============================ */
  {
    type: "problem",
    label: "Problema",
    group: "Persuasión",
    icon: "⚠",
    variants: [
      { value: "text", label: "Texto" },
      { value: "cards", label: "Tarjetas de dolor" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "body", label: "Párrafo", type: "textarea", max: 400 },
      {
        key: "items",
        label: "Dolores",
        type: "list",
        itemLabelKey: "title",
        item: [
          { key: "icon", label: "Ícono", type: "text" },
          { key: "title", label: "Título", type: "text" },
          { key: "text", label: "Descripción", type: "textarea" },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "",
      title: "Si esto te suena familiar, no es culpa tuya",
      body: "",
      items: [],
      bg: "surface",
    },
    ai: "problem{eyebrow<=32, title<=80, body<=400, items[{icon,title,text}]} variant: text|cards",
  },
  {
    type: "benefits",
    label: "Beneficios",
    group: "Persuasión",
    icon: "✓",
    variants: [
      { value: "grid", label: "Cuadrícula de íconos" },
      { value: "list", label: "Lista con check" },
      { value: "alternating", label: "Alternado con imagen" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      {
        key: "items",
        label: "Beneficios",
        type: "list",
        itemLabelKey: "title",
        item: [
          { key: "icon", label: "Ícono (emoji)", type: "text" },
          { key: "title", label: "Título", type: "text" },
          { key: "text", label: "Descripción", type: "textarea" },
          { key: "image", label: "Imagen (alternado)", type: "image" },
        ],
      },
      BG_FIELD,
      ALIGN_FIELD,
    ],
    defaults: {
      eyebrow: "",
      title: "Lo que cambia desde el primer día",
      subtitle: "",
      items: [
        { icon: "⚡", title: "Resultado rápido", text: "Explica el beneficio concreto en una frase." },
        { icon: "🎯", title: "Sin complicaciones", text: "Explica el beneficio concreto en una frase." },
        { icon: "💎", title: "Calidad real", text: "Explica el beneficio concreto en una frase." },
      ],
      bg: "default",
      align: "center",
    },
    ai: "benefits{eyebrow?, title<=80, subtitle?, items[{icon:emoji,title,text,image?}] 3-6} variant: grid|list|alternating",
  },
  {
    type: "bento",
    label: "Bento grid",
    group: "Persuasión",
    icon: "▦",
    variants: [
      { value: "grid5", label: "5 tiles asimétricos" },
      { value: "grid4", label: "4 tiles" },
      { value: "grid6", label: "6 tiles" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      {
        key: "items",
        label: "Tiles",
        type: "list",
        itemLabelKey: "title",
        item: [
          { key: "icon", label: "Ícono", type: "text" },
          { key: "title", label: "Título", type: "text" },
          { key: "text", label: "Descripción", type: "textarea" },
          { key: "image", label: "Imagen", type: "image" },
          { key: "stat", label: "Número destacado", type: "text" },
          {
            key: "span",
            label: "Ancho",
            type: "select",
            options: [
              { value: "1", label: "1 columna" },
              { value: "2", label: "2 columnas" },
              { value: "3", label: "3 columnas" },
            ],
          },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "Características",
      title: "Todo lo que necesitas, en un solo lugar",
      subtitle: "",
      items: [
        { icon: "🧩", title: "Modular", text: "Describe la capacidad clave.", span: "2" },
        { icon: "⚙️", title: "Automático", text: "Describe la capacidad clave.", span: "1" },
        { icon: "📈", title: "Medible", text: "Describe la capacidad clave.", stat: "+37%", span: "1" },
        { icon: "🔌", title: "Integrable", text: "Describe la capacidad clave.", span: "2" },
      ],
      bg: "default",
    },
    ai: "bento{eyebrow?, title<=80, subtitle?, items[{icon,title,text,stat?,span:'1'|'2'}] 4-6} variant: grid5|grid4|grid6",
  },
  {
    type: "steps",
    label: "Cómo funciona",
    group: "Persuasión",
    icon: "①",
    variants: [
      { value: "horizontal", label: "Horizontal" },
      { value: "vertical", label: "Vertical (timeline)" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      {
        key: "items",
        label: "Pasos",
        type: "list",
        itemLabelKey: "title",
        item: [
          { key: "title", label: "Título", type: "text" },
          { key: "text", label: "Descripción", type: "textarea" },
          { key: "image", label: "Imagen", type: "image" },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "Cómo funciona",
      title: "Tres pasos y listo",
      items: [
        { title: "Haz tu pedido", text: "Completa el formulario en 40 segundos." },
        { title: "Te confirmamos", text: "Te escribimos por WhatsApp para validar la dirección." },
        { title: "Recibe y paga", text: "Pagas al mensajero cuando lo tengas en la mano." },
      ],
      bg: "surface",
    },
    ai: "steps{eyebrow?, title<=80, items[{title,text}] 3-4} variant: horizontal|vertical",
  },
  {
    type: "beforeAfter",
    label: "Antes / Después",
    group: "Persuasión",
    icon: "⇄",
    variants: [
      { value: "columns", label: "Dos columnas" },
      { value: "images", label: "Dos imágenes" },
    ],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "beforeLabel", label: "Etiqueta antes", type: "text" },
      { key: "afterLabel", label: "Etiqueta después", type: "text" },
      { key: "beforeImage", label: "Imagen antes", type: "image" },
      { key: "afterImage", label: "Imagen después", type: "image" },
      {
        key: "before",
        label: "Puntos antes",
        type: "list",
        itemLabelKey: "text",
        item: [{ key: "text", label: "Texto", type: "text" }],
      },
      {
        key: "after",
        label: "Puntos después",
        type: "list",
        itemLabelKey: "text",
        item: [{ key: "text", label: "Texto", type: "text" }],
      },
      BG_FIELD,
    ],
    defaults: {
      title: "La diferencia se nota",
      beforeLabel: "Sin esto",
      afterLabel: "Con esto",
      beforeImage: "",
      afterImage: "",
      before: [{ text: "Pierdes tiempo" }, { text: "Gastas de más" }, { text: "Resultados inconsistentes" }],
      after: [{ text: "Ahorras horas" }, { text: "Pagas una sola vez" }, { text: "Resultado predecible" }],
      bg: "default",
    },
    ai: "beforeAfter{title<=80, beforeLabel, afterLabel, before[{text}], after[{text}]} variant: columns|images",
  },
  {
    type: "video",
    label: "Video",
    group: "Persuasión",
    icon: "▶",
    variants: [
      { value: "wide", label: "Ancho 16:9" },
      { value: "vertical", label: "Vertical 9:16" },
    ],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      { key: "url", label: "Video: URL (YouTube, TikTok, Instagram, Facebook, Vimeo, MP4) o súbelo", type: "text" },
      { key: "poster", label: "Miniatura", type: "image" },
      { key: "ctaText", label: "Botón", type: "text", max: 28 },
      { key: "ctaHref", label: "Destino", type: "text" },
      BG_FIELD,
    ],
    defaults: { title: "Míralo en acción", subtitle: "", url: "", poster: "", ctaText: "", ctaHref: "#oferta", bg: "surface" },
    ai: "video{title<=80, subtitle?, url, ctaText?, ctaHref?} variant: wide|vertical",
  },
  {
    type: "gallery",
    label: "Galería",
    group: "Persuasión",
    icon: "🖼",
    variants: [
      { value: "grid", label: "Cuadrícula" },
      { value: "scroll", label: "Carrusel horizontal" },
    ],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      {
        key: "items",
        label: "Imágenes",
        type: "list",
        itemLabelKey: "caption",
        item: [
          { key: "src", label: "URL", type: "image" },
          { key: "caption", label: "Pie de foto", type: "text" },
        ],
      },
      BG_FIELD,
    ],
    defaults: { title: "", items: [], bg: "default" },
    ai: "gallery{title?, items[{src,caption?}]} variant: grid|scroll",
  },
  {
    type: "comparison",
    label: "Tabla comparativa",
    group: "Persuasión",
    icon: "⊞",
    variants: [
      { value: "table", label: "Tabla" },
      { value: "duel", label: "Nosotros vs. ellos" },
    ],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "usLabel", label: "Nuestra columna", type: "text" },
      { key: "themLabel", label: "Columna rival", type: "text" },
      {
        key: "rows",
        label: "Filas",
        type: "list",
        itemLabelKey: "feature",
        item: [
          { key: "feature", label: "Característica", type: "text" },
          { key: "themFeature", label: "Texto columna rival", type: "text", help: "Opcional: si lo dejas vacío se repite la característica" },
          { key: "us", label: "Nosotros", type: "text" },
          { key: "them", label: "Ellos", type: "text" },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      title: "Por qué elegirnos",
      usLabel: "Nosotros",
      themLabel: "El genérico",
      rows: [
        { feature: "Pago contra entrega", themFeature: "Pago por adelantado", us: "sí", them: "no" },
        { feature: "Garantía 30 días", themFeature: "Sin garantía real", us: "sí", them: "no" },
        { feature: "Soporte por WhatsApp", themFeature: "Soporte que nunca responde", us: "sí", them: "no" },
        { feature: "Envío en 24–72 h", themFeature: "Envío de 7 a 15 días", us: "sí", them: "7–15 días" },
      ],
      bg: "surface",
    },
    ai: "comparison{title<=80, usLabel, themLabel, rows[{feature, us:'sí'|'no'|texto, them:'sí'|'no'|texto}]} variant: table|duel",
  },
  {
    type: "stats",
    label: "Métricas",
    group: "Persuasión",
    icon: "📊",
    variants: [
      { value: "row", label: "Fila" },
      { value: "cards", label: "Tarjetas" },
    ],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      {
        key: "items",
        label: "Métricas",
        type: "list",
        itemLabelKey: "value",
        item: [
          { key: "value", label: "Valor", type: "text" },
          { key: "label", label: "Etiqueta", type: "text" },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      title: "",
      items: [
        { value: "12.400+", label: "Clientes felices" },
        { value: "4.8/5", label: "Calificación media" },
        { value: "48 h", label: "Entrega promedio" },
        { value: "98%", label: "Recompra" },
      ],
      bg: "default",
    },
    ai: "stats{title?, items[{value,label}] 3-4} variant: row|cards",
  },

  /* ============================ PRUEBA ============================ */
  {
    type: "testimonials",
    label: "Testimonios",
    group: "Prueba",
    icon: "❝",
    variants: [
      { value: "grid", label: "Cuadrícula" },
      { value: "featured", label: "Uno destacado" },
      { value: "scroll", label: "Carrusel" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      {
        key: "items",
        label: "Testimonios",
        type: "list",
        itemLabelKey: "name",
        item: [
          { key: "quote", label: "Testimonio", type: "textarea" },
          { key: "name", label: "Nombre", type: "text" },
          { key: "role", label: "Cargo / ciudad", type: "text" },
          { key: "avatar", label: "Foto", type: "image" },
          { key: "rating", label: "Estrellas (1-5)", type: "number" },
          { key: "result", label: "Resultado medible", type: "text" },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "Clientes",
      title: "Lo que dicen quienes ya lo usan",
      items: [
        { quote: "Llegó en dos días y funciona tal cual lo muestran. Volvería a comprar.", name: "Laura M.", role: "Cali", rating: 5 },
        { quote: "Pagué al recibirlo, sin riesgo. El vendedor me confirmó por WhatsApp.", name: "Andrés P.", role: "Medellín", rating: 5 },
        { quote: "La calidad superó lo que esperaba por ese precio.", name: "Diana R.", role: "Bogotá", rating: 5 },
      ],
      bg: "surface",
    },
    ai: "testimonials{eyebrow?, title<=80, items[{quote<=180,name,role,rating:1-5,result?}] 3-6} variant: grid|featured|scroll",
  },
  {
    type: "reviewsUgc",
    label: "Reseñas con foto",
    group: "Prueba",
    icon: "⭐",
    variants: [
      { value: "grid", label: "Cuadrícula" },
      { value: "scroll", label: "Carrusel" },
    ],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "rating", label: "Calificación global", type: "number" },
      { key: "ratingCount", label: "Nº de reseñas", type: "text" },
      {
        key: "items",
        label: "Reseñas",
        type: "list",
        itemLabelKey: "name",
        item: [
          { key: "image", label: "Foto del producto", type: "image" },
          { key: "quote", label: "Reseña", type: "textarea" },
          { key: "name", label: "Nombre", type: "text" },
          { key: "rating", label: "Estrellas", type: "number" },
          { key: "verified", label: "Compra verificada", type: "boolean" },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      title: "Más de 2.000 clientes lo recomiendan",
      rating: 4.8,
      ratingCount: "2.147",
      items: [
        { quote: "Tal cual la foto. Muy buena calidad.", name: "Sandra G.", rating: 5, verified: true },
        { quote: "Llegó antes de lo que decía. Recomendado.", name: "Julián C.", rating: 5, verified: true },
        { quote: "Mi mamá quedó feliz, ya pedí otro.", name: "Natalia V.", rating: 5, verified: true },
      ],
      bg: "default",
    },
    ai: "reviewsUgc{title<=80, rating, ratingCount, items[{quote<=120,name,rating,verified}]} variant: grid|scroll",
  },

  /* ============================ OFERTA ============================ */
  {
    type: "pricing",
    label: "Precios / Planes",
    group: "Oferta",
    icon: "$",
    variants: [
      { value: "tiers", label: "Planes" },
      { value: "single", label: "Oferta única" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      { key: "showToggle", label: "Interruptor mensual/anual", type: "boolean" },
      { key: "annualDiscountLabel", label: "Texto del ahorro anual", type: "text" },
      {
        key: "plans",
        label: "Planes",
        type: "list",
        itemLabelKey: "name",
        item: [
          { key: "name", label: "Nombre", type: "text" },
          { key: "price", label: "Precio mensual", type: "number" },
          { key: "priceAnnual", label: "Precio anual (por mes)", type: "number" },
          { key: "currency", label: "Moneda", type: "text" },
          { key: "period", label: "Periodo", type: "text" },
          { key: "description", label: "Descripción", type: "textarea" },
          { key: "featured", label: "Destacado", type: "boolean" },
          { key: "badge", label: "Etiqueta", type: "text" },
          { key: "ctaText", label: "Botón", type: "text" },
          { key: "ctaHref", label: "Destino", type: "text" },
          {
            key: "features",
            label: "Incluye",
            type: "list",
            itemLabelKey: "text",
            item: [{ key: "text", label: "Texto", type: "text" }],
          },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "Planes",
      title: "Elige cómo empezar",
      subtitle: "",
      showToggle: true,
      annualDiscountLabel: "2 meses gratis",
      plans: [
        {
          name: "Starter", price: 19, priceAnnual: 15, currency: "USD", period: "/mes",
          description: "Para empezar hoy", featured: false, ctaText: "Empezar gratis", ctaHref: "#",
          features: [{ text: "1 proyecto" }, { text: "Soporte por email" }],
        },
        {
          name: "Pro", price: 49, priceAnnual: 39, currency: "USD", period: "/mes",
          description: "El más elegido", featured: true, badge: "Más popular", ctaText: "Probar 14 días", ctaHref: "#",
          features: [{ text: "Proyectos ilimitados" }, { text: "Integraciones" }, { text: "Soporte prioritario" }],
        },
        {
          name: "Business", price: 129, priceAnnual: 99, currency: "USD", period: "/mes",
          description: "Para equipos", featured: false, ctaText: "Hablar con ventas", ctaHref: "#",
          features: [{ text: "Todo en Pro" }, { text: "SSO y roles" }, { text: "SLA" }],
        },
      ],
      bg: "default",
    },
    ai: "pricing{eyebrow?, title<=80, showToggle:bool, plans[{name,price,priceAnnual,currency,period,description,featured,badge?,ctaText,features[{text}]}]} variant: tiers|single",
    verticals: ["saas", "digital", "service"],
  },
  {
    type: "bundle",
    label: "Oferta escalonada (COD)",
    group: "Oferta",
    icon: "📦",
    variants: [
      { value: "cards", label: "Tarjetas" },
      { value: "rows", label: "Filas seleccionables" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      { key: "currency", label: "Moneda", type: "text" },
      {
        key: "options",
        label: "Opciones",
        type: "list",
        itemLabelKey: "label",
        item: [
          { key: "label", label: "Etiqueta", type: "text" },
          { key: "qty", label: "Cantidad", type: "number" },
          { key: "price", label: "Precio total", type: "number" },
          { key: "compareAtPrice", label: "Precio tachado", type: "number" },
          { key: "badge", label: "Etiqueta destacada", type: "text" },
          { key: "featured", label: "Destacada", type: "boolean" },
          { key: "note", label: "Nota", type: "text" },
        ],
      },
      { key: "ctaText", label: "Botón", type: "text", max: 28 },
      { key: "ctaHref", label: "Destino", type: "text" },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "Oferta de hoy",
      title: "Mientras más llevas, menos pagas",
      subtitle: "Envío gratis en todas las opciones · Pagas al recibir",
      currency: "COP",
      options: [
        { label: "1 unidad", qty: 1, price: 89900, compareAtPrice: 139900, featured: false, note: "Prueba" },
        { label: "2 unidades", qty: 2, price: 149900, compareAtPrice: 279800, badge: "Más vendido", featured: true, note: "Ahorras $129.900" },
        { label: "3 unidades", qty: 3, price: 199900, compareAtPrice: 419700, badge: "Mejor precio", featured: false, note: "Ahorras $219.800" },
      ],
      ctaText: "Pedir contra entrega",
      ctaHref: "#pedido",
      bg: "surface",
    },
    ai: "bundle{eyebrow?, title<=80, subtitle?, currency, options[{label,qty,price,compareAtPrice,badge?,featured,note?}] 2-4, ctaText<=28} variant: cards|rows",
    verticals: ["cod"],
  },
  {
    type: "valueStack",
    label: "Stack de valor / bonos",
    group: "Oferta",
    icon: "🎁",
    variants: [
      { value: "list", label: "Lista con valores" },
      { value: "cards", label: "Tarjetas" },
    ],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "currency", label: "Moneda", type: "text" },
      {
        key: "items",
        label: "Componentes",
        type: "list",
        itemLabelKey: "title",
        item: [
          { key: "title", label: "Título", type: "text" },
          { key: "text", label: "Descripción", type: "textarea" },
          { key: "value", label: "Valor", type: "number" },
          { key: "bonus", label: "Es bono", type: "boolean" },
        ],
      },
      { key: "totalLabel", label: "Etiqueta del total", type: "text" },
      { key: "todayLabel", label: "Etiqueta de hoy", type: "text" },
      { key: "todayPrice", label: "Precio hoy", type: "number" },
      BG_FIELD,
    ],
    defaults: {
      title: "Esto es todo lo que recibes",
      currency: "USD",
      items: [
        { title: "Curso completo (8 módulos)", text: "Acceso de por vida", value: 297, bonus: false },
        { title: "Plantillas listas para usar", text: "Más de 30 recursos", value: 97, bonus: true },
        { title: "Comunidad privada", text: "Soporte entre pares", value: 149, bonus: true },
      ],
      totalLabel: "Valor total",
      todayLabel: "Hoy pagas",
      todayPrice: 97,
      bg: "surface",
    },
    ai: "valueStack{title<=80, currency, items[{title,text,value,bonus}], totalLabel, todayLabel, todayPrice} variant: list|cards",
    verticals: ["digital"],
  },
  {
    type: "curriculum",
    label: "Temario / Módulos",
    group: "Oferta",
    icon: "📚",
    variants: [{ value: "accordion", label: "Acordeón" }, { value: "list", label: "Lista" }],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      {
        key: "items",
        label: "Módulos",
        type: "list",
        itemLabelKey: "title",
        item: [
          { key: "title", label: "Título", type: "text" },
          { key: "text", label: "Contenido", type: "textarea" },
          { key: "meta", label: "Duración / lecciones", type: "text" },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      title: "Qué vas a aprender",
      subtitle: "",
      items: [
        { title: "Módulo 1 · Fundamentos", text: "Lo que necesitas antes de empezar.", meta: "6 lecciones · 48 min" },
        { title: "Módulo 2 · Ejecución", text: "El paso a paso aplicado.", meta: "9 lecciones · 1 h 12 min" },
        { title: "Módulo 3 · Escala", text: "Cómo multiplicar el resultado.", meta: "7 lecciones · 55 min" },
      ],
      bg: "default",
    },
    ai: "curriculum{title<=80, items[{title,text,meta}]} variant: accordion|list",
    verticals: ["digital"],
  },
  {
    type: "guarantee",
    label: "Garantía",
    group: "Oferta",
    icon: "🏅",
    variants: [{ value: "card", label: "Tarjeta" }, { value: "banner", label: "Banner" }],
    fields: [
      { key: "badge", label: "Sello", type: "text", max: 24 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "body", label: "Texto", type: "textarea", max: 320 },
      BG_FIELD,
    ],
    defaults: {
      badge: "30 días",
      title: "Garantía de satisfacción o te devolvemos el dinero",
      body: "Si no es lo que esperabas, escríbenos dentro de los 30 días siguientes y te devolvemos el 100%. Sin letra pequeña.",
      bg: "surface",
    },
    ai: "guarantee{badge<=24, title<=80, body<=320} variant: card|banner",
  },
  {
    type: "countdown",
    label: "Contador / Escasez",
    group: "Oferta",
    icon: "⏳",
    variants: [{ value: "block", label: "Bloque" }, { value: "bar", label: "Barra" }],
    fields: [
      { key: "title", label: "Título", type: "text", max: 70 },
      { key: "subtitle", label: "Subtítulo", type: "text", max: 120 },
      { key: "minutes", label: "Minutos de cuenta regresiva", type: "number", help: "Se reinicia por visitante" },
      { key: "stockLeft", label: "Unidades restantes", type: "number" },
      { key: "stockTotal", label: "Stock total", type: "number" },
      BG_FIELD,
    ],
    defaults: {
      title: "La oferta termina en",
      subtitle: "Al terminar el contador el precio vuelve a su valor normal.",
      minutes: 15,
      stockLeft: 7,
      stockTotal: 40,
      bg: "accent",
    },
    ai: "countdown{title<=70, subtitle?, minutes:int, stockLeft?, stockTotal?} variant: block|bar",
  },

  /* ============================ CONVERSIÓN ============================ */
  {
    type: "codForm",
    label: "Formulario contraentrega",
    group: "Conversión",
    icon: "🧾",
    variants: [
      { value: "card", label: "Tarjeta centrada" },
      { value: "split", label: "Resumen + formulario" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      { key: "submitText", label: "Botón", type: "text", max: 32 },
      { key: "askDni", label: "Pedir cédula", type: "boolean" },
      { key: "askEmail", label: "Pedir email", type: "boolean" },
      { key: "askNotes", label: "Pedir notas", type: "boolean" },
      { key: "askQuantity", label: "Selector de cantidad", type: "boolean" },
      { key: "askVariants", label: "Selectores de variante (color/talla)", type: "boolean" },
      { key: "showSummary", label: "Mostrar resumen del pedido", type: "boolean" },
      { key: "shippingLabel", label: "Texto del envío", type: "text" },
      { key: "shippingPrice", label: "Costo de envío", type: "number" },
      { key: "securityNote", label: "Nota de seguridad", type: "text" },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "Último paso",
      title: "Completa tus datos y paga al recibir",
      subtitle: "Te llamamos para confirmar antes de despachar. No pagas nada ahora.",
      submitText: "Confirmar pedido contra entrega",
      askDni: false,
      askEmail: false,
      askNotes: true,
      askQuantity: true,
      askVariants: true,
      showSummary: true,
      shippingLabel: "Envío GRATIS",
      shippingPrice: 0,
      securityNote: "🔒 Tus datos están protegidos y solo se usan para gestionar el envío.",
      bg: "surface",
    },
    ai: "codForm{eyebrow?, title<=80, subtitle<=180, submitText<=32, askDni:bool, askEmail:bool, askNotes:bool, askQuantity:bool=true, showSummary:bool=true, askVariants:bool=true, shippingLabel, shippingPrice} variant: card|split",
    verticals: ["cod"],
  },
  {
    type: "leadForm",
    label: "Captura de lead",
    group: "Conversión",
    icon: "✉",
    variants: [{ value: "inline", label: "En línea" }, { value: "card", label: "Tarjeta" }],
    fields: [
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      { key: "submitText", label: "Botón", type: "text", max: 28 },
      { key: "askName", label: "Pedir nombre", type: "boolean" },
      { key: "askPhone", label: "Pedir teléfono", type: "boolean" },
      { key: "askCompany", label: "Pedir empresa", type: "boolean" },
      { key: "note", label: "Micro-texto", type: "text", max: 70 },
      BG_FIELD,
    ],
    defaults: {
      title: "Empieza gratis hoy",
      subtitle: "",
      submitText: "Crear mi cuenta",
      askName: true,
      askPhone: false,
      askCompany: false,
      note: "Sin tarjeta de crédito · Cancela cuando quieras",
      bg: "default",
    },
    ai: "leadForm{title<=80, subtitle?, submitText<=28, askName, askPhone, askCompany, note<=70} variant: inline|card",
  },
  {
    type: "faq",
    label: "Preguntas frecuentes",
    group: "Conversión",
    icon: "?",
    variants: [{ value: "accordion", label: "Acordeón" }, { value: "columns", label: "Dos columnas" }],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      {
        key: "items",
        label: "Preguntas",
        type: "list",
        itemLabelKey: "q",
        item: [
          { key: "q", label: "Pregunta", type: "text" },
          { key: "a", label: "Respuesta", type: "textarea" },
        ],
      },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "Dudas",
      title: "Preguntas frecuentes",
      items: [
        { q: "¿Realmente pago al recibir?", a: "Sí. No pagas nada ahora: entregas el dinero al mensajero cuando el producto esté en tus manos." },
        { q: "¿Cuánto demora el envío?", a: "Entre 24 y 72 horas hábiles según tu ciudad. Te enviamos el número de guía por WhatsApp." },
        { q: "¿Y si no me gusta?", a: "Tienes 30 días para devolverlo. Escríbenos y coordinamos la recogida sin costo." },
        { q: "¿Hacen envíos a todo el país?", a: "Sí, cubrimos todo el territorio nacional con nuestras transportadoras aliadas." },
      ],
      bg: "default",
    },
    ai: "faq{eyebrow?, title<=80, items[{q,a}] 4-8 — responde objeciones reales} variant: accordion|columns",
  },
  {
    type: "ctaFinal",
    label: "CTA final",
    group: "Conversión",
    icon: "➜",
    variants: [
      { value: "centered", label: "Centrado" },
      { value: "gradient", label: "Degradado" },
      { value: "split", label: "Dividido" },
    ],
    fields: [
      { key: "eyebrow", label: "Etiqueta", type: "text", max: 32 },
      { key: "title", label: "Título", type: "textarea", max: 80 },
      { key: "subtitle", label: "Subtítulo", type: "textarea", max: 180 },
      { key: "ctaText", label: "Botón", type: "text", max: 28 },
      { key: "ctaHref", label: "Destino", type: "text" },
      { key: "ctaSub", label: "Micro-texto", type: "text", max: 70 },
      { key: "image", label: "Imagen", type: "image" },
      BG_FIELD,
    ],
    defaults: {
      eyebrow: "",
      title: "¿Listo para empezar?",
      subtitle: "Haz tu pedido hoy y recíbelo en 24 – 72 horas.",
      ctaText: "Pedir ahora",
      ctaHref: "#pedido",
      ctaSub: "Pago contra entrega · Garantía de 30 días",
      image: "",
      bg: "gradient",
    },
    ai: "ctaFinal{eyebrow?, title<=80, subtitle<=180, ctaText<=28, ctaHref, ctaSub<=70} variant: centered|gradient|split",
  },
];

export const BY_TYPE: Record<string, BlockDef> = Object.fromEntries(
  CATALOG.map((b) => [b.type, b]),
);

export function defaultsFor(type: string): Record<string, any> {
  return JSON.parse(JSON.stringify(BY_TYPE[type]?.defaults ?? {}));
}

/** Un valor que el LLM "rellenó" pero vino vacío: "", "   ", null, [] */
function blank(v: any): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Fusiona lo que trajo el LLM con los defaults, campo a campo y también dentro
 *  de los arrays de items: los modelos pequeños suelen enviar {name:"Ana"} y
 *  olvidar el texto, lo que dejaría tarjetas vacías en la landing. */
export function withDefaults(type: string, props: Record<string, any>): Record<string, any> {
  const base = defaultsFor(type);
  const src = props || {};
  const out: Record<string, any> = { ...base };
  const fields = BY_TYPE[type]?.fields || [];
  const fieldOf = (k: string) => fields.find((f) => f.key === k);

  for (const [k, v] of Object.entries(src)) {
    if (blank(v)) continue; // no pisar un default bueno con un hueco
    const def = (base as any)[k];
    const field = fieldOf(k);

    // Los modelos pequeños mandan ["texto"] donde el bloque espera [{text:"…"}].
    // El catálogo ya declara la forma del item, así que la usamos para coaccionar.
    if (Array.isArray(v) && field?.type === "list" && field.item?.length) {
      const keyFor = (i: Field[]) =>
        i.find((f) => f.key === (field.itemLabelKey || ""))?.key ||
        i.find((f) => ["text", "title", "label", "q", "name", "feature"].includes(f.key))?.key ||
        i[0].key;
      const target = keyFor(field.item);
      out[k] = v.map((item: any) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          // también rescatamos {texto:"…"} o {value:"…"} si el modelo inventó la clave
          if (blank(item[target])) {
            const alt = Object.entries(item).find(
              ([ik, iv]) => typeof iv === "string" && !blank(iv) && !field.item!.some((f) => f.key === ik),
            );
            if (alt) return { ...item, [target]: alt[1] };
          }
          return item;
        }
        return { [target]: String(item ?? "") };
      });
      continue;
    }

    if (Array.isArray(v) && Array.isArray(def) && def.length) {
      out[k] = v.map((item, i) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const model = (def[i % def.length] || def[0]) as Record<string, any>;
          const merged: Record<string, any> = { ...model };
          for (const [ik, iv] of Object.entries(item)) if (!blank(iv)) merged[ik] = iv;
          return merged;
        }
        return item;
      });
      continue;
    }
    out[k] = v;
  }
  return out;
}

export const GROUPS = ["Apertura", "Persuasión", "Prueba", "Oferta", "Conversión", "Estructura"] as const;

/** Schema condensado que se inyecta al system prompt del LLM */
export function condensedSchema(): string {
  return CATALOG.map((b) => `- ${b.ai}`).join("\n");
}
