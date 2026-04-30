"""Adapt analyzed scenes into Algerian-darija creative parts.

For each Hook/Body/Proof/CTA scene we generate ``N`` darija alternatives.
Two backends:

- LLM-powered (preferred): uses GPT-4o-mini with the darija style guide
  + Algerian market rules from ``algeria_kb``.
- Template fallback: deterministic, derives copy from the Algeria KB
  archetypes when no API key is available.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterable

from .algeria_kb import (
    BODY_ANGLES,
    CTA_PATTERNS,
    HOOK_ARCHETYPES,
    PATTERNS_BY_ROLE,
    PROOF_PATTERNS,
    AdaptationContext,
)
from .llm import LLMClient
from .models import AnalyzedScene, CreativePart, ProductInfo, SceneRole
from .prompts import (
    ALGERIA_ADAPTATION_SYSTEM,
    ALGERIA_ADAPTATION_USER,
    ROLE_GOALS,
)

log = logging.getLogger(__name__)


def build_context(product: ProductInfo) -> AdaptationContext:
    return AdaptationContext(
        product_name=product.name,
        product_description=product.description,
        price_label=product.price_label,
        discount_label=product.discount_label,
        landing_phone=product.landing_phone,
        free_shipping=product.free_shipping,
    )


# ---------------------------------------------------------------------------
# Template fallback
# ---------------------------------------------------------------------------


def _template_part(role: SceneRole, ctx: AdaptationContext, archetype: dict[str, str]) -> CreativePart:
    name = archetype.get("name", role.value)
    template = archetype.get("darija_template", "")

    fillers = {
        "product": ctx.product_name,
        "problem": "نتيجة بطيئة",
        "shocking_fact": f"{ctx.product_name} باعت آلاف القطع في الجزائر",
        "count": "10,000",
        "daily_pain": "ما تلقاش الحل المناسب",
        "feature": "تصميم عملي",
        "benefit": "تربح وقت",
        "time": "ثانية",
        "old_way": "الطريقة القديمة",
        "persona": "صديقتي مريم من وهران",
        "result_in_dz": "تبدّل كلّش",
        "duration": "أسبوع",
        "months": "12",
        "stars": "4.8",
        "phone": ctx.landing_phone or "0555 12 34 56",
        "qty": "20",
        "price": ctx.price_label or "—",
        "old_price": "السعر السابق",
    }

    text = template
    try:
        text = template.format(**fillers)
    except (KeyError, IndexError):
        text = template

    on_screen = {
        SceneRole.HOOK: "🔥 جديد في الجزائر",
        SceneRole.BODY: "كيف يخدم؟",
        SceneRole.PROOF: "ضمان + COD",
        SceneRole.CTA: "اطلب الآن • الدفع عند الاستلام",
        SceneRole.TRANSITION: "",
    }[role]

    visual_direction = {
        SceneRole.HOOK: "لقطة قريبة على المنتج + نص على الشاشة، إيقاع سريع، أول ثانيتين حاسمتان.",
        SceneRole.BODY: "عرض المنتج وهو يحلّ المشكلة، تصوير POV/اليد، إضاءة طبيعية.",
        SceneRole.PROOF: "فيديو UGC أو قبل/بعد، رقم زبائن أو شهادة + ختم ضمان.",
        SceneRole.CTA: "بطاقة نهائية: السعر القديم مشطوب + السعر الجديد + رقم الهاتف/الموقع + COD + 58 ولاية.",
        SceneRole.TRANSITION: "انتقال قصير.",
    }[role]

    duration = {
        SceneRole.HOOK: 3.0,
        SceneRole.BODY: 8.0,
        SceneRole.PROOF: 6.0,
        SceneRole.CTA: 5.0,
        SceneRole.TRANSITION: 1.0,
    }[role]

    return CreativePart(
        role=role,
        text_darija=text,
        on_screen_text=on_screen,
        visual_direction=f"({name}) {visual_direction}",
        duration_seconds=duration,
    )


def _template_pool(
    role: SceneRole, ctx: AdaptationContext, archetypes: list[dict[str, str]], count: int
) -> list[CreativePart]:
    out: list[CreativePart] = []
    for arche in archetypes[:count]:
        out.append(_template_part(role, ctx, arche))
    return out


# ---------------------------------------------------------------------------
# LLM path
# ---------------------------------------------------------------------------

def _llm_pool(
    role: SceneRole,
    ctx: AdaptationContext,
    scenes: list[AnalyzedScene],
    llm: LLMClient,
    count: int,
) -> list[CreativePart]:
    if not llm.enabled:
        return []

    scene_payload = [
        {
            "index": s.slice.index,
            "transcript": s.transcript.text,
            "visual": s.vision.description,
            "on_screen_text": s.vision.on_screen_text,
            "emotion": s.vision.emotion,
            "marketing_intent": s.vision.marketing_intent,
        }
        for s in scenes
    ]

    system = ALGERIA_ADAPTATION_SYSTEM
    user = ALGERIA_ADAPTATION_USER.format(
        product_context=ctx.as_prompt_block(),
        role=role.value,
        role_goal=ROLE_GOALS.get(role.value, ""),
        scenes=json.dumps(scene_payload, ensure_ascii=False),
        count=count,
    )

    raw = llm.json_chat(system, user, max_tokens=1500)
    # Support both the new prompt ("variations") and the legacy ("variants") shape.
    variants: list = []
    if isinstance(raw, dict):
        variants = raw.get("variations") or raw.get("variants") or []
    parts: list[CreativePart] = []
    for v in variants[:count]:
        if not isinstance(v, dict):
            continue
        try:
            parts.append(
                CreativePart(
                    role=role,
                    text_darija=str(v.get("text_darija", "")).strip(),
                    on_screen_text=str(v.get("on_screen_text", "")).strip(),
                    visual_direction=str(v.get("visual_direction", "")).strip(),
                    duration_seconds=float(v.get("duration_seconds", 3.0) or 3.0),
                    source_scene_indexes=[s.slice.index for s in scenes],
                )
            )
        except (ValueError, TypeError) as exc:
            log.warning("invalid variant from LLM: %s (%s)", v, exc)
    return [p for p in parts if p.text_darija]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _scenes_for_role(scenes: Iterable[AnalyzedScene], role: SceneRole) -> list[AnalyzedScene]:
    return [s for s in scenes if s.role == role]


def build_parts_pool(
    scenes: list[AnalyzedScene],
    product: ProductInfo,
    llm: LLMClient,
    per_role: int = 5,
) -> dict[SceneRole, list[CreativePart]]:
    """Return a pool of ``per_role`` CreativeParts for each of Hook/Body/Proof/CTA."""
    ctx = build_context(product)
    pool: dict[SceneRole, list[CreativePart]] = {}

    role_archetypes: dict[SceneRole, list[dict[str, str]]] = {
        SceneRole.HOOK: HOOK_ARCHETYPES,
        SceneRole.BODY: BODY_ANGLES,
        SceneRole.PROOF: PROOF_PATTERNS,
        SceneRole.CTA: CTA_PATTERNS,
    }

    for role, archetypes in role_archetypes.items():
        focused = _scenes_for_role(scenes, role)
        # If LLM available, ask it for `per_role` variants based on the focused scenes.
        # Always include at least one template item so we never end up empty.
        llm_parts = _llm_pool(role, ctx, focused or scenes, llm, per_role)
        template_parts = _template_pool(role, ctx, archetypes, per_role)

        merged: list[CreativePart] = []
        seen_texts: set[str] = set()
        for p in [*llm_parts, *template_parts]:
            key = p.text_darija.strip()
            if not key or key in seen_texts:
                continue
            seen_texts.add(key)
            merged.append(p)
            if len(merged) >= per_role:
                break

        # Backfill if still empty
        while len(merged) < min(per_role, len(archetypes)):
            extra = _template_part(role, ctx, archetypes[len(merged) % len(archetypes)])
            merged.append(extra)

        pool[role] = merged

    return pool


__all__ = [
    "build_context",
    "build_parts_pool",
    "PATTERNS_BY_ROLE",
]
