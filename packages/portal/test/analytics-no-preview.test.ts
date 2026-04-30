import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Analytics page", () => {
  it('does not contain "Preview data" badge text', () => {
    const pagePath = resolve(
      import.meta.dirname ?? __dirname,
      "../app/(dashboard)/analytics/page.tsx",
    );
    const content = readFileSync(pagePath, "utf-8");
    expect(content).not.toContain("Preview data");
    expect(content).not.toContain("preview data");
  });

  it("uses real API hooks instead of hardcoded mock arrays", () => {
    const pagePath = resolve(
      import.meta.dirname ?? __dirname,
      "../app/(dashboard)/analytics/page.tsx",
    );
    const content = readFileSync(pagePath, "utf-8");
    expect(content).toContain("useTimeseries");
    expect(content).toContain("useProofLatency");
    expect(content).not.toContain("sessionVolumeData = [");
    expect(content).not.toContain("gasCostData = [");
    expect(content).not.toContain("proofLatencyData = [");
  });
});
