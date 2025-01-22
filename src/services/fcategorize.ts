import type { OrganizationOptions } from "../types";

export class FileCategorizationService {
  constructor(private readonly categories: Map<RegExp, string>) {}

  getCategoryFromFile(filename: string): string {
    for (const [pattern, category] of this.categories) {
      if (pattern.test(filename)) {
        return category;
      }
    }
    return "others";
  }

  getTargetDirectory(
    file: string,
    stats: { size: number; mtime: Date },
    method: OrganizationOptions["method"]
  ): string {
    let dir = this.getCategoryFromFile(file);

    switch (method) {
      case "date":
        const date = stats.mtime;
        dir += `/${date.getFullYear()}/${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        break;
      case "size":
        if (stats.size < 1024 * 1024) dir = "small";
        else if (stats.size < 100 * 1024 * 1024) dir = "medium";
        else dir = "large";
        break;
      case "name":
        dir = file.charAt(0).toLowerCase();
        break;
    }
    return dir;
  }
}
