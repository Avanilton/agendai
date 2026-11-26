"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Check,
  CheckCircle2,
  Download,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  QrCode,
  Shield,
  SlidersHorizontal,
  Sun,
  Upload,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import {
  updateUserPreferencesAction,
  updateUserProfileAction,
} from "@/modules/settings/actions";
import {
  HOME_ROUTE_OPTIONS,
  PRESET_AVATARS,
} from "@/modules/settings/constants";
import { UserAvatar } from "@/components/settings/user-avatar";
import {
  IntegrationsHub,
} from "@/components/integrations/integrations-hub";
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
import { cn } from "@/lib/utils";
import type { getIntegrationsWorkspaceData } from "@/modules/integrations/service";

type IntegrationsData = Awaited<ReturnType<typeof getIntegrationsWorkspaceData>>;

type SettingsTab =
  | "perfil"
  | "preferencias"
  | "senha"
  | "integracoes"
  | "exportacao"
  | "seguranca";

interface GeneralSettingsProps {
  user: {
    name: string;
    email: string;
    image: string | null;
    theme: "light" | "dark";
    defaultHomeRoute: string;
    roleName: string;
    organizationName: string;
  };
  integrations: {
    enabled: boolean;
    data: IntegrationsData | null;
    clients: { id: string; name: string }[];
    canWriteFinancial: boolean;
    canManageSettings: boolean;
  };
  exportPermissions: {
    canReadClients: boolean;
    canReadFinancial: boolean;
    canReadAppointments: boolean;
  };
}

export function GeneralSettings({
  user,
  integrations,
  exportPermissions,
}: GeneralSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab") as SettingsTab | null;

  const canExportAny =
    exportPermissions.canReadClients ||
    exportPermissions.canReadFinancial ||
    exportPermissions.canReadAppointments;

  const validTabs: SettingsTab[] = [
    "perfil",
    "preferencias",
    "senha",
    ...(integrations.enabled ? (["integracoes"] as const) : []),
    ...(canExportAny ? (["exportacao"] as const) : []),
    "seguranca",
  ];

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    initialTabParam && validTabs.includes(initialTabParam)
      ? initialTabParam
      : "perfil"
  );

  // Profile & Avatar state
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<string>(user.image || "preset:blue");
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences state
  const [theme, setTheme] = useState<"light" | "dark">(user.theme);
  const [defaultHomeRoute, setDefaultHomeRoute] = useState(
    user.defaultHomeRoute || "/app"
  );
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [revokeOthersOnPasswordChange, setRevokeOthersOnPasswordChange] =
    useState(true);
  const [savingPassword, setSavingPassword] = useState(false);

  // Security sessions state
  const [revokingSessions, setRevokingSessions] = useState(false);

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }

  function applyThemeImmediately(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    try {
      localStorage.setItem("agendai-theme", nextTheme);
    } catch {
      // ignore storage errors
    }
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido (PNG, JPG ou WebP).");
      return;
    }
    if (file.size > 180 * 1024) {
      toast.error("A imagem deve ter no máximo 180 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const res = await updateUserProfileAction({
      name,
      image: avatar,
    });
    setSavingProfile(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success("Perfil e avatar atualizados!");
    router.refresh();
  }

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrefs(true);
    const res = await updateUserPreferencesAction({
      theme,
      defaultHomeRoute,
    });
    setSavingPrefs(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    applyThemeImmediately(theme);
    toast.success("Preferências salvas com sucesso!");
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    setSavingPassword(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeOthersOnPasswordChange,
      });

      if (result.error) {
        toast.error(
          result.error.message ||
            "Não foi possível alterar a senha. Verifique sua senha atual."
        );
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Senha alterada com sucesso!");
    } catch {
      toast.error("Erro ao alterar a senha. Tente novamente.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleRevokeOtherSessions() {
    setRevokingSessions(true);
    try {
      const result = await authClient.revokeOtherSessions();
      if (result.error) {
        toast.error(result.error.message || "Erro ao encerrar outras sessões.");
      } else {
        toast.success("Todas as outras sessões foram encerradas.");
      }
    } catch {
      toast.error("Não foi possível encerrar as sessões.");
    } finally {
      setRevokingSessions(false);
    }
  }

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "perfil", label: "Perfil e Avatar", icon: User },
    { id: "preferencias", label: "Preferências", icon: SlidersHorizontal },
    { id: "senha", label: "Alterar Senha", icon: KeyRound },
    ...(integrations.enabled
      ? [{ id: "integracoes" as const, label: "Integrações (Pix/NFS-e)", icon: QrCode }]
      : []),
    ...(canExportAny
      ? [{ id: "exportacao" as const, label: "Exportar Dados (CSV)", icon: Download }]
      : []),
    { id: "seguranca", label: "Segurança e Sessões", icon: Shield },
  ];

  function triggerExportAll() {
    const types: string[] = [];
    if (exportPermissions.canReadClients) types.push("clients");
    if (exportPermissions.canReadFinancial) types.push("financial");
    if (exportPermissions.canReadAppointments) types.push("open_appointments");

    types.forEach((t, idx) => {
      window.setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/api/export?type=${t}`;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, idx * 450);
    });
    toast.success("Download dos arquivos CSV iniciado!");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Configurações Gerais
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Personalize seu perfil, avatar, tema, tela inicial, senha, integrações e segurança da conta.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer sm:text-sm",
                active
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#64748B] hover:bg-slate-100 hover:text-[#142B4F]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: PERFIL E AVATAR */}
      {activeTab === "perfil" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#2563EB]" />
              Perfil e Avatar
            </CardTitle>
            <CardDescription>
              Atualize seu nome de exibição e escolha o avatar mostrado no menu e cabeçalho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-[#F5F7FA] p-4 sm:flex-row sm:items-center">
                <UserAvatar name={name || user.name} image={avatar} size="lg" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-[#142B4F]">
                    {name || user.name}
                  </p>
                  <p className="text-xs text-[#64748B]">{user.email}</p>
                  <Badge variant="default">{user.roleName}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Nome completo</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">E-mail da conta</Label>
                  <Input id="profile-email" value={user.email} disabled />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Escolha seu Avatar</Label>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                  {PRESET_AVATARS.map((preset) => {
                    const selected = avatar === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatar(preset.id)}
                        title={preset.label}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all cursor-pointer",
                          selected
                            ? "border-[#2563EB] bg-[#EAF2FF]/60 ring-2 ring-[#2563EB]/30"
                            : "border-slate-200 hover:border-[#2563EB]/50"
                        )}
                      >
                        <UserAvatar
                          name={name || user.name}
                          image={preset.id}
                          size="md"
                        />
                        {selected && (
                          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#142B4F] hover:border-[#2563EB]">
                    <Upload className="h-3.5 w-3.5 text-[#2563EB]" />
                    Enviar foto (até 180 KB)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                  {avatar && !avatar.startsWith("preset:") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatar("preset:blue")}
                    >
                      Usar iniciais padrão
                    </Button>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={savingProfile}>
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingProfile ? "Salvando..." : "Salvar perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB: PREFERÊNCIAS (TEMA + TELA INICIAL) */}
      {activeTab === "preferencias" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-[#2563EB]" />
              Aparência e Tela Inicial
            </CardTitle>
            <CardDescription>
              Escolha entre tema claro ou escuro e defina qual página abre automaticamente ao entrar no Agendai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePreferences} className="space-y-6">
              {/* Theme selector */}
              <div className="space-y-3">
                <Label>Tema da interface</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => applyThemeImmediately("light")}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer",
                      theme === "light"
                        ? "border-[#2563EB] bg-[#EAF2FF]/60 ring-2 ring-[#2563EB]/25"
                        : "border-slate-200 hover:border-[#2563EB]/50"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <Sun className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#142B4F]">
                        Tema Claro
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Fundo luminoso com alto contraste diurno
                      </p>
                    </div>
                    {theme === "light" && (
                      <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => applyThemeImmediately("dark")}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer",
                      theme === "dark"
                        ? "border-[#2563EB] bg-[#EAF2FF]/60 ring-2 ring-[#2563EB]/25"
                        : "border-slate-200 hover:border-[#2563EB]/50"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sky-300">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#142B4F]">
                        Tema Escuro
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Conforto visual para ambientes com pouca luz
                      </p>
                    </div>
                    {theme === "dark" && (
                      <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Default Home Screen selector */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Home className="h-4 w-4 text-[#2563EB]" />
                  Tela inicial ao abrir o sistema
                </Label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {HOME_ROUTE_OPTIONS.map((opt) => {
                    const selected = defaultHomeRoute === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDefaultHomeRoute(opt.value)}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                          selected
                            ? "border-[#2563EB] bg-[#EAF2FF]/60 ring-1 ring-[#2563EB]/30"
                            : "border-slate-200 hover:border-[#2563EB]/50"
                        )}
                      >
                        <div>
                          <p className="text-sm font-bold text-[#142B4F]">
                            {opt.label}
                          </p>
                          <p className="mt-0.5 text-xs text-[#64748B]">
                            {opt.description}
                          </p>
                        </div>
                        {selected && (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" disabled={savingPrefs}>
                {savingPrefs && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingPrefs ? "Salvando..." : "Salvar preferências"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB: ALTERAR SENHA */}
      {activeTab === "senha" && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#2563EB]" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Escolha uma senha forte com no mínimo 8 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha atual</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                <PasswordInput
                  id="confirm-new-password"
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[#64748B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={revokeOthersOnPasswordChange}
                  onChange={(e) =>
                    setRevokeOthersOnPasswordChange(e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                />
                Encerrar sessões em outros dispositivos após trocar a senha
              </label>

              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingPassword ? "Alterando..." : "Atualizar senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB: INTEGRAÇÕES (PIX / NFS-E) */}
      {activeTab === "integracoes" && integrations.enabled && integrations.data && (
        <IntegrationsHub
          organizationName={user.organizationName}
          pixCharges={integrations.data.pixCharges}
          fiscalProfile={integrations.data.fiscalProfile}
          invoices={integrations.data.invoices}
          clients={integrations.clients}
          canWriteFinancial={integrations.canWriteFinancial}
          canManageSettings={integrations.canManageSettings}
        />
      )}

      {/* TAB: EXPORTAR DADOS (CSV) */}
      {activeTab === "exportacao" && canExportAny && (
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-[#2563EB]" />
              Exportar Dados da Empresa (CSV)
            </CardTitle>
            <CardDescription>
              Exporte todas as tabelas completas em formato CSV separado por vírgula (UTF-8, compatível com Excel e Google Sheets).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {exportPermissions.canReadClients && (
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#F5F7FA] p-4 space-y-3">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#2563EB]">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-[#142B4F]">
                      Clientes
                    </h3>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Nome, CPF, telefone, WhatsApp, e-mail, nascimento, tags, origem e observações.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/api/export?type=clients" download>
                      <Download className="h-3.5 w-3.5" />
                      Exportar Clientes (.csv)
                    </a>
                  </Button>
                </div>
              )}

              {exportPermissions.canReadFinancial && (
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#F5F7FA] p-4 space-y-3">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-[#142B4F]">
                      Financeiro
                    </h3>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Todos os lançamentos financeiros: receitas, despesas, valores, vencimentos e pagamentos.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/api/export?type=financial" download>
                      <Download className="h-3.5 w-3.5" />
                      Exportar Financeiro (.csv)
                    </a>
                  </Button>
                </div>
              )}

              {exportPermissions.canReadAppointments && (
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#F5F7FA] p-4 space-y-3">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#C2410C]">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-[#142B4F]">
                      Agendamentos em aberto
                    </h3>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Agendamentos aguardando, confirmados ou em atendimento com cliente, profissional e serviços.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/api/export?type=open_appointments" download>
                      <Download className="h-3.5 w-3.5" />
                      Exportar Agendamentos (.csv)
                    </a>
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-sm font-bold text-[#142B4F]">
                  Exportar pacote completo
                </p>
                <p className="text-xs text-[#64748B]">
                  Baixa os arquivos CSV de clientes, financeiro e agendamentos em aberto de uma só vez.
                </p>
              </div>
              <Button type="button" onClick={triggerExportAll}>
                <Download className="h-4 w-4" />
                Exportar tudo (.csv)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: SEGURANÇA E SESSÕES ATIVAS */}
      {activeTab === "seguranca" && (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#2563EB]" />
              Segurança e Sessões Ativas
            </CardTitle>
            <CardDescription>
              Suas sessões são protegidas por cookies HttpOnly e validadas no servidor. Se suspeitar de acesso indevido, encerre os demais dispositivos conectados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-[#EAF2FF]/60 p-4 text-sm text-[#142B4F]">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2563EB]" />
              <span>
                Sessão atual autenticada com proteção contra força bruta, rate limiting e isolamento multi-tenant LGPD.
              </span>
            </div>

            <Button
              variant="destructive"
              onClick={handleRevokeOtherSessions}
              disabled={revokingSessions}
            >
              {revokingSessions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {revokingSessions
                ? "Encerrando sessões..."
                : "Encerrar todas as outras sessões"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

