function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function sanitizeAscii(value: string, maxLen: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .slice(0, maxLen);
}

/**
 * Computes CRC16-CCITT (polynomial 0x1021, initial 0xFFFF) per BACEN Pix BR Code spec.
 */
export function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generates a valid BACEN EMVCo Pix Copia e Cola (BR Code) string.
 */
export function generatePixBrCode(params: {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amountCents: number;
  txId?: string;
}): string {
  const key = params.pixKey.trim();
  const merchantName = sanitizeAscii(params.merchantName, 25) || "AGENDAI";
  const merchantCity = sanitizeAscii(params.merchantCity || "BRASIL", 15) || "BRASIL";
  const txId =
    (params.txId || "AGENDAI").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) ||
    "AGENDAI";

  const merchantAccountInfo = tlv(
    "26",
    tlv("00", "br.gov.bcb.pix") + tlv("01", key)
  );

  const amountStr =
    params.amountCents > 0 ? (params.amountCents / 100).toFixed(2) : "";

  const payloadWithoutCrc =
    tlv("00", "01") +
    merchantAccountInfo +
    tlv("52", "0000") +
    tlv("53", "986") +
    (amountStr ? tlv("54", amountStr) : "") +
    tlv("58", "BR") +
    tlv("59", merchantName) +
    tlv("60", merchantCity) +
    tlv("62", tlv("05", txId)) +
    "6304";

  return payloadWithoutCrc + crc16Ccitt(payloadWithoutCrc);
}

