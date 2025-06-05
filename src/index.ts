#!/usr/bin/env bun

import { parseArgs } from "util";
import { NeatFolder } from "./neat-folder";
import type { OrganizationOptions, GroupingMethod } from "./types";

// Type definitions for parsed arguments
interface ParsedArguments {
  directory: string;
  method: GroupingMethod;
  recursive: boolean;
  maxDepth: number;
  minSize: number;
  maxSize: number;
  ignoreDotfiles: boolean;
  dryRun: boolean;
  verbose: boolean;
}

// Utility function to parse size strings (e.g., "1MB", "500KB", "2GB")
const parseSize = (sizeStr: string): number => {
  if (sizeStr === "Infinity" || sizeStr === "") return Infinity;
  if (sizeStr === "0" || !sizeStr) return 0;

  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) {
    throw new Error(
      `Invalid size format: ${sizeStr}. Use formats like: 100, 1KB, 2MB, 1.5GB`
    );
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase();

  const multipliers = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  return value * multipliers[unit as keyof typeof multipliers];
};

// Validate organization method
const validateMethod = (method: string): GroupingMethod => {
  const validMethods: GroupingMethod[] = ["extension", "name", "date", "size"];
  if (!validMethods.includes(method as GroupingMethod)) {
    throw new Error(
      `Invalid method: ${method}. Valid options: ${validMethods.join(", ")}`
    );
  }
  return method as GroupingMethod;
};

// Validate numeric parameters
const parseNumber = (value: string, name: string, min: number = 0): number => {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < min) {
    throw new Error(`Invalid ${name}: ${value}. Must be a number >= ${min}`);
  }
  return num;
};

const showHelp = () => {
  console.log(`
NeatFolder - Organize files by type, name, date, or size

Usage: neatfolder [directory] [options]

Options:
  -m, --method <type>     Organization method: extension|name|date|size (default: extension)
  -r, --recursive         Include subdirectories
  -d, --max-depth <n>     Maximum directory depth (default: 5)
  --min-size <size>       Minimum file size filter (e.g., 1KB, 1MB)
  --max-size <size>       Maximum file size filter (e.g., 100MB, 1GB)
  --ignore-dotfiles       Skip hidden files
  --dry-run               Preview changes without moving files
  -v, --verbose           Show detailed output
  -h, --help              Show this help message

Examples:
  neatfolder ~/Downloads                    # Organize by file extension
  neatfolder ~/Documents -m name -r         # Organize by name, recursive
  neatfolder . --dry-run                    # Preview organization
  neatfolder . --min-size 1MB --max-size 100MB  # Filter by size
  `);
  process.exit(0);
};

// Enhanced argument parser using util.parseArgs
const parseArguments = (): ParsedArguments => {
  try {
    const { values, positionals } = parseArgs({
      args: Bun.argv,
      options: {
        method: {
          type: "string",
          short: "m",
          default: "extension",
        },
        recursive: {
          type: "boolean",
          short: "r",
          default: false,
        },
        "max-depth": {
          type: "string",
          short: "d",
          default: "5",
        },
        "min-size": {
          type: "string",
          default: "0",
        },
        "max-size": {
          type: "string",
          default: "Infinity",
        },
        "ignore-dotfiles": {
          type: "boolean",
          default: false,
        },
        "dry-run": {
          type: "boolean",
          default: false,
        },
        verbose: {
          type: "boolean",
          short: "v",
          default: false,
        },
        help: {
          type: "boolean",
          short: "h",
          default: false,
        },
      },
      strict: false,
      allowPositionals: true,
    });

    if (values.help) {
      showHelp();
    }

    // Extract directory from positionals (skip bun executable and script path)
    const directory = positionals.slice(2)[0] || ".";

    // Validate and parse all arguments with proper error handling
    const method = validateMethod(String(values.method || "extension"));
    const maxDepth = parseNumber(
      String(values["max-depth"] || "5"),
      "max-depth",
      1
    );
    const minSize = parseSize(String(values["min-size"] || "0"));
    const maxSize = parseSize(String(values["max-size"] || "Infinity"));

    // Validate size range
    if (minSize > maxSize) {
      throw new Error("min-size cannot be greater than max-size");
    }

    return {
      directory,
      method,
      recursive: Boolean(values.recursive),
      maxDepth,
      minSize,
      maxSize,
      ignoreDotfiles: Boolean(values["ignore-dotfiles"]),
      dryRun: Boolean(values["dry-run"]),
      verbose: Boolean(values.verbose),
    };
  } catch (error: any) {
    console.error(`Error parsing arguments: ${error.message}`);
    console.error("Use --help for usage information.");
    process.exit(1);
  }
};

const main = async () => {
  const cmdOptions = parseArguments();

  try {
    const options: OrganizationOptions = {
      method: cmdOptions.method,
      ignoreDotfiles: cmdOptions.ignoreDotfiles,
      recursive: cmdOptions.recursive,
      dryRun: cmdOptions.dryRun,
      maxDepth: cmdOptions.maxDepth,
      minSize: cmdOptions.minSize,
      maxSize: cmdOptions.maxSize,
      verbose: cmdOptions.verbose,
    };

    const organizer = new NeatFolder(options);
    await organizer.organize(cmdOptions.directory);
  } catch (error: any) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error.message);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
