# Changelog

Notable changes to MarginCarry are recorded here. Released entries describe the corresponding published artifact; later documentation changes do not create a new release.

## [0.1.2] - Unreleased

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
- The frozen v0.1.0 corpus was not re-run for this version. See the [release notes](docs/releases/v0.1.2.md).
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

[0.1.2]: https://github.com/0then0/margincarry/releases/tag/v0.1.2
[0.1.1]: https://github.com/0then0/margincarry/releases/tag/v0.1.1
[0.1.0]: https://github.com/0then0/margincarry/releases/tag/v0.1.0
