import type { OrganizationStats } from "../types";

export class ProgressService {
  private readonly barWidth = 30;

  drawProgressBar(progress: number): string {
    // Clamp progress to 0-100 range
    const clampedProgress = Math.max(0, Math.min(100, progress));
    const filledWidth = Math.floor((clampedProgress / 100) * this.barWidth);
    const emptyWidth = this.barWidth - filledWidth;
    const progressBar = "█".repeat(filledWidth) + "▒".repeat(emptyWidth);
    return `[${progressBar}] ${progress.toFixed(2)}%`;
  }

  printSummary(
    stats: OrganizationStats,
    duration: number,
    verbose: boolean
  ): void {
    if (!verbose) return;

    console.log("\nOrganization Summary:");
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(
      `Total data moved: ${(stats.bytesMoved / (1024 * 1024)).toFixed(2)} MB`
    );
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
