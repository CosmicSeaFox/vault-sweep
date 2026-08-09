import type { TFile } from "obsidian";
import {
  countTasks,
  extractCanvasFileRefs,
  extractMarkdownHrefs,
  extractWikilinks,
  wordCount,
} from "../utils/parserUtils";

export type VaultReader = (file: TFile) => Promise<string>;

export interface ParsedNote {
  path: string;
  embeds: string[];
  wikilinks: string[];
  markdownHrefs: string[];
  refs: { target: string; isEmbed: boolean }[];
  canvasRefs: string[];
  hasTasks: boolean;
  hasCodeBlock: boolean;
  wordCount: number;
  textLength: number;
}

export class ParserService {
  private readonly notes = new Map<string, ParsedNote | null>();

  constructor(private readonly reader: VaultReader) {}

  async parseFile(file: TFile): Promise<ParsedNote | null> {
    const key = file.path;
    if (this.notes.has(key)) return this.notes.get(key) ?? null;
    let note: ParsedNote | null = null;
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
        textLength: content.length,
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
        textLength: content.length,
      };
    }
    this.notes.set(key, note);
    return note;
  }
}