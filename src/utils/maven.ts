/**
 * Checks if a command looks like a Maven command.
 */
export function isMavenCommand(cmd: string): boolean {
  return /(?:^|[\s./\\])(mvnw?|mvn(?:\.cmd|\.bat)?)(?=\s|$)/i.test(cmd);
}

// Treat verify/package/install as "build"; test/surefire/failsafe as "test"
export function isActionBuildOrTest(cmd: string): "build" | "test" {
  if (/\b(test|surefire|failsafe|integration[- ]?test)\b/i.test(cmd)) return "test";
  return "build";
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
