import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Conformidade LGPD",
};

export default function LgpdPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF2FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
        <ShieldCheck className="h-4 w-4" />
        Lei nº 13.709/2018
      </div>
      <h1 className="mt-4 text-3xl font-extrabold text-[#142B4F]">
        Conformidade com a LGPD
      </h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          O Agendai foi arquitetado desde o início seguindo os princípios de{" "}
          <strong>Privacy by Design</strong> e <strong>Security by Default</strong>:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Registro de consentimentos:</strong> aceites de Termos de
            Uso, Política de Privacidade e tratamento de dados armazenados com
            versão, data/hora UTC e contexto de auditoria.
          </li>
          <li>
            <strong>Segregação de dados sensíveis:</strong> fichas médicas e
            anamneses exigem permissões explícitas (<code>medical_records:read</code>{" "}
            e <code>medical_records:write</code>), impedindo acesso indevido por
            outros perfis da equipe.
          </li>
          <li>
            <strong>Trilha de auditoria sanitizada:</strong> eventos críticos
            são registrados sem expor senhas, tokens ou informações médicas.
          </li>
          <li>
            <strong>Portabilidade e exclusão:</strong> estrutura preparada para
            exportação e anonimização segura quando aplicável.
          </li>
        </ul>
      </div>
    </article>
  );
}

