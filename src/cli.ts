import { Command } from "commander";
import fg from "fast-glob";
import { readYaml, writeYaml } from "./utils/yaml";
import { mutateDoc } from "./mutator";

export async function run(argv: string[]) {
  const program = new Command();

  program
    .name("os-automation")
    .description(
      "Automate OS matrix updates, Windows fixes, and Maven log/artifact setup for GitHub Actions workflows."
    )
    .option("-p, --pattern <glob>", "Glob of workflow files to process", "{.github/workflows,src/test}/**/*.{yml,yaml}")
    .option("-d, --dry-run", "Show what would change but do not write files", false)
    .option("-l, --list", "List files that would be processed and exit", false)
    .parse(argv);

  // Obtain options
  const options = program.opts<{ pattern: string; dryRun: boolean; list: boolean }>();

  // Obtain files matching the pattern
  const files = await fg(options.pattern, { dot: true, onlyFiles: true });
  if (options.list) {
    console.log(files.join("\n"));
    return;
  }

  if (files.length === 0) {
    console.error("No workflow files found for pattern:", options.pattern);
    process.exit(2);
  }

  let changedCount = 0;
  for (const filePath of files) {
    try {
      const { root } = await readYaml(filePath);
      const changed = mutateDoc(root);

      if (changed && !options.dryRun) {
        await writeYaml(filePath, root);
        console.log("Updated:", filePath);
      } else {
        console.log(changed ? `Would update: ${filePath}` : `No change: ${filePath}`);
      }

      if (changed) changedCount++;
    } catch (error: unknown) {
      console.error("Error processing", filePath, (error as Error)?.message ?? error);
    }
  }

  if (options.dryRun) {
    console.log(`Done. Files that would change: ${changedCount}/${files.length}`);
    return;
  }

  `Done. Files changed: ${changedCount}/${files.length}`;
}
