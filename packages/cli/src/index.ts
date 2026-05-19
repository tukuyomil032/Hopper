#!/usr/bin/env node
import { Command } from "commander";
import { registerSearch } from "./commands/search.js";
import { registerInfo } from "./commands/info.js";
import { registerInstall } from "./commands/install.js";
import { registerList } from "./commands/list.js";
import { registerRemove } from "./commands/remove.js";
import { registerUpdate } from "./commands/update.js";
import { registerInit } from "./commands/init.js";
import { registerDoctor } from "./commands/doctor.js";

const program = new Command();

program
  .name("hopper")
  .description("Minecraft plugin manager — the npm for your server")
  .version("0.1.0")
  .option("--cwd <path>", "working directory", process.cwd())
  .option("--plugins-dir <path>", "plugins folder path")
  .option("--registry-url <url>", "override registry API URL")
  .option("--json", "output as JSON")
  .option("--silent", "suppress output")
  .option("--verbose", "verbose logging")
  .option("--yes", "skip confirmation prompts");

registerSearch(program);
registerInfo(program);
registerInstall(program);
registerList(program);
registerRemove(program);
registerUpdate(program);
registerInit(program);
registerDoctor(program);

program.parse();
