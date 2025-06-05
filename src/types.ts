export type GroupingMethod = "extension" | "name" | "date" | "size";

export interface OrganizationOptions {
  method: GroupingMethod;
  ignoreDotfiles: boolean;
  recursive: boolean;
  dryRun: boolean;
  maxDepth?: number;
  minSize?: number;
  maxSize?: number;
  verbose: boolean;
}

export interface FileMapping {
  sourcePath: string;
  targetPath: string;
  size: number;
  modifiedTime: Date;
}

export interface OrganizationStats {
  filesProcessed: number;
  bytesMoved: number;
  errors: string[];
  skipped: string[];
  created: Set<string>;
}

export type DirectoryMap = Map<string, Set<string>>;
