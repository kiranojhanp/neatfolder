import { FILE_CATEGORIES } from "../constants";
import type { GroupingMethod } from "../types";
import path from "path";
import fs from "fs";

/**
 * Parses human-readable file size strings (e.g. "1MB", "500KB", "2GB") into bytes
 * @param sizeStr The size string to parse
 * @returns Size in bytes
 */
export const parseSize = (sizeStr: string): number => {
  if (!sizeStr || sizeStr === "0") return 0;
  if (sizeStr === "Infinity" || sizeStr === "") return Infinity;

  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) {
    throw new Error(
      `Invalid size format: ${sizeStr}. Use formats like: 100, 1KB, 2MB, 1.5GB`
    );
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase();

  const BYTE = 1;
  const KB = BYTE * 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const TB = GB * 1024;

  const multipliers: Record<string, number> = {
    B: BYTE,
    KB,
    MB,
    GB,
    TB,
  };

  return value * multipliers[unit];
};

/**
 * Formats size in bytes to a human-readable string
 * @param bytes Size in bytes
 * @param decimals Number of decimal places
 * @returns Formatted size string (e.g. "1.5 MB")
 */
export const formatSize = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 B";

  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const factor = 1024;

  // Find the appropriate unit for the given byte size
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(factor)),
    sizes.length - 1
  );

  // Format with the specified number of decimals
  const formattedValue = (bytes / Math.pow(factor, i)).toFixed(decimals);

  // Remove trailing zeros if they exist after decimal point
  const cleanedValue = parseFloat(formattedValue);

  return `${cleanedValue} ${sizes[i]}`;
};

/**
 * Gets the file category based on the file extension
 * @param filename The filename to categorize
 * @returns Category name as a string
 */
export const getCategoryFromFile = (filename: string): string => {
  // Convert filename to lowercase for case-insensitive matching
  const lowerFilename = filename.toLowerCase();

  for (const [pattern, category] of FILE_CATEGORIES) {
    if (pattern.test(lowerFilename)) {
      return category;
    }
  }

  // Default category for unrecognized file types
  return "others";
};

/**
 * Formats a date as YYYY-MM-DD
 * @param date The date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Safely creates a directory if it doesn't exist
 * @param directoryPath The directory path to create
 */
export const ensureDirectoryExists = (directoryPath: string): void => {
  try {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  } catch (error) {
    throw new Error(
      `Failed to create directory ${directoryPath}: ${(error as Error).message}`
    );
  }
};

/**
 * Gets a target directory name based on organization method and file properties
 * @param file Filename
 * @param stats File stats (size, modification time)
 * @param method Organization method
 * @returns Target directory name
 */
export const getTargetDirectory = (
  file: string,
  stats: { size: number; mtime: Date },
  method: GroupingMethod
): string => {
  switch (method) {
    case "extension":
      return getCategoryFromFile(file);

    case "name": {
      const firstChar = path.basename(file)[0]?.toLowerCase() || "0";
      return /[a-z0-9]/.test(firstChar) ? firstChar : "other";
    }

    case "date": {
      const date = stats.mtime;
      return `documents/${date.getFullYear()}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
    }

    case "size": {
      if (stats.size < 1024 * 1024) return "small";
      if (stats.size < 100 * 1024 * 1024) return "medium";
      return "large";
    }

    default:
      // Default to category-based organization
      return getCategoryFromFile(file);
  }
};
