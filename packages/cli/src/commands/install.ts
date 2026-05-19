import * as path from "node:path";
import type { Command } from "commander";
import ora from "ora";
import { installFromManifest, installPlugin } from "../services/install.js";

export function registerInstall(program: Command): void {
  program
    .command("install [plugin-name]")
    .description("Install a plugin or all plugins from hopper-plugin.json")
    .option("--save", "add plugin to hopper-plugin.json")
    .option("--force", "overwrite existing files")
    .option("--no-deps", "skip dependency resolution")
    .option("--dry-run", "preview actions without writing")
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

      const installOpts = {
        cwd,
        pluginsDir,
        force: opts.force as boolean | undefined,
        dryRun: opts.dryRun as boolean | undefined,
        save: opts.save as boolean | undefined,
        noDeps: !opts.deps as boolean | undefined,
      };

      try {
        if (name) {
          const atIdx = name.indexOf("@");
          const pluginName = atIdx > 0 ? name.slice(0, atIdx) : name;
          const version = atIdx > 0 ? name.slice(atIdx + 1) : undefined;

          spinner.start(`Resolving ${pluginName}...`);
          const result = await installPlugin(pluginName, { ...installOpts, version }, (msg) => {
            spinner.text = msg;
          });

          if (result.skipped) {
            spinner.info(
              `${result.name}@${result.version} already installed (use --force to overwrite)`,
            );
          } else if (installOpts.dryRun) {
            spinner.succeed(`[dry-run] Would install ${result.name}@${result.version}`);
          } else {
            spinner.succeed(`Installed ${result.name}@${result.version}`);
          }

          if (isJson) process.stdout.write(JSON.stringify({ ok: true, result }) + "\n");
        } else {
          spinner.start("Reading hopper-plugin.json...");
          const results = await installFromManifest(installOpts, (msg) => {
            spinner.text = msg;
          });

          const installed = results.filter((r) => !r.skipped);
          const skipped = results.filter((r) => r.skipped);

          if (installOpts.dryRun) {
            spinner.succeed(`[dry-run] Would install ${results.length} plugin(s)`);
          } else {
            spinner.succeed(
              `Done. ${installed.length} installed, ${skipped.length} already up-to-date.`,
            );
          }

          if (isJson) process.stdout.write(JSON.stringify({ ok: true, results }) + "\n");
        }
      } catch (e) {
        spinner.fail(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
