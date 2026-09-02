import { describe, it, expect } from "vitest";
import { upsertCompanies, type ScoredCompany } from "./store";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimal in-memory fake of the Supabase query builder used by the store. */
function fakeDb(existingPhones: string[] = []) {
  const upserts: Record<string, unknown>[][] = [];
  const db = {
    from() {
      return {
        select() {
          return {
            in(_col: string, phones: string[]) {
              return Promise.resolve({
                data: phones.filter((p) => existingPhones.includes(p)).map((phone) => ({ phone })),
                error: null,
              });
            },
          };
        },
        upsert(rows: Record<string, unknown>[]) {
          upserts.push(rows);
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
  return { db, upserts };
}

const SC = (phone: string | null, over: Partial<ScoredCompany> = {}): ScoredCompany => ({
  name: "Клиника", phone, industry: "dentistry", city: "Ташкент",
  website: "https://x.uz", email: null, socialLinks: [], source: "pc", sourceUrl: null, geo: null,
  signals: { hasWebsite: true, hasEmail: false, hasSocial: false, hasCta: false, domainAgeYears: null, responsive: false },
  webStatus: "ok", grade: "B", ...over,
});

describe("upsertCompanies", () => {
  it("counts new vs updated by pre-existing phone", async () => {
    const { db, upserts } = fakeDb(["+998900000001"]);
    const r = await upsertCompanies(
      db,
      [SC("+998900000001"), SC("+998900000002"), SC("+998900000003")],
      "pc",
      "2026-01-01T00:00:00Z",
    );
    expect(r.new).toBe(2);
    expect(r.updated).toBe(1);
    expect(r.skipped).toBe(0);
    expect(upserts[0]).toHaveLength(3);
  });

  it("skips companies without a phone", async () => {
    const { db } = fakeDb();
    const r = await upsertCompanies(db, [SC(null), SC("+998900000009")], "pc", "2026-01-01T00:00:00Z");
    expect(r.skipped).toBe(1);
    expect(r.new).toBe(1);
  });

  it("is idempotent — 2nd run of same input = all updated, same row shape", async () => {
    const phones = ["+998900000001", "+998900000002"];
    const input = phones.map((p) => SC(p));
    const first = fakeDb([]);
    await upsertCompanies(first.db, input, "pc", "2026-01-01T00:00:00Z");
    // second run: those phones now exist
    const second = fakeDb(phones);
    const r2 = await upsertCompanies(second.db, input, "pc", "2026-01-02T00:00:00Z");
    expect(r2.new).toBe(0);
    expect(r2.updated).toBe(2);
    // row content identical except the timestamps
    const row1 = { ...first.upserts[0][0] } as Record<string, unknown>;
    const row2 = { ...second.upserts[0][0] } as Record<string, unknown>;
    delete row1.updated_at; delete row1.verified_at;
    delete row2.updated_at; delete row2.verified_at;
    expect(row2).toEqual(row1);
  });
});
