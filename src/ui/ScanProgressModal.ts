import { App, Modal } from "obsidian";
import type { ScanProgress } from "../core/ScannerEngine";

export class ScanProgressModal extends Modal {
  private labelEl!: HTMLElement;
  private barEl!: HTMLElement;
  private statusEl!: HTMLElement;

  constructor(app: App, private readonly onCancel: () => void) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Scanning Vault");
    this.labelEl = this.contentEl.createDiv({
      cls: "vaultsweep-progress-label",
      text: "Preparing…",
    });
    this.barEl = this.contentEl.createDiv({ cls: "vaultsweep-progress" });
    this.statusEl = this.contentEl.createDiv({
      cls: "vaultsweep-progress-status",
      text: "",
    });
    const cancel = this.contentEl.createEl("button", { text: "Cancel", cls: "mod-warning" });
    cancel.addEventListener("click", () => this.onCancel());
  }

  update(progress: ScanProgress): void {
    this.labelEl.setText(progress.label);
    const pct =
      progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;
    this.statusEl.setText(`${progress.current} / ${progress.total}`);
    this.barEl.empty();
    const fill = this.barEl.createDiv({ cls: "vaultsweep-progress-bar" });
    fill.style.width = `${pct}%`;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}