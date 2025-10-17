import { upgradeActionsCacheSteps } from "../utils/cache";

describe("upgradeActionsCacheSteps", () => {
  test("upgrades v1 -> v4", () => {
    const steps = [{ uses: "actions/cache@v1" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(1);
    expect(r.changed).toBe(true);
    expect(steps[0].uses).toBe("actions/cache@v4");
    expect(r.details[0].to).toBe("actions/cache@v4");
  });

  test("upgrades v2.x and v3.x -> v4", () => {
    const steps = [{ uses: "actions/cache@v2.1.6" }, { uses: "actions/cache@v3.2.1" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(2);
    expect(steps[0].uses).toBe("actions/cache@v4");
    expect(steps[1].uses).toBe("actions/cache@v4");
  });

  test("skips v4 already", () => {
    const steps = [{ uses: "actions/cache@v4" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(0);
    expect(r.skips).toBe(0);
    expect(r.changed).toBe(false);
    expect(r.details[0].skippedReason).toBe("already v4");
  });

  test("skips refs/heads/main in safe mode", () => {
    const steps = [{ uses: "actions/cache@refs/heads/main" }];
    const r = upgradeActionsCacheSteps(steps, { safeMode: true });
    expect(r.upgrades).toBe(0);
    expect(r.skips).toBe(1);
    expect(r.details[0].skippedReason).toMatch(/refs/);
    expect(steps[0].uses).toBe("actions/cache@refs/heads/main");
  });

  test("skips pinned sha in safe mode", () => {
    const steps = [{ uses: "actions/cache@0123456789abcdef0123456789abcdef01234567" }];
    const r = upgradeActionsCacheSteps(steps, { safeMode: true });
    expect(r.upgrades).toBe(0);
    expect(r.skips).toBe(1);
    expect(r.details[0].skippedReason).toMatch(/sha/);
    expect(steps[0].uses).toMatch(/^actions\/cache@0/);
  });

  test("skips non-version branch in safe mode", () => {
    const steps = [{ uses: "actions/cache@main" }];
    const r = upgradeActionsCacheSteps(steps, { safeMode: true });
    expect(r.upgrades).toBe(0);
    expect(r.skips).toBe(1);
    expect(r.details[0].skippedReason).toMatch(/non-version/);
  });

  test("aggressive mode upgrades everything to v4", () => {
    const steps = [
      { uses: "actions/cache@main" },
      { uses: "actions/cache@refs/heads/main" },
      { uses: "actions/cache@0123456789abcdef0123456789abcdef01234567" },
      { uses: "actions/cache@v2.0.0" },
    ];
    const r = upgradeActionsCacheSteps(steps, { safeMode: false });
    expect(r.upgrades).toBe(4);
    for (const s of steps) expect(s.uses).toBe("actions/cache@v4");
  });

  test("handles non-array input gracefully", () => {
    // @ts-ignore
    const r = upgradeActionsCacheSteps(null);
    expect(r.changed).toBe(false);
    expect(r.upgrades).toBe(0);
  });

  test("returns details for matched steps", () => {
    const steps = [{ uses: "actions/cache@v1" }, { uses: "actions/cache@v4" }, { uses: "actions/cache@main" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.details.length).toBeGreaterThanOrEqual(3);
    expect(r.upgrades).toBe(1);
    expect(r.skips).toBeGreaterThanOrEqual(1);
  });
});
