#!/usr/bin/env bun

import { NeatFolder } from "./neat-folder";
import type { OrganizationOptions } from "./types";

// Simple argument parser using Bun's built-in utilities
const parseArguments = () => {
  const args = Bun.argv.slice(2); // Bun.argv instead of process.argv
  const options: { [key: string]: any } = {
    directory: ".",
    method: "extension",
    recursive: false,
    maxDepth: 5,
    minSize: 0,
    maxSize: Infinity,
    ignoreDotfiles: false,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-m":
      case "--method":
        options.method = args[++i];
        break;
      case "-r":
      case "--recursive":
        options.recursive = true;
        break;
      case "-d":
      case "--max-depth":
        options.maxDepth = parseInt(args[++i], 10);
        break;
      case "--min-size":
        options.minSize = parseInt(args[++i], 10);
        break;
      case "--max-size":
        options.maxSize = parseInt(args[++i], 10);
        break;
      case "--ignore-dotfiles":
        options.ignoreDotfiles = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "-v":
      case "--verbose":
        options.verbose = true;
        break;
      case "-h":
      case "--help":
        console.log(`
NeatFolder - Organize files by type, name, date, or size

Usage: neatfolder [directory] [options]

Options:
  -m, --method <type>     Organization method: extension|name|date|size (default: extension)
  -r, --recursive         Include subdirectories
  -d, --max-depth <n>     Maximum directory depth (default: 5)
  --min-size <bytes>      Minimum file size filter
  --max-size <bytes>      Maximum file size filter
  --ignore-dotfiles       Skip hidden files
  --dry-run               Preview changes without moving files
  -v, --verbose           Show detailed output
  -h, --help              Show this help message

Examples:
  neatfolder ~/Downloads                    # Organize by file extension
  neatfolder ~/Documents -m name -r         # Organize by name, recursive
  neatfolder . --dry-run                    # Preview organization
        `);
        process.exit(0);
        break;
      default:
        if (!arg.startsWith("-")) {
          options.directory = arg;
        } else {
          console.warn(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  return options;
};

const main = async () => {
  const cmdOptions = parseArguments();

  try {
    const validMethods = ["extension", "name", "date", "size"];
    if (!validMethods.includes(cmdOptions.method)) {
      throw new Error(
        `Invalid method: ${
          cmdOptions.method
        }. Valid options: ${validMethods.join(", ")}`
      );
    }

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

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
