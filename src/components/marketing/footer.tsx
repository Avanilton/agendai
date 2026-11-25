import Link from "next/link";
import { AgendaiLogo } from "@/components/brand/agendai-logo";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-[#142B4F] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <AgendaiLogo theme="dark" size="md" />
            <p className="text-sm leading-relaxed text-slate-400">
              Plataforma SaaS completa para agendamentos, gestão de clientes,
              equipe e controle financeiro com segurança e conformidade LGPD.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Produto
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/#beneficios" className="hover:text-white transition-colors">
                  Sobre o Agendai
                </Link>
              </li>
              <li>
                <Link href="/#funcionalidades" className="hover:text-white transition-colors">
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link href="/planos" className="hover:text-white transition-colors">
                  Planos e preços
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  Perguntas frequentes
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Legal e Privacidade
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/termos" className="hover:text-white transition-colors">
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="hover:text-white transition-colors">
                  Política de privacidade
                </Link>
              </li>
              <li>
                <Link href="/lgpd" className="hover:text-white transition-colors">
                  Conformidade LGPD
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Acessar conta (Login)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
              Contato e Redes
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:contato@agendai.com.br"
                  className="hover:text-white transition-colors"
                >
                  contato@agendai.com.br
                </a>
              </li>
              <li className="text-slate-400">Atendimento de segunda a sexta</li>
              <li className="flex items-center gap-3 pt-2">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium hover:border-[#FF914D] hover:text-white transition-colors"
                >
                  Instagram
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium hover:border-[#FF914D] hover:text-white transition-colors"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs text-slate-400 sm:flex-row">
          <p>© {year} Agendai. Todos os direitos reservados.</p>
          <p>Infraestrutura em nuvem com isolamento multi-tenant e proteção LGPD.</p>
        </div>
      </div>
    </footer>
  );
}

