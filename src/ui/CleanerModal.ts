import { App, Modal, Notice } from "obsidian";
import type { ScanIssues, ScannerId } from "../models/ScanResult";
import { CATEGORY_META, SCANNER_ORDER } from "../models/ScanResult";
import type { VaultIssue } from "../models/VaultIssue";
import type { DeleteMode } from "../core/CleanupManager";
import type VaultSweepPlugin from "../core/VaultSweepPlugin";
import { formatBytes, formatRelativeDate } from "../utils/fileUtils";

export class CleanerModal extends Modal {
  private readonly issues: ScanIssues;
  private activeCategory: ScannerId;
  private selected = new Set<string>();
  private tabsEl!: HTMLElement;
  private listEl!: HTMLElement;
  private deleteBtn!: HTMLButtonElement;

  constructor(
    app: App,
    private readonly plugin: VaultSweepPlugin,
    issues: ScanIssues,
    initialCategory: ScannerId
  ) {
    super(app);
    this.issues = issues;
    this.activeCategory = initialCategory;
  }

  onOpen(): void {
    this.titleEl.setText("Review Issues");
    this.tabsEl = this.contentEl.createDiv({ cls: "vaultsweep-tabs" });
    for (const id of SCANNER_ORDER) {
      const tab = this.tabsEl.createEl("button", {
        text: `${CATEGORY_META[id].label} (${(this.issues[id] ?? []).length})`,
        cls: "vaultsweep-tab",
      });
      tab.addEventListener("click", () => this.switchCategory(id));
      if (id === this.activeCategory) tab.addClass("vaultsweep-tab-active");
    }

    this.listEl = this.contentEl.createDiv({ cls: "vaultsweep-list" });

    const footer = this.contentEl.createDiv({ cls: "vaultsweep-footer" });
    const closeBtn = footer.createEl("button", { text: "Close" });
    closeBtn.addEventListener("click", () => this.close());
    this.deleteBtn = footer.createEl("button", { text: "Delete Selected", cls: "mod-warning" });
    this.deleteBtn.addEventListener("click", () => void this.confirmDelete());

    this.renderList();
  }

  private switchCategory(id: ScannerId): void {
    this.activeCategory = id;
    this.selected.clear();
    for (const tab of Array.from(this.tabsEl.children)) {
      tab.removeClass("vaultsweep-tab-active");
    }
    const current = this.tabsEl.children[SCANNER_ORDER.indexOf(id)] as HTMLElement;
    current?.addClass("vaultsweep-tab-active");
    this.renderList();
  }

  private renderList(): void {
    this.listEl.empty();
    this.selected.clear();
    const issues = this.issues[this.activeCategory] ?? [];
    if (issues.length === 0) {
      this.listEl.createDiv({ cls: "vaultsweep-stale", text: "No issues in this category." });
    }
    for (const issue of issues) {
      this.listEl.appendChild(this.buildRow(issue));
    }
    this.updateDeleteButton();
  }

  private buildRow(issue: VaultIssue): HTMLElement {
    const row = this.listEl.createDiv({ cls: "vaultsweep-row" });
    const checkbox = row.createEl("input", { attr: { type: "checkbox" } });
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        this.selected.add(issue.filePath);
      } else {
        this.selected.delete(issue.filePath);
      }
      this.updateDeleteButton();
    });
    const main = row.createDiv({ cls: "vaultsweep-row-main" });
    main.createDiv({ cls: "vaultsweep-row-name", text: issue.fileName });
    const meta: string[] = [issue.filePath];
    meta.push(formatBytes(issue.size));
    meta.push(`created ${formatRelativeDate(issue.created)}`);
    meta.push(`modified ${formatRelativeDate(issue.modified)}`);
    main.createDiv({ cls: "vaultsweep-row-meta", text: meta.join(" · ") });
    if (issue.extra) {
      main.createDiv({ cls: "vaultsweep-row-extra", text: issue.extra });
    }
    return row;
  }

  private updateDeleteButton(): void {
    this.deleteBtn.setText(`Delete Selected (${this.selected.size})`);
    this.deleteBtn.disabled = this.selected.size === 0;
  }

  private async confirmDelete(): Promise<void> {
    if (this.selected.size === 0) {
      new Notice("Select at least one item");
      return;
    }
    const issues = (this.issues[this.activeCategory] ?? []).filter((issue) =>
      this.selected.has(issue.filePath)
    );
    const confirmed = await new Promise<DeleteMode | null>((resolve) => {
      const modal = new ConfirmDeleteModal(this.app, issues.length, resolve);
      modal.open();
    });
    if (confirmed === null) return;
    const result = await this.plugin.deleteFilesOf(issues, confirmed);
    if (result.deleted.length > 0) {
      new Notice(
        confirmed === "permanent"
          ? `Permanently deleted ${result.deleted.length} file(s)`
          : `Moved ${result.deleted.length} file(s) to trash`
      );
    }
    if (result.failed.length > 0) {
      new Notice(`${result.failed.length} file(s) could not be deleted`);
    }
    const removed = new Set(result.deleted);
    const remaining = (this.issues[this.activeCategory] ?? []).filter(
      (issue) => !removed.has(issue.filePath)
    );
    this.issues[this.activeCategory] = remaining;
    this.renderList();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ConfirmDeleteModal extends Modal {
  constructor(
    app: App,
    private readonly count: number,
    private readonly onResult: (choice: DeleteMode | null) => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Confirm Deletion");
    this.contentEl.createDiv({
      text: `What should happen to the ${this.count} selected file(s)?`,
    });
    const footer = this.contentEl.createDiv({ cls: "vaultsweep-footer" });
    const cancel = footer.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => {
      this.onResult(null);
      this.close();
    });
    const trash = footer.createEl("button", { text: "Move to Trash" });
    trash.addEventListener("click", () => {
      this.onResult("trash");
      this.close();
    });
    const perm = footer.createEl("button", {
      text: "Delete Permanently",
      cls: "mod-warning",
    });
    perm.addEventListener("click", () => {
      this.onResult("permanent");
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}