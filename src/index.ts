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
  quiet: boolean;
  noDryRun: boolean;
  // Database operations
  undo: boolean;
  redo?: string;
  history: boolean;
  stats: boolean;
  showStructure?: string;
  clearHistory: boolean;
  exportHistory?: string;
  databasePath?: string;
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

// Interactive confirmation function
const askForConfirmation = async (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${message} (y/N): `, (answer: string) => {
      rl.close();
      const normalizedAnswer = answer.toLowerCase().trim();
      resolve(normalizedAnswer === "y" || normalizedAnswer === "yes");
    });
  });
};

const showHelp = () => {
  console.log(`
NeatFolder - Organize files by type, name, date, or size

Usage: neatfolder [directory] [options]

Options:
  -m, --method <type>     Organization method: extension|name|date|size (default: extension)
  -r, --recursive         Include subdirectories (default: true)
  -d, --max-depth <n>     Maximum directory depth (default: 5)
  --min-size <size>       Minimum file size filter (e.g., 1KB, 1MB)
  --max-size <size>       Maximum file size filter (e.g., 100MB, 1GB)
  --ignore-dotfiles       Skip hidden files
  --dry-run               Preview changes without moving files
  --no-dry-run            Actually move files (skip confirmation prompt)
  -v, --verbose           Show detailed output (default: true)
  -q, --quiet             Suppress detailed output
  --database-path <path>  Custom database file path
  -h, --help              Show this help message

Database Operations:
  --undo [operationId]    Undo the last operation or specific operation ID
  --redo <undoOperationId> Redo a previously undone operation
  --history [limit]       Show operation history (optional limit)
  --stats                 Show database statistics
  --show-structure <id>   Show before/after folder structure for operation
  --clear-history         Clear all operation history
  --export-history <file> Export history to JSON file

Examples:
  neatfolder                                # Preview organization, then ask for confirmation
  neatfolder --dry-run                      # Preview only (no confirmation prompt)
  neatfolder --no-dry-run                   # Organize without confirmation prompt
  neatfolder ~/Downloads                    # Preview Downloads folder, then ask for confirmation
  neatfolder ~/Downloads --no-dry-run       # Organize Downloads folder without confirmation
  neatfolder ~/Documents -m name            # Preview organize by name, then confirm
  neatfolder . --min-size 1MB --max-size 100MB  # Filter by size, preview and confirm
  neatfolder . --undo                       # Undo last operation
  neatfolder . --stats                      # Show database statistics

Quick Commands:
  neatfolder                                # Interactive organize current directory
  neatfolder ~/Downloads                    # Interactive organize Downloads folder
  neatfolder --no-dry-run                   # Organize current directory without confirmation
  neatfolder --undo                         # Undo last operation
  neatfolder --stats                        # Show statistics
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
          default: true,
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
        "no-dry-run": {
          type: "boolean",
          default: false,
        },
        verbose: {
          type: "boolean",
          short: "v",
          default: true,
        },
        quiet: {
          type: "boolean",
          short: "q",
          default: false,
        },
        help: {
          type: "boolean",
          short: "h",
          default: false,
        },
        // Database operations
        undo: {
          type: "boolean",
          default: false,
        },
        redo: {
          type: "string",
          default: undefined,
        },
        history: {
          type: "boolean",
          default: false,
        },
        stats: {
          type: "boolean",
          default: false,
        },
        "show-structure": {
          type: "string",
          default: undefined,
        },
        "clear-history": {
          type: "boolean",
          default: false,
        },
        "export-history": {
          type: "string",
          default: undefined,
        },
        "database-path": {
          type: "string",
          default: undefined,
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

    // Handle dry-run vs no-dry-run logic
    const dryRun = values["no-dry-run"] ? false : Boolean(values["dry-run"]);

    // Handle verbose vs quiet logic
    const verbose = values.quiet ? false : Boolean(values.verbose);

    return {
      directory,
      method,
      recursive: Boolean(values.recursive),
      maxDepth,
      minSize,
      maxSize,
      ignoreDotfiles: Boolean(values["ignore-dotfiles"]),
      dryRun,
      verbose,
      quiet: Boolean(values.quiet),
      noDryRun: Boolean(values["no-dry-run"]),
      // Database operations
      undo: Boolean(values.undo),
      redo: typeof values.redo === "string" ? values.redo : undefined,
      history: Boolean(values.history),
      stats: Boolean(values.stats),
      showStructure:
        typeof values["show-structure"] === "string"
          ? values["show-structure"]
          : undefined,
      clearHistory: Boolean(values["clear-history"]),
      exportHistory:
        typeof values["export-history"] === "string"
          ? values["export-history"]
          : undefined,
      databasePath:
        typeof values["database-path"] === "string"
          ? values["database-path"]
          : undefined,
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

    // Create organizer with optional database path
    const organizer = new NeatFolder(options, cmdOptions.databasePath);

    // Handle database operations first
    let isDatabaseOperation = false;

    // Handle undo operation
    if (cmdOptions.undo) {
      isDatabaseOperation = true;
      // For boolean undo, just undo the last operation
      await organizer.undo();
    }

    // Handle redo operation
    if (cmdOptions.redo) {
      isDatabaseOperation = true;
      const undoOperationId = parseInt(cmdOptions.redo, 10);
      if (isNaN(undoOperationId)) {
        throw new Error(`Invalid undo operation ID: ${cmdOptions.redo}`);
      }
      await organizer.redo(undoOperationId);
    }

    // Handle history display
    if (cmdOptions.history) {
      isDatabaseOperation = true;
      // Show all history since we're using boolean
      await organizer.displayHistory();
    }

    // Handle stats display
    if (cmdOptions.stats) {
      isDatabaseOperation = true;
      await organizer.displayStats();
    }

    // Handle structure comparison
    if (cmdOptions.showStructure) {
      isDatabaseOperation = true;
      const operationId = parseInt(cmdOptions.showStructure, 10);
      if (isNaN(operationId)) {
        throw new Error(`Invalid operation ID: ${cmdOptions.showStructure}`);
      }
      await organizer.showStructureComparison(operationId);
    }

    // Handle clear history
    if (cmdOptions.clearHistory) {
      isDatabaseOperation = true;
      await organizer.clearHistory();
      console.log("\x1b[32m✅ Operation history cleared successfully\x1b[0m");
    }

    // Handle export history
    if (cmdOptions.exportHistory) {
      isDatabaseOperation = true;
      await organizer.exportHistory(cmdOptions.exportHistory);
      console.log(
        `\x1b[32m✅ History exported to ${cmdOptions.exportHistory}\x1b[0m`
      );
    }

    // If no database operations, perform normal organization
    if (!isDatabaseOperation) {
      // First, always do a dry run to show the preview
      const previewOptions: OrganizationOptions = {
        ...options,
        dryRun: true,
      };

      const previewOrganizer = new NeatFolder(
        previewOptions,
        cmdOptions.databasePath
      );
      console.log("📋 Previewing organization...\n");
      await previewOrganizer.organize(cmdOptions.directory);
      previewOrganizer.closeDatabase();

      // If dry-run was explicitly requested, stop here
      if (cmdOptions.dryRun) {
        return;
      }

      // If --no-dry-run was specified, skip confirmation and proceed
      if (cmdOptions.noDryRun) {
        console.log(
          "\n🚀 Proceeding with file organization (--no-dry-run specified)...\n"
        );
        await organizer.organize(cmdOptions.directory);
      } else {
        // Ask for confirmation
        console.log("\n" + "─".repeat(60));
        const shouldProceed = await askForConfirmation(
          "Do you want to proceed with moving the files as shown above?"
        );

        if (shouldProceed) {
          console.log("\n🚀 Proceeding with file organization...\n");
          await organizer.organize(cmdOptions.directory);
        } else {
          console.log("\n❌ Operation cancelled. No files were moved.");
        }
      }
    }
  } catch (error: any) {
    console.error(`\x1b[31m❌ Fatal error: ${error.message}\x1b[0m`);
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
