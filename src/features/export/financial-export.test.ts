import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  createFinancialExportPayload,
  createStructuredExportZip,
  csvEscape,
  EXPORT_DATASET_NAMES,
  ExportQueryError,
  fetchAllPages,
  serializeExport,
  transactionsToCsv,
  type ExportDatasets,
} from "./financial-export";

function emptyDatasets(): ExportDatasets {
  return Object.fromEntries(
    EXPORT_DATASET_NAMES.map((name) => [name, []]),
  ) as unknown as ExportDatasets;
}

function exportWithSyntheticTransaction() {
  const datasets = emptyDatasets();
  datasets.profiles = [
    {
      user_id: "synthetic-user",
      currency: "BRL",
      timezone: "America/Sao_Paulo",
    },
  ];
  datasets.transactions = [
    {
      id: "synthetic-transaction",
      occurred_on: "2026-09-01",
      competence_month: "2026-09-01",
      description_raw: 'Synthetic "market", order',
      amount: 10.5,
      direction: "outflow",
      nature: "expense",
      category_id: "synthetic-category",
      is_void: false,
    },
  ];
  return createFinancialExportPayload(datasets, "2026-09-24T12:00:00.000Z");
}

describe("financial export V1", () => {
  it("escapes CSV commas, quotes and line breaks", () => {
    expect(csvEscape('one, "two"\nthree')).toBe('"one, ""two""\nthree"');

    const csv = transactionsToCsv(
      exportWithSyntheticTransaction().datasets.transactions,
    );
    expect(csv).toContain('"Synthetic ""market"", order"');
  });

  it("prevents CSV injection without changing ordinary negative amounts", () => {
    expect(csvEscape('=HYPERLINK("https://example.test")')).toContain(
      "'=HYPERLINK",
    );
    expect(csvEscape("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
    expect(csvEscape("-formula")).toBe("'-formula");
    expect(csvEscape("@formula")).toBe("'@formula");
    expect(csvEscape("\tformula")).toBe("'\tformula");
    expect(csvEscape("\rformula")).toBe('"\'\rformula"');
    expect(csvEscape(-10.5)).toBe("-10.5");
  });

  it("writes a predictable ZIP with manifest, documentation, CSV and every dataset", () => {
    const payload = exportWithSyntheticTransaction();
    const archive = unzipSync(
      createStructuredExportZip(
        payload,
        transactionsToCsv(payload.datasets.transactions),
      ),
    );

    expect(archive["manifest.json"]).toBeDefined();
    expect(archive["LEIA-ME.txt"]).toBeDefined();
    expect(archive["financas-movimentacoes.csv"]).toBeDefined();
    for (const name of EXPORT_DATASET_NAMES) {
      expect(archive[`dados/${name}.json`]).toBeDefined();
    }
    expect(strFromU8(archive["LEIA-ME.txt"])).toContain("Privacidade");
  });

  it("keeps manifest counts aligned with exported datasets", () => {
    const payload = exportWithSyntheticTransaction();
    const archive = unzipSync(
      createStructuredExportZip(
        payload,
        transactionsToCsv(payload.datasets.transactions),
      ),
    );
    const manifest = JSON.parse(strFromU8(archive["manifest.json"])) as {
      counts: Record<string, number>;
    };

    for (const name of EXPORT_DATASET_NAMES) {
      const data = JSON.parse(
        strFromU8(archive[`dados/${name}.json`]),
      ) as unknown[];
      expect(manifest.counts[name]).toBe(data.length);
    }
  });

  it("creates a valid empty export", () => {
    const payload = createFinancialExportPayload(
      emptyDatasets(),
      "2026-09-24T12:00:00.000Z",
    );
    expect(payload.manifest.counts.transactions).toBe(0);
    expect(JSON.parse(serializeExport(payload)).datasets.transactions).toEqual(
      [],
    );
  });

  it("excludes capabilities, credentials, signed URLs and Storage paths recursively", () => {
    const datasets = emptyDatasets();
    datasets.imports = [
      {
        id: "synthetic-import",
        storage_path: "private/synthetic/file.pdf",
        signed_url: "https://example.test/signed",
        nested: {
          api_key: "must-not-leave",
          cookie: "must-not-leave",
          safe: "kept",
        },
      },
    ];
    const serialized = serializeExport(
      createFinancialExportPayload(datasets, "2026-09-24T12:00:00.000Z"),
    );

    expect(serialized).not.toContain("must-not-leave");
    expect(serialized).not.toContain("private/synthetic/file.pdf");
    expect(serialized).not.toContain("https://example.test/signed");
    expect(serialized).toContain('"safe": "kept"');
  });

  it("serializes deterministically when export instant is fixed", () => {
    const first = serializeExport(exportWithSyntheticTransaction());
    const second = serializeExport(exportWithSyntheticTransaction());
    expect(first).toBe(second);
  });

  it("reads more than one deterministic page without truncating rows", async () => {
    const source = ["a", "b", "c", "d", "e"];
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllPages(
      async (from, to) => {
        calls.push([from, to]);
        return { data: source.slice(from, to + 1), error: null };
      },
      "transactions",
      2,
    );

    expect(rows).toEqual(source);
    expect(calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it("stops instead of returning partial data when a paged query fails", async () => {
    await expect(
      fetchAllPages(
        async (from) =>
          from === 0
            ? { data: ["first-page"], error: null }
            : { data: null, error: { message: "database unavailable" } },
        "transactions",
        1,
      ),
    ).rejects.toBeInstanceOf(ExportQueryError);
  });
});
