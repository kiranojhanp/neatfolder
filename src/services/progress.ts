import type { OrganizationStats } from "../types";
import { colors } from "../utils/colors";
import { formatSize } from "../utils/file-utils";

/**
 * ProgressService handles progress visualization and summary reporting
 */
export class ProgressService {
  // Spinner configuration
  private static readonly SPINNER = {
    interval: 80,
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  };

  // Spinner state
  private spinnerIndex = 0;
  private spinnerInterval?: Timer;
  private isSpinning = false;

  /**
   * Creates a new ProgressService instance
   */
  constructor() {
    // No configuration needed for minimal spinner
  }

  /**
   * Starts the minimal spinner animation
   * @param message Message to display with the spinner
   */
  startSpinner(message: string = "🚀 Starting file organization"): void {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.spinnerIndex = 0;

    // Clear any existing content and show initial message
    process.stdout.write(`\r${message}...`);

    this.spinnerInterval = setInterval(() => {
      const frame = ProgressService.SPINNER.frames[this.spinnerIndex];
      process.stdout.write(`\r${frame} ${message}...`);
      this.spinnerIndex =
        (this.spinnerIndex + 1) % ProgressService.SPINNER.frames.length;
    }, ProgressService.SPINNER.interval);
  }

  /**
   * Stops the spinner animation
   * @param finalMessage Optional final message to display
   */
  stopSpinner(finalMessage?: string): void {
    if (!this.isSpinning) return;

    this.isSpinning = false;

    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
    }

    if (finalMessage) {
      process.stdout.write(`\r${finalMessage}\n`);
    } else {
      process.stdout.write("\n");
    }
  }

  /**
   * Creates a visual progress bar (legacy method for backward compatibility)
   * @param progress Progress percentage (0-100)
   * @returns Empty string (spinner handles display now)
   */
  drawProgressBar(progress: number): string {
    // For backward compatibility, return empty string
    // Actual progress is now handled by the spinner
    return "";
  }

  /**
   * Prints a summary of the organization operation
   * @param stats Organization statistics
   * @param duration Duration in seconds
   * @param verbose Whether to show verbose output
   */
  printSummary(
    stats: OrganizationStats,
    duration: number,
    verbose: boolean
  ): void {
    if (!verbose) return;

    console.log("\nOrganization Summary:");
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Total data moved: ${formatSize(stats.bytesMoved)}`);
    console.log(`Time taken: ${duration.toFixed(2)} seconds`);
    console.log(`Directories created: ${stats.created.size}`);

    if (stats.errors.length > 0) {
      console.log("\nErrors encountered:");
      stats.errors.forEach((error) => console.error(`- ${error}`));
    }

    if (stats.skipped.length > 0) {
      console.log("\nSkipped files:");
      stats.skipped.forEach((skip) => console.log(`- ${skip}`));
    }
  }
}
