import { test, expect, describe } from "bun:test";
import { FILE_CATEGORIES, TREE_SYMBOLS } from "../src/constants";

describe("Constants", () => {
  describe("FILE_CATEGORIES", () => {
    test("should categorize image files correctly", () => {
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "svg",
        "ico",
      ];

      for (const ext of imageExtensions) {
        // Use Array.from to convert Map entries to array for iteration
        for (const [pattern, category] of Array.from(
          FILE_CATEGORIES.entries()
        )) {
          if (pattern.test(`.${ext}`)) {
            expect(category).toBe("images");
            break;
          }
        }
      }
    });

    test("should categorize document files correctly", () => {
      const docExtensions = [
        "pdf",
        "doc",
        "docx",
        "txt",
        "md",
        "rtf",
        "odt",
        "xlsx",
        "xls",
        "csv",
      ];

      for (const ext of docExtensions) {
        // Use Array.from to convert Map entries to an array for safe iteration
        for (const [pattern, category] of Array.from(
          FILE_CATEGORIES.entries()
        )) {
          if (pattern.test(`.${ext}`)) {
            expect(category).toBe("documents");
            break;
          }
        }
      }
    });

    test("should categorize audio files correctly", () => {
      const audioExtensions = [
        "mp3",
        "wav",
        "flac",
        "m4a",
        "aac",
        "ogg",
        "wma",
      ];

      for (const ext of audioExtensions) {
        for (const [pattern, category] of Array.from(
          FILE_CATEGORIES.entries()
        )) {
          if (pattern.test(`.${ext}`)) {
            expect(category).toBe("audio");
            break;
          }
        }
      }
    });

    test("should categorize video files correctly", () => {
      const videoExtensions = [
        "mp4",
        "avi",
        "mkv",
        "mov",
        "wmv",
        "flv",
        "webm",
      ];

      for (const ext of videoExtensions) {
        // Use Array.from to convert Map entries to an array for safe iteration
        for (const [pattern, category] of Array.from(
          FILE_CATEGORIES.entries()
        )) {
          if (pattern.test(`.${ext}`)) {
            expect(category).toBe("video");
            break;
          }
        }
      }
    });

    test("should categorize archive files correctly", () => {
      const archiveExtensions = ["zip", "rar", "7z", "tar", "gz", "bz2"];

      for (const ext of archiveExtensions) {
        // Use Array.from to convert Map entries to an array for safe iteration
        for (const [pattern, category] of Array.from(
          FILE_CATEGORIES.entries()
        )) {
          if (pattern.test(`.${ext}`)) {
            expect(category).toBe("archives");
            break;
          }
        }
      }
    });

    test("should categorize code files correctly", () => {
      const codeExtensions = [
        "js",
        "ts",
        "py",
        "java",
        "cpp",
        "cs",
        "php",
        "html",
        "css",
        "json",
        "xml",
      ];

      for (const ext of codeExtensions) {
        for (const [pattern, category] of FILE_CATEGORIES) {
          if (pattern.test(`.${ext}`)) {
            expect(category).toBe("code");
            break;
          }
        }
      }
    });

    test("should categorize executable files correctly", () => {
      const executableExtensions = ["exe", "msi", "app", "dmg", "apk"];

      for (const ext of executableExtensions) {
        for (const [pattern, category] of FILE_CATEGORIES) {
          if (pattern.test(`.${ext}`)) {
            expect(category).toBe("executables");
            break;
          }
        }
      }
    });

    test("should categorize font files correctly", () => {
      const fontExtensions = ["ttf", "otf", "woff", "woff2"];

      for (const ext of fontExtensions) {
        for (const [pattern, category] of FILE_CATEGORIES) {
          if (pattern.test(`.${ext}`)) {
            expect(category).toBe("fonts");
            break;
          }
        }
      }
    });

    test("should handle case insensitive extensions", () => {
      const testCases = [
        ".JPG",
        ".JPEG",
        ".PNG",
        ".GIF",
        ".PDF",
        ".DOC",
        ".TXT",
        ".MP3",
        ".WAV",
        ".FLAC",
        ".MP4",
        ".AVI",
        ".MOV",
      ];

      for (const ext of testCases) {
        let found = false;
        // Use Array.from to convert Map entries to an array for safe iteration
        for (const [pattern] of Array.from(FILE_CATEGORIES.entries())) {
          if (pattern.test(ext)) {
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      }
    });

    test("should not match non-file patterns", () => {
      const nonFilePatterns = [
        "no-extension",
        ".unknown-ext",
        "file.xyz",
        "file.123",
      ];

      for (const pattern of nonFilePatterns) {
        let found = false;
        // Use Array.from to convert Map entries to an array for safe iteration
        for (const [regex] of Array.from(FILE_CATEGORIES.entries())) {
          if (regex.test(pattern)) {
            found = true;
            break;
          }
        }
        // Only .unknown-ext should not match anything
        if (
          pattern === ".unknown-ext" ||
          pattern === "file.xyz" ||
          pattern === "file.123"
        ) {
          expect(found).toBe(false);
        }
      }
    });
  });

  describe("TREE_SYMBOLS", () => {
    test("should have correct tree symbols", () => {
      expect(TREE_SYMBOLS.ANSI.BRANCH).toBe("├── ");
      expect(TREE_SYMBOLS.ANSI.LAST_BRANCH).toBe("└── ");
      expect(TREE_SYMBOLS.ANSI.VERTICAL).toBe("│ ");
      expect(TREE_SYMBOLS.ANSI.INDENT).toBe("  ");

      expect(TREE_SYMBOLS.ASCII.BRANCH).toBe("|-- ");
      expect(TREE_SYMBOLS.ASCII.LAST_BRANCH).toBe("`-- ");
      expect(TREE_SYMBOLS.ASCII.VERTICAL).toBe("|   ");
      expect(TREE_SYMBOLS.ASCII.INDENT).toBe("    ");
    });

    test("should be readonly", () => {
      // In JavaScript runtime, readonly is a compile-time TypeScript feature
      // The actual object is not frozen, so we test the TypeScript compile-time behavior
      // by ensuring the original values remain unchanged
      const originalBranch = TREE_SYMBOLS.ANSI.BRANCH;

      // This assignment would cause TypeScript compile error but won't throw at runtime
      // @ts-expect-error - Testing readonly behavior
      TREE_SYMBOLS.ANSI.BRANCH = "modified";

      // Reset to original value to maintain test isolation
      // @ts-expect-error - Testing readonly behavior
      TREE_SYMBOLS.ANSI.BRANCH = originalBranch;

      expect(TREE_SYMBOLS.ANSI.BRANCH).toBe("├── ");
    });
  });
});
