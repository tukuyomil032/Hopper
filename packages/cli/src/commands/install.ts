import type { Command } from "commander";
import { warn } from "../formatter/human.js";

export function registerInstall(program: Command): void {
  program
    .command("install [plugin-name]")
    .description("Install a plugin or all plugins from hopper-plugin.json")
    .option("--force", "overwrite existing files")
    .option("--no-deps", "skip dependency resolution")
    .option("--dry-run", "preview actions without writing")
    .action(async (_name: string | undefined, _opts) => {
      warn("install command — coming soon");
    });
}
