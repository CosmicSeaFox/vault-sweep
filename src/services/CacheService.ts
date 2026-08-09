import type { ScanResult, ScannerId } from "../models/ScanResult";
import type { VaultIssue } from "../models/VaultIssue";
import type { StorageService } from "./StorageService";

const MAX_ISSUES_PER_CATEGORY = 2000;

export class CacheService {
  private result: ScanResult | null = null;

  constructor(private readonly storage: StorageService) {}

  async load(): Promise<void> {
    const data = await this.storage.load();
    this.result = data.scan ?? null;
  }

  getResult(): ScanResult | null {
    return this.result;
  }

  getIssues(id: ScannerId): VaultIssue[] {
    return this.result?.issues[id] ?? [];
  }

  saveResult(scan: ScanResult): Promise<void> {
    this.result = scan;
    const capped: ScanResult = { ...scan, issues: {} };
    for (const [id, arr] of Object.entries(scan.issues) as [ScannerId, VaultIssue[]][]) {
      capped.issues[id] = arr.slice(0, MAX_ISSUES_PER_CATEGORY);
    }
    return this.storage.saveScan(capped);
  }

  clear(): void {
    this.result = null;
  }

  isStale(vaultSignature: string, settingsSignature: string): boolean {
    if (!this.result) return true;
    return (
      this.result.vaultSignature !== vaultSignature ||
      this.result.settingsSignature !== settingsSignature
    );
  }
}