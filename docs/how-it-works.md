# How MarginCarry works

This page explains what MarginCarry decides for you, what it leaves to you, and where its rules stop. Technical internals are in the [architecture notes](architecture.md).

## The workflow in one paragraph

MarginCarry reads the text and the glyph positions of both PDFs through Zotero's own PDF reader. For each highlight or underline in the old PDF, it works out which text the selection covered, searches for exactly that text on every page of the new PDF and across every pair of adjacent pages, and turns each match back into rectangles on the page. You compare the two locations visually, accept the ones you want, and confirm. Only then does it create new annotations.

## What is matched

Matching is deliberately literal. Only two differences between the old quote and the new text are ignored:

- Unicode composition. `é` written as one character matches `e` followed by a combining accent.
- Whitespace. Line breaks, repeated spaces, and tabs all count as one space, so a passage that was re-flowed onto different lines still matches.

Everything else is significant: upper and lower case, accents, punctuation, hyphens and dashes, and numbers. `41.0` does not match `41.2`, `TRUE` does not match `true`, and `not valid` does not match `valid`. There is no fuzzy matching, no case folding, no spelling correction, no translation, and no OCR.

A match must also end on whole PDF glyphs. A ligature such as `fi` is one glyph, so a quote that would end in the middle of it is rejected rather than highlighted as if it had matched. The same applies to a match that would silently pick up an extra combining mark or an emoji joiner.

The old page number is not evidence. A paragraph that moved from page 3 to page 8 is found like any other.

A quote must be found on a single page of the new PDF or across two adjacent pages, as described next.

## Passages across a page break

After a revision is typeset again, an unchanged paragraph can end up divided by a page break, or a divided paragraph can end up on one page. MarginCarry handles a selection on one page or on two adjacent pages, in the old PDF and in the new one: one page to two, two to one, and two to two. Longer selections are not supported.

Zotero stores such a selection as one annotation with rectangles for the first page and separate rectangles for the next page, and joins the text of the two parts with one space. MarginCarry follows that model exactly:

- **The page break is one space of the quote.** It is treated like a line break. No other space is added or removed, so `alpha beta` on one page matches `alpha` at the end of a page followed by `beta` at the start of the next, while `alphabeta` does not.
- **The selection must be continuous.** Its first part has to reach the last text of its page and its second part has to begin with the first text of the next page, in the order in which the PDF stores the text. This is checked for the original annotation and for every candidate.
- **Text between the two parts is not removed.** If the PDF's text has a header, footer, or page number between the end of the passage on one page and its continuation on the next, the passage is not treated as continuous. When the quote is found nowhere else, such a place is listed with that reason, without a position, and cannot be accepted. It is not listed next to a real occurrence, because ordinary lines of text can lie between two matching halves just as a footer can. A source annotation whose own rectangles cover a page number contains that number in its text, and it is matched like any other character.
- **One exception follows the reader.** Zotero's reader marks some text outside a document's content area as isolated and leaves it out of a selection that crosses pages. MarginCarry skips only such marked text, only at the page edge, and only when it lies on other lines than the selected text. The reader makes these marks on some pages only, so page numbers usually count as text.
- **A line-end hyphen at the break is ambiguous.** Within a page the reader joins a hyphenated word; across pages it separates the two parts. MarginCarry does not choose, and such a passage is not transferred.
- **Each page keeps its own rectangles.** Coordinates of two pages are never merged, whole glyphs are required on both pages, and both parts together must fit Zotero's size limit for a position.

Context and the word and number boundary check below apply to the outer ends of the whole passage: the text before its first part and after its last part. The page break inside it is not a boundary.

The page label and the sort position of the new annotation come from its first page, as for an annotation that the reader creates.

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
- Words split across lines by hyphenation. If the PDF's text layer leaves the break hyphen out, which is common, the word matches like any other, and this was checked in German, Spanish, French, and Portuguese. If the text layer keeps the hyphen, as in the recorded `pa- / rameters` case, the hyphen belongs to the text and the rectangle can differ from an independent measurement.
- Inflection. In languages such as Russian or German, `кот` followed by an ending (`кота`) is a different word, so it is reported as doubtful by design.
- Glued superscripts. A footnote marker attached directly to a word can make that word doubtful when the marker changes.

These checks lower the number of wrong recommendations. They do not replace looking at the preview.

## Languages

MarginCarry matches text in any language, and it has been checked on real PDFs in English, Russian, Spanish, German, French, Japanese, and Brazilian Portuguese (see [Validation](validation.md)). What that means in practice:

- Accents and umlauts match whether the PDF stores them as one character or as a letter followed by a combining mark. Different letters never match: `ё` and `е`, `ß` and `ss`, `ñ` and `n`, or `ação` and `ações`.
- Decimal commas and thousands separators are part of a number, so `41,0` inside `41,03` and `1.000` inside `1.0005` are doubtful.
- Typographic apostrophes and quotation marks (`’`, `« »`, `„ “`, `「 」`) and the no-break spaces that French typography puts before `:` and inside guillemets are handled like ordinary punctuation and spaces.
- An apostrophe between letters joins them into one word, as in `can't` and `l’histoire`. A quote that was highlighted whole in the old PDF and appears only after an elided article in the new one is therefore doubtful.
- Inflected and compound words are compared as written. `casa` inside `casas`, `Haus` inside `Hausaufgabenheft`, and `кот` inside `котёл` are doubtful.
- Japanese is written without spaces between words. Boundaries between ideographs and kana are not guessed. Latin letters and digits next to them are separate words, and full-width digits and letters count as digits and letters.

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

Annotation types other than highlights and underlines, selections longer than two adjacent pages or made of separate pieces, passages across a page break with other text between their parts, rotated or diagonal individual glyphs, group libraries, other document formats, and library-wide processing. See the [README](../README.md#limitations).
