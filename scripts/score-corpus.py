"""Compare host proposals to the independent, frozen PDF oracle; retain every source case."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
gold = json.loads((ROOT / "validation/corpus.json").read_text())
results = json.loads((ROOT / "validation/corpus-results.json").read_text())


def same_location(candidate, target):
    p = candidate.get("position")
    return bool(
        p
        and p["pageIndex"] == target["pageIndex"]
        and len(p["rects"]) == len(target["rects"])
        and all(
            abs(a - b) <= 2
            for r, s in zip(p["rects"], target["rects"])
            for a, b in zip(r, s)
        )
    )


scores = []
for record in gold["annotations"]:
    actual = next(r for r in results["results"] if r["id"] == record["id"])
    valid = [c for c in actual["candidates"] if c["position"]]
    correct = [c for c in valid if any(same_location(c, t) for t in record["targets"])]
    wrong = [c["id"] for c in valid if c not in correct]
    recommended = next((c for c in valid if c["id"] == actual["recommendedID"]), None)
    scores.append(
        {
            "id": record["id"],
            "pair": record["pair"],
            "expected": record["expected"],
            "actual": actual["status"],
            "expectedLocations": len(record["targets"]),
            "proposedLocations": len(valid),
            "correctLocations": len(correct),
            "wrongLocations": wrong,
            "wrongRecommendation": bool(recommended and recommended not in correct),
            "missedExpectedLocations": sum(
                not any(same_location(c, t) for c in correct) for t in record["targets"]
            ),
            "hasCorrectProposal": bool(correct),
            "negativeCorrect": record["expected"] in ["not found", "unsupported"]
            and actual["status"] == record["expected"],
        }
    )
summary = {}
for pair in ["lora", "attention"]:
    rows = [r for r in scores if r["pair"] == pair]
    summary[pair] = {
        "sourceAnnotations": len(rows),
        "unique": sum(r["actual"] == "unique candidate" for r in rows),
        "multiple": sum(r["actual"] == "multiple candidates" for r in rows),
        "notFound": sum(r["actual"] == "not found" for r in rows),
        "unsupported": sum(r["actual"] == "unsupported" for r in rows),
        "processingErrors": sum(r["actual"] == "processing error" for r in rows),
        "withAlternatives": sum(r["proposedLocations"] > 1 for r in rows),
        "withCorrectProposal": sum(r["hasCorrectProposal"] for r in rows),
        "wrongProposedLocations": sum(len(r["wrongLocations"]) for r in rows),
        "wrongRecommendations": sum(r["wrongRecommendation"] for r in rows),
        "positiveCasesWithoutCorrectProposal": sum(
            r["expected"] == "locations" and not r["hasCorrectProposal"] for r in rows
        ),
        "notTransferred": sum(
            r["actual"] in ["not found", "unsupported", "processing error"]
            for r in rows
        ),
    }
report = {
    "geometryTolerancePDFPoints": 2,
    "notes": "Expected locations use independent pdfplumber character boxes. Native inline rectangles use font metrics, so corners are compared within 2 PDF points. This is an automated oracle comparison, not a substitute for visual UI review. All 32 cases are included. No results were removed.",
    "summary": summary,
    "cases": scores,
}
(ROOT / "validation/corpus-score.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n"
)
print(json.dumps(summary, indent=2))
for r in scores:
    if r["wrongLocations"] or r["missedExpectedLocations"]:
        print("MISMATCH", r)
