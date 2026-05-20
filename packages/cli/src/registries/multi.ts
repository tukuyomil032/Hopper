import * as hangar from "./hangar.js";
import * as modrinth from "./modrinth.js";
import type {
  PluginDetail,
  PluginSummary,
  ResolveOptions,
  ResolvedPlugin,
  SearchOptions,
} from "./types.js";

export async function searchAll(
  query: string,
  options: SearchOptions = {},
): Promise<PluginSummary[]> {
  const [modrinthResults, hangarResults] = await Promise.allSettled([
    modrinth.search(query, options),
    hangar.search(query, options),
  ]);

  const results: PluginSummary[] = [];
  const seen = new Set<string>();

  if (modrinthResults.status === "fulfilled") {
    for (const plugin of modrinthResults.value) {
      results.push(plugin);
      seen.add(normalizeSlug(plugin.name));
    }
  }

  if (hangarResults.status === "fulfilled") {
    for (const plugin of hangarResults.value) {
      const key = normalizeSlug(plugin.name);
      if (!seen.has(key)) {
        results.push(plugin);
        seen.add(key);
      }
    }
  }

  return results;
}

export async function getDetail(name: string): Promise<PluginDetail | null> {
  const [modrinthResult, hangarResult] = await Promise.allSettled([
    modrinth.getProject(name),
    hangar.getProject(name),
  ]);

  if (modrinthResult.status === "fulfilled" && modrinthResult.value !== null) {
    return modrinthResult.value;
  }

  if (hangarResult.status === "fulfilled" && hangarResult.value !== null) {
    return hangarResult.value;
  }

  return null;
}

export async function resolve(
  name: string,
  options: ResolveOptions = {},
): Promise<ResolvedPlugin | null> {
  const modrinthResult = await modrinth.resolve(name, options);
  if (modrinthResult !== null) {
    return modrinthResult;
  }

  const hangarResult = await hangar.resolve(name, options);
  return hangarResult;
}

function normalizeSlug(name: string): string {
  return name.toLowerCase().replace(/[-_\s]/g, "");
}
