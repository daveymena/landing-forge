import type { PageSpec } from "../schema";
import { buildCss, fontLink } from "./css";
import { renderBlock, esc, type Ctx } from "./blocks";
import { runtimeScript, pixelsScript } from "./runtime";
import { EDITOR_RUNTIME } from "./editorRuntime";

export interface RenderOptions {
  mode?: "edit" | "export";
  /** URL base de la app, se inyecta para que el form sepa a dónde postear */
  endpoint?: string;
  /** incluir JSON-LD de producto / FAQ */
  schemaOrg?: boolean;
}

export function renderPage(spec: PageSpec, opts: RenderOptions = {}): string {
  const mode = opts.mode ?? "export";
  const spec2: PageSpec = opts.endpoint
    ? { ...spec, settings: { ...spec.settings, endpoint: opts.endpoint } }
    : spec;

  const body = spec2.blocks
    .map((b, i) => renderBlock({ spec: spec2, mode, index: i } as Ctx, b))
    .join("\n");

  const css = buildCss(spec2.theme);
  const title = spec2.meta.title || spec2.name;
  const desc = spec2.meta.description || "";
  const jsonLd = opts.schemaOrg === false ? "" : buildJsonLd(spec2);

  return `<!doctype html>
<html lang="${esc(spec2.locale || "es")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ""}
<meta property="og:title" content="${esc(title)}">
${desc ? `<meta property="og:description" content="${esc(desc)}">` : ""}
${spec2.meta.ogImage ? `<meta property="og:image" content="${esc(spec2.meta.ogImage)}">` : ""}
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
${fontLink(spec2.theme)}
${mode === "export" ? pixelsScript(spec2) : ""}
<style>${css}</style>
</head>
<body id="top">
${body}
${jsonLd}
<script>${runtimeScript(spec2)}</script>
${mode === "edit" ? `<script>${EDITOR_RUNTIME}</script>` : ""}
</body>
</html>`;
}

function buildJsonLd(spec: PageSpec): string {
  const nodes: any[] = [];
  const faq = spec.blocks.find((b) => b.type === "faq" && b.visible !== false);
  if (faq && Array.isArray(faq.props?.items) && faq.props.items.length) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.props.items.map((x: any) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.a },
      })),
    });
  }
  if (spec.vertical === "cod" && spec.product.name && spec.product.price) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: spec.product.name,
      image: spec.product.images?.slice(0, 3) ?? [],
      offers: {
        "@type": "Offer",
        price: spec.product.price,
        priceCurrency: spec.product.currency,
        availability: "https://schema.org/InStock",
      },
    });
  }
  if (!nodes.length) return "";
  return nodes
    .map((n) => `<script type="application/ld+json">${JSON.stringify(n)}</script>`)
    .join("\n");
}

export { buildCss, fontLink };
