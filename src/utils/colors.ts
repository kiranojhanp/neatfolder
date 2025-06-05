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

/**
 * File extension categories for consistent coloring
 */
const FILE_EXTENSIONS = {
  CODE: [
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
    ".php",
    ".rb",
    ".swift",
    ".kt",
    ".cs",
    ".html",
    ".css",
  ],
  DOCUMENT: [
    ".txt",
    ".md",
    ".pdf",
    ".doc",
    ".docx",
    ".rtf",
    ".odt",
    ".xlsx",
    ".xls",
    ".csv",
    ".ppt",
    ".pptx",
  ],
  IMAGE: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".svg",
    ".webp",
    ".ico",
    ".tiff",
    ".raw",
  ],
  VIDEO: [
    ".mp4",
    ".avi",
    ".mov",
    ".mkv",
    ".webm",
    ".flv",
    ".wmv",
    ".m4v",
    ".mpg",
    ".mpeg",
    ".3gp",
  ],
  AUDIO: [
    ".mp3",
    ".wav",
    ".flac",
    ".aac",
    ".ogg",
    ".m4a",
    ".wma",
    ".opus",
    ".alac",
    ".aiff",
  ],
  ARCHIVE: [
    ".zip",
    ".tar",
    ".gz",
    ".rar",
    ".7z",
    ".bz2",
    ".xz",
    ".iso",
    ".tgz",
    ".tbz2",
  ],
};

/**
 * Returns a color function for a specific file type based on extension
 * @param extension File extension (with or without dot)
 * @returns A function that applies appropriate color to text
 */
export const getFileTypeColor = (
  extension: string
): ((text: string) => string) => {
  // Ensure extension starts with a dot and is lowercase
  const ext = extension.startsWith(".")
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;

  if (FILE_EXTENSIONS.CODE.includes(ext)) return colors.code;
  if (FILE_EXTENSIONS.DOCUMENT.includes(ext)) return colors.document;
  if (FILE_EXTENSIONS.IMAGE.includes(ext)) return colors.image;
  if (FILE_EXTENSIONS.VIDEO.includes(ext)) return colors.video;
  if (FILE_EXTENSIONS.AUDIO.includes(ext)) return colors.audio;
  if (FILE_EXTENSIONS.ARCHIVE.includes(ext)) return colors.archive;

  // Default: no color for unknown types
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
