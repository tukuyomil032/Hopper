import * as path from "node:path";
import type { Command } from "commander";
import * as clack from "@clack/prompts";
import chalk from "chalk";
import { printJson } from "../formatter/json-output.js";
import { readManifest, writeManifest, MANIFEST_FILENAME } from "../fs/manifest.js";
import type { Manifest } from "../fs/manifest.js";
import { UserError } from "../services/errors.js";

const PLATFORMS = ["paper", "spigot", "folia"] as const;
type Platform = (typeof PLATFORMS)[number];

async function fetchReleaseVersions(): Promise<string[]> {
  const res = await fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");
  if (!res.ok) throw new Error(`pistonmeta returned ${res.status}`);
  const data = (await res.json()) as { versions: Array<{ id: string; type: string }> };
  return data.versions.filter((v) => v.type === "release").map((v) => v.id);
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create a new hopper-plmanifest.json in the current directory")
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

        let mcVersions: string[] = [];
        try {
          mcVersions = await fetchReleaseVersions();
        } catch {
          // ネットワークエラー時はバリデーションなしで続行
        }

        const defaultName = path.basename(cwd);
        let name = defaultName;
        let platform: Platform = "paper";
        let minecraftVersion = mcVersions[0] ?? "1.21.4";

        if (!skipConfirm) {
          clack.intro(chalk.bold("hopper init") + " — プロジェクトを初期化します");

          if (existing !== null) {
            const overwrite = await clack.confirm({
              message: `${MANIFEST_FILENAME} は既に存在します。上書きしますか？`,
              initialValue: false,
            });
            if (clack.isCancel(overwrite) || !overwrite) {
              clack.cancel("中断しました。");
              return;
            }
          }

          const rawName = await clack.text({
            message: "プロジェクト名",
            placeholder: defaultName,
            defaultValue: defaultName,
          });
          if (clack.isCancel(rawName)) {
            clack.cancel("中断しました。");
            return;
          }
          name = rawName || defaultName;

          const rawPlatform = await clack.select({
            message: "サーバープラットフォーム",
            options: PLATFORMS.map((p) => ({ value: p, label: p })),
            initialValue: "paper" as Platform,
          });
          if (clack.isCancel(rawPlatform)) {
            clack.cancel("中断しました。");
            return;
          }
          platform = rawPlatform;

          const rawVersion = await clack.text({
            message: "Minecraft バージョン",
            placeholder: minecraftVersion,
            defaultValue: minecraftVersion,
            validate(value) {
              const v = value || minecraftVersion;
              if (mcVersions.length > 0 && !mcVersions.includes(v)) {
                return `"${v}" は有効なリリースバージョンではありません（例: ${mcVersions.slice(0, 3).join(", ")} ...）`;
              }
            },
          });
          if (clack.isCancel(rawVersion)) {
            clack.cancel("中断しました。");
            return;
          }
          minecraftVersion = rawVersion || minecraftVersion;

          const manifest: Manifest = {
            name,
            server: { platform, minecraftVersion },
            plugins: {},
          };

          await writeManifest(cwd, manifest);

          clack.outro(chalk.green("✔") + ` Created ${MANIFEST_FILENAME}`);

          if (isJson) {
            printJson("init", { path: manifestPath, manifest });
          }
        } else {
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
