import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agendai — Plataforma de Agendamento e Gestão",
    short_name: "Agendai",
    description:
      "Agendamentos, clientes, financeiro e gestão profissional em um só lugar.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F5F7FA",
    theme_color: "#2563EB",
    orientation: "portrait-primary",
    lang: "pt-BR",
    categories: ["business", "productivity", "medical", "lifestyle"],
    icons: [
      {
        src: "/brand/agendai-symbol.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/agendai-symbol.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/brand/agendai-symbol.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

