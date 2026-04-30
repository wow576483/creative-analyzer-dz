"""Video Editing Plan generator (Prompt 7).

For a given ad script, produces scene-by-scene TikTok-style editing instructions
(timings, overlay text, transitions, music mood, b-roll hints).
"""

from __future__ import annotations

import json
import logging

from .algeria_kb import AdaptationContext
from .llm import LLMClient
from .models import CreativeScript, EditPlan, EditPlanScene, ProductInfo, SceneRole
from .prompts import VIDEO_EDITING_SYSTEM, VIDEO_EDITING_USER

log = logging.getLogger(__name__)


def _fallback_plan(script: CreativeScript, index: int) -> EditPlan:
    h = max(script.hook.duration_seconds, 2.0)
    b = max(script.body.duration_seconds, 6.0)
    p = max(script.proof.duration_seconds, 5.0)
    c = max(script.cta.duration_seconds, 4.0)

    t0 = 0.0
    scenes = [
        EditPlanScene(
            start_time=t0,
            end_time=t0 + h,
            role=SceneRole.HOOK,
            text_overlay=(script.hook.on_screen_text or script.hook.text_darija)[:40],
            transition="zoom_in",
            music_mood="energetic",
            b_roll_hint="close-up on product or face",
        ),
        EditPlanScene(
            start_time=t0 + h,
            end_time=t0 + h + b,
            role=SceneRole.BODY,
            text_overlay=(script.body.on_screen_text or "شوف كيفاش")[:40],
            transition="cut",
            music_mood="upbeat",
            b_roll_hint="product in use, POV",
        ),
        EditPlanScene(
            start_time=t0 + h + b,
            end_time=t0 + h + b + p,
            role=SceneRole.PROOF,
            text_overlay=(script.proof.on_screen_text or "زبائن راضيين")[:40],
            transition="fade",
            music_mood="emotional",
            b_roll_hint="UGC testimonial / before-after",
        ),
        EditPlanScene(
            start_time=t0 + h + b + p,
            end_time=t0 + h + b + p + c,
            role=SceneRole.CTA,
            text_overlay=(script.cta.on_screen_text or "اطلب الآن — COD")[:40],
            transition="flash",
            music_mood="cinematic",
            b_roll_hint="price + phone card",
        ),
    ]
    return EditPlan(script_index=index, script_title=script.title, scenes=scenes)


def generate_edit_plan(
    script: CreativeScript,
    product: ProductInfo,
    llm: LLMClient,
    index: int = 0,
) -> EditPlan:
    if not llm.enabled:
        return _fallback_plan(script, index)

    ctx = AdaptationContext(
        product_name=product.name,
        product_description=product.description,
        price_label=product.price_label,
        discount_label=product.discount_label,
        landing_phone=product.landing_phone,
        free_shipping=product.free_shipping,
    )
    script_payload = {
        "title": script.title,
        "angle": script.angle,
        "hook": script.hook.text_darija,
        "body": script.body.text_darija,
        "proof": script.proof.text_darija,
        "cta": script.cta.text_darija,
        "estimated_duration_seconds": script.estimated_duration_seconds,
    }
    user = VIDEO_EDITING_USER.format(
        script=json.dumps(script_payload, ensure_ascii=False),
        product_context=ctx.as_prompt_block(),
    )
    raw = llm.json_chat(VIDEO_EDITING_SYSTEM, user, max_tokens=1000)

    items: list = []
    if isinstance(raw, dict):
        items = raw.get("scenes") or []

    out_scenes: list[EditPlanScene] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            role_str = str(item.get("role", "body")).lower()
            try:
                role = SceneRole(role_str)
            except ValueError:
                role = SceneRole.BODY
            out_scenes.append(
                EditPlanScene(
                    start_time=float(item.get("start_time", 0) or 0),
                    end_time=float(item.get("end_time", 0) or 0),
                    role=role,
                    text_overlay=str(item.get("text_overlay", "")).strip(),
                    transition=str(item.get("transition", "cut")).strip() or "cut",
                    music_mood=str(item.get("music_mood", "energetic")).strip() or "energetic",
                    b_roll_hint=str(item.get("b_roll_hint", "")).strip(),
                )
            )
        except (TypeError, ValueError) as exc:
            log.warning("invalid edit-plan scene %s (%s)", item, exc)

    if not out_scenes:
        return _fallback_plan(script, index)

    return EditPlan(script_index=index, script_title=script.title, scenes=out_scenes)


def generate_edit_plans_for_top(
    scripts: list[CreativeScript],
    rankings,
    product: ProductInfo,
    llm: LLMClient,
    top_n: int = 3,
) -> list[EditPlan]:
    """Generate edit plans only for the top-ranked scripts (to save tokens)."""
    if not scripts:
        return []
    ordered_indexes: list[int]
    if rankings:
        ordered_indexes = [r.ad_index for r in rankings[:top_n] if 0 <= r.ad_index < len(scripts)]
    else:
        ordered_indexes = list(range(min(top_n, len(scripts))))

    plans: list[EditPlan] = []
    for idx in ordered_indexes:
        plans.append(generate_edit_plan(scripts[idx], product, llm, index=idx))
    return plans


__all__ = ["generate_edit_plan", "generate_edit_plans_for_top"]
