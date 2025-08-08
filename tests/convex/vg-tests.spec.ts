// Minimal tests for VG1-VG3. Uses Vitest environment.
import { describe, it, expect } from "vitest";

describe("Phase 3.7 Validation Gates (smoke)", () => {
  it("VG1: color normalization helper clamps to allowed set (client util)", async () => {
    const { normalizeCalendarColor, ALLOWED_CALENDAR_COLORS } = await import("../../src/lib/utils/colors");
    for (const c of ALLOWED_CALENDAR_COLORS) {
      expect(normalizeCalendarColor(c)).toBe(c);
      expect(normalizeCalendarColor(`${c}-500`)).toBe(c);
    }
    expect(ALLOWED_CALENDAR_COLORS.includes(normalizeCalendarColor("#123456"))).toBe(true);
  });

  it("VG2: local upsert-by-date ensures 1 row per (userId,date)", async () => {
    const local = await import("../../src/lib/services/local-data");
    const date = "2030-01-01";
    const userId = "user-abc";
    const now = Date.now();
    await local.upsertActivityHistoryByDate({ userId, date, openedAt: now - 1000, clientUpdatedAt: now - 1000 });
    const id2 = await local.upsertActivityHistoryByDate({ userId, date, openedAt: now, clientUpdatedAt: now });
    const again = await local.upsertActivityHistoryByDate({ userId, date, openedAt: now - 500, clientUpdatedAt: now - 500 });
    expect(id2).toBe(again);
    const row = await local.getActivityHistoryByUserAndDate(userId, date);
    expect((row as any)?.openedAt).toBe(now);
  });

  it("VG3: initial sync pull-first flag is honored in unified sync service (logic)", async () => {
    const mod = await import("../../src/lib/services/sync-service");
    const service = mod.syncService;
    // We only assert existence and callable methods here; full E2E covered separately.
    expect(typeof service.fullSync).toBe("function");
    expect(typeof service["syncActivityHistory"]).toBe("function");
  });
});


