"""Combine Hook×Body×Proof×CTA pools into full creative scripts.

Two strategies:

1. ``zip_balanced``: pair items index-by-index across roles to ensure variety
   while keeping the number of generated scripts small (default).
2. ``cartesian``: full cartesian product (5×5×5×5 = 625 if all pools are 5).
   Used only on demand because it explodes quickly.
"""

from __future__ import annotations

from itertools import islice, product

from .models import CreativePart, CreativeScript, ProductInfo, SceneRole

# Ordered list of "angles" we try to assign to scripts when generating.
ANGLES = [
    "problem-solution",
    "before-after",
    "social-proof",
    "story-ugc",
    "demonstration",
    "comparison",
    "scarcity",
    "discount-anchor",
    "controversy",
    "curiosity",
]


def _make_script(
    title: str,
    hook: CreativePart,
    body: CreativePart,
    proof: CreativePart,
    cta: CreativePart,
    angle: str,
    product: ProductInfo,
) -> CreativeScript:
    duration = (
        hook.duration_seconds + body.duration_seconds + proof.duration_seconds + cta.duration_seconds
    )

    notes: list[str] = []
    if product.discount_label:
        notes.append(f"اعرض الخصم بصرياً ({product.discount_label}) في مشهد الـ CTA.")
    if product.free_shipping:
        notes.append("اذكر التوصيل المجاني لكل ولايات الوطن (58 ولاية).")
    notes.append("اكتب SAFE-ZONE: الجزء الأسفل 12% للنص ‎الذي قد يخفيه واجهة تيك توك/ريلز.")
    notes.append("صوت/موسيقى: ترند تيك توك جزائري + voice-over واضح بالدارجة.")

    return CreativeScript(
        title=title,
        hook=hook,
        body=body,
        proof=proof,
        cta=cta,
        angle=angle,
        estimated_duration_seconds=round(duration, 1),
        notes=notes,
    )


def generate_scripts(
    pool: dict[SceneRole, list[CreativePart]],
    product: ProductInfo,
    n: int = 8,
    strategy: str = "zip_balanced",
) -> list[CreativeScript]:
    """Generate up to ``n`` scripts by combining the pool."""
    hooks = pool.get(SceneRole.HOOK, [])
    bodies = pool.get(SceneRole.BODY, [])
    proofs = pool.get(SceneRole.PROOF, [])
    ctas = pool.get(SceneRole.CTA, [])

    if not (hooks and bodies and proofs and ctas):
        return []

    if strategy == "cartesian":
        combos = product_iter(hooks, bodies, proofs, ctas)
    else:
        combos = zip_balanced(hooks, bodies, proofs, ctas)

    scripts: list[CreativeScript] = []
    for i, (h, b, p, c) in enumerate(islice(combos, n)):
        angle = ANGLES[i % len(ANGLES)]
        title = f"كرياتيف #{i + 1} — {angle}"
        scripts.append(_make_script(title, h, b, p, c, angle, product))
    return scripts


def zip_balanced(
    hooks: list[CreativePart],
    bodies: list[CreativePart],
    proofs: list[CreativePart],
    ctas: list[CreativePart],
):
    """Walk the four pools in parallel, cycling shorter ones."""
    n = max(len(hooks), len(bodies), len(proofs), len(ctas))
    for i in range(n * 2):  # allow a second pass with offset
        h = hooks[i % len(hooks)]
        b = bodies[(i + 1) % len(bodies)]
        p = proofs[(i + 2) % len(proofs)]
        c = ctas[(i + 3) % len(ctas)]
        yield h, b, p, c


def product_iter(
    hooks: list[CreativePart],
    bodies: list[CreativePart],
    proofs: list[CreativePart],
    ctas: list[CreativePart],
):
    yield from product(hooks, bodies, proofs, ctas)


__all__ = ["generate_scripts", "zip_balanced", "product_iter", "ANGLES"]
