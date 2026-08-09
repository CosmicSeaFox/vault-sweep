import type { VaultIssue } from "./VaultIssue";

export type ScannerId =
  | "duplicates"
  | "attachments"
  | "empty-notes"
  | "untitled"
  | "orphans"
  | "large-files";

export type ScanIssues = Partial<Record<ScannerId, VaultIssue[]>>;

export interface ScanResult {
  ranAt: number;
  vaultSignature: string;
  settingsSignature: string;
  issues: ScanIssues;
}

export const SCANNER_ORDER: readonly ScannerId[] = [
  "duplicates",
  "attachments",
  "empty-notes",
  "untitled",
  "orphans",
  "large-files",
];

export const CATEGORY_META: Record<ScannerId, { label: string; icon: string }> = {
  duplicates: { label: "Duplicate Files", icon: "copy" },
  attachments: { label: "Unused Attachments", icon: "image" },
  "empty-notes": { label: "Empty Notes", icon: "file-text" },
  untitled: { label: "Untitled Notes", icon: "file-question" },
  orphans: { label: "Orphan Notes", icon: "link" },
  "large-files": { label: "Large Files", icon: "hard-drive" },
};