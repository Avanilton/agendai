/**
 * Neutralizes CSV formula injection (=, +, -, @) and escapes quotes/commas.
 */
export function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n;]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

/**
 * Generates an Excel-friendly UTF-8 BOM CSV string using semicolon separator (pt-BR standard).
 */
export function toCsvString(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map(escapeCsvCell).join(";");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(";"));
  return `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
}

export interface ParsedClientImportRow {
  lineNumber: number;
  name: string;
  phone: string;
  email: string;
  valid: boolean;
  error?: string;
}

/**
 * Parses a CSV text with columns: nome;telefone;email (or comma separated)
 * and returns a preview with validation errors before writing to DB.
 */
export function parseClientsCsvPreview(
  csvText: string
): ParsedClientImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstLower = lines[0]!.toLowerCase();
  const hasHeader =
    firstLower.includes("nome") || firstLower.includes("name");
  const startIdx = hasHeader ? 1 : 0;

  const seenEmails = new Set<string>();
  const preview: ParsedClientImportRow[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const separator = lines[i]!.includes(";") ? ";" : ",";
    const cols = lines[i]!.split(separator).map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[0] ?? "";
    const phone = cols[1] ?? "";
    const email = (cols[2] ?? "").toLowerCase();

    let error: string | undefined;
    if (name.length < 2) {
      error = "Nome obrigatório (mín. 2 caracteres).";
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error = "E-mail inválido.";
    } else if (email && seenEmails.has(email)) {
      error = "E-mail duplicado no arquivo.";
    }

    if (email && !error) seenEmails.add(email);

    preview.push({
      lineNumber: i + 1,
      name,
      phone,
      email,
      valid: !error,
      error,
    });
  }

  return preview;
}

