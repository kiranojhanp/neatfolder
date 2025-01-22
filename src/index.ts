#!/usr/bin/env bun
import { program } from "commander";
import { readdir, mkdir, rename, stat, access } from "fs/promises";
import { join, resolve, parse, basename } from "path";
import { cpus } from "os";
import { constants } from "fs";

interface OrganizationOptions {
  method: "extension" | "name" | "date" | "size";
  ignoreDotfiles: boolean;
  recursive: boolean;
  dryRun: boolean;
  maxDepth: number;
  minSize: number;
  maxSize: number;
  verbose: boolean;
}

interface FileMapping {
  sourcePath: string;
  targetPath: string;
  size: number;
  modifiedTime: Date;
}

// Enhanced file type mappings with more specific categories
const FILE_CATEGORIES = new Map([
  // Images
  [/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i, "images"],
  // Documents
  [/\.(pdf|doc|docx|txt|md|rtf|odt|xlsx|xls|csv)$/i, "documents"],
  // Audio
  [/\.(mp3|wav|flac|m4a|aac|ogg|wma)$/i, "audio"],
  // Video
  [/\.(mp4|avi|mkv|mov|wmv|flv|webm)$/i, "video"],
  // Archives
  [/\.(zip|rar|7z|tar|gz|bz2)$/i, "archives"],
  // Code
  [/\.(js|ts|py|java|cpp|cs|php|html|css|json|xml)$/i, "code"],
  // Executables
  [/\.(exe|msi|app|dmg|apk)$/i, "executables"],
  // Font files
  [/\.(ttf|otf|woff|woff2)$/i, "fonts"],
]);

class NeatFolder {
  private readonly options: OrganizationOptions;
  private readonly stats = {
    filesProcessed: 0,
    bytesMoved: 0,
    errors: [] as string[],
    skipped: [] as string[],
    created: new Set<string>(),
  };

  constructor(options: OrganizationOptions) {
    this.options = options;
  }

  private async isValidPath(path: string): Promise<boolean> {
    try {
      await access(path, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async createDirectory(path: string): Promise<void> {
    if (!this.options.dryRun) {
      try {
        await mkdir(path, { recursive: true });
      } catch (error) {
        if (error instanceof Error) {
          this.stats.errors.push(
            `Failed to create directory ${path}: ${error.message}`
          );
          return; // Skip this file but continue with others
        }
      }
    }
  }

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
    switch (this.options.method) {
      case "extension":
        return this.getCategoryFromFile(file);
      case "date": {
        const date = stats.mtime;
        return `${date.getFullYear()}/${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      }
      case "size": {
        if (stats.size < 1024 * 1024) return "small"; // < 1MB
        if (stats.size < 100 * 1024 * 1024) return "medium"; // < 100MB
        return "large";
      }
      case "name":
        return file.charAt(0).toLowerCase();
      default:
        return "unsorted";
    }
  }

  private async processFile(
    filePath: string,
    basePath: string
  ): Promise<FileMapping | null> {
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) return null;

      if (this.options.minSize && stats.size < this.options.minSize) {
        this.stats.skipped.push(`Size too small: ${filePath}`);
        return null;
      }

      if (this.options.maxSize && stats.size > this.options.maxSize) {
        this.stats.skipped.push(`Size too large: ${filePath}`);
        return null;
      }

      const fileName = basename(filePath);
      if (this.options.ignoreDotfiles && fileName.startsWith(".")) {
        this.stats.skipped.push(`Dotfile ignored: ${filePath}`);
        return null;
      }

      const targetDir = this.getTargetDirectory(fileName, stats);
      const targetPath = join(basePath, targetDir, fileName);

      return {
        sourcePath: filePath,
        targetPath,
        size: stats.size,
        modifiedTime: stats.mtime,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.stats.errors.push(
          `Failed to process ${filePath}: ${error.message || error}`
        );
      }
      return null;
    }
  }

  private async moveFile(mapping: FileMapping): Promise<void> {
    try {
      if (!this.options.dryRun) {
        const targetDir = parse(mapping.targetPath).dir;
        await this.createDirectory(targetDir);
        await rename(mapping.sourcePath, mapping.targetPath);
      }
      this.stats.filesProcessed++;
      this.stats.bytesMoved += mapping.size;
    } catch (error) {
      if (error instanceof Error) {
        this.stats.errors.push(
          `Failed to move ${mapping.sourcePath}: ${error.message || error}`
        );
      }
    }
  }

  private async *walkDirectory(dir: string, depth = 0): AsyncGenerator<string> {
    if (this.options.maxDepth && depth > this.options.maxDepth) return;

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory() && this.options.recursive) {
        yield* this.walkDirectory(path, depth + 1);
      } else if (entry.isFile()) {
        yield path;
      }
    }
  }

  public async organize(directory: string): Promise<void> {
    const startTime = Date.now();
    const resolvedPath = resolve(directory || ".");

    if (!(await this.isValidPath(resolvedPath))) {
      throw new Error(`Cannot access directory: ${resolvedPath}`);
    }

    const fileMappings: FileMapping[] = [];
    for await (const filePath of this.walkDirectory(resolvedPath)) {
      const mapping = await this.processFile(filePath, resolvedPath);
      if (mapping) fileMappings.push(mapping);
    }

    // Process files in parallel with a reasonable chunk size
    const chunkSize = Math.max(
      1,
      Math.min(fileMappings.length, cpus().length * 2)
    );
    for (let i = 0; i < fileMappings.length; i += chunkSize) {
      const chunk = fileMappings.slice(i, i + chunkSize);
      await Promise.all(chunk.map((mapping) => this.moveFile(mapping)));
    }

    this.printSummary(startTime);
  }

  private printSummary(startTime: number): void {
    if (!this.options.verbose) return;

    const duration = (Date.now() - startTime) / 1000;
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

// CLI Configuration
program
  .name("neat-folder")
  .description("Advanced file organization utility")
  .argument("[directory]", "Directory to organize", ".")
  .option(
    "-m, --method <method>",
    "Organization method (extension|name|date|size)",
    "extension"
  )
  .option("-r, --recursive", "Process subdirectories recursively", false)
  .option(
    "-d, --max-depth <number>",
    "Maximum recursion depth",
    (value) => parseInt(value, 10),
    5
  )
  .option(
    "--min-size <bytes>",
    "Minimum file size in bytes",
    (value) => parseInt(value, 10),
    0
  )
  .option("--max-size <bytes>", "Maximum file size in bytes", (value) =>
    parseInt(value, 10)
  )
  .option("--ignore-dotfiles", "Ignore dotfiles", false)
  .option("--dry-run", "Show what would be done without making changes", false)
  .option("-v, --verbose", "Show detailed output", false)
  .action(async (directory: string, cmdOptions) => {
    try {
      const validMethods = ["extension", "name", "date", "size"];
      if (!validMethods.includes(cmdOptions.method)) {
        throw new Error(`Invalid method: ${cmdOptions.method}`);
      }

      const options: OrganizationOptions = {
        method: cmdOptions.method as "extension" | "name" | "date" | "size",
        ignoreDotfiles: cmdOptions.ignoreDotfiles,
        recursive: cmdOptions.recursive,
        dryRun: cmdOptions.dryRun,
        maxDepth: parseInt(cmdOptions.maxDepth, 10),
        minSize: parseInt(cmdOptions.minSize, 10),
        maxSize: cmdOptions.maxSize
          ? parseInt(cmdOptions.maxSize, 10)
          : Infinity,
        verbose: cmdOptions.verbose,
      };

      const organizer = new NeatFolder(options);
      await organizer.organize(directory);
    } catch (error: any) {
      console.error("Fatal error:", error.message);
      process.exit(1);
    }
  });

program.parse();
