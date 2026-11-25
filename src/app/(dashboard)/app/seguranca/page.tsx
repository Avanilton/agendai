"use client";

import { useState } from "react";
import { Shield, LogOut, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SecurityPage() {
  const [revoking, setRevoking] = useState(false);

  async function handleRevokeOtherSessions() {
    setRevoking(true);
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
      setRevoking(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Segurança e Sessões
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Gerencie a proteção da sua conta, sessões ativas e conformidade LGPD.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#2563EB]" />
            Controle de Sessões Ativas
          </CardTitle>
          <CardDescription>
            Suas sessões são protegidas por cookies HttpOnly e validadas no
            servidor. Se suspeitar de acesso indevido, encerre os demais
            dispositivos conectados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#EAF2FF]/60 p-4 text-sm text-[#142B4F]">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2563EB]" />
            <span>
              Sessão atual autenticada com proteção contra força bruta e rate
              limiting.
            </span>
          </div>

          <Button
            variant="destructive"
            onClick={handleRevokeOtherSessions}
            disabled={revoking}
          >
            {revoking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {revoking
              ? "Encerrando sessões..."
              : "Encerrar todas as outras sessões"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

