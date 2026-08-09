import type { IScanner, ScanContext } from "../core/ScannerEngine";
import type { VaultIssue } from "../models/VaultIssue";
import { makeIssue } from "../models/VaultIssue";
import { isDailyNoteName, isUntitledName } from "../utils/parserUtils";
import { isExcludedPath } from "../utils/fileUtils";

export class UntitledScanner implements IScanner {
  readonly id = "untitled";
  readonly label = "Untitled Notes";

  async scan(ctx: ScanContext): Promise<VaultIssue[]> {
    const issues: VaultIssue[] = [];
    const files = ctx.vault
      .getFiles()
      .filter(
        (file) =>
          file.extension === "md" && !isExcludedPath(file.path, ctx.settings.excludedFolders)
      );
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (isUntitledName(file.basename) && !isDailyNoteName(file.basename)) {
        issues.push(makeIssue(this.id, file, "Untitled note"));
      }
    }
    return issues;
  }
}