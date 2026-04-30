"""Winning Ad Selector — rank generated ad scripts /100.

Implements Prompt 6 of the Master Prompt System.
When no LLM is configured, falls back to a simple heuristic ranking based on
lengths and presence of COD / price / phone mentions.
"""

from __future__ import annotations

import json
import logging

from .llm import LLMClient
from .models import CreativeScript, ScriptRanking
from .prompts import AD_RANKING_SYSTEM, AD_RANKING_USER

log = logging.getLogger(__name__)


def _script_to_payload(script: CreativeScript, index: int) -> dict:
    return {
        "ad_index": index,
        "title": script.title,
        "angle": script.angle,
        "hook": script.hook.text_darija,
        "body": script.body.text_darija,
        "proof": script.proof.text_darija,
        "cta": script.cta.text_darija,
    }


def _heuristic_rankings(scripts: list[CreativeScript]) -> list[ScriptRanking]:
    """Cheap fallback scoring when no LLM is available."""
    out: list[ScriptRanking] = []
    for i, s in enumerate(scripts):
        hook = s.hook.text_darija
        cta = s.cta.text_darija
        hook_score = min(100.0, max(40.0, 100 - abs(len(hook) - 40) * 2))
        cta_score = 60.0 + (20.0 if any(k in cta for k in ("COD", "ولاي", "توصيل", "0", "livraison")) else 0.0)
        clarity = 70.0 if 80 <= len(s.body.text_darija) <= 220 else 55.0
        market_fit = 70.0 + (10.0 if any(k in cta for k in ("دج", "DZD", "ولاي")) else 0.0)
        overall = round((hook_score + cta_score + clarity + market_fit) / 4.0, 1)
        out.append(
            ScriptRanking(
                ad_index=i,
                score=overall,
                hook_score=hook_score,
                clarity_score=clarity,
                cta_score=cta_score,
                market_fit_score=market_fit,
                reason="heuristic (no LLM)",
            )
        )
    out.sort(key=lambda r: r.score, reverse=True)
    return out


def rank_scripts(
    scripts: list[CreativeScript], llm: LLMClient
) -> list[ScriptRanking]:
    """Return rankings sorted best-first."""
    if not scripts:
        return []
    if not llm.enabled:
        return _heuristic_rankings(scripts)

    payload = [_script_to_payload(s, i) for i, s in enumerate(scripts)]
    user = AD_RANKING_USER.format(scripts=json.dumps(payload, ensure_ascii=False))
    raw = llm.json_chat(AD_RANKING_SYSTEM, user, max_tokens=1200)

    items: list = []
    if isinstance(raw, dict):
        items = raw.get("ranking") or raw.get("rankings") or []

    if not items:
        return _heuristic_rankings(scripts)

    rankings: list[ScriptRanking] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            rankings.append(
                ScriptRanking(
                    ad_index=int(item.get("ad_index", 0)),
                    score=float(item.get("score", 0) or 0),
                    hook_score=float(item.get("hook_score", 0) or 0),
                    clarity_score=float(item.get("clarity_score", 0) or 0),
                    cta_score=float(item.get("cta_score", 0) or 0),
                    market_fit_score=float(item.get("market_fit_score", 0) or 0),
                    reason=str(item.get("reason", "")).strip(),
                )
            )
        except (TypeError, ValueError) as exc:
            log.warning("invalid ranking entry %s (%s)", item, exc)

    if not rankings:
        return _heuristic_rankings(scripts)

    rankings.sort(key=lambda r: r.score, reverse=True)
    return rankings


__all__ = ["rank_scripts"]
