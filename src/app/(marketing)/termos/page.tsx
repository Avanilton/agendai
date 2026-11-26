import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-[#142B4F]">Termos de Uso</h1>
      <p className="mt-2 text-sm text-[#64748B]">Versão 1.0.0 — Agendai SaaS</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#142B4F]">1. Objeto</h2>
          <p>
            O Agendai é uma plataforma voltada à gestão de agendamentos,
            clientes, equipe, finanças e rotinas operacionais para empresas e
            profissionais prestadores de serviços.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#142B4F]">
            2. Conta, Segurança e Responsabilidades
          </h2>
          <p>
            Cada organização é responsável pelas credenciais de acesso de seus
            usuários, pela correta atribuição de perfis de permissão e pela
            veracidade dos dados inseridos na plataforma.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#142B4F]">
            3. Propriedade dos Dados e Exportação
          </h2>
          <p>
            Todos os dados inseridos pela empresa contratante pertencem
            exclusivamente a ela, podendo ser exportados nos formatos suportados
            ou removidos conforme a legislação vigente.
          </p>
        </section>
      </div>
    </article>
  );
}

