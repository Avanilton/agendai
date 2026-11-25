export type MessageChannel = "whatsapp" | "email";
export type MessageCategory =
  | "confirmation"
  | "reminder"
  | "cancellation"
  | "reschedule"
  | "billing"
  | "birthday"
  | "budget"
  | "custom";

export interface TemplateVariables {
  nome?: string;
  data?: string;
  hora?: string;
  profissional?: string;
  servico?: string;
  empresa?: string;
  valor?: string;
}

export const DEFAULT_MESSAGE_TEMPLATES: {
  channel: MessageChannel;
  category: MessageCategory;
  name: string;
  subject: string | null;
  body: string;
}[] = [
  {
    channel: "whatsapp",
    category: "confirmation",
    name: "Confirmação de Agendamento",
    subject: null,
    body: "Olá, {{nome}}! Seu agendamento em {{empresa}} está confirmado para {{data}} às {{hora}} com {{profissional}} ({{servico}}).",
  },
  {
    channel: "whatsapp",
    category: "reminder",
    name: "Lembrete de Atendimento",
    subject: null,
    body: "Olá, {{nome}}! Lembrando do seu atendimento em {{empresa}} no dia {{data}} às {{hora}} com {{profissional}}. Caso precise reagendar, avise-nos!",
  },
  {
    channel: "whatsapp",
    category: "cancellation",
    name: "Aviso de Cancelamento",
    subject: null,
    body: "Olá, {{nome}}. Informamos que seu agendamento em {{empresa}} para {{data}} às {{hora}} foi cancelado. Estamos à disposição para remarcar.",
  },
  {
    channel: "whatsapp",
    category: "reschedule",
    name: "Confirmação de Reagendamento",
    subject: null,
    body: "Olá, {{nome}}! Seu horário em {{empresa}} foi reagendado para {{data}} às {{hora}} com {{profissional}}.",
  },
  {
    channel: "whatsapp",
    category: "birthday",
    name: "Feliz Aniversário",
    subject: null,
    body: "Parabéns pelo seu dia, {{nome}}! 🎉 A equipe {{empresa}} deseja muita saúde, alegria e sucesso neste novo ciclo!",
  },
  {
    channel: "email",
    category: "reminder",
    name: "Lembrete por E-mail",
    subject: "Lembrete: seu agendamento em {{empresa}} — {{data}} às {{hora}}",
    body: "Olá, {{nome}}!\n\nEste é um lembrete do seu agendamento em {{empresa}}:\n- Serviço: {{servico}}\n- Profissional: {{profissional}}\n- Data e horário: {{data}} às {{hora}}\n\nAté breve!",
  },
  {
    channel: "email",
    category: "birthday",
    name: "Aniversário por E-mail",
    subject: "Feliz aniversário, {{nome}}! — {{empresa}}",
    body: "Olá, {{nome}}!\n\nToda a equipe {{empresa}} deseja um feliz aniversário repleto de realizações!",
  },
];

/**
 * Replaces {{variable}} placeholders safely with provided values.
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  const map: Record<string, string> = {
    nome: variables.nome ?? "",
    data: variables.data ?? "",
    hora: variables.hora ?? "",
    profissional: variables.profissional ?? "",
    servico: variables.servico ?? "",
    empresa: variables.empresa ?? "",
    valor: variables.valor ?? "",
  };

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.toLowerCase();
    return key in map ? map[key]! : `{{${rawKey}}}`;
  });
}

/**
 * Builds an official wa.me link for Brazilian or international phone numbers.
 * Returns null if the phone number has fewer than 10 digits.
 */
export function buildWhatsAppUrl(
  rawPhone: string | null | undefined,
  message: string
): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 10) return null;

  const e164 =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;

  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

export interface BirthdayClient {
  id: string;
  name: string;
  birthDate: string | null; // YYYY-MM-DD
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
}

export interface ClassifiedBirthday extends BirthdayClient {
  daysUntil: number;
  dayMonthLabel: string;
}

/**
 * Classifies clients with birthDate into today, next 7 days, and next 30 days.
 * Handles year rollover (e.g. December -> January) accurately.
 */
export function classifyBirthdays(
  clientList: BirthdayClient[],
  referenceDate: Date = new Date()
): {
  today: ClassifiedBirthday[];
  next7Days: ClassifiedBirthday[];
  next30Days: ClassifiedBirthday[];
} {
  const refYear = referenceDate.getFullYear();
  const refMidnight = new Date(
    refYear,
    referenceDate.getMonth(),
    referenceDate.getDate()
  ).getTime();

  const today: ClassifiedBirthday[] = [];
  const next7Days: ClassifiedBirthday[] = [];
  const next30Days: ClassifiedBirthday[] = [];

  for (const client of clientList) {
    if (!client.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(client.birthDate)) {
      continue;
    }

    const [, mStr, dStr] = client.birthDate.split("-");
    const month = Number(mStr) - 1;
    const day = Number(dStr);

    let nextBday = new Date(refYear, month, day).getTime();
    if (nextBday < refMidnight) {
      nextBday = new Date(refYear + 1, month, day).getTime();
    }

    const daysUntil = Math.round((nextBday - refMidnight) / (24 * 60 * 60_000));
    const entry: ClassifiedBirthday = {
      ...client,
      daysUntil,
      dayMonthLabel: `${dStr}/${mStr}`,
    };

    if (daysUntil === 0) {
      today.push(entry);
    } else if (daysUntil <= 7) {
      next7Days.push(entry);
    } else if (daysUntil <= 30) {
      next30Days.push(entry);
    }
  }

  const byDays = (a: ClassifiedBirthday, b: ClassifiedBirthday) =>
    a.daysUntil - b.daysUntil || a.name.localeCompare(b.name);

  today.sort(byDays);
  next7Days.sort(byDays);
  next30Days.sort(byDays);

  return { today, next7Days, next30Days };
}

