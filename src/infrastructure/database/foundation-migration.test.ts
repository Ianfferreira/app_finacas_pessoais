import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260920180000_create_profiles.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("foundation migration contract", () => {
  it("creates only the profile table in the product schema", () => {
    expect(migration).toContain("create table public.profiles");

    const createdPublicTables = migration.match(/create table public\./g) ?? [];
    expect(createdPublicTables).toHaveLength(1);
  });

  it("enables and forces RLS with one policy per operation", () => {
    expect(migration).toContain(
      "alter table public.profiles enable row level security",
    );
    expect(migration).toContain(
      "alter table public.profiles force row level security",
    );

    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(migration).toContain(`profiles_${operation}_own`);
    }

    expect(migration.match(/create policy /g)).toHaveLength(4);
    expect(migration.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(
      5,
    );
  });

  it("creates profiles from Auth identities without financial seed data", () => {
    expect(migration).toContain("create trigger on_auth_user_created");
    expect(migration).toContain("after insert on auth.users");
    expect(migration).not.toMatch(
      /create table public\.(transactions|accounts|cards|categories|imports)/,
    );
  });
});
