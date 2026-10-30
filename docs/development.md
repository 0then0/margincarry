# Development guide

This guide covers building MarginCarry, running its checks, working on translations, and reproducing the native validation in an isolated Zotero profile. See also [CONTRIBUTING.md](../CONTRIBUTING.md) and the [architecture notes](architecture.md).

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

The build bundles `src/index.ts` with esbuild into a Firefox 140 IIFE and packages a ZIP/XPI using Python 3's standard library. Entries are sorted and ZIP timestamps are fixed. Output is `dist/margincarry-<version>.xpi` and its `.sha256` file, using the version from `package.json`. Tests, the developer harness, corpus, npm packages, and Python dependencies are excluded. The build has a regression test for paths containing spaces and non-ASCII characters.

Biome uses two spaces, single quotes in JavaScript/TypeScript, and the recommended lint preset. Warnings fail `npm run lint`. It does not parse Python, SVG, XHTML, or YAML. These require their appropriate syntax, packaging, host, or workflow checks. Frozen `validation/` artifacts and npm-owned `package-lock.json` are excluded from formatting.

`noExplicitAny` is disabled only in `src/zotero.ts` and `src/host.d.ts` at the privileged dynamic host boundary. Bootstrap disables `noUnusedVariables` because Zotero calls lifecycle functions by name. Test fixture assertions may use non-null assertions. One `noImportantStyles` suppression makes the HTML `[hidden]` attribute override layout rules. Matching, geometry, and transaction logic use the normal lint rules.

## Adding or changing a language

Interface text lives in `src/locales/`, one file per language: `en.ts` (the source of every key), `ru.ts`, `es.ts`, `de.ts`, `fr.ts`, `ja.ts`, and `pt-br.ts`. Each non-English file exports two objects, and TypeScript refuses to compile if either has a missing or extra key:

- `ui` holds labels, prompts, accessibility text, and interpolated strings such as `Selected to write: {count}`. Keep the `{placeholders}` exactly as in English; a test compares them.
- `messages` translates the project-owned diagnostics that appear in the status line and in proposal reasons. The English text in `en.ts` is the lookup key and also the text used in the code, so changing a message means changing it in both places. A test checks that every message in the source is listed and every listed message is used.

To add a language:

1. Create `src/locales/<tag>.ts` with both objects, then import it in `src/l10n.ts`, add the tag to `locales`, give it a native name in `localeNames`, and extend `selectLocale` if its Zotero locale codes need mapping.
2. Run `npm test`. The tests check key and placeholder parity, that nothing is left as English, the language buttons, and language switching with accepted proposals.
3. Run the interface check below and read each screenshot. Texts must not be clipped, overlap, or force horizontal scrolling at the default window size and at 900 px.

`selectLocale` maps Zotero's locale to a language by its primary subtag. Every Portuguese locale uses the Brazilian translation, and an unsupported locale falls back to English. The menu and the first view of the dialog follow Zotero's locale; the language buttons switch the dialog afterwards without discarding accepted proposals. Quoted PDF text, user comments, file names, annotation keys, and diagnostics produced by Zotero are never translated. Documentation and screenshots are English only.

## Isolated Zotero profile

Native checks modify disposable test data only. Never run the harness in a normal user profile. Scripts use Zotero APIs and do not edit SQLite directly.

1. Install official Zotero 10.0.x from [zotero.org](https://www.zotero.org/download/). Any copy works, including the one in `/Applications`, because the isolated profile never uses your normal data directory.
2. From the repository root, run `node scripts/prepare-host.mjs`. It creates `.local/profile`, `.local/data`, and a separate test-only harness. It refuses to overwrite an already configured profile.
3. Launch a separate Zotero copy with `-no-remote -profile` and the absolute `.local/profile` path. On macOS:

   ```sh
   /Applications/Zotero.app/Contents/MacOS/zotero \
     -no-remote -profile "$PWD/.local/profile" -ZoteroDebugText
   ```

4. Check that this profile's data directory is `.local/data`. The harness starts only when both paths match exactly. If local developer registration does not load it, install `.local/harness.xpi` through **Tools → Plugins** in this profile and restart Zotero. Do not change signature or security settings.
5. After startup, `.local/harness-ready.json` contains the verified profile path. `scripts/host-request.mjs` refuses a different profile. Run host checks only after this file appears.

Requests to one profile must run sequentially. The bridge refuses a concurrent request; if it times out, quit the isolated host before removing its retained `request.lock`.

The harness polls a local command file and runs developer scripts in Zotero's privileged environment. It is restricted to the isolated profile and is never included in the product XPI. `scripts/host/*.js` export `run()` for this bridge; they are validation tools, not a standalone MarginCarry CLI.

## Real revision corpus

LoRA `2106.09685v1 → v2` and Attention `1706.03762v1 → v2` each have 16 independently selected source cases. `validation/selections.json` was frozen before the first matcher run. `validation/corpus.json` records independent PDF-point coordinates, expected outcomes, URLs, SHA-256 values, and the oracle version. Failures remain in the statistics.

```sh
node scripts/fetch-corpus.mjs
node scripts/host-request.mjs scripts/host/install.js
node scripts/host-request.mjs scripts/host/load.js
node scripts/host-request.mjs scripts/host/seed-corpus.js
node scripts/host-request.mjs scripts/host/run-corpus.js
python3 scripts/score-isolated-corpus.py "${MARGINCARRY_REPORT_ROOT:-${MARGINCARRY_HOST_ROOT:-.local}/reports}"
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

Reports go to `${MARGINCARRY_HOST_ROOT:-.local}/reports` by default. Set `MARGINCARRY_REPORT_ROOT` to choose a separate output directory. Corpus IDs/plans and stream exports use `MARGINCARRY_HOST_ROOT`; PDF downloads remain shared, hash-verified inputs under `.local/corpus`. Frozen public reports are never the default destination. The base CI neither downloads the corpus nor launches Zotero. Without a running host, these checks must not be reported as executed.

### Re-running the corpus for a later version

The frozen `validation/corpus-results.json` and `corpus-score.json` describe the matcher that produced them. After a matching change, run the commands above against a freshly packaged XPI, keep the outputs in `MARGINCARRY_REPORT_ROOT`, and record the package version, commit or working-tree description, and the XPI SHA-256 with them. Score with `scripts/score-isolated-corpus.py`, which leaves frozen files untouched. The unchanged strict scorer now also counts `doubtful` proposals; compare `wrongRecommendations`, `positiveCasesWithoutCorrectProposal`, and the status counts with the historical numbers and explain every difference. A positive case that became `doubtful` is not lost (its candidate and geometry remain), but it is no longer recommended and must be reported.

## Checking the dialog in every language

With the isolated host running and the built XPI installed, generate a small fixture with one quote for each outcome and capture the dialog in every language:

```sh
npm run build
python3 scripts/make-ui-fixture.py
node scripts/host-request.mjs scripts/host/install.js
node scripts/host-request.mjs scripts/host/load.js
node scripts/host-request.mjs scripts/host/seed-ui.js
node scripts/host-request.mjs scripts/host/capture-ui.js
```

`make-ui-fixture.py` writes two PDFs to `.local/ui-fixture/` using only the standard library. `seed-ui.js` imports them into the isolated library with source annotations for a unique, doubtful, ambiguous, missing, and unsupported case, plus a long quote and a long comment. `capture-ui.js` opens the real dialog, runs the analysis, and for each language and for window widths of 1180 and 900 px selects the main outcomes, takes PNG screenshots, and records any element whose text is wider than its box, any horizontal page scroll, and any button that wraps onto more than two lines. The PNG files and `metrics.json` are written to `<report root>/ui-languages/`. Screenshots are for reading; the metrics are the pass or fail signal.

To exercise the whole transfer through the real dialog on the same fixture, run `node scripts/host-request.mjs scripts/host/ui-lifecycle.js`. It uses mass selection, picks a doubtful candidate by hand, applies, checks that the copies keep their comment, color, and tags and that the sources and PDFs are unchanged, confirms that a repeat is refused, and undoes the transfer. It leaves one undone record in the isolated journal.

## Independent oracle and geometry fixtures

Regenerating the oracle requires pdfplumber 0.11.9 and its dependencies. Scoring frozen gold requires only Python's standard library. Original fixture PDF generation uses ReportLab 4.4.9 and pypdf 6.10.0; they are not plugin dependencies. Use an existing suitable environment rather than installing them automatically into a user's environment.

```sh
python3 scripts/make-fixtures.py
node scripts/host-request.mjs scripts/host/geometry.js
```

`validation/fixture-gold.json` contains source coordinates obtained independently through pdfplumber. The fixtures are shown in [old](images/fixture-old.png), [new](images/fixture-new.png), and [rotated](images/fixture-rotated.png) form. Native checks cover page insertion, a multiline selection in two columns, 90° page rotation with crop box `[40, 40, 500, 750]`, and a PDF without text. `docs/images/fixture-*.png` are actual bundled PDF.js renders; other documented workflow images are native Zotero screenshots.

`python3 scripts/build-gold.py` regenerates oracle ranges from the frozen selections. It changes the reference artifact and is not a routine response to a failed test. Do not modify gold or tolerance to fit matcher output. The original evaluation retains four LoRA geometry discrepancies.

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

This requires an existing `corpus-plans.json` with original context in the selected host root. `evaluate-reanchor.mjs` uses the same host/report roots as the bridge. Full text streams and fresh evaluation reports remain in ignored `.local/`; only deliberately frozen selected-case evidence belongs in `validation/`. See [related work](related-work.md).

## UI verification

Select `MarginCarry validation: page-insertion` or both of its attachments in the isolated library. Follow the README workflow: direction, analysis, actual previews, acceptance, selected set, confirmation, native reader, and undo. Record real English screenshots. For ambiguity, run `node scripts/host-request.mjs scripts/host/seed-ambiguous.js` and select `MarginCarry validation: ambiguous`. Check **Not found** on `MarginCarry validation: no-text`.

Verify both Language choices, including error text and confirmation prompts. While the first previews load, Cancel must discard the plan. Accept a proposal and change direction: the review count must become zero and Apply must be disabled.

[Validation](validation.md) distinguishes native API and UI evidence. API calls alone do not prove that a person could complete the interface workflow.

## Reproducing the published v0.1.0 native validation

The [October 7 report](native-v010-validation.md) identifies the published XPI by hash and separates reader UI, native API, and print-renderer evidence. Its artifacts are in `validation/native-v010/`; do not overwrite them during reproduction. No dependency installation is needed with the existing project environment.

Create fresh isolated directories and copy the frozen case plan:

```sh
export MARGINCARRY_HOST_ROOT=.local/native-reproduction
export MARGINCARRY_REPORT_ROOT=.local/native-reproduction/reports
node scripts/prepare-host.mjs
mkdir -p "$MARGINCARRY_REPORT_ROOT"
cp validation/native-v010/cases.json "$MARGINCARRY_REPORT_ROOT/cases.json"
```

Launch official Zotero 10.0.6 with `-no-remote -profile "$PWD/$MARGINCARRY_HOST_ROOT/profile"`. Install or enable the generated harness and install the **downloaded published** v0.1.0 XPI through this profile's normal Plugins UI. Preserve signature and security settings. Verify the environment, then import only PDFs and existing target notes:

```sh
node scripts/host-request.mjs scripts/host/native-validation.js environment
node scripts/host-request.mjs scripts/host/seed-native.js
```

The environment action refuses a non-isolated profile/data directory or a different/inactive published XPI. `seed-native.js` refuses an existing fixture ID file. It creates no source annotation items. In the actual reader, create every source from the frozen plan before analysis. The recorded run used Find in Document and Control-Alt-1/2; exercise actual mouse selections as well to address its remaining limitation. For `Google Brain`, select the first author's affiliation, not an arbitrary matching occurrence. Keep unsupported or unsuccessful selections in the report.

Capture actual sources, retain their undecorated snapshot, and add preservation metadata only after UI creation:

```sh
node scripts/host-request.mjs scripts/host/native-validation.js capture
cp "$MARGINCARRY_REPORT_ROOT/sources.json" "$MARGINCARRY_REPORT_ROOT/sources-ui.json"
node scripts/host-request.mjs scripts/host/native-validation.js decorate
node scripts/host-request.mjs scripts/host/native-validation.js capture
node scripts/host-request.mjs scripts/host/native-validation.js analyze
node scripts/host-request.mjs scripts/host/native-validation.js apply
```

The six positive cases use the independently frozen corresponding locations; the changed abstract remains not found. Quit and relaunch the same profile, then run `native-validation.js restart` and `native-validation.js undo` through the bridge. The latter tests an edited-copy conflict, verifies no partial mutation, restores only that disposable fixture, and separately tests successful Undo. These are native API stages; they do not substitute for actual dialog actions.

For a separate UI operation, run `native-validation.js ui-before` after the API Undo, then use Tools → MarginCarry to analyze Attention, review `native-07` and Candidate 1 of `native-05`, accept them, and explicitly confirm two copies. Run `ui-after`; quit/relaunch, run `ui-restart`; perform a new UI analysis and attempted repeat, run `ui-repeat`; then confirm UI Undo and run `ui-undo`. The `ui-*` stages only read snapshots/journal. Record actual UI observations separately.

For the programmatically seeded 32-case supplement and native geometry measurement:

```sh
node scripts/host-request.mjs scripts/host/seed-corpus.js
node scripts/host-request.mjs scripts/host/run-corpus.js native-v010
python3 scripts/score-isolated-corpus.py "$MARGINCARRY_REPORT_ROOT"
node scripts/host-request.mjs scripts/host/native-validation.js geometry
```

The corpus fixture IDs/plans use the selected host root. All corpus stages, including the default `run-corpus.js` action, use the selected report root. `score-isolated-corpus.py` runs an exact copy of the unchanged scorer and gold in a temporary directory, keeping the original 2-point tolerance and historical reports intact. Native geometry uses the installed reader's pure range and print-renderer methods; it is a supplementary measurement, not a source UI selection or live desktop overlay test. Verify those four overlays separately in the real reader.

`capture` records snapshots only; describe the actual source-creation method in separate UI observations. `ui-after` must be captured with the current harness before `ui-repeat`: repeat compares the complete target snapshot and journal and fails on any added copy or operation. Its fixed published SHA intentionally makes the stages unsuitable for claiming validation of a different product build.

## Release publication

The `release` GitHub Actions workflow runs on `v*` tags. The tag must equal the version in both `package.json` and `manifest.json`. It installs the locked dependencies, runs `npm run check`, and publishes the XPI and SHA-256 file with the matching `docs/releases/<tag>.md` notes. Publication uses the workflow token with repository contents write access; no local browser or personal token is required.
