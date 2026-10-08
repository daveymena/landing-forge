import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El preview de Arena/e2b sirve la app bajo https://{port}-{sandbox}.e2b.app
  allowedDevOrigins: ["*.e2b.app", "*.app.github.dev", "localhost", "127.0.0.1"],
  typescript: { ignoreBuildErrors: false },
  // Subir videos desde el editor (POST /api/media): el proxy corta el cuerpo
  // en 10 MB por defecto y un video de producto pesa más.
  experimental: { proxyClientMaxBodySize: "100mb" },
  async headers() {
    return [
      {
        // El endpoint público lo consumen las landings exportadas en otros dominios
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
