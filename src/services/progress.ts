import type { OrganizationStats } from "../types";
import { colors } from "../utils/colors";
import { formatSize } from "../utils/file-utils";

/**
 * ProgressService handles progress visualization and summary reporting
 */
export class ProgressService {
  // Bar width in characters for the progress bar
  private readonly barWidth: number;

  // Progress threshold percentages for coloring
  private static readonly PROGRESS_THRESHOLDS = {
    WARNING: 30, // Below this is warning color
    INFO: 70, // Below this is info color, above is success
  };

  // Characters for filled and empty portions of the bar
  private static readonly BAR_CHARS = {
    FILLED: "█",
    EMPTY: "▒",
  };

  /**
   * Creates a new ProgressService instance
   * @param barWidth Width of the progress bar in characters (default: 30)
   */
  constructor(barWidth: number = 30) {
    // Allow the bar width to be configurable
    this.barWidth = barWidth;
  }

  /**
   * Creates a visual progress bar
   * @param progress Progress percentage (0-100)
   * @returns Formatted progress bar string
   */
  drawProgressBar(progress: number): string {
    // Clamp progress to 0-100 range for calculation, but preserve original for display
    const clampedProgress = Math.max(0, Math.min(100, progress));

    // Calculate filled and empty portions
    const filledWidth = Math.floor((clampedProgress / 100) * this.barWidth);
    const emptyWidth = this.barWidth - filledWidth;

    // Create the visual bar with exactly this.barWidth characters
    const progressBar =
      ProgressService.BAR_CHARS.FILLED.repeat(filledWidth) +
      ProgressService.BAR_CHARS.EMPTY.repeat(emptyWidth);

    // Format percentage with consistent decimals (use original progress value)
    const formattedPercentage = progress.toFixed(2) + "%";

    // Create the complete bar string
    const barString = `[${progressBar}] ${formattedPercentage}`;

    // Apply color based on progress thresholds
    if (progress < ProgressService.PROGRESS_THRESHOLDS.WARNING) {
      return colors.warning(barString);
    } else if (progress < ProgressService.PROGRESS_THRESHOLDS.INFO) {
      return colors.info(barString);
    } else {
      return colors.success(barString);
    }
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
