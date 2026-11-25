import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-[#142B4F]">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-[#64748B]">Versão 1.0.0 — Agendai SaaS</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#142B4F]">
            1. Minimização e Finalidade
          </h2>
          <p>
            Coletamos apenas os dados estritamente necessários para operação da
            plataforma, autenticação segura, registro de auditoria e prestação
            dos serviços contratados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#142B4F]">
            2. Isolamento Multi-Tenant e Dados Sensíveis
          </h2>
          <p>
            Os dados de cada organização são isolados logicamente no banco de
            dados com validação server-side obrigatória. Dados sensíveis de
            saúde e anamnese possuem controle de permissão específico e nunca
            são gravados em logs de aplicação.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#142B4F]">
            3. Direitos do Titular
          </h2>
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção,
            exportação ou exclusão/anonimização de dados conforme a Lei Geral de
            Proteção de Dados (Lei nº 13.709/2018).
          </p>
        </section>
      </div>
    </article>
  );
}

