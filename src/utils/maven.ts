/**
 * Checks if a command looks like a Maven command.
 */
export function isMavenCommand(cmd: string): boolean {
  return /(?:^|[\s./\\])(mvnw?|mvn(?:\.cmd|\.bat)?)(?=\s|$)/i.test(cmd);
}

export function isVersionCmd(cmd: string): boolean {
  return /\s(-v|--version)\b/.test(cmd);
}

// Treat verify/package/install as "build"; test/surefire/failsafe as "test"
export function isActionBuildOrTest(cmd: string): "build" | "test" {
  if (/\b(test|surefire|failsafe|integration[- ]?test)\b/i.test(cmd)) return "test";
  return "build";
}

export function hasBatchModeFlag(cmd: string): boolean {
  return /\s(-B|--batch-mode)\b/.test(cmd);
}

export function hasNoTransferProgressFlag(cmd: string): boolean {
  return /\s(-ntp|--no-transfer-progress)\b/.test(cmd);
}

export function addBatchModeFlag(cmd: string): string {
  if (hasBatchModeFlag(cmd)) return cmd;
  // Insert after 'mvn' or 'mvnw' command
  return cmd.replace(/((?:^|[\s./\\])(?:mvnw?|mvn(?:\.cmd|\.bat)?))/i, "$1 --batch-mode");
}

export function addNoTransferProgressFlag(cmd: string): string {
  if (hasNoTransferProgressFlag(cmd)) return cmd;
  // Insert after 'mvn' or 'mvnw' command (and batch mode if present)
  return cmd.replace(/((?:^|[\s./\\])(?:mvnw?|mvn(?:\.cmd|\.bat)?)(?:\s+(?:-B|--batch-mode))?)/i, "$1 -ntp");
}

// Wrap -D flags that contain dots in quotes, to avoid shell issues
export function quoteDFlagsWithDots(cmd: string): string {
  return cmd.replace(/(^|\s)(-D(?:[^\s$]|\$\{\{[^}]*\}\}|\$(?!\{\{))+)/g, (_m, pre, flag) => {
    if (flag.startsWith('"') && flag.endsWith('"')) {
      return `${pre}${flag}`;
    }

    // Only wrap if the flag contains a dot
    if (flag.includes(".")) {
      return `${pre}"${flag}"`;
    }

    return `${pre}${flag}`;
  });
}

// If -l or --log-file already present, leave as it is
// Otherwise append -l "logNameExpr" at the end, preserving quotes
export function addLogFlag(cmd: string, logNameExpr: string): string {
  if (/\s-(?:l|log-file)\b/.test(cmd) || /\s--log-file\b/.test(cmd)) return cmd;
  return `${cmd.trimEnd()} -l "${logNameExpr}"`;
}
