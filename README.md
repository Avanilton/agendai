# Agendai — Plataforma SaaS de Agendamento e Gestão

Plataforma SaaS multi-tenant completa desenvolvida com **Next.js 16 (App Router)**, **React 19**, **TypeScript (strict)**, **Tailwind CSS v4**, **Drizzle ORM**, **Neon PostgreSQL (48 tabelas)** e **Better Auth**.

## Todas as 12 Fases Implementadas

1. **Fundação**: Auth self-hosted LGPD, Multi-Tenant, RBAC granular (27 permissões / 8 perfis), Auditoria sanitizada, Landing Page, Planos dinâmicos, Legal, Onboarding e PWA.
2. **Cadastros**: `/app/empresa`, `/app/clientes`, `/app/profissionais` (com limite do plano), `/app/servicos`, `/app/produtos` e `/app/fornecedores`.
3. **Agenda**: `/app/agenda` (Dia, Semana, Mês, Lista, múltiplos serviços, status, conflitos, encaixe RBAC) e `/app/agenda/disponibilidade`.
4. **Agendamento Online**: página pública `/agendar/[slug]` + APIs `/api/public/booking/[slug]/*` com cálculo real de disponibilidade.
5. **Comunicação**: `/app/comunicacao` (WhatsApp `wa.me`, templates, e-mails com histórico) e `/app/comunicacao/aniversariantes`.
6. **Financeiro**: `/app/financeiro` (Contas a pagar/receber, transferências, parcelamento sem perda de centavos, baixas parciais, contas/caixa, categorias e centros de custo).
7. **Vendas e Estoque**: `/app/vendas` e `/app/estoque` (baixa/entrada automática no estoque com `inventory_movements` rastreáveis e lançamento financeiro).
8. **Equipe e Comissões**: `/app/equipe` (comissões percentuais/fixas com pagamento integrado ao Financeiro, horas/extras/faltas/folgas e metas mensais).
9. **Pacotes e Orçamentos**: `/app/pacotes-orcamentos` (controle de sessões/validade/alertas, orçamentos com WhatsApp e conversão em venda).
10. **Fichas e Anamnese (Dados Sensíveis LGPD)**: `/app/fichas` (modelos personalizáveis, acesso estrito por `medical_records:read/write`, auditoria sem conteúdo clínico).
11. **Relatórios, Precificação e Exportação**: `/app/relatorios`, `/app/precificacao`, `/api/reports/export` (CSV UTF-8 anti-injection) e importação CSV com pré-visualização.
12. **Integrações e Admin Global SaaS**: `/app/integracoes` (Pix Copia e Cola padrão BACEN CRC16 + preparação fiscal NFS-e), `/api/webhooks/pix` e `/admin` (painel global exclusivo para Platform Admins).

## Como Executar Localmente

```bash
npm install
# Configure .env.local com DATABASE_URL (Neon) e BETTER_AUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

## Qualidade, Testes e Build

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Backups e Continuidade (Neon PostgreSQL)

- Utilize **Point-in-Time Recovery (PITR)** e branches do Neon para ambientes separados (`development`, `staging`, `production`).
- Execute testes periódicos de restauração via branch de homologação no Neon (`neon branches create`) antes de migrations destrutivas.
- Todas as exclusões operacionais críticas utilizam soft delete (`deleted_at`) + trilha de auditoria (`audit_logs`).
