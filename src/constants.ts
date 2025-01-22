export const ANSI_STYLES = {
  BOLD: "\x1b[1m",
  RESET: "\x1b[0m",
  BLUE: "\x1b[34m",
  GREEN: "\x1b[32m",
  CYAN: "\x1b[36m",
} as const;

export const FILE_CATEGORIES = new Map([
  [/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i, "images"],
  [/\.(pdf|doc|docx|txt|md|rtf|odt|xlsx|xls|csv)$/i, "documents"],
  [/\.(mp3|wav|flac|m4a|aac|ogg|wma)$/i, "audio"],
  [/\.(mp4|avi|mkv|mov|wmv|flv|webm)$/i, "video"],
  [/\.(zip|rar|7z|tar|gz|bz2)$/i, "archives"],
  [/\.(js|ts|py|java|cpp|cs|php|html|css|json|xml)$/i, "code"],
  [/\.(exe|msi|app|dmg|apk)$/i, "executables"],
  [/\.(ttf|otf|woff|woff2)$/i, "fonts"],
]);

export const TREE_SYMBOLS = {
  ANSI: {
    BRANCH: "├── ",
    EMPTY: "",
    INDENT: " ",
    LAST_BRANCH: "└── ",
    VERTICAL: "│ ",
  } as const,

  ASCII: {
    BRANCH: "|-- ",
    EMPTY: "",
    INDENT: " ",
    LAST_BRANCH: "`-- ",
    VERTICAL: "| ",
  } as const,
} as const;
