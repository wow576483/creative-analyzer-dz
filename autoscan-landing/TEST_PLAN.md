# AutoScan DZ Landing Page — Test Plan

**Target URL:** https://autoscan-landing-ehuemqnr.devinapps.com/
**PR:** https://github.com/wow576483/creative-analyzer-dz/pull/4
**Scope:** End-to-end order flow + adversarial verification of the two Devin Review bug fixes.

## What changed (user-visible)

1. **Whole feature**: New mobile-first Arabic (RTL) landing page with hero, problem→solution, products grid, social proof, order form (58 wilayas), countdown, fake-order popups, sticky CTA, WhatsApp FAB.
2. **Bug fix #1 (script.js: WhatsApp message)**: `filter(Boolean)` was removing empty-string separators, so the WhatsApp message ran together as one block. Now uses `filter(line => line !== null && line !== undefined)` so blank lines between sections are preserved.
3. **Bug fix #2 (script.js: Google Form status)**: `mode: "no-cors"` returns an opaque response — we cannot actually verify the form was saved. Previously the UI claimed `✅ طلبك وصلنا!` ("we received your order") which was misleading. Now status messaging never claims receipt; instead it always directs the user to press Send on WhatsApp as the confirmed channel.

## Primary flow: Place an order end-to-end (one continuous test)

1. Open https://autoscan-landing-ehuemqnr.devinapps.com/ in maximized Chrome.
   - **Pass**: Hero headline `اكشف أسرار سيارتك بنفسك خلال ثواني!` is visible. Promo bar shows a countdown like `MM:SS` that decrements every second. WhatsApp green FAB is visible bottom-left.
   - **Fail (would distinguish broken)**: Static `00:00` countdown, missing FAB, layout broken (everything in one column with overflow on desktop).
2. Scroll to "اختر منتجك الآن" section. Click `اطلب هذا المنتج` on the **OBD2 Pro** card.
   - **Pass**: Page smooth-scrolls to the order form; product `<select>` value is preselected to `obd2-pro` AND a "تم اختيار: ..." toast briefly appears.
   - **Fail**: Form not focused, product dropdown still on default, no toast.
3. Fill the form:
   - Name: `كين زو`
   - Phone: `0555123456` (valid Algerian format)
   - Wilaya: select `16 - الجزائر` from the dropdown
   - Commune: `بئر مراد رايس`
   - Delivery: leave default `🏠 توصيل للمنزل`
   - Quantity: `2`
   - Notes: `طلب اختبار`
   - **Pass — adversarial assertion for live summary**: As I change quantity from 1 → 2, the order summary line `المجموع` updates from `(price + 600)` to `(2×price + 600)`. Concretely for OBD2 Pro at 4900 DA: `5500 DA` → `10400 DA`.
   - **Fail**: Total stays the same after qty change, or wilaya dropdown has fewer/more than 58 entries.
4. Submit phone validation check first: temporarily change phone to `123` and click `🔥 تأكيد الطلب الآن`.
   - **Pass**: Inline error `رقم الهاتف غير صالح. مثال: 0555 123 456` appears under the phone field. WhatsApp does NOT open. No new browser tab.
   - **Fail**: WhatsApp link opens with bad phone, OR no error shown.
5. Restore phone to `0555123456`. Click `🔥 تأكيد الطلب الآن`.
   - **Pass — adversarial for Bug #2 fix**: Status message reads `✅ تم تجهيز طلبك. اضغط 'إرسال' في واتساب لتأكيده معنا.` — it must NOT contain the word `وصلنا`. (If the regex `/وصلنا/` matches the visible status text, the fix has regressed.)
   - **Fail**: Old text `✅ طلبك وصلنا! ...` appears, or no status appears at all.
6. A new tab opens to `https://api.whatsapp.com/send/?phone=213555000000&text=...`. Inspect the URL (read `location.href` in DevTools, NOT clipboard — xclip mangles 4-byte UTF-8).
   - **Pass — adversarial for Bug #1 fix (blank lines)**: URL contains `%0A%0A` between sections, specifically: `AutoScan(%20|\+)DZ%3A%0A%0A` and `%D8%AF%D8%AC%0A%0A`.
   - **Pass — adversarial for emoji-encoding fix**: URL contains the cart emoji `%F0%9F%9B%92`, money `%F0%9F%92%B0`, person `%F0%9F%91%A4`. URL must NOT contain `%EF%BF%BD` (U+FFFD replacement char).
   - **Fail (Bug #1 regression)**: sections mashed with single `\n` only.
   - **Fail (URL mangled by wa.me)**: URL goes through `wa.me` redirect → emojis become `%EF%BF%BD`.

## Edge / regression spot-checks (one screenshot each, labeled "Regression")

- **Mobile viewport (DevTools 390×844 iPhone 14)**: Sticky CTA bar pinned to bottom, products in 1-column grid, hero readable without horizontal scroll.
- **FAQ accordion**: Click a question → answer expands; click again → collapses.
- **Fake order popup**: Wait up to 30s on hero — a small toast like `🛍️ كريم من وهران طلب OBD2 منذ 3 دقائق` slides in.

## Out of scope (cannot verify in this test)

- Real Google Sheet receipt (no `formId` configured yet — placeholder).
- Real WhatsApp number deliverability (placeholder `213555000000`).
- Production product data (placeholder products).

The user will provide these later; the test plan above proves the **wiring** is correct so that swapping in real values is the only remaining step.
