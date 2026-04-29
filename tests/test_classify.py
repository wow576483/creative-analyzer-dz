from analyzer.classify import _heuristic_role, normalize_text
from analyzer.models import SceneRole, SceneSlice, SceneTranscript, SceneVision


def _slice(i: int, start: float, end: float) -> SceneSlice:
    return SceneSlice(index=i, start=start, end=end, keyframe_path="k", audio_path="a", video_path="v")


def test_first_scene_is_hook_by_default():
    role, _, _ = _heuristic_role(_slice(0, 0, 2.0), SceneTranscript(text=""), SceneVision(), 5)
    assert role == SceneRole.HOOK


def test_last_scene_is_cta_by_default():
    role, _, _ = _heuristic_role(_slice(4, 18, 22), SceneTranscript(text=""), SceneVision(), 5)
    assert role == SceneRole.CTA


def test_proof_keyword_detected():
    role, _, _ = _heuristic_role(
        _slice(2, 8, 12),
        SceneTranscript(text="ضمان 6 أشهر وإذا ما عجبتكش نرجعولك دراهمك"),
        SceneVision(),
        5,
    )
    assert role == SceneRole.PROOF


def test_cta_keyword_detected():
    role, _, _ = _heuristic_role(
        _slice(2, 8, 12),
        SceneTranscript(text="اطلبها دروك واتساب 0555"),
        SceneVision(),
        5,
    )
    assert role == SceneRole.CTA


def test_normalize_text_strips_punctuation():
    assert normalize_text("Hello, World!!!") == "hello  world"
