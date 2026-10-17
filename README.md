# Landing Forge

Generador profesional de landing pages con IA para tres verticales:

| Vertical | Para qué sirve | Estructura que genera |
|---|---|---|
| **COD / dropshipping** | Producto físico con pago contraentrega (LATAM) | Anuncio, navbar, hero de producto, garantías, beneficios, antes/después, reseñas con foto, comparativa, oferta escalonada, contador, formulario COD, garantía, FAQ, CTA, footer, barra fija y botón de WhatsApp |
| **Digital / infoproducto** | Curso, ebook, mentoría, membresía | Hero VSL, logos, problema, beneficios, temario, testimonios, pila de valor, garantía, precio único, FAQ, CTA |
| **SaaS / servicio** | Suscripción, software, agencia | Hero split, logos marquee, bento, pasos, métricas, testimonios, planes, formulario de leads, FAQ, CTA |

Todo es **JSON-first**: el prompt produce un `PageSpec` validado con Zod; el render, el editor, la IA y la exportación trabajan sobre ese mismo JSON. El LLM nunca escribe HTML ni CSS, solo elige bloques del catálogo y redacta el copy — por eso el resultado siempre compila y siempre se ve bien.

---

## Arranque

```bash
cd landing-forge
npm install
npm run dev          # http://localhost:3000
```

Sin configurar nada funciona el **motor determinista**: estructura, copy, precios, colores y bloques por vertical, sin llamar a ningún LLM. Para activar la IA tienes dos caminos: el panel **Motor de IA** del dashboard (se guarda en `data/settings.json`) o variables de entorno en `.env`.

### Proveedores soportados

| Proveedor | Clave | Gratis | Notas |
|---|---|---|---|
| **OpenAI-compatible (bridge)** | no | **sí, 10 modelos** | Lo que levanta `npm run bridge`. También vale para LiteLLM, LM Studio, vLLM o llama.cpp |
| **Ollama (local)** | no | sí | 100% offline. `ollama pull qwen2.5:7b-instruct`. Pide ~6 GB de RAM libre |
| **OpenCode Zen** | sí | parcial | Catálogo visible sin key; los modelos `-free` **sólo funcionan vía el puente** (ver abajo) |
| **OpenRouter** | sí | ~22 modelos `:free` | Un endpoint para ~470 modelos. Registro gratis, sin tarjeta |
| OpenAI · Anthropic · Gemini · Groq | sí | Gemini y Groq tienen capa gratuita | Rutas nativas (`/messages` en Anthropic, `:generateContent` en Gemini) |

En el panel puedes **cargar la lista real de modelos**, **probar la conexión** (te dice los ms que tardó) y definir **modelos de respaldo**: si el principal falla o agota su cuota, se intentan en orden antes de caer al motor determinista.

```bash
# .env — alternativa al panel
AI_PROVIDER=custom                        # custom | ollama | openrouter | opencode | openai | …
AI_BASE_URL=http://127.0.0.1:8787/v1
AI_MODEL=nemotron-3.5-lightning-free
OPENROUTER_API_KEY=sk-or-...              # según el proveedor
PUBLIC_APP_URL=https://tu-dominio.com     # a dónde envían el pedido las landings exportadas
```

### Modelos gratis sin API key (`npm run bridge`)

El tier gratuito de OpenCode Zen rechaza las peticiones que no vengan desde dentro de OpenCode (`403: free tier can only be used from within OpenCode`). El puente incluido en `tools/opencode-bridge/` resuelve eso: habla con el servidor local de opencode y lo expone como una API OpenAI estándar.

```bash
npm i -g opencode-ai     # una vez
npm run bridge           # levanta opencode + el puente en :8787
```

Luego, en el panel de IA: proveedor **OpenAI-compatible**, «Cargar modelos» y elige uno. Verificado funcionando con `nemotron-3.5-lightning-free` (landing completa de 17 bloques en ~50-70 s, 0 €).

Detalles de implementación, por si lo tocas:

- Son **cero dependencias**, Node 20+. `PORT`, `OPENCODE_URL`, `OPENCODE_AGENT`, `BRIDGE_API_KEY` y `AUTOSTART` se configuran por entorno.
- Arranca `opencode serve` solo si no responde, y lo hace con su propio `opencode.json` (agente `bridge`, prompt neutro) para que el modelo no conteste como asistente de programación.
- **No desactives las herramientas** en las peticiones a opencode: Zen devuelve 403 si el payload no se parece al de un cliente nativo. Por el mismo motivo hay que usar agentes `primary`, no `subagent`.
- Expone `GET /health`, `GET /v1/models` y `POST /v1/chat/completions` (con `stream` y `response_format` básicos).

El chip del dashboard indica en todo momento qué motor está activo. Si el LLM falla, devuelve JSON inválido o entrega menos de 4 bloques, la app **cae automáticamente** al motor determinista y te lo avisa.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en `0.0.0.0:3000` |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run typecheck` | `tsc --noEmit` (el build también falla si hay errores de tipos) |
| `npm run bridge` | Puente OpenAI-compatible con los modelos gratuitos de OpenCode (`:8787`) |

### Verificar el deploy

`scripts/verificar-landingforge.mjs` consulta el deploy y genera una landing de prueba. Requiere `LANDINGFORGE_API_KEY` en el entorno y termina con error antes de hacer peticiones si falta. En PowerShell:

```powershell
$env:LANDINGFORGE_API_KEY = "<clave configurada para la integración>"
node scripts/verificar-landingforge.mjs
```

El script usa un host de deploy fijo y `POST /api/generate` crea datos de prueba; ejecútalo solo cuando esa comprobación contra ese entorno sea intencional. No guardes la clave en el repositorio ni la incluyas en logs o historial compartido de comandos.

---

## Flujo de trabajo

0. **(Opcional) Importa desde una URL.** Pega el enlace de la ficha de un producto y pulsa «Analizar»: la app lee nombre, precio, moneda, fotos, valoración y características, te deja corregirlo y genera la landing con esos datos reales. Ver [Importar desde una URL](#importar-desde-una-url).
1. **Describe el producto** en el dashboard (país, precio, público y promesa). `⌘/Ctrl + Enter` genera.
2. **Edita**: el editor tiene tres caminos y se pueden mezclar libremente.
   - *A mano, en el panel*: el inspector se autogenera desde el catálogo (texto, número, color, select, imagen, listas ordenables…).
   - *A mano, en el lienzo*: haz clic en cualquier texto del preview y escríbelo directamente.
   - *Con IA*: la barra inferior acepta instrucciones en lenguaje natural («hazlo más urgente», «agrega una comparativa», «precio 129900»). Sin API key sigue funcionando un intérprete local para colores, precios, bloques y tono.
3. **Ajusta el tema**: 8 presets (midnight, obsidian, aurora, clean, retail, sand, emerald, mono), color de acento, radios, densidad, fuentes y efectos.
4. **Conecta**: Dropi, webhook, WhatsApp, checkout externo y píxeles (Meta, TikTok, GA4, Google Ads).
5. **Exporta**: un único `.html` autocontenido (CSS y JS en línea, sin dependencias) listo para subir a cualquier hosting.

Atajos: `⌘Z` deshacer · `⇧⌘Z` rehacer · `⌘S` guardar. El autoguardado corre solo 1,4 s después del último cambio.

---

## Importar desde una URL

`POST /api/extract {url}` descarga la ficha y la interpreta en cascada, de más fiable a más adivinatorio:

1. **JSON-LD** (`schema.org/Product`) — lo publican Shopify, WooCommerce, IKEA, la mayoría de tiendas serias.
2. **Microdatos** `itemprop`.
3. **Open Graph / Twitter / meta** estándar.
4. **Heurísticas** sobre el HTML: `<h1>`, regex de precios por moneda, `<img>` grandes, listas de características.

Cada campo recuerda su origen y la respuesta trae una `confidence` de 0 a 1; la interfaz la muestra como *fiables · revisa antes de usar · poco fiables*, para que corrijas antes de gastar una llamada al LLM.

| Probado con | Resultado |
|---|---|
| Gymshark (Shopify) | nombre, 22 USD, 8 fotos, ★3.9 (460), 3 características · confianza 0.94 |
| IKEA | nombre, 169 USD, 8 fotos, ★4.6 (2913), 6 características · confianza 0.79 |
| books.toscrape.com (sin metadatos) | nombre, 13.76 GBP, 7 fotos · confianza 0.49 (avisa) |

Qué hace después con esos datos: el LLM escribe **todo el copy en español con enfoque de venta** (traduciendo la ficha original si hace falta), pero **el precio, el nombre y las fotos los manda la fuente, no el modelo**. Si el LLM se inventa un precio tachado incoherente se descarta, y los paquetes (`bundle`) se recalculan a partir del precio real.

Límites honestos:

- Las tiendas con protección anti-bot (Amazon, AliExpress, Temu y parte de Mercado Libre) devuelven 403 o un HTML vacío. El error te lo dice y puedes pegar los datos a mano.
- Las fotos se enlazan desde el servidor original. Si esa tienda bloquea el hotlinking o borra la imagen, se rompen: para producción, descárgalas y súbelas a tu propio hosting.
- No se extraen variantes (tallas, colores) ni stock por variante.
- Se bloquean URLs de red local (`localhost`, `10.x`, `192.168.x`…) para que la app no sirva de proxy hacia tu red.

## Integración con Dropi

1. En `app.dropi.co` → **Dashboard → Shop → +Agregar**, elige el tipo de integración y copia el token.
2. En Landing Forge: dashboard → tarjeta **Dropi → Configurar**. Pega el token, elige entorno (`test` o `producción`), país y esquema de autenticación (`Bearer` o `dropi-integracion-key`). Pulsa **Probar conexión**.
3. En el editor, pestaña **Conectar → Proveedor: Dropi**.

Qué hace la integración:

- **Departamentos y ciudades reales** de Dropi en los selects del formulario (con caché de 30 min y fallback a los 33 departamentos de Colombia si la API no responde).
- **Creación automática de la orden** en Dropi al enviarse el formulario.
- **Catálogo**: `GET /api/dropi/products` para traer productos y precios.
- El **token nunca viaja al HTML exportado**. La landing publica en `/api/public/orders` con el `siteId`; el token se usa solo en el servidor.

Cada operación prueba varias rutas candidatas de la API y se queda con la primera que responde 2xx (se detiene en 401/403 para no quemar intentos). Base por defecto: `https://test-api.dropi.co/api`, con override manual si lo necesitas.

**Siempre** se guarda una copia local del pedido en `data/orders.json` y, si configuras un webhook, se dispara aunque Dropi falle. Nunca se pierde una venta por un error del proveedor. La respuesta incluye además un **deep link de WhatsApp** con el pedido resumido: confirmar antes de despachar sube la tasa de entrega COD de ~50 % a niveles sanos.

---

## Arquitectura

```
Prompt ──► parseBrief ──► LLM (arquitecto + copywriter, 1 llamada, JSON mode)
                              │  fallback ▼
                              └──────► generateDeterministic
                                            │
                                   normalizeToSpec + Zod
                                            │
                     ┌──────────────────────┼──────────────────────┐
                 Renderer                Editor                 Export
              (HTML strings)        (iframe + store)        (1 archivo .html)
```

```
src/
├── app/
│   ├── page.tsx                 dashboard: prompt, ejemplos, Dropi, lista de landings
│   ├── editor/[id]/page.tsx     carga el spec y monta el editor
│   └── api/                     12 rutas: generate, ai/edit, ai/providers, sites, export,
│                                settings, dropi/{test,products}, orders,
│                                public/{locations,orders}
├── components/                  Editor, Preview, BlockList, Inspector, Panels,
│                                AiBar, BlockLibrary, DropiConnect, AiConnect
└── lib/
    ├── schema.ts                PageSpec (Zod) + helpers de rutas y operaciones
    ├── blocks/catalog.ts        29 bloques: variantes, campos y valores por defecto
    ├── theme.ts                 8 presets y sugerencia automática
    ├── render/                  css · blocks · runtime · editorRuntime · index
    ├── ai/                      brief · deterministic · provider (8 proveedores,
    │                            fallbacks y listado de modelos) · prompts · generate
    ├── providers/               dropi (+ tipos para añadir otros)
    ├── store.ts                 Zustand con historial de 60 pasos
    └── db.ts                    almacén JSON en data/ con escritura atómica

tools/opencode-bridge/           puente OpenAI-compatible (cero deps) + su opencode.json
```

Decisiones deliberadas: sin Tailwind (CSS propio), sin base de datos (JSON en `data/`), sin dnd-kit (drag & drop nativo), render a strings en vez de componentes React (permite exportar un HTML idéntico al preview) y `props` laxas en Zod (una variación inesperada del LLM nunca rompe la página; `withDefaults` rellena lo que falte).

### Añadir un bloque

1. Descríbelo en `src/lib/blocks/catalog.ts` (tipo, variantes, `fields[]`, `defaults`).
2. Impleméntalo en `src/lib/render/blocks.ts` devolviendo un string HTML.
3. Listo: aparece en la biblioteca, el inspector se genera solo y la IA ya puede usarlo (el catálogo se inyecta condensado en el prompt).

### Añadir un proveedor además de Dropi

Implementa la interfaz de `src/lib/providers/types.ts` (`testConnection`, `listProducts`, `states`, `cities`, `createOrder`) y enchúfalo en `src/app/api/public/orders/route.ts`.

---

## API pública

| Endpoint | Descripción |
|---|---|
| `POST /api/generate` | `{prompt, save?}` → `{spec, engine, provider, model, ms, warnings}` |
| `POST /api/ai/edit` | `{spec, instruction}` → `{spec, reply, ops, engine}` |
| `GET/POST /api/sites` · `GET/PUT/DELETE /api/sites/[id]` | CRUD de landings |
| `GET /api/export/[id]?download=0\|1` | HTML autocontenido |
| `GET/POST /api/settings` | Ajustes globales (el token se devuelve enmascarado) |
| `POST /api/dropi/test` · `GET /api/dropi/products` | Conexión y catálogo |
| `GET /api/public/locations[?state=]` | Departamentos y ciudades (CORS abierto) |
| `POST /api/public/orders` | Pedido desde la landing exportada (CORS abierto) |
| `GET /api/orders?site=` | Pedidos recibidos |

Protecciones del endpoint público: honeypot `website`, límite de 12 peticiones por minuto e IP, saneado y recorte de todos los campos, y validación distinta para COD (`name, phone, city, dir`) y lead (`email`).

---

## Limitaciones conocidas

- El almacén es un archivo JSON: perfecto para uno o pocos usuarios, no para multiusuario concurrente. Cambiar `lib/db.ts` por Postgres es un reemplazo aislado.
- No hay hosting propio: la salida es un HTML que subes donde quieras. Si lo sirves desde otro dominio, define `PUBLIC_APP_URL` para que los pedidos lleguen a esta app.
- Las imágenes son por URL (no hay subida de archivos todavía).
- El catálogo de Dropi no se sincroniza en segundo plano: se consulta bajo demanda.
- Los modelos gratuitos son **lentos y rotan**: una landing completa tarda 45-75 s (frente a 5-10 s con un modelo de pago) y los identificadores `-free` de Zen cambian cada pocas semanas. Por eso el panel lista los modelos en vivo en vez de fiarse de una lista fija, y por eso existen los modelos de respaldo.
- El puente no transmite la respuesta token a token: `stream: true` se responde en un único trozo SSE al terminar.
