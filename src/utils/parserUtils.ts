const WIKILINK_RE = /!?\[\[([^[]+?)\]\]/g;
const MD_LINK_RE = /!?\[[^]]*\]\(([^)]+)\)/g;
const TASK_RE = /^\s*[-*]\s*\[[ xX]\]/gm;

export function isExternalLink(target: string): boolean {
  return /^(https?:|mailto:|file:|app:)/i.test(target);
}

export function cleanWikilinkTarget(inner: string): string {
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

export function extractWikilinks(
  content: string
): { target: string; isEmbed: boolean }[] {
  const out: { target: string; isEmbed: boolean }[] = [];

  WIKILINK_RE.lastIndex = 0;

  let m: RegExpExecArray | null;

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

export function extractMarkdownHrefs(content: string): string[] {
  const out: string[] = [];

  MD_LINK_RE.lastIndex = 0;

  let m: RegExpExecArray | null;

  while ((m = MD_LINK_RE.exec(content)) !== null) {
    const raw = m[1].trim();

    if (!raw) {
      continue;
    }

    const first = raw.split(/\s/)[0];

    if (
      isExternalLink(first) ||
      first.startsWith("#") ||
      first.startsWith("javascript:")
    ) {
      continue;
    }

    out.push(first);
  }

  return out;
}

export function countTasks(content: string): number {
  TASK_RE.lastIndex = 0;

  const matches = content.match(TASK_RE);

  return matches ? matches.length : 0;
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) {
    return content;
  }

  const end = content.indexOf("\n---", 3);

  if (end === -1) {
    return content;
  }

  return content.slice(end + 4).replace(/^\r?\n/, "");
}

export function wordCount(content: string): number {
  const body = stripFrontmatter(content);

  const prose = body
    .replace(/!?\[\[[^[]*\]\]/g, " ")
    .replace(/!?\[[^]]*\]\([^)]*\)/g, " ");

  return prose
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .length;
}

export function extractCanvasFileRefs(content: string): string[] {
  let data: unknown;

  try {
    data = JSON.parse(content);
  } catch {
    return [];
  }

  const refs: string[] = [];

  const walk = (obj: unknown): void => {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        walk(item);
      }

      return;
    }

    if (!obj || typeof obj !== "object") {
      return;
    }

    const record = obj as Record<string, unknown>;

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

export function isUntitledName(name: string): boolean {
  return /^(untitled|new note)( \d+)?$/i.test(name);
}

export function isDailyNoteName(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(name);
}
