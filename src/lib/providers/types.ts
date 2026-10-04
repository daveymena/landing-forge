/* ------------------------------------------------------------------ *
 *  Interfaz común de proveedor de fulfillment.
 *  Agregar Dropbo, Effecty, Shopify o WooCommerce = un archivo nuevo
 *  que implemente esto; nada más cambia en la app.
 * ------------------------------------------------------------------ */

export interface ProviderProduct {
  id: string | number;
  name: string;
  sku?: string;
  price?: number;
  suggestedPrice?: number;
  stock?: number;
  images: string[];
  description?: string;
  variations?: { id: string | number; name: string; stock?: number }[];
  raw?: any;
}

export interface ProviderLocation {
  id: string | number;
  name: string;
}

export interface CreateOrderInput {
  name: string;
  surname: string;
  phone: string;
  email?: string;
  dni?: string;
  dniType?: string;
  state: string;
  stateId?: string | number;
  city: string;
  cityId?: string | number;
  address: string;
  notes?: string;
  quantity: number;
  total: number;
  withCollection: boolean;
  productId?: string | number;
  variationId?: string | number;
  carrierId?: string | number;
}

export interface CreateOrderResult {
  ok: boolean;
  orderId?: string | number;
  guide?: string;
  status?: string;
  error?: string;
  raw?: any;
}

export interface FulfillmentProvider {
  id: string;
  label: string;
  testConnection(): Promise<{ ok: boolean; detail: string; raw?: any }>;
  listProducts(q?: { keywords?: string; pageSize?: number; start?: number }): Promise<ProviderProduct[]>;
  getProduct?(id: string | number): Promise<ProviderProduct | null>;
  listStates(): Promise<ProviderLocation[]>;
  listCities(stateId: string | number): Promise<ProviderLocation[]>;
  quoteShipping?(input: { amount: number; withCollection: boolean; cityId?: string | number }): Promise<any>;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  getOrder?(id: string | number): Promise<any>;
}
