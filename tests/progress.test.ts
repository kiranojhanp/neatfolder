import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test";
import { ProgressService } from "../src/services/progress";
import type { OrganizationStats } from "../src/types";

// Helper function to strip ANSI color codes
function stripAnsiCodes(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

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

  describe("Spinner", () => {
    test("should start spinner with default message", () => {
      const writeSpy = spyOn(process.stdout, "write").mockImplementation(
        () => true
      );

      progressService.startSpinner();

      expect(writeSpy).toHaveBeenCalledWith(
        "\r🚀 Starting file organization..."
      );

      writeSpy.mockRestore();
    });

    test("should start spinner with custom message", () => {
      const writeSpy = spyOn(process.stdout, "write").mockImplementation(
        () => true
      );

      progressService.startSpinner("Processing files");

      expect(writeSpy).toHaveBeenCalledWith("\rProcessing files...");

      writeSpy.mockRestore();
    });

    test("should stop spinner", () => {
      const writeSpy = spyOn(process.stdout, "write").mockImplementation(
        () => true
      );

      progressService.startSpinner();
      progressService.stopSpinner();

      expect(writeSpy).toHaveBeenCalledWith("\n");

      writeSpy.mockRestore();
    });

    test("should stop spinner with final message", () => {
      const writeSpy = spyOn(process.stdout, "write").mockImplementation(
        () => true
      );

      progressService.startSpinner();
      progressService.stopSpinner("✅ Complete!");

      expect(writeSpy).toHaveBeenCalledWith("\r✅ Complete!\n");

      writeSpy.mockRestore();
    });

    test("should not start multiple spinners", () => {
      const writeSpy = spyOn(process.stdout, "write").mockImplementation(
        () => true
      );

      progressService.startSpinner("First");
      progressService.startSpinner("Second");

      // Should only have been called once for the first spinner
      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(writeSpy).toHaveBeenCalledWith("\rFirst...");

      progressService.stopSpinner();
      writeSpy.mockRestore();
    });

    test("drawProgressBar should return empty string for backward compatibility", () => {
      const progressBar = progressService.drawProgressBar(50);
      expect(progressBar).toBe("");
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

      // Check that the console.log was called 5 times with the expected content
      const calls = consoleSpy.log.mock.calls;
      expect(calls).toHaveLength(5);

      expect(calls[0][0]).toBe("\nOrganization Summary:");
      expect(calls[1][0]).toBe("Files processed: 10");
      expect(calls[2][0]).toBe("Total data moved: 1 MB"); // formatSize removes trailing zeros
      expect(calls[3][0]).toBe("Time taken: 2.50 seconds");
      expect(calls[4][0]).toBe("Directories created: 2");
    });

    test("should not print summary when verbose is false", () => {
      const stats = createMockStats();
      const duration = 2.5;

      progressService.printSummary(stats, duration, false);

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    test("should format bytes correctly", () => {
      const testCases = [
        { bytes: 1024, expected: "1 KB" }, // formatSize removes trailing zeros
        { bytes: 1048576, expected: "1 MB" }, // formatSize removes trailing zeros
        { bytes: 2097152, expected: "2 MB" }, // formatSize removes trailing zeros
        { bytes: 1572864, expected: "1.5 MB" }, // 1.5 MB (no trailing zero to remove)
      ];

      for (const { bytes, expected } of testCases) {
        consoleSpy.log.mockClear(); // Clear previous calls
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
      expect(consoleSpy.log).toHaveBeenCalledWith("Total data moved: 0 B"); // formatSize returns "0 B" for 0 bytes
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
        "Total data moved: 1000 GB" // formatSize converts to GB and removes trailing zeros
      );
      expect(consoleSpy.log).toHaveBeenCalledWith("Directories created: 100");
    });

    test("should handle fractional progress values correctly", () => {
      // drawProgressBar now returns empty string for backward compatibility
      const fractionalValues = [0.1, 0.5, 0.9, 1.1, 99.9];

      for (const value of fractionalValues) {
        const progressBar = progressService.drawProgressBar(value);
        expect(progressBar).toBe("");
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
      expect(consoleSpy.log).toHaveBeenCalledWith("Total data moved: 50 MB");
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

      // All progress bars should return empty string for backward compatibility
      for (const bar of progressBars) {
        expect(bar).toBe("");
      }

      // All should be consistent (empty strings)
      for (let i = 1; i < progressBars.length; i++) {
        expect(progressBars[i]).toBe(progressBars[i - 1]);
      }
    });
  });
});
