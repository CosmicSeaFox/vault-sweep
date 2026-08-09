import type { IScanner, ScanContext } from "../core/ScannerEngine";
import type { VaultIssue } from "../models/VaultIssue";
import { makeIssue } from "../models/VaultIssue";
import { isExcludedPath } from "../utils/fileUtils";

export class OrphanScanner implements IScanner {
  readonly id = "orphans";
  readonly label = "Orphan Notes";

  async scan(ctx: ScanContext): Promise<VaultIssue[]> {
    const files = ctx.vault
      .getFiles()
      .filter((file) => !isExcludedPath(file.path, ctx.settings.excludedFolders));

    const byName = new Map<string, Set<string>>();
    const byPath = new Map<string, Set<string>>();
    for (const file of files) {
      const name = file.basename.toLowerCase();
      const set = byName.get(name);
      if (set) set.add(file.path);
      else byName.set(name, new Set([file.path]));
      const pathSet = byPath.get(file.path.toLowerCase());
      if (pathSet) pathSet.add(file.path);
      else byPath.set(file.path.toLowerCase(), new Set([file.path]));
    }

    const referenced = new Set<string>();
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (file.extension !== "md") continue;
      const note = await ctx.parser.parseFile(file);
      if (!note) continue;
      const targets = [...note.embeds, ...note.wikilinks, ...note.markdownHrefs];
      for (const target of targets) {
        if (target.startsWith("http")) continue;
        const clean = target.split("#")[0].split("|")[0];
        const name = (clean.split("/").pop() ?? clean).replace(/\.[^.]+$/, "");
        const nameMatches = byName.get(name.toLowerCase());
        if (nameMatches) {
          for (const path of nameMatches) {
            if (path !== file.path) referenced.add(path);
          }
        }
        const pathMatches = byPath.get(clean.toLowerCase());
        if (pathMatches) {
          for (const path of pathMatches) {
            if (path !== file.path) referenced.add(path);
          }
        }
      }
    }

    const issues: VaultIssue[] = [];
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (file.extension !== "md") continue;
      if (!referenced.has(file.path)) {
        issues.push(makeIssue(this.id, file, "Orphan note (no incoming links)"));
      }
    }
    return issues;
  }
}