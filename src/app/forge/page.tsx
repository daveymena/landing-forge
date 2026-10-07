import Link from "next/link";

/* Panel puente: acceso rápido a la nueva app de landings.
   Esta ruta vive en landings.ventasproia.com y abre el generador. */
export const metadata = { title: "Landing Forge — VentasProIA" };

export default function ForgeHome() {
  return (
    <main style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f6f7fb", color: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <img src="/icon.svg" alt="Landing Forge" width={72} height={72} style={{ margin: "0 auto 18px" }} />
        <h1 style={{ fontSize: 30, margin: "0 0 10px", fontWeight: 700 }}>Landing Forge — VentasProIA</h1>
        <p style={{ color: "#64748b", marginBottom: 26 }}>
          El generador de landings oficial de VentasProIA. Atlas y el bot de WhatsApp
          crean, editan y publican desde aquí.
        </p>
        <Link href="/" style={{ display: "inline-block", background: "#4f46e5", color: "#fff", padding: "13px 30px", borderRadius: 12, fontWeight: 600, textDecoration: "none" }}>
          Abrir el generador
        </Link>
      </div>
    </main>
  );
}