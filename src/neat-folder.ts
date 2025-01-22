import { cpus } from "os";
import { resolve } from "path";
import { readdir } from "fs/promises";

import { ANSI_STYLES } from "./constants";
import { TreeService } from "./services/tree";
import { ProgressService } from "./services/progress";
import { FileSystemService } from "./services/fsystem";
import { FileCategorizationService } from "./services/fcategorize";

import type {
  FileMapping,
  OrganizationOptions,
  OrganizationStats,
} from "./types";

export class NeatFolder {
  private readonly stats: OrganizationStats = {
    filesProcessed: 0,
    bytesMoved: 0,
    errors: [],
    skipped: [],
    created: new Set<string>(),
  };

  constructor(
    private readonly options: OrganizationOptions,
    private readonly fs: FileSystemService,
    private readonly categorizer: FileCategorizationService,
    private readonly progress: ProgressService
  ) {}

  private async *walkDirectory(dir: string, depth = 0): AsyncGenerator<string> {
    if (this.options.maxDepth && depth > this.options.maxDepth) return;

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = this.fs.joinPaths(dir, entry.name);
      if (entry.isDirectory() && this.options.recursive) {
        yield* this.walkDirectory(path, depth + 1);
      } else if (entry.isFile()) {
        yield path;
      }
    }
  }

  private async processFile(
    filePath: string,
    basePath: string
  ): Promise<FileMapping | null> {
    try {
      const stats = await this.fs.getFileStats(filePath);
      if (!stats.isFile()) return null;

      if (this.options.minSize && stats.size < this.options.minSize) {
        this.stats.skipped.push(`Size too small: ${filePath}`);
        return null;
      }

      if (this.options.maxSize && stats.size > this.options.maxSize) {
        this.stats.skipped.push(`Size too large: ${filePath}`);
        return null;
      }

      const fileName = this.fs.getBasename(filePath);
      if (this.options.ignoreDotfiles && fileName.startsWith(".")) {
        this.stats.skipped.push(`Dotfile ignored: ${filePath}`);
        return null;
      }

      const targetDir = this.categorizer.getTargetDirectory(
        fileName,
        stats,
        this.options.method
      );
      const targetPath = this.fs.joinPaths(basePath, targetDir, fileName);

      return {
        sourcePath: filePath,
        targetPath,
        size: stats.size,
        modifiedTime: stats.mtime,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.stats.errors.push(
          `Failed to process ${filePath}: ${error.message}`
        );
      }
      return null;
    }
  }

  private async moveFile(
    mapping: FileMapping,
    dirStructure: Map<string, Set<string>>
  ): Promise<void> {
    try {
      const targetDir = this.fs.getDirname(mapping.targetPath);
      const fileName = this.fs.getBasename(mapping.targetPath);

      if (!this.options.dryRun) {
        await this.fs.createDirectory(targetDir);
        this.stats.created.add(targetDir);
        await this.fs.moveFile(mapping.sourcePath, mapping.targetPath);
      } else {
        if (!dirStructure.has(targetDir)) {
          dirStructure.set(targetDir, new Set());
        }
        dirStructure.get(targetDir)?.add(fileName);
      }

      this.stats.filesProcessed++;
      this.stats.bytesMoved += mapping.size;
    } catch (error) {
      if (error instanceof Error) {
        this.stats.errors.push(
          `Failed to move ${mapping.sourcePath}: ${error.message}`
        );
      }
    }
  }

  public async organize(directory: string): Promise<void> {
    const startTime = Date.now();
    const resolvedPath = resolve(directory);

    if (!(await this.fs.isValidPath(resolvedPath))) {
      throw new Error(`Cannot access directory: ${resolvedPath}`);
    }

    // Build initial directory structure
    const initialStructure = new Map<string, Set<string>>();
    for await (const filePath of this.walkDirectory(resolvedPath)) {
      const dir = this.fs.getDirname(filePath);
      const fileName = this.fs.getBasename(filePath);

      if (!initialStructure.has(dir)) {
        initialStructure.set(dir, new Set());
      }
      initialStructure.get(dir)?.add(fileName);
    }

    const fileMappings: FileMapping[] = [];
    for await (const filePath of this.walkDirectory(resolvedPath)) {
      const mapping = await this.processFile(filePath, resolvedPath);
      if (mapping) fileMappings.push(mapping);
    }

    const totalFiles = fileMappings.length;
    if (totalFiles === 0) {
      console.log(
        `${ANSI_STYLES.CYAN}${ANSI_STYLES.BOLD}No files found to organize in ${directory}${ANSI_STYLES.RESET}`
      );
      return;
    }

    console.log("Starting file organization...");
    const finalRunStructure = new Map<string, Set<string>>();
    const chunkSize = Math.max(1, Math.min(totalFiles, cpus().length * 2));

    for (let i = 0; i < fileMappings.length; i += chunkSize) {
      const chunk = fileMappings.slice(i, i + chunkSize);
      for (let idx = 0; idx < chunk.length; idx++) {
        await this.moveFile(chunk[idx], finalRunStructure);
        const progress = ((i + idx + 1) / totalFiles) * 100;
        process.stdout.write(`\r${this.progress.drawProgressBar(progress)}`);
      }
    }

    console.log(); // Newline after progress bar

    if (!this.options.dryRun) {
      console.log(
        `${ANSI_STYLES.BLUE}${ANSI_STYLES.BOLD}Organization complete: ${this.stats.filesProcessed} files processed.${ANSI_STYLES.RESET}`
      );
      return;
    }

    // Print both initial and dry-run trees using the original TreeService
    console.log(
      `${ANSI_STYLES.BLUE}${ANSI_STYLES.BOLD}Before:${ANSI_STYLES.RESET}`
    );
    const beforeTree = new TreeService(initialStructure);
    console.log(beforeTree.generate());

    console.log(
      `\n${ANSI_STYLES.GREEN}${ANSI_STYLES.BOLD}After (Dry Run):${ANSI_STYLES.RESET}`
    );
    const afterTree = new TreeService(finalRunStructure);
    console.log(afterTree.generate());

    const duration = (Date.now() - startTime) / 1000;
    this.progress.printSummary(this.stats, duration, this.options.verbose);
  }
}
