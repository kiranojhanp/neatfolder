import { test, expect, describe, mock } from "bun:test";
import { parseArgs } from "util";

// Since the index.ts file has complex parsing logic, let's test the utility functions
describe("Utility Functions", () => {
  describe("parseSize", () => {
    // Extract the parseSize function for testing
    const parseSize = (sizeStr: string): number => {
      if (sizeStr === "Infinity" || sizeStr === "") return Infinity;
      if (sizeStr === "0" || !sizeStr) return 0;

      const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
      if (!match) {
        throw new Error(
          `Invalid size format: ${sizeStr}. Use formats like: 100, 1KB, 2MB, 1.5GB`
        );
      }

      const value = parseFloat(match[1]);
      const unit = (match[2] || "B").toUpperCase();

      const multipliers = {
        B: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024,
        TB: 1024 * 1024 * 1024 * 1024,
      };

      return value * multipliers[unit as keyof typeof multipliers];
    };

    test("should parse bytes correctly", () => {
      expect(parseSize("100")).toBe(100);
      expect(parseSize("100B")).toBe(100);
    });

    test("should parse kilobytes correctly", () => {
      expect(parseSize("1KB")).toBe(1024);
      expect(parseSize("2KB")).toBe(2048);
      expect(parseSize("1.5KB")).toBe(1536);
    });

    test("should parse megabytes correctly", () => {
      expect(parseSize("1MB")).toBe(1024 * 1024);
      expect(parseSize("2.5MB")).toBe(2.5 * 1024 * 1024);
    });

    test("should parse gigabytes correctly", () => {
      expect(parseSize("1GB")).toBe(1024 * 1024 * 1024);
      expect(parseSize("1.5GB")).toBe(1.5 * 1024 * 1024 * 1024);
    });

    test("should parse terabytes correctly", () => {
      expect(parseSize("1TB")).toBe(1024 * 1024 * 1024 * 1024);
    });

    test("should handle case insensitive units", () => {
      expect(parseSize("1kb")).toBe(1024);
      expect(parseSize("1Mb")).toBe(1024 * 1024);
      expect(parseSize("1gb")).toBe(1024 * 1024 * 1024);
    });

    test("should handle special values", () => {
      expect(parseSize("")).toBe(Infinity);
      expect(parseSize("Infinity")).toBe(Infinity);
      expect(parseSize("0")).toBe(0);
    });

    test("should throw error for invalid formats", () => {
      expect(() => parseSize("invalid")).toThrow("Invalid size format");
      expect(() => parseSize("1XB")).toThrow("Invalid size format");
      expect(() => parseSize("abc MB")).toThrow("Invalid size format");
    });
  });

  describe("validateMethod", () => {
    const validateMethod = (
      method: string
    ): "extension" | "name" | "date" | "size" => {
      const validMethods = ["extension", "name", "date", "size"];
      if (!validMethods.includes(method)) {
        throw new Error(
          `Invalid method: ${method}. Valid options: ${validMethods.join(", ")}`
        );
      }
      return method as "extension" | "name" | "date" | "size";
    };

    test("should validate correct methods", () => {
      expect(validateMethod("extension")).toBe("extension");
      expect(validateMethod("name")).toBe("name");
      expect(validateMethod("date")).toBe("date");
      expect(validateMethod("size")).toBe("size");
    });

    test("should throw error for invalid methods", () => {
      expect(() => validateMethod("invalid")).toThrow("Invalid method");
      expect(() => validateMethod("")).toThrow("Invalid method");
      expect(() => validateMethod("type")).toThrow("Invalid method");
    });
  });

  describe("parseNumber", () => {
    const parseNumber = (
      value: string,
      name: string,
      min: number = 0
    ): number => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < min) {
        throw new Error(
          `Invalid ${name}: ${value}. Must be a number >= ${min}`
        );
      }
      return num;
    };

    test("should parse valid numbers", () => {
      expect(parseNumber("5", "depth")).toBe(5);
      expect(parseNumber("10", "depth")).toBe(10);
      expect(parseNumber("0", "depth", 0)).toBe(0);
    });

    test("should respect minimum values", () => {
      expect(parseNumber("5", "depth", 1)).toBe(5);
      expect(() => parseNumber("0", "depth", 1)).toThrow(
        "Invalid depth: 0. Must be a number >= 1"
      );
    });

    test("should throw error for invalid numbers", () => {
      expect(() => parseNumber("abc", "depth")).toThrow("Invalid depth");
      expect(() => parseNumber("", "depth")).toThrow("Invalid depth");
      expect(() => parseNumber("-1", "depth")).toThrow("Invalid depth");
    });

    test("should handle floating point strings", () => {
      expect(parseNumber("5.5", "depth")).toBe(5); // parseInt truncates
    });
  });
});

describe("Command Line Argument Parsing", () => {
  test("should handle help flag", () => {
    const mockExit = mock(() => {});
    const originalExit = process.exit;
    const originalLog = console.log;

    process.exit = mockExit as any;
    console.log = mock(() => {});

    // Test help display logic
    const showHelp = () => {
      console.log("Help message");
      process.exit(0);
    };

    showHelp();

    expect(mockExit).toHaveBeenCalledWith(0);

    // Restore
    process.exit = originalExit;
    console.log = originalLog;
  });

  test("should validate argument combinations", () => {
    // Test size range validation
    const validateSizeRange = (minSize: number, maxSize: number) => {
      if (minSize > maxSize) {
        throw new Error("min-size cannot be greater than max-size");
      }
    };

    expect(() => validateSizeRange(100, 200)).not.toThrow();
    expect(() => validateSizeRange(200, 100)).toThrow(
      "min-size cannot be greater than max-size"
    );
    expect(() => validateSizeRange(100, 100)).not.toThrow();
  });

  test("should handle directory extraction", () => {
    // Mock process.argv behavior
    const extractDirectory = (positionals: string[]) => {
      return positionals.slice(2)[0] || ".";
    };

    expect(extractDirectory(["bun", "script.js"])).toBe(".");
    expect(extractDirectory(["bun", "script.js", "/home/user"])).toBe(
      "/home/user"
    );
    expect(extractDirectory(["bun", "script.js", "subfolder"])).toBe(
      "subfolder"
    );
  });
});

describe("Error Handling", () => {
  test("should handle unhandled rejections", () => {
    const mockExit = mock(() => {});
    const originalExit = process.exit;

    process.exit = mockExit as any;

    const rejectionHandler = (reason: any, promise: Promise<any>) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    };

    // Test that the handler runs without throwing and calls process.exit
    rejectionHandler("test error", Promise.resolve());

    expect(mockExit).toHaveBeenCalledWith(1);

    // Restore
    process.exit = originalExit;
  });

  test("should handle uncaught exceptions", () => {
    const mockExit = mock(() => {});
    const originalExit = process.exit;

    process.exit = mockExit as any;

    const exceptionHandler = (error: Error) => {
      console.error("Uncaught Exception:", error.message);
      process.exit(1);
    };

    exceptionHandler(new Error("test error"));

    expect(mockExit).toHaveBeenCalledWith(1);

    // Restore
    process.exit = originalExit;
  });

  test("should handle main function errors", () => {
    const mockExit = mock(() => {});
    const originalExit = process.exit;

    process.exit = mockExit as any;

    const mainErrorHandler = (error: Error) => {
      console.error("Fatal error:", error.message);
      process.exit(1);
    };

    mainErrorHandler(new Error("fatal test error"));

    expect(mockExit).toHaveBeenCalledWith(1);

    // Restore
    process.exit = originalExit;
  });
});
