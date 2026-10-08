# Published v0.1.0 native validation, October 7, 2026

**Historical October 7 decision: validation remained incomplete.** The published XPI passed the reader keyboard-annotation workflow, native API lifecycle checks, and a separate UI transfer/restart/repeat/Undo cycle on Zotero 10.0.6. Ordinary mouse text selections could not be exercised because native CUA dragging repeatedly returned `Computer Use server error -10005: noWindowsAvailable`. The four geometry outliers have native range measurements and reviewed native print overlays, but their live desktop overlays and mouse-selected positions were not checked. No product defect was established, no product code or version changed, and there is no demonstrated reason to prepare v0.1.1.

The [October 8 follow-up](native-v010-followup.md) closes the mouse-selection and live-overlay tooling gaps and records harness repairs, new regressions, and remaining strict geometry risks. The observations and staged reports below retain their October 7 meaning. Public JSON exports replace the absolute workspace prefix with `<workspace>`; raw originals are retained locally.

## Artifact and environment

- Release: [v0.1.0](https://github.com/0then0/margincarry/releases/tag/v0.1.0), tag commit `df0fb98de6cb9452044acce389c2158dfce9d7d5`.
- Download: [published margincarry-0.1.0.xpi](https://github.com/0then0/margincarry/releases/download/v0.1.0/margincarry-0.1.0.xpi).
- SHA-256: `2c0e849b219f34406b6a6987c2292e0ecf3704db15651b4f33a361c9472124a7`. Release checksum, GitHub asset digest, installed XPI, and final local build agree.
- Workspace HEAD: `a22d918356e522fa2aa2da2deab05de2b2990890`. Product source and packaging inputs have no difference from the tag.
- Active installed plugin: `0.1.0`; Tools menu command present.
- Host: **Zotero 10.0.6**, verified against the [official changelog](https://www.zotero.org/support/changelog) and release download redirect. The official [10.0.6 macOS DMG](https://download.zotero.org/client/release/10.0.6/Zotero-10.0.6.dmg) was used.
- OS: macOS 15.7.9, build 24G830, arm64; host XPCOM ABI `aarch64-gcc3`. Node.js 24.21.0, npm 11.19.0, oracle pdfplumber 0.11.9.
- Disposable directories: `.local/native-v010/profile` and `.local/native-v010/data`. The harness checks both exact paths. No normal-library fixtures or settings were used; signature and security preferences were not weakened.

See [provenance](../validation/native-v010/provenance.json). Staged reports independently record the installed XPI hash, active version, host, profile, and data directory. The product ZIP contains only LICENSE, bootstrap.js, content/icon.svg, content/transfer.css, content/transfer.xhtml, manifest.json, and margincarry.js. No harness is packaged.

The sandbox DMG mount returned `Device not configured`; a direct sandbox launch exited 134 without a diagnostic. A read-only mount and LaunchServices launch outside that sandbox succeeded, allowing the native checks below. During app-resolution troubleshooting, an older Zotero copy briefly opened an empty default-library window and was immediately quit; no annotations or settings were changed there. All fixture writes and product checks used the disposable profile.

## Seven reader-created source cases

[cases.json](../validation/native-v010/cases.json) is the independent plan frozen before the first new matcher run. Its original planned/pending fields remain; actual creation and outcomes are in [sources-ui.json](../validation/native-v010/sources-ui.json), [sources.json](../validation/native-v010/sources.json), and [analysis.json](../validation/native-v010/analysis.json). PDF revisions, hashes, quotes, oracle positions, and corresponding target locations are retained. Expected rectangles came from pdfplumber. The repeated affiliation's corresponding location was fixed as the first author's affiliation in both revisions.

All seven sources were created by **Find in Document followed by Control-Alt-1 or Control-Alt-2 in the actual Zotero reader UI**. Source annotation items and positions were not seeded through `saveFromJSON`, imported from gold, or built through MarginCarry. This verifies the native keyboard search-result annotation path, while ordinary mouse-selection coverage remains outstanding.

- `native-01`, Attention, highlight `28.4 BLEU`, source `86IC6EWW`: ordinary single line; one correct candidate `0:1023:1032`.
- `native-02`, Attention, highlight beginning `The dominant sequence transduction models...`, source `7MYCDP6D`: two source lines. The sentence changed in v2. Expected and actual outcome: **not found**. Retained and not transferred.
- `native-03`, LoRA, highlight `We propose Low-Rank Adaptation, or LoRA`, source `T7W3LFT2`: regular and medium Nimbus fonts within the quote; one correct candidate `0:711:750`.
- `native-04`, Attention, highlight `Work performed while at Google Brain.`, source `UIUV7A3K`: small 8.966-point footnote; one correct candidate `0:2465:2502` at the corresponding v2 footnote.
- `native-05`, Attention, highlight `Google Brain`, source `XWBBCMAQ`: four target occurrences retained. Complete context recommends `0:43:55`, below Ashish Vaswani, matching the independent corresponding location. Candidate 1 was explicitly chosen from the actual UI dropdown. The other three occurrences are alternatives, not interchangeable semantic gold.
- `native-06`, LoRA, underline `trainable rank decomposition matrices`, source `KMP93CJU`: one correct candidate `0:807:844`; native creation preserves type and chosen position.
- `native-07`, Attention, highlight `The best performing models also connect the encoder and decoder through an attention mechanism.`, source `2CDHDTXS`: three source and target lines; one normalized correct candidate `0:584:679`.

All six positive corresponding positions pass the unchanged 2-point comparison against the independent oracle. Actual PDF previews and native navigation completed for both sides of all six. Preview PNGs remain in ignored `.local/native-v010/native-*-source.png` and `native-*-target.png`.

An extra second-author `Google Brain` source, `6IR83CZV`, was created during UI troubleshooting. It remains in the snapshots and `extraProposals`; it was excluded from the six-case transfer set and was not counted as the first-author case. Its context resolves to the second author.

After UI creation, only comments, colors, and text tags were edited through native item APIs to provide meaningful preservation checks. [metadata.json](../validation/native-v010/metadata.json) records this supplement. Source quote and geometry remained unchanged; both undecorated and decorated snapshots remain.

## Lifecycle and actual UI evidence

The harness loaded the installed published bundle, without rebuilding or substituting product code. Each pair was analyzed and immediately reviewed before loading the next pair. An exploratory attempt analyzed both pairs before previewing the first; the stale-view guard refused with `The loaded PDF changed. Run analysis again before reviewing or applying.` No write occurred. The pair-local sequence and actual UI workflow passed. The exploratory cause was not established as a product defect.

[apply.json](../validation/native-v010/apply.json) records six independently chosen copies: two LoRA and four Attention. Native API checks verified fresh keys, type, actual target text, comments, colors, text tags, and exact positions. Full source snapshots, both PDF hashes, and pre-existing target fingerprints remained unchanged. API apply alone is not proof of UI confirmation.

After a full quit and relaunch, [restart.json](../validation/native-v010/restart.json) verifies all six copy fingerprints and committed journal records. **New analysis** preceded repeat attempts for both pairs; both were blocked as already transferred. Sources remained unchanged.

[undo.json](../validation/native-v010/undo.json) records editing one Attention copy and attempting Undo. The conflict deleted nothing and left every edited fingerprint unchanged. Only that disposable fixture's comment and `dateModified` were restored to test successful Undo separately; the product never discarded edits. Undo then moved exactly four Attention and two LoRA operation copies to Trash, preserving sources, PDF hashes, and earlier target annotations.

A separate operation used actual **Tools → MarginCarry** UI controls through native CUA:

1. Attention v1 → v2, **Find proposals**, actual previews, accept `native-07`, explicitly choose Candidate 1 for `native-05` from all four alternatives.
2. **Apply selected**, inspect the confirmation naming two copies and the target PDF, **OK**. The dialog reported `Created 2 native annotations`; the native reader displayed `Google Brain` highlighted below the first author.
3. Quit and relaunch. Both fingerprints persisted. Run new UI analysis, accept `native-07`, and confirm another write. The dialog refused because source `2CDHDTXS` was already transferred; no third copy appeared.
4. **Undo last transfer**, inspect the confirmation, **OK**. The dialog reported two copies moved to Trash. Owned keys were deleted; sources, PDF hashes, and existing target annotations remained unchanged.

Evidence: [UI observations](../validation/native-v010/ui-observations.json), [before](../validation/native-v010/ui-before.json), [after](../validation/native-v010/ui-after.json), [restart](../validation/native-v010/ui-restart.json), [repeat](../validation/native-v010/ui-repeat.json), and [undo](../validation/native-v010/ui-undo.json). Observations transcribe actual accessibility output, not reconstructed screenshots. The edited-copy conflict was tested through native APIs, rather than an additional UI conflict dialog.

## Four original geometry outliers

The **original scorer and frozen corpus were not edited**. A new 32-case host run is in [corpus-results.json](../validation/native-v010/corpus-results.json), scored by an exact copy of the original script in a temporary directory: [corpus-score.json](../validation/native-v010/corpus-score.json). Tolerance remains **2 PDF points**. The new run reproduces 23 positive cases with a correct proposal, nine not-found/unsupported cases, zero processing errors and wrong recommendations, and the same four flagged alternatives among 120 `lora-15` occurrences. The field `wrongLocations` denotes corner-comparison failures; it does not prove four incorrect user transfers.

[geometry.json](../validation/native-v010/geometry.json) stores all three models' positions, complete glyph records, fonts, baseline, and corner differences. The installed reader's `getMatchPositions` method was invoked with native text offsets using a temporary receiver, without changing live search state or using MarginCarry geometry. This measures native ranges, not a mouse-selected position. Highlight/underline crops use the installed reader's `renderPageAnnotationsOnCanvas` print path on the actual PDF; no annotation items or live-reader state were changed.

For **each of the four**, reader and MarginCarry rectangles are identical; the four complete selected glyphs spell `LoRA` on exactly one line. Horizontal boundaries agree with independent gold within 0.001 point. Reviewed print crops contain the full letters and no neighboring word or line. This is native compatibility plus independent text/visual evidence within the print path; live desktop coverage remains outstanding.

- `0:1691:1695`, page index 0, URL suffix `/LoRA`, `NimbusMonL-Regu` 9.963 pt: gold `[417.558, 329.366, 441.468, 339.329]`; reader/MarginCarry `[417.558240, 328.679078, 441.468480, 337.316653]`. Lower/upper differences: −0.686922/−2.012347 pt. Native inline metrics surround the glyph boxes; pdfplumber uses a font-size vertical box. The highlighted and underlined suffix is correct. [Comparison](../validation/native-v010/geometry-images/0-1691-1695-comparison.png).
- `5:4305:4309`, page index 5, first formula subscript, `CMMI7` 6.974 pt: gold `[157.313, 59.291, 178.739, 66.265]`; reader/MarginCarry `[157.313000, 59.291083, 178.738606, 71.461456]`. Upper difference +5.196456 pt; lower edge agrees within 0.001. The native inline box extends above the smaller subscript glyphs. The highlight includes extra vertical area without adjacent formula symbols or the preceding line; underline uses the unchanged lower edge. [Comparison](../validation/native-v010/geometry-images/5-4305-4309-comparison.png).
- `5:4332:4336`, page index 5, distinct second subscript occurrence: gold `[271.452, 59.291, 292.878, 66.265]`; reader/MarginCarry `[271.452000, 59.291083, 292.877606, 71.461456]`. Same font and +5.196456 pt upper difference, with unchanged lower edge. It remains a separate case; print highlight/underline select only its four letters. [Comparison](../validation/native-v010/geometry-images/5-4332-4336-comparison.png).
- `7:2107:2111`, page index 7, figure legend, `DejaVuSans` 6.005 pt: gold `[263.527, 237.919, 278.827, 243.924]`; reader/MarginCarry `[263.526505, 239.282122, 278.827271, 246.277959]`. Lower/upper differences +1.363122/+2.353959 pt. Native glyph and inline boxes coincide, while pdfplumber's font box differs. The print highlight covers the legend label without the marker or nearby labels; underline is visibly closer to the letters than the gold-box underline. [Comparison](../validation/native-v010/geometry-images/7-2107-2111-comparison.png).

This supports differences between vertical-metric models rather than wrong offsets, split lines, or extra words. It does **not** change strict scorer failures, prove every alternative is the semantic counterpart of the source, or establish live desktop rendering at these four positions. No geometry rewrite follows from this evidence.

## Commands, reproduction, and historical evidence

Executed: `node scripts/fetch-corpus.mjs`; `MARGINCARRY_HOST_ROOT=.local/native-v010 node scripts/prepare-host.mjs`; staged `scripts/host/native-validation.js` actions `capture`, `decorate`, `analyze`, `apply`, `restart`, `undo`, `ui-before`, `ui-after`, `ui-restart`, `ui-repeat`, `ui-undo`, and `geometry`; `seed-corpus.js`; `run-corpus.js native-v010`; `python3 scripts/score-isolated-corpus.py validation/native-v010`. The native PDF import script remains at `.local/native-v010/seed-ui.js`; its guarded reproduction equivalent is now `scripts/host/seed-native.js`. Source creation and UI confirmation used native CUA.

Successful macOS launch:

```sh
open -na "$PWD/.local/Zotero-10.0.6.app" --args \
  -no-remote -profile "$PWD/.local/native-v010/profile" -ZoteroDebugText
```

Fresh reproduction must use **new** `MARGINCARRY_HOST_ROOT` and `MARGINCARRY_REPORT_ROOT` directories to preserve these reports. Prepare the profile, install the same published XPI and test harness through normal Plugins controls, and copy frozen `cases.json` into the new report directory. Native stages check both disposable paths and the active published hash. Follow [development commands](development.md#published-v010-reader-validation).

`npm run check` passed Biome, TypeScript, **65/65 tests**, and build: [output](../validation/native-v010/checks.txt). Subsequent harness-only output-directory wiring passed a targeted Biome check on all seven affected JS/config files and a live read-only `environment` request with a separate report path. Standard-library isolated scoring passed. No dependencies were added or synchronized. The built XPI is byte-identical to the published package.

Root `validation/host-*.json`, `corpus.json`, `corpus-results.json`, and `corpus-score.json` remain historical and unchanged. Historical install SHA is `4aa8a64d085c1a388aaa5df304747cc7023655eb7dbcb20420bfeb036725af52`; historical UI reports use `99d5a7c2f7641636625f57975b6b750d4b289b486d008e39c87d8f3a8b7ecb35`. They are **not** evidence for this published XPI. Reports lacking a hash cannot establish its identity. Historical screenshots use Zotero 10.0.5 and are not new 10.0.6 captures.

Only documentation, development harness configuration/scripts, and validation materials changed. Product source, version, release metadata, and update mechanism remain unchanged. No commit, push, tag, or release was performed.

**Validation remains incomplete because ordinary UI text selection by mouse was blocked by CUA and the four live desktop geometry overlays were not checked. No confirmed product defect currently justifies v0.1.1.**
