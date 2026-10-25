# Changelog

Notable changes to MarginCarry are recorded here. Released entries describe the corresponding published artifact; later documentation changes do not create a new release.

## Unreleased

### Maintenance

- Reconciled the README and engineering report with the published v0.1.1 release.
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

See the [release notes](docs/releases/v0.1.0.md). Later v0.1.0 native testing is documented separately in the engineering reports.

[0.1.1]: https://github.com/0then0/margincarry/releases/tag/v0.1.1
[0.1.0]: https://github.com/0then0/margincarry/releases/tag/v0.1.0
