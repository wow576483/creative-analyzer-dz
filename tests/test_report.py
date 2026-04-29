import json
from pathlib import Path

from analyzer.adapt import build_parts_pool
from analyzer.config import Settings
from analyzer.llm import LLMClient
from analyzer.models import (
    AnalysisResult,
    AnalyzedScene,
    ProductInfo,
    SceneRole,
    SceneSlice,
    SceneTranscript,
    SceneVision,
)
from analyzer.permutation import generate_scripts
from analyzer.report import render_html, render_markdown, write_outputs


def _make_result() -> AnalysisResult:
    settings = Settings(openai_api_key=None)
    llm = LLMClient(settings)
    scenes = [
        AnalyzedScene(
            slice=SceneSlice(
                index=i, start=i * 2, end=i * 2 + 2, keyframe_path="k.jpg", audio_path="a.wav", video_path="v.mp4"
            ),
            transcript=SceneTranscript(text=f"text {i}"),
            vision=SceneVision(description=f"vis {i}"),
            role=role,
        )
        for i, role in enumerate(
            [SceneRole.HOOK, SceneRole.BODY, SceneRole.PROOF, SceneRole.CTA]
        )
    ]
    product = ProductInfo(name="ساعة ذكية", price=2900, old_price=4900)
    pool = build_parts_pool(scenes, product, llm, per_role=4)
    creatives = generate_scripts(pool, product, n=3)
    return AnalysisResult(
        product=product,
        source_video="x.mp4",
        scenes=scenes,
        creatives=creatives,
        parts_pool={role.value: parts for role, parts in pool.items()},
    )


def test_markdown_render_contains_key_sections():
    md = render_markdown(_make_result())
    assert "## 1) المشاهد" in md
    assert "## 2) أجزاء جاهزة" in md
    assert "## 3) سكريبتات كرياتيف" in md
    assert "ساعة ذكية" in md


def test_html_render_contains_scenes_and_creatives():
    html = render_html(_make_result())
    assert "<title>" in html
    assert "ساعة ذكية" in html
    assert "Hook" in html or "🪝" in html


def test_write_outputs_writes_all_files(tmp_path: Path):
    result = _make_result()
    paths = write_outputs(result, tmp_path)
    for key in ("json", "markdown", "html", "csv"):
        assert paths[key].exists()
    data = json.loads((tmp_path / "analysis.json").read_text(encoding="utf-8"))
    assert data["product"]["name"] == "ساعة ذكية"
    assert len(data["scenes"]) == 4
