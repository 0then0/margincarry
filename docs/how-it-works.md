# How MarginCarry works

This page explains what MarginCarry decides for you, what it leaves to you, and where its rules stop. Technical internals are in the [architecture notes](architecture.md).

## The workflow in one paragraph

MarginCarry reads the text and the glyph positions of both PDFs through Zotero's own PDF reader. For each highlight or underline in the old PDF, it works out which text the selection covered, searches for exactly that text on every page of the new PDF, and turns each match back into a rectangle on the page. You compare the two locations visually, accept the ones you want, and confirm. Only then does it create new annotations.

## What is matched

Matching is deliberately literal. Only two differences between the old quote and the new text are ignored:

- Unicode composition. `é` written as one character matches `e` followed by a combining accent.
- Whitespace. Line breaks, repeated spaces, and tabs all count as one space, so a passage that was re-flowed onto different lines still matches.

Everything else is significant: upper and lower case, accents, punctuation, hyphens and dashes, and numbers. `41.0` does not match `41.2`, `TRUE` does not match `true`, and `not valid` does not match `valid`. There is no fuzzy matching, no case folding, no spelling correction, no translation, and no OCR.

A match must also end on whole PDF glyphs. A ligature such as `fi` is one glyph, so a quote that would end in the middle of it is rejected rather than highlighted as if it had matched. The same applies to a match that would silently pick up an extra combining mark or an emoji joiner.

The old page number is not evidence. A paragraph that moved from page 3 to page 8 is found like any other.

A quote must be found on a single page of the new PDF. A passage that now spans a page break is reported as not found.

## Several occurrences and context

A quote can occur many times, for example a short term or a name. MarginCarry keeps up to 200 occurrences per annotation. If the list is cut off, it says so and never claims a unique match.

To tell occurrences apart, it compares the text just before and just after the original selection (up to 80 characters each side, at least 16 characters in total) with the text around each occurrence. An occurrence that matches the available context while all others do not is recommended, and the others stay in the list. Context is never required to be complete: neighbouring sentences may have been edited while the quote itself is still in the right place. Near the start or end of a page, there is simply less context to compare.

If neither a single occurrence nor the context decides, the proposal is **Multiple candidates**. Nothing is preselected and you must choose.

## Word and number boundaries

Finding the characters of a quote is not the same as finding the passage that was highlighted. `not` is also inside `cannot`, `cat` inside `concatenate`, and `41.0` inside `41.03`. When the only surviving match is a fragment of a different word or number, recommending it would be wrong.

For each end of the original selection, MarginCarry checks whether that end sat at a boundary in the old PDF, and compares it with the same end of every candidate in the new PDF.

- If the original selection ended at a boundary but the candidate continues into a longer word or number, the candidate is **doubtful**.
- If the original selection deliberately cut through a word or number, for example `cat` in `concatenate`, the longer word or number around the candidate must be the same text. The same fragment inside `category`, in `bobcat`, or standing alone is doubtful.
- Anything else follows the normal rules above.

A doubtful candidate is kept in the list with a warning and its exact position. It is never recommended, never preselected, and never added by **Select unique proposals**. Because doubtful occurrences still count as occurrences, they also cannot make another occurrence look unique. You can select a doubtful candidate manually after checking the preview, and the usual confirmation still applies.

### The boundary model

The model is small on purpose and uses only characters, not meaning.

- A word is a run of Unicode letters, combining marks, digits, and `_`. An apostrophe between two letters belongs to the word (`can't`, `can’t`).
- A number additionally includes a `.` or `,` between digits (`41.5`, `1,000`) and a sign (`-`, `−`, `+`, `±`) directly before digits, unless that sign follows another word character. `5-7` and `x-5` therefore contain no signed number.
- Hyphens, slashes, and other punctuation separate words. `well` inside `well-known` is not flagged.
- Spaces, line breaks, punctuation, symbols, and the start and end of a page are boundaries.
- Text is compared exactly. Up to 64 characters of the surrounding word are compared when a selection began or ended inside a word.

### Scripts without word delimiters

Han, Hiragana, Katakana, Thai, Lao, Khmer, Myanmar, and Tibetan text is written without spaces between words. Inside a run of those scripts MarginCarry cannot see boundaries and does not guess them, because a dictionary would turn the check into a judgement about meaning. A single occurrence in such text is still recommended as before, and its reason says that word boundaries cannot be checked. A change of script (for example Latin letters next to Han characters) is an ordinary boundary.

### What this does not catch

- A word added before or after an unchanged quote (`valid` becoming `not valid`), or a number changed elsewhere in the sentence.
- Scientific notation, units, percentages, fractions, and numbers grouped with spaces.
- Words split across lines or pages by hyphenation, such as `pa- / rameters`.
- Inflection. In languages such as Russian or German, `кот` followed by an ending (`кота`) is a different word, so it is reported as doubtful by design.
- Glued superscripts. A footnote marker attached directly to a word can make that word doubtful when the marker changes.

These checks lower the number of wrong recommendations. They do not replace looking at the preview.

## What gets written

When you confirm, MarginCarry checks that neither PDF nor any annotation has changed since the analysis. It then creates one native Zotero annotation per accepted proposal in the new PDF's attachment, all inside one database transaction:

- The type, comment, color, and text tags come from the original.
- The text is the text actually found in the new PDF.
- The position comes from the new PDF's glyph rectangles.
- The key is new. Notes that link to the original annotation continue to open the original.

If any step fails, the transaction is rolled back and nothing remains. The original annotations, both PDF files, and annotations that already existed in the new PDF are never modified.

## Journal, repeats, and Undo

A transfer is first recorded in the local journal, then written, then marked complete. If Zotero stops in between, the next start reconciles the journal with the library and stops if the state is ambiguous.

The journal blocks applying the same plan twice and copying a source annotation that was already transferred to the same PDF revision.

**Undo last transfer** checks every copy that the transfer created. If you have edited, moved, or deleted any of them, the whole undo stops with a conflict and nothing is removed. Otherwise the copies go to the Zotero Trash. Annotations that you created yourself are never touched.

## What is not supported

Annotation types other than highlights and underlines, selections spanning pages or made of separate pieces, rotated or diagonal individual glyphs, group libraries, other document formats, and library-wide processing. See the [README](../README.md#limitations).
