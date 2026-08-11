/* VaultSweep - generated bundle, do not edit */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => main_default
});
module.exports = __toCommonJS(main_exports);

// src/core/VaultSweepPlugin.ts
var import_obsidian6 = require("obsidian");

// src/models/Settings.ts
var DEFAULT_SETTINGS = {
  enableDuplicates: true,
  enableAttachments: true,
  enableEmptyNotes: true,
  enableUntitled: true,
  enableOrphans: true,
  enableLargeFiles: true,
  excludedFolders: [],
  largeFileThresholdMB: 50
};
function isScannerEnabled(settings, id) {
  switch (id) {
    case "duplicates":
      return settings.enableDuplicates;
    case "attachments":
      return settings.enableAttachments;
    case "empty-notes":
      return settings.enableEmptyNotes;
    case "untitled":
      return settings.enableUntitled;
    case "orphans":
      return settings.enableOrphans;
    case "large-files":
      return settings.enableLargeFiles;
  }
}

// src/models/VaultIssue.ts
function makeIssue(scannerId, file, extra, groupId) {
  return {
    id: `${scannerId}:${file.path}`,
    scannerId,
    filePath: file.path,
    fileName: file.name,
    size: file.stat.size,
    created: file.stat.ctime,
    modified: file.stat.mtime,
    extra,
    groupId
  };
}

// src/utils/fileUtils.ts
var ATTACHMENT_EXTENSIONS = /* @__PURE__ */ new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "pdf",
  "docx",
  "xlsx",
  "zip"
]);
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}
function formatRelativeDate(timestamp, now = Date.now()) {
  const diffMs = now - timestamp;
  if (diffMs < 6e4) return "Just now";
  const minutes = Math.floor(diffMs / 6e4);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
function normalizeFolder(folder) {
  return folder.replace(/^\/+|\/+$/g, "").toLowerCase();
}
function isExcludedPath(filePath, excludedFolders) {
  if (!excludedFolders || excludedFolders.length === 0) return false;
  const segments = filePath.toLowerCase().split("/");
  for (const raw of excludedFolders) {
    const folder = normalizeFolder(raw);
    if (!folder || folder === ".") continue;
    if (segments.includes(folder)) return true;
  }
  return false;
}
function computeVaultSignature(files) {
  let h = 0;
  for (const file of files) {
    const token = `${file.path}:${file.stat.mtime}:${file.stat.size}`;
    for (let i = 0; i < token.length; i++) {
      h = h * 31 + token.charCodeAt(i) | 0;
    }
  }
  return (h >>> 0).toString(36);
}

// src/scanners/DuplicateScanner.ts
var DuplicateScanner = class {
  constructor() {
    this.id = "duplicates";
    this.label = "Duplicate Files";
  }
  async scan(ctx) {
    const groups = /* @__PURE__ */ new Map();
    const files = ctx.vault.getFiles().filter((file) => !isExcludedPath(file.path, ctx.settings.excludedFolders));
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      const key = file.name.toLowerCase();
      const group = groups.get(key);
      if (group) {
        group.push(file);
      } else {
        groups.set(key, [file]);
      }
    }
    const issues = [];
    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      for (const file of group) {
        issues.push(
          makeIssue(this.id, file, `Duplicate name in ${group.length} locations`, key)
        );
      }
    }
    return issues;
  }
};

// src/scanners/AttachmentScanner.ts
var AttachmentScanner = class {
  constructor() {
    this.id = "attachments";
    this.label = "Unused Attachments";
  }
  async scan(ctx) {
    const files = ctx.vault.getFiles().filter((file) => !isExcludedPath(file.path, ctx.settings.excludedFolders));
    const referencedNames = /* @__PURE__ */ new Set();
    const referencedPaths = /* @__PURE__ */ new Set();
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (file.extension !== "md" && file.extension !== "canvas") continue;
      const note = await ctx.parser.parseFile(file);
      if (!note) continue;
      const targets = [
        ...note.embeds,
        ...note.wikilinks,
        ...note.markdownHrefs,
        ...note.canvasRefs
      ];
      for (const target of targets) {
        const name = target.split("/").pop() ?? target;
        referencedNames.add(name.toLowerCase());
        referencedPaths.add(target.toLowerCase());
      }
    }
    const issues = [];
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (!ATTACHMENT_EXTENSIONS.has(file.extension)) continue;
      const nameLower = file.name.toLowerCase();
      const pathLower = file.path.toLowerCase();
      if (referencedNames.has(nameLower)) continue;
      const usedByPath = [...referencedPaths].some(
        (ref) => ref.includes("/") && pathLower.endsWith(ref)
      );
      if (usedByPath) continue;
      issues.push(makeIssue(this.id, file, "Unused attachment"));
    }
    return issues;
  }
};

// src/scanners/EmptyNoteScanner.ts
var EmptyNoteScanner = class {
  constructor() {
    this.id = "empty-notes";
    this.label = "Empty Notes";
  }
  async scan(ctx) {
    const files = ctx.vault.getFiles().filter(
      (file) => file.extension === "md" && !isExcludedPath(file.path, ctx.settings.excludedFolders)
    );
    const issues = [];
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      const note = await ctx.parser.parseFile(file);
      if (!note) continue;
      const hasContent = note.wordCount > 0 || note.embeds.length > 0 || note.wikilinks.length > 0 || note.markdownHrefs.length > 0 || note.hasTasks || note.hasCodeBlock;
      if (!hasContent) {
        issues.push(makeIssue(this.id, file, "Empty note"));
      }
    }
    return issues;
  }
};

// src/utils/parserUtils.ts
var WIKILINK_RE = /!?\[\[([^[]+?)\]\]/g;
var MD_LINK_RE = /!?\[[^]]*\]\(([^)]+)\)/g;
var TASK_RE = /^\s*[-*]\s*\[[ xX]\]/gm;
function isExternalLink(target) {
  return /^(https?:|mailto:|file:|app:)/i.test(target);
}
function cleanWikilinkTarget(inner) {
  let target = inner.trim();
  const pipeIdx = target.indexOf("|");
  if (pipeIdx >= 0) {
    target = target.slice(0, pipeIdx).trim();
  }
  const hashIdx = target.indexOf("#");
  if (hashIdx >= 0) {
    target = target.slice(0, hashIdx).trim();
  }
  return target;
}
function extractWikilinks(content) {
  const out = [];
  WIKILINK_RE.lastIndex = 0;
  let m;
  while ((m = WIKILINK_RE.exec(content)) !== null) {
    const isEmbed = m[0].startsWith("!");
    const target = cleanWikilinkTarget(m[1]);
    if (!target || target.startsWith("#")) {
      continue;
    }
    out.push({ target, isEmbed });
  }
  return out;
}
function extractMarkdownHrefs(content) {
  const out = [];
  MD_LINK_RE.lastIndex = 0;
  let m;
  while ((m = MD_LINK_RE.exec(content)) !== null) {
    const raw = m[1].trim();
    if (!raw) {
      continue;
    }
    const first = raw.split(/\s/)[0];
    if (isExternalLink(first) || first.startsWith("#") || first.startsWith("javascript:")) {
      continue;
    }
    out.push(first);
  }
  return out;
}
function countTasks(content) {
  TASK_RE.lastIndex = 0;
  const matches = content.match(TASK_RE);
  return matches ? matches.length : 0;
}
function stripFrontmatter(content) {
  if (!content.startsWith("---")) {
    return content;
  }
  const end = content.indexOf("\n---", 3);
  if (end === -1) {
    return content;
  }
  return content.slice(end + 4).replace(/^\r?\n/, "");
}
function wordCount(content) {
  const body = stripFrontmatter(content);
  const prose = body.replace(/!?\[\[[^[]*\]\]/g, " ").replace(/!?\[[^]]*\]\([^)]*\)/g, " ");
  return prose.split(/\s+/).filter((word) => word.length > 0).length;
}
function extractCanvasFileRefs(content) {
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    return [];
  }
  const refs = [];
  const walk = (obj) => {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        walk(item);
      }
      return;
    }
    if (!obj || typeof obj !== "object") {
      return;
    }
    const record = obj;
    if (typeof record.file === "string") {
      refs.push(record.file);
    }
    for (const value of Object.values(record)) {
      if (value !== record.file) {
        walk(value);
      }
    }
  };
  walk(data);
  return refs;
}
function isUntitledName(name) {
  return /^(untitled|new note)( \d+)?$/i.test(name);
}
function isDailyNoteName(name) {
  return /^\d{4}-\d{2}-\d{2}$/.test(name);
}

// src/scanners/UntitledScanner.ts
var UntitledScanner = class {
  constructor() {
    this.id = "untitled";
    this.label = "Untitled Notes";
  }
  async scan(ctx) {
    const issues = [];
    const files = ctx.vault.getFiles().filter(
      (file) => file.extension === "md" && !isExcludedPath(file.path, ctx.settings.excludedFolders)
    );
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (isUntitledName(file.basename) && !isDailyNoteName(file.basename)) {
        issues.push(makeIssue(this.id, file, "Untitled note"));
      }
    }
    return issues;
  }
};

// src/scanners/OrphanScanner.ts
var OrphanScanner = class {
  constructor() {
    this.id = "orphans";
    this.label = "Orphan Notes";
  }
  async scan(ctx) {
    const files = ctx.vault.getFiles().filter((file) => !isExcludedPath(file.path, ctx.settings.excludedFolders));
    const byName = /* @__PURE__ */ new Map();
    const byPath = /* @__PURE__ */ new Map();
    for (const file of files) {
      const name = file.basename.toLowerCase();
      const set = byName.get(name);
      if (set) set.add(file.path);
      else byName.set(name, /* @__PURE__ */ new Set([file.path]));
      const pathSet = byPath.get(file.path.toLowerCase());
      if (pathSet) pathSet.add(file.path);
      else byPath.set(file.path.toLowerCase(), /* @__PURE__ */ new Set([file.path]));
    }
    const referenced = /* @__PURE__ */ new Set();
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (file.extension !== "md") continue;
      const note = await ctx.parser.parseFile(file);
      if (!note) continue;
      const targets = [...note.embeds, ...note.wikilinks, ...note.markdownHrefs];
      for (const target of targets) {
        if (target.startsWith("http")) continue;
        const clean = target.split("#")[0].split("|")[0];
        const name = (clean.split("/").pop() ?? clean).replace(/\.[^.]+$/, "");
        const nameMatches = byName.get(name.toLowerCase());
        if (nameMatches) {
          for (const path of nameMatches) {
            if (path !== file.path) referenced.add(path);
          }
        }
        const pathMatches = byPath.get(clean.toLowerCase());
        if (pathMatches) {
          for (const path of pathMatches) {
            if (path !== file.path) referenced.add(path);
          }
        }
      }
    }
    const issues = [];
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (file.extension !== "md") continue;
      if (!referenced.has(file.path)) {
        issues.push(makeIssue(this.id, file, "Orphan note (no incoming links)"));
      }
    }
    return issues;
  }
};

// src/scanners/LargeFileScanner.ts
var LargeFileScanner = class {
  constructor() {
    this.id = "large-files";
    this.label = "Large Files";
  }
  async scan(ctx) {
    const threshold = ctx.settings.largeFileThresholdMB * 1024 * 1024;
    const files = ctx.vault.getFiles().filter(
      (file) => !file.path.startsWith(".git/") && !isExcludedPath(file.path, ctx.settings.excludedFolders)
    );
    const issues = [];
    for (const file of files) {
      if (ctx.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      if (file.stat.size >= threshold) {
        issues.push(makeIssue(this.id, file, `Over ${ctx.settings.largeFileThresholdMB} MB`));
      }
    }
    return issues;
  }
};

// src/scanners/index.ts
var SCANNERS = [
  new DuplicateScanner(),
  new AttachmentScanner(),
  new EmptyNoteScanner(),
  new UntitledScanner(),
  new OrphanScanner(),
  new LargeFileScanner()
];

// src/services/ParserService.ts
var ParserService = class {
  constructor(reader) {
    this.reader = reader;
    this.notes = /* @__PURE__ */ new Map();
  }
  async parseFile(file) {
    const key = file.path;
    if (this.notes.has(key)) return this.notes.get(key) ?? null;
    let note = null;
    if (file.extension === "canvas") {
      const content = await this.reader(file);
      note = {
        path: file.path,
        embeds: [],
        wikilinks: [],
        markdownHrefs: [],
        refs: [],
        canvasRefs: extractCanvasFileRefs(content),
        hasTasks: false,
        hasCodeBlock: false,
        wordCount: 0,
        textLength: content.length
      };
    } else if (file.extension === "md") {
      const content = await this.reader(file);
      const refs = extractWikilinks(content);
      note = {
        path: file.path,
        embeds: refs.filter((r) => r.isEmbed).map((r) => r.target),
        wikilinks: refs.filter((r) => !r.isEmbed).map((r) => r.target),
        markdownHrefs: extractMarkdownHrefs(content),
        refs,
        canvasRefs: [],
        hasTasks: countTasks(content) > 0,
        hasCodeBlock: /^```/m.test(content),
        wordCount: wordCount(content),
        textLength: content.length
      };
    }
    this.notes.set(key, note);
    return note;
  }
};

// src/core/ScannerEngine.ts
var ScannerEngine = class {
  constructor(scanners, reader) {
    this.scanners = scanners;
    this.reader = reader;
  }
  async runAll(options) {
    const issues = {};
    const parser = new ParserService(this.reader);
    const files = options.vault.getFiles().filter((file) => !isExcludedPath(file.path, options.settings.excludedFolders));
    const total = files.length;
    for (const scanner of this.scanners) {
      if (!isScannerEnabled(options.settings, scanner.id)) continue;
      if (options.signal.aborted) throw new DOMException("Scan cancelled", "AbortError");
      const ctx = {
        vault: options.vault,
        settings: options.settings,
        parser,
        signal: options.signal,
        progress: (label, current, totalItems) => options.onProgress({ scannerId: scanner.id, label, current, total: totalItems })
      };
      options.onProgress({ scannerId: scanner.id, label: scanner.label, current: 0, total });
      issues[scanner.id] = await scanner.scan(ctx);
      options.onProgress({ scannerId: scanner.id, label: scanner.label, current: total, total });
    }
    return issues;
  }
};

// src/core/EventManager.ts
var DEBOUNCE_MS = 1500;
var EventManager = class {
  constructor(app) {
    this.app = app;
    this.refs = [];
    this.timer = null;
  }
  start(onChange) {
    const handled = () => {
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
  stop() {
    for (const ref of this.refs) this.app.vault.offref(ref);
    this.refs = [];
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }
};

// src/core/CleanupManager.ts
var CleanupManager = class {
  constructor(vault, settings) {
    this.vault = vault;
    this.settings = settings;
  }
  async deleteFiles(files, mode = "trash") {
    const deleted = [];
    const failed = [];
    for (const file of files) {
      if (isExcludedPath(file.path, this.settings.excludedFolders)) {
        failed.push({ path: file.path, error: new Error("Path is in an excluded folder") });
        continue;
      }
      try {
        if (mode === "permanent") {
          await this.vault.delete(file);
        } else {
          await this.vault.trash(file, true);
        }
        deleted.push(file.path);
      } catch (error) {
        failed.push({ path: file.path, error });
      }
    }
    return { deleted, failed };
  }
};

// src/services/StorageService.ts
var StorageService = class {
  constructor(loadData, saveData) {
    this.loadData = loadData;
    this.saveData = saveData;
  }
  async load() {
    const raw = await this.loadData();
    if (!raw || typeof raw !== "object") {
      return {};
    }
    return raw;
  }
  async saveSettings(settings) {
    const data = await this.load();
    data.settings = settings;
    await this.saveData(data);
  }
  async saveScan(scan) {
    const data = await this.load();
    data.scan = scan;
    await this.saveData(data);
  }
  async clearScan() {
    const data = await this.load();
    delete data.scan;
    await this.saveData(data);
  }
};

// src/services/CacheService.ts
var MAX_ISSUES_PER_CATEGORY = 2e3;
var CacheService = class {
  constructor(storage) {
    this.storage = storage;
    this.result = null;
  }
  async load() {
    const data = await this.storage.load();
    this.result = data.scan ?? null;
  }
  getResult() {
    return this.result;
  }
  getIssues(id) {
    return this.result?.issues[id] ?? [];
  }
  saveResult(scan) {
    this.result = scan;
    const capped = { ...scan, issues: {} };
    for (const [id, arr] of Object.entries(scan.issues)) {
      capped.issues[id] = arr.slice(0, MAX_ISSUES_PER_CATEGORY);
    }
    return this.storage.saveScan(capped);
  }
  clear() {
    this.result = null;
  }
  isStale(vaultSignature, settingsSignature) {
    if (!this.result) return true;
    return this.result.vaultSignature !== vaultSignature || this.result.settingsSignature !== settingsSignature;
  }
};

// src/ui/DashboardView.ts
var import_obsidian2 = require("obsidian");

// src/models/ScanResult.ts
var SCANNER_ORDER = [
  "duplicates",
  "attachments",
  "empty-notes",
  "untitled",
  "orphans",
  "large-files"
];
var CATEGORY_META = {
  duplicates: { label: "Duplicate Files", icon: "copy" },
  attachments: { label: "Unused Attachments", icon: "image" },
  "empty-notes": { label: "Empty Notes", icon: "file-text" },
  untitled: { label: "Untitled Notes", icon: "file-question" },
  orphans: { label: "Orphan Notes", icon: "link" },
  "large-files": { label: "Large Files", icon: "hard-drive" }
};

// src/ui/IssueCard.ts
var import_obsidian = require("obsidian");
var IssueCard = class {
  constructor(plugin, id, count, label, icon) {
    this.plugin = plugin;
    this.id = id;
    this.count = count;
    this.root = createDiv({ cls: "vaultsweep-card" });
    const title = this.root.createDiv({ cls: "vaultsweep-card-title" });
    const iconEl = title.createSpan();
    (0, import_obsidian.setIcon)(iconEl, icon);
    title.createSpan({ text: label });
    const countEl = this.root.createDiv({
      cls: "vaultsweep-card-count",
      text: String(count)
    });
    if (count === 0) {
      countEl.classList.add("vaultsweep-card-empty");
    }
    const button = this.root.createEl("button", {
      text: count > 0 ? "Review Issues" : "No Issues",
      cls: "mod-cta"
    });
    button.disabled = count === 0;
    button.addEventListener("click", () => {
      this.plugin.openReview(this.id);
    });
  }
};

// src/ui/DashboardView.ts
var DASHBOARD_VIEW_TYPE = "vault-sweep-dashboard";
var DashboardView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return DASHBOARD_VIEW_TYPE;
  }
  getDisplayText() {
    return "VaultSweep";
  }
  getIcon() {
    return "scan-search";
  }
  async onOpen() {
    this.plugin.onDashboardOpened(this);
  }
  async onClose() {
    this.plugin.onDashboardClosed();
  }
  render(result) {
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
        text: "No scan results yet. Run a scan to find cleanup opportunities."
      });
      return;
    }
    if (this.plugin.isStale()) {
      root.createDiv({
        cls: "vaultsweep-stale",
        text: "The vault changed since the last scan. Rescan for accurate results."
      });
    }
    root.createDiv({
      cls: "vaultsweep-last",
      text: `Last scanned: ${new Date(result.ranAt).toLocaleString()}`
    });
    const grid = root.createDiv({ cls: "vaultsweep-grid" });
    for (const id of SCANNER_ORDER) {
      const issues = result.issues[id] ?? [];
      const meta = CATEGORY_META[id];
      grid.appendChild(new IssueCard(this.plugin, id, issues.length, meta.label, meta.icon).root);
    }
  }
};

// src/ui/CleanerModal.ts
var import_obsidian3 = require("obsidian");
var CleanerModal = class extends import_obsidian3.Modal {
  constructor(app, plugin, issues, initialCategory) {
    super(app);
    this.plugin = plugin;
    this.selected = /* @__PURE__ */ new Set();
    this.issues = issues;
    this.activeCategory = initialCategory;
  }
  onOpen() {
    this.titleEl.setText("Review Issues");
    this.tabsEl = this.contentEl.createDiv({ cls: "vaultsweep-tabs" });
    for (const id of SCANNER_ORDER) {
      const tab = this.tabsEl.createEl("button", {
        text: `${CATEGORY_META[id].label} (${(this.issues[id] ?? []).length})`,
        cls: "vaultsweep-tab"
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
  switchCategory(id) {
    this.activeCategory = id;
    this.selected.clear();
    for (const tab of Array.from(this.tabsEl.children)) {
      tab.removeClass("vaultsweep-tab-active");
    }
    const current = this.tabsEl.children[SCANNER_ORDER.indexOf(id)];
    current?.addClass("vaultsweep-tab-active");
    this.renderList();
  }
  renderList() {
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
  buildRow(issue) {
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
    const meta = [issue.filePath];
    meta.push(formatBytes(issue.size));
    meta.push(`created ${formatRelativeDate(issue.created)}`);
    meta.push(`modified ${formatRelativeDate(issue.modified)}`);
    main.createDiv({ cls: "vaultsweep-row-meta", text: meta.join(" \xB7 ") });
    if (issue.extra) {
      main.createDiv({ cls: "vaultsweep-row-extra", text: issue.extra });
    }
    return row;
  }
  updateDeleteButton() {
    this.deleteBtn.setText(`Delete Selected (${this.selected.size})`);
    this.deleteBtn.disabled = this.selected.size === 0;
  }
  async confirmDelete() {
    if (this.selected.size === 0) {
      new import_obsidian3.Notice("Select at least one item");
      return;
    }
    const issues = (this.issues[this.activeCategory] ?? []).filter(
      (issue) => this.selected.has(issue.filePath)
    );
    const confirmed = await new Promise((resolve) => {
      const modal = new ConfirmDeleteModal(this.app, issues.length, resolve);
      modal.open();
    });
    if (confirmed === null) return;
    const result = await this.plugin.deleteFilesOf(issues, confirmed);
    if (result.deleted.length > 0) {
      new import_obsidian3.Notice(
        confirmed === "permanent" ? `Permanently deleted ${result.deleted.length} file(s)` : `Moved ${result.deleted.length} file(s) to trash`
      );
    }
    if (result.failed.length > 0) {
      new import_obsidian3.Notice(`${result.failed.length} file(s) could not be deleted`);
    }
    const removed = new Set(result.deleted);
    const remaining = (this.issues[this.activeCategory] ?? []).filter(
      (issue) => !removed.has(issue.filePath)
    );
    this.issues[this.activeCategory] = remaining;
    this.renderList();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ConfirmDeleteModal = class extends import_obsidian3.Modal {
  constructor(app, count, onResult) {
    super(app);
    this.count = count;
    this.onResult = onResult;
  }
  onOpen() {
    this.titleEl.setText("Confirm Deletion");
    this.contentEl.createDiv({
      text: `What should happen to the ${this.count} selected file(s)?`
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
      cls: "mod-warning"
    });
    perm.addEventListener("click", () => {
      this.onResult("permanent");
      this.close();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/ui/ScanProgressModal.ts
var import_obsidian4 = require("obsidian");
var ScanProgressModal = class extends import_obsidian4.Modal {
  constructor(app, onCancel) {
    super(app);
    this.onCancel = onCancel;
  }
  onOpen() {
    this.titleEl.setText("Scanning Vault");
    this.labelEl = this.contentEl.createDiv({
      cls: "vaultsweep-progress-label",
      text: "Preparing\u2026"
    });
    this.barEl = this.contentEl.createDiv({ cls: "vaultsweep-progress" });
    this.statusEl = this.contentEl.createDiv({
      cls: "vaultsweep-progress-status",
      text: ""
    });
    const cancel = this.contentEl.createEl("button", { text: "Cancel", cls: "mod-warning" });
    cancel.addEventListener("click", () => this.onCancel());
  }
  update(progress) {
    this.labelEl.setText(progress.label);
    const pct = progress.total > 0 ? Math.min(100, Math.round(progress.current / progress.total * 100)) : 0;
    this.statusEl.setText(`${progress.current} / ${progress.total}`);
    this.barEl.empty();
    const fill = this.barEl.createDiv({ cls: "vaultsweep-progress-bar" });
    fill.style.width = `${pct}%`;
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/ui/SettingsTab.ts
var import_obsidian5 = require("obsidian");
var SettingsTab = class extends import_obsidian5.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  getSettingDefinitions() {
    return [
      {
        type: "group",
        heading: "Scan",
        items: [
          {
            name: "Duplicate Files",
            desc: "Find files with the same name in different folders",
            control: {
              type: "toggle",
              key: "enableDuplicates"
            }
          },
          {
            name: "Unused Attachments",
            desc: "Find images, documents and archives not referenced anywhere",
            control: {
              type: "toggle",
              key: "enableAttachments"
            }
          },
          {
            name: "Empty Notes",
            desc: "Find notes with no text, links, or tasks",
            control: {
              type: "toggle",
              key: "enableEmptyNotes"
            }
          },
          {
            name: "Untitled Notes",
            desc: "Find Untitled, New Note, and empty daily notes",
            control: {
              type: "toggle",
              key: "enableUntitled"
            }
          },
          {
            name: "Orphan Notes",
            desc: "Find notes with no outgoing links and no backlinks",
            control: {
              type: "toggle",
              key: "enableOrphans"
            }
          },
          {
            name: "Large Files",
            desc: "Find files at or above the threshold below",
            control: {
              type: "toggle",
              key: "enableLargeFiles"
            }
          }
        ]
      },
      {
        type: "group",
        heading: "File scanning",
        items: [
          {
            name: "Large file threshold",
            desc: "Files at or above this size are flagged",
            render: (setting) => {
              new import_obsidian5.Setting(setting.settingEl).setName("Large file threshold").setDesc("Files at or above this size are flagged").addDropdown((dropdown) => {
                dropdown.addOption("50", "50 MB").addOption("100", "100 MB").addOption("500", "500 MB").setValue(
                  String(this.plugin.settings.largeFileThresholdMB)
                ).onChange(async (value) => {
                  this.plugin.settings.largeFileThresholdMB = Number(value);
                  await this.plugin.saveSettings();
                });
              });
            }
          },
          {
            name: "Ignored folders",
            desc: "Folders to skip entirely, one per line",
            render: (setting) => {
              new import_obsidian5.Setting(setting.settingEl).setName("Ignored folders").setDesc("Folders to skip entirely, one per line").addTextArea((textarea) => {
                textarea.setValue(
                  this.plugin.settings.excludedFolders.join("\n")
                ).onChange(async (value) => {
                  this.plugin.settings.excludedFolders = value.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
                  await this.plugin.saveSettings();
                });
              });
            }
          }
        ]
      },
      {
        type: "group",
        heading: "Cache",
        items: [
          {
            name: "Clear cached scan results",
            desc: "Forget stored results. Does not touch any files.",
            action: () => {
              this.plugin.clearCache();
            }
          }
        ]
      }
    ];
  }
};

// src/core/VaultSweepPlugin.ts
var VaultSweepPlugin = class extends import_obsidian6.Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = /* @__PURE__ */ new Set();
    this.dashboard = null;
    this.scanModal = null;
    this.scanAbort = null;
    this.scanning = false;
    this.storage = new StorageService(this.loadData.bind(this), this.saveData.bind(this));
    this.cache = new CacheService(this.storage);
    this.cleanup = new CleanupManager(app.vault, this.settings);
    this.engine = new ScannerEngine(SCANNERS, (file) => this.app.vault.cachedRead(file));
    this.events = new EventManager(app);
  }
  async onload() {
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
      }
    });
    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: () => {
        void this.openDashboard();
      }
    });
    this.addSettingTab(new SettingsTab(this.app, this));
  }
  onunload() {
    this.events.stop();
    this.scanAbort?.abort();
  }
  async loadSettings() {
    const data = await this.storage.load();
    this.settings = { ...DEFAULT_SETTINGS, ...data.settings ?? {} };
    this.cleanup.settings = this.settings;
  }
  async saveSettings() {
    await this.storage.saveSettings(this.settings);
    this.notifyChanged();
  }
  getResult() {
    return this.cache.getResult();
  }
  isStale() {
    return this.cache.isStale(
      computeVaultSignature(this.app.vault.getFiles()),
      JSON.stringify(this.settings)
    );
  }
  clearCache() {
    this.cache.clear();
    void this.storage.clearScan();
    this.notifyChanged();
  }
  async scanAndOpen() {
    await this.openDashboard();
    await this.scan();
  }
  async openDashboard() {
    const existing = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true });
  }
  async scan() {
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
        onProgress: (progress) => this.scanModal?.update(progress)
      });
      if (this.scanAbort.signal.aborted) {
        new import_obsidian6.Notice("VaultSweep scan cancelled");
        return;
      }
      const result = {
        ranAt: Date.now(),
        vaultSignature: computeVaultSignature(this.app.vault.getFiles()),
        settingsSignature: JSON.stringify(this.settings),
        issues
      };
      await this.cache.saveResult(result);
      this.notifyChanged();
      new import_obsidian6.Notice("VaultSweep scan complete");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        new import_obsidian6.Notice("VaultSweep scan cancelled");
      } else {
        console.error("VaultSweep scan failed", error);
        new import_obsidian6.Notice("VaultSweep scan failed");
      }
    } finally {
      this.scanModal?.close();
      this.scanModal = null;
      this.scanAbort = null;
      this.scanning = false;
    }
  }
  onDashboardOpened(view) {
    this.dashboard = view;
    view.render(this.cache.getResult());
    this.events.start(() => {
      this.cache.clear();
      this.notifyChanged();
    });
  }
  onDashboardClosed() {
    this.dashboard = null;
    this.events.stop();
  }
  onResultsChanged(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
  notifyChanged() {
    for (const listener of this.listeners) listener();
    this.dashboard?.render(this.cache.getResult());
  }
  openReview(category) {
    const issues = this.cache.getResult()?.issues ?? {};
    new CleanerModal(this.app, this, issues, category).open();
  }
  async deleteFilesOf(issues, mode = "trash") {
    const files = [];
    for (const issue of issues) {
      const file = this.app.vault.getAbstractFileByPath(issue.filePath);
      if (file instanceof import_obsidian6.TFile) files.push(file);
    }
    const result = await this.cleanup.deleteFiles(files, mode);
    this.cache.clear();
    void this.storage.clearScan();
    this.notifyChanged();
    return result;
  }
};

// src/main.ts
var main_default = VaultSweepPlugin;
