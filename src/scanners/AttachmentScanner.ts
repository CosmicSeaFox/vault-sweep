import type { IScanner, ScanContext } from "../core/ScannerEngine";
import type { VaultIssue } from "../models/VaultIssue";
import { makeIssue } from "../models/VaultIssue";
import { ATTACHMENT_EXTENSIONS, isExcludedPath } from "../utils/fileUtils";

export class AttachmentScanner implements IScanner {
  readonly id = "attachments";
  readonly label = "Unused Attachments";

  async scan(ctx: ScanContext): Promise<VaultIssue[]> {
    const files = ctx.vault
      .getFiles()
      .filter((file) => !isExcludedPath(file.path, ctx.settings.excludedFolders));
    const referencedNames = new Set<string>();
    const referencedPaths = new Set<string>();

    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (file.extension !== "md" && file.extension !== "canvas") continue;
      const note = await ctx.parser.parseFile(file);
      if (!note) continue;
      const targets = [
        ...note.embeds,
        ...note.wikilinks,
        ...note.markdownHrefs,
        ...note.canvasRefs,
      ];
      for (const target of targets) {
        const name = target.split("/").pop() ?? target;
        referencedNames.add(name.toLowerCase());
        referencedPaths.add(target.toLowerCase());
      }
    }

    const issues: VaultIssue[] = [];
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (!ATTACHMENT_EXTENSIONS.has(file.extension)) continue;
      const nameLower = file.name.toLowerCase();
      const pathLower = file.path.toLowerCase();
      if (referencedNames.has(nameLower)) continue;
      const usedByPath = [...referencedPaths].some(
        (ref) => ref.includes("/") && pathLower.endsWith(ref)
      );
      if (usedByPath) continue;
      issues.push(makeIssue(this.id, file, "Unused attachment"));
    }
    return issues;
  }
}