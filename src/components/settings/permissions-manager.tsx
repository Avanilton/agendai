"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Lock,
  Plus,
  Save,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PERMISSION_CATALOG } from "@/lib/permissions/catalog";
import type {
  OrganizationMemberRow,
  PermissionsManagementData,
} from "@/modules/permissions/service";
import {
  createOrganizationUserAction,
  updateMemberAccessAction,
  updateRolePermissionsAction,
} from "@/modules/permissions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Painel Inicial",
  agenda: "Agenda e Horários",
  clients: "Clientes",
  services: "Serviços",
  inventory: "Produtos, Estoque e Fornecedores",
  financial: "Financeiro, Vendas e Integrações",
  communications: "Comunicação e Aniversariantes",
  team: "Profissionais, Equipe e Comissões",
  health: "Fichas e Anamnese (LGPD)",
  reports: "Relatórios e Criador de Preços",
  settings: "Empresa e Configurações",
  security: "Auditoria e Segurança",
};

interface PermissionsManagerProps {
  data: PermissionsManagementData;
  currentUserEmail: string;
}

export function PermissionsManager({
  data,
  currentUserEmail,
}: PermissionsManagerProps) {
  const router = useRouter();

  // Default to "employee" (Funcionário) or first role
  const defaultRole =
    data.roles.find((r) => r.slug === "employee") ??
    data.roles.find((r) => r.slug === "admin") ??
    data.roles[0];

  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    defaultRole?.id ?? ""
  );
  const [rolePermsMap, setRolePermsMap] = useState<Record<string, string[]>>(
    () =>
      Object.fromEntries(data.roles.map((r) => [r.id, [...r.permissionCodes]]))
  );
  const [savingRole, setSavingRole] = useState(false);

  // Member edits state
  const [memberEdits, setMemberEdits] = useState<
    Record<
      string,
      { roleId: string; professionalId: string; status: "active" | "suspended" }
    >
  >(() =>
    Object.fromEntries(
      data.members.map((m) => [
        m.membershipId,
        {
          roleId: m.roleId,
          professionalId: m.linkedProfessionalId ?? "",
          status: m.status === "suspended" ? "suspended" : "active",
        },
      ])
    )
  );
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // Create user modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId:
      data.roles.find((r) => r.slug === "employee")?.id ??
      data.roles[0]?.id ??
      "",
    professionalId: "",
  });

  const selectedRole = data.roles.find((r) => r.id === selectedRoleId);
  const selectedCodes = useMemo(
    () => new Set(rolePermsMap[selectedRoleId] ?? []),
    [rolePermsMap, selectedRoleId]
  );

  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, typeof PERMISSION_CATALOG>();
    for (const item of PERMISSION_CATALOG) {
      const list = groups.get(item.module) ?? [];
      list.push(item);
      groups.set(item.module, list);
    }
    return Array.from(groups.entries());
  }, []);

  function togglePermission(code: string) {
    if (!selectedRole || selectedRole.slug === "owner") return;
    setRolePermsMap((prev) => {
      const current = prev[selectedRoleId] ?? [];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      return { ...prev, [selectedRoleId]: next };
    });
  }

  function toggleModuleAll(moduleCodes: string[]) {
    if (!selectedRole || selectedRole.slug === "owner") return;
    setRolePermsMap((prev) => {
      const current = new Set(prev[selectedRoleId] ?? []);
      const allChecked = moduleCodes.every((c) => current.has(c));
      if (allChecked) {
        for (const c of moduleCodes) current.delete(c);
      } else {
        for (const c of moduleCodes) current.add(c);
      }
      return { ...prev, [selectedRoleId]: Array.from(current) };
    });
  }

  async function handleSaveRolePermissions() {
    if (!selectedRole) return;
    setSavingRole(true);
    const res = await updateRolePermissionsAction({
      roleId: selectedRole.id,
      permissionCodes: rolePermsMap[selectedRole.id] ?? [],
    });
    setSavingRole(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success(`Permissões do perfil "${selectedRole.name}" salvas!`);
    router.refresh();
  }

  async function handleSaveMember(member: OrganizationMemberRow) {
    const edit = memberEdits[member.membershipId];
    if (!edit) return;
    setSavingMemberId(member.membershipId);
    const res = await updateMemberAccessAction({
      membershipId: member.membershipId,
      roleId: edit.roleId,
      professionalId: edit.professionalId,
      status: edit.status,
    });
    setSavingMemberId(null);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success(`Acesso de ${member.userName} atualizado!`);
    router.refresh();
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);
    const res = await createOrganizationUserAction(newUserForm);
    setCreatingUser(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success("Usuário criado e vinculado à empresa!");
    setCreateOpen(false);
    setNewUserForm({
      name: "",
      email: "",
      password: "",
      roleId:
        data.roles.find((r) => r.slug === "employee")?.id ??
        data.roles[0]?.id ??
        "",
      professionalId: "",
    });
    router.refresh();
  }

  const isOwnerSelected = selectedRole?.slug === "owner";

  return (
    <div className="space-y-6">
      {/* Plan & Scope Info Banner */}
      <Card className="border-[#2563EB]/25 bg-[#EAF2FF]/40">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Plano: {data.planName}</Badge>
              <Badge variant="outline">
                Limite: até {data.maxProfessionals} profissionais
              </Badge>
            </div>
            <p className="text-xs text-[#142B4F]">
              O perfil <strong>Administrador</strong> acessa tudo o que está liberado no plano da empresa (incluindo a agenda de todos os profissionais). Já o perfil{" "}
              <strong>Funcionário</strong> enxerga apenas as telas marcadas abaixo — e, sem a permissão{" "}
              <em>&quot;Visualizar agenda de todos os profissionais&quot;</em>, vê exclusivamente a própria agenda.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Novo usuário
          </Button>
        </CardContent>
      </Card>

      {/* SECTION 1: ROLES & PERMISSIONS MATRIX */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
            Perfis e Permissões por Tela e Funcionalidade
          </CardTitle>
          <CardDescription>
            Selecione o perfil (ex.: Administrador ou Funcionário) e marque exatamente quais telas e ações ele pode acessar.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Role selector pills */}
          <div className="flex flex-wrap gap-2">
            {data.roles.map((role) => {
              const active = role.id === selectedRoleId;
              const count = (rolePermsMap[role.id] ?? []).length;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer",
                    active
                      ? "border-[#2563EB] bg-[#2563EB] text-white shadow-xs"
                      : "border-slate-200 bg-white text-[#142B4F] hover:border-[#2563EB]/50"
                  )}
                >
                  <span>{role.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-[#64748B]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedRole && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-[#F5F7FA] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#142B4F]">
                    Perfil: {selectedRole.name}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {selectedRole.description}
                  </p>
                </div>

                {isOwnerSelected ? (
                  <Badge variant="orange">
                    <Lock className="h-3 w-3" />
                    Acesso total protegido
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingRole}
                    onClick={handleSaveRolePermissions}
                  >
                    {savingRole ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {savingRole
                      ? "Salvando..."
                      : `Salvar permissões (${selectedCodes.size})`}
                  </Button>
                )}
              </div>

              {/* Grouped Screen Permissions */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {groupedCatalog.map(([modKey, perms]) => {
                  const modCodes = perms.map((p) => p.code);
                  const allChecked = modCodes.every((c) => selectedCodes.has(c));

                  return (
                    <div
                      key={modKey}
                      className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#142B4F]">
                          {MODULE_LABELS[modKey] ?? modKey}
                        </h3>
                        {!isOwnerSelected && (
                          <button
                            type="button"
                            onClick={() => toggleModuleAll(modCodes)}
                            className="text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                          >
                            {allChecked ? "Desmarcar tela" : "Marcar todas"}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {perms.map((perm) => {
                          const checked = selectedCodes.has(perm.code);
                          const isAgendaScope =
                            perm.code === "appointments:read_all";

                          return (
                            <label
                              key={perm.code}
                              className={cn(
                                "flex items-start gap-2.5 rounded-lg p-2 text-xs transition-colors",
                                isOwnerSelected
                                  ? "opacity-75"
                                  : "cursor-pointer hover:bg-[#F5F7FA]",
                                isAgendaScope &&
                                  "border border-[#2563EB]/25 bg-[#EAF2FF]/40"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isOwnerSelected}
                                onChange={() => togglePermission(perm.code)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-[#142B4F]">
                                  {perm.description}
                                </span>
                                {isAgendaScope && (
                                  <p className="mt-0.5 text-[11px] text-[#64748B]">
                                    Desmarcado: o usuário vê apenas a própria agenda (não vê a agenda do administrador nem de outros funcionários).
                                  </p>
                                )}
                                {perm.isSensitive && (
                                  <span className="ml-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                    Sensível
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: TEAM MEMBERS & PROFILE ASSIGNMENT */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#2563EB]" />
                Usuários e Perfis da Empresa ({data.members.length})
              </CardTitle>
              <CardDescription>
                Defina quem é Administrador ou Funcionário e vincule cada funcionário ao seu cadastro de profissional para isolar a agenda individual.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Adicionar usuário
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {data.members.map((member) => {
              const edit = memberEdits[member.membershipId] ?? {
                roleId: member.roleId,
                professionalId: member.linkedProfessionalId ?? "",
                status: member.status === "suspended" ? "suspended" : "active",
              };
              const isSelf = member.userEmail === currentUserEmail;

              return (
                <div
                  key={member.membershipId}
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-[#F5F7FA]/60 p-4 lg:grid-cols-12 lg:items-center"
                >
                  <div className="lg:col-span-4 min-w-0">
                    <p className="truncate text-sm font-bold text-[#142B4F]">
                      {member.userName}{" "}
                      {isSelf && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          Você
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-[#64748B]">
                      {member.userEmail}
                    </p>
                  </div>

                  <div className="lg:col-span-3">
                    <Label className="text-[11px] text-[#64748B]">Perfil</Label>
                    <select
                      value={edit.roleId}
                      disabled={isSelf}
                      onChange={(e) =>
                        setMemberEdits((prev) => ({
                          ...prev,
                          [member.membershipId]: {
                            ...edit,
                            roleId: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-[#142B4F]"
                    >
                      {data.roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-3">
                    <Label className="text-[11px] text-[#64748B]">
                      Profissional vinculado (agenda própria)
                    </Label>
                    <select
                      value={edit.professionalId}
                      onChange={(e) =>
                        setMemberEdits((prev) => ({
                          ...prev,
                          [member.membershipId]: {
                            ...edit,
                            professionalId: e.target.value,
                          },
                        }))
                      }
                      className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-[#142B4F]"
                    >
                      <option value="">Nenhum vínculo</option>
                      {data.professionals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end justify-end gap-2 lg:col-span-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingMemberId === member.membershipId}
                      onClick={() => handleSaveMember(member)}
                    >
                      {savingMemberId === member.membershipId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Create New User (Admin / Funcionário) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo usuário da empresa"
        description="Crie um acesso de Administrador ou Funcionário com login e senha próprios."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nu-name">Nome completo *</Label>
            <Input
              id="nu-name"
              value={newUserForm.name}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, name: e.target.value })
              }
              required
              minLength={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nu-email">E-mail de acesso *</Label>
            <Input
              id="nu-email"
              type="email"
              value={newUserForm.email}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, email: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nu-pass">Senha inicial *</Label>
            <PasswordInput
              id="nu-pass"
              placeholder="Mínimo 8 caracteres"
              value={newUserForm.password}
              onChange={(e) =>
                setNewUserForm({ ...newUserForm, password: e.target.value })
              }
              required
              minLength={8}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nu-role">Perfil de acesso *</Label>
              <select
                id="nu-role"
                value={newUserForm.roleId}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, roleId: e.target.value })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                {data.roles
                  .filter((r) => r.slug !== "owner")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nu-prof">Vincular a profissional (opcional)</Label>
              <select
                id="nu-prof"
                value={newUserForm.professionalId}
                onChange={(e) =>
                  setNewUserForm({
                    ...newUserForm,
                    professionalId: e.target.value,
                  })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="">Sem vínculo</option>
                {data.professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creatingUser}>
              {creatingUser && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar usuário
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

