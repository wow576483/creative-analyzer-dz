"""Tests for the new 7-stage prompt system helpers (ranker, hook_gen, edit_plan).

All tests use no-LLM fallbacks so they don't hit the network.
"""

from __future__ import annotations

from analyzer.config import Settings
from analyzer.edit_plan import generate_edit_plan, generate_edit_plans_for_top
from analyzer.hook_gen import generate_standalone_hooks
from analyzer.llm import LLMClient
from analyzer.models import (
    CreativePart,
    CreativeScript,
    ProductInfo,
    SceneRole,
)
from analyzer.ranker import rank_scripts


def _make_script(i: int) -> CreativeScript:
    hook = CreativePart(
        role=SceneRole.HOOK,
        text_darija="تخاف تفوتك ميساجات مهمة؟",
        on_screen_text="🔥 جديد",
        duration_seconds=3.0,
    )
    body = CreativePart(
        role=SceneRole.BODY,
        text_darija="الساعة الذكية تراقب نبضك وخطواتك كل يوم وتربطك مع هاتفك بسهولة.",
        duration_seconds=8.0,
    )
    proof = CreativePart(
        role=SceneRole.PROOF,
        text_darija="آلاف الزبائن جربوها وراضيين، ضمان 12 شهر.",
        duration_seconds=6.0,
    )
    cta = CreativePart(
        role=SceneRole.CTA,
        text_darija="اطلبها الآن بـ 2900 دج، توصيل لكل 58 ولاية، COD.",
        duration_seconds=5.0,
    )
    return CreativeScript(
        title=f"كرياتيف #{i + 1}",
        hook=hook,
        body=body,
        proof=proof,
        cta=cta,
        angle="problem-solution",
        estimated_duration_seconds=22.0,
    )


def _no_llm() -> LLMClient:
    return LLMClient(Settings(llm_provider="none", llm_api_key=None))


def test_ranker_heuristic_no_llm() -> None:
    scripts = [_make_script(i) for i in range(3)]
    llm = _no_llm()
    assert not llm.enabled
    rankings = rank_scripts(scripts, llm)
    assert len(rankings) == 3
    assert all(0 <= r.score <= 100 for r in rankings)
    # Sorted best-first
    assert all(
        rankings[i].score >= rankings[i + 1].score for i in range(len(rankings) - 1)
    )


def test_ranker_empty_list() -> None:
    assert rank_scripts([], _no_llm()) == []


def test_hook_generator_fallback() -> None:
    product = ProductInfo(name="ساعة ذكية", price=2900, old_price=4900)
    hooks = generate_standalone_hooks(product, _no_llm(), count=5)
    assert len(hooks) == 5
    assert all(h.text for h in hooks)
    assert any("ساعة" in h.text for h in hooks)


def test_edit_plan_fallback_has_all_roles() -> None:
    product = ProductInfo(name="ساعة ذكية", price=2900)
    script = _make_script(0)
    plan = generate_edit_plan(script, product, _no_llm(), index=0)
    roles = [s.role for s in plan.scenes]
    assert SceneRole.HOOK in roles
    assert SceneRole.BODY in roles
    assert SceneRole.PROOF in roles
    assert SceneRole.CTA in roles
    # Timings are monotonic
    for i in range(len(plan.scenes) - 1):
        assert plan.scenes[i].end_time <= plan.scenes[i + 1].start_time + 0.01


def test_edit_plans_for_top_respects_ranking() -> None:
    product = ProductInfo(name="P")
    scripts = [_make_script(i) for i in range(4)]
    llm = _no_llm()
    rankings = rank_scripts(scripts, llm)
    plans = generate_edit_plans_for_top(scripts, rankings, product, llm, top_n=2)
    assert len(plans) == 2
    # Plans follow ranking order
    assert plans[0].script_index == rankings[0].ad_index
    assert plans[1].script_index == rankings[1].ad_index
