import type { Command } from "commander";
import ora from "ora";
import { printInstalledList } from "../formatter/human.js";
import { printJson } from "../formatter/json-output.js";
import { listPlugins } from "../services/list.js";

export function registerList(program: Command): void {
  program
    .command("list")
    .description("List installed plugins")
    .option("--outdated", "show available updates")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.opts() as {
        cwd?: string;
        pluginsDir?: string;
        json?: boolean;
        silent?: boolean;
      };
      const cwd = globalOpts.cwd ?? process.cwd();
      const isJson = globalOpts.json ?? false;
      const spinner = ora({ isSilent: globalOpts.silent ?? false });

      try {
        spinner.start(opts.outdated ? "Checking for updates..." : "Reading installed plugins...");
        const entries = await listPlugins(
          { cwd, outdated: opts.outdated as boolean | undefined },
          (msg) => {
            spinner.text = msg;
          },
        );
        spinner.stop();

        if (entries.length === 0) {
          console.log("No plugins installed.");
          return;
        }

        printInstalledList(entries);

        if (isJson) printJson("list", entries);
      } catch (e) {
        spinner.fail(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
