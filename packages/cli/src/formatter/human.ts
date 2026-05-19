import chalk from "chalk";
import type { PluginDetail, PluginSummary, ResolvedPlugin } from "../registries/types.js";
import type { ListEntry } from "../services/list.js";

const SOURCE_BADGES = {
  modrinth: chalk.bgHex("#1bd96a").black(" modrinth "),
  hangar: chalk.bgHex("#f57c00").black(" hangar "),
} as const;

export function sourceBadge(source: "modrinth" | "hangar"): string {
  return SOURCE_BADGES[source];
}

export function printSearchResults(results: PluginSummary[]): void {
  if (results.length === 0) {
    console.log(chalk.yellow("⚠  No plugins found."));
    return;
  }

  console.log(chalk.bold(`Found ${results.length} plugin${results.length === 1 ? "" : "s"}:\n`));

  results.forEach((p, i) => {
    console.log(
      `${chalk.dim(`${i + 1}.`)} ${chalk.bold.white(p.displayName)} ${sourceBadge(p.source)}`,
    );
    console.log(`   ${chalk.dim("name:")} ${chalk.cyan(p.name)}`);
    console.log(`   ${chalk.dim("author:")} ${p.author}`);
    if (p.gameVersions.length > 0) {
      const mcVersions = p.gameVersions.slice(-3).join(", ");
      console.log(`   ${chalk.dim("mc:")} ${chalk.dim(mcVersions)}`);
    }
    if (p.description) {
      const desc = p.description.length > 80 ? `${p.description.slice(0, 77)}...` : p.description;
      console.log(`   ${chalk.dim(desc)}`);
    }
    console.log();
  });
}

export function printPluginDetail(detail: PluginDetail): void {
  console.log(`\n${chalk.bold.white(detail.displayName)} ${sourceBadge(detail.source)}`);
  console.log(`${chalk.dim("name:")}    ${chalk.cyan(detail.name)}`);
  console.log(`${chalk.dim("latest:")} ${chalk.green(detail.latestVersion)}`);
  console.log(`${chalk.dim("author:")} ${detail.author}`);

  if (detail.versions.length > 0) {
    const v = detail.versions[0]!;
    const platforms = v.platform.length > 0 ? v.platform.join(", ") : "unknown";
    const minecraft = v.minecraft.length > 0 ? v.minecraft.slice(0, 5).join(", ") : "unknown";
    console.log(`${chalk.dim("platforms:")} ${platforms}`);
    console.log(`${chalk.dim("minecraft:")} ${minecraft}`);
  }

  if (detail.homepage) {
    console.log(`${chalk.dim("homepage:")} ${chalk.underline(detail.homepage)}`);
  }

  if (detail.description) {
    console.log(`\n${detail.description}`);
  }

  if (detail.versions.length > 0) {
    console.log(`\n${chalk.bold("Versions:")}`);
    detail.versions.slice(0, 5).forEach((v) => {
      const mc = v.minecraft.slice(0, 3).join(", ");
      console.log(`  ${chalk.green(v.version)}  ${chalk.dim(mc)}`);
    });
    if (detail.versions.length > 5) {
      console.log(chalk.dim(`  ... and ${detail.versions.length - 5} more`));
    }
  }
  console.log();
}

export function printResolvedPlugins(plugins: ResolvedPlugin[]): void {
  plugins.forEach((p) => {
    console.log(
      `  ${chalk.green("↓")} ${chalk.bold(p.name)}${chalk.dim("@")}${chalk.green(p.version)} ${sourceBadge(p.source)}`,
    );
  });
}

export function printInstalledList(entries: ListEntry[]): void {
  const nameW = Math.max(4, ...entries.map((e) => e.name.length));
  const verW = Math.max(7, ...entries.map((e) => e.version.length));
  const srcW = Math.max(6, ...entries.map((e) => (e.source ?? "-").length));

  const header = [
    chalk.bold("NAME".padEnd(nameW)),
    chalk.bold("VERSION".padEnd(verW)),
    chalk.bold("SOURCE".padEnd(srcW)),
    chalk.bold("STATUS"),
  ].join("  ");
  console.log(header);
  console.log(chalk.dim("-".repeat(nameW + verW + srcW + 20)));

  for (const e of entries) {
    let status: string;
    if (e.upToDate === undefined) {
      status = chalk.dim("-");
    } else if (e.upToDate) {
      status = chalk.green("✓ up-to-date");
    } else {
      status = chalk.yellow(`↑ ${e.latestVersion ?? "?"} available`);
    }

    console.log(
      [
        e.name.padEnd(nameW),
        chalk.cyan(e.version.padEnd(verW)),
        chalk.dim((e.source ?? "-").padEnd(srcW)),
        status,
      ].join("  "),
    );
  }
  console.log();
}

export function success(msg: string): void {
  console.log(`${chalk.green("✓")} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${chalk.yellow("⚠")} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${chalk.red("✗")} ${chalk.red(msg)}`);
}

export function info(msg: string): void {
  console.log(`${chalk.cyan("ℹ")} ${msg}`);
}

export function dim(msg: string): void {
  console.log(chalk.dim(msg));
}
