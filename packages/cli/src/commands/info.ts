import type { Command } from "commander";
import ora from "ora";
import * as multi from "../registries/multi.js";
import { printPluginDetail, error } from "../formatter/human.js";
import { printJson, printJsonError } from "../formatter/json-output.js";

export function registerInfo(program: Command): void {
  program
    .command("info <plugin-name>")
    .description("Show detailed information about a plugin")
    .action(async (name: string, _opts, cmd) => {
      const globalOpts = cmd.parent?.opts() ?? {};
      const useJson = globalOpts.json as boolean | undefined;

      const spinner = ora(`Fetching info for "${name}"…`).start();
      try {
        const detail = await multi.getDetail(name);
        spinner.stop();

        if (!detail) {
          if (useJson) {
            printJsonError("info", "PLUGIN_NOT_FOUND", `Plugin '${name}' was not found.`);
          } else {
            error(`Plugin '${name}' was not found.`);
          }
          process.exit(1);
        }

        if (useJson) {
          printJson("info", detail);
        } else {
          printPluginDetail(detail);
        }
      } catch (err) {
        spinner.fail("Failed to fetch plugin info");
        const msg = err instanceof Error ? err.message : String(err);
        console.error(msg);
        process.exit(1);
      }
    });
}
