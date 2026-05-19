import type {
  PluginDetail,
  PluginDependency,
  PluginSummary,
  PluginVersion,
  ResolveOptions,
  ResolvedPlugin,
  SearchOptions,
} from "./types.js";

const BASE_URL = "https://api.modrinth.com/v2";

const PLUGIN_LOADERS = ["bukkit", "spigot", "paper", "purpur", "folia"];

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "hopper-cli/0.1.0 (github.com/hopper-cli)" },
  });
  if (!res.ok) {
    throw new Error(`Modrinth API error ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  latest_version: string;
  versions: string[];
  categories: string[];
  display_categories: string[];
}

interface ModrinthSearchResult {
  hits: ModrinthSearchHit[];
  total_hits: number;
}

interface ModrinthVersion {
  id: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  files: Array<{ filename: string; url: string; primary: boolean }>;
  dependencies: Array<{
    project_id: string | null;
    dependency_type: string;
    version_id?: string;
  }>;
}

interface ModrinthProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  team: string;
  body: string;
  source_url?: string;
}

function mapLoadersToPlatforms(loaders: string[]): string[] {
  return loaders.filter((l) => PLUGIN_LOADERS.includes(l));
}

function mapDependencies(deps: ModrinthVersion["dependencies"]): PluginDependency[] {
  return deps
    .filter((d) => d.project_id && d.dependency_type === "required")
    .map((d) => ({
      name: d.project_id!,
      range: "*",
      optional: d.dependency_type === "optional",
    }));
}

function mapVersion(v: ModrinthVersion): PluginVersion {
  const primary = v.files.find((f) => f.primary) ?? v.files[0];
  return {
    version: v.version_number,
    minecraft: v.game_versions,
    platform: mapLoadersToPlatforms(v.loaders),
    downloadUrl: primary?.url ?? "",
    fileName: primary?.filename ?? `plugin-${v.version_number}.jar`,
    dependencies: mapDependencies(v.dependencies),
  };
}

export async function search(query: string, options: SearchOptions = {}): Promise<PluginSummary[]> {
  const limit = options.limit ?? 20;
  const facets: string[][] = [["project_type:plugin"]];
  if (options.platform) {
    facets.push([`categories:${options.platform}`]);
  }
  if (options.minecraft) {
    facets.push([`versions:${options.minecraft}`]);
  }

  const params = new URLSearchParams({
    query,
    limit: String(limit),
    facets: JSON.stringify(facets),
  });

  const data = await fetchJson<ModrinthSearchResult>(`${BASE_URL}/search?${params}`);

  return data.hits.map((h) => ({
    name: h.slug,
    displayName: h.title,
    description: h.description,
    author: h.author,
    latestVersion: h.latest_version ?? "unknown",
    source: "modrinth" as const,
    slug: h.slug,
  }));
}

export async function getProject(slug: string): Promise<PluginDetail | null> {
  let project: ModrinthProject;
  try {
    project = await fetchJson<ModrinthProject>(`${BASE_URL}/project/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }

  const versions = await getVersions(slug);

  const latestVersion = versions[0]?.version ?? "unknown";

  return {
    name: project.slug,
    displayName: project.title,
    description: project.description,
    author: project.team,
    latestVersion,
    source: "modrinth" as const,
    slug: project.slug,
    versions,
    homepage: project.source_url,
  };
}

export async function getVersions(
  slug: string,
  options: { minecraft?: string; platform?: string } = {},
): Promise<PluginVersion[]> {
  const params = new URLSearchParams();
  if (options.platform) {
    params.set("loaders", JSON.stringify([options.platform]));
  }
  if (options.minecraft) {
    params.set("game_versions", JSON.stringify([options.minecraft]));
  }

  const query = params.toString() ? `?${params}` : "";
  let versions: ModrinthVersion[];
  try {
    versions = await fetchJson<ModrinthVersion[]>(
      `${BASE_URL}/project/${encodeURIComponent(slug)}/version${query}`,
    );
  } catch {
    return [];
  }

  return versions.map(mapVersion);
}

export async function resolve(
  slug: string,
  options: ResolveOptions = {},
): Promise<ResolvedPlugin | null> {
  const versions = await getVersions(slug, options);
  if (versions.length === 0) return null;

  const target = options.version
    ? (versions.find((v) => v.version === options.version) ?? versions[0])
    : versions[0];

  return {
    name: slug,
    version: target.version,
    downloadUrl: target.downloadUrl,
    fileName: target.fileName,
    dependencies: target.dependencies,
    source: "modrinth" as const,
  };
}
