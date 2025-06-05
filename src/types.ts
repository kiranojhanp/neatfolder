export type GroupingMethod = "extension" | "name" | "date" | "size";

// Tree-related types
export interface TreeSymbols {
  BRANCH: string;
  LAST_BRANCH: string;
  VERTICAL: string;
  INDENT: string;
}

export type TreeNode = Map<string, TreeNode | null>;

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

// Database-related types
export interface OrganizationHistoryRecord {
  id: number;
  timestamp: number;
  directory: string;
  method: GroupingMethod;
  filesProcessed: number;
  bytesMoved: number;
  duration: number;
  beforeStructure: string; // JSON stringified DirectoryMap
  afterStructure: string; // JSON stringified DirectoryMap
  fileMappings: string; // JSON stringified FileMapping[]
  errors: string; // JSON stringified string[]
  skipped: string; // JSON stringified string[]
  isReversed: boolean; // true if this is an undo operation
  originalOperationId?: number; // reference to original operation if this is undo/redo
}

export interface FileOperation {
  id?: number;
  operationId: number;
  sourcePath: string;
  targetPath: string;
  size: number;
  modifiedTime: number;
  operation: "move" | "undo_move";
  executedAt: number;
}

export interface DatabaseStats {
  totalOperations: number;
  totalFilesProcessed: number;
  totalBytesProcessed: number;
  lastOperation: Date | null;
  availableUndos: number;
  availableRedos: number;
}
