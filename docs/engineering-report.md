# MarginCarry v0.1 engineering report

Validation date: October 7, 2026. The local installable artifact is `dist/margincarry-0.1.0.xpi`, with a neighboring SHA-256 file. No GitHub release asset is published. Installation instructions do not depend on a release download.

## Implemented behavior

MarginCarry is a bootstrap Zotero Desktop plugin with a Tools menu command. Users choose two local PDF attachments of one bibliographic item, receive an outcome for each native annotation, compare actual PDF previews, navigate both positions in the native reader, accept or skip proposals, and explicitly confirm a concrete selected set before writing.

It creates native highlights and underlines with fresh keys, the actual target text, original comments, colors, and text tags. Source annotations, both PDF files, and pre-existing target annotations remain intact. Snapshots prevent applying a plan after files or annotations change. A shared service lock protects apply, undo, and journal recovery. A local write-ahead journal protects against repeats and records ownership for undo.

English and Russian are available in the dialog. The menu and initial dialog follow Zotero's locale, with English fallback; the Language selector changes the dialog language without discarding accepted locations. Project-owned labels, prompts, progress, accessibility text, outcomes, and errors are localized. Original document text, comments, filenames, and host-generated diagnostic wording are preserved. Public documentation and workflow screenshots use English.

Undo validates every owned copy before deletion. Editing, moving, or deleting any copy stops the entire undo. Unchanged copies move to Trash. Only after database commit does the adapter remove those keys from initialized open readers: the verified Zotero reader handles hard deletion notifications but does not itself hide soft-deleted annotations. Transaction rollback leaves reader state untouched. Reader refresh failure explicitly reports that copies reached Trash and requires reopening, rather than claiming complete success.

## Architecture and dependencies

`src/text.ts`, `geometry.ts`, `matching.ts`, `analysis.ts`, and `transfer.ts` separate normalization, geometry, proposal selection, cancellable analysis, and transactional transfer. `src/zotero.ts` contains the complete host boundary and necessary internals. `src/ui.ts` uses DOM in a native chrome window. `src/l10n.ts` owns locale resources and message presentation; `bootstrap.js` owns lifecycle and chrome registration.

Normalization permits only Unicode NFC and whitespace folding, with UTF-16 mappings. A recovered raw range must normalize to the complete quote; this rejects substring matches that expand into additional combining marks or ZWJ symbols. Rejected raw matches do not consume the valid-candidate limit. Geometry uses actual glyph rectangles and checks whole glyph boundaries, crop box, line/column order, discontinuities, and native position limits.

Search accounts for exact and normalized occurrences together, up to 200 valid candidates with an explicit truncation flag. Complete available context may distinguish repeats, but alternatives are retained. The old page number does not establish identity. There is no fuzzy score or automatic application.

There are no runtime dependencies, second PDF engine, backend, React, Electron, or external database. Exact development versions are TypeScript 5.9.3, esbuild 0.28.2, and Biome 2.5.15. Tests use `node:test`; ZIP packaging uses Python's standard library. See [licenses and versions](../THIRD_PARTY.md).

reanchor 0.3.0 was separately evaluated on all 30 text cases. All three configurations found at least one occurrence in each of 23 positive cases. Defaults matched four negative cases, normalized-only one, and explicitly restricted normalization none. Offset round-trip checks found no inconsistencies, without claiming independently correct positions for every result. The library is potentially usable with configuration; the small internal matcher provides NFC, complete alternative accounting, disclosed truncation, and complete PDF glyph checks. See [related work](related-work.md).

## Zotero integration

The implementation was checked against the installed release's sources and [bootstrap plugin guidance](https://www.zotero.org/support/dev/zotero_7_for_developers). Source revisions are pinned in THIRD_PARTY. It does not rely on invented API methods.

Native APIs include `Zotero.Items.getAsync`, `getByLibraryAndKey`, `Item.getAnnotations`, `getFilePathAsync`, annotation properties, `setTags`, `Zotero.DataObjectUtilities.generateKey`, `Zotero.Reader.open`, `Zotero.DB.executeTransaction`, `Item.save`, and local `IOUtils` file operations. `Zotero.Annotations.saveFromJSON` seeds disposable fixtures. Product writes use a new `Zotero.Item('annotation')` and `save()` inside one outer transaction, because this release's `saveFromJSON()` always calls `saveTx()` and cannot nest there.

Necessary internal integration points:

- `Zotero.Reader._readers`, `_initPromise`, `_internalReader._primaryView`, and `initializedPromise` identify a ready PDF view.
- Native `ReaderInstance.reload()` reads current disk bytes and creates a fresh primary view before extraction. File stamps are checked around loading; subsequent previews and creates require the same view and file revision.
- `_ensureBasicPageData`, `_pdfPages`, `getPageLabels2`, and `getAnnotationMeta` provide complete glyph data, page labels, and sort order.
- `_iframeWindow.PDFViewerApplication.pdfDocument`, `getPage`, `getViewport`, `render`, and `convertToViewportRectangle` provide actual previews with crop box and page rotation.
- `ReaderInstance.navigate` opens annotation keys or positions; `unsetAnnotations` refreshes views after committed undo.
- `Cu.waiveXrays` and `Cu.cloneInto` cross privileged and reader realms.

In this reader, basic page data's `partial: true` means unprocessed additional overlays, not a truncated glyph array. This was checked against the bundled worker and actual pages. Core geometry still validates every range. Preview uses print intent to avoid paused background-frame animation and cancels a render task on timeout. Oversized preview canvases are refused.

Journal writes use a temporary file and flush. A prepared record precedes native changes; saved fingerprints become durable before database commit; a final status follows commit. Recovery distinguishes failed, committed, and interrupted undo. Ambiguous partial states stop further writes. Recovery cannot run concurrently with an active operation, including when a review window is closed and reopened. SQLite is never edited directly.

## Verification environment and commands

The verified native host is **Zotero 10.0.5**, **macOS 15.7.9**, **Darwin 24.6**, **Apple Silicon**. Independent checks use **Node.js 24.21.0** and **npm 11.19.0**. Native validation uses separate `.local/profile` and `.local/data`; the ordinary user library is excluded. Other OSes and Zotero versions are not declared verified.

```sh
npm run format
npm run lint
npm run check
```

All 65 automated tests pass. The current check output is retained in [checks.txt](../validation/checks.txt). Biome checks formatting, imports, and lint with warnings treated as failures; TypeScript uses strict checks; tests cover substantive matching, data, and UI behavior; the build produces the XPI. A packaging test uses a path containing spaces and non-ASCII characters. CI pins official GitHub Action revisions and runs the same independent checks; it does not launch Zotero.

Regression tests added after review cover journal recovery overlapping active apply/undo, lock release after recovery failure, same-path PDF replacement and reader-view changes, Unicode ranges with extra combining marks or ZWJ sequences, valid-candidate limits after rejected matches, cancellation during first preview loading, review count reset, English/Russian resources and accessibility labels, and preserving selected locations during a language change.

Native checks are reproducible through the isolated harness:

```sh
node scripts/host-request.mjs scripts/host/install.js
node scripts/host-request.mjs scripts/host/load.js
node scripts/host-request.mjs scripts/host/revision-regression.js
node scripts/host-request.mjs scripts/host/run-corpus.js
python3 scripts/score-corpus.py
node scripts/host-request.mjs scripts/host/apply-corpus.js
# Quit and relaunch the same isolated Zotero profile.
node scripts/host-request.mjs scripts/host/load.js
node scripts/host-request.mjs scripts/host/verify-restart.js
node scripts/host-request.mjs scripts/host/undo-corpus.js
```

[Installation](../validation/host-install.json) records active version, Tools menu, host, and installed XPI hash. [Same-path revision regression](../validation/host-revision-regression.json) confirms that an already-open one-page target, replaced on disk by a two-page revision, yields and creates the selection on page index 1. Undo removes only that copy; source remains unchanged. A later replacement rejects both stale preview and apply.

[Native apply](../validation/host-corpus-apply.json) records fresh keys and property preservation for 23 selected copies, unchanged sources/PDFs/pre-existing target annotations, repeat blocking, cancellation, and rollback after an injected second-write failure. [Restart](../validation/host-restart.json) records copy fingerprints after process restart and repeat blocking. [Undo](../validation/host-corpus-undo.json) records conflict without deletion, then successful undo of 13 and 10 copies with preserved sources, files, and existing target annotations. The restoration of an edited disposable fixture is test-only; the product does not discard edits.

[Native geometry](../validation/host-geometry.json) records page 1 → 2, separate lines in a column, crop box `[40, 40, 500, 750]` on a 90°-rotated page, and explicit not found for a PDF without text. The actual rotated preview shows the highlight on the intended vertical line. Individually rotated glyphs remain unsupported.

## Real corpus: all 32 cases

Two genuine revision pairs were selected independently: [LoRA v1](https://arxiv.org/pdf/2106.09685v1) → [v2](https://arxiv.org/pdf/2106.09685v2), 20 → 26 pages, and [Attention v1](https://arxiv.org/pdf/1706.03762v1) → [v2](https://arxiv.org/pdf/1706.03762v2), 15 → 16 pages. URLs and SHA-256 values are in [corpus.json](../validation/corpus.json). PDFs are excluded from the repository, and downloads verify exact hashes.

Selections were frozen before the first matcher output. Expected ranges and rectangles were obtained independently with pdfplumber 0.11.9. NFKC is used only in the oracle to decode PDF ligatures and does not broaden product normalization. The two-PDF-point geometry tolerance was not adjusted to fit results.

**LoRA, 16 annotations:** 9 unique, 1 multiple, 5 not found, 1 unsupported, 0 processing errors. Each of 10 positive cases has a correct candidate. The short `lora-15` quote has 120 candidates and no recommended ID. Ten explicitly selected copies are transferred; six source cases are left untransferred.

**Attention, 16 annotations:** 13 unique, 0 multiple, 2 not found, 1 unsupported, 0 processing errors. Each of 13 positive cases has a correct candidate. Three unique cases retain four alternatives each, with only one matching complete context. Thirteen copies are transferred; three cases remain untransferred. Changed numbers are not matched to the old quote.

Overall: **23 positive cases with a correct proposal, 9 untransferred source cases, 0 wrong recommended locations**. This is not a claim of zero wrong candidates: the independent corner comparison flags **4 of 120** `lora-15` variants. The other 116 are within tolerance; Attention has no geometry discrepancies. All 32 cases remain in [results](../validation/corpus-results.json) and [score](../validation/corpus-score.json).

The flagged IDs are `0:1691:1695`, `5:4305:4309`, `5:4332:4336`, and `7:2107:2111`. Horizontal boundaries identify the intended occurrences; vertical font-metric boundaries differ by more than two PDF points. Reviewing previews does not turn the strict corner test into a pass. None is recommended automatically. Gold and tolerance remain unchanged.

## UI evidence

Native API tests and user interaction are separate evidence. The actual Zotero window workflow includes Tools → MarginCarry, direction, analysis, both actual previews, selecting two unique proposals, reviewing the set, confirming Apply, and opening the created highlight/underline in the native reader. Sidebar comments and tags are visible. The Language selector was also exercised in Russian and English; both selected proposals survived switching back to English. See [review](images/review.png) and [reader](images/reader.png).

[UI report](../validation/host-ui.json) records created keys, source/PDF preservation, restart fingerprints, and undo. After committed undo, the active reader's two operation keys disappear immediately, leaving no highlight/underline and an empty annotation sidebar. See [undo screenshot](images/undo.png).

For two identical quotes on the same page, analysis starts with an unselected placeholder and disabled acceptance. Selecting candidate 2 previews the second occurrence; accepting adds one transfer; switching to candidate 1 revokes that acceptance. The no-text PDF shows a specific reason and disables acceptance and application. See [ambiguity](images/ambiguous.png), [not found](images/not-found.png), and [read-only UI snapshots](../validation/host-ui-alternatives.json). Interactions use native CUA; snapshot scripts only read DOM.

## Remaining validation limits

This is a v0.1 candidate for the actually checked host. Other OSes/releases, very large or encrypted PDFs, unusual fonts, and difficult reading order are outside the small validation corpus. Four geometry discrepancies remain visible and need consideration before broad release. Text matches, including unique outcomes, require visual review.

Only local PDFs of one item in a personal library and native continuous, one-page highlight/underline are supported. OCR, fuzzy transfer of changed text, ink/images/notes, multi-page/discontinuous ranges, group libraries, library-wide processing, note-link rewriting, and custom sync are outside scope. Reader integration depends on internal APIs of the verified release.

The journal contains user quotes, comments, geometry, and paths, stored only in Zotero's data directory. The plugin introduces no account, remote processing, telemetry, or external API. Zotero sync and plugin updates remain governed by Zotero's settings.
