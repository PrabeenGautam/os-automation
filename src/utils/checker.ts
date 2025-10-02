import { Step } from "../types";

export function isJavaPresent(matrix: any): boolean {
  if (!matrix) return false;
  if (Object.prototype.hasOwnProperty.call(matrix, "java")) return true;
  if (Object.prototype.hasOwnProperty.call(matrix, "java-version")) return true;
  if (Object.prototype.hasOwnProperty.call(matrix, "jdk")) return true;
  return false;
}

export function hasGitConfig(steps: Step[], key: string): boolean {
  return steps.some((s) => typeof s.run === "string" && s.run.includes("git config") && s.run.includes(key));
}

export function checkWorkflowLogs(steps: Step[]) {
  let hasLogUpload = false;
  let hasSurefireFailsafeUpload = false;

  for (const step of steps) {
    // Detect generic .log uploads (e.g., actions/upload-artifact)
    if (step.uses?.includes("actions/upload-artifact") && step.with?.path && step.with.path.match(/\.log$/i)) {
      hasLogUpload = true;
    }

    // Detect surefire/failsafe test logs uploads
    if (
      step.uses?.includes("actions/upload-artifact") &&
      step.with?.path &&
      step.with.path.match(/surefire|failsafe/i)
    ) {
      hasSurefireFailsafeUpload = true;
    }
  }

  return { hasLogUpload, hasSurefireFailsafeUpload };
}
