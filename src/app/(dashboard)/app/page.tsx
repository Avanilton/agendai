import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  FileHeart,
  Layers,
  Lock,
  MessageCircle,
  Package,
  Percent,
  QrCode,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { requireTenantContext } from "@/lib/tenant/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const QUICK_MODULES = [
  {
    title: "Agenda",
    desc: "Dia, semana, mês, lista, múltiplos serviços e bloqueios.",
    href: "/app/agenda",
    icon: Calendar,
    permission: "appointments:read",
  },
  {
    title: "Comunicação",
    desc: "Lembretes WhatsApp (wa.me), templates, e-mails e aniversariantes.",
    href: "/app/comunicacao",
    icon: MessageCircle,
    permission: "communications:read",
  },
  {
    title: "Financeiro",
    desc: "Fluxo de caixa, contas a pagar/receber, parcelamentos e contas.",
    href: "/app/financeiro",
    icon: Wallet,
    permission: "financial:read",
  },
  {
    title: "Vendas",
    desc: "Vendas integradas de produtos e serviços com baixa automática.",
    href: "/app/vendas",
    icon: ShoppingBag,
    permission: "financial:read",
  },
  {
    title: "Estoque e Compras",
    desc: "Movimentações rastreáveis, alertas de mínimo e compras.",
    href: "/app/estoque",
    icon: ArrowDownUp,
    permission: "inventory:read",
  },
  {
    title: "Equipe e Comissões",
    desc: "Comissões, pagamentos no financeiro, horas, faltas e metas.",
    href: "/app/equipe",
    icon: Percent,
    permission: "team:read",
  },
  {
    title: "Pacotes e Orçamentos",
    desc: "Saldo de sessões, alertas de validade e conversão em venda.",
    href: "/app/pacotes-orcamentos",
    icon: Layers,
    permission: "clients:read",
  },
  {
    title: "Fichas e Anamnese",
    desc: "Fichas personalizáveis com proteção LGPD e auditoria de acesso.",
    href: "/app/fichas",
    icon: FileHeart,
    permission: "medical_records:read",
  },
  {
    title: "Relatórios e Exportação",
    desc: "Indicadores gerenciais, exportação CSV/PDF e importação.",
    href: "/app/relatorios",
    icon: BarChart3,
    permission: "reports:read",
  },
  {
    title: "Criador de Preços",
    desc: "Calculadora de custos, margem líquida e simulador de cenários.",
    href: "/app/precificacao",
    icon: Calculator,
    permission: "reports:read",
  },
  {
    title: "Integrações (Pix e NFS-e)",
    desc: "Pix Copia e Cola padrão BACEN e preparação fiscal NFS-e.",
    href: "/app/integracoes",
    icon: QrCode,
    permission: "financial:read",
  },
  {
    title: "Clientes",
    desc: "Cadastro completo, busca, aniversariantes e LGPD.",
    href: "/app/clientes",
    icon: Users,
    permission: "clients:read",
  },
  {
    title: "Profissionais",
    desc: "Equipe, especialidades, comissões e limite do plano.",
    href: "/app/profissionais",
    icon: Briefcase,
    permission: "team:read",
  },
  {
    title: "Serviços",
    desc: "Preços, duração, intervalo e profissionais habilitados.",
    href: "/app/servicos",
    icon: Scissors,
    permission: "services:read",
  },
  {
    title: "Produtos",
    desc: "Custo, margem automática e alertas de estoque mínimo.",
    href: "/app/produtos",
    icon: Package,
    permission: "inventory:read",
  },
  {
    title: "Fornecedores",
    desc: "Fornecedores de produtos, materiais e insumos.",
    href: "/app/fornecedores",
    icon: Truck,
    permission: "inventory:read",
  },
  {
    title: "Empresa",
    desc: "Dados cadastrais, endereço público e assinatura.",
    href: "/app/empresa",
    icon: Building2,
    permission: "settings:read",
  },
];

export default async function DashboardHomePage() {
  const ctx = await requireTenantContext();
  const visibleModules = QUICK_MODULES.filter((m) =>
    ctx.permissions.has(m.permission)
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Badge variant="orange">Agendai SaaS — 12 Fases Ativas</Badge>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#142B4F] sm:text-3xl">
            Bem-vindo, {ctx.userName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Ambiente multi-tenant da empresa{" "}
            <strong className="text-[#142B4F]">{ctx.organizationName}</strong>.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/app/seguranca">
            <ShieldCheck className="h-4 w-4" />
            Segurança e sessões
          </Link>
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Organização Ativa</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-[#2563EB]" />
              {ctx.organizationName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">
              Fuso horário: <strong className="text-[#142B4F]">{ctx.organizationTimezone}</strong>
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Status:{" "}
              <span className="font-semibold capitalize text-emerald-700">
                {ctx.organizationStatus}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Perfil e Permissões (RBAC)</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-[#FF914D]" />
              {ctx.roleName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">
              <strong className="text-[#142B4F]">{ctx.permissions.size}</strong>{" "}
              permissões granulares ativas validadas no backend.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Isolamento e LGPD</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Protegido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#64748B]">
              Contexto multi-tenant validado server-side e trilha de auditoria ativa.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access to Active Cadastros */}
      <div>
        <h2 className="mb-3 text-base font-bold text-[#142B4F]">
          Módulos de Cadastros Disponíveis
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href} className="group">
                <Card className="h-full transition-all group-hover:border-[#2563EB]/50 group-hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-[#2563EB]" />
                    </div>
                    <CardTitle className="mt-3 text-base">{mod.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-[#64748B]">
                      {mod.desc}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
