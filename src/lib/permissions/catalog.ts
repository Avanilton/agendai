export interface PermissionDefinition {
  code: string;
  module: string;
  description: string;
  isSensitive: boolean;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { code: "dashboard:read", module: "dashboard", description: "Visualizar dashboard principal", isSensitive: false },
  { code: "appointments:read", module: "agenda", description: "Visualizar agendamentos", isSensitive: false },
  { code: "appointments:write", module: "agenda", description: "Criar, editar e reagendar agendamentos", isSensitive: false },
  { code: "appointments:delete", module: "agenda", description: "Cancelar e excluir agendamentos", isSensitive: false },
  { code: "appointments:overbook", module: "agenda", description: "Permitir encaixe em horários já ocupados", isSensitive: false },
  { code: "clients:read", module: "clients", description: "Visualizar cadastro de clientes", isSensitive: false },
  { code: "clients:write", module: "clients", description: "Criar e editar clientes", isSensitive: false },
  { code: "clients:delete", module: "clients", description: "Excluir ou anonimizar clientes", isSensitive: true },
  { code: "clients:export", module: "clients", description: "Exportar base de clientes", isSensitive: true },
  { code: "medical_records:read", module: "health", description: "Visualizar fichas médicas e anamnese (dados sensíveis)", isSensitive: true },
  { code: "medical_records:write", module: "health", description: "Criar e atualizar fichas médicas e anamnese", isSensitive: true },
  { code: "financial:read", module: "financial", description: "Visualizar receitas, despesas e fluxo de caixa", isSensitive: true },
  { code: "financial:write", module: "financial", description: "Lançar e editar movimentações financeiras", isSensitive: true },
  { code: "financial:export", module: "financial", description: "Exportar relatórios financeiros", isSensitive: true },
  { code: "inventory:read", module: "inventory", description: "Visualizar produtos, estoque e fornecedores", isSensitive: false },
  { code: "inventory:write", module: "inventory", description: "Gerenciar produtos, fornecedores e movimentar estoque", isSensitive: false },
  { code: "services:read", module: "services", description: "Visualizar catálogo de serviços", isSensitive: false },
  { code: "services:write", module: "services", description: "Criar, editar e desativar serviços", isSensitive: false },
  { code: "communications:read", module: "communications", description: "Visualizar lembretes, aniversariantes e histórico de mensagens", isSensitive: false },
  { code: "communications:manage", module: "communications", description: "Gerenciar templates e enviar mensagens por WhatsApp e e-mail", isSensitive: false },
  { code: "team:read", module: "team", description: "Visualizar profissionais e funcionários", isSensitive: false },
  { code: "team:manage", module: "team", description: "Gerenciar equipe, comissões e permissões", isSensitive: true },
  { code: "reports:read", module: "reports", description: "Visualizar relatórios gerenciais", isSensitive: false },
  { code: "reports:export", module: "reports", description: "Exportar relatórios em CSV/XLSX/PDF", isSensitive: true },
  { code: "settings:read", module: "settings", description: "Visualizar configurações da empresa", isSensitive: false },
  { code: "settings:manage", module: "settings", description: "Alterar configurações da empresa e assinatura", isSensitive: true },
  { code: "audit:read", module: "security", description: "Visualizar logs de auditoria da organização", isSensitive: true },
];

export type PermissionCode = (typeof PERMISSION_CATALOG)[number]["code"];

export interface RoleTemplate {
  slug: string;
  name: string;
  description: string;
  permissions: PermissionCode[];
}

const ALL_PERMISSIONS = PERMISSION_CATALOG.map((p) => p.code);

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    slug: "owner",
    name: "Proprietário",
    description: "Acesso completo à empresa, assinatura, segurança e todos os módulos.",
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: "admin",
    name: "Administrador",
    description: "Gestão operacional, equipe, financeiro e configurações da empresa.",
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: "manager",
    name: "Gerente",
    description: "Supervisão de agenda, equipe, estoque e relatórios operacionais.",
    permissions: [
      "dashboard:read",
      "appointments:read",
      "appointments:write",
      "appointments:delete",
      "appointments:overbook",
      "clients:read",
      "clients:write",
      "financial:read",
      "inventory:read",
      "inventory:write",
      "services:read",
      "services:write",
      "communications:read",
      "communications:manage",
      "team:read",
      "reports:read",
      "settings:read",
    ],
  },
  {
    slug: "receptionist",
    name: "Recepcionista",
    description: "Atendimento de balcão, agenda e cadastro básico de clientes (sem acesso a dados médicos).",
    permissions: [
      "dashboard:read",
      "appointments:read",
      "appointments:write",
      "clients:read",
      "clients:write",
      "services:read",
      "communications:read",
      "communications:manage",
    ],
  },
  {
    slug: "professional",
    name: "Profissional",
    description: "Gestão da própria agenda, atendimentos e fichas clínicas autorizadas.",
    permissions: [
      "dashboard:read",
      "appointments:read",
      "appointments:write",
      "clients:read",
      "services:read",
      "medical_records:read",
      "medical_records:write",
    ],
  },
  {
    slug: "financial",
    name: "Financeiro",
    description: "Controle financeiro, fluxo de caixa e relatórios contábeis.",
    permissions: [
      "dashboard:read",
      "financial:read",
      "financial:write",
      "financial:export",
      "reports:read",
      "reports:export",
    ],
  },
  {
    slug: "inventory",
    name: "Estoquista",
    description: "Gestão de produtos, entradas, saídas e inventário.",
    permissions: ["dashboard:read", "inventory:read", "inventory:write"],
  },
  {
    slug: "assistant",
    name: "Assistente",
    description: "Apoio operacional com visualização básica de agenda e clientes.",
    permissions: ["dashboard:read", "appointments:read", "clients:read"],
  },
];

