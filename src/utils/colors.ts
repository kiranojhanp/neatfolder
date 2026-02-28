import { CATEGORY_EXTENSIONS } from "../constants";

/**
 * Color utility functions for terminal output
 * Uses Bun's color API with ansi codes for better cross-terminal compatibility
 */

// ANSI reset code for proper color termination
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

// Color palette constants
const COLORS = {
  GREEN: "green",
  YELLOW: "yellow",
  RED: "red",
  CYAN: "cyan",
  GRAY: "#666666",
  ORANGE: "#FFA500", // For code files
  ROYAL_BLUE: "#4169E1", // For document files
  ORCHID: "#DA70D6", // For image files
  TURQUOISE: "#00CED1", // For video files
  LIME_GREEN: "#32CD32", // For audio files
  CRIMSON: "#DC143C", // For archive files
};

// Helper function to color text with proper reset
const colorize = (text: string, color: string): string => {
  return `${Bun.color(color, "ansi")}${text}${RESET}`;
};

export const colors = {
  // Status colors
  success: (text: string) => colorize(text, COLORS.GREEN),
  warning: (text: string) => colorize(text, COLORS.YELLOW),
  error: (text: string) => colorize(text, COLORS.RED),
  info: (text: string) => colorize(text, COLORS.CYAN),
  dim: (text: string) => colorize(text, COLORS.GRAY),
  bold: (text: string) => `${BOLD}${text}${RESET}`,

  // File type colors with vibrant, distinct colors
  code: (text: string) => colorize(text, COLORS.ORANGE),
  document: (text: string) => colorize(text, COLORS.ROYAL_BLUE),
  image: (text: string) => colorize(text, COLORS.ORCHID),
  video: (text: string) => colorize(text, COLORS.TURQUOISE),
  audio: (text: string) => colorize(text, COLORS.LIME_GREEN),
  archive: (text: string) => colorize(text, COLORS.CRIMSON),
};

const CATEGORY_COLOR: Record<string, (text: string) => string> = {
  code: colors.code,
  documents: colors.document,
  images: colors.image,
  video: colors.video,
  audio: colors.audio,
  archives: colors.archive,
};

/**
 * Returns a color function for a specific file type based on extension
 * @param extension File extension (with or without dot)
 * @returns A function that applies appropriate color to text
 */
export const getFileTypeColor = (
  extension: string
): ((text: string) => string) => {
  const normalizedExtension = extension.replace(/^\./, "").toLowerCase();

  for (const [category, extensions] of Object.entries(CATEGORY_EXTENSIONS)) {
    if ((extensions as readonly string[]).includes(normalizedExtension)) {
      return CATEGORY_COLOR[category] ?? ((text: string) => text);
    }
  }

  return (text: string) => text;
};

/**
 * Directory name keywords that map to specific categories
 */
const DIR_KEYWORDS = {
  CODE: ["code", "script", "src", "source"],
  DOCUMENT: ["doc", "text", "document", "paper"],
  IMAGE: ["image", "photo", "picture", "graphic"],
  VIDEO: ["video", "movie", "film", "clip"],
  AUDIO: ["audio", "music", "sound", "mp3"],
  ARCHIVE: ["archive", "zip", "compressed", "backup"],
};

/**
 * Returns a color function for directory name based on content type
 * @param dirName Directory name
 * @returns A function that applies appropriate color to text
 */
export const getDirColor = (dirName: string): ((text: string) => string) => {
  const name = dirName.toLowerCase();

  // Check each category for keyword matches
  for (const [category, keywords] of Object.entries(DIR_KEYWORDS)) {
    if (keywords.some((keyword) => name.includes(keyword))) {
      switch (category) {
        case "CODE":
          return colors.code;
        case "DOCUMENT":
          return colors.document;
        case "IMAGE":
          return colors.image;
        case "VIDEO":
          return colors.video;
        case "AUDIO":
          return colors.audio;
        case "ARCHIVE":
          return colors.archive;
      }
    }
  }

  // Default color for directories
  return colors.info;
};
