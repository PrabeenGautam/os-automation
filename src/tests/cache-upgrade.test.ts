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

  test("upgrades v2.x -> v4", () => {
    const steps = [{ uses: "actions/cache@v2.1.6" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(1);
    expect(steps[0].uses).toBe("actions/cache@v4");
  });

  test("skips v3.x (not deprecated)", () => {
    const steps = [{ uses: "actions/cache@v3.2.1" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(0);
    expect(r.changed).toBe(false);
    expect(steps[0].uses).toBe("actions/cache@v3.2.1");
    expect(r.details[0].skippedReason).toBe("not deprecated");
  });

  test("skips v4 already", () => {
    const steps = [{ uses: "actions/cache@v4" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(0);
    expect(r.changed).toBe(false);
    expect(r.details[0].skippedReason).toBe("not deprecated");
  });

  test("skips refs/heads/main", () => {
    const steps = [{ uses: "actions/cache@refs/heads/main" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(0);
    expect(steps[0].uses).toBe("actions/cache@refs/heads/main");
    expect(r.details[0].skippedReason).toBe("not deprecated");
  });

  test("skips pinned sha", () => {
    const steps = [{ uses: "actions/cache@0123456789abcdef0123456789abcdef01234567" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(0);
    expect(steps[0].uses).toMatch(/^actions\/cache@0/);
    expect(r.details[0].skippedReason).toBe("not deprecated");
  });

  test("skips non-version branch", () => {
    const steps = [{ uses: "actions/cache@main" }];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(0);
    expect(steps[0].uses).toBe("actions/cache@main");
    expect(r.details[0].skippedReason).toBe("not deprecated");
  });

  test("upgrades only v1 and v2", () => {
    const steps = [
      { uses: "actions/cache@v1" },
      { uses: "actions/cache@v2.0.0" },
      { uses: "actions/cache@v3.0.0" },
      { uses: "actions/cache@main" },
    ];
    const r = upgradeActionsCacheSteps(steps);
    expect(r.upgrades).toBe(2);
    expect(steps[0].uses).toBe("actions/cache@v4");
    expect(steps[1].uses).toBe("actions/cache@v4");
    expect(steps[2].uses).toBe("actions/cache@v3.0.0");
    expect(steps[3].uses).toBe("actions/cache@main");
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
    expect(r.details.length).toBe(3);
    expect(r.upgrades).toBe(1);
  });
});
