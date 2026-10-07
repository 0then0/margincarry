"""Create owned, disposable PDF fixtures. Public papers are downloaded separately."""

from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".local/fixtures"
OUT.mkdir(parents=True, exist_ok=True)
for name, new in [("old", False), ("new", True)]:
    c = canvas.Canvas(str(OUT / (name + ".pdf")), pagesize=(612, 792), invariant=True)
    c.setFont("Helvetica", 12)
    if new:
        c.drawString(72, 720, "An inserted page before the original passage.")
        c.showPage()
        c.setFont("Helvetica", 12)
    c.drawString(72, 720, "MarginCarry integration fixture")
    c.drawString(72, 680, "The selected passage moves to a new page.")
    c.drawString(72, 660, "It keeps its comment, color and text tags.")
    c.drawString(72, 610, "A repeated quote appears in the introduction.")
    c.drawString(72, 560, "A repeated quote appears in the conclusion.")
    c.showPage()
    c.save()
writer = PdfWriter()
p = PdfReader(OUT / "old.pdf").pages[0]
p.cropbox.lower_left = (40, 40)
p.cropbox.upper_right = (500, 750)
p.rotate(90)
writer.add_page(p)
with (OUT / "rotated.pdf").open("wb") as f:
    writer.write(f)
c = canvas.Canvas(str(OUT / "columns.pdf"), pagesize=(612, 792), invariant=True)
c.setFont("Helvetica", 12)
c.drawString(72, 720, "Column left line one")
c.drawString(72, 700, "continues below.")
c.drawString(350, 720, "Column right line one")
c.drawString(350, 700, "different passage.")
c.showPage()
c.save()
c = canvas.Canvas(str(OUT / "no-text.pdf"), pagesize=(612, 792), invariant=True)
c.rect(72, 72, 300, 500)
c.showPage()
c.save()

c=canvas.Canvas(str(OUT/'repeated.pdf'),pagesize=(612,792),invariant=True)
c.setFont('Helvetica',12)
c.drawString(72,720,'A repeated quote appears here.')
c.drawString(72,600,'A repeated quote appears here.')
c.showPage()
c.save()
