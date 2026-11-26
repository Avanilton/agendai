import Link from "next/link";
import { ShieldCheck, CalendarCheck2, Lock } from "lucide-react";
import { AgendaiLogo } from "@/components/brand/agendai-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
      {/* Left brand panel (desktop) */}
      <aside className="hidden flex-col justify-between bg-[#142B4F] p-10 text-white lg:col-span-5 lg:flex">
        <Link href="/">
          <AgendaiLogo theme="dark" size="lg" />
        </Link>

        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold leading-tight">
            Organize sua agenda e simplifique a gestão do seu negócio.
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Ambiente seguro com controle de permissões, trilha de
            auditoria e conformidade com a LGPD desde o primeiro acesso.
          </p>

          <div className="space-y-3 pt-2 text-sm text-slate-200">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[#FF914D]">
                <CalendarCheck2 className="h-4 w-4" />
              </span>
              <span>Agendamentos internos e página online 24h</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[#FF914D]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span>Isolamento total entre empresas e proteção LGPD</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[#FF914D]">
                <Lock className="h-4 w-4" />
              </span>
              <span>Sessões protegidas!</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Agendai. Plataforma de Agendamento e Gestão.
        </p>
      </aside>

      {/* Right form container */}
      <main className="flex flex-col items-center justify-center bg-[#F5F7FA] px-4 py-10 sm:px-6 lg:col-span-7">
        <div className="mb-8 lg:hidden">
          <Link href="/">
            <AgendaiLogo size="lg" />
          </Link>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

