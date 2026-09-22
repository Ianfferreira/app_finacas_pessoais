import "server-only";

import { PDFParse } from "pdf-parse";

export async function extractPdfText(file: File): Promise<string> {
  const parser = new PDFParse({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
