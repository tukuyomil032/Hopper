import type { Command } from "commander";
import { warn } from "../formatter/human.js";

export function registerList(program: Command): void {
  program
    .command("list")
    .description("List installed plugins")
    .action(async (_opts) => {
      warn("list command — coming soon");
    });
}
