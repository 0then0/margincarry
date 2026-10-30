# Architecture

MarginCarry is a bootstrap Zotero plugin written in TypeScript. It has no runtime dependencies: `esbuild` bundles `src/index.ts` into a single script, and a small Python script packages it, together with the dialog files, into an XPI. For the user-visible behavior, read [How MarginCarry works](how-it-works.md) first.

## Modules

- `bootstrap.js` is Zotero's plugin lifecycle entry point. It registers the `chrome://margincarry/` content path, loads the bundle, and adds or removes the Tools menu item for each main window.
- `src/index.ts` exposes the plugin API to the bootstrap, adds the menu item, and opens the single transfer window.
- `src/zotero.ts` is the only module that talks to Zotero. It reads attachments and annotations, loads PDFs into Zotero's reader, extracts page text and glyph rectangles, renders previews, creates and trashes annotations, and stores the journal. Everything else is host independent and unit tested against fakes.
- `src/text.ts` holds page-text assembly, the NFC and whitespace normalization with UTF-16 offset maps, and the word and number boundary model.
- `src/geometry.ts` maps a source selection's rectangles back to text, and a text range back to line rectangles, checking whole-glyph alignment, the page crop box, line and column order, and annotation size limits.
- `src/matching.ts` turns one source annotation into a proposal: it finds occurrences, compares context and boundaries, and sets the status and the recommended candidate.
- `src/analysis.ts` runs matching for every annotation, with progress and cancellation, and verifies afterward that nothing changed during analysis.
- `src/transfer.ts` applies a selection transactionally, keeps the write-ahead journal, recovers after interruption, and implements Undo with conflict detection.
- `src/ui.ts` drives the dialog in `content/transfer.xhtml` and `content/transfer.css`.
- `src/l10n.ts` selects a language and formats messages. `src/locales/` holds one file per language.
- `src/model.ts` defines the shared types: pages, glyphs, annotations, candidates, proposals, plans, and journal records.

## Matching

Normalization permits only Unicode NFC composition and whitespace folding, and keeps a map from each normalized character back to its UTF-16 offsets in the raw page stream. A raw range recovered from a match must normalize to the whole quote again. This rejects matches that would silently include an extra combining mark or a joiner sequence, and such rejected matches do not use up the candidate limit.

Search accounts for exact and normalized occurrences together, up to 200 valid candidates per annotation, with an explicit truncation flag. Geometry always comes from the actual glyph rectangles that Zotero's PDF worker reports; the plugin never estimates a glyph width.

Each candidate carries a boundary verdict for each of its two ends: `kept`, `unverifiable`, `expanded`, or `changed` (see [the boundary model](how-it-works.md#the-boundary-model)). A candidate whose verdict is `expanded` or `changed` on either end is doubtful. The proposal status is derived from all candidates:

- `not found` when there are none.
- `doubtful candidate` when every candidate is doubtful.
- `unique candidate` when there is exactly one candidate, or exactly one candidate matches the complete context, and that candidate is not doubtful.
- `multiple candidates` otherwise, and always when the list was truncated.
- `processing error` when text was found but no candidate has reliable geometry.

Only a `unique candidate` with verified geometry has a recommended ID. The dialog's mass selection takes exactly those. Doubtful and ambiguous proposals preselect nothing.

## Transfer

Applying a plan runs inside one outer Zotero database transaction under a shared lock that also covers Undo and journal recovery. A prepared journal record is written before any annotation exists, the fingerprints of the created annotations are saved before the transaction commits, and a final status follows the commit. The journal is rewritten through a temporary file with a flush. A failure in any step rolls back the transaction.

Annotations are created as new `Zotero.Item('annotation')` objects with fresh keys; `Zotero.Annotations.saveFromJSON` is not used because it opens its own transaction and cannot nest.

After a committed Undo, the adapter also removes the trashed keys from already-open readers, because Zotero's reader handles hard deletion notifications but does not hide soft-deleted annotations by itself. If that refresh fails, the dialog says that the copies are in the Trash and asks you to reopen the PDF, instead of claiming full success.

## Zotero integration

The plugin follows Zotero's [bootstrap plugin guidance](https://www.zotero.org/support/dev/zotero_7_for_developers) and uses public item, annotation, tag, database, and file APIs wherever they exist. Some integration points are internal and tied to the checked Zotero release; the manifest accepts only 10.0.x for that reason:

- `Zotero.Reader._readers`, `_initPromise`, `_internalReader._primaryView`, and `initializedPromise` identify a ready PDF view.
- `ReaderInstance.reload()` reads the current bytes from disk and creates a fresh view before extraction. File stamps are checked around loading, and previews and writes require the same view and file revision.
- `_ensureBasicPageData`, `_pdfPages`, `getPageLabels2`, and `getAnnotationMeta` provide glyph data, page labels, and sort order. In this reader, `partial: true` means that additional overlays were not processed, not that the glyph array is truncated.
- `_iframeWindow.PDFViewerApplication.pdfDocument`, `getPage`, `getViewport`, `render`, and `convertToViewportRectangle` render previews with the crop box and page rotation applied. Previews use the print intent, cancel a render task on timeout, and refuse oversized canvases.
- `ReaderInstance.navigate` opens an annotation key or a position, and `unsetAnnotations` refreshes views after Undo.
- `Cu.waiveXrays` and `Cu.cloneInto` cross between the privileged and reader realms.

The SQLite database is never edited directly. The exact Zotero revisions that these points were verified against are listed in [THIRD_PARTY.md](../THIRD_PARTY.md).

## Localization

The dialog is a static XHTML page whose text is filled in by `Localization.apply` from `data-l10n` attributes. Dynamic text goes through `Localization.t` (labels, prompts, and interpolated strings) and `Localization.message` (project-owned diagnostics, which are written in English in the code and translated by lookup). Quoted PDF text, user comments, file names, annotation keys, and diagnostics that come from Zotero itself are shown unchanged. The [development guide](development.md#adding-or-changing-a-language) explains how to add a language.

## Build and dependencies

The pinned development tools are TypeScript, esbuild, and Biome; tests use `node:test`; packaging uses Python's standard library only. The build is reproducible: ZIP entries are sorted and carry a fixed timestamp. The XPI contains `LICENSE`, `bootstrap.js`, `manifest.json`, the bundle, and the dialog files; tests, the validation harness, corpus data, and `node_modules` are not included. [Related work](related-work.md) explains why the project uses a small exact matcher instead of an existing re-anchoring library.
