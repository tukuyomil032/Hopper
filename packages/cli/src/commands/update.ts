import * as path from "node:path";
import type { Command } from "commander";
import ora from "ora";
import { printJson } from "../formatter/json-output.js";
import { updateAll, updatePlugin } from "../services/update.js";

export function registerUpdate(program: Command): void {
  program
    .command("update [plugin-name]")
    .description("Update one or all installed plugins")
    .option("--dry-run", "preview updates without applying")
    .option("--yes", "skip confirmation prompt")
    .option("--latest", "ignore manifest version range")
    .action(async (name: string | undefined, opts, cmd) => {
      const globalOpts = cmd.parent?.opts() as {
        cwd?: string;
        pluginsDir?: string;
        json?: boolean;
        silent?: boolean;
      };
      const cwd = globalOpts.cwd ?? process.cwd();
      const pluginsDir = globalOpts.pluginsDir ?? path.join(cwd, "plugins");
      const isJson = globalOpts.json ?? false;
      const spinner = ora({ isSilent: globalOpts.silent ?? false });

      const updateOpts = {
        cwd,
        pluginsDir,
        dryRun: opts.dryRun as boolean | undefined,
        latest: opts.latest as boolean | undefined,
      };

      try {
        spinner.start("Checking for updates...");

        if (name) {
          const result = await updatePlugin(name, updateOpts, (msg) => {
            spinner.text = msg;
          });

          if (result.skipped) {
            spinner.info(`${result.name}@${result.fromVersion} is already up-to-date`);
          } else if (opts.dryRun) {
            spinner.succeed(
              `[dry-run] Would update ${result.name} ${result.fromVersion} → ${result.toVersion}`,
            );
          } else {
            spinner.succeed(`Updated ${result.name} ${result.fromVersion} → ${result.toVersion}`);
          }

          if (isJson) printJson("update", result);
        } else {
          const results = await updateAll(updateOpts, (msg) => {
            spinner.text = msg;
          });

          if (results.length === 0) {
            spinner.info("No plugins installed.");
            return;
          }

          const updated = results.filter((r) => !r.skipped);
          const skipped = results.filter((r) => r.skipped);

          spinner.stop();

          for (const r of updated) {
            const prefix = opts.dryRun ? "[dry-run] " : "";
            console.log(`  ↑ ${r.name} ${r.fromVersion} → ${r.toVersion} ${prefix}`);
          }
          for (const r of skipped) {
            console.log(`  ✓ ${r.name}@${r.fromVersion} up-to-date`);
          }

          if (opts.dryRun) {
            console.log(`\n[dry-run] Would update ${updated.length} plugin(s)`);
          } else {
            console.log(
              `\nUpdated ${updated.length} plugin(s), ${skipped.length} already up-to-date`,
            );
          }

          if (isJson) printJson("update", results);
        }
      } catch (e) {
        spinner.fail(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
