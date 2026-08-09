import type { IScanner, ScanContext } from "../core/ScannerEngine";
import type { VaultIssue } from "../models/VaultIssue";
import { makeIssue } from "../models/VaultIssue";
import { isExcludedPath } from "../utils/fileUtils";

export class EmptyNoteScanner implements IScanner {
  readonly id = "empty-notes";
  readonly label = "Empty Notes";

  async scan(ctx: ScanContext): Promise<VaultIssue[]> {
    const files = ctx.vault
      .getFiles()
      .filter(
        (file) =>
          file.extension === "md" && !isExcludedPath(file.path, ctx.settings.excludedFolders)
      );
    const issues: VaultIssue[] = [];
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      const note = await ctx.parser.parseFile(file);
      if (!note) continue;
      const hasContent =
        note.wordCount > 0 ||
        note.embeds.length > 0 ||
        note.wikilinks.length > 0 ||
        note.markdownHrefs.length > 0 ||
        note.hasTasks ||
        note.hasCodeBlock;
      if (!hasContent) {
        issues.push(makeIssue(this.id, file, "Empty note"));
      }
    }
    return issues;
  }
}