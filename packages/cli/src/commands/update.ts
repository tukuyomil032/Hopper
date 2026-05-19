import type { Command } from "commander";
import { warn } from "../formatter/human.js";

export function registerUpdate(program: Command): void {
  program
    .command("update [plugin-name]")
    .description("Update one or all installed plugins")
    .option("--dry-run", "preview updates without applying")
    .option("--yes", "skip confirmation prompt")
    .option("--latest", "ignore manifest version range")
    .action(async (_name: string | undefined, _opts) => {
      warn("update command — coming soon");
    });
}
