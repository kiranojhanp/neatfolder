export type GroupingMethod = "extension" | "name" | "date" | "size";

export interface OrganizationOptions {
  method: GroupingMethod;
  ignoreDotfiles: boolean;
  recursive: boolean;
  dryRun: boolean;
  maxDepth: number;
  minSize: number;
  maxSize: number;
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

// tree
export interface TreeSymbols {
  BRANCH: string;
  EMPTY: string;
  INDENT: string;
  LAST_BRANCH: string;
  VERTICAL: string;
}

export type DirectoryMap = Map<string, Set<string>>;
export type TreeNode = Map<string, TreeNode | null>;

// arg parser
export interface ParsedArgs {
  directory: string;
  method: "extension" | "name" | "date" | "size";
  recursive: boolean;
  maxDepth: number;
  minSize: number;
  maxSize: number;
  ignoreDotfiles: boolean;
  dryRun: boolean;
  verbose: boolean;
  [key: string]: any;
}
