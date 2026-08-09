import type { TFile } from "obsidian";
import type { ScannerId } from "./ScanResult";

export interface VaultIssue {
  id: string;
  scannerId: ScannerId;
  filePath: string;
  fileName: string;
  size: number;
  created: number;
  modified: number;
  extra?: string;
  groupId?: string;
}

export function makeIssue(
  scannerId: ScannerId,
  file: TFile,
  extra?: string,
  groupId?: string
): VaultIssue {
  return {
    id: `${scannerId}:${file.path}`,
    scannerId,
    filePath: file.path,
    fileName: file.name,
    size: file.stat.size,
    created: file.stat.ctime,
    modified: file.stat.mtime,
    extra,
    groupId,
  };
}