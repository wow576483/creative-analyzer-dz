"""Classify each analyzed scene as Hook / Body / Proof / CTA / Transition.

A heuristic-first approach is used so the tool works without an LLM. When an
LLM is available, we ask it to refine the labels in a single batched call.
"""

from __future__ import annotations

import json
import re

from .llm import LLMClient
from .models import AnalyzedScene, SceneRole, SceneSlice, SceneTranscript, SceneVision

# Keyword cues per role (Arabic / darija / French / English).
_HOOK_CUES = [
    "واش راكي",
    "واش راك",
    "ما تصدق",
    "شوف",
    "بصح",
    "حذيت",
    "stop",
    "wait",
    "did you know",
    "looking",
    "tired of",
    "ever",
]

_PROOF_CUES = [
    "ضمان",
    "garantie",
    "تجربت",
    "جربت",
    "جربتها",
    "نتائج",
    "قبل",
    "بعد",
    "before",
    "after",
    "verified",
    "زبون",
    "زبون راضي",
    "تقييم",
    "نجوم",
    "stars",
    "review",
    "testimonial",
    "tested",
    "guarantee",
    "money back",
]

_CTA_CUES = [
    "اطلب",
    "اطلبها",
    "احجز",
    "اشتري",
    "shop now",
    "buy now",
    "order now",
    "click",
    "اضغط",
    "صيفط",
    "عيّط",
    "whatsapp",
    "واتساب",
    "livraison",
    "الدفع عند الاستلام",
    "cod",
    "free shipping",
    "اطلب الآن",
    "promo",
    "limited",
]


def _heuristic_role(
    slice_: SceneSlice, transcript: SceneTranscript, vision: SceneVision, total: int
) -> tuple[SceneRole, float, str]:
    text = " ".join(
        [
            transcript.text or "",
            vision.description or "",
            vision.on_screen_text or "",
        ]
    ).lower()

    pos = (slice_.start + slice_.end) / 2.0
    is_first = slice_.index == 0
    is_last = slice_.index == total - 1

    def has_any(cues: list[str]) -> bool:
        return any(cue.lower() in text for cue in cues)

    if has_any(_CTA_CUES) or is_last:
        return SceneRole.CTA, 0.75 if has_any(_CTA_CUES) else 0.55, "cta cues / last scene"
    if has_any(_PROOF_CUES):
        return SceneRole.PROOF, 0.7, "proof cues"
    if has_any(_HOOK_CUES) or is_first or pos < 4.0:
        return SceneRole.HOOK, 0.7 if has_any(_HOOK_CUES) else 0.55, "hook cues / opening"

    if slice_.duration < 0.8:
        return SceneRole.TRANSITION, 0.5, "very short scene"
    return SceneRole.BODY, 0.5, "default body"


def _llm_refine(
    slices: list[SceneSlice],
    transcripts: list[SceneTranscript],
    visions: list[SceneVision],
    initial: list[tuple[SceneRole, float, str]],
    llm: LLMClient,
) -> list[tuple[SceneRole, float, str]]:
    """Ask the LLM to confirm/correct the labels in one shot."""
    if not llm.enabled:
        return initial

    payload: list[dict] = []
    for s, t, v, (role, _, _) in zip(slices, transcripts, visions, initial, strict=True):
        payload.append(
            {
                "index": s.index,
                "start": round(s.start, 2),
                "end": round(s.end, 2),
                "transcript": t.text,
                "visual_description": v.description,
                "on_screen_text": v.on_screen_text,
                "current_label": role.value,
            }
        )

    system = (
        "أنت محلّل إعلانات. ستحصل على مشاهد فيديو إعلاني وعليك تصنيف كل مشهد "
        "إلى أحد الأدوار: hook, body, proof, cta, transition. "
        "Hook = أول 3-5 ثوان لإيقاف السكرول. "
        "Body = شرح المنتج وفائدته. "
        "Proof = شهادات/ضمان/قبل-بعد/أرقام. "
        "CTA = دعوة للشراء/طلب/تواصل. "
        "Transition = مشاهد قصيرة جداً بدون قيمة محتوى."
    )
    user = (
        "أعد JSON فقط بهذا الشكل: "
        '{"scenes":[{"index":0,"role":"hook","confidence":0.8,"reason":"..."}]}\n\n'
        f"المشاهد:\n{json.dumps(payload, ensure_ascii=False)}"
    )

    raw = llm.json_chat(system, user, max_tokens=1200)
    out: list[tuple[SceneRole, float, str]] = list(initial)
    if not raw or "scenes" not in raw:
        return out
    by_index = {int(item.get("index", -1)): item for item in raw.get("scenes", [])}
    for i, default in enumerate(initial):
        item = by_index.get(i)
        if not item:
            continue
        role_str = str(item.get("role", default[0].value)).lower()
        try:
            role = SceneRole(role_str)
        except ValueError:
            role = default[0]
        confidence = float(item.get("confidence", default[1]) or default[1])
        reason = str(item.get("reason", default[2])).strip() or default[2]
        out[i] = (role, confidence, reason)

    # Guarantee at least one Hook (first scene if missing) and one CTA (last scene if missing).
    if not any(r == SceneRole.HOOK for r, _, _ in out):
        r0, _, _ = out[0]
        out[0] = (SceneRole.HOOK, 0.5, f"forced hook (was {r0.value})")
    if not any(r == SceneRole.CTA for r, _, _ in out):
        last_role, _, _ = out[-1]
        out[-1] = (SceneRole.CTA, 0.5, f"forced cta (was {last_role.value})")
    return out


def classify_scenes(
    slices: list[SceneSlice],
    transcripts: list[SceneTranscript],
    visions: list[SceneVision],
    llm: LLMClient,
) -> list[AnalyzedScene]:
    initial = [
        _heuristic_role(s, t, v, len(slices))
        for s, t, v in zip(slices, transcripts, visions, strict=True)
    ]
    refined = _llm_refine(slices, transcripts, visions, initial, llm)
    return [
        AnalyzedScene(
            slice=s,
            transcript=t,
            vision=v,
            role=role,
            role_confidence=conf,
            role_reason=reason,
        )
        for s, t, v, (role, conf, reason) in zip(slices, transcripts, visions, refined, strict=True)
    ]


# Tiny helper kept here so it's testable independently.
_PUNCT = re.compile(r"[^\w\s]+", re.UNICODE)


def normalize_text(value: str) -> str:
    return _PUNCT.sub(" ", value).strip().lower()
