import { setIcon } from "obsidian";
import type { ScannerId } from "../models/ScanResult";
import type VaultSweepPlugin from "../core/VaultSweepPlugin";

export class IssueCard {
  readonly root: HTMLElement;

  constructor(
    private readonly plugin: VaultSweepPlugin,
    private readonly id: ScannerId,
    private readonly count: number,
    label: string,
    icon: string
  ) {
    this.root = createDiv({ cls: "vaultsweep-card" });

    const title = this.root.createDiv({ cls: "vaultsweep-card-title" });

    const iconEl = title.createSpan();
    setIcon(iconEl, icon);

    title.createSpan({ text: label });

    const countEl = this.root.createDiv({
      cls: "vaultsweep-card-count",
      text: String(count),
    });

    if (count === 0) {
      countEl.classList.add("vaultsweep-card-empty");
    }

    const button = this.root.createEl("button", {
      text: count > 0 ? "Review Issues" : "No Issues",
      cls: "mod-cta",
    });

    button.disabled = count === 0;

    button.addEventListener("click", () => {
      this.plugin.openReview(this.id);
    });
  }
}
