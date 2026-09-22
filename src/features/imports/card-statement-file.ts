import "server-only";

import type { CardStatementParseResult } from "./card-statement";
import { parseCaixaCardStatementPdfText } from "./caixa-card-statement-pdf";
import { parseInterCardStatementPdfText } from "./inter-card-statement-pdf";
import { parseNubankCardStatementPdfText } from "./nubank-card-statement-pdf";
import { extractPdfText } from "./pdf-text";
import { parseRicoXpCardStatementCsv } from "./rico-xp-card-statement-csv";

export async function parseCardStatementFile(
  file: File,
): Promise<CardStatementParseResult> {
  if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) {
    return parseRicoXpCardStatementCsv(await file.text(), file.name);
  }
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return { success: false, message: "Envie uma fatura em PDF ou CSV." };
  }

  let text: string;
  try {
    text = await extractPdfText(file);
  } catch {
    return {
      success: false,
      message:
        "Não foi possível extrair texto deste PDF. Verifique se ele não possui senha.",
    };
  }
  const parsers = [
    parseNubankCardStatementPdfText,
    parseCaixaCardStatementPdfText,
    parseInterCardStatementPdfText,
  ];
  for (const parse of parsers) {
    const result = parse(text);
    if (result.success) return result;
  }
  return {
    success: false,
    message:
      "Não reconhecemos esta fatura. Nenhum parser compatível foi aplicado.",
  };
}
