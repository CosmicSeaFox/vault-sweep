import type { VaultSweepSettings } from "../models/Settings";
import type { ScanResult } from "../models/ScanResult";

export interface StorageData {
  settings?: Partial<VaultSweepSettings>;
  scan?: ScanResult;
}

export class StorageService {
  constructor(
    private readonly loadData: () => Promise<unknown>,
    private readonly saveData: (data: unknown) => Promise<void>
  ) {}

  async load(): Promise<StorageData> {
    const raw = await this.loadData();

    if (!raw || typeof raw !== "object") {
      return {};
    }

    return raw;
  }

  async saveSettings(settings: VaultSweepSettings): Promise<void> {
    const data = await this.load();
    data.settings = settings;
    await this.saveData(data);
  }

  async saveScan(scan: ScanResult): Promise<void> {
    const data = await this.load();
    data.scan = scan;
    await this.saveData(data);
  }

  async clearScan(): Promise<void> {
    const data = await this.load();
    delete data.scan;
    await this.saveData(data);
  }
}
