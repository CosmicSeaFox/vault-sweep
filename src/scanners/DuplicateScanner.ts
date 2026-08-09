import type { TFile } from "obsidian";
import type { IScanner, ScanContext } from "../core/ScannerEngine";
import type { VaultIssue } from "../models/VaultIssue";
import { makeIssue } from "../models/VaultIssue";
import { isExcludedPath } from "../utils/fileUtils";

export class DuplicateScanner implements IScanner {
  readonly id = "duplicates";
  readonly label = "Duplicate Files";

  async scan(ctx: ScanContext): Promise<VaultIssue[]> {
    const groups = new Map<string, TFile[]>();
    const files = ctx.vault
      .getFiles()
      .filter((file) => !isExcludedPath(file.path, ctx.settings.excludedFolders));
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      const key = file.name.toLowerCase();
      const group = groups.get(key);
      if (group) {
        group.push(file);
      } else {
        groups.set(key, [file]);
      }
    }

    const issues: VaultIssue[] = [];
    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      for (const file of group) {
        issues.push(
          makeIssue(this.id, file, `Duplicate name in ${group.length} locations`, key)
        );
      }
    }
    return issues;
  }
}