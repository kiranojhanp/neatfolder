import { TREE_SYMBOLS } from "../constants";
import type { DirectoryMap, TreeNode, TreeSymbols } from "../types";

export class TreeService {
  private readonly symbols: TreeSymbols;
  private readonly dirMap: DirectoryMap;
  private readonly maxLineLength: number = 100;

  constructor(dirMap: DirectoryMap, useAnsi: boolean = true) {
    this.symbols = useAnsi ? TREE_SYMBOLS.ANSI : TREE_SYMBOLS.ASCII;
    this.dirMap = dirMap;
  }

  private wrapText(text: string, startCol: number): string[] {
    const maxLength = this.maxLineLength - startCol;
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      const chunk = text.slice(currentIndex, currentIndex + maxLength);
      chunks.push(chunk);
      currentIndex += maxLength;
    }

    return chunks;
  }

  private renderLine(text: string, prefix: string, connector: string): string {
    const fullPrefix = prefix + connector;
    const indentLength = fullPrefix.length;
    const wrappedLines = this.wrapText(text, indentLength);

    return wrappedLines
      .map((line, index) => {
        if (index === 0) {
          return fullPrefix + line;
        } else {
          // For continuation lines, align with the start of the filename
          return " ".repeat(indentLength) + line;
        }
      })
      .join("\n");
  }

  public generate(): string {
    const tree = this.buildTreeStructure();
    return this.renderTree(tree);
  }

  private getPathParts(path: string): string[] {
    return path.split("/").filter(Boolean);
  }

  private buildTreeStructure(): TreeNode {
    const tree: TreeNode = new Map();
    const sortedPaths = Array.from(this.dirMap.keys()).sort();

    for (const path of sortedPaths) {
      let current = tree;
      const parts = this.getPathParts(path);

      for (const part of parts) {
        if (!current.has(part)) {
          current.set(part, new Map());
        }
        const next = current.get(part);
        if (next instanceof Map) {
          current = next;
        }
      }

      const files = Array.from(this.dirMap.get(path) || []).sort();
      for (const file of files) {
        current.set(file, null);
      }
    }

    return tree;
  }

  private renderTree(node: TreeNode, prefix: string = ""): string {
    let result = "";
    const entries = Array.from(node.entries());

    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? this.symbols.LAST_BRANCH : this.symbols.BRANCH;
      const newPrefix =
        prefix + (isLast ? this.symbols.INDENT : this.symbols.VERTICAL);

      // Render the current line with proper wrapping
      result += this.renderLine(key, prefix, connector) + "\n";

      if (value instanceof Map) {
        result += this.renderTree(value, newPrefix);
      }
    });

    return result;
  }
}
