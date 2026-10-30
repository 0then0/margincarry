"""Write old and new PDF revisions in each supported language for checking real text extraction.

Needs Google Chrome (or set CHROME to a Chromium binary) to print HTML to PDF with embedded fonts;
nothing else beyond the standard library. Output goes to .local/language-fixtures/ (ignored by Git).
Each language gets old.pdf, new.pdf and cases.json with one quote per case and the expected outcome.
"""

from __future__ import annotations

import html
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".local/language-fixtures"
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)

# Per language: old paragraphs, new paragraphs, and cases (quote, expected status, note).
# Expected outcomes follow docs/how-it-works.md: "unique", "doubtful", "multiple", "not found".
LANGUAGES = {
    "ru": {
        "intro": "Новая редакция: добавлено вступление, абзацы переставлены.",
        "old": [
            "Результаты были тщательно проверены и подтверждены повторным анализом.",
            "Измеренное значение составляет 41,0 процента.",
            "В углу комнаты сидел кот и смотрел в окно.",
            "Это предложение полностью исчезнет в новой редакции.",
            "Дорога ведёт через мост и дальше по долине до города на севере страны, где всё спокойно.",
            "Всё это было хорошо известно заранее.",
        ],
        "new": [
            "Результаты были тщательно проверены и подтверждены повторным анализом.",
            "Измеренное значение составляет 41,03 процента.",
            "В углу комнаты стоял котёл и грелся на огне.",
            "Дорога ведёт через мост и дальше по долине до города на севере страны, где всё спокойно.",
            "Все это было хорошо известно заранее.",
        ],
        "cases": [
            ("Результаты были тщательно проверены и подтверждены повторным анализом.", "unique", "moved paragraph"),
            ("41,0", "doubtful", "decimal comma extended"),
            ("кот", "doubtful", "word inside a longer word"),
            ("Это предложение полностью исчезнет в новой редакции.", "not found", "removed sentence"),
            ("через мост и дальше по долине до города на севере", "unique", "re-wrapped passage"),
            ("Всё это", "not found", "ё changed to е"),
        ],
    },
    "es": {
        "intro": "Nueva edición: se añadió una introducción y se reordenaron los párrafos.",
        "old": [
            "Los resultados se comprobaron con cuidado y se confirmaron con un segundo análisis.",
            "El valor medido es del 41,0 por ciento.",
            "La casa roja está junto al río, más allá del puente.",
            "Esta frase desaparecerá por completo en la edición nueva.",
            "El camino cruza el puente y sigue por el valle hasta la ciudad del norte del país, donde reina la calma.",
            "¿Qué hora es? También llegó el año pasado.",
        ],
        "new": [
            "Los resultados se comprobaron con cuidado y se confirmaron con un segundo análisis.",
            "El valor medido es del 41,03 por ciento.",
            "Las casas rojas están junto al río, más allá del puente.",
            "El camino cruza el puente y sigue por el valle hasta la ciudad del norte del país, donde reina la calma.",
            "¿Qué hora es? Tambien llegó el año pasado.",
        ],
        "cases": [
            ("Los resultados se comprobaron con cuidado y se confirmaron con un segundo análisis.", "unique", "moved paragraph"),
            ("41,0", "doubtful", "decimal comma extended"),
            ("casa", "doubtful", "singular inside plural"),
            ("Esta frase desaparecerá por completo en la edición nueva.", "not found", "removed sentence"),
            ("cruza el puente y sigue por el valle hasta la ciudad del norte", "unique", "re-wrapped passage"),
            ("¿Qué hora es?", "unique", "inverted question mark"),
            ("También", "not found", "accent dropped"),
        ],
    },
    "de": {
        "intro": "Neue Fassung: Einleitung ergänzt, Absätze umgestellt.",
        "old": [
            "Die Ergebnisse wurden sorgfältig geprüft und durch eine zweite Analyse bestätigt.",
            "Der gemessene Wert beträgt 41,0 Prozent.",
            "Das Haus liegt direkt am Fluss, hinter der Brücke.",
            "Dieser Satz entfällt in der neuen Fassung vollständig.",
            "Die Straße führt über die Brücke und weiter durch das Tal bis zur Stadt im Norden des Landes, wo es still ist.",
            "Die Donaudampfschifffahrt ist für viele Gäste ein großes Erlebnis.",
            "Die Straßenverkehrsordnung gilt für alle Verkehrsteilnehmer.",
        ],
        "new": [
            "Die Ergebnisse wurden sorgfältig geprüft und durch eine zweite Analyse bestätigt.",
            "Der gemessene Wert beträgt 41,03 Prozent.",
            "Das Hausaufgabenheft liegt direkt am Fluss, hinter der Brücke.",
            "Die Straße führt über die Brücke und weiter durch das Tal bis zur Stadt im Norden des Landes, wo es still ist.",
            "Die Donaudampfschifffahrt ist für viele Gäste ein großes Erlebnis.",
            "Die Straßenverkehrsordnung gilt für alle Verkehrsteilnehmer.",
        ],
        "cases": [
            ("Die Ergebnisse wurden sorgfältig geprüft und durch eine zweite Analyse bestätigt.", "unique", "moved paragraph"),
            ("41,0", "doubtful", "decimal comma extended"),
            ("Haus", "doubtful", "word inside a compound"),
            ("Dieser Satz entfällt in der neuen Fassung vollständig.", "not found", "removed sentence"),
            ("über die Brücke und weiter durch das Tal bis zur Stadt", "unique", "re-wrapped passage"),
            ("dampf", "unique", "deliberate partial selection of a compound, unchanged"),
            ("Straßenverkehrsordnung", "unique", "long compound, unchanged"),
        ],
    },
    "fr": {
        "intro": "Nouvelle édition : introduction ajoutée, paragraphes réordonnés.",
        "old": [
            "Les résultats ont été vérifiés avec soin et confirmés par une seconde analyse.",
            "La valeur mesurée est de 41,0 pour cent.",
            "Un homme sage regardait la rivière, au-delà du pont.",
            "Cette phrase disparaît complètement dans la nouvelle édition.",
            "La route traverse le pont et continue dans la vallée jusqu’à la ville du nord du pays, où règne le calme.",
            "Aujourd’hui, l’histoire de la ville est bien connue : « bonjour », dit-il.",
        ],
        "new": [
            "Les résultats ont été vérifiés avec soin et confirmés par une seconde analyse.",
            "La valeur mesurée est de 41,03 pour cent.",
            "Des hommes sages regardaient la rivière, au-delà du pont.",
            "La route traverse le pont et continue dans la vallée jusqu’à la ville du nord du pays, où règne le calme.",
            "Aujourd’hui, l’histoire de la ville est bien connue : « bonjour », dit-il.",
        ],
        "cases": [
            ("Les résultats ont été vérifiés avec soin et confirmés par une seconde analyse.", "unique", "moved paragraph"),
            ("41,0", "doubtful", "decimal comma extended"),
            ("homme", "doubtful", "singular inside plural"),
            ("Cette phrase disparaît complètement dans la nouvelle édition.", "not found", "removed sentence"),
            ("traverse le pont et continue dans la vallée jusqu’à la ville du nord", "unique", "re-wrapped passage"),
            ("histoire", "unique", "elision with typographic apostrophe, unchanged"),
            ("bonjour", "unique", "guillemets"),
        ],
    },
    "ja": {
        "intro": "新しい版：前書きを追加し、段落を並べ替えました。",
        "old": [
            "結果は慎重に確認され、二度目の分析でも裏付けられました。",
            "測定値は41.0パーセントです。",
            "部屋の隅で猫が窓の外を眺めていました。",
            "この文は新しい版では完全に削除されます。",
            "道は橋を渡り、谷を抜けて、国の北にある静かな町まで続いています。",
            "コンピューターはPythonで制御されています。",
        ],
        "new": [
            "結果は慎重に確認され、二度目の分析でも裏付けられました。",
            "測定値は41.03パーセントです。",
            "部屋の隅で子猫が窓の外を眺めていました。",
            "道は橋を渡り、谷を抜けて、国の北にある静かな町まで続いています。",
            "コンピューターはPythonで制御されています。",
        ],
        "cases": [
            ("結果は慎重に確認され、二度目の分析でも裏付けられました。", "unique", "moved paragraph"),
            ("41.0", "doubtful", "decimal extended"),
            ("猫", "unique", "no word delimiters: not guessed, disclosed"),
            ("この文は新しい版では完全に削除されます。", "not found", "removed sentence"),
            ("橋を渡り、谷を抜けて、国の北にある静かな町", "unique", "re-wrapped passage"),
            ("コンピューター", "unique", "katakana long vowel mark"),
            ("Python", "unique", "Latin word between kana"),
        ],
    },
    "pt-BR": {
        "intro": "Nova edição: introdução adicionada e parágrafos reordenados.",
        "old": [
            "Os resultados foram verificados com cuidado e confirmados por uma segunda análise.",
            "O valor medido é de 41,0 por cento.",
            "O livro azul está sobre a mesa, perto da janela.",
            "Esta frase desaparece por completo na edição nova.",
            "A estrada atravessa a ponte e segue pelo vale até a cidade ao norte do país, onde reina a calma.",
            "A ação rápida não é a solução, mas o guarda-chuva ajuda.",
        ],
        "new": [
            "Os resultados foram verificados com cuidado e confirmados por uma segunda análise.",
            "O valor medido é de 41,03 por cento.",
            "Os livros azuis estão sobre a mesa, perto da janela.",
            "A estrada atravessa a ponte e segue pelo vale até a cidade ao norte do país, onde reina a calma.",
            "As ações rápidas não são a solução, mas o guarda-chuva ajuda.",
        ],
        "cases": [
            ("Os resultados foram verificados com cuidado e confirmados por uma segunda análise.", "unique", "moved paragraph"),
            ("41,0", "doubtful", "decimal comma extended"),
            ("livro", "doubtful", "singular inside plural"),
            ("Esta frase desaparece por completo na edição nova.", "not found", "removed sentence"),
            ("atravessa a ponte e segue pelo vale até a cidade ao norte", "unique", "re-wrapped passage"),
            ("ação", "not found", "inflected form differs"),
            ("guarda-chuva", "unique", "hyphenated compound"),
        ],
    },
}


# A long word that the new revision breaks across lines at a soft hyphen (narrow column). The old
# revision keeps it whole. Chrome does not put the break hyphen into the text layer, so these words
# still match; a PDF whose text layer keeps the hyphen behaves differently (see docs/how-it-works.md).
HYPHENATION = {
    "de": ("Das Wort Geschwindigkeitsbegrenzung steht hier.", "Das Wort Geschwindigkeits\u00adbegrenzung steht hier.", "Geschwindigkeitsbegrenzung"),
    "fr": ("Le mot anticonstitutionnellement est long.", "Le mot anti\u00adconstitution\u00adnellement est long.", "anticonstitutionnellement"),
    "es": ("La palabra electroencefalografista es larga.", "La palabra electro\u00adencefalo\u00adgrafista es larga.", "electroencefalografista"),
    "pt-BR": ("A palavra inconstitucionalissimamente é longa.", "A palavra inconstitu\u00adcionalissi\u00admamente é longa.", "inconstitucionalissimamente"),
}


def page(lang: str, paragraphs: list[str], width_px: int, narrow: str | None = None) -> str:
    body = "\n".join(f"<p>{html.escape(p)}</p>" for p in paragraphs)
    if narrow:
        body += f'\n<p style="width: 110px">{html.escape(narrow)}</p>'
    return f"""<!doctype html>
<html lang="{lang}"><meta charset="utf-8"><title>MarginCarry {lang}</title>
<style>
@page {{ size: A4; margin: 24mm 20mm; }}
body {{ font: 15px/1.7 "Helvetica Neue", Arial, "Hiragino Sans", sans-serif; width: {width_px}px; }}
p {{ margin: 0 0 20px; }}
</style>
{body}
</html>
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for lang, spec in LANGUAGES.items():
        folder = OUT / lang
        folder.mkdir(exist_ok=True)
        # The new revision is narrower and starts with an extra paragraph, so lines re-wrap.
        revisions = {
            "old": page(lang, [*spec["old"], *([HYPHENATION[lang][0]] if lang in HYPHENATION else [])], 640),
            "new": page(
                lang,
                [spec["intro"], *spec["new"]],
                420,
                HYPHENATION[lang][1] if lang in HYPHENATION else None,
            ),
        }
        for name, document in revisions.items():
            source = folder / f"{name}.html"
            source.write_text(document, encoding="utf-8")
            subprocess.run(
                [
                    CHROME,
                    "--headless=new",
                    "--disable-gpu",
                    "--no-pdf-header-footer",
                    f"--print-to-pdf={folder / (name + '.pdf')}",
                    source.as_uri(),
                ],
                check=True,
                capture_output=True,
            )
        cases = list(spec["cases"])
        if lang in HYPHENATION:
            cases.append((HYPHENATION[lang][2], "unique", "word broken across lines; the break hyphen is not in the text layer"))
        (folder / "cases.json").write_text(
            json.dumps(
                [{"quote": q, "expected": e, "note": n} for q, e, n in cases],
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"{lang}: {folder}")


main()
