export type RegistrySource = "modrinth" | "hangar";

export interface PluginSummary {
  name: string;
  displayName: string;
  description: string;
  author: string;
  latestVersion: string;
  gameVersions: string[];
  source: RegistrySource;
  slug: string;
}

export interface PluginDependency {
  name: string;
  range: string;
  optional?: boolean;
}

export interface PluginVersion {
  version: string;
  minecraft: string[];
  platform: string[];
  downloadUrl: string;
  fileName: string;
  dependencies: PluginDependency[];
}

export interface PluginDetail extends PluginSummary {
  versions: PluginVersion[];
  homepage?: string;
}

export interface ResolvedPlugin {
  name: string;
  version: string;
  downloadUrl: string;
  fileName: string;
  dependencies: PluginDependency[];
  source: RegistrySource;
}

export interface SearchOptions {
  limit?: number;
  platform?: string;
  minecraft?: string;
}

export interface ResolveOptions {
  version?: string;
  platform?: string;
  minecraft?: string;
}
