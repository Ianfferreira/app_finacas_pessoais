import { describe, expect, it } from "vitest";

import { extractPdfTextFromBytes } from "./pdf-text-extractor";

function createSyntheticPdfBytes(): Uint8Array {
  const stream = "BT /F1 24 Tf 72 720 Td (Synthetic PDF) Tj ET";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  const header = "%PDF-1.4\n";
  let offset = header.length;
  const offsets = objects.map((object) => {
    const currentOffset = offset;
    offset += object.length;
    return currentOffset;
  });
  const xrefOffset = offset;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((value) => `${value.toString().padStart(10, "0")} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  ].join("\n");

  return new TextEncoder().encode([header, ...objects, xref].join(""));
}

describe("extractPdfText", () => {
  it("extracts text from a PDF in the Node.js server runtime", async () => {
    await expect(
      extractPdfTextFromBytes(createSyntheticPdfBytes()),
    ).resolves.toContain("Synthetic PDF");
  });
});
