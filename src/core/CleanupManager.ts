import type { TFile } from "obsidian";
import type { VaultSweepSettings } from "../models/Settings";
import { isExcludedPath } from "../utils/fileUtils";

export interface TrashableVault {
  trash(file: TFile, permanent: boolean): Promise<void>;
  delete(file: TFile): Promise<void>;
}

export interface CleanupResult {
  deleted: string[];
  failed: { path: string; error: unknown }[];
}

export type DeleteMode = "trash" | "permanent";

export class CleanupManager {
  constructor(
    private readonly vault: TrashableVault,
    public settings: VaultSweepSettings
  ) {}

  async deleteFiles(files: TFile[], mode: DeleteMode = "trash"): Promise<CleanupResult> {
    const deleted: string[] = [];
    const failed: { path: string; error: unknown }[] = [];
    for (const file of files) {
      if (isExcludedPath(file.path, this.settings.excludedFolders)) {
        failed.push({ path: file.path, error: new Error("Path is in an excluded folder") });
        continue;
      }
      try {
        if (mode === "permanent") {
          await this.vault.delete(file);
        } else {
          await this.vault.trash(file, true);
        }
        deleted.push(file.path);
      } catch (error) {
        failed.push({ path: file.path, error });
      }
    }
    return { deleted, failed };
  }
}