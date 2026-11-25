"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cake, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  buildWhatsAppUrl,
  renderTemplate,
  type ClassifiedBirthday,
} from "@/modules/communications/templates";
import { sendCommunicationAction } from "@/modules/communications/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BirthdaysDashboardProps {
  organizationName: string;
  birthdayWhatsAppBody: string;
  birthdayEmailSubject: string;
  birthdayEmailBody: string;
  today: ClassifiedBirthday[];
  next7Days: ClassifiedBirthday[];
  next30Days: ClassifiedBirthday[];
  canManage: boolean;
}

export function BirthdaysDashboard({
  organizationName,
  birthdayWhatsAppBody,
  birthdayEmailSubject,
  birthdayEmailBody,
  today,
  next7Days,
  next30Days,
  canManage,
}: BirthdaysDashboardProps) {
  const router = useRouter();

  async function handleWhatsApp(client: ClassifiedBirthday) {
    const body = renderTemplate(birthdayWhatsAppBody, {
      nome: client.name,
      empresa: organizationName,
    });
    const phone = client.whatsapp || client.phone;
    const url = buildWhatsAppUrl(phone, body);
    if (!url) {
      toast.error("Cliente sem WhatsApp/telefone válido.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");

    if (canManage) {
      await sendCommunicationAction({
        clientId: client.id,
        channel: "whatsapp",
        category: "birthday",
        recipient: phone ?? "",
        renderedBody: body,
      });
      toast.success("Mensagem de aniversário aberta no WhatsApp e registrada!");
      router.refresh();
    }
  }

  async function handleEmail(client: ClassifiedBirthday) {
    if (!client.email) return;
    const subject = renderTemplate(birthdayEmailSubject, {
      nome: client.name,
      empresa: organizationName,
    });
    const body = renderTemplate(birthdayEmailBody, {
      nome: client.name,
      empresa: organizationName,
    });

    const result = await sendCommunicationAction({
      clientId: client.id,
      channel: "email",
      category: "birthday",
      recipient: client.email,
      subject,
      renderedBody: body,
    });

    if (!result.success) {
      toast.error(result.error || "Erro ao enviar e-mail.");
      return;
    }
    toast.success(`Parabéns enviado por e-mail para ${client.name}!`);
    router.refresh();
  }

  function renderSection(title: string, items: ClassifiedBirthday[], highlight = false) {
    return (
      <Card className={highlight ? "border-[#FF914D]/60 bg-[#FFF0E5]/25" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-[#FF914D]" />
              {title}
            </span>
            <Badge variant={highlight ? "solidOrange" : "default"}>
              {items.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-[#64748B]">Nenhum aniversariante neste período.</p>
          ) : (
            <div className="space-y-2.5">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-bold text-sm text-[#142B4F]">{c.name}</p>
                    <p className="text-xs text-[#64748B]">
                      Data: {c.dayMonthLabel}{" "}
                      {c.daysUntil === 0
                        ? "• Hoje!"
                        : `• em ${c.daysUntil} ${c.daysUntil === 1 ? "dia" : "dias"}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleWhatsApp(c)}
                      disabled={!(c.whatsapp || c.phone)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                      WhatsApp
                    </Button>
                    {canManage && c.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEmail(c)}
                      >
                        <Mail className="h-3.5 w-3.5 text-[#2563EB]" />
                        E-mail
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/comunicacao">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Comunicação
          </Link>
        </Button>
      </div>

      {renderSection("Aniversariantes de Hoje", today, true)}
      {renderSection("Próximos 7 dias", next7Days)}
      {renderSection("Próximos 30 dias", next30Days)}
    </div>
  );
}

