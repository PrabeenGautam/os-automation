import YAML from "yaml";
import fs from "fs-extra";
import { Job, Workflow } from "../types";
import { injectJobSpacing, injectStepSpacing } from "../mutator";

export async function readYaml(filePath: string): Promise<{ root: Workflow; origText: string }> {
  const origText = await fs.readFile(filePath, "utf8");
  const doc = YAML.parseDocument(origText);
  const root = doc.toJS({}) as Workflow;
  return { root, origText };
}

export async function writeYaml(filePath: string, data: Workflow): Promise<void> {
  const cloned: Workflow = JSON.parse(JSON.stringify(data));

  if (cloned.jobs && typeof cloned.jobs === "object") {
    cloned.jobs = injectJobSpacing(cloned.jobs);
  }

  // Inject spacing for steps in each job
  for (const job of Object.values<Job>(cloned.jobs || {})) {
    if (Array.isArray(job.steps)) {
      job.steps = injectStepSpacing(job.steps);
    }
  }

  const outText = YAML.stringify(cloned, { indent: 2, lineWidth: 0 });

  // Clean up spacer artifacts and excessive newlines
  const formatted = outText
    .replace(/- __spacer__:\s*true\n/g, "\n")
    .replace(/__spacer_\d+__:\s*true\n/g, "\n")
    .replace(/^\s*\n/gm, "\n");

  await fs.writeFile(filePath, formatted, "utf8");
}
