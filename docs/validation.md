# Validation

This page states what has been verified, how, and what has not. It separates three kinds of evidence, because they answer different questions:

- **Automated tests** run in CI and on every contributor's machine, against fakes of the Zotero boundary.
- **Native checks** run the built plugin inside a real Zotero, in an isolated profile with a disposable library.
- **Corpus checks** compare the matcher with an independent oracle on two real pairs of paper revisions.

CI does not start Zotero. Nothing on this page was run against a personal library.

## Current status

- **Automated tests, strict TypeScript, Biome, XPI packaging:** pass for v0.1.2 (`npm run check`).
- **All seven interface languages in the real dialog:** checked for v0.1.2 on Zotero 10.0.7, macOS. No clipped text, overlap, or horizontal scrolling at 1180 and 900 px.
- **Native lifecycle (apply, repeat protection, Undo):** run through the real dialog for v0.1.2 on Zotero 10.0.7, macOS. Restart persistence and the edited-copy conflict were verified for the published v0.1.0 package on Zotero 10.0.6; the transfer code is the same.
- **Real revision corpus (32 cases):** recorded for the v0.1.0 matcher; not re-run for the v0.1.2 boundary check.
- **Windows, Linux, other Zotero releases:** not verified.

## Automated tests

`npm run check` runs Biome (formatting, imports, lint, warnings as errors), strict TypeScript, the `node:test` suite, and the XPI build. The tests cover:

- matching: exact and normalized quotes, repeats and context, the candidate limit, grapheme and glyph boundaries, geometry, and the word and number boundary model with Latin, Cyrillic, Chinese, and Japanese examples;
- transfer: transactional writes, rollback, the journal and its recovery, repeat protection, and conflict-aware Undo;
- the dialog: cancellation, selection state, mass selection, manual choice of a doubtful candidate, and language switching with accepted proposals;
- localization: key and placeholder parity in every language, that every project-owned message in the code is translated, and the language selection from Zotero's locale;
- packaging: a build from a path with spaces and non-ASCII characters.

## Native checks

Native checks use a separate Zotero profile and data directory under `.local/`, driven by the developer harness described in the [development guide](development.md#isolated-zotero-profile). The harness is never part of the XPI.

### Published v0.1.0, Zotero 10.0.6, macOS

The [October 7 report](native-v010-validation.md) and the [October 8 follow-up](native-v010-followup.md) record checks of the published v0.1.0 package, identified by its SHA-256:

- the Tools menu item and the dialog, with the original and proposed locations rendered from the real PDFs;
- creating copies through the dialog, their comments, colors, and tags, and the unchanged source annotations, PDFs, and pre-existing target annotations;
- repeat blocking, including after a restart;
- Undo, including the refusal when a copy was edited, and the reader refresh after Undo;
- ordinary mouse-created annotations, and live highlight and underline overlays for the four known geometry outliers.

Result: **pass with risks**. The risks are the geometry discrepancies listed below. The earlier [Zotero 10.0.5 development reports](../validation/README.md) describe a different build and are retained as history only.

### v0.1.2, Zotero 10.0.7, macOS

The dialog was opened in an isolated profile with a small synthetic item (two PDF revisions, eight source annotations, one for each outcome plus a long quote and a long comment). In each of the seven languages, at widths of 1180 and 900 px, the check selected the unique, doubtful, ambiguous, and long cases and recorded screenshots and layout metrics. No element had text wider than its box, no page scrolled horizontally, and no button wrapped onto more than two lines. The screenshots were also read for natural wording and visual balance. The method is [in the development guide](development.md#checking-the-dialog-in-every-language), and the result is recorded in [`validation/v0.1.2/ui-languages.json`](../validation/v0.1.2/ui-languages.json).

A second script then drove the real dialog through the whole lifecycle on the same item: **Select unique proposals** took the two unique proposals and skipped every doubtful one, a doubtful candidate was preselected for nobody and could be chosen by hand, and applying three selections created three highlights with the original comments, colors, and tags. The source annotations and both PDF files were unchanged. A repeat attempt after a new analysis was refused, and **Undo last transfer** moved the three copies to the Trash. The record is [`validation/v0.1.2/ui-lifecycle.json`](../validation/v0.1.2/ui-lifecycle.json). The restart and edited-copy conflict cases were not repeated for v0.1.2; the v0.1.0 evidence covers them with identical transfer code.

## Real revision corpus

Two genuine revision pairs were chosen independently of the matcher: [LoRA v1](https://arxiv.org/pdf/2106.09685v1) to [v2](https://arxiv.org/pdf/2106.09685v2) (20 to 26 pages) and [Attention v1](https://arxiv.org/pdf/1706.03762v1) to [v2](https://arxiv.org/pdf/1706.03762v2) (15 to 16 pages), with 16 source cases each. The URLs and SHA-256 values are in [`validation/corpus.json`](../validation/corpus.json), the PDFs are not stored in the repository, and a download is verified against its hash.

The selections were frozen before the first matcher run. The expected ranges and rectangles come from an independent oracle (pdfplumber 0.11.9), and the comparison tolerance of two PDF points was never adjusted.

For the v0.1.0 matcher:

- **LoRA, 16 annotations:** 9 unique, 1 multiple, 5 not found, 1 unsupported. Each of the 10 positive cases has a correct candidate. The short quote `lora-15` has 120 candidates and no recommendation.
- **Attention, 16 annotations:** 13 unique, 2 not found, 1 unsupported. Each of the 13 positive cases has a correct candidate. Changed numbers are not matched to the old quote.
- **Overall:** 23 positive cases with a correct proposal, 9 untransferred cases, and 0 wrong recommended locations.

The v0.1.2 boundary check can only turn a recommendation into a doubtful candidate; it cannot add a recommendation. The corpus has not been re-run with it, because that needs the Zotero host to extract the PDFs, so how many of the 23 positive cases remain recommended is unmeasured. Recorded v0.1.0 candidates, replayed through the new check, show no expansion on any of the 9 candidates whose context was recorded ([`validation/v0.1.2/offline-evidence.json`](../validation/v0.1.2/offline-evidence.json)). That is partial, indirect evidence and not a corpus run.

## Known discrepancies

- **Geometry.** The independent comparison flags 4 of the 120 `lora-15` candidates (`0:1691:1695`, `5:4305:4309`, `5:4332:4336`, `7:2107:2111`). Their horizontal boundaries identify the intended occurrence, but their vertical font-metric boundaries differ from the oracle by more than two PDF points. Native reader geometry agrees with the plugin, and live overlays show the intended four letters. None of them is recommended automatically. The scorer and its tolerance are unchanged.
- **Hyphenation.** A quote split by a line-end hyphen (`pa-` and `rameters`) is found, but the independent range includes the hyphen and ends 3.3 points away from the plugin's first rectangle.
- **Reader internals.** The integration uses internal Zotero reader APIs. A different Zotero release may need changes, which is why the manifest accepts only 10.0.x.

## Not verified

Windows and Linux, Zotero versions other than 10.0.5 to 10.0.7, very large or encrypted PDFs, unusual fonts, difficult reading order, and group libraries. Text matches, including unique ones, still require a look at the preview.

## Evidence index

The [`validation/`](../validation/README.md) directory holds the frozen selections, oracle, recorded results, and native reports. Frozen files are never edited to make a result pass; new evidence goes into a separate file with its version and package hash. Fresh run output stays in the ignored `.local/` directory until it is deliberately promoted.
