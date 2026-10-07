"""Independent PDF oracle. Does not import or execute MarginCarry's matcher or geometry code."""

import hashlib
import json
import pathlib
import unicodedata

import pdfplumber

ROOT = pathlib.Path(__file__).resolve().parents[1]


def compact(text):
    return "".join(unicodedata.normalize("NFKC", c) for c in text if not c.isspace())


def locations(pdf, quote, page_number=None):
    needle = compact(quote)
    hits = []
    for index, page in enumerate(pdf.pages):
        if page_number is not None and index + 1 != page_number:
            continue
        text, indices = "", []
        for i, char in enumerate(page.chars):
            part = compact(char["text"])
            text += part
            indices += [i] * len(part)
        offset = 0
        while needle and (at := text.find(needle, offset)) >= 0:
            selected = page.chars[indices[at] : indices[at + len(needle) - 1] + 1]
            lines = []
            current = []
            for char in selected:
                if current and (
                    abs(char["y0"] - current[-1]["y0"]) > 3
                    or char["x0"] < current[-1]["x0"] - 2
                ):
                    lines.append(current)
                    current = []
                current.append(char)
            if current:
                lines.append(current)
            rects = [
                [
                    min(c["x0"] for c in line),
                    min(c["y0"] for c in line),
                    max(c["x1"] for c in line),
                    max(c["y1"] for c in line),
                ]
                for line in lines
            ]
            hits.append(
                {
                    "pageIndex": index,
                    "rects": [[round(v, 3) for v in r] for r in rects],
                    "charStart": indices[at],
                    "charEnd": indices[at + len(needle) - 1] + 1,
                }
            )
            offset = at + 1
    return hits


selections = json.loads((ROOT / "validation/selections.json").read_text())
records, documents = [], []
for pair in ["lora", "attention"]:
    paths = [ROOT / ".local/corpus" / f"{pair}-v{v}.pdf" for v in [1, 2]]
    arxiv = "2106.09685" if pair == "lora" else "1706.03762"
    for v, path in enumerate(paths, 1):
        documents.append(
            {
                "pair": pair,
                "version": v,
                "url": f"https://arxiv.org/pdf/{arxiv}v{v}",
                "filename": path.name,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )
    with pdfplumber.open(paths[0]) as old, pdfplumber.open(paths[1]) as new:
        for i, selected in enumerate(selections[pair], 1):
            typ = selected.get("type", "underline" if i % 3 == 0 else "highlight")
            if typ == "image":
                source = {"pageIndex": selected["page"] - 1, "rects": selected["rects"]}
                targets, expected = [], "unsupported"
            else:
                sources = locations(old, selected["quote"], selected["page"])
                if not sources:
                    raise ValueError(f"Missing source {pair} {i}: {selected['quote']}")
                source = sources[0]
                targets = locations(new, selected["quote"])
                expected = "locations" if targets else "not found"
            record = {
                "id": f"{pair}-{i:02}",
                "pair": pair,
                "type": typ,
                "quote": selected["quote"],
                "source": source,
                "expected": expected,
                "targets": targets,
                "allowAlternatives": selected.get("alternatives", False),
            }
            records.append(record)
            print(
                record["id"],
                expected,
                "source page",
                source["pageIndex"] + 1,
                "target pages",
                sorted({t["pageIndex"] + 1 for t in targets}),
            )
manifest = {
    "schema": 1,
    "selectionProtocol": "Source selections.json frozen before running MarginCarry on these documents. Gold ranges computed independently from pdfplumber PDF character boxes; NFKC here only decodes PDF ligatures for the oracle, not the product matcher. All failures remain in results.",
    "oracle": {"name": "pdfplumber", "version": pdfplumber.__version__},
    "documents": documents,
    "annotations": records,
}
(ROOT / "validation/corpus.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
)
