import type { Command } from "commander";
import { warn } from "../formatter/human.js";

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Diagnose the current hopper environment")
    .action(async (_opts) => {
      warn("doctor command — coming soon");
    });
}
