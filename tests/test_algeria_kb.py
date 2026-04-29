from analyzer.algeria_kb import (
    BODY_ANGLES,
    CTA_PATTERNS,
    DARIJA_STYLE_GUIDE,
    HOOK_ARCHETYPES,
    MARKET_RULES,
    PROOF_PATTERNS,
    AdaptationContext,
)


def test_market_rules_cover_critical_topics():
    text = " ".join(MARKET_RULES)
    for keyword in ["COD", "58", "دارجة", "الدفع عند الاستلام"]:
        assert keyword in text, f"missing keyword: {keyword}"


def test_each_archetype_has_required_fields():
    for group in (HOOK_ARCHETYPES, BODY_ANGLES, PROOF_PATTERNS, CTA_PATTERNS):
        assert group, "empty archetype list"
        for a in group:
            assert "name" in a and "darija_template" in a
            assert a["darija_template"].strip()


def test_style_guide_mentions_darija():
    assert "الدارجة" in DARIJA_STYLE_GUIDE
    assert "livraison" in DARIJA_STYLE_GUIDE


def test_adaptation_context_prompt_block():
    ctx = AdaptationContext(
        product_name="ساعة ذكية",
        product_description="ساعة فيها ضربات القلب",
        price_label="2900 DZD",
        discount_label="-41%",
        landing_phone="0555121212",
        free_shipping=True,
    )
    block = ctx.as_prompt_block()
    assert "ساعة ذكية" in block
    assert "2900 DZD" in block
    assert "-41%" in block
    assert "0555121212" in block
    assert "نعم" in block
    # Includes market rules
    assert "COD" in block or "الدفع عند الاستلام" in block
