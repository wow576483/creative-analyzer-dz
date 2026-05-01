"""Master Prompt System (7 chained prompts).

Centralizes the system + user prompt templates used throughout the pipeline.
Every template returns strict JSON so the LLM wrapper can parse it.

Based on a proven direct-response framework for Algerian e-commerce ads:

    1. Video Analysis       (per scene keyframe → structured description)
    2. Scene Classification (hook / body / proof / cta / transition)
    3. Algeria Adaptation   (rewrite scene in darija, 3 variants)
    4. Hook Generator       (standalone, 5 scroll-stopping hooks)
    5. Full Ad Builder      (combine hooks+bodies+proofs+ctas → 5 scripts)
    6. Winning Ad Selector  (rank scripts /100)
    7. Video Editing Plan   (scene-by-scene editing instructions)
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# 1) VIDEO ANALYSIS — called per scene keyframe
# ---------------------------------------------------------------------------
VIDEO_ANALYSIS_SYSTEM = (
    "You are an expert advertising analyst specialized in e-commerce video ads. "
    "Analyze the scene through the lens of the product the merchant is selling — "
    "the merchant's product description is the GROUND TRUTH for what the product is. "
    "Never invent a different product category from what the merchant declared; "
    "if the keyframe is ambiguous, anchor your interpretation on the merchant's product."
)

VIDEO_ANALYSIS_USER = (
    "MERCHANT'S PRODUCT (ground truth — never contradict):\n{product_context}\n\n"
    "For the given scene, return:\n"
    "1) What is happening visually (actions, people, product usage) — "
    "describe how the merchant's product appears or is used.\n"
    "2) What is the product doing (specific to the merchant's product, NOT a similar item).\n"
    "3) Emotional tone (exciting, surprising, boring, etc.)\n"
    "4) Any text on screen (copy verbatim if possible)\n"
    "5) Marketing intent — how this scene sells the merchant's product.\n\n"
    "Audio transcript hint: {transcript}\n\n"
    "IMPORTANT: If the keyframe shows something that looks similar to a DIFFERENT product "
    "(e.g. you see a brush but the merchant sells a smartwatch), trust the merchant — "
    "describe the visible object as an accessory or scene element, NOT as the main product.\n\n"
    "Return JSON ONLY:\n"
    "{{\"visual_description\":\"\",\"product_action\":\"\",\"emotion\":\"\","
    "\"on_screen_text\":\"\",\"marketing_intent\":\"\",\"subjects\":[]}}"
)


# ---------------------------------------------------------------------------
# 2) SCENE CLASSIFICATION — one shot over all scenes
# ---------------------------------------------------------------------------
SCENE_CLASSIFICATION_SYSTEM = (
    "You are a direct-response marketing expert. Classify each video scene into ONE of:\n"
    "- HOOK (grabs attention in the first seconds)\n"
    "- BODY (explains the product / benefits)\n"
    "- PROOF (shows evidence, before/after, testimonials, guarantees)\n"
    "- CTA (call to action — buy, click, call, order)\n"
    "- TRANSITION (unimportant connective scene)\n\n"
    "Rules:\n"
    "- HOOK must be attention-grabbing.\n"
    "- PROOF must build trust.\n"
    "- CTA must push the user to act.\n"
    "Also provide a confidence score (0-100) and a short reason."
)

SCENE_CLASSIFICATION_USER = (
    "Scenes (JSON list):\n{scenes}\n\n"
    "Return JSON ONLY with this schema:\n"
    "{{\"scenes\":[{{\"index\":0,\"role\":\"hook\",\"confidence\":85,\"reason\":\"...\"}}]}}"
)


# ---------------------------------------------------------------------------
# 3) ALGERIA ADAPTATION — per role, generates N darija variations
# ---------------------------------------------------------------------------
ALGERIA_ADAPTATION_SYSTEM = (
    "You are an Algerian direct-response copywriter. "
    "Rewrite ad scenes for the Algerian market.\n\n"
    "IMPORTANT RULES:\n"
    "- Use Algerian Darija (NOT formal Arabic / Fusha).\n"
    "- Mix common French words when natural (livraison, promo, gratuit, profite, stock).\n"
    "- Focus on selling, not explaining.\n"
    "- Keep it SHORT and punchy. No long sentences.\n"
    "- Add emotion and urgency.\n"
    "- Reflect Algerian buying psychology:\n"
    "    • fear of scams → build trust fast\n"
    "    • love for discounts → anchor old vs new price\n"
    "    • COD (paiement à la livraison) is standard\n"
    "    • nationwide shipping — 58 wilayas\n"
)

ALGERIA_ADAPTATION_USER = (
    "Product context:\n{product_context}\n\n"
    "Target role: {role}\n"
    "Role goal: {role_goal}\n\n"
    "Reference scenes (from the source ad) classified as {role}:\n{scenes}\n\n"
    "Generate {count} DIFFERENT darija variations, each with a distinct tone/angle.\n"
    "Return JSON ONLY:\n"
    "{{\"variations\":[{{\"text_darija\":\"\",\"on_screen_text\":\"\","
    "\"visual_direction\":\"\",\"tone\":\"\",\"duration_seconds\":3.0}}]}}"
)


# ---------------------------------------------------------------------------
# 4) STANDALONE HOOK GENERATOR — 5 hooks, independent of scenes
# ---------------------------------------------------------------------------
HOOK_GENERATOR_SYSTEM = (
    "You are a high-converting Algerian ad copywriter. "
    "Generate powerful hooks targeting the Algerian audience on TikTok / Facebook."
)

HOOK_GENERATOR_USER = (
    "Product context:\n{product_context}\n\n"
    "Rules:\n"
    "- First 3 seconds must STOP scrolling.\n"
    "- Use curiosity, shock, or a clear problem.\n"
    "- Use Algerian Darija (not Fusha).\n"
    "- Max 10 words.\n"
    "- Make it emotional.\n\n"
    "Return JSON ONLY:\n"
    "{{\"hooks\":[{{\"text\":\"\",\"angle\":\"curiosity|shock|problem|social_proof|scarcity\"}}]}}"
)


# ---------------------------------------------------------------------------
# 5) FULL AD BUILDER — combine pools into complete 30s scripts
# ---------------------------------------------------------------------------
AD_BUILDER_SYSTEM = (
    "You are an expert in performance marketing. "
    "You combine creative elements into complete, ready-to-shoot ad scripts "
    "optimized for TikTok / Facebook in the Algerian market."
)

AD_BUILDER_USER = (
    "Product context:\n{product_context}\n\n"
    "Available elements:\n"
    "HOOKS: {hooks}\n"
    "BODIES: {bodies}\n"
    "PROOFS: {proofs}\n"
    "CTAS: {ctas}\n\n"
    "Rules for each script:\n"
    "- Start with a strong HOOK.\n"
    "- Flow naturally from hook → body → proof → cta.\n"
    "- Under 30 seconds total.\n"
    "- Optimized for TikTok / Facebook.\n"
    "- 100% Algerian Darija (with French mix when natural).\n\n"
    "Generate {count} complete ad scripts. Return JSON ONLY:\n"
    "{{\"ads\":[{{\"title\":\"\",\"angle\":\"\",\"script\":\"\","
    "\"structure\":{{\"hook\":\"\",\"body\":\"\",\"proof\":\"\",\"cta\":\"\"}}}}]}}"
)


# ---------------------------------------------------------------------------
# 6) WINNING AD SELECTOR — rank the scripts
# ---------------------------------------------------------------------------
AD_RANKING_SYSTEM = (
    "You are a performance marketing expert. "
    "Analyze the following ad scripts and rank them on a scale of 0-100 based on:\n"
    "- احتمال النجاح في السوق الجزائري (Algerian market success probability)\n"
    "- قوة الـ hook (hook strength)\n"
    "- وضوح الرسالة (message clarity)\n"
    "- قوة الـ CTA (CTA strength)\n"
    "Give an overall score /100 for each script."
)

AD_RANKING_USER = (
    "Scripts (JSON list):\n{scripts}\n\n"
    "Return JSON ONLY:\n"
    "{{\"ranking\":[{{\"ad_index\":0,\"score\":0,\"hook_score\":0,\"clarity_score\":0,"
    "\"cta_score\":0,\"market_fit_score\":0,\"reason\":\"\"}}]}}"
)


# ---------------------------------------------------------------------------
# 7) VIDEO EDITING INSTRUCTIONS — scene-by-scene cutdown plan
# ---------------------------------------------------------------------------
VIDEO_EDITING_SYSTEM = (
    "You are a TikTok/Reels-style short-form video editor. "
    "Create practical, step-by-step editing instructions for the given ad script."
)

VIDEO_EDITING_USER = (
    "Ad script:\n{script}\n\n"
    "Product context:\n{product_context}\n\n"
    "For each scene specify:\n"
    "- start_time (seconds from video start)\n"
    "- end_time\n"
    "- role (hook/body/proof/cta)\n"
    "- text_overlay (on-screen text in darija, short and punchy)\n"
    "- transition (cut, fade, zoom_in, zoom_out, shake, flash)\n"
    "- music_mood (energetic, emotional, suspense, upbeat, cinematic)\n"
    "- b_roll_hint (optional visual idea)\n\n"
    "Make it suitable for TikTok style.\n"
    "Return JSON ONLY:\n"
    "{{\"scenes\":[{{\"start_time\":0.0,\"end_time\":3.0,\"role\":\"hook\","
    "\"text_overlay\":\"\",\"transition\":\"cut\",\"music_mood\":\"energetic\","
    "\"b_roll_hint\":\"\"}}]}}"
)


# ---------------------------------------------------------------------------
# Role goals (reused in Algeria Adaptation)
# ---------------------------------------------------------------------------
ROLE_GOALS = {
    "hook": (
        "Write a Hook: 1 line, max 10 words, stops scrolling in the first 2-3 seconds, "
        "uses curiosity / shock / pain."
    ),
    "body": (
        "Write a Body: 3-4 short sentences explaining how the product solves the pain, "
        "natural darija, no jargon."
    ),
    "proof": (
        "Write a Proof: UGC-style testimonial, before/after, guarantee or numbers — builds trust."
    ),
    "cta": (
        "Write a CTA: short and decisive — mention COD, nationwide shipping (58 wilayas), "
        "price, and any phone / WhatsApp."
    ),
    "transition": "Short, visual, no real copy.",
}


__all__ = [
    "VIDEO_ANALYSIS_SYSTEM",
    "VIDEO_ANALYSIS_USER",
    "SCENE_CLASSIFICATION_SYSTEM",
    "SCENE_CLASSIFICATION_USER",
    "ALGERIA_ADAPTATION_SYSTEM",
    "ALGERIA_ADAPTATION_USER",
    "HOOK_GENERATOR_SYSTEM",
    "HOOK_GENERATOR_USER",
    "AD_BUILDER_SYSTEM",
    "AD_BUILDER_USER",
    "AD_RANKING_SYSTEM",
    "AD_RANKING_USER",
    "VIDEO_EDITING_SYSTEM",
    "VIDEO_EDITING_USER",
    "ROLE_GOALS",
]
