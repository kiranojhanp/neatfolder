import { TREE_SYMBOLS } from "../constants";
import type { DirectoryMap, TreeNode, TreeSymbols } from "../types";

/**
 * TreeService handles the generation of a visual directory/file tree structure
 * for displaying folder organization in the terminal
 */
export class TreeService {
  private readonly symbols: TreeSymbols;
  private readonly dirMap: DirectoryMap;
  private readonly maxLineLength: number = process.stdout.columns || 100;

  /**
   * Creates a new TreeService instance
   * @param dirMap Map of directories to their files
   * @param useAnsi Whether to use ANSI symbols (true) or ASCII (false)
   */
  constructor(dirMap: DirectoryMap, useAnsi: boolean = true) {
    this.symbols = useAnsi ? TREE_SYMBOLS.ANSI : TREE_SYMBOLS.ASCII;
    this.dirMap = dirMap;
  }

  /**
   * Generates a tree string representation of the directory structure
   * @returns Formatted tree string
   */
  public generate(): string {
    const tree = this.buildTreeStructure();
    return this.renderTree(tree);
  }

  /**
   * Wraps text to fit within the terminal width
   * @param text Text to wrap
   * @param startCol Starting column (for indentation)
   * @returns Array of wrapped text lines
   */
  private wrapText(text: string, startCol: number): string[] {
    const maxLength = this.maxLineLength - startCol;

    // If text fits on one line, return it as-is
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

  /**
   * Renders a single line of the tree with proper wrapping
   * @param text The text content (directory or file name)
   * @param prefix Indentation prefix
   * @param connector Branch connector symbol
   * @returns Formatted tree line
   */
  private renderLine(text: string, prefix: string, connector: string): string {
    const fullPrefix = prefix + connector;
    const indentLength = fullPrefix.length;
    const wrappedLines = this.wrapText(text, indentLength);

    // Format each wrapped line with proper indentation
    return wrappedLines
      .map((line, index) => {
        // First line has the connector prefix
        if (index === 0) {
          return fullPrefix + line;
        }
        // Continuation lines are aligned with the content
        return " ".repeat(indentLength) + line;
      })
      .join("\n");
  }

  /**
   * Splits a path into its component parts, removing empty segments
   * @param path Path string
   * @returns Array of path segments
   */
  private getPathParts(path: string): string[] {
    return path.split("/").filter(Boolean);
  }

  /**
   * Builds a hierarchical tree structure from the directory map
   * @returns Tree node representing the directory structure
   */
  private buildTreeStructure(): TreeNode {
    const tree: TreeNode = new Map();

    // Sort paths to ensure consistent output
    const sortedPaths = Array.from(this.dirMap.keys()).sort();

    for (const path of sortedPaths) {
      let current = tree;
      const parts = this.getPathParts(path);

      // Build the directory structure
      for (const part of parts) {
        if (!current.has(part)) {
          current.set(part, new Map());
        }

        const next = current.get(part);
        if (next instanceof Map) {
          current = next;
        }
      }

      // Add files to the current directory (sorted for consistency)
      const files = Array.from(this.dirMap.get(path) || []).sort();
      for (const file of files) {
        current.set(file, null);
      }
    }

    return tree;
  }

  /**
   * Renders a tree structure as a string
   * @param node Current tree node
   * @param prefix Current indentation prefix
   * @returns Formatted tree string
   */
  private renderTree(node: TreeNode, prefix: string = ""): string {
    let result = "";
    const entries = Array.from(node.entries());

    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1;

      // Choose appropriate tree symbols
      const connector = isLast ? this.symbols.LAST_BRANCH : this.symbols.BRANCH;
      const newPrefix =
        prefix + (isLast ? this.symbols.INDENT : this.symbols.VERTICAL);

      // Render the current line with proper wrapping
      result += this.renderLine(key, prefix, connector) + "\n";

      // Recursively render children if this is a directory
      if (value instanceof Map) {
        result += this.renderTree(value, newPrefix);
      }
    });

    return result;
  }
}
