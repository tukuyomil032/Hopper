import * as path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { Command } from "commander";
import chalk from "chalk";
import { printJson } from "../formatter/json-output.js";
import { readManifest, writeManifest, MANIFEST_FILENAME } from "../fs/manifest.js";
import type { Manifest } from "../fs/manifest.js";
import { UserError } from "../services/errors.js";

const PLATFORMS = ["paper", "spigot", "folia"] as const;
type Platform = (typeof PLATFORMS)[number];

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create a new hopper-plugin.json in the current directory")
    .action(async (_opts, cmd) => {
      const globalOpts = cmd.parent?.opts() as {
        cwd?: string;
        json?: boolean;
        silent?: boolean;
        yes?: boolean;
      };
      const cwd = globalOpts.cwd ?? process.cwd();
      const isJson = globalOpts.json ?? false;
      const skipConfirm = globalOpts.yes ?? false;
      const manifestPath = path.join(cwd, MANIFEST_FILENAME);

      try {
        const existing = await readManifest(cwd);

        if (existing !== null && !skipConfirm) {
          const rl = createInterface({ input, output });
          const answer = await rl.question(
            `${MANIFEST_FILENAME} already exists. Overwrite? (y/N) `,
          );
          rl.close();
          if (answer.toLowerCase() !== "y") {
            console.log("Aborted.");
            return;
          }
        }

        const defaultName = path.basename(cwd);
        let name = defaultName;
        let platform: Platform = "paper";
        let minecraftVersion = "1.21.4";

        if (!skipConfirm) {
          const rl = createInterface({ input, output });

          const rawName = await rl.question(`? Project name (${defaultName}): `);
          name = rawName.trim() || defaultName;

          const platformList = PLATFORMS.join("/");
          const rawPlatform = await rl.question(`? Server platform (${platformList}) [paper]: `);
          const platformInput = rawPlatform.trim() || "paper";
          if (!(PLATFORMS as readonly string[]).includes(platformInput)) {
            rl.close();
            throw new UserError(
              `Invalid platform "${platformInput}". Choose from: ${platformList}`,
            );
          }
          platform = platformInput as Platform;

          const rawVersion = await rl.question(`? Minecraft version [1.21.4]: `);
          minecraftVersion = rawVersion.trim() || "1.21.4";

          rl.close();
        }

        const manifest: Manifest = {
          name,
          server: { platform, minecraftVersion },
          plugins: {},
        };

        await writeManifest(cwd, manifest);

        if (isJson) {
          printJson("init", { path: manifestPath, manifest });
        } else {
          console.log(chalk.green("✔") + ` Created ${MANIFEST_FILENAME}`);
        }
      } catch (e) {
        if (e instanceof UserError) {
          console.error(chalk.red("✖") + " " + e.message);
          process.exit(1);
        }
        throw e;
      }
    });
}
