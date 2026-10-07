export type Rect = [number, number, number, number];
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
export interface Snapshot {
  id: number;
  key: string;
  parentID: number;
  libraryID: number;
  title: string;
  itemFingerprint: string;
  file: FileStamp;
  annotations: Annotation[];
}
export interface Candidate {
  id: string;
  pageIndex: number;
  pageLabel: string;
  start: number;
  end: number;
  text: string;
  prefix: string;
  suffix: string;
  method: 'exact' | 'normalized';
  contextMatches: boolean;
  position: Position | null;
  geometryError: string | null;
}
export type Outcome =
  | 'unique candidate'
  | 'multiple candidates'
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
