import type {
  PluginDetail,
  PluginDependency,
  PluginSummary,
  PluginVersion,
  ResolveOptions,
  ResolvedPlugin,
  SearchOptions,
} from "./types.js";

const BASE_URL = "https://hangar.papermc.io/api/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "hopper-cli/0.1.0 (github.com/hopper-cli)" },
  });
  if (!res.ok) {
    throw new Error(`Hangar API error ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

interface HangarProject {
  name: string;
  namespace: { owner: string; slug: string };
  description: string;
  stats: { downloads: number; recentDownloads: number };
  category: string;
  lastUpdated: string;
}

interface HangarSearchResult {
  result: HangarProject[];
  pagination: { limit: number; offset: number; count: number };
}

interface HangarVersionFile {
  downloadUrl: string;
  fileName: string;
  externalUrl?: string;
}

interface HangarPlatformDependency {
  version?: string;
}

interface HangarVersion {
  name: string;
  description: string;
  platformDependencies: {
    PAPER?: HangarPlatformDependency[];
    WATERFALL?: HangarPlatformDependency[];
    VELOCITY?: HangarPlatformDependency[];
  };
  downloads: {
    PAPER?: HangarVersionFile;
    WATERFALL?: HangarVersionFile;
    VELOCITY?: HangarVersionFile;
  };
  pluginDependencies: {
    PAPER?: Array<{
      name: string;
      required: boolean;
      externalUrl?: string;
      namespace?: { owner: string; slug: string };
    }>;
  };
}

interface HangarVersionList {
  result: HangarVersion[];
  pagination: { limit: number; offset: number; count: number };
}

function mapPlatforms(downloads: HangarVersion["downloads"]): string[] {
  return Object.keys(downloads)
    .filter((p) => downloads[p as keyof typeof downloads] !== undefined)
    .map((p) => p.toLowerCase());
}

function mapMinecraftVersions(version: HangarVersion): string[] {
  const deps = version.platformDependencies;
  const paperVersions = (deps.PAPER ?? []).map((d) => d.version ?? "").filter(Boolean);
  return paperVersions;
}

function mapDependencies(version: HangarVersion): PluginDependency[] {
  const paperDeps = version.pluginDependencies.PAPER ?? [];
  return paperDeps.map((dep) => ({
    name: dep.namespace?.slug ?? dep.name,
    range: "*",
    optional: !dep.required,
  }));
}

function mapVersion(v: HangarVersion): PluginVersion {
  const paperDownload = v.downloads.PAPER;
  const anyDownload = paperDownload ?? v.downloads.WATERFALL ?? v.downloads.VELOCITY;

  return {
    version: v.name,
    minecraft: mapMinecraftVersions(v),
    platform: mapPlatforms(v.downloads),
    downloadUrl: anyDownload?.downloadUrl ?? anyDownload?.externalUrl ?? "",
    fileName: anyDownload?.fileName ?? `plugin-${v.name}.jar`,
    dependencies: mapDependencies(v),
  };
}

export async function search(query: string, options: SearchOptions = {}): Promise<PluginSummary[]> {
  const limit = options.limit ?? 20;
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: "0",
  });

  let data: HangarSearchResult;
  try {
    data = await fetchJson<HangarSearchResult>(`${BASE_URL}/projects?${params}`);
  } catch {
    return [];
  }

  return data.result.map((p) => ({
    name: p.namespace.slug,
    displayName: p.name,
    description: p.description,
    author: p.namespace.owner,
    latestVersion: "unknown",
    source: "hangar" as const,
    slug: p.namespace.slug,
  }));
}

export async function getProject(slug: string): Promise<PluginDetail | null> {
  let project: HangarProject & { owner?: string };
  try {
    const parts = slug.split("/");
    const resolvedSlug = parts.length === 2 ? parts.join("/") : `_/${slug}`;
    project = await fetchJson<HangarProject & { owner?: string }>(
      `${BASE_URL}/projects/${encodeURIComponent(resolvedSlug)}`,
    );
  } catch {
    return null;
  }

  const versions = await getVersions(slug);
  const latestVersion = versions[0]?.version ?? "unknown";

  return {
    name: project.namespace?.slug ?? slug,
    displayName: project.name,
    description: project.description,
    author: project.namespace?.owner ?? "",
    latestVersion,
    source: "hangar" as const,
    slug: project.namespace?.slug ?? slug,
    versions,
    homepage: `https://hangar.papermc.io/${project.namespace?.owner ?? ""}/${project.namespace?.slug ?? slug}`,
  };
}

export async function getVersions(
  slug: string,
  options: { minecraft?: string; platform?: string } = {},
): Promise<PluginVersion[]> {
  const params = new URLSearchParams({ limit: "10", offset: "0" });
  if (options.platform) {
    params.set("platform", options.platform.toUpperCase());
  }

  const parts = slug.split("/");
  const resolvedSlug = parts.length === 2 ? parts.join("/") : `_/${slug}`;

  let data: HangarVersionList;
  try {
    data = await fetchJson<HangarVersionList>(
      `${BASE_URL}/projects/${encodeURIComponent(resolvedSlug)}/versions?${params}`,
    );
  } catch {
    return [];
  }

  return data.result.map(mapVersion);
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
    source: "hangar" as const,
  };
}
