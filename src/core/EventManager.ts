import { type App, type EventRef } from "obsidian";

const DEBOUNCE_MS = 1500;

export class EventManager {
  private refs: EventRef[] = [];
  private timer: number | null = null;

  constructor(private readonly app: App) {}

  start(onChange: () => void): void {
    const handled = (): void => {
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => {
        this.timer = null;
        onChange();
      }, DEBOUNCE_MS);
    };
    this.refs.push(this.app.vault.on("create", handled));
    this.refs.push(this.app.vault.on("delete", handled));
    this.refs.push(this.app.vault.on("rename", handled));
    this.refs.push(this.app.vault.on("modify", handled));
  }

  stop(): void {
    for (const ref of this.refs) this.app.vault.offref(ref);
    this.refs = [];
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}