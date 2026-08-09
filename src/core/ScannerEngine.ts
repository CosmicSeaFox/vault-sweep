import type { TFile, Vault } from "obsidian";
import type { ScannerId, ScanIssues } from "../models/ScanResult";
import type { VaultIssue } from "../models/VaultIssue";
import type { VaultSweepSettings } from "../models/Settings";
import { isScannerEnabled } from "../models/Settings";
import { isExcludedPath } from "../utils/fileUtils";
import { ParserService } from "../services/ParserService";

export interface ScanContext {
  vault: Vault;
  settings: VaultSweepSettings;
  parser: ParserService;
  signal: AbortSignal;
  progress(label: string, current: number, total: number): void;
}

export interface IScanner {
  readonly id: ScannerId;
  readonly label: string;
  scan(ctx: ScanContext): Promise<VaultIssue[]>;
}

export interface ScanProgress {
  scannerId: ScannerId;
  label: string;
  current: number;
  total: number;
}

export interface EngineRunOptions {
  vault: Vault;
  settings: VaultSweepSettings;
  signal: AbortSignal;
  onProgress(progress: ScanProgress): void;
}

export class ScannerEngine {
  constructor(
    private readonly scanners: readonly IScanner[],
    private readonly reader: (file: TFile) => Promise<string>
  ) {}

  async runAll(options: EngineRunOptions): Promise<ScanIssues> {
    const issues: ScanIssues = {};
    const parser = new ParserService(this.reader);
    const files = options.vault
      .getFiles()
      .filter((file) => !isExcludedPath(file.path, options.settings.excludedFolders));
    const total = files.length;
    for (const scanner of this.scanners) {
      if (!isScannerEnabled(options.settings, scanner.id)) continue;
      if (options.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      const ctx: ScanContext = {
        vault: options.vault,
        settings: options.settings,
        parser,
        signal: options.signal,
        progress: (label, current, totalItems) =>
          options.onProgress({ scannerId: scanner.id, label, current, total: totalItems }),
      };
      options.onProgress({ scannerId: scanner.id, label: scanner.label, current: 0, total });
      issues[scanner.id] = await scanner.scan(ctx);
      options.onProgress({ scannerId: scanner.id, label: scanner.label, current: total, total });
    }
    return issues;
  }
}