import type { IScanner, ScanContext } from "../core/ScannerEngine";
import type { VaultIssue } from "../models/VaultIssue";
import { makeIssue } from "../models/VaultIssue";
import { isExcludedPath } from "../utils/fileUtils";

export class LargeFileScanner implements IScanner {
  readonly id = "large-files";
  readonly label = "Large Files";

  async scan(ctx: ScanContext): Promise<VaultIssue[]> {
    const threshold = ctx.settings.largeFileThresholdMB * 1024 * 1024;
    const files = ctx.vault
      .getFiles()
      .filter(
        (file) =>
          !file.path.startsWith(".git/") &&
          !isExcludedPath(file.path, ctx.settings.excludedFolders)
      );
    const issues: VaultIssue[] = [];
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (file.stat.size >= threshold) {
        issues.push(makeIssue(this.id, file, `Over ${ctx.settings.largeFileThresholdMB} MB`));
      }
    }
    return issues;
  }
}