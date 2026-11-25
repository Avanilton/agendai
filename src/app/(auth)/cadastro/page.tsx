"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plano") || "profissional";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    if (!acceptedLgpd) {
      toast.error(
        "Você precisa aceitar os Termos de Uso e a Política de Privacidade (LGPD)."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        toast.error(
          result.error.message || "Não foi possível criar a conta. Tente outro e-mail."
        );
        setLoading(false);
        return;
      }

      toast.success("Conta criada! Agora configure sua empresa.");
      router.push(`/onboarding?plano=${encodeURIComponent(selectedPlan)}`);
      router.refresh();
    } catch {
      toast.error("Erro ao conectar ao servidor. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Criar conta gratuita</CardTitle>
        <CardDescription>
          Comece com 14 dias gratuitos e organize seu negócio no Agendai.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Seu nome completo</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Ex.: Dra. Camila Ferreira"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail profissional</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-[#F5F7FA] p-3 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedLgpd}
              onChange={(e) => setAcceptedLgpd(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              required
            />
            <span>
              Concordo com os{" "}
              <Link href="/termos" className="font-semibold text-[#2563EB] hover:underline">
                Termos de Uso
              </Link>
              ,{" "}
              <Link href="/privacidade" className="font-semibold text-[#2563EB] hover:underline">
                Política de Privacidade
              </Link>{" "}
              e tratamento de dados conforme a{" "}
              <Link href="/lgpd" className="font-semibold text-[#2563EB] hover:underline">
                LGPD
              </Link>
              .
            </span>
          </label>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {loading ? "Criando conta..." : "Criar minha conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#64748B]">
          Já possui uma conta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#2563EB] hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
      <SignUpForm />
    </Suspense>
  );
}
