export interface PlanCatalogItem {
  slug: "individual" | "equipe" | "profissional" | "negocio";
  name: string;
  description: string;
  priceCents: number;
  referencePriceCents: number;
  maxProfessionals: number;
  storageLimitMb: number;
  isPopular: boolean;
  badgeText: string | null;
  sortOrder: number;
  paymentUrl: string;
  features: string[];
  limits: {
    unlimitedRecords: boolean;
    smsPackageIncluded: boolean;
    whatsappLinks: boolean;
    onlineBooking: boolean;
    dataExport: boolean;
  };
}

const COMMON_FEATURES = [
  "Agenda completa e agendamento online",
  "Cadastro ilimitado de clientes e serviços",
  "Mensagens e lembretes pelo WhatsApp",
  "Financeiro, vendas, compras e estoque",
  "Relatórios gerenciais e exportação de dados",
  "Controle de profissionais e permissões",
  "Pacote de SMS gratuito (conforme política)",
];

export const DEFAULT_PLANS_CATALOG: PlanCatalogItem[] = [
  {
    slug: "individual",
    name: "Individual",
    description: "Ideal para profissionais autônomos que buscam organização total.",
    priceCents: 4990,
    referencePriceCents: 6990,
    maxProfessionals: 1,
    storageLimitMb: 1024,
    isPopular: false,
    badgeText: null,
    sortOrder: 1,
    paymentUrl: "https://mpago.la/1zvaM8q",
    features: ["1 profissional", "1 GB de armazenamento", ...COMMON_FEATURES],
    limits: {
      unlimitedRecords: true,
      smsPackageIncluded: true,
      whatsappLinks: true,
      onlineBooking: true,
      dataExport: true,
    },
  },
  {
    slug: "equipe",
    name: "Equipe",
    description: "Perfeito para pequenos estúdios, salões e consultórios em crescimento.",
    priceCents: 8990,
    referencePriceCents: 11990,
    maxProfessionals: 3,
    storageLimitMb: 2048,
    isPopular: false,
    badgeText: null,
    sortOrder: 2,
    paymentUrl: "https://mpago.la/32KEmsu",
    features: [
      "Até 3 profissionais",
      "2 GB de armazenamento",
      "Recursos completos de gestão de equipe",
      ...COMMON_FEATURES,
    ],
    limits: {
      unlimitedRecords: true,
      smsPackageIncluded: true,
      whatsappLinks: true,
      onlineBooking: true,
      dataExport: true,
    },
  },
  {
    slug: "profissional",
    name: "Profissional",
    description: "A escolha equilibrada para clínicas e estabelecimentos consolidados.",
    priceCents: 11990,
    referencePriceCents: 12990,
    maxProfessionals: 5,
    storageLimitMb: 3072,
    isPopular: true,
    badgeText: "MAIS ESCOLHIDO",
    sortOrder: 3,
    paymentUrl: "https://mpago.la/1iMhWR8",
    features: [
      "Até 5 profissionais",
      "3 GB de armazenamento",
      "Gestão avançada de equipe e comissões",
      ...COMMON_FEATURES,
    ],
    limits: {
      unlimitedRecords: true,
      smsPackageIncluded: true,
      whatsappLinks: true,
      onlineBooking: true,
      dataExport: true,
    },
  },
  {
    slug: "negocio",
    name: "Negócio",
    description: "Escala máxima para clínicas multiprofissionais e redes de atendimento.",
    priceCents: 14990,
    referencePriceCents: 16990,
    maxProfessionals: 10,
    storageLimitMb: 5120,
    isPopular: false,
    badgeText: null,
    sortOrder: 4,
    paymentUrl: "https://mpago.la/2NpZaKg",
    features: [
      "Até 10 profissionais",
      "5 GB de armazenamento",
      "Perfis de permissão personalizados",
      ...COMMON_FEATURES,
    ],
    limits: {
      unlimitedRecords: true,
      smsPackageIncluded: true,
      whatsappLinks: true,
      onlineBooking: true,
      dataExport: true,
    },
  },
];

