export const CATEGORY_EXTENSIONS = {
  images: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"],
  documents: ["pdf", "doc", "docx", "txt", "md", "rtf", "odt", "xlsx", "xls", "csv"],
  audio: ["mp3", "wav", "flac", "m4a", "aac", "ogg", "wma"],
  video: ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"],
  archives: ["zip", "rar", "7z", "tar", "gz", "bz2"],
  code: ["js", "ts", "py", "java", "cpp", "cs", "php", "html", "css", "json", "xml"],
  executables: ["exe", "msi", "app", "dmg", "apk"],
  fonts: ["ttf", "otf", "woff", "woff2"],
} as const;

const extensionPattern = (extensions: readonly string[]): RegExp => {
  const pattern = extensions.map((extension) => extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`\\.(${pattern})$`, "i");
};

export const FILE_CATEGORIES = new Map<RegExp, string>(
  Object.entries(CATEGORY_EXTENSIONS).map(([category, extensions]) => [extensionPattern(extensions), category])
);

export const TREE_SYMBOLS = {
  ANSI: {
    BRANCH: "├── ",
    LAST_BRANCH: "└── ",
    VERTICAL: "│ ",
    INDENT: "  ",
  },
  ASCII: {
    BRANCH: "|-- ",
    LAST_BRANCH: "`-- ",
    VERTICAL: "|   ",
    INDENT: "    ",
  },
} as const;
