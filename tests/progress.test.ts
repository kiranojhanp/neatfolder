import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test";
import { ProgressService } from "../src/services/progress";
import type { OrganizationStats } from "../src/types";

// Helper function to create mock stats
function createMockStats(
  overrides: Partial<OrganizationStats> = {}
): OrganizationStats {
  return {
    filesProcessed: 10,
    bytesMoved: 1024 * 1024, // 1 MB
    errors: [],
    skipped: [],
    created: new Set(["documents", "images"]),
    ...overrides,
  };
}

describe("ProgressService", () => {
  let progressService: ProgressService;
  let consoleSpy: any;

  beforeEach(() => {
    progressService = new ProgressService();
    consoleSpy = {
      log: spyOn(console, "log").mockImplementation(() => {}),
      error: spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("Progress Bar", () => {
    test("should generate progress bar at 0%", () => {
      const progressBar = progressService.drawProgressBar(0);

      expect(progressBar).toContain("[");
      expect(progressBar).toContain("]");
      expect(progressBar).toContain("0.00%");
      expect(progressBar).toContain("▒".repeat(30)); // All empty
    });

    test("should generate progress bar at 50%", () => {
      const progressBar = progressService.drawProgressBar(50);

      expect(progressBar).toContain("50.00%");
      expect(progressBar).toContain("█".repeat(15)); // Half filled
      expect(progressBar).toContain("▒".repeat(15)); // Half empty
    });

    test("should generate progress bar at 100%", () => {
      const progressBar = progressService.drawProgressBar(100);

      expect(progressBar).toContain("100.00%");
      expect(progressBar).toContain("█".repeat(30)); // All filled
      expect(progressBar).not.toContain("▒"); // No empty bars
    });

    test("should handle decimal progress values", () => {
      const progressBar = progressService.drawProgressBar(33.33);

      expect(progressBar).toContain("33.33%");
      expect(progressBar).toContain("█".repeat(9)); // Floor of 33.33% of 30 = 9
      expect(progressBar).toContain("▒".repeat(21)); // Remaining empty = 30-9 = 21
    });

    test("should handle progress values over 100%", () => {
      const progressBar = progressService.drawProgressBar(150);

      expect(progressBar).toContain("150.00%");
      expect(progressBar).toContain("█".repeat(30)); // Capped at full bar
    });

    test("should handle negative progress values", () => {
      const progressBar = progressService.drawProgressBar(-10);

      expect(progressBar).toContain("-10.00%");
      expect(progressBar).toContain("▒".repeat(30)); // All empty
    });

    test("should maintain consistent bar width", () => {
      const progressValues = [0, 25, 50, 75, 100];

      for (const progress of progressValues) {
        const progressBar = progressService.drawProgressBar(progress);
        const barContent = progressBar.match(/\[(.*?)\]/)?.[1];

        expect(barContent).toBeDefined();
        expect(barContent!.length).toBe(30);
      }
    });

    test("should format percentage with two decimal places", () => {
      const testValues = [0, 1.5, 33.333, 66.666, 99.999];

      for (const value of testValues) {
        const progressBar = progressService.drawProgressBar(value);
        const percentageMatch = progressBar.match(/(\d+\.\d{2})%/);

        expect(percentageMatch).toBeDefined();
        expect(percentageMatch![1]).toBe(value.toFixed(2));
      }
    });
  });

  describe("Summary Printing", () => {
    const createMockStats = (
      overrides: Partial<OrganizationStats> = {}
    ): OrganizationStats => ({
      filesProcessed: 10,
      bytesMoved: 1048576, // 1MB
      created: new Set(["documents/", "images/"]),
      skipped: [],
      errors: [],
      ...overrides,
    });

    test("should print summary when verbose is true", () => {
      const stats = createMockStats();
      const duration = 2.5;

      progressService.printSummary(stats, duration, true);

      expect(consoleSpy.log).toHaveBeenCalledWith("\nOrganization Summary:");
      expect(consoleSpy.log).toHaveBeenCalledWith("Files processed: 10");
      expect(consoleSpy.log).toHaveBeenCalledWith("Total data moved: 1.00 MB");
      expect(consoleSpy.log).toHaveBeenCalledWith("Time taken: 2.50 seconds");
      expect(consoleSpy.log).toHaveBeenCalledWith("Directories created: 2");
    });

    test("should not print summary when verbose is false", () => {
      const stats = createMockStats();
      const duration = 2.5;

      progressService.printSummary(stats, duration, false);

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test("should format bytes correctly", () => {
      const testCases = [
        { bytes: 1024, expected: "0.00 MB" },
        { bytes: 1048576, expected: "1.00 MB" },
        { bytes: 2097152, expected: "2.00 MB" },
        { bytes: 1572864, expected: "1.50 MB" },
      ];

      for (const { bytes, expected } of testCases) {
        const stats = createMockStats({ bytesMoved: bytes });

        progressService.printSummary(stats, 1, true);

        expect(consoleSpy.log).toHaveBeenCalledWith(
          `Total data moved: ${expected}`
        );
      }
    });

    test("should display errors when present", () => {
      const stats = createMockStats({
        errors: ["Permission denied: file1.txt", "File not found: file2.txt"],
      });

      progressService.printSummary(stats, 1, true);

      expect(consoleSpy.log).toHaveBeenCalledWith("\nErrors encountered:");
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "- Permission denied: file1.txt"
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "- File not found: file2.txt"
      );
    });

    test("should display skipped files when present", () => {
      const stats = createMockStats({
        skipped: ["hidden/.dotfile", "temp/~tmpfile"],
      });

      progressService.printSummary(stats, 1, true);

      expect(consoleSpy.log).toHaveBeenCalledWith("\nSkipped files:");
      expect(consoleSpy.log).toHaveBeenCalledWith("- hidden/.dotfile");
      expect(consoleSpy.log).toHaveBeenCalledWith("- temp/~tmpfile");
    });

    test("should not show error section when no errors", () => {
      const stats = createMockStats({ errors: [] });

      progressService.printSummary(stats, 1, true);

      expect(consoleSpy.log).not.toHaveBeenCalledWith("\nErrors encountered:");
    });

    test("should not show skipped section when no skipped files", () => {
      const stats = createMockStats({ skipped: [] });

      progressService.printSummary(stats, 1, true);

      expect(consoleSpy.log).not.toHaveBeenCalledWith("\nSkipped files:");
    });

    test("should handle zero values gracefully", () => {
      const stats = createMockStats({
        filesProcessed: 0,
        bytesMoved: 0,
        created: new Set(),
      });

      progressService.printSummary(stats, 0, true);

      expect(consoleSpy.log).toHaveBeenCalledWith("Files processed: 0");
      expect(consoleSpy.log).toHaveBeenCalledWith("Total data moved: 0.00 MB");
      expect(consoleSpy.log).toHaveBeenCalledWith("Time taken: 0.00 seconds");
      expect(consoleSpy.log).toHaveBeenCalledWith("Directories created: 0");
    });

    test("should format duration with two decimal places", () => {
      const durations = [0.123, 1.5, 10.999, 60.5];
      const stats = createMockStats();

      for (const duration of durations) {
        consoleSpy.log.mockClear();
        progressService.printSummary(stats, duration, true);

        expect(consoleSpy.log).toHaveBeenCalledWith(
          `Time taken: ${duration.toFixed(2)} seconds`
        );
      }
    });
  });

  describe("Edge Cases", () => {
    test("should handle very large file counts", () => {
      const stats = createMockStats({
        filesProcessed: 1000000,
        bytesMoved: 1073741824000, // 1TB
        created: new Set(Array.from({ length: 100 }, (_, i) => `dir${i}/`)),
      });

      progressService.printSummary(stats, 3600, true);

      expect(consoleSpy.log).toHaveBeenCalledWith("Files processed: 1000000");
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "Total data moved: 1024000.00 MB"
      );
      expect(consoleSpy.log).toHaveBeenCalledWith("Directories created: 100");
    });

    test("should handle fractional progress values correctly", () => {
      const fractionalValues = [0.1, 0.5, 0.9, 1.1, 99.9];

      for (const value of fractionalValues) {
        const progressBar = progressService.drawProgressBar(value);

        expect(progressBar).toContain(`${value.toFixed(2)}%`);
        // Check that bar has correct structure without unicode regex
        expect(progressBar).toContain("[");
        expect(progressBar).toContain("]");
        expect(progressBar.match(/\[(.{30})\]/)).toBeTruthy();
      }
    });

    test("should handle empty error and skipped arrays", () => {
      const stats = createMockStats({
        errors: [],
        skipped: [],
      });

      progressService.printSummary(stats, 1, true);

      // Should not have error or skipped sections
      const allCalls = consoleSpy.log.mock.calls.flat();
      expect(allCalls).not.toContain("\nErrors encountered:");
      expect(allCalls).not.toContain("\nSkipped files:");
    });
  });

  describe("Integration", () => {
    test("should work with real-world statistics", () => {
      const stats = createMockStats({
        filesProcessed: 42,
        bytesMoved: 52428800, // 50MB
        created: new Set(["documents/", "images/", "videos/", "code/"]),
        errors: ["Permission denied: system.log"],
        skipped: [".DS_Store", "Thumbs.db"],
      });

      progressService.printSummary(stats, 15.75, true);

      expect(consoleSpy.log).toHaveBeenCalledWith("Files processed: 42");
      expect(consoleSpy.log).toHaveBeenCalledWith("Total data moved: 50.00 MB");
      expect(consoleSpy.log).toHaveBeenCalledWith("Time taken: 15.75 seconds");
      expect(consoleSpy.log).toHaveBeenCalledWith("Directories created: 4");
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "- Permission denied: system.log"
      );
      expect(consoleSpy.log).toHaveBeenCalledWith("- .DS_Store");
      expect(consoleSpy.log).toHaveBeenCalledWith("- Thumbs.db");
    });

    test("should provide consistent progress bar visualization", () => {
      const steps = [0, 10, 25, 50, 75, 90, 100];
      const progressBars = steps.map((step) =>
        progressService.drawProgressBar(step)
      );

      // All should have same format
      for (const bar of progressBars) {
        expect(bar).toMatch(/^\[.{30}\] \d+\.\d{2}%$/);
      }

      // Progress should be visually increasing
      for (let i = 1; i < progressBars.length; i++) {
        const prevFilledCount = (progressBars[i - 1].match(/█/g) || []).length;
        const currentFilledCount = (progressBars[i].match(/█/g) || []).length;
        expect(currentFilledCount).toBeGreaterThanOrEqual(prevFilledCount);
      }
    });
  });
});
