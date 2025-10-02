import { Job, JobWithStrategy, Matrix, Step } from "./types";
import { OS_CANDIDATES, LATEST_OS, getExistingOSValues } from "./utils/os";
import { isMavenCommand, isActionBuildOrTest, quoteDFlagsWithDots, addLogFlag } from "./utils/maven";
import { ensureWindowsPrep, logsAndReportsUploadSteps } from "./utils/artifacts";
import { checkWorkflowLogs, isJavaPresent } from "./utils/checker";

export function injectStepSpacing(steps: Step[]) {
  const result: any[] = [];
  steps.forEach((step, i) => {
    result.push(step);
    if (i < steps.length - 1) {
      result.push({ __spacer__: true }); // fake entry to indicate a blank line
    }
  });
  return result;
}

export function injectJobSpacing(jobs: Record<string, Job>) {
  const spacedJobs: Record<string, any> = {};
  const jobNames = Object.keys(jobs);

  jobNames.forEach((jobName, index) => {
    spacedJobs[jobName] = jobs[jobName];

    // Add a spacer after each job except the last
    if (index < jobNames.length - 1) {
      spacedJobs[`__spacer_${index + 1}__`] = true;
    }
  });

  return spacedJobs;
}

function ensureOsMatrix(originalMatrix: Matrix | undefined): { matrix: Matrix; changed: boolean } {
  const matrix: Matrix = originalMatrix ? { ...originalMatrix } : {};
  let changed = false;

  // Make sure matrix.os exists and is an array
  if (!matrix.os) {
    matrix.os = [];
    changed = true;
  } else if (typeof matrix.os === "string") {
    matrix.os = [matrix.os];
    changed = true;
  }

  const existingOS = getExistingOSValues(matrix);

  for (const osName of OS_CANDIDATES) {
    if (!existingOS.has(osName) && Array.isArray(matrix.os)) {
      matrix.os.push(LATEST_OS[osName]);
      changed = true;
    }
  }

  return { matrix, changed };
}

function getJobName(job: Job, hasJava: boolean) {
  let baseName = job.name ?? "Build";

  const os = "${{ matrix.os }}";
  const javaVersion = hasJava ? "Java: ${{ matrix.java }}" : null;

  // Ensure OS
  if (!baseName.includes(os)) {
    baseName = `${baseName} - ${os}`;
  }

  // Ensure Java
  if (javaVersion && !baseName.includes("${{ matrix.java }}")) {
    baseName = `${baseName} - ${javaVersion}`;
  }

  return baseName;
}

export function onMutateJob(job: Job): { job: Job; changed: boolean } {
  let changed = false;

  job.strategy = job.strategy || {};

  const { matrix: updatedMatrix, changed: osChanged } = ensureOsMatrix(job.strategy.matrix);
  job.strategy["fail-fast"] = false;
  job.strategy.matrix = updatedMatrix;

  job["runs-on"] = "${{ matrix.os }}";

  if (osChanged) {
    changed = true;
  }

  job.steps = job.steps ?? [];
  if (ensureWindowsPrep(job)) {
    changed = true;
  }

  const hasJava = isJavaPresent(job.strategy.matrix);

  for (const step of job.steps) {
    if (typeof step?.run !== "string") continue;
    const originalRun = step.run;

    if (!isMavenCommand(originalRun)) continue;

    // Quote -D flags with dots to resolve unknown lifecycle issue
    const quoted = quoteDFlagsWithDots(originalRun);

    // Add -l "logNameExpr" if not already present
    const action = isActionBuildOrTest(quoted);
    const parts: string[] = ["maven", action];
    if (hasJava) parts.push(`java\${{ matrix.java }}`);

    parts.push("${{ matrix.os }}");
    const logNameExpr = parts.join("-") + ".log";

    // Ensure -l "<logname>"
    const withLog = addLogFlag(quoted, logNameExpr);
    if (withLog !== originalRun) {
      step.run = withLog;
      changed = true;
    }
  }

  // Ensure artifact upload steps at the end (check by step names)
  const { hasLogUpload, hasSurefireFailsafeUpload } = checkWorkflowLogs(job.steps);

  const uploadSteps = logsAndReportsUploadSteps({
    hasLogUpload,
    hasSurefireFailsafeUpload,
    hasJava,
    jobName: job.name,
  });

  if (uploadSteps && uploadSteps.length > 0) {
    job.steps.push(...uploadSteps);
    changed = true;
  }

  job.name = getJobName(job, hasJava);

  return { job, changed };
}

export function mutateDoc(doc: any): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (!doc.jobs || typeof doc.jobs !== "object") return false;

  let changedAny = false;
  const dockerRegex = /docker/i;

  for (const [_jobId, job] of Object.entries<Job>(doc.jobs)) {
    if (dockerRegex.test(_jobId)) continue;

    const { changed: isJobChanged } = onMutateJob(job);
    if (isJobChanged) changedAny = true;
  }

  return changedAny;
}
