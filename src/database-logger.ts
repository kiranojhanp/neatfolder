import { Database } from "bun:sqlite";
import { $ } from "bun";
import { resolve } from "path";
import type {
  OrganizationHistoryRecord,
  FileOperation,
  FileMapping,
  DirectoryMap,
  GroupingMethod,
  DatabaseStats,
  OrganizationStats,
} from "./types";

// Color utilities for database output
const colors = {
  success: (text: string) => `${Bun.color("green", "ansi")}${text}\x1b[0m`,
  warning: (text: string) => `${Bun.color("yellow", "ansi")}${text}\x1b[0m`,
  error: (text: string) => `${Bun.color("red", "ansi")}${text}\x1b[0m`,
  info: (text: string) => `${Bun.color("cyan", "ansi")}${text}\x1b[0m`,
  dim: (text: string) => `${Bun.color("#666666", "ansi")}${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

export class DatabaseLogger {
  private db: Database;
  private dbPath: string;

  constructor(dbPath: string = ":memory:") {
    // Special case for in-memory databases
    if (dbPath === ":memory:") {
      this.dbPath = dbPath;
      this.db = new Database(dbPath);
    } else {
      this.dbPath = resolve(dbPath);
      this.db = new Database(this.dbPath);
    }
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create operations history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS organization_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        directory TEXT NOT NULL,
        method TEXT NOT NULL,
        filesProcessed INTEGER NOT NULL,
        bytesMoved INTEGER NOT NULL,
        duration REAL NOT NULL,
        beforeStructure TEXT NOT NULL,
        afterStructure TEXT NOT NULL,
        fileMappings TEXT NOT NULL,
        errors TEXT NOT NULL,
        skipped TEXT NOT NULL,
        isReversed BOOLEAN DEFAULT FALSE,
        originalOperationId INTEGER NULL,
        FOREIGN KEY (originalOperationId) REFERENCES organization_history(id)
      )
    `);

    // Create file operations table for detailed tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operationId INTEGER NOT NULL,
        sourcePath TEXT NOT NULL,
        targetPath TEXT NOT NULL,
        size INTEGER NOT NULL,
        modifiedTime INTEGER NOT NULL,
        operation TEXT NOT NULL,
        executedAt INTEGER NOT NULL,
        FOREIGN KEY (operationId) REFERENCES organization_history(id)
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_organization_timestamp ON organization_history(timestamp);
      CREATE INDEX IF NOT EXISTS idx_organization_directory ON organization_history(directory);
      CREATE INDEX IF NOT EXISTS idx_file_operations_operation_id ON file_operations(operationId);
    `);
  }

  /**
   * Log a new organization operation
   */
  logOrganization(
    directory: string,
    method: GroupingMethod,
    beforeStructure: DirectoryMap,
    afterStructure: DirectoryMap,
    fileMappings: FileMapping[],
    stats: OrganizationStats,
    duration: number
  ): number {
    const timestamp = Date.now();

    const operation = this.db.prepare(`
      INSERT INTO organization_history (
        timestamp, directory, method, filesProcessed, bytesMoved, duration,
        beforeStructure, afterStructure, fileMappings, errors, skipped, isReversed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `);

    const result = operation.run(
      timestamp,
      directory,
      method,
      stats.filesProcessed,
      stats.bytesMoved,
      duration,
      JSON.stringify(this.serializeDirectoryMap(beforeStructure)),
      JSON.stringify(this.serializeDirectoryMap(afterStructure)),
      JSON.stringify(fileMappings),
      JSON.stringify(stats.errors),
      JSON.stringify(stats.skipped)
    );

    const operationId = result.lastInsertRowid as number;

    // Log individual file operations
    const fileOpStmt = this.db.prepare(`
      INSERT INTO file_operations (
        operationId, sourcePath, targetPath, size, modifiedTime, operation, executedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const mapping of fileMappings) {
      fileOpStmt.run(
        operationId,
        mapping.sourcePath,
        mapping.targetPath,
        mapping.size,
        mapping.modifiedTime.getTime(),
        "move",
        timestamp
      );
    }

    console.log(
      colors.success(
        `📝 Operation logged with ID: ${colors.bold(operationId.toString())}`
      )
    );
    return operationId;
  }

  /**
   * Undo the last organization operation
   */
  async undo(operationId?: number): Promise<boolean> {
    const targetOperation = operationId
      ? this.getOperationById(operationId)
      : this.getLastOperation();

    if (!targetOperation) {
      console.log(colors.warning("⚠️  No operation found to undo"));
      return false;
    }

    if (targetOperation.isReversed) {
      console.log(colors.warning("⚠️  Operation has already been undone"));
      return false;
    }

    // Check if this operation has already been undone by looking for an undo record
    const existingUndo = this.db
      .prepare(
        "SELECT id FROM organization_history WHERE isReversed = TRUE AND originalOperationId = ?"
      )
      .get(targetOperation.id);

    if (existingUndo) {
      console.log(colors.warning("⚠️  Operation has already been undone"));
      return false;
    }

    console.log(
      colors.info(
        `🔄 Undoing operation ${colors.bold(targetOperation.id.toString())}...`
      )
    );

    try {
      const fileMappings: FileMapping[] = JSON.parse(
        targetOperation.fileMappings
      );
      let undoCount = 0;

      // Reverse the file movements
      for (const mapping of fileMappings.reverse()) {
        try {
          // Check if target file exists
          const targetExists = await Bun.file(mapping.targetPath).exists();
          if (targetExists) {
            // Create source directory if needed
            const sourceDir = mapping.sourcePath.substring(
              0,
              mapping.sourcePath.lastIndexOf("/")
            );
            await $`mkdir -p ${sourceDir}`;

            // Move file back
            await $`mv ${mapping.targetPath} ${mapping.sourcePath}`;
            undoCount++;
          }
        } catch (error) {
          console.log(
            colors.error(`❌ Failed to undo ${mapping.targetPath}: ${error}`)
          );
        }
      }

      // Log the undo operation
      const undoOperationId = this.logUndoOperation(targetOperation, undoCount);

      console.log(
        colors.success(
          `✅ Undo completed: ${colors.bold(
            undoCount.toString()
          )} files restored`
        )
      );
      console.log(
        colors.info(
          `📝 Undo logged with ID: ${colors.bold(undoOperationId.toString())}`
        )
      );

      return true;
    } catch (error) {
      console.log(colors.error(`❌ Undo failed: ${error}`));
      return false;
    }
  }

  /**
   * Redo a previously undone operation
   */
  async redo(undoOperationId?: number): Promise<boolean> {
    let undoOperation: OrganizationHistoryRecord | null;

    if (undoOperationId) {
      undoOperation = this.getOperationById(undoOperationId);
    } else {
      undoOperation = this.getLastUndoOperation();
    }

    if (
      !undoOperation ||
      !undoOperation.isReversed ||
      !undoOperation.originalOperationId
    ) {
      console.log(colors.warning("⚠️  No undo operation found to redo"));
      return false;
    }

    const originalOperation = this.getOperationById(
      undoOperation.originalOperationId
    );
    if (!originalOperation) {
      console.log(colors.error("❌ Original operation not found"));
      return false;
    }

    console.log(
      colors.info(
        `🔄 Redoing operation ${colors.bold(
          originalOperation.id.toString()
        )}...`
      )
    );

    try {
      const fileMappings: FileMapping[] = JSON.parse(
        originalOperation.fileMappings
      );
      let redoCount = 0;

      // Re-apply the file movements
      for (const mapping of fileMappings) {
        try {
          // Check if source file exists
          const sourceExists = await Bun.file(mapping.sourcePath).exists();
          if (sourceExists) {
            // Create target directory if needed
            const targetDir = mapping.targetPath.substring(
              0,
              mapping.targetPath.lastIndexOf("/")
            );
            await $`mkdir -p ${targetDir}`;

            // Move file forward again
            await $`mv ${mapping.sourcePath} ${mapping.targetPath}`;
            redoCount++;
          }
        } catch (error) {
          console.log(
            colors.error(`❌ Failed to redo ${mapping.sourcePath}: ${error}`)
          );
        }
      }

      // Log the redo operation
      const redoOperationId = this.logRedoOperation(
        originalOperation,
        redoCount
      );

      console.log(
        colors.success(
          `✅ Redo completed: ${colors.bold(redoCount.toString())} files moved`
        )
      );
      console.log(
        colors.info(
          `📝 Redo logged with ID: ${colors.bold(redoOperationId.toString())}`
        )
      );

      return true;
    } catch (error) {
      console.log(colors.error(`❌ Redo failed: ${error}`));
      return false;
    }
  }

  /**
   * Get operation history
   */
  getHistory(
    limit: number = 10,
    directory?: string
  ): OrganizationHistoryRecord[] {
    let query = `
      SELECT * FROM organization_history 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (directory) {
      query += ` AND directory = ?`;
      params.push(directory);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);

    return this.db.prepare(query).all(...params) as OrganizationHistoryRecord[];
  }

  /**
   * Display operation history with colors
   */
  displayHistory(limit: number = 10, directory?: string): void {
    const history = this.getHistory(limit, directory);

    if (history.length === 0) {
      console.log(colors.warning("⚠️  No operations found in history"));
      return;
    }

    console.log(colors.bold(colors.info("📋 Organization History:")));
    console.log();

    history.forEach((record, index) => {
      const date = new Date(record.timestamp).toLocaleString();
      const typeIcon = record.isReversed ? "↶" : "📁";
      const typeText = record.isReversed ? "UNDO" : "ORGANIZE";
      const statusColor = record.isReversed ? colors.warning : colors.success;

      console.log(
        statusColor(`${typeIcon} [${record.id}] ${typeText} - ${date}`)
      );
      console.log(colors.info(`   Directory: ${record.directory}`));
      console.log(colors.info(`   Method: ${record.method}`));
      console.log(
        colors.info(
          `   Files: ${record.filesProcessed}, Size: ${(
            record.bytesMoved /
            (1024 * 1024)
          ).toFixed(2)} MB`
        )
      );
      console.log(colors.dim(`   Duration: ${record.duration.toFixed(2)}s`));

      if (record.originalOperationId) {
        console.log(
          colors.dim(`   Original operation: ${record.originalOperationId}`)
        );
      }

      if (index < history.length - 1) {
        console.log();
      }
    });
  }

  /**
   * Show before/after structure for an operation
   */
  showStructureComparison(operationId: number): void {
    const operation = this.getOperationById(operationId);
    if (!operation) {
      console.log(colors.error(`❌ Operation ${operationId} not found`));
      return;
    }

    console.log(
      colors.bold(
        colors.info(`📊 Structure Comparison for Operation ${operationId}:`)
      )
    );
    console.log();

    const beforeMap = this.deserializeDirectoryMap(
      JSON.parse(operation.beforeStructure)
    );
    const afterMap = this.deserializeDirectoryMap(
      JSON.parse(operation.afterStructure)
    );

    console.log(colors.bold(colors.warning("BEFORE:")));
    this.displayDirectoryStructure(beforeMap);

    console.log();
    console.log(colors.bold(colors.success("AFTER:")));
    this.displayDirectoryStructure(afterMap);
  }

  /**
   * Get database statistics
   */
  getStats(): DatabaseStats {
    const totalOps = this.db
      .prepare("SELECT COUNT(*) as count FROM organization_history")
      .get() as { count: number };
    const totalFiles = this.db
      .prepare(
        "SELECT SUM(filesProcessed) as total FROM organization_history WHERE isReversed = FALSE"
      )
      .get() as { total: number };
    const totalBytes = this.db
      .prepare(
        "SELECT SUM(bytesMoved) as total FROM organization_history WHERE isReversed = FALSE"
      )
      .get() as { total: number };
    const lastOp = this.db
      .prepare("SELECT MAX(timestamp) as last FROM organization_history")
      .get() as { last: number };

    const undoableOps = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM organization_history 
      WHERE isReversed = FALSE AND id NOT IN (
        SELECT originalOperationId FROM organization_history 
        WHERE isReversed = TRUE AND originalOperationId IS NOT NULL
      )
    `
      )
      .get() as { count: number };

    const redoableOps = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM organization_history 
      WHERE isReversed = TRUE AND originalOperationId IS NOT NULL
    `
      )
      .get() as { count: number };

    return {
      totalOperations: totalOps.count,
      totalFilesProcessed: totalFiles.total || 0,
      totalBytesProcessed: totalBytes.total || 0,
      lastOperation: lastOp.last ? new Date(lastOp.last) : null,
      availableUndos: undoableOps.count,
      availableRedos: redoableOps.count,
    };
  }

  /**
   * Display database statistics
   */
  displayStats(): void {
    const stats = this.getStats();

    console.log(colors.bold(colors.info("📊 NeatFolder Database Statistics:")));
    console.log();
    console.log(
      colors.info(
        `Total operations: ${colors.bold(stats.totalOperations.toString())}`
      )
    );
    console.log(
      colors.info(
        `Total files processed: ${colors.bold(
          stats.totalFilesProcessed.toString()
        )}`
      )
    );
    console.log(
      colors.info(
        `Total data processed: ${colors.bold(
          (stats.totalBytesProcessed / (1024 * 1024)).toFixed(2)
        )} MB`
      )
    );
    console.log(
      colors.info(
        `Last operation: ${colors.bold(
          stats.lastOperation ? stats.lastOperation.toLocaleString() : "Never"
        )}`
      )
    );
    console.log(
      colors.info(
        `Available undos: ${colors.bold(stats.availableUndos.toString())}`
      )
    );
    console.log(
      colors.info(
        `Available redos: ${colors.bold(stats.availableRedos.toString())}`
      )
    );
    console.log();
    console.log(colors.dim(`Database location: ${this.dbPath}`));
  }

  /**
   * Clear all history (with confirmation)
   */
  clearHistory(): void {
    this.db.exec("DELETE FROM file_operations");
    this.db.exec("DELETE FROM organization_history");
    console.log(colors.success("✅ History cleared successfully"));
  }

  /**
   * Export history to JSON
   */
  exportHistory(filePath: string): void {
    const history = this.getHistory(1000); // Export up to 1000 records
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalRecords: history.length,
      history: history,
    };

    Bun.write(filePath, JSON.stringify(exportData, null, 2));
    console.log(colors.success(`📤 History exported to ${filePath}`));
  }

  // Helper methods
  private logUndoOperation(
    originalOperation: OrganizationHistoryRecord,
    filesProcessed: number
  ): number {
    const operation = this.db.prepare(`
      INSERT INTO organization_history (
        timestamp, directory, method, filesProcessed, bytesMoved, duration,
        beforeStructure, afterStructure, fileMappings, errors, skipped, 
        isReversed, originalOperationId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
    `);

    const result = operation.run(
      Date.now(),
      originalOperation.directory,
      originalOperation.method,
      filesProcessed,
      0, // No bytes moved in undo (just restoring)
      0, // Duration not tracked for undo
      originalOperation.afterStructure, // Before becomes after
      originalOperation.beforeStructure, // After becomes before
      originalOperation.fileMappings,
      JSON.stringify([]),
      JSON.stringify([]),
      originalOperation.id
    );

    return result.lastInsertRowid as number;
  }

  private logRedoOperation(
    originalOperation: OrganizationHistoryRecord,
    filesProcessed: number
  ): number {
    return this.logUndoOperation(
      {
        ...originalOperation,
        isReversed: false,
        filesProcessed,
      },
      filesProcessed
    );
  }

  private getOperationById(id: number): OrganizationHistoryRecord | null {
    return (
      (this.db
        .prepare("SELECT * FROM organization_history WHERE id = ?")
        .get(id) as OrganizationHistoryRecord) || null
    );
  }

  private getLastOperation(): OrganizationHistoryRecord | null {
    return (
      (this.db
        .prepare(
          `
      SELECT * FROM organization_history 
      WHERE isReversed = FALSE 
      ORDER BY timestamp DESC 
      LIMIT 1
    `
        )
        .get() as OrganizationHistoryRecord) || null
    );
  }

  private getLastUndoOperation(): OrganizationHistoryRecord | null {
    return (
      (this.db
        .prepare(
          `
      SELECT * FROM organization_history 
      WHERE isReversed = TRUE 
      ORDER BY timestamp DESC 
      LIMIT 1
    `
        )
        .get() as OrganizationHistoryRecord) || null
    );
  }

  private serializeDirectoryMap(
    dirMap: DirectoryMap
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [dir, files] of dirMap.entries()) {
      result[dir] = Array.from(files);
    }
    return result;
  }

  private deserializeDirectoryMap(
    data: Record<string, string[]>
  ): DirectoryMap {
    const dirMap = new Map<string, Set<string>>();
    for (const [dir, files] of Object.entries(data)) {
      dirMap.set(dir, new Set(files));
    }
    return dirMap;
  }

  private displayDirectoryStructure(dirMap: DirectoryMap): void {
    const sortedDirs = Array.from(dirMap.keys()).sort();

    if (sortedDirs.length === 0) {
      console.log(colors.dim("  (empty)"));
      return;
    }

    for (let i = 0; i < sortedDirs.length; i++) {
      const dir = sortedDirs[i];
      const files = Array.from(dirMap.get(dir) || []).sort();
      const isLast = i === sortedDirs.length - 1;

      console.log(colors.info(`${isLast ? "└── " : "├── "}${dir}/`));

      files.forEach((file, fileIndex) => {
        const isLastFile = fileIndex === files.length - 1;
        const prefix = isLast ? "    " : "│   ";
        const connector = isLastFile ? "└── " : "├── ";
        console.log(colors.dim(`${prefix}${connector}${file}`));
      });
    }
  }

  close(): void {
    this.db.close();
  }
}
