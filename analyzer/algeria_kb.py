"""Algerian-market knowledge base.

This module concentrates everything we know about how creatives perform on the
Algerian market: tone, language register, trust signals, COD-specific patterns,
hook archetypes, common objections, and reusable copy snippets in darija.

It is consumed by `adapt.py` to build the LLM prompts and to provide a
deterministic fallback when no LLM is available.
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import SceneRole

# ---------------------------------------------------------------------------
# Market-level rules
# ---------------------------------------------------------------------------

MARKET_RULES: list[str] = [
    # Buying behaviour
    "الدفع عند الاستلام (COD) هو السائد في الجزائر — اذكر صراحة 'الدفع كي توصلك السلعة'.",
    "أكثر من 90% من الزبائن يفضلون الطلب عبر فورم بسيط (الاسم + الرقم + الولاية) أو واتساب بدل بطاقة دفع.",
    "التوصيل لـ 58 ولاية حجة بيع قوية — أبرزها بصرياً (خريطة/أيقونة).",
    # Language
    "استعمل الدارجة الجزائرية وليس الفصحى الجامدة. مزج طبيعي مع كلمات فرنسية شائعة: livraison, gratuit, promo, cadeau, garantie.",
    "تجنّب الكلمات الخليجية (مثل: 'يا حلوين'، 'حبايبي') لأنها تُحس غريبة.",
    # Trust
    "المنتجات الصينية = شك مرتفع → عوّض بشهادات حقيقية (UGC) وقبل/بعد ومدة ضمان واضحة.",
    "اعرض رقم هاتف جزائري ظاهر (يبدأ بـ 05/06/07).",
    "اذكر إمكانية فتح الطرد قبل الدفع ('تشوفها قبل ما تخلّص').",
    # Pricing
    "Anchor pricing: السعر القديم مشطوب بجانب السعر الجديد البارز.",
    "الأسعار بالدينار الجزائري (دج). أرقام مستديرة (2900، 3500، 4900) تتحوّل أكثر.",
    # Urgency
    "أضف عنصر استعجال: 'آخر القطع'، 'العرض حتى الليلة'، 'كمية محدودة'.",
    # Format
    "الفيديو عمودي 9:16 (تيك توك / ريلز / فيس قصير)، أو 4:5 لفيس فيد.",
    "أول 3 ثوان حاسمة: hook بصري قوي + سؤال أو ادعاء يصدم السكرول.",
    "الطول الأمثل: 15–30 ثانية تيك توك، 30–60 ثانية فيسبوك.",
    # Cultural / sensitivities
    "تجنّب الكحول، اللباس غير المحتشم، الموسيقى الصاخبة جداً، أي مرجع ديني حساس.",
    "إذا فيه نساء، اللباس محتشم. الرجال بمظهر عائلي.",
    # Distribution
    "أهم منصات الإعلان: فيسبوك (الأكبر) ثم تيك توك (تنمو بسرعة) ثم إنستغرام.",
]


# ---------------------------------------------------------------------------
# Hook archetypes that win in Algeria
# ---------------------------------------------------------------------------

HOOK_ARCHETYPES: list[dict[str, str]] = [
    {
        "name": "problem_callout",
        "description": "ابدأ بمشكلة يعاني منها الجمهور (سؤال مباشر).",
        "darija_template": "واش راكي تعاني من {problem}؟",
    },
    {
        "name": "shocking_claim",
        "description": "ادعاء صادم/مذهل يخلي المتفرّج يتوقف.",
        "darija_template": "ما تصدّقش... {shocking_fact}!",
    },
    {
        "name": "before_after",
        "description": "Hook بصري: قبل/بعد سريع في 2 ثانية.",
        "darija_template": "شوف الفرق بين قبل وبعد {product} 👀",
    },
    {
        "name": "social_proof",
        "description": "ذكر عدد كبير من المشترين السعداء.",
        "darija_template": "أكثر من {count} زبون جزائري شراوها هاد الشهر فقط 🔥",
    },
    {
        "name": "controversy",
        "description": "تلميح إلى أن أحداً ما لا يريدك أن تعرف.",
        "darija_template": "السر اللي ما حبّوش يقولوا لك على {product}",
    },
    {
        "name": "curiosity_question",
        "description": "سؤال يفتح فضول.",
        "darija_template": "لاش كل البنات في الجزائر يحوسوا على {product}؟",
    },
    {
        "name": "dz_relatable",
        "description": "موقف يومي يحس به الجزائري بسرعة.",
        "darija_template": "كي تكون في الدار و{daily_pain}، لازمك هاد الحل ⬇️",
    },
]


# ---------------------------------------------------------------------------
# Body angles
# ---------------------------------------------------------------------------

BODY_ANGLES: list[dict[str, str]] = [
    {
        "name": "feature_to_benefit",
        "description": "اشرح الميزة → الفائدة المباشرة.",
        "darija_template": "بـ {feature}، تقدر {benefit} بلا تعب.",
    },
    {
        "name": "demonstration",
        "description": "عرض مباشر للمنتج وهو يحلّ المشكلة.",
        "darija_template": "شوف كيفاش {product} يحل {problem} في {time}.",
    },
    {
        "name": "comparison",
        "description": "قارن بين الطريقة القديمة والجديدة.",
        "darija_template": "بدل ما تخدم {old_way}، {product} يديرها وحدها.",
    },
    {
        "name": "use_case_story",
        "description": "قصة قصيرة لزبون في وضعية محسوسة.",
        "darija_template": "{persona} كانت تعاني، حتى جربت {product} وتبدّل حالها كامل.",
    },
]


# ---------------------------------------------------------------------------
# Proof patterns
# ---------------------------------------------------------------------------

PROOF_PATTERNS: list[dict[str, str]] = [
    {
        "name": "ugc_testimonial",
        "description": "شهادة زبون حقيقي (UGC) بلهجة طبيعية.",
        "darija_template": "أنا جربتها وسبحان الله {result_in_dz}، نصحكم بها.",
    },
    {
        "name": "before_after_visual",
        "description": "صورة/فيديو قبل وبعد واضحان.",
        "darija_template": "صورة قبل ⬅️ صورة بعد {duration} استعمال.",
    },
    {
        "name": "guarantee",
        "description": "ضمان واضح يقلل الخوف.",
        "darija_template": "ضمان {months} شهر — إذا ما أعجبتكش نرجعولك دراهمك.",
    },
    {
        "name": "numbers_proof",
        "description": "أرقام محسوسة (عدد مشترين، تقييم نجوم).",
        "darija_template": "{count}+ زبون جزائري راضي • تقييم {stars}/5 ⭐",
    },
    {
        "name": "open_before_pay",
        "description": "حقّ فتح الطرد قبل الدفع.",
        "darija_template": "تفتح الطرد، تشوفها، وكي تعجبك تخلّص — مفيهاش مخاطرة.",
    },
]


# ---------------------------------------------------------------------------
# CTA patterns
# ---------------------------------------------------------------------------

CTA_PATTERNS: list[dict[str, str]] = [
    {
        "name": "form_simple",
        "description": "وجّه لفورم بسيط على المتجر.",
        "darija_template": "اطلبها دروك من الموقع، الدفع كي توصلك. التوصيل لكل ولايات الوطن 🇩🇿",
    },
    {
        "name": "phone_call",
        "description": "اتصال مباشر برقم جزائري.",
        "darija_template": "عيّط على {phone} ونوصّلك في 48 ساعة، الدفع كي توصلك 🇩🇿",
    },
    {
        "name": "whatsapp",
        "description": "تواصل عبر واتساب.",
        "darija_template": "صيفط لنا 'نعم' على واتساب {phone} ونحجز لك القطعة 📲",
    },
    {
        "name": "scarcity_now",
        "description": "ندرة + الآن.",
        "darija_template": "بقات {qty} قطعة فقط — اطلبها قبل ما تنفد. الدفع عند الاستلام ✅",
    },
    {
        "name": "discount_today",
        "description": "خصم محدود في الوقت.",
        "darija_template": "اليوم فقط بـ {price} بدل {old_price}. اضغط 'اطلبها' وكمل المعلومات.",
    },
]


PATTERNS_BY_ROLE: dict[SceneRole, list[dict[str, str]]] = {
    SceneRole.HOOK: HOOK_ARCHETYPES,
    SceneRole.BODY: BODY_ANGLES,
    SceneRole.PROOF: PROOF_PATTERNS,
    SceneRole.CTA: CTA_PATTERNS,
    SceneRole.TRANSITION: [],
}


# ---------------------------------------------------------------------------
# Reusable darija snippets (safe defaults for fallback)
# ---------------------------------------------------------------------------

TRUST_SNIPPETS: list[str] = [
    "الدفع عند الاستلام",
    "توصيل لـ 58 ولاية",
    "ضمان الجودة",
    "تفتح الطرد قبل ما تخلّص",
    "إرجاع مجاني إذا ما أعجبتكش",
]

URGENCY_SNIPPETS: list[str] = [
    "آخر القطع",
    "العرض حتى الليلة فقط",
    "كمية محدودة",
    "خصم خاص هاد الأسبوع",
]


# ---------------------------------------------------------------------------
# Style guide passed to the LLM
# ---------------------------------------------------------------------------

DARIJA_STYLE_GUIDE = """\
أنت كاتب إعلانات (copywriter) محترف متخصص في السوق الجزائري.
- اكتب بالدارجة الجزائرية الطبيعية (كما يتكلّم الناس في الشارع، فيسبوك، تيك توك).
- اخلط بشكل طبيعي بعض الكلمات الفرنسية الشائعة عند الجزائريين: livraison, gratuit, promo, cadeau, garantie, qualité, original.
- لا تستعمل العربية الفصحى الجامدة أبداً.
- لا تستعمل لهجات خليجية (يا حلوين، حبايبي…).
- اكتب جمل قصيرة، مباشرة، بإيقاع سريع.
- استعمل إيموجي بحساب (1–2 لكل عنصر) حيث يخدم الرسالة.
- احرص على ذكر: COD، توصيل لكل الولايات، السعر بالدينار الجزائري (دج)، رقم هاتف أو واتساب إن وُجد.
- تجنّب الادعاءات الطبية المبالغ فيها أو أي شيء يخدش الحياء.
"""


@dataclass(frozen=True)
class AdaptationContext:
    """Context object passed around the adaptation step."""

    product_name: str
    product_description: str
    price_label: str
    discount_label: str | None
    landing_phone: str | None
    free_shipping: bool
    rules: tuple[str, ...] = tuple(MARKET_RULES)

    def as_prompt_block(self) -> str:
        lines = [
            f"المنتج: {self.product_name}",
            f"الوصف: {self.product_description or '—'}",
            f"السعر: {self.price_label or '—'}",
        ]
        if self.discount_label:
            lines.append(f"الخصم: {self.discount_label}")
        if self.landing_phone:
            lines.append(f"رقم الطلبات: {self.landing_phone}")
        lines.append(f"التوصيل المجاني: {'نعم' if self.free_shipping else 'لا'}")
        lines.append("")
        lines.append("قواعد السوق الجزائري التي يجب احترامها:")
        lines.extend(f"- {r}" for r in self.rules)
        return "\n".join(lines)


__all__ = [
    "MARKET_RULES",
    "HOOK_ARCHETYPES",
    "BODY_ANGLES",
    "PROOF_PATTERNS",
    "CTA_PATTERNS",
    "PATTERNS_BY_ROLE",
    "TRUST_SNIPPETS",
    "URGENCY_SNIPPETS",
    "DARIJA_STYLE_GUIDE",
    "AdaptationContext",
]
