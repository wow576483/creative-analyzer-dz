from analyzer.models import CreativePart, ProductInfo, SceneRole
from analyzer.permutation import generate_scripts


def _part(role: SceneRole, idx: int) -> CreativePart:
    return CreativePart(
        role=role,
        text_darija=f"{role.value}-{idx}",
        on_screen_text=f"on-{role.value}-{idx}",
        visual_direction=f"dir-{role.value}-{idx}",
        duration_seconds=3.0,
    )


def _pool(n: int = 3) -> dict[SceneRole, list[CreativePart]]:
    return {
        SceneRole.HOOK: [_part(SceneRole.HOOK, i) for i in range(n)],
        SceneRole.BODY: [_part(SceneRole.BODY, i) for i in range(n)],
        SceneRole.PROOF: [_part(SceneRole.PROOF, i) for i in range(n)],
        SceneRole.CTA: [_part(SceneRole.CTA, i) for i in range(n)],
    }


def test_zip_balanced_yields_distinct_scripts():
    product = ProductInfo(name="X", price=2900, old_price=4900)
    scripts = generate_scripts(_pool(3), product, n=5, strategy="zip_balanced")
    assert len(scripts) == 5
    titles = {s.title for s in scripts}
    assert len(titles) == 5  # unique titles


def test_cartesian_full_product():
    product = ProductInfo(name="X")
    pool = _pool(2)  # 2*2*2*2 = 16
    scripts = generate_scripts(pool, product, n=20, strategy="cartesian")
    assert len(scripts) == 16


def test_empty_pool_returns_empty():
    pool = {SceneRole.HOOK: [], SceneRole.BODY: [], SceneRole.PROOF: [], SceneRole.CTA: []}
    assert generate_scripts(pool, ProductInfo(name="X"), n=5) == []


def test_script_duration_is_sum_of_parts():
    product = ProductInfo(name="X")
    scripts = generate_scripts(_pool(2), product, n=1)
    s = scripts[0]
    assert abs(s.estimated_duration_seconds - (s.hook.duration_seconds + s.body.duration_seconds + s.proof.duration_seconds + s.cta.duration_seconds)) < 0.01
