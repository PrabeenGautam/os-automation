import { Step } from "../types";
import { hasGitConfig } from "./checker";

function addWindowsSupport(opts: { autocrlf?: boolean; longpaths?: boolean } = {}): Step[] {
  const steps: Step[] = [];
  if (opts.autocrlf) {
    steps.push({
      name: "Windows: Git EOL",
      if: "runner.os == 'Windows'",
      run: "git config --global core.autocrlf false",
    });
  }
  if (opts.longpaths) {
    steps.push({
      name: "Windows: Git Long Paths",
      if: "runner.os == 'Windows'",
      run: "git config --system core.longpaths true",
    });
  }
  return steps;
}

export function ensureWindowsPrep(job: { steps: Step[] }): boolean {
  const steps = job.steps ?? [];
  // const hasAutocrlf = hasGitConfig(steps, "core.autocrlf");
  const hasLongpaths = hasGitConfig(steps, "core.longpaths");

  // const missingAutocrlf = !hasAutocrlf;
  const missingLongpaths = !hasLongpaths;

  if (missingLongpaths) {
    job.steps.unshift(...addWindowsSupport({ autocrlf: false, longpaths: missingLongpaths }));
    return true;
  }

  return false;
}

function safeArtifactName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\$\{\{\s*matrix\.os\s*\}\}/g, "") // remove OS matrix
    .replace(/\$\{\{\s*matrix\.java\s*\}\}/g, "") // remove Java matrix
    .replace(/[^a-z0-9._-]+/g, "-") // normalize invalid chars
    .replace(/-+/g, "-") // collapse multiple dashes
    .replace(/^-|-$/g, ""); // trim leading/trailing dash
}

export function logsAndReportsUploadSteps(opts: {
  hasLogUpload: boolean;
  hasSurefireFailsafeUpload: boolean;
  hasJava?: boolean;
  jobName?: string;
}) {
  const namePart = opts.hasJava ? "-${{ matrix.java }}" : "";
  const steps: Step[] = [];

  if (opts.hasLogUpload && opts.hasSurefireFailsafeUpload) {
    return;
  }

  if (!opts.hasLogUpload) {
    const safeName = safeArtifactName(opts.jobName ?? "build");

    steps.push({
      name: "Upload Maven logs",
      if: "always()",
      uses: "actions/upload-artifact@v4",
      with: {
        name: `${safeName}-logs-\${{ matrix.os }}${namePart}`,
        path: "*.log",
        "if-no-files-found": "ignore",
      },
    });
  }

  if (!opts.hasSurefireFailsafeUpload) {
    const safeName = safeArtifactName(opts.jobName ?? "test");

    steps.push({
      name: "Upload Surefire/Failsafe reports",
      if: "always()",
      uses: "actions/upload-artifact@v4",
      with: {
        name: `${safeName}-reports-\${{ matrix.os }}${namePart}`,
        path: ["**/surefire-reports/**/*", "**/failsafe-reports/**/*"].join("\n"),
        "if-no-files-found": "ignore",
      },
    });
  }

  return steps;
}
