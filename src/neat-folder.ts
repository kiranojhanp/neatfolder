import { resolve } from "path";
import { Glob } from "bun";
import { $ } from "bun";
import { FILE_CATEGORIES, TREE_SYMBOLS } from "./constants";
import type {
  FileMapping,
  OrganizationOptions,
  OrganizationStats,
  DirectoryMap,
} from "./types";

export class NeatFolder {
  private readonly stats: OrganizationStats = {
    filesProcessed: 0,
    bytesMoved: 0,
    errors: [],
    skipped: [],
    created: new Set<string>(),
  };

  constructor(private readonly options: OrganizationOptions) {}

  private getCategoryFromFile(filename: string): string {
    for (const [pattern, category] of FILE_CATEGORIES) {
      if (pattern.test(filename)) {
        return category;
      }
    }
    return "others";
  }

  private getTargetDirectory(
    file: string,
    stats: { size: number; mtime: Date }
  ): string {
    let dir = this.getCategoryFromFile(file);

    switch (this.options.method) {
      case "date":
        const date = stats.mtime;
        dir += `/${date.getFullYear()}/${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        break;
      case "size":
        if (stats.size < 1024 * 1024) dir = "small";
        else if (stats.size < 100 * 1024 * 1024) dir = "medium";
        else dir = "large";
        break;
      case "name":
        dir = file.charAt(0).toLowerCase();
        break;
    }
    return dir;
  }

  private async processFile(
    filePath: string,
    basePath: string
  ): Promise<FileMapping | null> {
    try {
      const file = Bun.file(filePath);
      const stats = await file.exists();
      if (!stats) return null;

      const size = file.size;
      if (this.options.minSize && size < this.options.minSize) {
        this.stats.skipped.push(`Size too small: ${filePath}`);
        return null;
      }

      if (this.options.maxSize && size > this.options.maxSize) {
        this.stats.skipped.push(`Size too large: ${filePath}`);
        return null;
      }

      const fileName = filePath.split("/").pop()!;
      if (this.options.ignoreDotfiles && fileName.startsWith(".")) {
        this.stats.skipped.push(`Dotfile ignored: ${filePath}`);
        return null;
      }

      // Get file modification time using shell
      const statResult = await $`stat -f "%m" ${filePath}`.text();
      const modifiedTime = new Date(parseInt(statResult.trim()) * 1000);

      const targetDir = this.getTargetDirectory(fileName, {
        size,
        mtime: modifiedTime,
      });
      const targetPath = `${basePath}/${targetDir}/${fileName}`;

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

  private async moveFile(
    mapping: FileMapping,
    dirStructure: DirectoryMap
  ): Promise<void> {
    try {
      const targetDir = mapping.targetPath.substring(
        0,
        mapping.targetPath.lastIndexOf("/")
      );
      const fileName = mapping.targetPath.split("/").pop()!;

      if (!this.options.dryRun) {
        // Create directory and move file using shell
        await $`mkdir -p ${targetDir}`;
        await $`mv ${mapping.sourcePath} ${mapping.targetPath}`;
        this.stats.created.add(targetDir);
      } else {
        // For dry run, just track the structure
        if (!dirStructure.has(targetDir)) {
          dirStructure.set(targetDir, new Set());
        }
        dirStructure.get(targetDir)?.add(fileName);
      }

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

  private drawProgressBar(progress: number): string {
    const barWidth = 30;
    const filledWidth = Math.floor((progress / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    const progressBar = "█".repeat(filledWidth) + "▒".repeat(emptyWidth);
    return `[${progressBar}] ${progress.toFixed(2)}%`;
  }

  private buildDirectoryStructure(filePaths: string[]): DirectoryMap {
    const structure: DirectoryMap = new Map();

    for (const filePath of filePaths) {
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));
      const fileName = filePath.split("/").pop()!;

      if (!structure.has(dir)) {
        structure.set(dir, new Set());
      }
      structure.get(dir)?.add(fileName);
    }

    return structure;
  }

  private generateTree(dirMap: DirectoryMap): string {
    let result = "";
    const sortedDirs = Array.from(dirMap.keys()).sort();

    for (let i = 0; i < sortedDirs.length; i++) {
      const dir = sortedDirs[i];
      const files = Array.from(dirMap.get(dir) || []).sort();
      const isLastDir = i === sortedDirs.length - 1;

      // Add directory name
      const dirName = dir.split("/").pop() || dir;
      result += `${
        isLastDir ? TREE_SYMBOLS.LAST_BRANCH : TREE_SYMBOLS.BRANCH
      }${dirName}/\n`;

      // Add files
      for (let j = 0; j < files.length; j++) {
        const file = files[j];
        const isLastFile = j === files.length - 1;
        const prefix = isLastDir ? TREE_SYMBOLS.INDENT : TREE_SYMBOLS.VERTICAL;
        const connector = isLastFile
          ? TREE_SYMBOLS.LAST_BRANCH
          : TREE_SYMBOLS.BRANCH;
        result += `${prefix}${connector}${file}\n`;
      }
    }

    return result;
  }

  public async organize(directory: string): Promise<void> {
    const startTime = Date.now();
    const resolvedPath = resolve(directory);

    // Check if directory exists using shell
    try {
      const result = await $`test -d ${resolvedPath}`.nothrow();
      if (result.exitCode !== 0) {
        throw new Error(`Cannot access directory: ${resolvedPath}`);
      }
    } catch {
      throw new Error(`Cannot access directory: ${resolvedPath}`);
    }

    // Use Bun.Glob for efficient file discovery
    const pattern = this.options.recursive ? "**/*" : "*";
    const glob = new Glob(pattern);

    const allFiles: string[] = [];
    for await (const file of glob.scan({
      cwd: resolvedPath,
      onlyFiles: true,
      dot: !this.options.ignoreDotfiles,
      absolute: true,
    })) {
      allFiles.push(file);
    }

    // Build initial directory structure for dry-run comparison
    const initialStructure = this.buildDirectoryStructure(allFiles);

    // Process files to get mappings
    const fileMappings: FileMapping[] = [];
    for (const filePath of allFiles) {
      const mapping = await this.processFile(filePath, resolvedPath);
      if (mapping) fileMappings.push(mapping);
    }

    const totalFiles = fileMappings.length;
    if (totalFiles === 0) {
      console.log(`No files found to organize in ${directory}`);
      return;
    }

    console.log("Starting file organization...");
    const finalRunStructure: DirectoryMap = new Map();

    // Process files with progress
    for (let i = 0; i < fileMappings.length; i++) {
      await this.moveFile(fileMappings[i], finalRunStructure);
      const progress = ((i + 1) / totalFiles) * 100;
      process.stdout.write(`\r${this.drawProgressBar(progress)}`);
    }

    console.log(); // Newline after progress bar

    if (!this.options.dryRun) {
      console.log(
        `Organization complete: ${this.stats.filesProcessed} files processed.`
      );
      return;
    }

    // Show before/after for dry run
    console.log("Before:");
    console.log(this.generateTree(initialStructure));

    console.log("\nAfter (Dry Run):");
    console.log(this.generateTree(finalRunStructure));

    const duration = (Date.now() - startTime) / 1000;
    this.printSummary(duration);
  }

  private printSummary(duration: number): void {
    if (!this.options.verbose) return;

    console.log("\nOrganization Summary:");
    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(
      `Total data moved: ${(this.stats.bytesMoved / (1024 * 1024)).toFixed(
        2
      )} MB`
    );
    console.log(`Time taken: ${duration.toFixed(2)} seconds`);
    console.log(`Directories created: ${this.stats.created.size}`);

    if (this.stats.errors.length > 0) {
      console.log("\nErrors encountered:");
      this.stats.errors.forEach((error) => console.error(`- ${error}`));
    }

    if (this.stats.skipped.length > 0) {
      console.log("\nSkipped files:");
      this.stats.skipped.forEach((skip) => console.log(`- ${skip}`));
    }
  }
}
