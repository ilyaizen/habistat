// Uses Vitest environment.
import { describe, it, expect } from "vitest";

describe("Core utilities (smoke)", () => {
  // Rate limiter windowStart computation should remain stable across refactors.
  it("rate limiter windowStart computation is stable", async () => {
    const { computeWindowStart } = await import("../../src/convex/rateLimit");
    const t = 1700000061; // arbitrary
    expect(computeWindowStart(t, 60)).toBe(1700000040);
    expect(computeWindowStart(t, 10)).toBe(1700000060);
    expect(computeWindowStart(t, 1)).toBe(1700000061);
  });
});


