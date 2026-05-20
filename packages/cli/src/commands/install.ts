import * as path from "node:path";
import type { Command } from "commander";
import ora from "ora";
import cliProgress from "cli-progress";
import chalk from "chalk";
import { installFromManifest, installPlugin } from "../services/install.js";

export function registerInstall(program: Command): void {
  program
    .command("install [plugins...]")
    .description("Install one or more plugins, or all plugins from hopper-plmanifest.json")
    .option("--force", "overwrite existing files")
    .option("--no-deps", "skip dependency resolution")
    .option("--dry-run", "preview actions without writing")
    .action(async (plugins: string[], opts, cmd) => {
      const globalOpts = cmd.parent?.opts() as {
        cwd?: string;
        pluginsDir?: string;
        json?: boolean;
        silent?: boolean;
      };
      const cwd = globalOpts.cwd ?? process.cwd();
      const pluginsDir = globalOpts.pluginsDir ?? path.join(cwd, "plugins");
      const isJson = globalOpts.json ?? false;
      const isSilent = globalOpts.silent ?? false;

      const installOpts = {
        cwd,
        pluginsDir,
        force: opts.force as boolean | undefined,
        dryRun: opts.dryRun as boolean | undefined,
        save: true,
        noDeps: !opts.deps as boolean | undefined,
      };

      try {
        if (plugins.length === 0) {
          const spinner = ora({ isSilent });
          spinner.start("Reading hopper-plmanifest.json...");
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
        } else if (plugins.length === 1) {
          const rawName = plugins[0]!;
          const atIdx = rawName.indexOf("@");
          const pluginName = atIdx > 0 ? rawName.slice(0, atIdx) : rawName;
          const version = atIdx > 0 ? rawName.slice(atIdx + 1) : undefined;

          const spinner = ora({ isSilent });
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
          // 複数プラグイン: cli-progress MultiBar で進捗表示
          const multibar = new cliProgress.MultiBar(
            {
              clearOnComplete: false,
              hideCursor: true,
              format: `  ${chalk.cyan("{bar}")} {percentage}% | {pluginName}`,
            },
            cliProgress.Presets.shades_grey,
          );

          const results: Array<{ name: string; version: string; skipped: boolean }> = [];
          const errors: Array<{ name: string; error: string }> = [];

          if (!isSilent) {
            console.log(chalk.bold(`Installing ${plugins.length} plugins...\n`));
          }

          for (const rawName of plugins) {
            const atIdx = rawName.indexOf("@");
            const pluginName = atIdx > 0 ? rawName.slice(0, atIdx) : rawName;
            const version = atIdx > 0 ? rawName.slice(atIdx + 1) : undefined;

            const bar = isSilent ? null : multibar.create(100, 0, { pluginName });

            try {
              const result = await installPlugin(pluginName, { ...installOpts, version }, (msg) => {
                if (bar) bar.update(50, { pluginName: msg });
              });
              if (bar) bar.update(100, { pluginName: `${result.name}@${result.version}` });
              results.push({ name: result.name, version: result.version, skipped: result.skipped });
            } catch (e) {
              if (bar) bar.update(100, { pluginName: `${pluginName} (failed)` });
              errors.push({ name: pluginName, error: e instanceof Error ? e.message : String(e) });
            }
          }

          multibar.stop();

          if (!isSilent) {
            const installed = results.filter((r) => !r.skipped);
            const skipped = results.filter((r) => r.skipped);
            console.log();
            if (installed.length > 0) {
              console.log(chalk.green(`✔ Installed ${installed.length} plugin(s):`));
              for (const r of installed) {
                console.log(`  ${chalk.cyan(r.name)}@${r.version}`);
              }
            }
            if (skipped.length > 0) {
              console.log(chalk.dim(`  ${skipped.length} already up-to-date`));
            }
            if (errors.length > 0) {
              console.log(chalk.red(`✖ Failed ${errors.length} plugin(s):`));
              for (const e of errors) {
                console.log(`  ${chalk.red(e.name)}: ${e.error}`);
              }
            }
          }

          if (isJson)
            process.stdout.write(
              JSON.stringify({ ok: errors.length === 0, results, errors }) + "\n",
            );
          if (errors.length > 0) process.exit(1);
        }
      } catch (e) {
        if (!isSilent) {
          console.error(chalk.red("✖") + " " + (e instanceof Error ? e.message : String(e)));
        }
        process.exit(1);
      }
    });
}
