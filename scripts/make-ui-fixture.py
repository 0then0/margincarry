"""Write two small disposable PDF revisions for checking the dialog in every language.

Uses only the standard library. The old revision has one quote for each kind of outcome; the new
revision changes them so that the dialog shows a unique, a doubtful, an ambiguous, and a missing
proposal. Output goes to .local/ui-fixture/ (ignored by Git).
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".local/ui-fixture"

LONG = "A longer passage that is highlighted to show how a long source quote wraps in the list"
OLD = [
    ("MarginCarry interface fixture", 720),
    ("the quick brown fox jumps", 690),
    ("41.0", 660),
    ("not", 630),
    ("cat", 600),
    ("A repeated quote", 570),
    ("This sentence disappears in the new revision", 540),
    (LONG, 510),
]
NEW = [
    [
        ("MarginCarry interface fixture", 720),
        ("the quick brown fox jumps", 690),
        ("41.03 mm", 660),
        ("cannot", 630),
        ("concatenate", 600),
        ("A repeated quote", 570),
        ("A repeated quote", 540),
        (LONG, 510),
    ],
    [("A repeated quote on the second page", 720)],
]


def escape(text: str) -> bytes:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)").encode("latin-1")


def write_pdf(path: Path, pages: list[list[tuple[str, int]]]) -> None:
    objects: list[bytes] = []

    def add(body: bytes) -> int:
        objects.append(body)
        return len(objects)

    catalog = add(b"")
    tree = add(b"")
    font = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    kids = []
    for lines in pages:
        stream = b"BT /F1 12 Tf\n"
        for text, y in lines:
            stream += b"1 0 0 1 72 %d Tm (%s) Tj\n" % (y, escape(text))
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
write_pdf(OUT / "old.pdf", [OLD])
write_pdf(OUT / "new.pdf", NEW)
print(f"Wrote {OUT / 'old.pdf'} and {OUT / 'new.pdf'}")
