#!/usr/bin/env bun

// Example implementation of color-coded output for neatfolder
// This demonstrates how to enhance the CLI with Bun's color utilities
//
// Color Implementation Notes:
// - Uses Bun.color(color, "ansi") for color output
// - Supports both named colors ("green", "red") and hex colors ("#FFA500")
// - ANSI reset code \x1b[0m is used instead of Bun.color("reset", "ansi") for compatibility
// - This provides better cross-terminal compatibility and performance

import { NeatFolder } from "./neat-folder";
import type { OrganizationOptions } from "./types";

// Color utility functions using Bun's built-in color API with proper reset codes
const colors = {
  success: (text: string) => `${Bun.color("green", "ansi")}${text}\x1b[0m`,
  warning: (text: string) => `${Bun.color("yellow", "ansi")}${text}\x1b[0m`,
  error: (text: string) => `${Bun.color("red", "ansi")}${text}\x1b[0m`,
  info: (text: string) => `${Bun.color("cyan", "ansi")}${text}\x1b[0m`,
  dim: (text: string) => `${Bun.color("#666666", "ansi")}${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,

  // File type colors using Bun.color with vibrant colors
  code: (text: string) => `${Bun.color("#FFA500", "ansi")}${text}\x1b[0m`, // Orange
  document: (text: string) => `${Bun.color("#4169E1", "ansi")}${text}\x1b[0m`, // Royal Blue
  image: (text: string) => `${Bun.color("#DA70D6", "ansi")}${text}\x1b[0m`, // Orchid
  video: (text: string) => `${Bun.color("#00CED1", "ansi")}${text}\x1b[0m`, // Dark Turquoise
  audio: (text: string) => `${Bun.color("#32CD32", "ansi")}${text}\x1b[0m`, // Lime Green
  archive: (text: string) => `${Bun.color("#DC143C", "ansi")}${text}\x1b[0m`, // Crimson
};

// Enhanced file categorization with colors
const getFileTypeColor = (extension: string): ((text: string) => string) => {
  const ext = extension.toLowerCase();

  if (
    [".js", ".ts", ".py", ".go", ".rs", ".java", ".cpp", ".c"].includes(ext)
  ) {
    return colors.code;
  } else if ([".txt", ".md", ".pdf", ".doc", ".docx"].includes(ext)) {
    return colors.document;
  } else if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg"].includes(ext)) {
    return colors.image;
  } else if ([".mp4", ".avi", ".mov", ".mkv", ".webm"].includes(ext)) {
    return colors.video;
  } else if ([".mp3", ".wav", ".flac", ".aac", ".ogg"].includes(ext)) {
    return colors.audio;
  } else if ([".zip", ".tar", ".gz", ".rar", ".7z"].includes(ext)) {
    return colors.archive;
  }

  return (text: string) => text; // No color for unknown types
};

// Enhanced progress bar with colors
class ColorfulProgressBar {
  private width = 30;

  show(progress: number, total: number) {
    const percentage = Math.round((progress / total) * 100);
    const filled = Math.round((this.width * progress) / total);
    const empty = this.width - filled;

    const bar =
      colors.success("█".repeat(filled)) + colors.dim("▒".repeat(empty));
    const percentText =
      percentage < 50
        ? colors.warning(`${percentage.toFixed(2)}%`)
        : percentage < 100
        ? colors.info(`${percentage.toFixed(2)}%`)
        : colors.success(`${percentage.toFixed(2)}%`);

    process.stdout.write(`\r[${bar}] ${percentText}`);

    if (progress === total) {
      console.log(); // New line when complete
    }
  }
}

// Enhanced tree display with colors
class ColorfulTreeDisplay {
  generateTree(
    directoryMap: Map<string, Set<string>>,
    isPreview = false
  ): string {
    const lines: string[] = [];
    const dirs = Array.from(directoryMap.keys()).sort();

    if (isPreview) {
      lines.push(colors.bold(colors.info("After (Dry Run):")));
    } else {
      lines.push(colors.bold(colors.success("After:")));
    }

    dirs.forEach((dir, index) => {
      const isLast = index === dirs.length - 1;
      const prefix = isLast ? "└── " : "├── ";

      // Color the directory name based on content
      const dirColor = this.getDirColor(dir);
      lines.push(dirColor(`${prefix}${dir}/`));

      const files = Array.from(directoryMap.get(dir) || []).sort();
      files.forEach((file, fileIndex) => {
        const isLastFile = fileIndex === files.length - 1;
        const connector = isLast ? " " : "│";
        const filePrefix = isLastFile ? "└── " : "├── ";

        // Color the file based on its extension
        const extension = file.substring(file.lastIndexOf("."));
        const fileColor = getFileTypeColor(extension);

        lines.push(`${connector} ${fileColor(filePrefix + file)}`);
      });
    });

    return lines.join("\n");
  }

  private getDirColor(dirName: string): (text: string) => string {
    const name = dirName.toLowerCase();
    if (name.includes("code") || name.includes("script")) return colors.code;
    if (name.includes("doc") || name.includes("text")) return colors.document;
    if (name.includes("image") || name.includes("photo")) return colors.image;
    if (name.includes("video") || name.includes("movie")) return colors.video;
    if (name.includes("audio") || name.includes("music")) return colors.audio;
    if (name.includes("archive") || name.includes("zip")) return colors.archive;
    return colors.info;
  }
}

// Enhanced organizer with color output
class ColorfulNeatFolder extends NeatFolder {
  private colorfulProgress = new ColorfulProgressBar();
  private colorfulTree = new ColorfulTreeDisplay();

  protected showProgress(current: number, total: number): void {
    this.colorfulProgress.show(current, total);
  }

  protected displayTree(
    directoryMap: Map<string, Set<string>>,
    isPreview = false
  ): void {
    const tree = this.colorfulTree.generateTree(directoryMap, isPreview);
    console.log(tree);
  }

  protected logSuccess(message: string): void {
    console.log(colors.success(`✅ ${message}`));
  }

  protected logWarning(message: string): void {
    console.log(colors.warning(`⚠️  ${message}`));
  }

  protected logError(message: string): void {
    console.log(colors.error(`❌ ${message}`));
  }

  protected logInfo(message: string): void {
    console.log(colors.info(`ℹ️  ${message}`));
  }
}

// Example usage
async function demonstrateColorfulOutput() {
  console.log(colors.bold(colors.info("🌈 NeatFolder with Color Support")));
  console.log();

  const options: OrganizationOptions = {
    method: "extension",
    ignoreDotfiles: false,
    recursive: false,
    dryRun: true,
    verbose: true,
  };

  const organizer = new ColorfulNeatFolder(options);

  // This would normally organize files, but we're just demonstrating the colors
  console.log(colors.success("✅ Color support successfully implemented!"));
  console.log(
    colors.warning("⚠️  This is a demonstration of future capabilities")
  );
  console.log(colors.error("❌ Error handling with colors"));
  console.log(colors.info("ℹ️  Information messages are more readable"));
  console.log();

  // Demo file type colors
  console.log(colors.bold("File Type Color Examples:"));
  console.log(`${getFileTypeColor(".js")("script.js")} (JavaScript)`);
  console.log(`${getFileTypeColor(".py")("script.py")} (Python)`);
  console.log(`${getFileTypeColor(".md")("README.md")} (Markdown)`);
  console.log(`${getFileTypeColor(".jpg")("photo.jpg")} (Image)`);
  console.log(`${getFileTypeColor(".mp4")("video.mp4")} (Video)`);
  console.log(`${getFileTypeColor(".zip")("archive.zip")} (Archive)`);
}

if (import.meta.main) {
  demonstrateColorfulOutput();
}

export { ColorfulNeatFolder, colors, getFileTypeColor };
