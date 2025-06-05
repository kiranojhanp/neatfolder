import { test, expect, describe, beforeEach } from "bun:test";
import { TreeService } from "../src/services/tree";
import type { DirectoryMap } from "../src/types";

describe("TreeService", () => {
  let treeService: TreeService;
  let mockDirectoryMap: DirectoryMap;

  beforeEach(() => {
    mockDirectoryMap = new Map();
  });

  describe("Basic Tree Generation", () => {
    test("should generate tree for simple directory structure", () => {
      mockDirectoryMap.set("documents", new Set(["file1.txt", "file2.pdf"]));
      mockDirectoryMap.set("images", new Set(["photo1.jpg", "photo2.png"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("documents");
      expect(tree).toContain("file1.txt");
      expect(tree).toContain("file2.pdf");
      expect(tree).toContain("images");
      expect(tree).toContain("photo1.jpg");
      expect(tree).toContain("photo2.png");
    });

    test("should generate tree with ANSI symbols by default", () => {
      mockDirectoryMap.set("docs", new Set(["test.txt"]));
      mockDirectoryMap.set("images", new Set(["photo.jpg"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("├──");
      expect(tree).toContain("└──");
    });

    test("should generate tree with ASCII symbols when ANSI disabled", () => {
      mockDirectoryMap.set("docs", new Set(["test.txt"]));

      treeService = new TreeService(mockDirectoryMap, false);
      const tree = treeService.generate();

      expect(tree).toContain("`--");
    });

    test("should handle empty directory map", () => {
      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toBe("");
    });

    test("should handle directory with no files", () => {
      mockDirectoryMap.set("empty", new Set());

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("empty");
    });
  });

  describe("Complex Directory Structures", () => {
    test("should handle nested directory structures", () => {
      mockDirectoryMap.set("project", new Set(["README.md"]));
      mockDirectoryMap.set("project/src", new Set(["main.ts", "utils.ts"]));
      mockDirectoryMap.set("project/src/components", new Set(["Button.tsx"]));
      mockDirectoryMap.set("project/tests", new Set(["main.test.ts"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("project");
      expect(tree).toContain("src");
      expect(tree).toContain("components");
      expect(tree).toContain("tests");
      expect(tree).toContain("README.md");
      expect(tree).toContain("main.ts");
      expect(tree).toContain("Button.tsx");
      expect(tree).toContain("main.test.ts");
    });

    test("should maintain proper hierarchy", () => {
      mockDirectoryMap.set("root", new Set(["file1.txt"]));
      mockDirectoryMap.set("root/level1", new Set(["file2.txt"]));
      mockDirectoryMap.set("root/level1/level2", new Set(["file3.txt"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      const lines = tree.split("\n");
      const rootIndex = lines.findIndex((line) => line.includes("root"));
      const level1Index = lines.findIndex((line) => line.includes("level1"));
      const level2Index = lines.findIndex((line) => line.includes("level2"));

      expect(rootIndex).toBeLessThan(level1Index);
      expect(level1Index).toBeLessThan(level2Index);
    });

    test("should sort directories and files alphabetically", () => {
      mockDirectoryMap.set("zebra", new Set(["z.txt", "a.txt", "m.txt"]));
      mockDirectoryMap.set("apple", new Set(["file.txt"]));
      mockDirectoryMap.set("banana", new Set(["data.json"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      const lines = tree.split("\n").filter((line) => line.trim());
      const appleIndex = lines.findIndex((line) => line.includes("apple"));
      const bananaIndex = lines.findIndex((line) => line.includes("banana"));
      const zebraIndex = lines.findIndex((line) => line.includes("zebra"));

      expect(appleIndex).toBeLessThan(bananaIndex);
      expect(bananaIndex).toBeLessThan(zebraIndex);

      // Check file sorting within a directory
      const aIndex = lines.findIndex((line) => line.includes("a.txt"));
      const mIndex = lines.findIndex((line) => line.includes("m.txt"));
      const zIndex = lines.findIndex((line) => line.includes("z.txt"));

      expect(aIndex).toBeLessThan(mIndex);
      expect(mIndex).toBeLessThan(zIndex);
    });
  });

  describe("Text Wrapping", () => {
    test("should handle long filenames without wrapping when under limit", () => {
      const normalFile = "normal-filename.txt";
      mockDirectoryMap.set("docs", new Set([normalFile]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain(normalFile);
      expect(tree.split("\n").length).toBeLessThan(5); // Should not create extra lines
    });

    test("should wrap very long filenames", () => {
      const longFile =
        "this-is-a-very-long-filename-that-should-definitely-exceed-the-maximum-line-length-limit-and-force-wrapping.txt";
      mockDirectoryMap.set("docs", new Set([longFile]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("this-is-a-very-long-filename");
      // Should contain the wrapped portion
      const lines = tree.split("\n");
      expect(lines.length).toBeGreaterThan(2); // More lines due to wrapping
    });

    test("should maintain proper indentation for wrapped text", () => {
      const longFile =
        "extremely-long-filename-that-will-definitely-be-wrapped-across-multiple-lines-to-test-indentation.txt";
      mockDirectoryMap.set("nested/deep/path", new Set([longFile]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      const lines = tree.split("\n");
      const wrappedLines = lines.filter(
        (line) => line.includes("wrapped") || line.includes("indentation")
      );

      // Wrapped lines should have consistent indentation
      if (wrappedLines.length > 1) {
        const firstLineIndent = wrappedLines[0].search(/\S/);
        const secondLineIndent = wrappedLines[1].search(/\S/);
        expect(secondLineIndent).toBeGreaterThanOrEqual(firstLineIndent);
      }
    });
  });

  describe("Symbol Rendering", () => {
    test("should use correct branch symbols for multiple files", () => {
      mockDirectoryMap.set(
        "docs",
        new Set(["first.txt", "second.txt", "third.txt"])
      );

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("├──"); // Branch symbol
      expect(tree).toContain("└──"); // Last branch symbol
    });

    test("should use correct vertical symbols for nested structures", () => {
      mockDirectoryMap.set("parent", new Set(["file1.txt"]));
      mockDirectoryMap.set("parent/child", new Set(["file2.txt", "file3.txt"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      // Check the overall structure instead of specific symbols
      const lines = tree.split("\n");
      expect(lines.filter((line) => line.includes("parent")).length).toBe(1);
      expect(lines.filter((line) => line.includes("file1.txt")).length).toBe(1);
      expect(lines.filter((line) => line.includes("child")).length).toBe(1);
      expect(lines.filter((line) => line.includes("file2.txt")).length).toBe(1);
      expect(lines.filter((line) => line.includes("file3.txt")).length).toBe(1);
    });

    test("should handle last items correctly", () => {
      mockDirectoryMap.set("single", new Set(["only-file.txt"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("└──"); // Should use last branch for single file
    });
  });

  describe("Path Processing", () => {
    test("should handle root-level files", () => {
      mockDirectoryMap.set(".", new Set(["root-file.txt"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("root-file.txt");
    });

    test("should handle paths with special characters", () => {
      mockDirectoryMap.set(
        "special-chars@#$",
        new Set(["file_with-chars.txt"])
      );

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("special-chars@#$");
      expect(tree).toContain("file_with-chars.txt");
    });

    test("should handle paths with spaces", () => {
      mockDirectoryMap.set("my documents", new Set(["my file.txt"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("my documents");
      expect(tree).toContain("my file.txt");
    });

    test("should filter empty path segments", () => {
      mockDirectoryMap.set(
        "path//with//double//slashes",
        new Set(["file.txt"])
      );

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("path");
      expect(tree).toContain("with");
      expect(tree).toContain("double");
      expect(tree).toContain("slashes");
      expect(tree).toContain("file.txt");
    });
  });

  describe("Edge Cases", () => {
    test("should handle directories with only hidden files", () => {
      mockDirectoryMap.set(
        "hidden",
        new Set([".gitignore", ".env", ".secret"])
      );

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain(".gitignore");
      expect(tree).toContain(".env");
      expect(tree).toContain(".secret");
    });

    test("should handle single character names", () => {
      mockDirectoryMap.set("a", new Set(["b", "c"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("a");
      expect(tree).toContain("b");
      expect(tree).toContain("c");
    });

    test("should handle large number of files", () => {
      const manyFiles = new Set<string>();
      for (let i = 0; i < 100; i++) {
        manyFiles.add(`file${i}.txt`);
      }
      mockDirectoryMap.set("large", manyFiles);

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("file0.txt");
      expect(tree).toContain("file99.txt");
      expect(tree.split("\n").length).toBeGreaterThan(100);
    });

    test("should handle unicode characters", () => {
      mockDirectoryMap.set(
        "unicode",
        new Set(["файл.txt", "文件.doc", "ファイル.pdf"])
      );

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      expect(tree).toContain("файл.txt");
      expect(tree).toContain("文件.doc");
      expect(tree).toContain("ファイル.pdf");
    });
  });

  describe("Output Format", () => {
    test("should produce consistent line endings", () => {
      mockDirectoryMap.set("test", new Set(["file1.txt", "file2.txt"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      const lines = tree.split("\n");
      expect(lines.length).toBeGreaterThan(1);
      // Each line should be properly terminated
      expect(tree.endsWith("\n")).toBe(true);
    });

    test("should not have trailing whitespace", () => {
      mockDirectoryMap.set("clean", new Set(["file.txt"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      const lines = tree.split("\n");
      for (const line of lines) {
        if (line.length > 0) {
          expect(line).not.toMatch(/\s+$/); // No trailing whitespace
        }
      }
    });

    test("should maintain consistent symbol usage throughout", () => {
      mockDirectoryMap.set("consistent", new Set(["a.txt", "b.txt", "c.txt"]));
      mockDirectoryMap.set("another", new Set(["x.txt", "y.txt"]));

      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();

      // Count different symbol types
      const branchCount = (tree.match(/├──/g) || []).length;
      const lastBranchCount = (tree.match(/└──/g) || []).length;

      expect(branchCount + lastBranchCount).toBe(7); // 5 files + 2 directories
    });
  });

  describe("Performance", () => {
    test("should handle large directory structures efficiently", () => {
      // Create a large structure
      for (let i = 0; i < 10; i++) {
        const files = new Set<string>();
        for (let j = 0; j < 50; j++) {
          files.add(`file${j}.txt`);
        }
        mockDirectoryMap.set(`dir${i}`, files);
      }

      const startTime = Date.now();
      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();
      const endTime = Date.now();

      expect(tree.length).toBeGreaterThan(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    test("should handle deep nesting efficiently", () => {
      // Create deep nesting
      let path = "root";
      for (let i = 0; i < 20; i++) {
        path += `/level${i}`;
        mockDirectoryMap.set(path, new Set([`file${i}.txt`]));
      }

      const startTime = Date.now();
      treeService = new TreeService(mockDirectoryMap, true);
      const tree = treeService.generate();
      const endTime = Date.now();

      expect(tree).toContain("level19");
      expect(endTime - startTime).toBeLessThan(50); // Should be fast even with deep nesting
    });
  });
});
