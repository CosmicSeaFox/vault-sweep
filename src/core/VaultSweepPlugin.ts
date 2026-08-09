import { App, Notice, Plugin, PluginManifest, TFile } from "obsidian";
import { DEFAULT_SETTINGS, type VaultSweepSettings } from "../models/Settings";
import { SCANNERS } from "../scanners";
import type { ScanResult, ScannerId } from "../models/ScanResult";
import type { VaultIssue } from "../models/VaultIssue";
import { ScannerEngine } from "./ScannerEngine";
import { EventManager } from "./EventManager";
import { CleanupManager, type DeleteMode, type CleanupResult } from "./CleanupManager";
import { StorageService } from "../services/StorageService";
import { CacheService } from "../services/CacheService";
import { computeVaultSignature } from "../utils/fileUtils";
import { DashboardView, DASHBOARD_VIEW_TYPE } from "../ui/DashboardView";
import { CleanerModal } from "../ui/CleanerModal";
import { ScanProgressModal } from "../ui/ScanProgressModal";
import { SettingsTab } from "../ui/SettingsTab";

export default class VaultSweepPlugin extends Plugin {
  settings: VaultSweepSettings = { ...DEFAULT_SETTINGS };

  readonly cleanup: CleanupManager;

  private readonly storage: StorageService;
  private readonly cache: CacheService;
  private readonly engine: ScannerEngine;
  private readonly events: EventManager;
  private readonly listeners = new Set<() => void>();
  private dashboard: DashboardView | null = null;
  private scanModal: ScanProgressModal | null = null;
  private scanAbort: AbortController | null = null;
  private scanning = false;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.storage = new StorageService(this.loadData.bind(this), this.saveData.bind(this));
    this.cache = new CacheService(this.storage);
    this.cleanup = new CleanupManager(app.vault, this.settings);
    this.engine = new ScannerEngine(SCANNERS, (file) => this.app.vault.cachedRead(file));
    this.events = new EventManager(app);
  }

  async onload(): Promise<void> {
    await this.loadSettings();
    await this.cache.load();

    this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));

    this.addRibbonIcon("scan-search", "VaultSweep", () => {
      void this.openDashboard();
    });

    this.addCommand({
      id: "scan-vault",
      name: "Scan Vault",
      callback: () => {
        void this.scanAndOpen();
      },
    });

    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: () => {
        void this.openDashboard();
      },
    });

    this.addSettingTab(new SettingsTab(this.app, this));
  }

  onunload(): void {
    this.events.stop();
    this.scanAbort?.abort();
  }

  async loadSettings(): Promise<void> {
    const data = await this.storage.load();
    this.settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };
    this.cleanup.settings = this.settings;
  }

  async saveSettings(): Promise<void> {
    await this.storage.saveSettings(this.settings);
    this.notifyChanged();
  }

  getResult(): ScanResult | null {
    return this.cache.getResult();
  }

  isStale(): boolean {
    return this.cache.isStale(
      computeVaultSignature(this.app.vault.getFiles()),
      JSON.stringify(this.settings)
    );
  }

  clearCache(): void {
    this.cache.clear();
    void this.storage.clearScan();
    this.notifyChanged();
  }

  async scanAndOpen(): Promise<void> {
    await this.openDashboard();
    await this.scan();
  }

  async openDashboard(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true });
  }

  async scan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    this.scanAbort = new AbortController();
    this.scanModal = new ScanProgressModal(this.app, () => this.scanAbort?.abort());
    this.scanModal.open();
    try {
      const issues = await this.engine.runAll({
        vault: this.app.vault,
        settings: this.settings,
        signal: this.scanAbort.signal,
        onProgress: (progress) => this.scanModal?.update(progress),
      });
      if (this.scanAbort.signal.aborted) {
        new Notice("VaultSweep scan cancelled");
        return;
      }
      const result: ScanResult = {
        ranAt: Date.now(),
        vaultSignature: computeVaultSignature(this.app.vault.getFiles()),
        settingsSignature: JSON.stringify(this.settings),
        issues,
      };
      await this.cache.saveResult(result);
      this.notifyChanged();
      new Notice("VaultSweep scan complete");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        new Notice("VaultSweep scan cancelled");
      } else {
        console.error("VaultSweep scan failed", error);
        new Notice("VaultSweep scan failed");
      }
    } finally {
      this.scanModal?.close();
      this.scanModal = null;
      this.scanAbort = null;
      this.scanning = false;
    }
  }

  onDashboardOpened(view: DashboardView): void {
    this.dashboard = view;
    view.render(this.cache.getResult());
    this.events.start(() => {
      this.cache.clear();
      this.notifyChanged();
    });
  }

  onDashboardClosed(): void {
    this.dashboard = null;
    this.events.stop();
  }

  onResultsChanged(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyChanged(): void {
    for (const listener of this.listeners) listener();
    this.dashboard?.render(this.cache.getResult());
  }

  openReview(category: ScannerId): void {
    const issues = this.cache.getResult()?.issues ?? {};
    new CleanerModal(this.app, this, issues, category).open();
  }

  async deleteFilesOf(
    issues: VaultIssue[],
    mode: DeleteMode = "trash"
  ): Promise<CleanupResult> {
    const files: TFile[] = [];
    for (const issue of issues) {
      const file = this.app.vault.getAbstractFileByPath(issue.filePath);
      if (file instanceof TFile) files.push(file);
    }
    const result = await this.cleanup.deleteFiles(files, mode);
    this.cache.clear();
    void this.storage.clearScan();
    this.notifyChanged();
    return result;
  }
}