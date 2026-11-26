"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDownUp,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  FileHeart,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Repeat,
  Scissors,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { AgendaiLogo } from "@/components/brand/agendai-logo";
import { UserAvatar } from "@/components/settings/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppShellUser {
  name: string;
  email: string;
  image?: string | null;
  theme: "light" | "dark";
  roleName: string;
  organizationName: string;
  organizationSlug: string;
  permissions: string[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Painel Inicial",
    href: "/app",
    icon: LayoutDashboard,
    requiredPermission: "dashboard:read",
  },
  {
    label: "Agenda",
    href: "/app/agenda",
    icon: Calendar,
    requiredPermission: "appointments:read",
  },
  {
    label: "Comunicação",
    href: "/app/comunicacao",
    icon: MessageCircle,
    requiredPermission: "communications:read",
  },
  {
    label: "Clientes",
    href: "/app/clientes",
    icon: Users,
    requiredPermission: "clients:read",
  },
  {
    label: "Profissionais",
    href: "/app/profissionais",
    icon: Briefcase,
    requiredPermission: "team:read",
  },
  {
    label: "Equipe e Comissões",
    href: "/app/equipe",
    icon: Percent,
    requiredPermission: "team:read",
  },
  {
    label: "Serviços",
    href: "/app/servicos",
    icon: Scissors,
    requiredPermission: "services:read",
  },
  {
    label: "Produtos",
    href: "/app/produtos",
    icon: Package,
    requiredPermission: "inventory:read",
  },
  {
    label: "Fornecedores",
    href: "/app/fornecedores",
    icon: Truck,
    requiredPermission: "inventory:read",
  },
  {
    label: "Empresa",
    href: "/app/empresa",
    icon: Building2,
    requiredPermission: "settings:read",
  },
  {
    label: "Financeiro",
    href: "/app/financeiro",
    icon: Wallet,
    requiredPermission: "financial:read",
  },
  {
    label: "Vendas",
    href: "/app/vendas",
    icon: ShoppingBag,
    requiredPermission: "financial:read",
  },
  {
    label: "Pacotes e Orçamentos",
    href: "/app/pacotes-orcamentos",
    icon: Layers,
    requiredPermission: "clients:read",
  },
  {
    label: "Planos de Assinatura",
    href: "/app/planos-assinatura",
    icon: Repeat,
    requiredPermission: "services:read",
  },
  {
    label: "Estoque e Compras",
    href: "/app/estoque",
    icon: ArrowDownUp,
    requiredPermission: "inventory:read",
  },
  {
    label: "Fichas e Anamnese",
    href: "/app/fichas",
    icon: FileHeart,
    requiredPermission: "medical_records:read",
  },
  {
    label: "Relatórios",
    href: "/app/relatorios",
    icon: BarChart3,
    requiredPermission: "reports:read",
  },
  {
    label: "Criador de Preços",
    href: "/app/precificacao",
    icon: Calculator,
    requiredPermission: "reports:read",
  },
  {
    label: "Configurações",
    href: "/app/configuracoes",
    icon: Settings,
  },
];

const SIDEBAR_STORAGE_KEY = "agendai-sidebar-hidden";
const SIDEBAR_EVENT = "agendai-sidebar-change";

function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_EVENT, callback);
  };
}

function getSidebarSnapshot(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getSidebarServerSnapshot(): boolean {
  return false;
}

export function AppShell({
  user,
  children,
}: {
  user: AppShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const desktopSidebarHidden = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot
  );
  const [signingOut, setSigningOut] = useState(false);

  // Sync user's DB theme preference to DOM & localStorage
  useEffect(() => {
    document.documentElement.classList.toggle("dark", user.theme === "dark");
    try {
      localStorage.setItem("agendai-theme", user.theme);
    } catch {
      // ignore storage errors
    }
  }, [user.theme]);

  function toggleDesktopSidebar() {
    const next = !desktopSidebarHidden;
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      window.dispatchEvent(new Event(SIDEBAR_EVENT));
    } catch {
      // ignore
    }
  }

  const permissionSet = new Set(user.permissions);
  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      !item.requiredPermission || permissionSet.has(item.requiredPermission)
  );

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success("Sessão encerrada com segurança.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Não foi possível encerrar a sessão.");
      setSigningOut(false);
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#142B4F] text-slate-200">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link href="/app/inicio" onClick={() => setSidebarOpen(false)}>
          <AgendaiLogo theme="dark" size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 lg:hidden"
          aria-label="Fechar menu lateral"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Active organization indicator */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-white">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {user.organizationName}
            </p>
            <p className="truncate text-[11px] text-slate-300">
              {user.roleName}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
        aria-label="Menu do sistema"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Profile link + Logout */}
      <div className="border-t border-white/10 p-4 space-y-2">
        <Link
          href="/app/configuracoes?tab=perfil"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/10"
          title="Editar perfil e configurações"
        >
          <UserAvatar name={user.name} image={user.image} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          </div>
        </Link>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full justify-start text-slate-200 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Saindo..." : "Sair da conta"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      {/* Desktop Sidebar */}
      {!desktopSidebarHidden && (
        <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#142B4F]/60 backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-all duration-200",
          desktopSidebarHidden ? "lg:pl-0" : "lg:pl-64"
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#142B4F] hover:bg-slate-100 lg:hidden cursor-pointer"
              aria-label="Abrir menu lateral"
              title="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop show/hide sidebar button */}
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className="hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#142B4F] hover:bg-slate-100 cursor-pointer"
              aria-label={
                desktopSidebarHidden ? "Mostrar menu lateral" : "Esconder menu lateral"
              }
              title={
                desktopSidebarHidden ? "Mostrar menu" : "Esconder menu"
              }
            >
              {desktopSidebarHidden ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>

            <div>
              <p className="text-sm font-bold text-[#142B4F]">
                {user.organizationName}
              </p>
              <p className="text-xs text-[#64748B]">
                agendai.com.br/agendar/{user.organizationSlug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app/configuracoes?tab=perfil"
              className="inline-flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100"
              title="Abrir perfil e configurações"
            >
              <Badge variant="default" className="hidden sm:inline-flex">
                {user.roleName}
              </Badge>
              <UserAvatar name={user.name} image={user.image} size="md" />
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
