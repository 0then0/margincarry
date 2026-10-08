# Published v0.1.0 follow-up, October 8, 2026

**PASS WITH RISKS on the tested host.** The earlier mouse-selection and live-overlay tooling gaps are closed. The published v0.1.0 XPI remains unchanged. Strict independent geometry discrepancies remain visible in the evidence; they were not removed or converted into scorer passes. No confirmed product defect justifies a patch release.

This supplements the [October 7 report](native-v010-validation.md), rather than replacing its observations. The same official Zotero 10.0.6, macOS 15.7.9, arm64, isolated profile/data directory, research PDF hashes, and installed XPI SHA-256 `2c0e849b219f34406b6a6987c2292e0ecf3704db15651b4f33a361c9472124a7` were used. Environment identity is recorded in the new native stage exports. No ordinary library, security settings, dependencies, product source, version, Git index, or history were changed.

## Ordinary text selection

Native CUA dragging now succeeds without the earlier `noWindowsAvailable` error. The exact isolated application path was used. Actual reader mouse gestures and annotation controls created:

- Underline `trainable parameters for downstream tasks.`, key `ZCREECES`.
- A two-line highlight of the opening LoRA abstract, beginning `The dominant paradigm...`. This exploratory changed-text case remains in the new analysis's extra proposals and source snapshots; it is not counted as a new frozen positive case.
- Highlight `number of trainable parameters by 10,000 times`, key `5VUWSSG5`, using the reader highlight tool followed by a mouse drag.

The [source screenshot](../validation/native-v010/followup/mouse-sources.png) shows the first two mouse annotations alongside the earlier keyboard-created annotations. Source annotation items and coordinates were not seeded. Independent pdfplumber coordinates for the two single-line selections were frozen before analyzing those new quotes.

The last highlight matched candidate `0:1033:1079` within two PDF points, was copied by the installed product, and was rejected as already transferred after a **new analysis**. Undo restored the complete previous target snapshot; the complete source snapshot stayed unchanged. See [mouse lifecycle](../validation/native-v010/followup/mouse-positive-lifecycle.json).

The first underline found the right quote at `0:925:967`, but the supplementary independent corner comparison failed: the target PDF prints `pa-` at the end of one line and `rameters` on the next. The contiguous pdfplumber range includes the line-end hyphen and ends at x = 468.139; the native candidate's first rectangle ends at x = 464.821, a 3.318-point difference. Both lines and the quote are retained in [failed comparison](../validation/native-v010/followup/mouse-analysis-failed.json). No transfer was performed for this case. This is an additional recorded geometry limitation, not a processing error or a silently dropped case. The frozen 32-case corpus and its scorer are unchanged.

## Four actual live overlays

Each of the four previously flagged `lora-15` candidates was applied separately through the installed plugin to the disposable corpus target, for both highlight and underline. These were real native annotation items displayed in the running desktop reader, not print-renderer images or injected visual overlays. Native navigation selected each created key; clicking outside removed the selection frame before capturing the overlay.

For the underline supplement, only the disposable seeded corpus source's type was temporarily changed. Its original type and `dateModified` were restored after each operation. This does not claim that those source positions were mouse-selected. Every operation was undone, and its complete previous target snapshot was restored.

- `0:1691:1695`: URL suffix `LoRA`; [highlight](../validation/native-v010/followup/live-0-highlight.png), [underline](../validation/native-v010/followup/live-0-underline.png).
- `5:4305:4309`: first formula subscript; [highlight](../validation/native-v010/followup/live-1-highlight.png), [underline](../validation/native-v010/followup/live-1-underline.png).
- `5:4332:4336`: separate second formula subscript; [highlight](../validation/native-v010/followup/live-2-highlight.png), [underline](../validation/native-v010/followup/live-2-underline.png).
- `7:2107:2111`: graph legend label; [highlight](../validation/native-v010/followup/live-3-highlight.png), [underline](../validation/native-v010/followup/live-3-underline.png).

All eight overlays cover the intended four-letter occurrence, with one rectangle per line and no adjacent word or line included. The larger vertical area for the smaller formula subscripts remains visible. The native annotation icon is separate UI chrome. The [original native range and print measurements](../validation/native-v010/geometry.json) explain the metric differences. The original scorer still flags all four alternatives at its unchanged two-point tolerance.

## Harness repairs and verification

Corpus IDs, plans, stream exports, apply, restart, Undo, installation reports, and the optional reanchor evaluation now use the selected host/report roots consistently. Fresh reports default to ignored `<host root>/reports`, so the documented reproduction does not overwrite frozen public evidence. Shared downloaded PDFs remain hash-verified inputs in `.local/corpus`.

`ui-repeat` compares the entire target snapshot and transfer journal against `ui-after` and identifies the original operation by ID. An extra annotation or operation fails the stage even if old copy fingerprints are intact. Native `restart` requires the specific already-transferred error and unchanged target/journal after new analysis. Metadata checks compare saved type/comment/color/tags with the pre-transfer source, and text/position with the selected candidate, including the documented whitespace folding of annotation text. Snapshot capture no longer invents a source-creation method or repeats the old drag blocker for future runs.

The bridge now refuses simultaneous requests to the same profile. A discovered concurrent-request attempt returned one result to both callers; journal inspection established what actually ran, and the affected stages were repeated sequentially. On timeout, the lock remains: quit the isolated host before removing a stale lock. The final reports below refer to completed sequential checks.

The repaired corpus chain ran on the custom root with stale default fixture IDs still present: 32 analyzed cases, 23 correct positive proposals, nine not-found/unsupported cases, no processing errors or wrong recommendations, and the same four geometry flags. Apply created 10 LoRA and 13 Attention copies. A full quit/relaunch preserved their fingerprints; repeat was blocked. The edited-copy Undo conflict removed nothing, then successful Undo removed only the 23 operation copies. The optional reanchor evaluation also ran against the new custom-root streams without changing its historical report. See [corpus apply](../validation/native-v010/followup/corpus-apply.json), [restart](../validation/native-v010/followup/corpus-restart.json), and [Undo](../validation/native-v010/followup/corpus-undo.json).

The six frozen native positive cases were also applied and checked against the original source metadata, followed by a full quit/relaunch, strict new-analysis repeat checks, edited-copy conflict, and Undo. See [native apply](../validation/native-v010/followup/native-apply.json), [restart](../validation/native-v010/followup/native-restart.json), and [Undo](../validation/native-v010/followup/native-undo.json). The October 7 actual dialog-confirmation cycle remains separate UI evidence; it was not repeated or relabeled as an October 8 dialog run.

`npm run check` passed Biome, strict TypeScript, **73 tests**, and packaging/build. Eight added harness regressions cover custom-root stream consumption, unchanged/changed repeat snapshots and journal, concurrent bridge requests, lock cleanup on error, multiline text preservation, and simultaneous comment loss in the journal/copy. The built XPI still has the published SHA-256 and no harness. See [check output](../validation/native-v010/followup/checks.txt).

Other operating systems and Zotero versions were not retested. This sample is evidence for the tested artifact and workflows, not a claim that arbitrary PDF layouts always meet the independent corner tolerance.

## Public repository contents

Keep `validation/`: its independent inputs are used by fetch/oracle/scoring scripts, and its evidence makes the geometry failures and preservation claims auditable. The retained JSON and images contain only disposable research-paper fixtures. Their purpose and provenance are indexed in [validation README](../validation/README.md). Absolute workspace prefixes in new public exports are replaced with `<workspace>`; raw originals remain in ignored `.local/`. Historical root artifacts stay byte-identical.

Applications, Zotero profiles/databases, full PDFs, raw logs, exploratory files, and future run outputs remain ignored. Finder `.DS_Store` is now ignored without deleting the user's existing file. The package remains `private: true` because it is distributed as an XPI, not published to npm; this does not make the GitHub repository private.
