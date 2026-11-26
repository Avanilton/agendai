import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Globe,
  HeartPulse,
  Lock,
  MessageSquare,
  Package,
  Scissors,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import { getActivePlans } from "@/modules/organizations/service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemMockup } from "@/components/marketing/system-mockup";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

const BENEFITS = [
  {
    icon: Calendar,
    title: "Organize seus horários",
    description:
      "Visualize dia, semana, mês ou por profissional com bloqueios, intervalos e zero conflitos.",
  },
  {
    icon: BellRing,
    title: "Reduza faltas",
    description:
      "Envie confirmações e lembretes inteligentes para manter sua agenda cheia e previsível.",
  },
  {
    icon: MessageSquare,
    title: "Automatize mensagens",
    description:
      "Templates prontos para WhatsApp e e-mail em confirmações, reagendamentos e aniversários.",
  },
  {
    icon: Wallet,
    title: "Controle seu financeiro",
    description:
      "Acompanhe receitas, despesas, contas a pagar e receber, fluxo de caixa e lucro real.",
  },
  {
    icon: Users,
    title: "Gerencie sua equipe",
    description:
      "Agenda individual, permissões granulares, metas e cálculo transparente de comissões.",
  },
  {
    icon: BarChart3,
    title: "Acompanhe resultados",
    description:
      "Dashboards gerenciais com ticket médio, taxa de ocupação e serviços mais rentáveis.",
  },
  {
    icon: ClipboardList,
    title: "Tenha seus clientes sempre organizados",
    description:
      "Histórico completo de atendimentos, pacotes, orçamentos e fichas protegidas pela LGPD.",
  },
];

const SEGMENTS = [
  { icon: Building2, name: "Clínicas", desc: "Médicas, odontológicas e multidisciplinares" },
  { icon: Sparkles, name: "Salões", desc: "Cabelo, coloração, escova e estética capilar" },
  { icon: Scissors, name: "Barbearias", desc: "Agenda rápida por barbeiro e combos" },
  { icon: CheckCircle2, name: "Manicures", desc: "Horários encaixados e controle de pacotes" },
  { icon: Stethoscope, name: "Médicos", desc: "Prontuários protegidos e retornos" },
  { icon: HeartPulse, name: "Estética", desc: "Sessões, anamnese e evolução do cliente" },
  { icon: Users, name: "Psicólogos", desc: "Sigilo, recorrência semanal e financeiro" },
  { icon: Camera, name: "Fotógrafos", desc: "Ensaios, orçamentos e entregas organizadas" },
  { icon: Dumbbell, name: "Personal trainers", desc: "Aulas, avaliações e planos mensais" },
  { icon: Globe, name: "Outros profissionais", desc: "Pet shops, consultorias e serviços" },
];

const MODULES = [
  {
    icon: CalendarCheck,
    title: "Agenda Profissional",
    desc: "Múltiplas visualizações, cores por status, horários recorrentes e bloqueios.",
  },
  {
    icon: Globe,
    title: "Agendamento Online",
    desc: "Página exclusiva da sua empresa para o cliente agendar 24h por dia sem fricção.",
  },
  {
    icon: Wallet,
    title: "Financeiro & Comissões",
    desc: "Fluxo de caixa, categorias, parcelamentos, contas bancárias e comissões flexíveis.",
  },
  {
    icon: Package,
    title: "Vendas, Compras e Estoque",
    desc: "Movimentações rastreáveis, estoque mínimo, fornecedores e integração com vendas.",
  },
  {
    icon: ShieldCheck,
    title: "Anamnese e Fichas Seguras",
    desc: "Fichas personalizáveis com acesso restrito, auditoria e conformidade LGPD.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e Precificação",
    desc: "Exportação CSV/XLSX/PDF e calculadora de preços com margem e custos reais.",
  },
];

export default async function LandingPage() {
  const plans = await getActivePlans();

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EAF2FF]/70 via-white to-white pt-14 pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-6">
              <Badge variant="orange" className="px-3.5 py-1.5 text-xs">
                Plataforma de Agendamento e Gestão
              </Badge>

              <h1 className="text-4xl font-extrabold tracking-tight text-[#142B4F] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Seu negócio organizado.{" "}
                <span className="text-[#2563EB]">
                  Seus agendamentos simplificados.
                </span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-[#64748B]">
                Agendamentos, clientes, financeiro e gestão profissional em um
                só lugar. Funciona no computador, tablet ou celular com
                segurança e conformidade LGPD.
              </p>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/cadastro">
                    Começar gratuitamente
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#funcionalidades">Conhecer funcionalidades</Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 text-xs font-medium text-[#64748B]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                  Sem cartão para testar
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-[#2563EB]" />
                  Seguro e dentro da LGPD
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#FF914D]" />
                  100% responsivo (Web & Mobile)
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <SystemMockup />
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section id="beneficios" className="bg-[#F5F7FA] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge>Benefícios</Badge>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#142B4F] sm:text-4xl">
              Tudo o que você precisa para crescer com previsibilidade
            </h2>
            <p className="mt-3 text-[#64748B]">
              Substitua planilhas, papéis e mensagens perdidas por uma operação
              profissional de ponta a ponta.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-slate-200/70">
                  <CardHeader className="pb-3">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#2563EB]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-[#64748B]">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* SEGMENTOS */}
      <section id="segmentos" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="orange">Multi-segmento</Badge>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#142B4F] sm:text-4xl">
              Adaptável ao ritmo do seu segmento
            </h2>
            <p className="mt-3 text-[#64748B]">
              Cada empresa configura serviços, horários, fichas e permissões de
              acordo com sua especialidade.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {SEGMENTS.map((seg) => {
              const Icon = seg.icon;
              return (
                <div
                  key={seg.name}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-[#2563EB]/40 hover:bg-[#EAF2FF]/30 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F7FA] text-[#142B4F] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-bold text-[#142B4F]">{seg.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    {seg.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="bg-[#F5F7FA] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge>Módulos Integrados</Badge>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#142B4F] sm:text-4xl">
              Uma plataforma completa que evolui com sua empresa
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Card key={mod.title}>
                  <CardHeader>
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#142B4F] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle>{mod.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-[#64748B]">
                      {mod.desc}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* DESTAQUES: AGENDAMENTO ONLINE, FINANCEIRO E EQUIPE */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
          {/* Agendamento Online */}
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <Badge variant="orange">Agendamento Online</Badge>
              <h3 className="text-2xl font-extrabold text-[#142B4F] sm:text-3xl">
                Seu cliente agenda sozinho, a qualquer hora do dia
              </h3>
              <p className="text-[#64748B] leading-relaxed">
                Cada empresa recebe seu próprio link exclusivo{" "}
                <code className="rounded bg-[#EAF2FF] px-2 py-0.5 text-xs font-semibold text-[#2563EB]">
                  agendai.site.br/agendar/sua-empresa
                </code>
                . O cliente escolhe o serviço, o profissional, a data e o
                horário disponível com validação real no banco de dados para
                evitar conflitos.
              </p>
              <ul className="space-y-2 text-sm text-[#142B4F]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                  Antecedência mínima e limite de dias futuros configuráveis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                  Agendamento com ou sem preferência de profissional
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                  Confirmação imediata sem depender de atendimento manual
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-6">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
                  Reserva Online • 3 passos
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <span className="text-sm font-semibold text-[#142B4F]">
                      1. Escolha o serviço
                    </span>
                    <Badge>60 min</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <span className="text-sm font-semibold text-[#142B4F]">
                      2. Selecione data e horário livre
                    </span>
                    <Badge variant="orange">14:30</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#2563EB] p-3 text-white">
                    <span className="text-sm font-semibold">
                      3. Confirmação instantânea
                    </span>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financeiro */}
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="order-2 rounded-2xl border border-slate-200 bg-[#142B4F] p-6 text-white lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/10 p-4">
                  <p className="text-xs text-slate-300">Receitas</p>
                  <p className="mt-1 text-2xl font-extrabold">R$ 32.450</p>
                  <p className="mt-1 text-xs text-emerald-300">Pix, Cartão e Dinheiro</p>
                </div>
                <div className="rounded-xl bg-white/10 p-4">
                  <p className="text-xs text-slate-300">Despesas</p>
                  <p className="mt-1 text-2xl font-extrabold">R$ 11.200</p>
                  <p className="mt-1 text-xs text-amber-300">Centros de custo</p>
                </div>
                <div className="rounded-xl bg-[#2563EB] p-4">
                  <p className="text-xs text-blue-100">Lucro líquido</p>
                  <p className="mt-1 text-2xl font-extrabold">R$ 21.250</p>
                </div>
                <div className="rounded-xl bg-[#FF914D] p-4 text-[#142B4F]">
                  <p className="text-xs font-semibold">Comissões</p>
                  <p className="mt-1 text-2xl font-extrabold">R$ 4.860</p>
                </div>
              </div>
            </div>
            <div className="order-1 space-y-4 lg:order-2">
              <Badge>Financeiro Completo</Badge>
              <h3 className="text-2xl font-extrabold text-[#142B4F] sm:text-3xl">
                Clareza total sobre receitas, despesas, lucro e comissões
              </h3>
              <p className="text-[#64748B] leading-relaxed">
                Acompanhe contas a pagar e receber, parcelamentos, formas de
                pagamento (Pix, cartão, dinheiro e transferência) e indicadores
                de ticket médio e margem em tempo real.
              </p>
            </div>
          </div>

          {/* Equipe */}
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <Badge variant="orange">Gestão de Equipe</Badge>
              <h3 className="text-2xl font-extrabold text-[#142B4F] sm:text-3xl">
                Profissionais, agenda individual, permissões e comissões
              </h3>
              <p className="text-[#64748B] leading-relaxed">
                Defina perfis como Proprietário, Administrador, Gerente,
                Recepcionista, Profissional ou Financeiro — com permissões
                ajustáveis individualmente e acesso restrito a dados sensíveis.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-6">
              <div className="space-y-3">
                {[
                  { role: "Proprietário", perms: "Acesso total • Auditoria • Assinatura" },
                  { role: "Recepcionista", perms: "Agenda e Clientes • Sem acesso a fichas médicas" },
                  { role: "Profissional", perms: "Agenda individual • Comissões • Fichas autorizadas" },
                ].map((item) => (
                  <div
                    key={item.role}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#142B4F]">{item.role}</p>
                      <p className="text-xs text-[#64748B]">{item.perms}</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS (ESTRUTURA PREPARADA SEM DADOS FICTÍCIOS) */}
      <section className="bg-[#F5F7FA] py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Badge>Histórias de Clientes</Badge>
          <h2 className="mt-3 text-2xl font-extrabold text-[#142B4F] sm:text-3xl">
            Construído em parceria com profissionais reais
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#64748B]">
            Esta seção receberá exclusivamente depoimentos verificados de
            empresas e profissionais que utilizam o Agendai no dia a dia.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              "Clínicas e consultórios",
              "Salões, barbearias e estética",
              "Profissionais autônomos",
            ].map((slot) => (
              <div
                key={slot}
                className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
                  Case em validação
                </p>
                <p className="mt-2 text-sm font-bold text-[#142B4F]">{slot}</p>
                <p className="mt-2 text-xs text-[#64748B]">
                  Espaço reservado para avaliações reais de clientes após
                  implantação em produção.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS E PREÇOS */}
      <section id="planos" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="orange">Planos e Preços</Badge>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#142B4F] sm:text-4xl">
              Escolha o plano ideal para o tamanho da sua equipe
            </h2>
            <p className="mt-3 text-[#64748B]">
              Todos os planos incluem agenda, clientes, WhatsApp, agendamento
              online, financeiro, vendas, compras, estoque e exportação de dados.
            </p>
          </div>

          <PricingGrid plans={plans} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#F5F7FA] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Badge>Dúvidas Frequentes</Badge>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#142B4F] sm:text-4xl">
              Perguntas frequentes
            </h2>
          </div>

          <FaqAccordion />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[#2563EB] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Pronto para organizar sua agenda e escalar sua gestão?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-100">
            Crie sua conta em menos de 2 minutos e comece com 14 dias de teste
            gratuito.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="accent" asChild>
              <Link href="/cadastro">
                Começar gratuitamente
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/planos">Comparar planos</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

