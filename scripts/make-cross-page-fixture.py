"""Write small disposable PDF revisions for checking selections that cross a page break.

Uses only the standard library. Every revision holds the same paragraph in Courier 12, where each
glyph is exactly 7.2 points wide, so the expected rectangles in expected.json follow from the layout
alone and are independent of the matcher: the glyph at column i of a line starts at x = 72 + 7.2 i.

  single.pdf   the marked passage on one page
  split-a.pdf  the page break after the first line of the passage
  split-b.pdf  the page break after its second line
  footer.pdf   as split-a, with a page number below the text of each page

Output goes to .local/cross-page-fixture/ (ignored by Git).
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".local/cross-page-fixture"
LEFT, WIDTH, LEADING, TOP = 72, 7.2, 18, 720

BODY = [
    "Reflow fixture for selections that cross a page break.",
    "The first sentence fills the top of the page with plain",
    "words. A carried margin note should stay attached to the",
    "exact sentence that it marks, even when a later revision",
    "moves that sentence across a page boundary. Further text",
    "follows the marked passage so that the context after it",
    "is long enough to compare with the original document.",
]
QUOTE = (
    "A carried margin note should stay attached to the exact sentence that it marks, "
    "even when a later revision moves that sentence across a page boundary."
)
FIRST, LAST = 2, 4  # body lines that hold the start and the end of the quote
START = BODY[FIRST].index("A carried")
END = BODY[LAST].index("boundary.") + len("boundary.")
assert " ".join([BODY[2][START:], BODY[3], BODY[4][:END]]) == QUOTE


def layout(breaks: list[int], footer: bool) -> list[list[tuple[str, float]]]:
    """Pages of (text, baseline); a new page starts before each body line listed in `breaks`."""
    pages: list[list[tuple[str, float]]] = [[]]
    for index, line in enumerate(BODY):
        if index in breaks:
            pages.append([])
        pages[-1].append((line, TOP - LEADING * len(pages[-1])))
    if len(pages) == 1:
        pages.append([("End of the revision that keeps the passage on one page.", TOP)])
    if footer:
        for number, page in enumerate(pages, 1):
            page.append((str(number), 40))
    return pages


def expected(pages: list[list[tuple[str, float]]]) -> dict:
    """Quote position: first page index and, per page, [x0, baseline, x1] of each quote line."""
    parts: dict[int, list[list[float]]] = {}
    for page_index, page in enumerate(pages):
        for text, baseline in page:
            if text not in BODY[FIRST : LAST + 1]:
                continue
            line = BODY.index(text)
            start = START if line == FIRST else 0
            end = END if line == LAST else len(text)
            parts.setdefault(page_index, []).append(
                [round(LEFT + WIDTH * start, 3), baseline, round(LEFT + WIDTH * end, 3)]
            )
    first = min(parts)
    return {"pageIndex": first, "lines": parts[first], "nextPageLines": parts.get(first + 1, [])}


def escape(text: str) -> bytes:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)").encode("latin-1")


def write_pdf(path: Path, pages: list[list[tuple[str, float]]]) -> None:
    objects: list[bytes] = []

    def add(body: bytes) -> int:
        objects.append(body)
        return len(objects)

    catalog = add(b"")
    tree = add(b"")
    font = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")
    kids = []
    for lines in pages:
        stream = b"BT /F1 12 Tf\n"
        for text, y in lines:
            stream += b"1 0 0 1 %d %d Tm (%s) Tj\n" % (LEFT, y, escape(text))
        stream += b"ET"
        content = add(b"<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream))
        kids.append(
            add(
                b"<< /Type /Page /Parent %d 0 R /MediaBox [0 0 612 792] "
                b"/Resources << /Font << /F1 %d 0 R >> >> /Contents %d 0 R >>"
                % (tree, font, content)
            )
        )
    objects[catalog - 1] = b"<< /Type /Catalog /Pages %d 0 R >>" % tree
    objects[tree - 1] = b"<< /Type /Pages /Kids [%s] /Count %d >>" % (
        b" ".join(b"%d 0 R" % k for k in kids),
        len(kids),
    )
    out = b"%PDF-1.4\n"
    offsets = []
    for number, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n%s\nendobj\n" % (number, body)
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % offset for offset in offsets)
    out += b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objects) + 1,
        catalog,
        xref,
    )
    path.write_bytes(out)


OUT.mkdir(parents=True, exist_ok=True)
REVISIONS = {
    "single": layout([], False),
    "split-a": layout([FIRST + 1], False),
    "split-b": layout([FIRST + 2], False),
    "footer": layout([FIRST + 1], True),
}
report = {"quote": QUOTE, "glyphWidth": WIDTH, "revisions": {}}
for name, pages in REVISIONS.items():
    write_pdf(OUT / f"{name}.pdf", pages)
    report["revisions"][name] = expected(pages)
(OUT / "expected.json").write_text(json.dumps(report, indent=2) + "\n")
print(f"Wrote {', '.join(f'{name}.pdf' for name in REVISIONS)} and expected.json to {OUT}")
