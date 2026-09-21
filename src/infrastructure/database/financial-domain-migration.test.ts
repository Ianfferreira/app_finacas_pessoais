import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260921110000_create_financial_domain.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

const userOwnedTables = [
  "categories",
  "subcategories",
  "people",
  "accounts",
  "cards",
  "imports",
  "raw_records",
  "transactions",
  "allocations",
];

describe("financial domain migration contract", () => {
  it("keeps raw evidence separate from editable transactions and allocations", () => {
    for (const table of [
      "imports",
      "raw_records",
      "transactions",
      "allocations",
    ]) {
      expect(migration).toContain(`create table public.${table}`);
    }

    expect(migration).toContain("raw_records are immutable evidence");
    expect(migration).toContain("foreign key (raw_record_id, user_id)");
  });

  it("creates the documented editable initial taxonomy for every profile", () => {
    expect(migration).toContain(
      "create trigger profiles_seed_default_categories",
    );
    expect(migration).toContain("'moradia', 'expense'");
    expect(migration).toContain("'salário', 'income'");
    expect(migration).toContain("on conflict (user_id, kind, name) do nothing");
  });

  it("uses numeric money, a competence month, and an allocation-total constraint", () => {
    expect(migration).toContain("amount numeric(18, 2)");
    expect(migration).toContain("competence_month date not null");
    expect(migration).toContain("allocation total");
    expect(migration).not.toContain("amount float");
  });

  it("enables forced RLS and all four explicit user operations", () => {
    for (const table of userOwnedTables) {
      expect(migration).toContain(`'${table}'`);
    }

    expect(migration).toContain(
      "alter table public.%i enable row level security",
    );
    expect(migration).toContain(
      "alter table public.%i force row level security",
    );
    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(migration).toContain(`table_name || '_${operation}_own'`);
    }
  });
});
