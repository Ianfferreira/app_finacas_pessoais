import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

export async function extractPdfTextFromBytes(
  data: Uint8Array,
): Promise<string> {
  const parser = new PDFParse({ data, CanvasFactory });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
