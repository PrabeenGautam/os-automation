import { upgradeSetupJavaSteps } from "../utils/java";

describe("upgradeSetupJavaSteps", () => {
  test("upgrades v1 -> v5", () => {
    const steps = [{ uses: "actions/setup-java@v1" }];
    const r = upgradeSetupJavaSteps(steps);
    expect(r.upgrades).toBe(1);
    expect(r.changed).toBe(true);
    expect(steps[0].uses).toBe("actions/setup-java@v5");
    expect(r.details[0].to).toBe("actions/setup-java@v5");
  });

  test("upgrades v2.x and v3.x -> v5", () => {
    const steps = [{ uses: "actions/setup-java@v2.1.6" }, { uses: "actions/setup-java@v3.2.1" }];
    const r = upgradeSetupJavaSteps(steps);
    expect(r.upgrades).toBe(2);
    expect(steps[0].uses).toBe("actions/setup-java@v5");
    expect(steps[1].uses).toBe("actions/setup-java@v5");
  });

  test("skips v5 already", () => {
    const steps = [{ uses: "actions/setup-java@v5" }];
    const r = upgradeSetupJavaSteps(steps);
    expect(r.upgrades).toBe(0);
    expect(r.skips).toBe(0);
    expect(r.changed).toBe(false);
    expect(r.details[0].skippedReason).toBe("already v5");
  });

  test("skips refs/heads/main in safe mode", () => {
    const steps = [{ uses: "actions/setup-java@refs/heads/main" }];
    const r = upgradeSetupJavaSteps(steps, { safeMode: true });
    expect(r.upgrades).toBe(0);
    expect(r.skips).toBe(1);
    expect(r.details[0].skippedReason).toMatch(/refs/);
    expect(steps[0].uses).toBe("actions/setup-java@refs/heads/main");
  });

  test("skips pinned sha in safe mode", () => {
    const steps = [{ uses: "actions/setup-java@0123456789abcdef0123456789abcdef01234567" }];
    const r = upgradeSetupJavaSteps(steps, { safeMode: true });
    expect(r.upgrades).toBe(0);
    expect(r.skips).toBe(1);
    expect(r.details[0].skippedReason).toMatch(/sha/);
    expect(steps[0].uses).toMatch(/^actions\/setup-java@0/);
  });

  test("skips non-version branch in safe mode", () => {
    const steps = [{ uses: "actions/setup-java@main" }];
    const r = upgradeSetupJavaSteps(steps, { safeMode: true });
    expect(r.upgrades).toBe(0);
    expect(r.skips).toBe(1);
    expect(r.details[0].skippedReason).toMatch(/non-version/);
  });

  test("aggressive mode upgrades everything to v5", () => {
    const steps = [
      { uses: "actions/setup-java@main" },
      { uses: "actions/setup-java@refs/heads/main" },
      { uses: "actions/setup-java@0123456789abcdef0123456789abcdef01234567" },
      { uses: "actions/setup-java@v2.0.0" },
    ];
    const r = upgradeSetupJavaSteps(steps, { safeMode: false });
    expect(r.upgrades).toBe(4);
    for (const s of steps) expect(s.uses).toBe("actions/setup-java@v5");
  });

  test("handles non-array input gracefully", () => {
    // @ts-ignore
    const r = upgradeSetupJavaSteps(null);
    expect(r.changed).toBe(false);
    expect(r.upgrades).toBe(0);
  });

  test("returns details for matched steps", () => {
    const steps = [
      { uses: "actions/setup-java@v1" },
      { uses: "actions/setup-java@v5" },
      { uses: "actions/setup-java@main" },
    ];
    const r = upgradeSetupJavaSteps(steps);
    expect(r.details.length).toBeGreaterThanOrEqual(3);
    expect(r.upgrades).toBe(1);
    expect(r.skips).toBeGreaterThanOrEqual(1);
  });
});
