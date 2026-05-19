import * as path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { Command } from "commander";
import ora from "ora";
import { printJson } from "../formatter/json-output.js";
import { removePlugin } from "../services/remove.js";

export function registerRemove(program: Command): void {
  program
    .command("remove <plugin-name>")
    .description("Remove an installed plugin")
    .option("--force", "skip dependency checks")
    .option("--yes", "skip confirmation prompt")
    .option("--dry-run", "preview removal without applying")
    .action(async (name: string, opts, cmd) => {
      const globalOpts = cmd.parent?.opts() as {
        cwd?: string;
        pluginsDir?: string;
        json?: boolean;
        silent?: boolean;
        yes?: boolean;
      };
      const cwd = globalOpts.cwd ?? process.cwd();
      const pluginsDir = globalOpts.pluginsDir ?? path.join(cwd, "plugins");
      const isJson = globalOpts.json ?? false;
      const skipConfirm = (opts.yes as boolean | undefined) ?? globalOpts.yes ?? false;
      const spinner = ora({ isSilent: globalOpts.silent ?? false });

      if (!skipConfirm && !(opts.dryRun as boolean | undefined)) {
        const rl = createInterface({ input, output });
        const answer = await rl.question(`Remove plugin "${name}"? (y/N) `);
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Aborted.");
          return;
        }
      }

      try {
        spinner.start(`Removing ${name}...`);
        const result = await removePlugin(
          name,
          {
            cwd,
            pluginsDir,
            force: opts.force as boolean | undefined,
            dryRun: opts.dryRun as boolean | undefined,
          },
          (msg) => {
            spinner.text = msg;
          },
        );

        if (opts.dryRun as boolean | undefined) {
          spinner.succeed(`[dry-run] Would remove ${result.name}@${result.version}`);
        } else {
          spinner.succeed(`Removed ${result.name}@${result.version}`);
        }

        if (isJson) printJson("remove", result);
      } catch (e) {
        spinner.fail(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
