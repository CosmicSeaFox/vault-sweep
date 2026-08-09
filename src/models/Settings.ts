import type { ScannerId } from "./ScanResult";

export interface VaultSweepSettings {
  enableDuplicates: boolean;
  enableAttachments: boolean;
  enableEmptyNotes: boolean;
  enableUntitled: boolean;
  enableOrphans: boolean;
  enableLargeFiles: boolean;
  excludedFolders: string[];
  largeFileThresholdMB: number;
}

export const DEFAULT_SETTINGS: VaultSweepSettings = {
  enableDuplicates: true,
  enableAttachments: true,
  enableEmptyNotes: true,
  enableUntitled: true,
  enableOrphans: true,
  enableLargeFiles: true,
  excludedFolders: [],
  largeFileThresholdMB: 50,
};

export function isScannerEnabled(settings: VaultSweepSettings, id: ScannerId): boolean {
  switch (id) {
    case "duplicates":
      return settings.enableDuplicates;
    case "attachments":
      return settings.enableAttachments;
    case "empty-notes":
      return settings.enableEmptyNotes;
    case "untitled":
      return settings.enableUntitled;
    case "orphans":
      return settings.enableOrphans;
    case "large-files":
      return settings.enableLargeFiles;
  }
}