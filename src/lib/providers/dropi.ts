import type { AppSettings } from "../db";
import type {
  CreateOrderInput,
  CreateOrderResult,
  FulfillmentProvider,
  ProviderLocation,
  ProviderProduct,
} from "./types";

/* ------------------------------------------------------------------ *
 *  Adaptador Dropi (dropshipping contraentrega LATAM).
 *
 *  Base URL     test: https://test-api.dropi.co/api
 *               prod: https://api.dropi.{tld}/api
 *  Autenticación
 *    · bearer          -> Authorization: Bearer <token>
 *    · integration-key -> dropi-integracion-key: <token>
 *
 *  Nota: Dropi ha publicado variantes de rutas según la versión de la
 *  cuenta. Por eso cada operación prueba varias rutas candidatas y se
 *  queda con la primera que responda 2xx. Así la integración no se
 *  rompe entre países/versiones.
 * ------------------------------------------------------------------ */

const TLD_BY_COUNTRY: Record<string, string> = {
  co: "co", mx: "mx", ec: "ec", pe: "pe", cl: "cl", pa: "pa",
  cr: "cr", gt: "gt", py: "py", ar: "ar", ve: "ve", es: "es",
};

export function dropiBaseUrl(s: AppSettings["dropi"]): string {
  if (s.baseUrlOverride) return s.baseUrlOverride.replace(/\/+$/, "");
  if (s.env === "test") return "https://test-api.dropi.co/api";
  const tld = TLD_BY_COUNTRY[s.country] || "co";
  return `https://api.dropi.${tld}/api`;
}

function headers(s: AppSettings["dropi"]): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (!s.token) return h;
  if (s.authScheme === "integration-key") h["dropi-integracion-key"] = s.token;
  else h["Authorization"] = `Bearer ${s.token}`;
  return h;
}

interface CallResult { ok: boolean; status: number; data: any; path: string }

async function call(
  s: AppSettings["dropi"],
  paths: string[],
  init: { method: "GET" | "POST" | "PUT"; body?: any; query?: Record<string, any> } = { method: "GET" },
): Promise<CallResult> {
  const base = dropiBaseUrl(s);
  let last: CallResult = { ok: false, status: 0, data: null, path: "" };
  for (const p of paths) {
    const qs = init.query
      ? "?" + new URLSearchParams(Object.entries(init.query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString()
      : "";
    const url = `${base}${p}${qs}`;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 25_000);
      const r = await fetch(url, {
        method: init.method,
        headers: headers(s),
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: ctl.signal,
        cache: "no-store",
      });
      clearTimeout(t);
      const text = await r.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      last = { ok: r.ok, status: r.status, data, path: p };
      if (r.ok) return last;
      // 401/403 => el token está mal; no tiene sentido probar más rutas
      if (r.status === 401 || r.status === 403) return last;
    } catch (e: any) {
      last = { ok: false, status: 0, data: String(e?.message || e), path: p };
    }
  }
  return last;
}

/* --------- normalizadores (Dropi devuelve formas distintas) --------- */

function arrOf(data: any): any[] {
  if (Array.isArray(data)) return data;
  for (const k of ["objects", "data", "products", "items", "result", "results", "cities", "states", "departments"]) {
    if (Array.isArray(data?.[k])) return data[k];
    if (Array.isArray(data?.data?.[k])) return data.data[k];
  }
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function toProduct(x: any): ProviderProduct {
  const imgs = (x?.gallery || x?.images || x?.product_images || [])
    .map((g: any) => (typeof g === "string" ? g : g?.url || g?.urlS3 || g?.image || ""))
    .filter(Boolean);
  return {
    id: x?.id ?? x?.product_id ?? "",
    name: x?.name ?? x?.product_name ?? "Producto",
    sku: x?.sku ?? "",
    price: Number(x?.price ?? x?.sale_price ?? 0) || 0,
    suggestedPrice: Number(x?.suggested_price ?? x?.suggestedPrice ?? 0) || 0,
    stock: Number(x?.stock ?? x?.quantity ?? 0) || 0,
    images: imgs,
    description: String(x?.description ?? "").replace(/<[^>]*>/g, "").slice(0, 600),
    variations: (x?.variations || []).map((v: any) => ({ id: v?.id, name: v?.attribute_values || v?.name || "", stock: v?.stock })),
    raw: x,
  };
}

function toLocation(x: any): ProviderLocation {
  return { id: x?.id ?? x?.state_id ?? x?.city_id ?? x?.name, name: String(x?.name ?? x?.state ?? x?.city ?? "").trim() };
}

/* ----------------------------- adaptador ----------------------------- */

export function createDropi(settings: AppSettings): FulfillmentProvider {
  const s = settings.dropi;

  return {
    id: "dropi",
    label: "Dropi",

    async testConnection() {
      if (!s.token) return { ok: false, detail: "Falta el token de Dropi." };
      const r = await call(s, ["/products/index"], { method: "POST", body: { keywords: "", pageSize: 1, startData: 0 } });
      if (r.ok) {
        const n = arrOf(r.data).length;
        return { ok: true, detail: `Conectado a ${dropiBaseUrl(s)} · respuesta OK (${n} producto(s) de muestra).`, raw: r.data };
      }
      if (r.status === 401 || r.status === 403)
        return { ok: false, detail: `Token rechazado (${r.status}). Revisa el esquema de autenticación (${s.authScheme}).`, raw: r.data };
      return { ok: false, detail: `No hubo respuesta válida (${r.status || "sin red"}) en ${dropiBaseUrl(s)}${r.path}.`, raw: r.data };
    },

    async listProducts(q = {}) {
      const body = { keywords: q.keywords ?? "", pageSize: q.pageSize ?? 24, startData: q.start ?? 0, order_by: "id", order_type: "desc" };
      const r = await call(s, ["/products/index", "/products"], { method: "POST", body });
      if (!r.ok) {
        const g = await call(s, ["/products/index", "/products"], { method: "GET", query: { keywords: q.keywords, pageSize: q.pageSize ?? 24, startData: q.start ?? 0 } });
        if (!g.ok) return [];
        return arrOf(g.data).map(toProduct);
      }
      return arrOf(r.data).map(toProduct);
    },

    async getProduct(id) {
      const r = await call(s, [`/products/${id}`, `/products/show/${id}`], { method: "GET" });
      if (!r.ok) return null;
      const d = r.data?.objects ?? r.data?.data ?? r.data;
      return d ? toProduct(Array.isArray(d) ? d[0] : d) : null;
    },

    async listStates() {
      const r = await call(s, ["/states", "/states/index", "/departments", "/locations/states"], { method: "GET" });
      if (!r.ok) return [];
      return arrOf(r.data).map(toLocation).filter((x) => x.name);
    },

    async listCities(stateId) {
      const r = await call(
        s,
        [`/cities`, `/cities/index`, `/states/${stateId}/cities`, `/locations/cities`],
        { method: "GET", query: { state_id: stateId, stateId, id: stateId } },
      );
      if (!r.ok) return [];
      return arrOf(r.data).map(toLocation).filter((x) => x.name);
    },

    async quoteShipping(input) {
      const r = await call(s, ["/orders/cotizaEnvioTransportadoraV2", "/orders/cotizaEnvioTransportadora"], {
        method: "POST",
        body: { EnvioConCobro: !!input.withCollection, amount: Math.round(input.amount), city_id: input.cityId },
      });
      return r.ok ? r.data : { error: `No se pudo cotizar (${r.status})`, raw: r.data };
    },

    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
      if (!s.token) return { ok: false, error: "Dropi no está configurado (falta token)." };
      const body: Record<string, any> = {
        state: input.state,
        city: input.city,
        name: input.name,
        surname: input.surname,
        dir: input.address,
        phone: input.phone,
        notes: input.notes || "",
        total_order: Math.round(input.total),
        with_collection: input.withCollection,
        type: input.withCollection ? "CON RECAUDO" : "SIN RECAUDO",
        products: input.productId
          ? [{ id: input.productId, quantity: input.quantity, variation_id: input.variationId ?? null }]
          : [],
      };
      if (input.dni) { body.dni = input.dni; body.dni_type = input.dniType || "CC"; }
      if (input.email) body.email = input.email;
      if (input.carrierId) body.distributionCompany = { id: input.carrierId };

      const r = await call(s, ["/orders/myorders", "/orders"], { method: "POST", body });
      if (!r.ok) {
        const msg =
          (typeof r.data === "object" && (r.data?.message || r.data?.error || JSON.stringify(r.data).slice(0, 300))) ||
          String(r.data || "").slice(0, 300);
        return { ok: false, error: `Dropi respondió ${r.status}: ${msg}`, raw: r.data };
      }
      const d = r.data?.objects ?? r.data?.data ?? r.data;
      const orderId = d?.id ?? d?.order_id ?? r.data?.id;
      return { ok: true, orderId, status: d?.status, guide: d?.shipping_guide ?? d?.guide, raw: r.data };
    },

    async getOrder(id) {
      const r = await call(s, [`/orders/${id}`, `/orders/show/${id}`], { method: "GET" });
      return r.ok ? r.data : { error: `No se pudo consultar (${r.status})` };
    },
  };
}

/* ----- Ubicaciones de respaldo (Colombia) para que el form nunca quede vacío ----- */

export const CO_STATES: { id: number; name: string; cities: string[] }[] = [
  { id: 1, name: "AMAZONAS", cities: ["LETICIA", "PUERTO NARIÑO"] },
  { id: 2, name: "ANTIOQUIA", cities: ["MEDELLÍN", "BELLO", "ITAGÜÍ", "ENVIGADO", "RIONEGRO", "APARTADÓ", "TURBO", "SABANETA", "COPACABANA", "CALDAS"] },
  { id: 3, name: "ARAUCA", cities: ["ARAUCA", "SARAVENA", "TAME"] },
  { id: 4, name: "ATLÁNTICO", cities: ["BARRANQUILLA", "SOLEDAD", "MALAMBO", "PUERTO COLOMBIA", "SABANALARGA"] },
  { id: 5, name: "BOGOTÁ D.C.", cities: ["BOGOTÁ"] },
  { id: 6, name: "BOLÍVAR", cities: ["CARTAGENA", "MAGANGUÉ", "TURBACO", "EL CARMEN DE BOLÍVAR"] },
  { id: 7, name: "BOYACÁ", cities: ["TUNJA", "DUITAMA", "SOGAMOSO", "CHIQUINQUIRÁ"] },
  { id: 8, name: "CALDAS", cities: ["MANIZALES", "LA DORADA", "CHINCHINÁ", "VILLAMARÍA"] },
  { id: 9, name: "CAQUETÁ", cities: ["FLORENCIA", "SAN VICENTE DEL CAGUÁN"] },
  { id: 10, name: "CASANARE", cities: ["YOPAL", "AGUAZUL", "VILLANUEVA"] },
  { id: 11, name: "CAUCA", cities: ["POPAYÁN", "SANTANDER DE QUILICHAO", "PUERTO TEJADA"] },
  { id: 12, name: "CESAR", cities: ["VALLEDUPAR", "AGUACHICA", "CODAZZI"] },
  { id: 13, name: "CHOCÓ", cities: ["QUIBDÓ", "ISTMINA"] },
  { id: 14, name: "CÓRDOBA", cities: ["MONTERÍA", "LORICA", "CERETÉ", "SAHAGÚN"] },
  { id: 15, name: "CUNDINAMARCA", cities: ["SOACHA", "ZIPAQUIRÁ", "FACATATIVÁ", "CHÍA", "MOSQUERA", "MADRID", "FUNZA", "CAJICÁ", "GIRARDOT", "FUSAGASUGÁ"] },
  { id: 16, name: "GUAINÍA", cities: ["INÍRIDA"] },
  { id: 17, name: "GUAVIARE", cities: ["SAN JOSÉ DEL GUAVIARE"] },
  { id: 18, name: "HUILA", cities: ["NEIVA", "PITALITO", "GARZÓN"] },
  { id: 19, name: "LA GUAJIRA", cities: ["RIOHACHA", "MAICAO", "URIBIA"] },
  { id: 20, name: "MAGDALENA", cities: ["SANTA MARTA", "CIÉNAGA", "FUNDACIÓN"] },
  { id: 21, name: "META", cities: ["VILLAVICENCIO", "ACACÍAS", "GRANADA"] },
  { id: 22, name: "NARIÑO", cities: ["PASTO", "IPIALES", "TUMACO"] },
  { id: 23, name: "NORTE DE SANTANDER", cities: ["CÚCUTA", "OCAÑA", "VILLA DEL ROSARIO", "PAMPLONA"] },
  { id: 24, name: "PUTUMAYO", cities: ["MOCOA", "PUERTO ASÍS"] },
  { id: 25, name: "QUINDÍO", cities: ["ARMENIA", "CALARCÁ", "MONTENEGRO"] },
  { id: 26, name: "RISARALDA", cities: ["PEREIRA", "DOSQUEBRADAS", "SANTA ROSA DE CABAL"] },
  { id: 27, name: "SAN ANDRÉS", cities: ["SAN ANDRÉS"] },
  { id: 28, name: "SANTANDER", cities: ["BUCARAMANGA", "FLORIDABLANCA", "GIRÓN", "PIEDECUESTA", "BARRANCABERMEJA"] },
  { id: 29, name: "SUCRE", cities: ["SINCELEJO", "COROZAL", "SAN MARCOS"] },
  { id: 30, name: "TOLIMA", cities: ["IBAGUÉ", "ESPINAL", "MELGAR", "HONDA"] },
  { id: 31, name: "VALLE DEL CAUCA", cities: ["CALI", "PALMIRA", "BUENAVENTURA", "TULUÁ", "CARTAGO", "BUGA", "JAMUNDÍ", "YUMBO", "CANDELARIA"] },
  { id: 32, name: "VAUPÉS", cities: ["MITÚ"] },
  { id: 33, name: "VICHADA", cities: ["PUERTO CARREÑO"] },
];
