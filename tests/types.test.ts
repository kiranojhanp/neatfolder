import { test, expect, describe } from "bun:test";
import type {
  GroupingMethod,
  OrganizationOptions,
  FileMapping,
  OrganizationStats,
  DirectoryMap,
  OrganizationHistoryRecord,
  FileOperation,
  DatabaseStats,
} from "../src/types";

describe("Type Definitions", () => {
  describe("GroupingMethod", () => {
    test("should accept valid grouping methods", () => {
      const validMethods: GroupingMethod[] = [
        "extension",
        "name",
        "date",
        "size",
      ];

      for (const method of validMethods) {
        expect(typeof method).toBe("string");
        expect(["extension", "name", "date", "size"]).toContain(method);
      }
    });
  });

  describe("OrganizationOptions", () => {
    test("should have correct structure", () => {
      const options: OrganizationOptions = {
        method: "extension",
        ignoreDotfiles: false,
        recursive: true,
        dryRun: false,
        maxDepth: 5,
        minSize: 1024,
        maxSize: 1024 * 1024,
        verbose: true,
      };

      expect(options.method).toBe("extension");
      expect(options.ignoreDotfiles).toBe(false);
      expect(options.recursive).toBe(true);
      expect(options.dryRun).toBe(false);
      expect(options.maxDepth).toBe(5);
      expect(options.minSize).toBe(1024);
      expect(options.maxSize).toBe(1024 * 1024);
      expect(options.verbose).toBe(true);
    });

    test("should handle optional properties", () => {
      const minimalOptions: OrganizationOptions = {
        method: "extension",
        ignoreDotfiles: false,
        recursive: false,
        dryRun: false,
        verbose: false,
      };

      expect(minimalOptions.maxDepth).toBeUndefined();
      expect(minimalOptions.minSize).toBeUndefined();
      expect(minimalOptions.maxSize).toBeUndefined();
    });
  });

  describe("FileMapping", () => {
    test("should have correct structure", () => {
      const mapping: FileMapping = {
        sourcePath: "/source/file.txt",
        targetPath: "/target/documents/file.txt",
        size: 1024,
        modifiedTime: new Date(),
      };

      expect(typeof mapping.sourcePath).toBe("string");
      expect(typeof mapping.targetPath).toBe("string");
      expect(typeof mapping.size).toBe("number");
      expect(mapping.modifiedTime).toBeInstanceOf(Date);
    });
  });

  describe("OrganizationStats", () => {
    test("should have correct structure", () => {
      const stats: OrganizationStats = {
        filesProcessed: 10,
        bytesMoved: 1024 * 1024,
        errors: ["Error 1", "Error 2"],
        skipped: ["file1.tmp", "file2.cache"],
        created: new Set(["documents", "images", "code"]),
      };

      expect(typeof stats.filesProcessed).toBe("number");
      expect(typeof stats.bytesMoved).toBe("number");
      expect(Array.isArray(stats.errors)).toBe(true);
      expect(Array.isArray(stats.skipped)).toBe(true);
      expect(stats.created).toBeInstanceOf(Set);
    });
  });

  describe("DirectoryMap", () => {
    test("should be a Map with correct types", () => {
      const dirMap: DirectoryMap = new Map();
      dirMap.set("images", new Set(["photo1.jpg", "photo2.png"]));
      dirMap.set("documents", new Set(["doc1.pdf", "doc2.txt"]));

      expect(dirMap).toBeInstanceOf(Map);
      expect(dirMap.get("images")).toBeInstanceOf(Set);
      expect(dirMap.get("images")?.has("photo1.jpg")).toBe(true);
      expect(dirMap.get("documents")?.has("doc1.pdf")).toBe(true);
    });
  });

  describe("OrganizationHistoryRecord", () => {
    test("should have correct structure", () => {
      const record: OrganizationHistoryRecord = {
        id: 1,
        timestamp: Date.now(),
        directory: "/test/directory",
        method: "extension",
        filesProcessed: 5,
        bytesMoved: 1024 * 1024,
        duration: 2.5,
        beforeStructure: "{}",
        afterStructure: "{}",
        fileMappings: "[]",
        errors: "[]",
        skipped: "[]",
        isReversed: false,
        originalOperationId: undefined,
      };

      expect(typeof record.id).toBe("number");
      expect(typeof record.timestamp).toBe("number");
      expect(typeof record.directory).toBe("string");
      expect(typeof record.method).toBe("string");
      expect(typeof record.filesProcessed).toBe("number");
      expect(typeof record.bytesMoved).toBe("number");
      expect(typeof record.duration).toBe("number");
      expect(typeof record.beforeStructure).toBe("string");
      expect(typeof record.afterStructure).toBe("string");
      expect(typeof record.fileMappings).toBe("string");
      expect(typeof record.errors).toBe("string");
      expect(typeof record.skipped).toBe("string");
      expect(typeof record.isReversed).toBe("boolean");
    });

    test("should handle undo operations", () => {
      const undoRecord: OrganizationHistoryRecord = {
        id: 2,
        timestamp: Date.now(),
        directory: "/test/directory",
        method: "extension",
        filesProcessed: 5,
        bytesMoved: 0,
        duration: 1.0,
        beforeStructure: "{}",
        afterStructure: "{}",
        fileMappings: "[]",
        errors: "[]",
        skipped: "[]",
        isReversed: true,
        originalOperationId: 1,
      };

      expect(undoRecord.isReversed).toBe(true);
      expect(undoRecord.originalOperationId).toBe(1);
    });
  });

  describe("FileOperation", () => {
    test("should have correct structure", () => {
      const operation: FileOperation = {
        id: 1,
        operationId: 100,
        sourcePath: "/source/file.txt",
        targetPath: "/target/file.txt",
        size: 1024,
        modifiedTime: Date.now(),
        operation: "move",
        executedAt: Date.now(),
      };

      expect(typeof operation.id).toBe("number");
      expect(typeof operation.operationId).toBe("number");
      expect(typeof operation.sourcePath).toBe("string");
      expect(typeof operation.targetPath).toBe("string");
      expect(typeof operation.size).toBe("number");
      expect(typeof operation.modifiedTime).toBe("number");
      expect(["move", "undo_move"]).toContain(operation.operation);
      expect(typeof operation.executedAt).toBe("number");
    });

    test("should handle optional id", () => {
      const operation: FileOperation = {
        operationId: 100,
        sourcePath: "/source/file.txt",
        targetPath: "/target/file.txt",
        size: 1024,
        modifiedTime: Date.now(),
        operation: "undo_move",
        executedAt: Date.now(),
      };

      expect(operation.id).toBeUndefined();
      expect(operation.operation).toBe("undo_move");
    });
  });

  describe("DatabaseStats", () => {
    test("should have correct structure", () => {
      const stats: DatabaseStats = {
        totalOperations: 10,
        totalFilesProcessed: 50,
        totalBytesProcessed: 1024 * 1024 * 100,
        lastOperation: new Date(),
        availableUndos: 5,
        availableRedos: 2,
      };

      expect(typeof stats.totalOperations).toBe("number");
      expect(typeof stats.totalFilesProcessed).toBe("number");
      expect(typeof stats.totalBytesProcessed).toBe("number");
      expect(stats.lastOperation).toBeInstanceOf(Date);
      expect(typeof stats.availableUndos).toBe("number");
      expect(typeof stats.availableRedos).toBe("number");
    });

    test("should handle null lastOperation", () => {
      const stats: DatabaseStats = {
        totalOperations: 0,
        totalFilesProcessed: 0,
        totalBytesProcessed: 0,
        lastOperation: null,
        availableUndos: 0,
        availableRedos: 0,
      };

      expect(stats.lastOperation).toBeNull();
    });
  });
});
