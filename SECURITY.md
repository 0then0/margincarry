# Security policy

## Supported versions

Security fixes target the latest published MarginCarry release. Older versions do not have a separate maintenance branch. Install the latest release from [GitHub Releases](https://github.com/0then0/margincarry/releases) and check the README for tested Zotero versions; a manifest compatibility range is not a claim that every host was tested.

## Reporting a vulnerability

Do not disclose exploitable issues, private documents, or library data in public issues or pull requests. Use [GitHub private vulnerability reporting](https://github.com/0then0/margincarry/security/advisories/new) if it is enabled for the repository. If that page is unavailable, open an issue asking the maintainer to enable a private reporting channel, without including vulnerability details or sensitive attachments. Never post a working exploit publicly just to establish contact.

Include the affected MarginCarry and Zotero versions, operating system, minimal reproduction, expected and observed behavior, and likely impact. Prefer synthetic PDFs and a disposable profile. Remove private text, comments, paths, credentials, and identifiers from logs. A Zotero database, profile, or complete `margincarry/transfers.json` journal is not needed for initial contact.

Maintainers will assess reports and coordinate fixes and disclosure with the reporter. There is no guaranteed response time, paid support, or bug bounty.

## Security boundaries

The plugin runs inside Zotero and uses internal reader APIs. It processes local PDFs and creates native annotations only after explicit confirmation. PDF and annotation revision checks, transactional writes, the transfer journal, repeat protection, and conflict-aware undo protect library integrity. Suspected bypasses of these protections are relevant reports.

The developer harness can execute privileged scripts. It is restricted to an isolated profile, is not included in release XPIs, and must not be used with an ordinary Zotero library. Keep `.local/` private. The transfer journal contains document text, comments, geometry, and local paths; treat it as library data.

MarginCarry has no account, telemetry, or remote document processing. Zotero's own sync, network, and plugin-update behavior is governed by Zotero. For a vulnerability in Zotero itself, use Zotero's security reporting channel.

Dependabot checks npm and GitHub Actions monthly, groups ordinary updates, and excludes major upgrades from automatic proposals. Security updates, when enabled in repository settings, use GitHub's separate alert-driven process; major upgrades may still require manual attention. Configuration files alone do not enable private reporting, branch protection, or security-update settings on GitHub.
