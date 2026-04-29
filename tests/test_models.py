from analyzer.models import ProductInfo, SceneRole, SceneSlice


def test_product_price_label_simple():
    p = ProductInfo(name="X", price=2900)
    assert p.price_label == "2900 DZD"


def test_product_discount_label():
    p = ProductInfo(name="X", price=2900, old_price=4900)
    assert p.discount_label == "-41%"


def test_product_no_discount_when_invalid():
    p = ProductInfo(name="X", price=2900, old_price=2000)
    assert p.discount_label is None
    p2 = ProductInfo(name="X")
    assert p2.discount_label is None


def test_scene_slice_duration():
    s = SceneSlice(
        index=0, start=1.0, end=4.5, keyframe_path="k", audio_path="a", video_path="v"
    )
    assert s.duration == 3.5


def test_scene_role_enum_values():
    assert {r.value for r in SceneRole} == {"hook", "body", "proof", "cta", "transition"}
