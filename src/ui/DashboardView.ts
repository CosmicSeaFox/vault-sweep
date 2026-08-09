import { ItemView, WorkspaceLeaf } from "obsidian";
import type VaultSweepPlugin from "../core/VaultSweepPlugin";
import type { ScanResult } from "../models/ScanResult";
import { CATEGORY_META, SCANNER_ORDER } from "../models/ScanResult";
import { IssueCard } from "./IssueCard";

export const DASHBOARD_VIEW_TYPE = "vault-sweep-dashboard";

export class DashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private readonly plugin: VaultSweepPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return DASHBOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "VaultSweep";
  }

  getIcon(): string {
    return "scan-search";
  }

  async onOpen(): Promise<void> {
    this.plugin.onDashboardOpened(this);
  }

  async onClose(): Promise<void> {
    this.plugin.onDashboardClosed();
  }

  render(result: ScanResult | null): void {
    const root = this.contentEl;
    root.empty();
    root.classList.add("vaultsweep-dashboard");

    const header = root.createDiv({ cls: "vaultsweep-header" });
    header.createEl("h2", { text: "VaultSweep" });
    const scanButton = header.createEl("button", { text: "Scan Vault", cls: "mod-cta" });
    scanButton.addEventListener("click", () => {
      void this.plugin.scan();
    });

    if (result === null) {
      root.createDiv({
        cls: "vaultsweep-stale",
        text: "No scan results yet. Run a scan to find cleanup opportunities.",
      });
      return;
    }

    if (this.plugin.isStale()) {
      root.createDiv({
        cls: "vaultsweep-stale",
        text: "The vault changed since the last scan. Rescan for accurate results.",
      });
    }

    root.createDiv({
      cls: "vaultsweep-last",
      text: `Last scanned: ${new Date(result.ranAt).toLocaleString()}`,
    });

    const grid = root.createDiv({ cls: "vaultsweep-grid" });
    for (const id of SCANNER_ORDER) {
      const issues = result.issues[id] ?? [];
      const meta = CATEGORY_META[id];
      grid.appendChild(new IssueCard(this.plugin, id, issues.length, meta.label, meta.icon).root);
    }
  }
}