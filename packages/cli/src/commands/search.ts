import type { Command } from "commander";
import ora from "ora";
import * as multi from "../registries/multi.js";
import { printSearchResults } from "../formatter/human.js";
import { printJson } from "../formatter/json-output.js";

export function registerSearch(program: Command): void {
  program
    .command("search <query>")
    .description("Search for plugins across Modrinth and Hangar")
    .option("--limit <number>", "max results", "20")
    .option("--minecraft <version>", "filter by Minecraft version")
    .option("--platform <platform>", "filter by platform (paper, spigot…)")
    .action(async (query: string, opts, cmd) => {
      const globalOpts = cmd.parent?.opts() ?? {};
      const useJson = globalOpts.json as boolean | undefined;
      const limit = Number(opts.limit ?? 20);

      const spinner = ora(`Searching for "${query}"…`).start();
      try {
        const results = await multi.searchAll(query, {
          limit,
          minecraft: opts.minecraft as string | undefined,
          platform: opts.platform as string | undefined,
        });
        spinner.stop();

        if (useJson) {
          printJson("search", results);
        } else {
          printSearchResults(results);
        }
      } catch (err) {
        spinner.fail("Search failed");
        const msg = err instanceof Error ? err.message : String(err);
        console.error(msg);
        process.exit(1);
      }
    });
}
