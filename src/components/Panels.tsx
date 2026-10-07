"use client";

import { useEditor } from "@/lib/store";
import { PRESETS } from "@/lib/theme";
import { VERTICAL_LABEL, VERTICALS } from "@/lib/schema";

const FONTS = ["Inter", "Space Grotesk", "Archivo", "Outfit", "Instrument Sans", "Plus Jakarta Sans", "Fraunces", "Sora", "IBM Plex Sans"];

export function ThemePanel() {
  const theme = useEditor((s) => s.spec.theme);
  const patchTheme = useEditor((s) => s.patchTheme);
  if (!theme) return null;

  return (
    <div className="pane__b">
      <label className="lbl">Estilo de la página</label>
      <div className="presets" style={{ marginBottom: 14 }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className="preset"
            aria-pressed={theme.preset === p.id}
            onClick={() => patchTheme({ preset: p.id, mode: p.theme.mode, colors: p.theme.colors, fonts: p.theme.fonts, radius: p.theme.radius })}
          >
            <span className="preset__sw">
              <i style={{ background: p.theme.colors.bg, border: "1px solid #333" }} />
              <i style={{ background: p.theme.colors.accent }} />
              <i style={{ background: p.theme.colors.accent2 }} />
            </span>
            <span className="preset__n">{p.name}</span>
            <span className="preset__h">{p.hint}</span>
          </button>
        ))}
      </div>

      <label className="lbl">Modo</label>
      <div className="seg" style={{ marginBottom: 13, width: "100%" }}>
        {(["dark", "light"] as const).map((m) => (
          <button key={m} style={{ flex: 1, textAlign: "center" }} aria-pressed={theme.mode === m}
            onClick={() => patchTheme({ mode: m })}>
            {m === "dark" ? "Oscuro" : "Claro"}
          </button>
        ))}
      </div>

      <details className="sect">
        <summary>Psicología de color (guía)</summary>
        <div className="sect__b">
          <p className="hint">Rojo/naranja (urgency, retail): urgencia y oferta flash · ideal COD y 2x1.</p>
          <p className="hint">Negro+dorado (premium): lujo y aspiración · belleza, relojes, hogar premium.</p>
          <p className="hint">Azul/violeta (aurora, vsl, midnight): tecnología y confianza · SaaS, cursos, apps.</p>
          <p className="hint">Verde (emerald, fresh): salud, dinero y calma · fitness, finanzas, ebooks.</p>
          <p className="hint">Beige editorial (sand): cercanía artesanal · locales, restaurantes, bienestar.</p>
          <p className="hint">Alto contraste (mono): rebeldía y precio · viral, moda, anuncios directos.</p>
        </div>
      </details>

      <details className="sect" open>
        <summary>Colores</summary>
        <div className="sect__b">
          {([
            ["accent", "Acento"], ["accent2", "Acento 2"], ["bg", "Fondo"],
            ["surface", "Superficie"], ["surfaceAlt", "Superficie alt."], ["border", "Borde"],
            ["text", "Texto"], ["muted", "Texto suave"], ["success", "Éxito"], ["danger", "Alerta"],
          ] as const).map(([k, label]) => (
            <div className="fld" key={k}>
              <label className="lbl">{label}</label>
              <div className="colorrow">
                <input type="color" value={(theme.colors as any)[k]} onChange={(e) => patchTheme({ colors: { [k]: e.target.value } })} />
                <input className="inp" value={(theme.colors as any)[k]} onChange={(e) => patchTheme({ colors: { [k]: e.target.value } })} />
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="sect" open>
        <summary>Tipografía y forma</summary>
        <div className="sect__b">
          <div className="fld">
            <label className="lbl">Display (titulares)</label>
            <select className="sel" value={theme.fonts.display} onChange={(e) => patchTheme({ fonts: { display: e.target.value } })}>
              {FONTS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="fld">
            <label className="lbl">Cuerpo</label>
            <select className="sel" value={theme.fonts.sans} onChange={(e) => patchTheme({ fonts: { sans: e.target.value } })}>
              {FONTS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="fld">
            <label className="lbl">Radio de bordes · {theme.radius}px</label>
            <input type="range" min={0} max={36} value={theme.radius} style={{ width: "100%" }}
              onChange={(e) => patchTheme({ radius: Number(e.target.value) })} />
          </div>
          <div className="fld">
            <label className="lbl">Ancho máximo · {theme.maxWidth}px</label>
            <input type="range" min={900} max={1440} step={20} value={theme.maxWidth} style={{ width: "100%" }}
              onChange={(e) => patchTheme({ maxWidth: Number(e.target.value) })} />
          </div>
          <div className="fld">
            <label className="lbl">Densidad</label>
            <select className="sel" value={theme.density} onChange={(e) => patchTheme({ density: e.target.value })}>
              <option value="compact">Compacta</option>
              <option value="normal">Normal</option>
              <option value="spacious">Espaciosa</option>
            </select>
          </div>
        </div>
      </details>

      <details className="sect">
        <summary>Efectos</summary>
        <div className="sect__b col">
          {([["grain", "Textura de grano"], ["glow", "Resplandor en el hero"], ["animate", "Animación al hacer scroll"]] as const).map(([k, l]) => (
            <label className="row" key={k} style={{ gap: 8, cursor: "pointer" }}>
              <input className="sw" type="checkbox" checked={(theme.effects as any)[k]}
                onChange={(e) => patchTheme({ effects: { [k]: e.target.checked } })} />
              <span style={{ fontSize: 13 }}>{l}</span>
            </label>
          ))}
          <label className="row" style={{ gap: 8, cursor: "pointer" }}>
            <input className="sw" type="checkbox" checked={theme.fonts.webfonts}
              onChange={(e) => patchTheme({ fonts: { webfonts: e.target.checked } })} />
            <span style={{ fontSize: 13 }}>Cargar fuentes de Google</span>
          </label>
          <div className="hint">Desactívalo si necesitas que el HTML exportado funcione 100% sin internet.</div>
        </div>
      </details>
    </div>
  );
}

export function PagePanel() {
  const spec = useEditor((s) => s.spec);
  const patchRoot = useEditor((s) => s.patchRoot);
  if (!spec?.meta) return null;

  return (
    <div className="pane__b">
      <div className="fld">
        <label className="lbl">Nombre del proyecto</label>
        <input className="inp" value={spec.name} onChange={(e) => patchRoot("name", e.target.value)} />
      </div>
      <div className="fld">
        <label className="lbl">Slug</label>
        <input className="inp" value={spec.slug} onChange={(e) => patchRoot("slug", e.target.value)} />
      </div>
      <div className="fld">
        <label className="lbl">Vertical</label>
        <select className="sel" value={spec.vertical} onChange={(e) => patchRoot("vertical", e.target.value)}>
          {VERTICALS.map((v) => <option key={v} value={v}>{VERTICAL_LABEL[v]}</option>)}
        </select>
      </div>

      <details className="sect" open>
        <summary>SEO y compartir</summary>
        <div className="sect__b">
          <div className="fld">
            <label className="lbl">Título (máx 60)</label>
            <input className="inp" value={spec.meta.title} onChange={(e) => patchRoot("meta.title", e.target.value)} />
          </div>
          <div className="fld">
            <label className="lbl">Descripción (máx 155)</label>
            <textarea className="inp" value={spec.meta.description} onChange={(e) => patchRoot("meta.description", e.target.value)} />
          </div>
          <div className="fld">
            <label className="lbl">Imagen OG</label>
            <input className="inp" value={spec.meta.ogImage} onChange={(e) => patchRoot("meta.ogImage", e.target.value)} />
          </div>
        </div>
      </details>

      <details className="sect" open>
        <summary>Producto</summary>
        <div className="sect__b">
          <div className="fld">
            <label className="lbl">Nombre</label>
            <input className="inp" value={spec.product.name} onChange={(e) => patchRoot("product.name", e.target.value)} />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="fld" style={{ flex: 1 }}>
              <label className="lbl">Precio</label>
              <input className="inp" type="number" value={spec.product.price}
                onChange={(e) => patchRoot("product.price", Number(e.target.value))} />
            </div>
            <div className="fld" style={{ flex: 1 }}>
              <label className="lbl">Precio tachado</label>
              <input className="inp" type="number" value={spec.product.compareAtPrice}
                onChange={(e) => patchRoot("product.compareAtPrice", Number(e.target.value))} />
            </div>
          </div>
          <div className="fld">
            <label className="lbl">Moneda</label>
            <select className="sel" value={spec.product.currency} onChange={(e) => patchRoot("product.currency", e.target.value)}>
              {["COP", "MXN", "USD", "EUR", "PEN", "CLP", "ARS", "GTQ", "CRC", "PAB", "BRL"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fld">
            <label className="lbl">ID de producto en Dropi</label>
            <input className="inp" value={String(spec.product.dropiProductId ?? "")}
              placeholder="Ej: 128455"
              onChange={(e) => patchRoot("product.dropiProductId", e.target.value)} />
            <div className="hint">Necesario para que la orden se cree con el producto correcto en Dropi.</div>
          </div>
          <div className="fld">
            <label className="lbl">Imágenes del producto (una por línea)</label>
            <textarea className="inp" style={{ minHeight: 86 }}
              value={(spec.product.images ?? []).join("\n")}
              onChange={(e) => patchRoot("product.images", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
            <div className="hint">Se usan en el hero «Producto COD» cuando el bloque no trae galería propia.</div>
          </div>
        </div>
      </details>
    </div>
  );
}

export function IntegrationsPanel() {
  const spec = useEditor((s) => s.spec);
  const patchRoot = useEditor((s) => s.patchRoot);
  if (!spec?.settings) return null;
  const st = spec.settings;

  return (
    <div className="pane__b">
      <details className="sect" open>
        <summary>Destino de los pedidos</summary>
        <div className="sect__b">
          <div className="fld">
            <label className="lbl">Proveedor</label>
            <select className="sel" value={st.integration.provider}
              onChange={(e) => patchRoot("settings.integration.provider", e.target.value)}>
              <option value="none">Solo guardar en el panel</option>
              <option value="dropi">Dropi (crear orden contraentrega)</option>
              <option value="webhook">Webhook (Make / n8n / Zapier / CRM)</option>
              <option value="whatsapp">Solo WhatsApp</option>
            </select>
          </div>
          <div className="fld">
            <label className="lbl">Webhook (opcional, siempre se dispara)</label>
            <input className="inp" placeholder="https://hook.eu2.make.com/…" value={st.integration.webhookUrl}
              onChange={(e) => patchRoot("settings.integration.webhookUrl", e.target.value)} />
          </div>
          <div className="fld">
            <label className="lbl">Mensaje de éxito</label>
            <textarea className="inp" value={st.integration.successMessage}
              onChange={(e) => patchRoot("settings.integration.successMessage", e.target.value)} />
          </div>
          <div className="fld">
            <label className="lbl">Redirigir a (gracias / checkout)</label>
            <input className="inp" placeholder="https://…/gracias" value={st.integration.redirectUrl}
              onChange={(e) => patchRoot("settings.integration.redirectUrl", e.target.value)} />
          </div>
        </div>
      </details>

      <details className="sect" open>
        <summary>WhatsApp</summary>
        <div className="sect__b">
          <div className="fld">
            <label className="lbl">Número con indicativo</label>
            <input className="inp" placeholder="573001234567" value={st.whatsapp}
              onChange={(e) => patchRoot("settings.whatsapp", e.target.value)} />
            <div className="hint">
              Se usa para el botón flotante y, si falla la API, para que el pedido se recupere por chat en vez de perderse.
            </div>
          </div>
        </div>
      </details>

      <details className="sect">
        <summary>Checkout (digital / suscripción)</summary>
        <div className="sect__b">
          <div className="fld">
            <label className="lbl">Pasarela</label>
            <select className="sel" value={st.checkout.provider}
              onChange={(e) => patchRoot("settings.checkout.provider", e.target.value)}>
              {[["none", "Ninguna"], ["stripe", "Stripe"], ["lemonsqueezy", "Lemon Squeezy"], ["paddle", "Paddle"],
                ["mercadopago", "Mercado Pago"], ["wompi", "Wompi"], ["bold", "Bold"], ["hotmart", "Hotmart"], ["custom", "Otra"]]
                .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="fld">
            <label className="lbl">URL de checkout</label>
            <input className="inp" placeholder="https://buy.stripe.com/…" value={st.checkout.url}
              onChange={(e) => patchRoot("settings.checkout.url", e.target.value)} />
            <div className="hint">Los botones de precio y el formulario de lead redirigen aquí.</div>
          </div>
        </div>
      </details>

      <details className="sect">
        <summary>Píxeles y analítica</summary>
        <div className="sect__b">
          {([["metaPixelId", "Meta Pixel ID"], ["tiktokPixelId", "TikTok Pixel ID"], ["ga4Id", "GA4 (G-…)"], ["googleAdsId", "Google Ads (AW-…)"]] as const).map(([k, l]) => (
            <div className="fld" key={k}>
              <label className="lbl">{l}</label>
              <input className="inp" value={(st.pixels as any)[k]}
                onChange={(e) => patchRoot(`settings.pixels.${k}`, e.target.value)} />
            </div>
          ))}
          <div className="fld">
            <label className="lbl">HTML extra en el head</label>
            <textarea className="inp" style={{ fontFamily: "var(--mono)", fontSize: 11.4 }} value={st.pixels.customHead}
              onChange={(e) => patchRoot("settings.pixels.customHead", e.target.value)} />
          </div>
          <div className="hint">
            Eventos que se disparan solos: <code>ViewContent</code> al cargar, <code>AddToCart</code> al cambiar cantidad,{" "}
            <code>InitiateCheckout</code> en los CTA y <code>Purchase</code>/<code>Lead</code> al enviar el formulario.
          </div>
        </div>
      </details>

      <details className="sect">
        <summary>Legal</summary>
        <div className="sect__b">
          <div className="fld">
            <label className="lbl">Texto de consentimiento (habeas data)</label>
            <textarea className="inp" value={st.consentText}
              onChange={(e) => patchRoot("settings.consentText", e.target.value)} />
          </div>
        </div>
      </details>
    </div>
  );
}
