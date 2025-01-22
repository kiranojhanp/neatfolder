import { NeatFolder } from "./neat-folder";
import { FILE_CATEGORIES } from "./constants";
import { ProgressService } from "./services/progress";
import { FileSystemService } from "./services/fsystem";
import { FileCategorizationService } from "./services/fcategorize";

import type { OrganizationOptions } from "./types";

const parseArguments = () => {
  const args = process.argv.slice(2);
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
    if (
      !validMethods.includes(cmdOptions.method) &&
      cmdOptions.method !== undefined
    ) {
      throw new Error(`Invalid method: ${cmdOptions.method}`);
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

    const fs = new FileSystemService();
    const categorizer = new FileCategorizationService(FILE_CATEGORIES);
    const progress = new ProgressService();
    const organizer = new NeatFolder(options, fs, categorizer, progress);

    await organizer.organize(cmdOptions.directory);
  } catch (error: any) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
};

main();
