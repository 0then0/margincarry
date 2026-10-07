# Dependencies and licenses

MarginCarry source, documentation, original fixture content and SVG icon use the repository's Apache-2.0 license. No third-party application source is copied into the bundle.

## Build and quality tools

Versions are exact in `package.json` and resolved with integrity hashes in `package-lock.json`. None is loaded as a runtime dependency of the installed plugin.

- **TypeScript 5.9.3**, Apache-2.0: [project](https://github.com/microsoft/TypeScript), [license](https://github.com/microsoft/TypeScript/blob/v5.9.3/LICENSE.txt).
- **esbuild 0.28.2**, MIT: [project and license](https://github.com/evanw/esbuild). Platform binaries are optional build dependencies of the same version.
- **Biome 2.5.15**, MIT OR Apache-2.0: [project and licenses](https://github.com/biomejs/biome). Platform binaries are optional development dependencies of the same version.

## Host software

The plugin runs in **Zotero 10.0.5**, whose source is AGPL-3.0. It calls Zotero's native annotation, transaction and reader facilities. The existing Zotero installation provides its reader and PDF.js; their source is not redistributed in MarginCarry's XPI.

The integration was inspected against Zotero commit `ca61760225d25191d0c65acbfd0c4f12a172d263`, reader submodule `9d821fa2c1941bdfdd7bee3199936401b45be852`, and PDF.js submodule `6cb4c4722f228464e78aea59fe919fc896fa2ea9`.

- [Zotero source and license](https://github.com/zotero/zotero)
- [Zotero reader source and license](https://github.com/zotero/reader)
- [Zotero PDF.js fork](https://github.com/zotero/pdf.js)

Calling host APIs is different from including host source. A future change that incorporates AGPL code must retain its notices and comply with its license; the project's Apache-2.0 notice must not be applied to such borrowed code.

## Optional validation tools

These were available in the validation environment and are used only by developer scripts. They are not bundled or required to install the XPI:

- **pdfplumber 0.11.9**, MIT, and **pdfminer.six 20251230**, MIT: independent character-box oracle.
- **ReportLab 4.4.9**, BSD-3-Clause: original deterministic fixture PDFs.
- **pypdf 6.10.0**, BSD-3-Clause: fixture crop box and page rotation.
- **reanchor 0.3.0**, MIT: optional comparison only. npm tarball SHA-1 `ef602f12dcdfc6d98e802d474ddb2cfa17e4e66e`.

## Corpus

The repository includes selected quotes and independently recorded coordinates for validation, with source URLs and PDF SHA-256 values in `validation/corpus.json`. The PDFs and full-page previews of public papers are excluded from the repository. Download instructions verify the exact files before testing. Public screenshots show only original project fixture pages and the installed Zotero interface.
