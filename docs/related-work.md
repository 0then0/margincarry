# Related work

MarginCarry carries reading work between two local PDF attachments of one Zotero item. It does not claim to have invented annotation transfer. Requests for this workflow appear in the Zotero discussions [migration of annotations](https://forums.zotero.org/discussion/103439/migration-of-annotations-to-new-pdf-file-version), [Zotero 7 annotation transfer](https://forums.zotero.org/discussion/118039/zotero-7-annotation-transfer), and [transferring annotations](https://forums.zotero.org/discussion/125669/transfering-my-annotations-from-old-pdf-to-new-pdf).

## PDF Annotations Transfer

[maforn/pdf-annotations-transfer](https://github.com/maforn/pdf-annotations-transfer) is a standalone Python/PyMuPDF tool for transferring PDF annotations, including text search and approximate matching. It is a close example of the underlying task. MarginCarry uses native Zotero annotations and its existing reader, allowing review and saving inside the library without another PDF engine.

## mktero and kanzi

[tenglvjun/mktero](https://github.com/tenglvjun/mktero) works with Markdown and PDF conversion through MinerU/Mistral OCR. Its native integration is useful as an example of Zotero interaction. External conversion providers and OCR are unnecessary for the restricted text-PDF transfer scope.

[UtkuBilenDemir/kanzi](https://github.com/UtkuBilenDemir/kanzi) imports Kindle highlights into Zotero. It addresses the neighboring quote-import problem rather than aligning annotations between PDF revisions and checking complete text ranges.

## reanchor

[microbluey/reanchor](https://github.com/microbluey/reanchor) re-finds quotes using context and maps normalized offsets back to the original string. The evaluated npm version is **0.3.0**, MIT, tarball SHA-1 `ef602f12dcdfc6d98e802d474ddb2cfa17e4e66e`. It is not a product dependency.

Three configurations were evaluated on the same native text streams for all 30 text cases. Each found at least one occurrence in each of the 23 positive cases. The check `text === source.slice(start, end)` found no offset round-trip errors. This confirms internal offset consistency, not independently correct placement of every result.

- Defaults matched four of seven negative cases: `lora-01`, `lora-07`, `attention-05`, and `attention-06`.
- Restricting to normalized matching left one negative match: the case change in `lora-01`.
- Disabling case folding, NFKD, mark stripping, punctuation folding, and hyphenated-line joining, with `maxRivals: 200`, left no matches in negative cases.

reanchor is therefore potentially usable with explicit settings. Claiming that it necessarily fails on this corpus would be incorrect. v0.1 uses a small exact/NFC matcher to account for repeats, disclose truncation, and require complete PDF glyph boundaries and normalized range equality. reanchor defaults to at most three rivals and removes some invisible symbols without a separate normalization option. Confidence and a truncated rival list cannot establish uniqueness under MarginCarry's contract.

[Evaluation results](../validation/reanchor-evaluation.json) and [reproduction commands](development.md) retain all tested text cases. Images are excluded only from text-library evaluation; the plugin's own statistics include them as unsupported.

## Rectoly

[Rectoly Annotation Sync](https://rectoly.com/guide/annotation-sync/) describes annotation transfer when PDFs change and confirms that this workflow already exists. Rectoly is an external product with paid features. MarginCarry provides a local open plugin with explicit proposal selection inside Zotero, without depending on that service.
