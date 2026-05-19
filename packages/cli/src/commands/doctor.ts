import * as path from "node:path";
import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { printJson } from "../formatter/json-output.js";
import { readManifest, MANIFEST_FILENAME } from "../fs/manifest.js";
import { readLock, LOCK_FILENAME } from "../fs/lock.js";

type CheckResult = {
  label: string;
  ok: boolean;
  detail?: string;
};

function detectJava(): string | null {
  const result = spawnSync("java", ["-version"], { encoding: "utf8" });
  if (result.error || result.status !== 0) return null;
  const raw = result.stderr;
  const m = raw.match(/version "([^"]+)"/);
  return m ? m[1] : null;
}

async function checkApi(url: string): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const ms = Date.now() - start;
    return { ok: res.ok || res.status < 500, ms };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Diagnose the current hopper environment")
    .action(async (_opts, cmd) => {
      const globalOpts = cmd.parent?.opts() as {
        cwd?: string;
        pluginsDir?: string;
        json?: boolean;
        silent?: boolean;
      };
      const cwd = globalOpts.cwd ?? process.cwd();
      const pluginsDir = globalOpts.pluginsDir ?? path.join(cwd, "plugins");
      const isJson = globalOpts.json ?? false;
      const spinner = ora({ isSilent: (globalOpts.silent ?? false) || isJson });

      spinner.start("Running diagnostics…");

      const checks: CheckResult[] = [];

      // Node.js
      checks.push({ label: `Node.js ${process.version}`, ok: true });

      // Java
      const javaVersion = detectJava();
      checks.push(
        javaVersion !== null
          ? { label: `Java ${javaVersion}`, ok: true }
          : { label: "Java not found", ok: false, detail: "Install Java and ensure it is in PATH" },
      );

      // plugins/ directory
      try {
        await access(pluginsDir);
        checks.push({ label: `plugins/ directory found`, ok: true, detail: pluginsDir });
      } catch {
        checks.push({
          label: "plugins/ directory not found",
          ok: false,
          detail: pluginsDir,
        });
      }

      // Modrinth API
      const modrinth = await checkApi("https://api.modrinth.com/v2/");
      checks.push(
        modrinth.ok
          ? { label: `Modrinth API reachable (${modrinth.ms}ms)`, ok: true }
          : { label: "Modrinth API unreachable", ok: false },
      );

      // Hangar API
      const hangar = await checkApi("https://hangar.papermc.io/api/v1/");
      checks.push(
        hangar.ok
          ? { label: `Hangar API reachable (${hangar.ms}ms)`, ok: true }
          : { label: "Hangar API unreachable", ok: false },
      );

      // hopper-plugin.json
      try {
        const manifest = await readManifest(cwd);
        checks.push(
          manifest !== null
            ? { label: `${MANIFEST_FILENAME} found`, ok: true }
            : { label: `${MANIFEST_FILENAME} not found`, ok: false },
        );
      } catch {
        checks.push({ label: `${MANIFEST_FILENAME} invalid`, ok: false });
      }

      // hopper-plugin-lock.json
      try {
        const lock = await readLock(cwd);
        checks.push(
          lock !== null
            ? { label: `${LOCK_FILENAME} found`, ok: true }
            : { label: `${LOCK_FILENAME} not found`, ok: false },
        );
      } catch {
        checks.push({ label: `${LOCK_FILENAME} invalid`, ok: false });
      }

      spinner.stop();

      const passed = checks.filter((c) => c.ok).length;
      const total = checks.length;

      if (isJson) {
        printJson("doctor", { checks, passed, total });
        return;
      }

      for (const check of checks) {
        const icon = check.ok ? chalk.green("✔") : chalk.red("✖");
        const label = check.ok ? check.label : chalk.red(check.label);
        const detail = check.detail ? chalk.dim(` (${check.detail})`) : "";
        console.log(`${icon} ${label}${detail}`);
      }

      console.log(chalk.dim("━".repeat(32)));

      if (passed === total) {
        console.log(chalk.green(`✅ All checks passed (${passed}/${total})`));
      } else {
        const failed = total - passed;
        console.log(
          chalk.yellow(
            `⚠ ${failed} check${failed > 1 ? "s" : ""} failed (${passed}/${total} passed)`,
          ),
        );
      }
    });
}
