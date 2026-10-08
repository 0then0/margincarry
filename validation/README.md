# Validation fixtures and recorded evidence

This directory is intentionally public. It contains small frozen inputs and evidence needed to reproduce and audit MarginCarry's matching and data-preservation claims. It is not a runtime data directory and is not included in the XPI.

- `selections.json`, `corpus.json`, and `fixture-gold.json`: independent source selections and PDF-coordinate oracle. Corpus download URLs and exact PDF hashes are recorded here; PDFs themselves are downloaded into ignored `.local/`.
- `corpus-results.json`, `corpus-score.json`, and `reanchor-evaluation.json`: historical matcher and independent scoring results. Keep failures, alternatives, and the original two-point tolerance.
- Root `host-*.json`, `integration-spike.json`, and `checks.txt`: historical development evidence. They do not establish validation of the published v0.1.0 artifact. See [engineering report](../docs/engineering-report.md) for artifact attribution and limitations.
- `native-v010/`: published v0.1.0 evidence on Zotero 10.0.6, including its frozen case plan, lifecycle snapshots, native geometry measurements, and comparison images. See [validation report](../docs/native-v010-validation.md).

Recorded annotation keys, fingerprints, comments, and library records belong exclusively to disposable research-paper fixtures. They are retained to make preservation, repeat, and Undo checks auditable. Images contain limited validation excerpts of the referenced papers, not redistributed full PDFs. New native reports replace the absolute workstation prefix with `<workspace>`; raw exports remain local. Historical files are preserved as recorded.

Fresh run outputs belong in ignored `.local/<run>/reports` (the host bridge's default), or an explicitly chosen `MARGINCARRY_REPORT_ROOT`. Keep Zotero databases, profiles, downloaded applications, PDFs, raw logs, and exploratory screenshots out of Git. Promote only evidence referenced by a report, with the tested artifact hash, method, failures, and limitations recorded. Reproduction commands are in [development guide](../docs/development.md).
