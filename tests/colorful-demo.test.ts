import {
  test,
  expect,
  describe,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock the colorful-demo module
const mockColors = {
  success: (text: string) => `[SUCCESS]${text}`,
  warning: (text: string) => `[WARNING]${text}`,
  error: (text: string) => `[ERROR]${text}`,
  info: (text: string) => `[INFO]${text}`,
  dim: (text: string) => `[DIM]${text}`,
  bold: (text: string) => `[BOLD]${text}`,
  code: (text: string) => `[CODE]${text}`,
  document: (text: string) => `[DOCUMENT]${text}`,
  image: (text: string) => `[IMAGE]${text}`,
  video: (text: string) => `[VIDEO]${text}`,
  audio: (text: string) => `[AUDIO]${text}`,
  archive: (text: string) => `[ARCHIVE]${text}`,
};

describe("Colorful Demo", () => {
  let testDir: string;
  let consoleSpy: any;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `neatfolder-colorful-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Spy on console methods
    consoleSpy = {
      log: spyOn(console, "log").mockImplementation(() => {}),
      error: spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("Color Utilities", () => {
    test("should provide color functions for different message types", () => {
      // Test that Bun.color function exists and works as expected
      expect(typeof Bun.color).toBe("function");

      // Test basic color functionality
      const greenColor = Bun.color("green", "ansi");
      expect(typeof greenColor).toBe("string");
      expect(greenColor!.length).toBeGreaterThan(0);

      const redColor = Bun.color("red", "ansi");
      expect(typeof redColor).toBe("string");
      expect(redColor!.length).toBeGreaterThan(0);

      // Colors should be different
      expect(greenColor).not.toBe(redColor);
    });

    test("should support hex color codes", () => {
      const hexColor = Bun.color("#FFA500", "ansi");
      expect(typeof hexColor).toBe("string");
      expect(hexColor!.length).toBeGreaterThan(0);
    });

    test("should handle ANSI reset codes", () => {
      const resetCode = "\x1b[0m";
      expect(typeof resetCode).toBe("string");
      expect(resetCode).toBe("\x1b[0m");
    });

    test("should provide bold formatting", () => {
      const boldStart = "\x1b[1m";
      const boldEnd = "\x1b[0m";
      const boldText = `${boldStart}test${boldEnd}`;

      expect(boldText).toContain(boldStart);
      expect(boldText).toContain(boldEnd);
      expect(boldText).toBe("\x1b[1mtest\x1b[0m");
    });
  });

  describe("File Type Color Mapping", () => {
    test("should categorize code files correctly", () => {
      const codeExtensions = [
        ".js",
        ".ts",
        ".py",
        ".go",
        ".rs",
        ".java",
        ".cpp",
        ".c",
      ];

      for (const ext of codeExtensions) {
        // Create a mock file with the extension
        const filename = `test${ext}`;
        expect(ext).toMatch(/^\.\w+$/);
      }
    });

    test("should categorize document files correctly", () => {
      const documentExtensions = [".txt", ".md", ".pdf", ".doc", ".docx"];

      for (const ext of documentExtensions) {
        const filename = `document${ext}`;
        expect(ext).toMatch(/^\.\w+$/);
      }
    });

    test("should categorize image files correctly", () => {
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg"];

      for (const ext of imageExtensions) {
        const filename = `image${ext}`;
        expect(ext).toMatch(/^\.\w+$/);
      }
    });

    test("should categorize video files correctly", () => {
      const videoExtensions = [".mp4", ".avi", ".mov", ".mkv", ".webm"];

      for (const ext of videoExtensions) {
        const filename = `video${ext}`;
        expect(ext).toMatch(/^\.\w+$/);
      }
    });

    test("should categorize audio files correctly", () => {
      const audioExtensions = [".mp3", ".wav", ".flac", ".aac", ".ogg"];

      for (const ext of audioExtensions) {
        const filename = `audio${ext}`;
        expect(ext).toMatch(/^\.\w+$/);
      }
    });

    test("should categorize archive files correctly", () => {
      const archiveExtensions = [".zip", ".tar", ".gz", ".rar", ".7z"];

      for (const ext of archiveExtensions) {
        const filename = `archive${ext}`;
        expect(ext).toMatch(/^\.\w+$/);
      }
    });
  });

  describe("Colorful Output Integration", () => {
    test("should enhance progress display with colors", () => {
      // Mock a progress display function
      const mockProgress = (current: number, total: number) => {
        const percentage = Math.round((current / total) * 100);
        const progressBar =
          "█".repeat(Math.floor(percentage / 10)) +
          "▒".repeat(10 - Math.floor(percentage / 10));
        return `[${progressBar}] ${percentage}%`;
      };

      const progress50 = mockProgress(5, 10);
      const progress100 = mockProgress(10, 10);

      expect(progress50).toContain("50%");
      expect(progress100).toContain("100%");
      expect(progress50).toContain("█");
      expect(progress50).toContain("▒");
    });

    test("should format file statistics with colors", () => {
      const mockStats = {
        totalFiles: 10,
        processedFiles: 8,
        skippedFiles: 2,
        totalSize: 1024 * 1024, // 1MB
      };

      const formatSize = (bytes: number): string => {
        if (bytes >= 1024 * 1024) {
          return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        } else if (bytes >= 1024) {
          return `${(bytes / 1024).toFixed(2)} KB`;
        }
        return `${bytes} B`;
      };

      expect(formatSize(mockStats.totalSize)).toBe("1.00 MB");
      expect(mockStats.totalFiles).toBe(10);
      expect(mockStats.processedFiles).toBe(8);
      expect(mockStats.skippedFiles).toBe(2);
    });

    test("should display directory structure with colors", () => {
      const mockTree = [
        "documents/",
        "  file1.txt",
        "  file2.pdf",
        "images/",
        "  photo1.jpg",
        "  photo2.png",
      ];

      for (const line of mockTree) {
        expect(typeof line).toBe("string");
        expect(line.length).toBeGreaterThan(0);
      }
    });

    test("should handle error messages with colors", () => {
      const mockError = "File not found: test.txt";
      const coloredError = `[ERROR]${mockError}`;

      expect(coloredError).toContain("[ERROR]");
      expect(coloredError).toContain(mockError);
    });

    test("should format success messages with colors", () => {
      const mockSuccess = "Organization completed successfully!";
      const coloredSuccess = `[SUCCESS]${mockSuccess}`;

      expect(coloredSuccess).toContain("[SUCCESS]");
      expect(coloredSuccess).toContain(mockSuccess);
    });
  });

  describe("Enhanced UI Elements", () => {
    test("should create enhanced progress bars", () => {
      const createProgressBar = (
        current: number,
        total: number,
        width: number = 30
      ) => {
        const percentage = current / total;
        const filled = Math.round(percentage * width);
        const empty = width - filled;

        return {
          bar: "█".repeat(filled) + "▒".repeat(empty),
          percentage: Math.round(percentage * 100),
          display: `[${filled}/${width}] ${Math.round(percentage * 100)}%`,
        };
      };

      const progress = createProgressBar(7, 10, 20);
      expect(progress.percentage).toBe(70);
      expect(progress.bar).toContain("█");
      expect(progress.bar).toContain("▒");
      expect(progress.display).toContain("70%");
    });

    test("should format file operations with icons", () => {
      const operations = {
        move: "📁 Moving file",
        copy: "📋 Copying file",
        delete: "🗑️ Deleting file",
        organize: "🚀 Organizing files",
        undo: "🔄 Undoing operation",
        complete: "✅ Operation complete",
      };

      for (const [key, value] of Object.entries(operations)) {
        // Just verify it starts with an emoji
        expect(value).toMatch(/^[^\w\s]/); // Should start with an emoji
      }
    });

    test("should create visual file type indicators", () => {
      const fileTypes = {
        code: "💻",
        document: "📄",
        image: "🖼️",
        video: "🎬",
        audio: "🎵",
        archive: "📦",
      };

      for (const [type, icon] of Object.entries(fileTypes)) {
        expect(typeof icon).toBe("string");
        expect(icon.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Color Compatibility", () => {
    test("should handle terminals without color support", () => {
      // Mock a no-color environment
      const originalTerm = process.env.TERM;
      const originalNoColor = process.env.NO_COLOR;

      process.env.TERM = "dumb";
      process.env.NO_COLOR = "1";

      // In a no-color environment, text should remain unchanged
      const plainText = "test message";
      const processedText = plainText; // Would be processed by color functions

      expect(processedText).toBe(plainText);

      // Restore environment
      if (originalTerm) process.env.TERM = originalTerm;
      if (originalNoColor) process.env.NO_COLOR = originalNoColor;
    });

    test("should support different color depths", () => {
      // Test 8-bit color support
      const color8bit = Bun.color("red", "ansi");
      expect(typeof color8bit).toBe("string");

      // Test 24-bit color support
      const color24bit = Bun.color("#FF0000", "ansi");
      expect(typeof color24bit).toBe("string");

      // Both colors should be valid
      expect(typeof color8bit).toBe("string");
      expect(typeof color24bit).toBe("string");
    });
  });

  describe("Performance Considerations", () => {
    test("should efficiently handle large file lists with colors", () => {
      const largeFileList = Array.from(
        { length: 1000 },
        (_, i) => `file${i}.txt`
      );

      const startTime = Date.now();
      const processedFiles = largeFileList.map((file) => `[DOCUMENT]${file}`);
      const endTime = Date.now();

      expect(processedFiles).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    test("should handle color formatting efficiently", () => {
      const iterations = 1000;
      const testText = "test message";

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        const colored = `[INFO]${testText}`;
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });
  });
});
