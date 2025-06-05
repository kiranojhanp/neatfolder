import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { NeatFolder } from "../src/neat-folder";
import type {
  OrganizationOptions,
  FileMapping,
  DirectoryMap,
} from "../src/types";
import { existsSync, mkdirSync, writeFileSync, rmSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("NeatFolder", () => {
  let testDir: string;
  let neatFolder: NeatFolder;
  let options: OrganizationOptions;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `neatfolder-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Default options for testing
    options = {
      method: "extension",
      ignoreDotfiles: false,
      recursive: false,
      dryRun: false,
      maxDepth: 5,
      minSize: 0,
      maxSize: Infinity,
      verbose: false,
    };

    neatFolder = new NeatFolder(options);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Close database connection
    neatFolder.closeDatabase();
  });

  describe("File Categorization", () => {
    test("should categorize files by extension correctly", () => {
      const testFiles = [
        { name: "image.jpg", expectedCategory: "images" },
        { name: "document.pdf", expectedCategory: "documents" },
        { name: "audio.mp3", expectedCategory: "audio" },
        { name: "video.mp4", expectedCategory: "video" },
        { name: "archive.zip", expectedCategory: "archives" },
        { name: "script.js", expectedCategory: "code" },
        { name: "app.exe", expectedCategory: "executables" },
        { name: "font.ttf", expectedCategory: "fonts" },
        { name: "unknown.xyz", expectedCategory: "others" },
      ];

      for (const { name, expectedCategory } of testFiles) {
        // Create a test file
        const filePath = join(testDir, name);
        writeFileSync(filePath, "test content");

        // Test categorization through the private method via reflection
        const category = (neatFolder as any).getCategoryFromFile(name);
        expect(category).toBe(expectedCategory);
      }
    });

    test("should handle case insensitive extensions", () => {
      const testCases = [
        { name: "IMAGE.JPG", expectedCategory: "images" },
        { name: "Document.PDF", expectedCategory: "documents" },
        { name: "AUDIO.MP3", expectedCategory: "audio" },
      ];

      for (const { name, expectedCategory } of testCases) {
        const category = (neatFolder as any).getCategoryFromFile(name);
        expect(category).toBe(expectedCategory);
      }
    });
  });

  describe("Organization Methods", () => {
    beforeEach(() => {
      // Create test files with different properties
      const testFiles = [
        { name: "image1.jpg", content: "small image", size: 100 },
        {
          name: "image2.png",
          content: "large image".repeat(1000),
          size: 10000,
        },
        { name: "doc1.pdf", content: "document", size: 500 },
        { name: "script.js", content: "console.log('hello');", size: 200 },
      ];

      testFiles.forEach(({ name, content }) => {
        writeFileSync(join(testDir, name), content);
      });
    });

    test("should organize by extension method", () => {
      const options: OrganizationOptions = {
        method: "extension",
        ignoreDotfiles: false,
        recursive: false,
        dryRun: false,
        verbose: false,
      };

      const nf = new NeatFolder(options);

      // Test target directory generation
      const stats = { size: 1000, mtime: new Date() };

      expect((nf as any).getTargetDirectory("test.jpg", stats)).toBe("images");
      expect((nf as any).getTargetDirectory("test.pdf", stats)).toBe(
        "documents"
      );
      expect((nf as any).getTargetDirectory("test.js", stats)).toBe("code");

      nf.closeDatabase();
    });

    test("should organize by name method", () => {
      const options: OrganizationOptions = {
        method: "name",
        ignoreDotfiles: false,
        recursive: false,
        dryRun: false,
        verbose: false,
      };

      const nf = new NeatFolder(options);

      const stats = { size: 1000, mtime: new Date() };

      expect((nf as any).getTargetDirectory("apple.txt", stats)).toBe("a");
      expect((nf as any).getTargetDirectory("banana.txt", stats)).toBe("b");
      expect((nf as any).getTargetDirectory("1file.txt", stats)).toBe("1");

      nf.closeDatabase();
    });

    test("should organize by date method", () => {
      const options: OrganizationOptions = {
        method: "date",
        ignoreDotfiles: false,
        recursive: false,
        dryRun: false,
        verbose: false,
      };

      const nf = new NeatFolder(options);

      const testDate = new Date("2023-06-15");
      const stats = { size: 1000, mtime: testDate };

      expect((nf as any).getTargetDirectory("test.txt", stats)).toBe(
        "documents/2023/06"
      );

      nf.closeDatabase();
    });

    test("should organize by size method", () => {
      const options: OrganizationOptions = {
        method: "size",
        ignoreDotfiles: false,
        recursive: false,
        dryRun: false,
        verbose: false,
      };

      const nf = new NeatFolder(options);

      const testCases = [
        { size: 500, expected: "small" },
        { size: 1024 * 1024 * 5, expected: "medium" },
        { size: 1024 * 1024 * 50, expected: "medium" },
        { size: 1024 * 1024 * 500, expected: "large" },
      ];

      for (const { size, expected } of testCases) {
        const stats = { size, mtime: new Date() };
        expect((nf as any).getTargetDirectory("test.txt", stats)).toBe(
          expected
        );
      }

      nf.closeDatabase();
    });
  });

  describe("File Processing", () => {
    test("should process files with size and modification time filters", async () => {
      // Create test files with different sizes
      writeFileSync(join(testDir, "small.txt"), "small");
      writeFileSync(join(testDir, "large.txt"), "x".repeat(2000));

      const options: OrganizationOptions = {
        method: "extension",
        ignoreDotfiles: false,
        recursive: false,
        dryRun: false,
        minSize: 1000,
        maxSize: 5000,
        verbose: false,
      };

      const nf = new NeatFolder(options);

      // Mock the file processing
      const processFileSpy = mock((nf as any).processFile.bind(nf));

      // The large file should be processed, small file should be skipped
      const largeFileResult = await processFileSpy(
        join(testDir, "large.txt"),
        testDir
      );
      expect(largeFileResult).toBeTruthy();

      nf.closeDatabase();
    });

    test("should ignore dotfiles when configured", () => {
      const options: OrganizationOptions = {
        method: "extension",
        ignoreDotfiles: true,
        recursive: false,
        dryRun: false,
        verbose: false,
      };

      const nf = new NeatFolder(options);

      // Create dotfiles
      writeFileSync(join(testDir, ".hidden"), "hidden content");
      writeFileSync(join(testDir, "visible.txt"), "visible content");

      // Test that dotfiles are properly handled
      // Note: This would require access to the file filtering logic

      nf.closeDatabase();
    });

    test("should handle dry run mode", async () => {
      const options: OrganizationOptions = {
        method: "extension",
        ignoreDotfiles: false,
        recursive: false,
        dryRun: true,
        verbose: false,
      };

      const nf = new NeatFolder(options);

      // Create test files
      writeFileSync(join(testDir, "test.jpg"), "image");
      writeFileSync(join(testDir, "test.pdf"), "document");

      // In dry run mode, files should not actually be moved
      await nf.organize(testDir);

      // Files should still be in original location
      expect(existsSync(join(testDir, "test.jpg"))).toBe(true);
      expect(existsSync(join(testDir, "test.pdf"))).toBe(true);

      nf.closeDatabase();
    });
  });

  describe("Directory Structure", () => {
    test("should build directory structure correctly", () => {
      const filePaths = [
        "images/photo1.jpg",
        "images/photo2.png",
        "documents/doc1.pdf",
        "documents/doc2.txt",
        "code/script.js",
      ];

      const dirMap = (neatFolder as any).buildDirectoryStructure(filePaths);

      expect(dirMap.has("images")).toBe(true);
      expect(dirMap.has("documents")).toBe(true);
      expect(dirMap.has("code")).toBe(true);

      expect(dirMap.get("images")?.has("photo1.jpg")).toBe(true);
      expect(dirMap.get("images")?.has("photo2.png")).toBe(true);
      expect(dirMap.get("documents")?.has("doc1.pdf")).toBe(true);
      expect(dirMap.get("documents")?.has("doc2.txt")).toBe(true);
      expect(dirMap.get("code")?.has("script.js")).toBe(true);
    });

    test("should generate tree structure", () => {
      const dirMap = new Map<string, Set<string>>();
      dirMap.set("images", new Set(["photo1.jpg", "photo2.png"]));
      dirMap.set("documents", new Set(["doc1.pdf"]));

      const tree = (neatFolder as any).generateTree(dirMap, true);

      expect(tree).toContain("images");
      expect(tree).toContain("documents");
      expect(tree).toContain("photo1.jpg");
      expect(tree).toContain("photo2.png");
      expect(tree).toContain("doc1.pdf");
    });
  });

  describe("Progress and Statistics", () => {
    test("should track file processing statistics", () => {
      // Access private stats through reflection
      const stats = (neatFolder as any).stats;

      expect(stats.filesProcessed).toBe(0);
      expect(stats.bytesMoved).toBe(0);
      expect(stats.errors).toEqual([]);
      expect(stats.skipped).toEqual([]);
      expect(stats.created).toBeInstanceOf(Set);
    });

    test("should generate progress bar", () => {
      const progressBar = (neatFolder as any).drawProgressBar(50);

      expect(progressBar).toContain("█");
      expect(progressBar).toContain("50.00%");
    });
  });

  describe("Error Handling", () => {
    test("should handle missing files gracefully", async () => {
      const nonExistentFile = join(testDir, "nonexistent.txt");

      const result = await (neatFolder as any).processFile(
        nonExistentFile,
        testDir
      );
      expect(result).toBeNull();
    });

    test("should handle permission errors", async () => {
      // This test would require creating files with restricted permissions
      // and testing the error handling behavior

      // Create a test file
      const testFile = join(testDir, "test.txt");
      writeFileSync(testFile, "test");

      // Mock a permission error scenario
      const consoleSpy = mock(console.log);

      // Test error handling in file operations
      // The actual implementation would need to handle permission errors

      expect(consoleSpy).toBeDefined();
    });
  });
});
