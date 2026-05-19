import type { Command } from "commander";
import { warn } from "../formatter/human.js";

export function registerRemove(program: Command): void {
  program
    .command("remove <plugin-name>")
    .description("Remove an installed plugin")
    .option("--force", "skip dependency checks")
    .option("--yes", "skip confirmation prompt")
    .action(async (_name: string, _opts) => {
      warn("remove command — coming soon");
    });
}
