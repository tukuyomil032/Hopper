import type { Command } from "commander";
import { warn } from "../formatter/human.js";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create a new hopper-plugin.json in the current directory")
    .action(async (_opts) => {
      warn("init command — coming soon");
    });
}
