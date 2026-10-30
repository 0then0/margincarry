# Contributing to MarginCarry

MarginCarry transfers native PDF highlights and underlines between two revisions of the same Zotero item. Read the [README](README.md) for supported behavior and current limits, [How MarginCarry works](docs/how-it-works.md) for the matching rules, and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reports and proposals

Search existing issues before opening a bug report or feature request. Include the Zotero and MarginCarry versions, operating system, reproducible steps, expected result, and actual result. For geometry issues, include the annotation type and page rotation. Prefer a small synthetic PDF that you have permission to share.

Do not attach a real Zotero profile, database, transfer journal, private PDFs, or unredacted logs. The journal can contain comments, quotes, paths, and annotation keys. Report security issues through [SECURITY.md](SECURITY.md), not public bug reports.

Discuss changes to matching rules, supported annotation types, data storage, dependencies, or host compatibility before investing in a large implementation.

## Local setup and checks

Use Node.js 24, npm with the committed `package-lock.json`, and Python 3. From a clean checkout:

```sh
npm ci
npm run check
```

`npm run check` runs Biome, strict TypeScript, the automated tests, and XPI packaging. Use `npm run format` when editing supported source formats. Biome does not check Markdown, YAML, Python, SVG, or XHTML. Follow `.editorconfig`; keep changes scoped and avoid reformatting unrelated files. Do not commit `node_modules/`, `dist/`, or `.local/`.

Native validation requires a disposable Zotero profile and data directory. Follow the [development guide](docs/development.md); never run the privileged developer harness against your ordinary library. CI does not launch Zotero. State exactly which automated and native checks you performed, including the tested host and artifact version. Do not claim UI or platform coverage from unit tests.

## Changes and pull requests

- Preserve source annotations, PDFs, pre-existing target annotations, transactional writes, repeat protection, and conflict-aware undo.
- Keep matching conservative. Do not relax the two-PDF-point scorer or edit frozen gold and historical reports to make a new result pass. Store new evidence separately and explain how it was obtained.
- Add focused regression tests for behavior changes. Add or change interface text in every file under `src/locales/` together; see [Adding or changing a language](docs/development.md#adding-or-changing-a-language). Translation fixes from native speakers are especially welcome.
- Keep dependencies pinned and update the lockfile with npm when a dependency change is agreed.
- Describe the problem, resulting behavior, checks performed, and remaining limits in the pull request. Link the relevant issue and update documentation or the Unreleased changelog when appropriate.

Use English Conventional Commit subjects, for example `fix: reject a changed PDF before transfer` or `docs: clarify validation limits`. Maintainers review changes before merging; opening a pull request does not publish a release.

## Releases and licensing

Only maintainers publish releases. Package and manifest versions must agree with the `v<version>` tag, and `docs/releases/<tag>.md` must exist. The existing release workflow runs checks and publishes the XPI and checksum. Do not bump versions or move published tags for routine documentation changes.

Contributions are provided under [Apache-2.0](LICENSE). Preserve attribution and document third-party material in [THIRD_PARTY.md](THIRD_PARTY.md). Do not contribute PDFs or screenshots without the right to publish them.
