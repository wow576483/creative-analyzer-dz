from analyzer.adapt import build_parts_pool
from analyzer.config import Settings
from analyzer.llm import LLMClient
from analyzer.models import (
    AnalyzedScene,
    ProductInfo,
    SceneRole,
    SceneSlice,
    SceneTranscript,
    SceneVision,
)


def _scene(i: int, role: SceneRole) -> AnalyzedScene:
    return AnalyzedScene(
        slice=SceneSlice(
            index=i, start=i, end=i + 2, keyframe_path="k", audio_path="a", video_path="v"
        ),
        transcript=SceneTranscript(text=""),
        vision=SceneVision(),
        role=role,
    )


def test_fallback_pool_without_llm():
    settings = Settings(openai_api_key=None)
    llm = LLMClient(settings)
    assert not llm.enabled

    scenes = [
        _scene(0, SceneRole.HOOK),
        _scene(1, SceneRole.BODY),
        _scene(2, SceneRole.PROOF),
        _scene(3, SceneRole.CTA),
    ]
    product = ProductInfo(name="ساعة ذكية", price=2900, old_price=4900, landing_phone="0555121212")

    pool = build_parts_pool(scenes, product, llm, per_role=5)
    for role in (SceneRole.HOOK, SceneRole.BODY, SceneRole.PROOF, SceneRole.CTA):
        assert role in pool
        assert len(pool[role]) >= 4  # at least 4 deterministic templates
        for part in pool[role]:
            assert part.role == role
            assert part.text_darija.strip()
            assert part.duration_seconds > 0
