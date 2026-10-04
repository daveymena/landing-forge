import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Landing Forge — VentasProIA · Generador de landings con IA",
  description:
    "Genera, edita y exporta landing pages modernas para dropshipping contraentrega, productos digitales y suscripciones. Integración con Dropi.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
