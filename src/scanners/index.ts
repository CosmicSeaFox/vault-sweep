import { DuplicateScanner } from "./DuplicateScanner";
import { AttachmentScanner } from "./AttachmentScanner";
import { EmptyNoteScanner } from "./EmptyNoteScanner";
import { UntitledScanner } from "./UntitledScanner";
import { OrphanScanner } from "./OrphanScanner";
import { LargeFileScanner } from "./LargeFileScanner";
import type { IScanner } from "../core/ScannerEngine";

export const SCANNERS: readonly IScanner[] = [
  new DuplicateScanner(),
  new AttachmentScanner(),
  new EmptyNoteScanner(),
  new UntitledScanner(),
  new OrphanScanner(),
  new LargeFileScanner(),
];