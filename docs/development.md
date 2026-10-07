# Development and reproducible validation

## Local checks

Use Node.js 24 and npm. `npm ci` restores exact versions from the lockfile. Do not replace an existing Python environment or `.venv` for ordinary packaging.

```sh
npm ci
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
# Checks plus packaging; source files are not reformatted:
npm run check
```

The build bundles `src/index.ts` with esbuild into a Firefox 140 IIFE and packages a ZIP/XPI using Python 3's standard library. Entries are sorted and ZIP timestamps are fixed. Output is `dist/margincarry-0.1.0.xpi` and its `.sha256` file. Tests, the developer harness, corpus, npm packages, and Python dependencies are excluded. The build has a regression test for paths containing spaces and non-ASCII characters.

Biome uses two spaces, single quotes in JavaScript/TypeScript, and the recommended lint preset. Warnings fail `npm run lint`. It does not parse Python, SVG, XHTML, or YAML. These require their appropriate syntax, packaging, host, or workflow checks. Frozen `validation/` artifacts and npm-owned `package-lock.json` are excluded from formatting.

`noExplicitAny` is disabled only in `src/zotero.ts` and `src/host.d.ts` at the privileged dynamic host boundary. Bootstrap disables `noUnusedVariables` because Zotero calls lifecycle functions by name. Test fixture assertions may use non-null assertions. One `noImportantStyles` suppression makes the HTML `[hidden]` attribute override layout rules. Matching, geometry, and transaction logic use the normal lint rules.

## Localization

`src/l10n.ts` contains typed English and Russian UI resources, interpolation, project-owned diagnostic translations, and static DOM localization. The menu and initial dialog follow Zotero's locale; other locales fall back to English. The dialog's Language selector changes only its language and preserves accepted locations. Original PDF quotes, user comments, filenames, keys, and host-generated diagnostics are not rewritten.

Add every user-facing label in both dictionaries, including accessibility labels and confirmation prompts. Add translations for project-owned errors and outcomes. Tests verify placeholder parity, XHTML resource keys, both UI locales, dynamic diagnostics, and language changes with accepted proposals. Public documentation and screenshots use English.

## Isolated Zotero profile

Native checks modify disposable test data only. Never run the harness in a normal user profile. Scripts use Zotero APIs and do not edit SQLite directly.

1. Download official Zotero 10.0.5 from [Zotero](https://www.zotero.org/download/). The recorded host checks use macOS 15.7.9 on Apple Silicon and the [official 10.0.5 DMG](https://download.zotero.org/client/release/10.0.5/Zotero-10.0.5.dmg).
2. From the repository root, run `node scripts/prepare-host.mjs`. It creates `.local/profile`, `.local/data`, and a separate test-only harness. It refuses to overwrite an already configured profile.
3. Launch a separate Zotero copy with `-no-remote -profile` and the absolute `.local/profile` path. On macOS, with the copy in `.local/Zotero.app`:

   ```sh
   "$PWD/.local/Zotero.app/Contents/MacOS/zotero" \
     -no-remote -profile "$PWD/.local/profile" -ZoteroDebugText
   ```

4. Check that this profile's data directory is `.local/data`. The harness starts only when both paths match exactly. If local developer registration does not load it, install `.local/harness.xpi` through **Tools → Plugins** in this profile and restart Zotero. Do not change signature or security settings.
5. After startup, `.local/harness-ready.json` contains the verified profile path. `scripts/host-request.mjs` refuses a different profile. Run host checks only after this file appears.

The harness polls a local command file and runs developer scripts in Zotero's privileged environment. It is restricted to the isolated profile and is never included in the product XPI. `scripts/host/*.js` export `run()` for this bridge; they are validation tools, not a standalone MarginCarry CLI.

## Real revision corpus

LoRA `2106.09685v1 → v2` and Attention `1706.03762v1 → v2` each have 16 independently selected source cases. `validation/selections.json` was frozen before the first matcher run. `validation/corpus.json` records independent PDF-point coordinates, expected outcomes, URLs, SHA-256 values, and the oracle version. Failures remain in the statistics.

```sh
node scripts/fetch-corpus.mjs
node scripts/host-request.mjs scripts/host/install.js
node scripts/host-request.mjs scripts/host/load.js
node scripts/host-request.mjs scripts/host/seed-corpus.js
node scripts/host-request.mjs scripts/host/run-corpus.js
python3 scripts/score-corpus.py
node scripts/host-request.mjs scripts/host/apply-corpus.js
```

`fetch-corpus` reuses downloaded files and always verifies their hashes. A mismatch stops the check; frozen gold must not be used with different PDFs. `seed-corpus` creates fresh bibliographic items, native source annotations, and a pre-existing target annotation. Do not seed again between apply and restart: `.local/corpus-ids.json` identifies the current fixture set.

`apply-corpus` chooses only candidates matching independent gold within two PDF points. The oracle selects the ambiguous candidate for this test; the product requires a person's selection. The script also checks cancellation and rollback after an injected failure on the second native write. This supplements, and does not replace, UI validation.

Quit and relaunch the same isolated Zotero profile, then run:

```sh
node scripts/host-request.mjs scripts/host/load.js
node scripts/host-request.mjs scripts/host/verify-restart.js
node scripts/host-request.mjs scripts/host/undo-corpus.js
```

`verify-restart` checks copy fingerprints and repeat protection. `undo-corpus` edits one disposable copy and checks that the conflict removes nothing. It then restores only that fixture copy, including `dateModified`, to test successful undo separately. The product never restores or discards user edits this way.

Reports go to `validation/host-*.json`. The base CI neither downloads the corpus nor launches Zotero. Without a running host, these checks must not be reported as executed.

## Independent oracle and geometry fixtures

Regenerating the oracle requires pdfplumber 0.11.9 and its dependencies. Scoring frozen gold requires only Python's standard library. Original fixture PDF generation uses ReportLab 4.4.9 and pypdf 6.10.0; they are not plugin dependencies. Use an existing suitable environment rather than installing them automatically into a user's environment.

```sh
python3 scripts/make-fixtures.py
node scripts/host-request.mjs scripts/host/geometry.js
```

`validation/fixture-gold.json` contains source coordinates obtained independently through pdfplumber. Native checks cover page insertion, a multiline selection in two columns, 90° page rotation with crop box `[40, 40, 500, 750]`, and a PDF without text. `docs/images/fixture-*.png` are actual bundled PDF.js renders; other documented workflow images are native Zotero screenshots.

`python3 scripts/build-gold.py` regenerates oracle ranges from the frozen selections. It changes the reference artifact and is not a routine response to a failed test. Do not modify gold or tolerance to fit matcher output. The original evaluation retains four LoRA geometry discrepancies. `sorted({t["pageIndex"] + 1 for t in targets})` uses the direct set comprehension recommended by Ruff C401. Ruff is not a project dependency; Biome does not lint Python.

## File replacement and recovery regressions

In an isolated profile, open a target PDF, replace its bytes at the same path with a different fixture, and analyze the pair again. The adapter must reload and extract the new bytes. Replacement during loading must reject the result; replacement or native reader reload after analysis must require recalculation before preview or creation. `scripts/host/revision-regression.js` performs this check on project-owned disposable data and records its result.

Close and reopen the transfer dialog while an operation is active. The new window must not recover or overwrite the active journal. Wait for the operation to finish before reopening. Automated tests exercise overlapping public journal recovery with apply and undo, including recovery failure and lock release.

## Optional reanchor evaluation

No product dependency is needed. Obtain the exact npm package in ignored research files:

```sh
mkdir -p .local/research/reanchor-npm
npm pack reanchor@0.3.0 --pack-destination .local/research
# Expected SHA-1: ef602f12dcdfc6d98e802d474ddb2cfa17e4e66e
shasum .local/research/reanchor-0.3.0.tgz
tar -xzf .local/research/reanchor-0.3.0.tgz -C .local/research/reanchor-npm
node scripts/host-request.mjs scripts/host/export-streams.js
node scripts/evaluate-reanchor.mjs
```

This requires an existing `.local/corpus-plans.json` with original context. Full native text streams remain in ignored `.local/native-corpus.json`; only selected-case evaluation results enter the repository. See [related work](related-work.md).

## UI verification

Select `MarginCarry validation: page-insertion` or both of its attachments in the isolated library. Follow the README workflow: direction, analysis, actual previews, acceptance, selected set, confirmation, native reader, and undo. Record real English screenshots. For ambiguity, run `node scripts/host-request.mjs scripts/host/seed-ambiguous.js` and select `MarginCarry validation: ambiguous`. Check **Not found** on `MarginCarry validation: no-text`.

Verify both Language choices, including error text and confirmation prompts. While the first previews load, Cancel must discard the plan. Accept a proposal and change direction: the review count must become zero and Apply must be disabled.

[Engineering report](engineering-report.md) distinguishes native API and UI evidence. API calls alone do not prove that a person could complete the interface workflow.
