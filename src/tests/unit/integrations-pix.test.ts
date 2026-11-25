import { describe, it, expect } from "vitest";
import { crc16Ccitt, generatePixBrCode } from "@/modules/integrations/pix";
import {
  createNfseDraftSchema,
  createPixChargeSchema,
  fiscalProfileSchema,
} from "@/modules/integrations/schemas";

describe("BACEN Pix EMVCo BR Code Generator", () => {
  it("computes standard CRC16-CCITT (0x1021, init 0xFFFF) check value", () => {
    expect(crc16Ccitt("123456789")).toBe("29B1");
  });

  it("generates a valid Pix Copia e Cola string with verifiable CRC16", () => {
    const brCode = generatePixBrCode({
      pixKey: "contato@agendai.com.br",
      merchantName: "Clínica Vida",
      merchantCity: "São Paulo",
      amountCents: 15000,
      txId: "AGD12345",
    });

    expect(brCode.startsWith("000201")).toBe(true);
    expect(brCode).toContain("br.gov.bcb.pix");
    expect(brCode).toContain("5303986");
    expect(brCode).toContain("5406150.00");
    expect(brCode).toContain("5802BR");

    const bodyWithoutCrc = brCode.slice(0, -4);
    const providedCrc = brCode.slice(-4);
    expect(providedCrc).toBe(crc16Ccitt(bodyWithoutCrc));
  });

  it("validates Pix, Fiscal Profile, and NFS-e Draft Zod schemas", () => {
    expect(
      createPixChargeSchema.safeParse({
        pixKey: "11999998888",
        amountReais: 120.5,
        description: "Consulta Clínica",
      }).success
    ).toBe(true);

    expect(
      fiscalProfileSchema.safeParse({
        cnpj: "12.345.678/0001-99",
        municipalRegistration: "123456",
        taxRegime: "simples_nacional",
        issRatePercent: 2.5,
        provider: "nfse_nacional",
      }).success
    ).toBe(true);

    expect(
      createNfseDraftSchema.safeParse({
        description: "Serviços de atendimento clínico",
        amountReais: 250,
        issRatePercent: 2,
      }).success
    ).toBe(true);
  });
});

