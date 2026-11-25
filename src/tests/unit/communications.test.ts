import { describe, it, expect } from "vitest";
import {
  buildWhatsAppUrl,
  classifyBirthdays,
  renderTemplate,
} from "@/modules/communications/templates";
import { templateInputSchema } from "@/modules/communications/schemas";

describe("Communications Template Engine & WhatsApp Links", () => {
  it("interpolates template variables cleanly", () => {
    const rendered = renderTemplate(
      "Olá, {{nome}}! Confirmado em {{empresa}} para {{data}} às {{hora}} com {{profissional}}.",
      {
        nome: "Ana Paula",
        empresa: "Clínica Vida",
        data: "26/11/2026",
        hora: "14:30",
        profissional: "Dra. Camila",
      }
    );

    expect(rendered).toBe(
      "Olá, Ana Paula! Confirmado em Clínica Vida para 26/11/2026 às 14:30 com Dra. Camila."
    );
  });

  it("builds valid wa.me URLs for Brazilian phone numbers and rejects invalid ones", () => {
    const url = buildWhatsAppUrl("(11) 99999-8888", "Olá mundo!");
    expect(url).toBe("https://wa.me/5511999998888?text=Ol%C3%A1%20mundo!");
    expect(buildWhatsAppUrl("12345", "Oi")).toBeNull();
    expect(buildWhatsAppUrl(null, "Oi")).toBeNull();
  });

  it("classifies birthdays including year rollover (Dec -> Jan)", () => {
    const ref = new Date(2026, 11, 28); // 28 Dec 2026
    const result = classifyBirthdays(
      [
        { id: "1", name: "Hoje", birthDate: "1990-12-28", whatsapp: null, phone: null, email: null },
        { id: "2", name: "Ano Novo", birthDate: "1985-01-02", whatsapp: null, phone: null, email: null },
        { id: "3", name: "Em 20 dias", birthDate: "1995-01-17", whatsapp: null, phone: null, email: null },
        { id: "4", name: "Longe", birthDate: "1992-06-15", whatsapp: null, phone: null, email: null },
      ],
      ref
    );

    expect(result.today.map((c) => c.id)).toEqual(["1"]);
    expect(result.next7Days.map((c) => c.id)).toEqual(["2"]);
    expect(result.next7Days[0]?.daysUntil).toBe(5);
    expect(result.next30Days.map((c) => c.id)).toEqual(["3"]);
  });

  it("validates message template Zod schema", () => {
    expect(
      templateInputSchema.safeParse({
        channel: "whatsapp",
        category: "reminder",
        name: "Lembrete 24h",
        body: "Olá {{nome}}, lembrando do seu horário!",
      }).success
    ).toBe(true);

    expect(
      templateInputSchema.safeParse({
        channel: "whatsapp",
        category: "reminder",
        name: "A",
        body: "Oi",
      }).success
    ).toBe(false);
  });
});

