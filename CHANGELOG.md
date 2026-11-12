# Changelog

Notable changes to MarginCarry are recorded here. Released entries describe the corresponding published artifact; later documentation changes do not create a new release.

## [Unreleased]

### Added

- Highlights and underlines whose text runs from the end of one page to the start of the next are transferred as one native annotation with separate rectangles on each page. One page to two adjacent pages, two to one, and two to two are supported; longer selections are not.
- The review dialog shows both pages of the source and of a candidate, a page range instead of one page label, and a button to open each part in the reader.
- Copying a note now relinks annotations whose position continues on the next page, with the whole position and the label of the first page.

### Changed

- A page break inside a passage counts as exactly one space, like a line break. The passage must be continuous in the PDF's text: a header, footer, or page number between its two parts, or a line-end hyphen at the break, is reported with its reason and never transferred.
- Text that Zotero's reader marks as isolated is skipped at a page edge when it lies on other lines than the selection, as the reader does. Extraction waits briefly for those marks so that they do not depend on timing.
- A source annotation with rectangles on a second page was **Unsupported**; it is now verified on both pages. The message "Multi-page annotations are not supported." is gone, and the not-found reason names one page or two adjacent pages.
- The project icon was simplified: an old and a new page, one highlight on each, and one arrow between them.
- `transfers.json` keeps schema 1. A position may now include `nextPageRects`; records written by earlier versions are read unchanged.

### Validation and limits

- Biome, strict TypeScript, the automated tests, and packaging pass. The full path was run in an isolated Zotero 10.0.9 profile on macOS with a mouse-created source annotation; see [Validation](docs/validation.md).
- Page numbers and running heads that are part of the PDF's text usually prevent a transfer across a page break. The real revision corpus was not re-run.

## [0.3.0] - 2026-11-07

### Added

- Copy a child note with links to highlights and underlines from a completed transfer. The preview shows the old and new pages and identifies links without a confirmed match. The copy keeps the quoted text, comments, formatting, and other links.
- Before saving, MarginCarry checks that the note, transfer, and target annotations still match the preview. Switching notes clears the previous preview.

### Validation

- Checked note copying in an isolated Zotero 10.0.8 profile on macOS. After moving a highlight from page 1 to page 2, the original and reopened copy each opened their corresponding highlight. Also checked that switching notes in the same dialog clears the previous preview and saves a copy of the newly selected note.

### Maintenance

- Populated the previously empty `updates.json` with the published v0.1.0, v0.1.1, and v0.2.0 releases so installed copies can find updates through Zotero's built-in check. Each entry records the release asset, its SHA-256, and the package's Zotero compatibility range.
- Added `scripts/update-manifest.mjs` to add and verify entries from published releases, an `update-manifest` workflow that proposes the entry as a pull request after a release, tests for the tooling, and the [Releasing and updates](docs/releasing.md) guide. The README now has one install and update path.

## [0.2.0] - 2026-10-31

### Added

- Interface languages: Spanish, German, French, Japanese, and Brazilian Portuguese join English and Russian. The dialog has a button for each language, annotation types are named in the selected language, and every project-owned message is translated. The language follows Zotero's locale; any Portuguese locale uses the Brazilian translation.
- Matching was checked on real PDFs in Russian, Spanish, German, French, Japanese, and Brazilian Portuguese (45 cases in Zotero 10.0.7) and covered by new unit tests. Generator and host scripts for that check are included.
- Developer tooling to check the dialog in every language: a stdlib-only fixture generator and host scripts that screenshot the real dialog and report clipped text (see the development guide).

### Fixed

- A quote that survived only as part of a longer word or number (`cat` in `concatenate`, `not` in `cannot`, `41.0` in `41.03`) was reported as a unique, recommended candidate and added by **Select unique proposals**. Such occurrences are now a **Doubtful candidate**: kept with their exact geometry and a stated reason, never recommended or preselected, and excluded from mass selection. They can still be chosen manually and confirmed as before.
- The check compares both ends of the original selection with both ends of the candidate. A deliberately partial selection of a word or number still transfers while the surrounding word or number is unchanged. Boundaries inside scripts written without word delimiters are not guessed and are disclosed.
- Doubtful occurrences count toward ambiguity, so a single clean occurrence among many doubtful ones is not recommended.
- Russian wording no longer mixes English terms, and the proposal outcome follows each language's punctuation.

### Changed

- New proposal status `doubtful candidate` and a per-candidate `boundary` verdict in the in-memory plan. `transfers.json` and its schema are unchanged.
- Messages no longer mention a plugin version ("outside v0.1"). The English texts changed accordingly.
- Documentation was rewritten for new users and contributors: README, [How MarginCarry works](docs/how-it-works.md), [Architecture](docs/architecture.md), [Validation](docs/validation.md), and the development guide. Archived v0.1.0 reports are kept as recorded.
- Corpus scoring reports a `doubtful` count.

### Validation and limits

- Biome, strict TypeScript, the automated tests, and packaging pass. The dialog was checked in all seven languages on Zotero 10.0.7 (macOS) at two window widths, and the apply, repeat-protection, and Undo cycle was run through the real dialog.
- The frozen v0.1.0 corpus was not re-run for this version. See the [release notes](docs/releases/v0.2.0.md).
- Word and number boundaries are judged from characters only, not meaning. See [How MarginCarry works](docs/how-it-works.md).

### Maintenance

- Reconciled the README and validation report with the published v0.1.1 release.
- Added monthly grouped Dependabot checks for npm and GitHub Actions, with major upgrades left for manual review.
- Added repository editing and Git conventions, contribution and security policies, a code of conduct, issue forms, and a pull request template.
- Added CI timeouts, scoped release permissions, and cancellation of superseded checks.

## [0.1.1] - 2026-10-08

### Changed

- Published completed native validation evidence for mouse-created annotations and live highlight/underline overlays for the four known LoRA geometry outliers.
- Repaired custom validation paths, full target/journal repeat checks, independent metadata assertions, and host bridge request serialization.
- Made the host installer and packaging regression test follow the current package version.

### Validation and limits

- All 73 automated tests, TypeScript, Biome, and packaging passed.
- The runtime bundle is identical to v0.1.0; only the manifest version differs inside the XPI. Native testing exercised the published v0.1.0 package, not a separate v0.1.1 installation.
- Four strict geometry discrepancies and the supplementary `pa- / rameters` boundary discrepancy remain recorded.

See the [release notes](docs/releases/v0.1.1.md) and [native follow-up](docs/native-v010-followup.md).

## [0.1.0] - 2026-10-07

### Added

- Native highlight and underline transfer between local PDF revisions of one item in a personal Zotero library.
- Conservative matching, PDF previews, explicit selection of ambiguous candidates, and confirmation before writes.
- Copies with new annotation keys and preserved comments, colors, and text tags.
- Revision checks, transactional writes, repeat protection, and conflict-aware undo.
- English and Russian interfaces.

### Validation and limits

- Initial release validation covered Zotero 10.0.5 on macOS 15.7.9, Apple Silicon, with 65 automated tests.
- The independent corpus contained 23 positive and nine untransferred cases. Four strict geometry discrepancies remained among 120 LoRA alternatives.

See the [release notes](docs/releases/v0.1.0.md). Later v0.1.0 native testing is documented separately in the validation reports.

[0.3.0]: https://github.com/0then0/margincarry/releases/tag/v0.3.0
[0.2.0]: https://github.com/0then0/margincarry/releases/tag/v0.2.0
[0.1.1]: https://github.com/0then0/margincarry/releases/tag/v0.1.1
[0.1.0]: https://github.com/0then0/margincarry/releases/tag/v0.1.0
