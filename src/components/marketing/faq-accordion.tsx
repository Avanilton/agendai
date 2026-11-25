"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    q: "Para quais segmentos o Agendai foi desenvolvido?",
    a: "O Agendai é multi-segmento e adaptável: atende clínicas médicas, odontológicas, estética, psicologia, fisioterapia, nutrição, salões de beleza, barbearias, manicures, estúdios de tatuagem, fotografia, personal trainers, pet shops e consultorias.",
  },
  {
    q: "Preciso instalar algum programa no computador ou celular?",
    a: "Não. O Agendai funciona 100% pela internet em computadores (Windows, Mac e Linux), tablets e smartphones Android ou iPhone, com experiência responsiva e suporte a instalação como aplicativo web (PWA).",
  },
  {
    q: "Existe limite de clientes ou agendamentos nos planos?",
    a: "Não limitamos a quantidade de registros operacionais. Os planos variam de acordo com o número de profissionais ativos na equipe e a capacidade de armazenamento de arquivos.",
  },
  {
    q: "Meus dados e os dos meus clientes ficam protegidos pela LGPD?",
    a: "Sim. O Agendai foi projetado desde a fundação com isolamento multi-tenant rigoroso, controle de permissões por perfil, registro de consentimentos, trilha de auditoria e proteção específica para fichas e dados sensíveis.",
  },
  {
    q: "Como funciona o envio de mensagens pelo WhatsApp?",
    a: "Você utiliza modelos personalizáveis de confirmação, lembrete, reagendamento, aniversário e orçamento com abertura direta no WhatsApp, sem automações não oficiais que coloquem seu número em risco.",
  },
  {
    q: "Posso trocar de plano quando minha equipe crescer?",
    a: "Sim. A estrutura de planos é flexível e acompanha o crescimento da sua operação, permitindo evoluir de Individual para Equipe, Profissional ou Negócio sem perder histórico.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={item.q} className="px-6 py-4">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="flex w-full items-center justify-between gap-4 py-1 text-left font-semibold text-[#142B4F] hover:text-[#2563EB] transition-colors cursor-pointer"
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-[#64748B] transition-transform duration-200",
                  isOpen && "rotate-180 text-[#2563EB]"
                )}
              />
            </button>
            {isOpen && (
              <p className="mt-3 pb-1 text-sm leading-relaxed text-[#64748B]">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

