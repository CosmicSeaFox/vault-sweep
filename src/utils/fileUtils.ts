import type { TFile } from "obsidian";

export const ATTACHMENT_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "pdf",
  "docx",
  "xlsx",
  "zip",
]);

export function formatBytes(bytes: number): string {
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

export function formatRelativeDate(timestamp: number, now = Date.now()): string {
  const diffMs = now - timestamp;
  if (diffMs < 60_000) return "Just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function getExtension(path: string): string {
  const idx = path.lastIndexOf(".");
  if (idx < 0 || idx === path.length - 1) return "";
  return path.slice(idx + 1).toLowerCase();
}

export function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

export function getFolder(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx < 0 ? "" : path.slice(0, idx);
}

export function normalizeFolder(folder: string): string {
  return folder.replace(/^\/+|\/+$/g, "").toLowerCase();
}

export function isExcludedPath(filePath: string, excludedFolders: string[]): boolean {
  if (!excludedFolders || excludedFolders.length === 0) return false;
  const segments = filePath.toLowerCase().split("/");
  for (const raw of excludedFolders) {
    const folder = normalizeFolder(raw);
    if (!folder || folder === ".") continue;
    if (segments.includes(folder)) return true;
  }
  return false;
}

export function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export function computeVaultSignature(files: TFile[]): string {
  let h = 0;
  for (const file of files) {
    const token = `${file.path}:${file.stat.mtime}:${file.stat.size}`;
    for (let i = 0; i < token.length; i++) {
      h = (h * 31 + token.charCodeAt(i)) | 0;
    }
  }
  return (h >>> 0).toString(36);
}