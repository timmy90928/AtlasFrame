import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../db/migrations/0000_atlasframe_foundation.sql", import.meta.url), "utf8");

describe("database invariants", () => {
  it("enforces one active photo per user and canonical place", () => {
    expect(migration).toContain("photo_locations_owner_place_unique_active");
    expect(migration).toContain("where place_id is not null and is_active = true");
  });

  it("keeps original metadata and editable platform location separate", () => {
    expect(migration).toContain("create table photo_metadata");
    expect(migration).toContain("create table photo_locations");
    expect(migration).toContain("set_photo_location");
  });

  it("reserves storage atomically before direct uploads", () => {
    expect(migration).toContain("create or replace function reserve_photo_upload");
    expect(migration).toContain("PLATFORM_STORAGE_LIMIT_REACHED");
    expect(migration).toContain("STORAGE_QUOTA_EXCEEDED");
  });
});
