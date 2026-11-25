export const HOME_ROUTE_OPTIONS = [
  {
    value: "/app",
    label: "Painel Inicial (Dashboard)",
    description: "Visão geral dos módulos e resumo da organização",
  },
  {
    value: "/app/agenda",
    label: "Agenda",
    description: "Abrir direto na grade de agendamentos do dia ou semana",
  },
  {
    value: "/app/clientes",
    label: "Clientes",
    description: "Abrir direto na lista de clientes cadastrados",
  },
  {
    value: "/app/financeiro",
    label: "Financeiro",
    description: "Abrir direto no fluxo de caixa e contas a pagar/receber",
  },
  {
    value: "/app/vendas",
    label: "Vendas",
    description: "Abrir direto na tela de vendas de produtos e serviços",
  },
  {
    value: "/app/comunicacao",
    label: "Comunicação",
    description: "Abrir direto nos lembretes e mensagens WhatsApp",
  },
  {
    value: "/app/relatorios",
    label: "Relatórios",
    description: "Abrir direto nos indicadores gerenciais",
  },
] as const;

export type AllowedHomeRoute = (typeof HOME_ROUTE_OPTIONS)[number]["value"];

export const ALLOWED_HOME_ROUTES: readonly string[] = HOME_ROUTE_OPTIONS.map(
  (o) => o.value
);

export const PRESET_AVATARS = [
  {
    id: "preset:blue",
    label: "Azul Agendai",
    bgClass: "bg-gradient-to-br from-[#2563EB] to-[#142B4F] text-white",
    emoji: null,
  },
  {
    id: "preset:orange",
    label: "Laranja Energia",
    bgClass: "bg-gradient-to-br from-[#FF914D] to-[#EA580C] text-white",
    emoji: null,
  },
  {
    id: "preset:emerald",
    label: "Verde Esmeralda",
    bgClass: "bg-gradient-to-br from-emerald-500 to-teal-700 text-white",
    emoji: null,
  },
  {
    id: "preset:violet",
    label: "Roxo Moderno",
    bgClass: "bg-gradient-to-br from-violet-500 to-indigo-700 text-white",
    emoji: null,
  },
  {
    id: "preset:rose",
    label: "Rosa Studio",
    bgClass: "bg-gradient-to-br from-rose-500 to-pink-700 text-white",
    emoji: null,
  },
  {
    id: "preset:amber",
    label: "Dourado Premium",
    bgClass: "bg-gradient-to-br from-amber-400 to-orange-600 text-white",
    emoji: null,
  },
  {
    id: "preset:slate",
    label: "Grafite Executivo",
    bgClass: "bg-gradient-to-br from-slate-600 to-slate-900 text-white",
    emoji: null,
  },
  {
    id: "preset:sky",
    label: "Céu Claro",
    bgClass: "bg-gradient-to-br from-sky-400 to-blue-600 text-white",
    emoji: null,
  },
] as const;

