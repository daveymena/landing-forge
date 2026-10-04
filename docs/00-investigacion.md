# Investigación — Generador de Landing Pages con IA (dropshipping COD + digital + suscripciones)

> Documento de referencia. Fecha: 2026-10-03. Mercado objetivo primario: LATAM (Colombia / México / Ecuador / Perú / Chile), con soporte global para producto digital y SaaS.

---

## 1. Cómo se estructuran las landings "modernas" hoy (2026)

La investigación de patrones actuales (CXL, Unbounce Benchmark, Replo, análisis de top-100 ProductHunt) converge en un **esqueleto fijo de 7–9 bloques**, donde cada bloque hace **un solo trabajo** y "se gana el scroll" del siguiente. Saltarse uno baja conversión; reordenarlos rompe el argumento.

### 1.1 Esqueleto canónico (orden importa)

| # | Bloque | Trabajo que hace | Notas 2026 |
|---|--------|------------------|------------|
| 0 | **Nav mínima / sticky** | Logo + 1 CTA. Sin menú. | Menos rutas de salida = más conversión. CTA sticky en mobile. |
| 1 | **Hero** | Confirmar en 5s "llegué al sitio correcto" | Eyebrow (13px) → H1 de resultado (6–12 palabras) → subhead con diferenciador → CTA primario + CTA fantasma → visual |
| 2 | **Trust bar / prueba above-the-fold** | Bajar escepticismo antes del scroll | Logos (6–10), badge con rating + nº de reseñas, 1 quote <20 palabras. **Estático, no carrusel** |
| 3 | **Problema** | Nombrar el dolor con el que llegó | 1 párrafo. Es el bloque que más se omite y más duele omitir |
| 4 | **Solución / Cómo funciona** | 3 pasos o 3–5 beneficios | Cada beneficio atado a un resultado visible |
| 5 | **Features en bento grid** | Densidad sin muro de texto | **67% del top-100 SaaS de ProductHunt usa bento en 2026.** Grid 12 col, tiles asimétricos, 60–70% de altura = visual |
| 6 | **Prueba social profunda** | Validar las afirmaciones | Nombre real + cargo + foto + métrica. Video testimonial 10–30s. Antes/después |
| 7 | **Oferta / Pricing** | Qué recibe, qué cuesta, qué pasa después | Anclaje de precio, 3 tiers con uno destacado, toggle mensual/anual |
| 8 | **Objeciones / FAQ** | Responder los 3 "no" principales | Acordeón, 5–8 preguntas |
| 9 | **Garantía + CTA final** | Cerrar | Mismo CTA que el hero, repetido 3–5 veces en total cada 500–800px |

### 1.2 Lenguaje visual actual (lo que hace que "se vea 2026")

Esto es lo que hay que codificar en el *theme engine* para que lo generado no se vea a template de 2018:

- **Fondos oscuros con acento saturado** (zinc-950 + un accent vivo) o **light con mucho aire**; nada de gradientes morados genéricos.
- **Tipografía display + sans separadas**: display tipo *Space Grotesk / Geist / Satoshi / Instrument Serif* para H1, sans neutra (*Inter*) para cuerpo.
- **Escala tipográfica agresiva**: H1 clamp(2.5rem, 6vw, 4.5rem), tracking negativo (-0.02em a -0.04em), line-height 0.95–1.05 en display.
- **Bento grid** con tiles `border-radius: 16–24px`, borde 1px semitransparente, fondo apenas más claro que el canvas.
- **Glow / mesh gradient sutil** detrás del hero (radial-gradient con blur alto), no un gradiente lineal plano.
- **Noise/grain overlay** al 2–4% de opacidad.
- **Badges "pill"** con punto animado (`• En vivo`, `• Nuevo`).
- **Microanimaciones CSS** (`@keyframes` + `animation-timeline: view()` donde se pueda) — nunca librerías pesadas de JS.
- **Sombras de color** (`box-shadow: 0 20px 60px -20px var(--accent-alpha)`), no sombras grises.
- **Dark-mode paridad** y tap targets ≥44px.
- **Performance como feature**: LCP ≤2.5s, CLS ≤0.1 → esto obliga a que el export sea **un solo HTML con CSS inline y SVG embebido**, sin fuentes externas bloqueantes.

### 1.3 Variante **COD / dropshipping LATAM** (es OTRA estructura)

La landing de contraentrega latinoamericana NO es una landing SaaS. Patrones que realmente convierten en este mercado:

1. **Barra superior de urgencia** — "Envío GRATIS hoy · Pagas al recibir".
2. **Hero con galería de producto** (4–6 fotos, swipe en mobile) + precio tachado/precio oferta + % descuento + badge "Pago contra entrega".
3. **Bloque de confianza inmediato** — íconos: Pago al recibir · Envío 24–72h · Garantía 30 días · Devolución gratis.
4. **Beneficios en bullets con íconos** (no párrafos).
5. **Antes / después** o demostración en video vertical.
6. **Reseñas con foto del cliente** y estrellas (UGC).
7. **Tabla comparativa** "nosotros vs. el genérico".
8. **Oferta escalonada / bundle**: 1 unidad / 2 unidades (–15%) / 3 unidades (–25%) — esto sube el AOV más que cualquier otra cosa.
9. **Contador de escasez** ("quedan 7 unidades", temporizador).
10. **FORMULARIO COD EMBEBIDO EN LA PÁGINA** (no checkout aparte): nombre, apellido, teléfono/WhatsApp, departamento (select), ciudad (select dependiente), dirección, barrio, notas, cantidad. **Sin email obligatorio, sin crear cuenta.**
11. **CTA sticky en mobile** con precio + botón "Pedir contra entrega".
12. **FAQ de objeciones COD**: "¿Pago al recibir?", "¿Cuánto demora?", "¿Y si no me gusta?".
13. **Botón flotante de WhatsApp**.
14. Píxeles: Meta Pixel (+ CAPI server-side), TikTok Pixel, GA4 — con eventos `ViewContent`, `AddToCart` (al abrir el form), `Purchase`/`Lead` (al enviar).

> Dato operativo clave: en COD, **la tasa de entrega cae a ~50% si no se confirma el pedido antes de despachar**. Por eso el generador debe emitir, junto con la orden, un *deep link de WhatsApp* preformateado para confirmación, y soportar webhook hacia la herramienta de confirmación.

### 1.4 Variante **producto digital / infoproducto**

Hero con promesa de transformación → VSL o video corto → "para quién es / para quién NO es" → módulos/temario en acordeón → bonos apilados con valor tachado → stack de valor ("valor total $X, hoy $Y") → prueba social con resultados → garantía de N días → pricing con 1–3 opciones → FAQ → CTA final. Entrega inmediata, checkout externo (Hotmart/Stripe/Lemon Squeezy).

### 1.5 Variante **SaaS / suscripción**

Hero con UI del producto + "no requiere tarjeta" → logo bar + badge G2 → bento de features → demo interactiva ungated → pricing mensual/anual con toggle y ahorro anual destacado → tabla comparativa de planes → seguridad/compliance cerca del pricing → FAQ → CTA final. Form de 3 campos máximo (3 campos convierten ~25% mejor que 9).

---

## 2. Benchmark de generadores existentes

### 2.1 Comerciales (qué copiar de cada uno)

| Producto | Modelo | Lo que vale la pena imitar |
|---|---|---|
| **Framer AI** | Prompt → sitio editable en canvas propio | Calidad del *output* visual por defecto; presets de estilo |
| **Relume Site Builder** | Prompt → **sitemap** → wireframe → componentes | **El paso intermedio de sitemap/outline antes de generar.** Título+descripción de cada sección funcionan como *sub-prompts* |
| **Lovable / v0 / Bolt** | Prompt → **código** | Velocidad de iteración por chat. Pero el output es frágil (imports alucinados, builds rotos) |
| **Replo** | Builder para Shopify DTC | Biblioteca de secciones específicas de ecommerce |
| **Unbounce Smart Builder** | Prompt + copy IA + A/B | Smart Traffic (routing automático de variantes) |
| **Durable / Hostinger AI** | 30s → sitio de negocio local | Onboarding ultracorto (3 preguntas) |

### 2.2 Open source — repos candidatos

| Repo | Licencia | Modelo de datos | Veredicto para nosotros |
|---|---|---|---|
| **GrapesJS** (`GrapesJS/grapesjs`) ~26k ★ | BSD-3 | HTML/CSS | Framework de editor más maduro: Style Manager, Layer Manager, Device Manager, Asset Manager ya hechos. Agnóstico de framework. **Candidato fuerte si queremos edición libre tipo Webflow** |
| **Puck** (`measuredco/puck`) ~12.6k ★ | MIT | **JSON tree de componentes React** | Editor drag&drop que se embebe en React. JSON in → JSON out. **El mismo JSON que genera la IA es el que edita el humano.** Hay casos reales de "IA genera Puck JSON" |
| **Craft.js** | MIT | JSON | Toolkit, hay que construir toda la UI. Sin commits desde 2025-02 |
| **Webstudio** | AGPL-3.0 | propio | Muy bueno visualmente pero AGPL + builder no publicado en npm |
| **Silex** | AGPL-3.0 | sobre GrapesJS | AGPL complica comercializar |
| **OpenPage** (`buildingopen/openpage`) | MIT | **SiteConfig JSON (blocks + theme)** | **Es casi exactamente la arquitectura que necesitamos**: JSON-first, editor visual, `/api/generate` con LLM, export a HTML autocontenido. React 19 + Tailwind v4 + Zustand + Vite |
| **aicom-landing** (`alexar76/aicom-landing`) | MIT | 2 agentes: Architect→Developer | **Patrón de 2 pasos**: agente 1 devuelve JSON (layout+copy+plan visual), agente 2 devuelve el HTML. 20 presets de estilo. Retry de JSON malformado |
| **TinaCMS** | Apache | Markdown+Git | No aplica |

### 2.3 Conclusión arquitectónica

> **JSON-first, no code-first.**

Los generadores que emiten **código** (v0, Lovable, Bolt) son frágiles: el LLM alucina imports, el build se rompe, y **no hay forma de que un humano edite visualmente y luego la IA vuelva a editar** sin pisar cambios. Los que emiten **JSON tipado** tienen una sola fuente de verdad que *tanto el humano como la IA* mutan de forma quirúrgica y diffeable.

Diseño elegido:

```
Prompt del usuario
      │
      ▼
 [Agente 1: ARQUITECTO]  → elige vertical, orden de bloques, variantes, paleta, tipografías
      │                     (salida: outline — estilo Relume sitemap)
      ▼
 [Agente 2: COPYWRITER]  → rellena props de cada bloque con copy real (sin lorem ipsum)
      │
      ▼
   PageSpec JSON  ◄──────────┬── Editor visual (inline + panel de props + theme)
   (validado con Zod)        └── Chat de edición IA ("hazlo más agresivo", "agrega FAQ")
      │
      ├──► Renderer React (preview en vivo, responsive)
      ├──► Exporter → 1 archivo HTML autocontenido (CSS inline, SVG inline, 0 deps)
      └──► Publicador → /p/{slug} con el runtime de integraciones
```

Reglas duras del schema (lecciones de los repos):
- El LLM **solo** puede usar `type` + `variant` + `props` de un catálogo cerrado → se le inyecta un *schema condensado* en el system prompt.
- Validación Zod en el servidor; si falla, **repair pass** (reintento con el error como feedback, 3 intentos).
- Props con límites de caracteres explícitos (`headline: string, max 60`) para que el diseño no se rompa.
- Nada de `backgroundImage` inventado por el LLM: se pide un *image brief* y las imágenes se resuelven aparte.

---

## 3. Integraciones

### 3.1 Dropi (prioritaria)

Plataforma líder de dropshipping **contraentrega** en LATAM, 12 países (CO, MX, EC, PE, CL, PA, CR, GT, PY, AR, VE, ES). Transportadoras en CO: Interrapidísimo, Servientrega, Coordinadora, Envía.

**Base URLs**
- Pruebas: `https://test-api.dropi.co/api`
- Producción: `https://api.dropi.co/api`

**Autenticación** (dos esquemas según el tipo de credencial)
- API de usuario: header `Authorization: Bearer <TOKEN>` + `Content-Type: application/json`
- Integrations Core: header `dropi-integracion-key: <Token_Integracion>` (el token se genera en `app.dropi.co/dashboard/shop` → *+Agregar* → tipo de integración → copiar token)

**Endpoints relevantes**

| Función | Método | Path |
|---|---|---|
| Login de usuario | POST | `/auth/login` |
| Listar productos | POST | `/products/index` — body: `{ keywords, pageSize, startData, order_by, order_type }` |
| Producto por ID | GET | `/products/{id}` |
| Lista de departamentos | GET | `/states` *(nombre según versión)* |
| Lista de ciudades | GET | `/cities?state_id=` |
| Transportadoras | GET | `/distributionCompanies` |
| **Cotizar flete** | POST | `/orders/cotizaEnvioTransportadoraV2` — body: `{ EnvioConCobro: bool, amount: int, ... }` |
| **Crear orden** | POST | `/orders/myorders` |
| Listar mis órdenes | GET | `/orders/myorders?result_number=&start=&orderBy=id&orderDirection=desc` |
| Orden por ID | GET | `/orders/{id}` |
| Orden por guía | GET | `/orders/guia/{numero}` |
| Generar guía | PUT | `/orders/{id}` con `{ status: "GUIA_GENERADA" }` |
| Guía en PDF | GET | *(endpoint de pdf)* |
| Historial de cartera | GET | `/wallet/...` |
| Crear ticket | GET | `/tickets/create?...&order_id=&description=&filtro=ORDEN ID` |

**Body de creación de orden (campos confirmados)**

```jsonc
{
  "state": "VALLE DEL CAUCA",      // departamento — requerido
  "city": "CALI",                   // ciudad — requerido
  "name": "Juan",                   // requerido
  "surname": "Pérez",               // requerido
  "dir": "Cra 100 #11-60 Apto 302", // dirección — requerido
  "phone": "3135654489",            // requerido
  "dni": "1144...",                 // opcional
  "dni_type": "CC",                 // opcional
  "notes": "Entregar en la tarde",
  "products": [ { "id": 12345, "quantity": 2, "variation_id": null } ],
  "distributionCompany": { "id": 3 },  // opcional: fuerza transportadora
  "total_order": 129900,
  "with_collection": true           // contraentrega
}
```

**Estados de orden**: `PENDIENTE` → `GUIA_GENERADA` → `EN_RUTA` → `ENTREGADO` / `NOVEDAD` / `DEVOLUCION` / `CANCELADO`.

**Implicaciones de diseño**
- El token **nunca** puede vivir en el HTML exportado → toda llamada a Dropi pasa por **nuestro backend** (proxy + cifrado de credenciales).
- La landing exportada envía el formulario COD a `POST /api/public/orders` con un `siteKey` público; el backend valida (anti-spam, honeypot, rate limit), crea la orden en Dropi y devuelve el `order_id`.
- Departamentos/ciudades se **cachean** desde Dropi y se sirven como JSON estático para que el select dependiente funcione sin exponer el token.
- Si falla la API (o no hay credenciales), **fallback a modo "pedido local"**: se guarda en nuestra DB + se abre WhatsApp con el resumen preformateado. Nunca se pierde la venta.

### 3.2 Otros proveedores a soportar

| Categoría | Proveedores | Qué hace la integración |
|---|---|---|
| **COD / dropshipping LATAM** | **Dropi**, Dropbo, Effecty, Shipmaster, Zendrop | Catálogo + crear orden + cotizar flete + estado |
| **Ecommerce** | Shopify (Admin API + draft orders), WooCommerce (REST v3), Tiendanube | Importar producto, crear pedido |
| **Pagos digitales / suscripción** | Stripe (Checkout + Billing Portal), Lemon Squeezy, Paddle, Mercado Pago, Wompi, Bold, ePayco, PayU | Botón → checkout hospedado; webhook de confirmación |
| **Infoproducto** | Hotmart, Kajabi, Gumroad | Link de checkout + postback |
| **CRM / mensajería** | WhatsApp Cloud API, Twilio, n8n/Make/Zapier webhook | Confirmación de pedido COD |
| **Analítica / píxeles** | Meta Pixel + Conversions API, TikTok Pixel + Events API, GA4, Google Ads, Clarity, Hotjar | Inyección en el export + eventos server-side |
| **Email** | Resend, Brevo, Mailchimp | Lead capture |

**Patrón común**: un `ProviderAdapter` con interfaz única —
`listProducts()`, `getProduct()`, `quoteShipping()`, `createOrder()`, `getOrderStatus()`, `listLocations()`— para que agregar un proveedor sea un archivo nuevo, no un refactor.

---

## 4. Riesgos y decisiones abiertas

1. **Costo/latencia de LLM** — generar 10 bloques con copy real cuesta ~8–16k tokens. Mitigación: generación en 2 fases + streaming + caché por *prompt hash* + presets deterministas sin IA.
2. **Calidad visual consistente** — el LLM NO decide CSS. Decide `variant` + `theme tokens`. El CSS lo escriben los componentes. Esto es lo que diferencia un generador que se ve bien de uno que se ve a plantilla.
3. **Credenciales** — cifrado at-rest (AES-GCM con clave de entorno), nunca en el cliente, nunca en el export.
4. **Legal COD** — habeas data / tratamiento de datos (Ley 1581 CO), checkbox de consentimiento obligatorio en el form.
5. **Multi-tenant desde el día 1** — `workspace → site → page → version`. Migrarlo después es carísimo.

---

## 5. Stack propuesto

- **Next.js 15 (App Router) + TypeScript** — el editor y el backend de integraciones en un solo deploy; API routes para proxy de Dropi y del LLM.
- **Tailwind CSS v4** con *theme tokens* en CSS variables → el mismo token sirve al preview React y al HTML exportado.
- **Zod** — schema único compartido entre validación del LLM, editor y renderer.
- **Zustand + immer** — estado del editor con undo/redo (history stack).
- **dnd-kit** — reordenar bloques.
- **Prisma + SQLite (dev) / Postgres (prod)** — multi-tenant.
- **Export**: función pura `PageSpec → string HTML` con CSS crítico inline, SVG inline, imágenes a `data:` o CDN, y `<script>` mínimo para el form COD, el countdown y los píxeles.
- **IA**: capa `LLMProvider` agnóstica (OpenAI / Anthropic / Gemini / Groq) + **modo BYOK** (el usuario pega su key) + **generador determinista offline** para demo sin key.
