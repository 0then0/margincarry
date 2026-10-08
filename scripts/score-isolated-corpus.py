"""Run the unchanged 2-point scorer on a separate host report, preserving history."""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
report_dir = Path(sys.argv[1]).resolve()
with tempfile.TemporaryDirectory(prefix="margincarry-score-") as temporary:
    scratch = Path(temporary)
    (scratch / "scripts").mkdir()
    (scratch / "validation").mkdir()
    shutil.copyfile(root / "scripts/score-corpus.py", scratch / "scripts/score-corpus.py")
    shutil.copyfile(root / "validation/corpus.json", scratch / "validation/corpus.json")
    shutil.copyfile(report_dir / "corpus-results.json", scratch / "validation/corpus-results.json")
    subprocess.run([sys.executable, str(scratch / "scripts/score-corpus.py")], check=True)
    shutil.copyfile(scratch / "validation/corpus-score.json", report_dir / "corpus-score.json")
