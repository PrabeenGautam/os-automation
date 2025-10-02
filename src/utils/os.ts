import { Matrix } from "../types";

export const OS_CANDIDATES = ["ubuntu", "macos", "windows"] as const;

export const OS_REGEX = {
  ubuntu: /^ubuntu(?:-[\w\.\-]+)?$/i,
  macos: /^macos(?:-[\w\.\-]+)?$/i,
  windows: /^windows(?:-[\w\.\-]+)?$/i,
};

// Keep defaults inline at runtime
export const LATEST_OS: Record<string, string> = {
  ubuntu: "ubuntu-latest",
  macos: "macos-latest",
  windows: "windows-latest",
};

export function getNormalizeOsValue(v: any): string | null {
  return typeof v === "string" ? v : null;
}

export function getOSValue(osVal: string): "ubuntu" | "macos" | "windows" | null {
  if (OS_REGEX.ubuntu.test(osVal)) return "ubuntu";
  if (OS_REGEX.macos.test(osVal)) return "macos";
  if (OS_REGEX.windows.test(osVal)) return "windows";
  return null;
}

// Collect existing OS names from matrix.os and matrix.include
export function getExistingOSValues(matrix: Matrix): Set<string> {
  const existing = new Set<string>();

  if (Array.isArray(matrix.os)) {
    for (const osVal of matrix.os) {
      const normalizeOsValue = getNormalizeOsValue(osVal);
      if (!normalizeOsValue) continue;

      const name = getOSValue(normalizeOsValue);
      if (name) existing.add(name);
    }
  }

  if (Array.isArray(matrix.include)) {
    for (const inc of matrix.include) {
      if (inc.os) {
        const s = String(inc.os);
        const name = getOSValue(s);
        if (name) existing.add(name);
      }
    }
  }

  return existing;
}
