"""Standalone Hook Generator (Prompt 4) — independent of source scenes.

Generates 5 powerful scroll-stopping hooks tailored to an Algerian audience.
"""

from __future__ import annotations

import logging

from .algeria_kb import AdaptationContext
from .llm import LLMClient
from .models import ProductInfo, StandaloneHook
from .prompts import HOOK_GENERATOR_SYSTEM, HOOK_GENERATOR_USER

log = logging.getLogger(__name__)


def _fallback_hooks(product: ProductInfo) -> list[StandaloneHook]:
    name = product.name or "المنتج"
    return [
        StandaloneHook(text=f"تخيّل {name} يغيّر روتينك كامل في أسبوع واحد!", angle="curiosity"),
        StandaloneHook(text=f"واش راكم تعانيو وتنساوش {name}؟", angle="problem"),
        StandaloneHook(text=f"آلاف الجزائريين جربوا {name}، النتيجة صدمة!", angle="social_proof"),
        StandaloneHook(text=f"-50% على {name} — stock محدود جداً!", angle="scarcity"),
        StandaloneHook(text=f"هذا السر لي ما يحبولكش تعرفوه على {name}!", angle="shock"),
    ]


def generate_standalone_hooks(
    product: ProductInfo, llm: LLMClient, count: int = 5
) -> list[StandaloneHook]:
    if not llm.enabled:
        return _fallback_hooks(product)[:count]

    ctx = AdaptationContext(
        product_name=product.name,
        product_description=product.description,
        price_label=product.price_label,
        discount_label=product.discount_label,
        landing_phone=product.landing_phone,
        free_shipping=product.free_shipping,
    )
    user = HOOK_GENERATOR_USER.format(product_context=ctx.as_prompt_block())
    raw = llm.json_chat(HOOK_GENERATOR_SYSTEM, user, max_tokens=500)

    items: list = []
    if isinstance(raw, dict):
        items = raw.get("hooks") or []

    hooks: list[StandaloneHook] = []
    for item in items[:count]:
        if isinstance(item, dict):
            text = str(item.get("text", "")).strip()
            angle = str(item.get("angle", "")).strip()
        elif isinstance(item, str):
            text = item.strip()
            angle = ""
        else:
            continue
        if text:
            hooks.append(StandaloneHook(text=text, angle=angle))

    if not hooks:
        return _fallback_hooks(product)[:count]
    return hooks


__all__ = ["generate_standalone_hooks"]
