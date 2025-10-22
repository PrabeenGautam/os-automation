import { Step } from "../types";

export type CacheUpgradeOptions = {
  logger?: (msg: string) => void;
};

export type CacheUpgradeDetail = {
  index: number;
  from: string;
  to?: string;
  skippedReason?: string;
};

export type CacheUpgradeResult = {
  steps: Step[];
  changed: boolean;
  upgrades: number;
  skips: number;
  details: CacheUpgradeDetail[];
};

export function upgradeActionsCacheSteps(steps: Step[], options: CacheUpgradeOptions = {}): CacheUpgradeResult {
  const { logger = console.log } = options;

  const deprecatedVersions = ["v1", "v2"];
  const targetVersion = "v4";

  const result: CacheUpgradeResult = {
    steps,
    changed: false,
    upgrades: 0,
    skips: 0,
    details: [],
  };

  if (!Array.isArray(steps)) {
    logger("upgradeActionsCacheSteps: input is not an array, skipping.");
    return result;
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step || typeof step !== "object") continue;
    if (!step.uses || typeof step.uses !== "string") continue;

    // Check if this is actions/cache
    if (!step.uses.includes("actions/cache@")) continue;

    // Check if it uses a deprecated version
    const isDeprecated = deprecatedVersions.some((version) => step.uses!.includes(`@${version}`));

    if (isDeprecated) {
      const old = step.uses;
      step.uses = step.uses.replace(/@.+$/, `@${targetVersion}`);
      result.upgrades++;
      result.changed = true;
      result.details.push({ index: i, from: old, to: step.uses });
      logger(`Upgraded actions/cache at index ${i}: ${old} -> ${step.uses}`);
    } else {
      result.details.push({ index: i, from: step.uses, skippedReason: "not deprecated" });
    }
  }

  if (result.upgrades > 0) {
    logger(`actions/cache upgrades: ${result.upgrades}, skipped: ${result.skips}`);
  }

  return result;
}
