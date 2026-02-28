import { basename, dirname, join, relative, resolve, sep } from "path";
import { Glob } from "bun";
import { mkdir, rename, stat } from "fs/promises";
import { DatabaseLogger } from "./database-logger";
import { TreeService } from "./services/tree";
import { ProgressService } from "./services/progress";
import { colors } from "./utils/colors";
import {
  getCategoryFromFile,
  getTargetDirectory,
} from "./utils/file-utils";

import type {
  FileMapping,
  OrganizationOptions,
  OrganizationStats,
  DirectoryMap,
  GroupingMethod,
} from "./types";

/**
 * NeatFolder organizes files according to specified options
 */
export class NeatFolder {
  private readonly stats: OrganizationStats = {
    filesProcessed: 0,
    bytesMoved: 0,
    errors: [],
    skipped: [],
    created: new Set<string>(),
  };

  private readonly dbLogger: DatabaseLogger;
  private readonly progressService: ProgressService;

  /**
   * Creates a new NeatFolder instance
   * @param options Organization options
   * @param dbPath Optional path to the database file
   */
  constructor(private readonly options: OrganizationOptions, dbPath?: string) {
    this.dbLogger = new DatabaseLogger(dbPath);
    this.progressService = new ProgressService();
  }

  // For backward compatibility with tests
  private getCategoryFromFile(filename: string): string {
    return getCategoryFromFile(filename);
  }

  // For backward compatibility with tests
  private getTargetDirectory(
    file: string,
    stats: { size: number; mtime: Date }
  ): string {
    return getTargetDirectory(file, stats, this.options.method);
  }

  // For backward compatibility with tests
  private drawProgressBar(progress: number): string {
    return this.progressService.drawProgressBar(progress);
  }

  // Remove redundant methods - we'll use the utilities from file-utils.ts instead

  /**
   * Process a single file to determine if and where it should be moved
   * @param filePath Path of the file to process
   * @param basePath Base directory path
   * @returns File mapping information or null if the file should be skipped
   */
  private async processFile(
    filePath: string,
    basePath: string
  ): Promise<FileMapping | null> {
    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) return null;

      const size = fileStats.size;
      const fileName = basename(filePath);

      // Apply size filters
      if (this.options.minSize && size < this.options.minSize) {
        this.stats.skipped.push(`Size too small: ${filePath}`);
        return null;
      }

      if (this.options.maxSize && size > this.options.maxSize) {
        this.stats.skipped.push(`Size too large: ${filePath}`);
        return null;
      }

      // Apply dotfile filter
      if (this.options.ignoreDotfiles && fileName.startsWith(".")) {
        this.stats.skipped.push(`Dotfile ignored: ${filePath}`);
        return null;
      }

      const modifiedTime = fileStats.mtime;

      // Use the class method for backward compatibility with tests
      const targetDir = this.getTargetDirectory(fileName, {
        size,
        mtime: modifiedTime,
      });

      const targetPath = join(basePath, targetDir, fileName);

      return {
        sourcePath: filePath,
        targetPath,
        size,
        modifiedTime,
      };
    } catch (error) {
      this.stats.errors.push(
        `Failed to process ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Move a file to its target location and update tracking structures
   * @param mapping File mapping information
   * @param dirStructure Directory structure map to update
   */
  private async moveFile(
    mapping: FileMapping,
    dirStructure: DirectoryMap
  ): Promise<void> {
    try {
      const targetDir = dirname(mapping.targetPath);
      const fileName = basename(mapping.targetPath);

      // Always track the structure for database logging
      if (!dirStructure.has(targetDir)) {
        dirStructure.set(targetDir, new Set());
      }
      dirStructure.get(targetDir)?.add(fileName);

      // Only perform actual file operations if not in dry run mode
      if (!this.options.dryRun) {
        try {
          await mkdir(targetDir, { recursive: true });
          await rename(mapping.sourcePath, mapping.targetPath);

          // Track created directory
          this.stats.created.add(targetDir);
        } catch (moveError) {
          throw new Error(
            `Failed to move file: ${
              moveError instanceof Error ? moveError.message : String(moveError)
            }`
          );
        }
      }

      // Update statistics
      this.stats.filesProcessed++;
      this.stats.bytesMoved += mapping.size;
    } catch (error) {
      this.stats.errors.push(
        `Failed to move ${mapping.sourcePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Remove duplicated progress bar code - we'll use ProgressService instead

  /**
   * Builds a directory structure map from file paths
   * @param filePaths Array of file paths
   * @param basePath Base directory to make paths relative to
   * @returns Map of directories to their files
   */
  private buildDirectoryStructure(
    filePaths: string[],
    basePath?: string
  ): DirectoryMap {
    const structure: DirectoryMap = new Map();
    const baseDirName = basePath ? basename(basePath) : undefined;

    for (const filePath of filePaths) {
      let dir = dirname(filePath);
      const fileName = basename(filePath);

      if (basePath && baseDirName) {
        const relativeDir = relative(basePath, dir);
        dir = relativeDir === "" ? baseDirName : join(baseDirName, relativeDir);
      }

      // Create a set for this directory if it doesn't exist
      if (!structure.has(dir)) {
        structure.set(dir, new Set());
      }

      // Add the file to the directory's set
      structure.get(dir)?.add(fileName);
    }

    return structure;
  }

  /**
   * Generates a tree visualization of the directory structure
   * @param dirMap Directory map to visualize
   * @param isPreview Whether this is a preview (for dry run)
   * @returns Formatted string representation of the tree
   */
  private generateTree(dirMap: DirectoryMap, isPreview = false): string {
    // Create a TreeService instance to handle tree rendering
    const treeService = new TreeService(dirMap);

    // Generate the basic tree structure
    let result = treeService.generate();

    // Add a header with appropriate coloring
    const header = isPreview
      ? colors.bold(colors.info("After (Dry Run):"))
      : colors.bold(colors.success("Directory Structure:"));

    // Prepend the header to the tree
    return header + "\n" + result;
  }

  /**
   * Organize files in a directory according to the specified options
   * @param directory Directory to organize
   */
  public async organize(directory: string): Promise<void> {
    const startTime = Date.now();
    const resolvedPath = resolve(directory);

    this.resetStats();

    // Validate the directory exists
    await this.validateDirectory(resolvedPath);

    // Find all applicable files
    const allFiles = await this.findFiles(resolvedPath);

    // Build initial directory structure for comparison
    const initialStructure = this.buildDirectoryStructure(
      allFiles,
      resolvedPath
    );

    // Process files to get mappings
    const fileMappings = await this.createFileMappings(allFiles, resolvedPath);

    const totalFiles = fileMappings.length;
    if (totalFiles === 0) {
      console.log(
        colors.warning(`⚠️ No files found to organize in ${directory}`)
      );
      return;
    }

    // Track the final structure
    const finalRunStructure: DirectoryMap = new Map();

    // Process files with progress bar
    await this.processFileMappings(fileMappings, finalRunStructure, totalFiles);

    // Calculate duration
    const duration = (Date.now() - startTime) / 1000;

    // Different handling for actual run vs. dry run
    if (!this.options.dryRun) {
      // Log the operation to database
      this.dbLogger.logOrganization(
        resolvedPath,
        this.options.method,
        initialStructure,
        finalRunStructure,
        fileMappings,
        this.stats,
        duration
      );

      console.log(
        colors.success(
          `✅ Organization complete: ${colors.bold(
            this.stats.filesProcessed.toString()
          )} files processed.`
        )
      );
    } else {
      // Show before/after for dry run
      console.log(colors.bold(colors.info("\nBefore:")));
      console.log(this.generateTree(initialStructure));

      console.log(); // Extra newline for separation
      console.log(this.generateTree(finalRunStructure, true));

      this.printSummary(duration);
    }
  }

  /**
   * Validates that the target directory exists and is accessible
   * @param path Directory path to validate
   */
  private async validateDirectory(path: string): Promise<void> {
    try {
      const directoryStats = await stat(path);
      if (!directoryStats.isDirectory()) {
        throw new Error(
          `Directory does not exist or is not accessible: ${path}`
        );
      }
    } catch (error) {
      throw new Error(colors.error(`❌ Cannot access directory: ${path}`));
    }
  }

  /**
   * Find all files in the target directory that match criteria
   * @param path Directory to scan for files
   * @returns Array of matching file paths
   */
  private async findFiles(path: string): Promise<string[]> {
    // Use Bun.Glob for efficient file discovery
    const pattern = this.options.recursive ? "**/*" : "*";
    const glob = new Glob(pattern);

    const files: string[] = [];

    // Scan for files and convert async iterator to array
    for await (const file of glob.scan({
      cwd: path,
      onlyFiles: true,
      dot: !this.options.ignoreDotfiles,
      absolute: true,
    })) {
      if (this.options.recursive) {
        const relativePath = relative(path, file);
        const relativeDir = dirname(relativePath);
        const depth = relativeDir === "." ? 0 : relativeDir.split(sep).length;
        const maxDepth = this.options.maxDepth ?? Infinity;
        if (depth > maxDepth) {
          continue;
        }
      }
      files.push(file);
    }

    return files;
  }

  /**
   * Creates file mappings for all files that should be moved
   * @param files Array of file paths
   * @param basePath Base directory path
   * @returns Array of file mappings
   */
  private async createFileMappings(
    files: string[],
    basePath: string
  ): Promise<FileMapping[]> {
    const mappings: FileMapping[] = [];

    for (const filePath of files) {
      const mapping = await this.processFile(filePath, basePath);
      if (mapping) mappings.push(mapping);
    }

    return mappings;
  }

  /**
   * Process all file mappings with progress reporting
   * @param mappings File mappings to process
   * @param structure Directory structure to update
   * @param totalFiles Total number of files (for progress calculation)
   */
  private async processFileMappings(
    mappings: FileMapping[],
    structure: DirectoryMap,
    totalFiles: number
  ): Promise<void> {
    // Start spinner animation
    this.progressService.startSpinner(
      `🚀 Starting file organization for ${totalFiles} files`
    );

    // Process files
    for (let i = 0; i < mappings.length; i++) {
      await this.moveFile(mappings[i], structure);
    }

    // Stop spinner when done
    this.progressService.stopSpinner();
  }

  /**
   * Prints a summary of the organization operation
   * @param duration Duration in seconds
   */
  private printSummary(duration: number): void {
    // Use the ProgressService to print the summary
    this.progressService.printSummary(
      this.stats,
      duration,
      this.options.verbose
    );
  }

  // Database-related methods
  async undo(operationId?: number): Promise<boolean> {
    return this.dbLogger.undo(operationId);
  }

  async redo(undoOperationId?: number): Promise<boolean> {
    return this.dbLogger.redo(undoOperationId);
  }

  displayHistory(limit: number = 10, directory?: string): void {
    this.dbLogger.displayHistory(limit, directory);
  }

  showStructureComparison(operationId: number): void {
    this.dbLogger.showStructureComparison(operationId);
  }

  displayStats(): void {
    this.dbLogger.displayStats();
  }

  async clearHistory(): Promise<void> {
    await this.dbLogger.clearHistory();
  }

  async exportHistory(filePath: string): Promise<void> {
    await this.dbLogger.exportHistory(filePath);
  }

  closeDatabase(): void {
    this.dbLogger.close();
  }

  private resetStats(): void {
    this.stats.filesProcessed = 0;
    this.stats.bytesMoved = 0;
    this.stats.errors = [];
    this.stats.skipped = [];
    this.stats.created = new Set<string>();
  }
}
