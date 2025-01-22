import { mkdir, rename, stat, access } from "fs/promises";
import { constants } from "fs";
import { join, parse, basename } from "path";

export class FileSystemService {
  async isValidPath(path: string): Promise<boolean> {
    try {
      await access(path, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  async getFileStats(path: string) {
    return stat(path);
  }

  async moveFile(source: string, target: string): Promise<void> {
    await rename(source, target);
  }

  getBasename(path: string): string {
    return basename(path);
  }

  getDirname(path: string): string {
    return parse(path).dir;
  }

  joinPaths(...paths: string[]): string {
    return join(...paths);
  }
}
