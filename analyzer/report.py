"""Render the analysis result as Markdown / HTML / JSON / CSV."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .algeria_kb import MARKET_RULES
from .models import AnalysisResult, CreativePart, SceneRole

_TEMPLATES_DIR = Path(__file__).parent / "templates"


def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def _pool_for_template(result: AnalysisResult) -> dict[SceneRole, list[CreativePart]]:
    raw = result.parts_pool or {}
    out: dict[SceneRole, list[CreativePart]] = {}
    role_order = [SceneRole.HOOK, SceneRole.BODY, SceneRole.PROOF, SceneRole.CTA]
    for role in role_order:
        parts = raw.get(role.value) or []
        out[role] = list(parts)
    return out


def render_markdown(result: AnalysisResult) -> str:
    env = _env()
    tpl = env.get_template("report.md.j2")
    return tpl.render(
        result=result,
        pool=_pool_for_template(result),
        market_rules=MARKET_RULES,
    )


def render_html(result: AnalysisResult) -> str:
    env = _env()
    tpl = env.get_template("report.html.j2")
    return tpl.render(
        result=result,
        pool=_pool_for_template(result),
        market_rules=MARKET_RULES,
    )


def write_outputs(result: AnalysisResult, out_dir: Path) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)

    # JSON
    json_path = out_dir / "analysis.json"
    json_path.write_text(
        json.dumps(json.loads(result.model_dump_json()), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Markdown + HTML reports
    md_path = out_dir / "report.md"
    md_path.write_text(render_markdown(result), encoding="utf-8")

    html_path = out_dir / "report.html"
    html_path.write_text(render_html(result), encoding="utf-8")

    # CSV: one row per creative, easy to copy into a spreadsheet.
    csv_path = out_dir / "creatives.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "title",
                "angle",
                "duration_s",
                "hook",
                "body",
                "proof",
                "cta",
                "hook_on_screen",
                "cta_on_screen",
            ]
        )
        for c in result.creatives:
            w.writerow(
                [
                    c.title,
                    c.angle,
                    c.estimated_duration_seconds,
                    c.hook.text_darija,
                    c.body.text_darija,
                    c.proof.text_darija,
                    c.cta.text_darija,
                    c.hook.on_screen_text,
                    c.cta.on_screen_text,
                ]
            )

    return {
        "json": json_path,
        "markdown": md_path,
        "html": html_path,
        "csv": csv_path,
    }
