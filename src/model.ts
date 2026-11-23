export type Rect = [number, number, number, number];
/** Zotero's native text position: `nextPageRects` continues the selection on page `pageIndex + 1`. */
export interface Position {
  pageIndex: number;
  rects: Rect[];
  nextPageRects?: Rect[];
}
export interface Glyph {
  c: string;
  rect: Rect;
  inlineRect: Rect;
  spaceAfter?: boolean;
  lineBreakAfter?: boolean;
  paragraphBreakAfter?: boolean;
  ignorable?: boolean;
  isolated?: boolean;
  rotation?: number;
  diagonal?: boolean;
}
export interface Page {
  index: number;
  label: string;
  chars: Glyph[];
  viewBox: Rect;
  partial?: boolean;
}
export interface Annotation {
  key: string;
  type: string;
  text: string;
  comment: string;
  color: string;
  tags: string[];
  pageLabel?: string;
  position: Position;
  external: boolean;
  fingerprint: string;
}
export interface FileStamp {
  path: string;
  hash: string;
  size: number;
  modified: number;
}
export interface AttachmentChoice {
  id: number;
  key: string;
  parentID: number;
  parentTitle: string;
  parentType: string;
  title: string;
  filename: string;
}
export interface Snapshot extends AttachmentChoice {
  libraryID: number;
  itemFingerprint: string;
  file: FileStamp;
  annotations: Annotation[];
}
export type EdgeVerdict = 'kept' | 'unverifiable' | 'expanded' | 'changed';
/**
 * A hyphen at the end of a line or page that a candidate reads differently from the PDF as printed:
 * `removed` joins the two fragments of the word, `kept` keeps the hyphen in the word. Either can be
 * wrong, because the same printed hyphen can divide a word or belong to it.
 */
export interface HyphenJoin {
  /** The PDF that holds the hyphen: the source (old) or the target (new) revision. */
  side: 'source' | 'target';
  pageIndex: number;
  pageLabel: string;
  /** Set when the word continues at the start of the following page. */
  nextPageLabel?: string;
  pageBreak: boolean;
  /** The hyphen as the text layer stores it, for example '-', '‐' or the soft hyphen U+00AD. */
  mark: string;
  /** Offset of the hyphen in the reader's text of its page; a dash that the reader drops has no width. */
  offset: number;
  /** Index of the original hyphen glyph, including glyphs missing from the reader's text. */
  glyphIndex: number;
  reading: 'removed' | 'kept';
  /** The divided word as printed, before and after the break. */
  fragment: { before: string; after: string };
}
export interface Candidate {
  id: string;
  pageIndex: number;
  pageLabel: string;
  start: number;
  end: number;
  /**
   * Set when the quote runs to the end of this page and continues from the start of the following
   * one. `start` and `end` above then delimit the first part; these offsets delimit the second.
   */
  nextPage?: { pageLabel: string; start: number; end: number };
  text: string;
  prefix: string;
  suffix: string;
  method: 'exact' | 'normalized';
  contextMatches: boolean;
  /** Whether each end of the quote keeps the word or number boundary of the source selection. */
  boundary: { left: EdgeVerdict; right: EdgeVerdict };
  /**
   * Set when the quote matches only because a hyphen at a line or page end was read differently in
   * the source or the target than printed. Such a candidate is never recommended.
   */
  hyphenation?: HyphenJoin[];
  /** Literal target quote for review, including line-end hyphens suppressed by the reader. */
  printedText?: string;
  position: Position | null;
  geometryError: string | null;
}
export type Outcome =
  | 'unique candidate'
  | 'multiple candidates'
  | 'doubtful candidate'
  | 'not found'
  | 'unsupported'
  | 'processing error';
export interface Proposal {
  source: Annotation;
  status: Outcome;
  reason: string;
  candidates: Candidate[];
  sourcePrefix: string;
  sourceSuffix: string;
  /** Literal source quote for review when a candidate reads a hyphen differently. */
  sourcePrintedText?: string;
  /** Label of the page that holds the second part of a source selection crossing a page break. */
  sourceNextPageLabel?: string;
  truncated: boolean;
  recommendedID: string | null;
}
export interface Plan {
  id: string;
  source: Snapshot;
  target: Snapshot;
  proposals: Proposal[];
  state: 'review' | 'applying' | 'applied' | 'failed';
}
export interface Selection {
  sourceKey: string;
  candidateID: string;
  manuallyConfirmed?: true;
}
export interface Copy {
  key: string;
  sourceKey: string;
  type: 'highlight' | 'underline';
  text: string;
  comment: string;
  color: string;
  tags: string[];
  position: Position;
  pageLabel: string;
}
export interface Created {
  key: string;
  sourceKey: string;
  fingerprint: string;
}
export interface TransferRecord {
  schema: 1;
  id: string;
  date: string;
  sourceID: number;
  targetID: number;
  libraryID: number;
  sourceKey: string;
  targetKey: string;
  /** Transfers between items cannot be used to copy notes, even if a PDF is moved later. */
  betweenItems?: true;
  sourceFile: FileStamp;
  targetFile: FileStamp;
  status: 'prepared' | 'committed' | 'failed' | 'undo-prepared' | 'undone';
  copies: Copy[];
  created: Created[];
  originals: Annotation[];
  undoneCreated?: Created[];
}
export interface Store {
  snapshot(id: number): Promise<Snapshot>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
  newKey(): string;
  create(targetID: number, copy: Copy): Promise<Created>;
  fingerprint(libraryID: number, key: string): Promise<string | null>;
  trash(libraryID: number, key: string): Promise<string>;
  readJournal(): Promise<TransferRecord[]>;
  writeJournal(records: TransferRecord[]): Promise<void>;
}
