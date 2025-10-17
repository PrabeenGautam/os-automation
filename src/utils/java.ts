import { Step } from "../types";

export type SetupJavaUpgradeOptions = {
  safeMode?: boolean;
  target?: string;
  logger?: (msg: string) => void;
};

export type SetupJavaUpgradeDetail = {
  index: number;
  from: string;
  to?: string;
  skippedReason?: string;
};

export type SetupJavaUpgradeResult = {
  steps: Step[];
  changed: boolean;
  upgrades: number;
  skips: number;
  details: SetupJavaUpgradeDetail[];
};

export function upgradeSetupJavaSteps(steps: Step[], options: SetupJavaUpgradeOptions = {}): SetupJavaUpgradeResult {
  const { safeMode = true, target = "v5", logger = console.log } = options;

  const setupJavaRegex = /(^|\/)actions\/setup-java@(.+)$/;
  const isFullSha = (ref: string) => /^[0-9a-f]{40}$/i.test(ref);
  const isRefsRef = (ref: string) => ref.startsWith("refs/");
  const isVersionRef = (ref: string) => /^v\d+(\.|$)/.test(ref);

  const result: SetupJavaUpgradeResult = {
    steps,
    changed: false,
    upgrades: 0,
    skips: 0,
    details: [],
  };

  if (!Array.isArray(steps)) {
    logger("upgradeSetupJavaSteps: input is not an array, skipping.");
    return result;
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step || typeof step !== "object") continue;
    if (typeof step.uses !== "string") continue;

    const m = step.uses.match(setupJavaRegex);
    if (!m) continue;

    const fullRef = m[2];

    // Already target (v5 or v5.x) -> skip
    if (new RegExp(`^${target}(\\.|$)`).test(fullRef)) {
      result.details.push({ index: i, from: step.uses, skippedReason: `already ${target}` });
      continue;
    }

    // aggressive mode: replace anything after @ with target
    if (!safeMode) {
      const old = step.uses;
      step.uses = step.uses.replace(/@.+$/, `@${target}`);
      result.upgrades++;
      result.changed = true;
      result.details.push({ index: i, from: old, to: step.uses });
      logger?.(`(aggressive) Upgraded actions/setup-java at index ${i}: ${old} -> ${step.uses}`);
      continue;
    }

    // safeMode: skip pinned refs/SHAs and non-version refs
    if (isRefsRef(fullRef) || isFullSha(fullRef) || !isVersionRef(fullRef)) {
      result.skips++;
      const reason = isRefsRef(fullRef)
        ? "refs/* pinned"
        : isFullSha(fullRef)
          ? "pinned sha"
          : "non-version ref (e.g. main)";
      result.details.push({ index: i, from: step.uses, skippedReason: reason });
      logger?.(`Skipped upgrading setup-java at index ${i}: ${reason} (${step.uses})`);
      continue;
    }

    // safeMode && version-like ref (v1|v2|v3|v4 etc) -> upgrade to target
    if (/^v\d+(\.|$)/.test(fullRef)) {
      const old = step.uses;
      step.uses = step.uses.replace(/@.+$/, `@${target}`);
      result.upgrades++;
      result.changed = true;
      result.details.push({ index: i, from: old, to: step.uses });
      logger?.(`Upgraded actions/setup-java at index ${i}: ${old} -> ${step.uses}`);
      continue;
    }

    // fallback (shouldn't normally happen)
    result.details.push({ index: i, from: step.uses, skippedReason: "no-op" });
  }

  if (result.upgrades > 0) {
    logger?.(`setup-java upgrades: ${result.upgrades}, skipped: ${result.skips}`);
  }

  return result;
}
