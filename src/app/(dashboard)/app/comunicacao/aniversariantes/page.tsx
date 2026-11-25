import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listClients } from "@/modules/clients/service";
import { listMessageTemplates } from "@/modules/communications/service";
import { classifyBirthdays } from "@/modules/communications/templates";
import { BirthdaysDashboard } from "@/components/communications/birthdays-dashboard";

export default async function BirthdaysPage() {
  let ctx;
  try {
    ctx = await requirePermission("clients:read");
  } catch {
    redirect("/app");
  }

  const [allClients, templates] = await Promise.all([
    listClients(ctx.organizationId, { status: "active" }),
    listMessageTemplates(ctx.organizationId),
  ]);

  const classified = classifyBirthdays(allClients);

  const waTpl = templates.find(
    (t) => t.channel === "whatsapp" && t.category === "birthday"
  );
  const emailTpl = templates.find(
    (t) => t.channel === "email" && t.category === "birthday"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Aniversariantes e Relacionamento
        </h1>
        <p className="text-sm text-[#64748B]">
          Fidelize clientes enviando parabéns personalizados pelo WhatsApp ou e-mail.
        </p>
      </div>

      <BirthdaysDashboard
        organizationName={ctx.organizationName}
        birthdayWhatsAppBody={
          waTpl?.body ??
          "Parabéns pelo seu dia, {{nome}}! 🎉 A equipe {{empresa}} deseja muita saúde e sucesso!"
        }
        birthdayEmailSubject={
          emailTpl?.subject ?? "Feliz aniversário, {{nome}}! — {{empresa}}"
        }
        birthdayEmailBody={
          emailTpl?.body ??
          "Olá, {{nome}}! Desejamos um feliz aniversário repleto de alegrias!"
        }
        today={classified.today}
        next7Days={classified.next7Days}
        next30Days={classified.next30Days}
        canManage={hasPermission(ctx.permissions, "communications:manage")}
      />
    </div>
  );
}

