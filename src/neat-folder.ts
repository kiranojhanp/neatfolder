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

// Color utility functions using Bun's built-in color API
const colors = {
  success: (text: string) => `${Bun.color("green", "ansi")}${text}\x1b[0m`,
  warning: (text: string) => `${Bun.color("yellow", "ansi")}${text}\x1b[0m`,
  error: (text: string) => `${Bun.color("red", "ansi")}${text}\x1b[0m`,
  info: (text: string) => `${Bun.color("cyan", "ansi")}${text}\x1b[0m`,
  dim: (text: string) => `${Bun.color("#666666", "ansi")}${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,

  // File type colors
  code: (text: string) => `${Bun.color("#FFA500", "ansi")}${text}\x1b[0m`, // Orange
  document: (text: string) => `${Bun.color("#4169E1", "ansi")}${text}\x1b[0m`, // Royal Blue
  image: (text: string) => `${Bun.color("#DA70D6", "ansi")}${text}\x1b[0m`, // Orchid
  video: (text: string) => `${Bun.color("#00CED1", "ansi")}${text}\x1b[0m`, // Dark Turquoise
  audio: (text: string) => `${Bun.color("#32CD32", "ansi")}${text}\x1b[0m`, // Lime Green
  archive: (text: string) => `${Bun.color("#DC143C", "ansi")}${text}\x1b[0m`, // Crimson
};

// Get color function for file type
const getFileTypeColor = (extension: string): ((text: string) => string) => {
  const ext = extension.toLowerCase();

  if (
    [
      ".js",
      ".ts",
      ".py",
      ".go",
      ".rs",
      ".java",
      ".cpp",
      ".c",
      ".jsx",
      ".tsx",
    ].includes(ext)
  ) {
    return colors.code;
  } else if (
    [".txt", ".md", ".pdf", ".doc", ".docx", ".rtf", ".odt"].includes(ext)
  ) {
    return colors.document;
  } else if (
    [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".ico"].includes(
      ext
    )
  ) {
    return colors.image;
  } else if (
    [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"].includes(ext)
  ) {
    return colors.video;
  } else if (
    [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma"].includes(ext)
  ) {
    return colors.audio;
  } else if (
    [".zip", ".tar", ".gz", ".rar", ".7z", ".bz2", ".xz"].includes(ext)
  ) {
    return colors.archive;
  }

  return (text: string) => text; // No color for unknown types
};

// Get directory color based on name
const getDirColor = (dirName: string): ((text: string) => string) => {
  const name = dirName.toLowerCase();
  if (name.includes("code") || name.includes("script")) return colors.code;
  if (name.includes("doc") || name.includes("text")) return colors.document;
  if (name.includes("image") || name.includes("photo")) return colors.image;
  if (name.includes("video") || name.includes("movie")) return colors.video;
  if (name.includes("audio") || name.includes("music")) return colors.audio;
  if (name.includes("archive") || name.includes("zip")) return colors.archive;
  return colors.info;
};

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

    const progressBar =
      colors.success("█".repeat(filledWidth)) +
      colors.dim("▒".repeat(emptyWidth));
    const percentText =
      progress < 50
        ? colors.warning(`${progress.toFixed(2)}%`)
        : progress < 100
        ? colors.info(`${progress.toFixed(2)}%`)
        : colors.success(`${progress.toFixed(2)}%`);

    return `[${progressBar}] ${percentText}`;
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

  private generateTree(dirMap: DirectoryMap, isPreview = false): string {
    let result = "";
    const sortedDirs = Array.from(dirMap.keys()).sort();

    // Add header with colors
    if (isPreview) {
      result += colors.bold(colors.info("After (Dry Run):")) + "\n";
    } else {
      result += colors.bold(colors.success("Directory Structure:")) + "\n";
    }

    for (let i = 0; i < sortedDirs.length; i++) {
      const dir = sortedDirs[i];
      const files = Array.from(dirMap.get(dir) || []).sort();
      const isLastDir = i === sortedDirs.length - 1;

      // Add directory name with color
      const dirName = dir.split("/").pop() || dir;
      const dirColor = getDirColor(dirName);
      const dirIcon = isLastDir
        ? TREE_SYMBOLS.LAST_BRANCH
        : TREE_SYMBOLS.BRANCH;
      result += `${dirColor(dirIcon + dirName + "/")}\n`;

      // Add files with colors
      for (let j = 0; j < files.length; j++) {
        const file = files[j];
        const isLastFile = j === files.length - 1;
        const prefix = isLastDir ? TREE_SYMBOLS.INDENT : TREE_SYMBOLS.VERTICAL;
        const connector = isLastFile
          ? TREE_SYMBOLS.LAST_BRANCH
          : TREE_SYMBOLS.BRANCH;

        // Color the file based on its extension
        const extension = file.substring(file.lastIndexOf("."));
        const fileColor = getFileTypeColor(extension);

        result += `${colors.dim(prefix)}${fileColor(connector + file)}\n`;
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
        throw new Error(
          colors.error(`❌ Cannot access directory: ${resolvedPath}`)
        );
      }
    } catch {
      throw new Error(
        colors.error(`❌ Cannot access directory: ${resolvedPath}`)
      );
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
      console.log(
        colors.warning(`⚠️  No files found to organize in ${directory}`)
      );
      return;
    }

    console.log(
      colors.info(
        `🚀 Starting file organization for ${colors.bold(
          totalFiles.toString()
        )} files...`
      )
    );
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
        colors.success(
          `✅ Organization complete: ${colors.bold(
            this.stats.filesProcessed.toString()
          )} files processed.`
        )
      );
      return;
    }

    // Show before/after for dry run
    console.log(colors.bold(colors.info("Before:")));
    console.log(this.generateTree(initialStructure));

    console.log(); // Extra newline for separation
    console.log(this.generateTree(finalRunStructure, true));

    const duration = (Date.now() - startTime) / 1000;
    this.printSummary(duration);
  }

  private printSummary(duration: number): void {
    if (!this.options.verbose) return;

    console.log(colors.bold(colors.info("\n📊 Organization Summary:")));
    console.log(
      colors.info(
        `Files processed: ${colors.bold(this.stats.filesProcessed.toString())}`
      )
    );
    console.log(
      colors.info(
        `Total data moved: ${colors.bold(
          (this.stats.bytesMoved / (1024 * 1024)).toFixed(2)
        )} MB`
      )
    );
    console.log(
      colors.info(`Time taken: ${colors.bold(duration.toFixed(2))} seconds`)
    );
    console.log(
      colors.info(
        `Directories created: ${colors.bold(
          this.stats.created.size.toString()
        )}`
      )
    );

    if (this.stats.errors.length > 0) {
      console.log(colors.error("\n❌ Errors encountered:"));
      this.stats.errors.forEach((error) =>
        console.log(colors.error(`  • ${error}`))
      );
    }

    if (this.stats.skipped.length > 0) {
      console.log(colors.warning("\n⏭️  Skipped files:"));
      this.stats.skipped.forEach((skip) =>
        console.log(colors.warning(`  • ${skip}`))
      );
    }
  }
}
