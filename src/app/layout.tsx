import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Agendai — Seu negócio organizado. Seus agendamentos simplificados.",
    template: "%s | Agendai",
  },
  description:
    "Plataforma SaaS completa de agendamento online, clientes, financeiro, equipe e gestão profissional para clínicas, salões, barbearias e prestadores de serviços.",
  keywords: [
    "agendamento online",
    "sistema de agenda",
    "gestão para clínicas",
    "gestão para salões",
    "software para barbearias",
    "SaaS agendamento",
    "Agendai",
  ],
  authors: [{ name: "Agendai" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Agendai",
    title: "Agendai — Plataforma de Agendamento e Gestão Profissional",
    description:
      "Agendamentos, clientes, financeiro e gestão profissional em um só lugar.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('agendai-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans bg-white text-[#142B4F]">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
