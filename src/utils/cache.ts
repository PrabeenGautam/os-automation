import { Step } from "../types";

export type CacheUpgradeOptions = {
  safeMode?: boolean; // true = skip pinned refs and SHAs
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
  const { safeMode = true, logger = console.log } = options;

  const cacheActionRegex = /(^|\/)actions\/cache@(.+)$/;
  const isFullSha = (ref: string) => /^[0-9a-f]{40}$/i.test(ref);
  const isRefsRef = (ref: string) => ref.startsWith("refs/");
  const isVersionRef = (ref: string) => /^v\d+(\.|$)/.test(ref);

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
    if (typeof step.uses !== "string") continue;

    const m = step.uses.match(cacheActionRegex);
    if (!m) continue;

    const fullRef = m[2]; // text after '@'

    // Already v4 or higher → skip
    if (/^v4(\.|$)/.test(fullRef)) {
      result.details.push({ index: i, from: step.uses, skippedReason: "already v4" });
      continue;
    }

    // Aggressive mode: upgrade anything matched to v4 (including refs and shas)
    if (!safeMode) {
      const old = step.uses;
      step.uses = step.uses.replace(/@.+$/, "@v4");
      result.upgrades++;
      result.changed = true;
      result.details.push({ index: i, from: old, to: step.uses });
      logger?.(`(aggressive) Upgraded actions/cache at index ${i}: ${old} -> ${step.uses}`);
      continue;
    }

    // safeMode === true: skip pinned refs, SHAs, or non-version ref strings
    if (isRefsRef(fullRef) || isFullSha(fullRef) || !isVersionRef(fullRef)) {
      result.skips++;
      const reason = isRefsRef(fullRef)
        ? "refs/* pinned"
        : isFullSha(fullRef)
          ? "pinned sha"
          : "non-version ref (e.g. main)";
      result.details.push({ index: i, from: step.uses, skippedReason: reason });
      logger?.(`Skipped upgrading cache step at index ${i}: ${reason} (${step.uses})`);
      continue;
    }

    // safeMode && version-like ref (v1|v2|v3): upgrade to v4
    if (/^v[123](\.|$)/.test(fullRef)) {
      const old = step.uses;
      step.uses = step.uses.replace(/@.+$/, "@v4");
      result.upgrades++;
      result.changed = true;
      result.details.push({ index: i, from: old, to: step.uses });
      logger?.(`Upgraded actions/cache at index ${i}: ${old} -> ${step.uses}`);
      continue;
    }

    // fallback: record as skipped (shouldn't normally happen)
    result.details.push({ index: i, from: step.uses, skippedReason: "no-op" });
  }

  if (result.upgrades > 0) {
    logger?.(`actions/cache upgrades: ${result.upgrades}, skipped: ${result.skips}`);
  }

  return result;
}
