import "server-only";

import { extractPdfTextFromBytes } from "./pdf-text-extractor";

export async function extractPdfText(file: File): Promise<string> {
  return extractPdfTextFromBytes(new Uint8Array(await file.arrayBuffer()));
}
