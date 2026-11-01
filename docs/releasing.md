# Releasing and updates

This page describes how a MarginCarry version reaches users: the release, the update manifest that lets Zotero offer it, and how to check the chain. Users only need the [install and update steps in the README](../README.md#install-and-update).

## How Zotero finds an update

Every MarginCarry XPI carries the same `update_url` in its `manifest.json`: `https://raw.githubusercontent.com/0then0/margincarry/main/updates.json`. Zotero asks that file about the installed add-on (`margincarry@0then0.github.io`). It offers the newest listed version that is newer than the installed one and whose `strict_min_version` and `strict_max_version` include the running Zotero. Zotero then downloads `update_link` and compares the file with `update_hash`.

`updates.json` therefore lists each published stable version with:

- `version`, which must equal the `version` in the XPI's own manifest;
- `update_link`, the URL of that tag's release asset, never a `latest` URL;
- `update_hash`, `sha256:` plus the SHA-256 of the exact published XPI bytes;
- `applications.zotero`, the compatibility range copied from the XPI's own manifest.

The hash is an integrity check against a damaged or substituted download. It is not a signature by the author, and MarginCarry packages are not signed.

Older entries stay in the file. An installed old version needs them to find its way forward, a Zotero release outside a newer version's range can still match an older entry, and the history shows what was published. Versions are ordered numerically (`0.10.0` comes after `0.9.0`), and a published entry is never rewritten.

Compatibility is never widened to make an update appear. Supporting a newer Zotero release means testing it, shipping a manifest that declares it, and publishing that version.

## Publishing a version

1. Prepare the release as before: version in `package.json`, `package-lock.json`, and `manifest.json`, a `CHANGELOG.md` entry, and `docs/releases/<tag>.md`. Merge to `main` with the checks green.
2. Push the tag `v<version>`. The `release` workflow runs the checks and publishes `margincarry-<version>.xpi` and its `.sha256` file.
3. When publishing has finished, the `update-manifest` workflow runs with that tag. It downloads the published XPI and checksum, verifies them, adds the entry, re-verifies every entry in the file, and opens a pull request that changes only `updates.json`.
4. Review the pull request and merge it. Zotero starts offering the version once the merged file is on `main`.

Pull requests opened with the workflow token do not start the `check` workflow. Close and reopen the pull request to run it. The repository must allow GitHub Actions to create pull requests; the workflow has no other way to write to `main`, and nothing merges automatically.

The workflow only adds a stable release. A draft or a prerelease is skipped with a message and changes nothing, so a prerelease never reaches the stable channel. To retry after a failure, run the `update-manifest` workflow by hand with the tag. A rerun on a tag that is already listed changes nothing; a rerun that finds different data for a listed version fails instead of rewriting it. Runs are serialized, and a second pull request that conflicts with the first is resolved by rebasing, so no entry is silently lost.

## Preparing and checking the manifest locally

```sh
node scripts/update-manifest.mjs add v0.2.0   # download, verify, and add one published release
node scripts/update-manifest.mjs verify       # re-check every entry against its published asset
```

`add` checks, in this order: the release is neither a draft nor a prerelease; both assets exist; the checksum file names the XPI and equals the SHA-256 of the downloaded bytes; the XPI's manifest has the expected ID, the tag's version, this repository's `update_url`, and a compatibility range. Only then does it write `updates.json`, through a temporary file and a rename, so a failure at any step leaves the previous file untouched. `verify` rebuilds each entry from its asset and requires an exact match. Both need network access and can use `GITHUB_TOKEN` for rate limits. Ordinary tests and the build never touch the network: the logic is in `scripts/lib/update-manifest.mjs` and is tested with in-memory releases.

## Checking the update path

Automated, offline: `npm test` covers entry generation, ID and version agreement with the XPI manifest, checksum failures, missing or damaged assets, network errors, drafts and prereleases, re-runs, ordering, and preserving existing entries. It also checks the committed `updates.json` and that every older install would be offered the newest version on a compatible Zotero.

Against the published files: `node scripts/update-manifest.mjs verify` downloads every listed XPI from GitHub and compares it with the file. The results of such a run are recorded in [`validation/distribution/`](../validation/distribution/).

In Zotero, after the updated `updates.json` is on `main`, on a disposable profile and library without sync:

1. Install the previous published XPI (for example `margincarry-0.1.1.xpi`) with **Tools → Plugins → gear → Install Plugin From File…**. Do not edit the file.
2. Create a transfer with disposable PDFs so that the journal has a record.
3. Choose **Tools → Plugins → gear → Check for Updates**. Zotero should list MarginCarry with the newest version. Install it and restart.
4. Check the version in **Tools → Plugins**, that the journal record is still there (**Undo last transfer** offers it), and run one apply and undo.

Until `updates.json` on `main` lists a version, the public channel offers nothing, and step 3 cannot succeed.
