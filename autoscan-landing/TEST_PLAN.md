# AutoScan DZ Landing Page — Test Plan

**Target URL:** https://autoscan-landing-ehuemqnr.devinapps.com/
**PR:** https://github.com/wow576483/creative-analyzer-dz/pull/4
**Scope:** End-to-end order flow + adversarial verification of all five fixes shipped in this branch.

## What changed (user-visible)

1. **Whole feature**: Mobile-first Arabic (RTL) landing page — products grid, order form, social proof, countdown, fake-order popups, sticky CTA, WhatsApp FAB, FAQ.
2. **Layout simplification (user feedback)**: Products are now FIRST after a tiny intro band; order form sits immediately below products; old Hero / Problem-Solution / Why-Us / mid-page CTA banner sections were collapsed into a single condensed `.trust` strip + `.intro` band.
3. **Per-product WhatsApp quick-buy**: every product card has a green `💬 اطلب عبر واتساب` button alongside the red form CTA — opens a pre-filled WhatsApp chat with product name + price for one-tap ordering.
4. **Pre-selected product**: form's product `<select>` defaults to the first product so the order summary shows a real total immediately.
5. **Bug fix — blank-line separators (Devin Review)**: `filter(Boolean)` was removing empty-string separators in the WhatsApp message; fixed with a null-only filter.
6. **Bug fix — false "وصلنا" claim (Devin Review)**: status no longer lies about Google Form receipt (opaque `no-cors` response); always directs the user to send on WhatsApp.
7. **Bug fix — emoji corruption (own QA)**: switched the WhatsApp link from `wa.me` (whose redirect mangles 4-byte UTF-8) to `api.whatsapp.com/send/` directly so cart/money/person emojis survive verbatim.
8. **Bug fix — `delivery.freeOver` (Devin Review)**: feature is now implemented end-to-end. `computeDeliveryPrice(subtotal, type)` returns 0 when subtotal ≥ threshold; both order summary and WhatsApp message show "مجاني".
9. **Bug fix — popup blocker on form submit (Devin Review)**: `window.open(waUrl)` now runs **synchronously** inside the user-gesture tick, before any `await`. Google Form fetch is fire-and-forget. Critical for iOS Safari, our primary TikTok audience.
10. **Bug fix — quantity clamp (Devin Review)**: `readForm()` clamps `quantity` to `[1, 20]` so a user typing `-5` can't submit a negative qty (the displayed summary already clamped, so the two now agree).
11. **Bug fix — radio fieldset legend grid (Devin Review)**: `legend` now `grid-column: 1 / -1` so it spans both radio columns reliably across browsers (Chrome was forgiving; Safari/older FF were not).

## Primary flow: Place an order end-to-end (one continuous test)

1. Open https://autoscan-landing-ehuemqnr.devinapps.com/ in maximized Chrome.
   - **Pass**: Promo bar with countdown visible, intro `🛒 منتجات السيارات الأكثر طلباً` visible, the products grid is the first big content block, WhatsApp green FAB is visible bottom-left.
   - **Fail (regression)**: Old hero with media frame returns, products buried below problem/solution walls, FAB missing.
2. Verify the new battery-cutoff product is the first product card on the right side (RTL).
   - **Pass**: card title is `قاطع البطارية الذكي — AnFeiDiPei (مفتاح كهرباء السيارة)`, price `2 900 دج`, old price `4 500 دج`, save badge `وفّر 1 600 دج`, real photo (not SVG).
3. Click `💬 اطلب عبر واتساب` on the AnFeiDiPei card.
   - **Pass**: A new tab opens to `https://api.whatsapp.com/send/?phone=213555000000&text=...`. Decoded text contains the product name + `2 900 دج` + the base "AutoScan DZ" greeting.
   - **Fail**: tab opens to `wa.me/...`, decoded text contains `%EF%BF%BD` replacement chars, or product/price are missing.
4. Close that tab. Click `🛒 اطلب عبر الفورم` on the OBD2 Pro card.
   - **Pass**: page smooth-scrolls to `#order` and the product `<select>` value updates to `obd2-pro`. The name field receives focus.
5. Fill the form:
   - Name: `كين زو`
   - Phone: `0555123456` (valid Algerian format)
   - Wilaya: select `16 — الجزائر` from the dropdown (must list 58 wilayas)
   - Commune: `بئر مراد رايس`
   - Delivery: leave default `🏠 للمنزل`
   - Quantity: change to `2`
   - **Pass — live summary updates**: As qty changes 1 → 2, `المجموع` line updates from `5 500 دج` to `10 400 دج` (4900 × 2 + 600).
6. Submit phone-validation check first: temporarily change phone to `123` and click `✅ تأكيد الطلب`.
   - **Pass**: inline error `رقم الهاتف غير صحيح — مثال: 0555123456`. WhatsApp does NOT open.
7. Restore phone to `0555123456`. Click `✅ تأكيد الطلب`.
   - **Pass — adversarial for false "وصلنا" fix**: status reads `✅ تم تجهيز طلبك. اضغط 'إرسال' في واتساب لتأكيده فوراً مع فريقنا.` — must NOT contain `وصلنا`.
   - **Pass — adversarial for popup-blocker fix**: a new tab opens immediately (within the same user-gesture tick), even if a Google Form fetch were to be slow. Confirmed by `submit handler is no longer async` in the source — verified via the network panel and the new tab actually appearing.
8. In the new WhatsApp tab, copy `location.href` from DevTools (do NOT use clipboard — xclip mangles 4-byte UTF-8).
   - **Pass — Bug fix #1 (blank lines)**: URL contains `AutoScan(%20|\+)DZ%3A%0A%0A` AND `%D8%AF%D8%AC%0A%0A` (blank-line separators preserved between sections).
   - **Pass — emoji-encoding fix**: URL contains `%F0%9F%9B%92` (🛒), `%F0%9F%92%B0` (💰), `%F0%9F%91%A4` (👤). URL must NOT contain `%EF%BF%BD`.
   - **Pass — host fix**: URL host is `api.whatsapp.com`, path `/send/`. NOT `wa.me`.

## Edge / regression spot-checks

- **Mobile viewport (DevTools 390×844)**: products are still in 1-column grid, sticky CTA bar pinned to bottom, intro readable without horizontal scroll.
- **Quantity clamp**: in DevTools console run `document.querySelector('#f-qty').value = '-5'` then click submit — the WhatsApp message must show `× 1`, not `× -5`.
- **Radio legend layout**: `نوع التوصيل *` legend sits above the two radio cards (not next to them).
- **FAQ accordion**: click a question → answer expands; click again → collapses.
- **Fake order popup**: wait up to 30s on the products section — a small toast like `🛍️ كريم من وهران طلب OBD2 منذ 3 دقائق` slides in.

## Out of scope

- Real Google Sheet receipt (no `formId` configured yet — placeholder).
- Real WhatsApp number deliverability (placeholder `213555000000`).
- Real product photos for the non-battery-cutoff products (still SVG placeholders).
