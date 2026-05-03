/* ============================================================
 * AutoScan DZ — Landing Page Script
 * Vanilla JS, no dependencies. RTL Arabic.
 * ============================================================ */
(function () {
  "use strict";

  const cfg = window.AUTOSCAN_CONFIG || {};
  const wilayas = window.AUTOSCAN_WILAYAS || [];

  // ---------- Helpers ----------
  const $ = (sel, parent = document) => parent.querySelector(sel);
  const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));
  const fmtDA = (n) => Number(n).toLocaleString("fr-DZ") + " دج";
  const productById = (id) => (cfg.products || []).find((p) => p.id === id);

  // ---------- Year ----------
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Delivery prices ----------
  const homePrice = (cfg.delivery && cfg.delivery.home) || 0;
  const officePrice = (cfg.delivery && cfg.delivery.office) || 0;
  const setText = (id, v) => { const el = $("#" + id); if (el) el.textContent = v; };
  setText("delivery-home", homePrice.toLocaleString("fr-DZ"));
  setText("delivery-office", officePrice.toLocaleString("fr-DZ"));
  setText("radio-home-price", homePrice.toLocaleString("fr-DZ"));
  setText("radio-office-price", officePrice.toLocaleString("fr-DZ"));

  // ---------- Hero rating ----------
  if (cfg.socialProof) {
    setText("hero-rating", cfg.socialProof.rating);
    setText("hero-reviews", cfg.socialProof.reviewsCount.toLocaleString("fr-DZ"));
    setText("social-rating", cfg.socialProof.rating);
    setText("social-count", cfg.socialProof.reviewsCount.toLocaleString("fr-DZ"));
  }

  // ---------- Render products ----------
  const productsGrid = $("#products-grid");
  if (productsGrid && cfg.products) {
    productsGrid.innerHTML = cfg.products
      .map((p) => {
        const save =
          p.oldPrice && p.oldPrice > p.price ? Math.round(p.oldPrice - p.price) : 0;
        return `
          <article class="product" id="product-${p.id}">
            <div class="product__img">
              <img src="${p.image}" alt="${p.name}" loading="lazy" />
            </div>
            <div class="product__body">
              <div class="product__badges">
                ${(p.badges || []).map((b) => `<span class="product__badge">${b}</span>`).join("")}
              </div>
              <h3 class="product__name">${p.name}</h3>
              <p class="product__desc">${p.shortDesc || ""}</p>
              ${
                p.bullets && p.bullets.length
                  ? `<ul class="product__bullets">${p.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`
                  : ""
              }
              <div class="product__price-row">
                <div class="product__price">${fmtDA(p.price)}</div>
                ${p.oldPrice ? `<div class="product__old">${fmtDA(p.oldPrice)}</div>` : ""}
                ${save ? `<div class="product__save">وفّر ${save.toLocaleString("fr-DZ")} دج</div>` : ""}
              </div>
              <button type="button" class="btn btn--primary btn--block product__cta" data-product="${p.id}">
                🛒 اطلب هذا المنتج
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  // ---------- Render wilayas ----------
  const wilayaSel = $("#f-wilaya");
  if (wilayaSel) {
    wilayas.forEach((w) => {
      const opt = document.createElement("option");
      opt.value = w.name;
      opt.textContent = `${w.code} — ${w.name}`;
      wilayaSel.appendChild(opt);
    });
  }

  // ---------- Render product select ----------
  const productSel = $("#f-product");
  if (productSel && cfg.products) {
    cfg.products.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} — ${fmtDA(p.price)}`;
      productSel.appendChild(opt);
    });
  }

  // ---------- Render social proof comments ----------
  const commentsGrid = $("#comments-grid");
  if (commentsGrid && cfg.socialProof && cfg.socialProof.tiktokComments) {
    commentsGrid.innerHTML = cfg.socialProof.tiktokComments
      .map((c) => {
        const initial = (c.user || "?").trim().charAt(0).toUpperCase();
        return `
          <div class="comment">
            <div class="comment__avatar">${initial}</div>
            <div class="comment__body">
              <strong>@${c.user}</strong>
              <small>${c.city || ""}</small>
              <p class="comment__text">${c.text}</p>
              <div class="comment__meta">
                <span class="comment__like">❤ ${(c.likes || 0).toLocaleString("fr-DZ")}</span>
                <span>💬 ردّ</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ---------- Countdown ----------
  const countdownMinutes = cfg.countdownMinutes || 30;
  const countdownEl = $("#promo-countdown");
  if (countdownEl) {
    let endsAt = Number(sessionStorage.getItem("autoscan_countdown_end"));
    const now = Date.now();
    if (!endsAt || endsAt < now) {
      endsAt = now + countdownMinutes * 60 * 1000;
      sessionStorage.setItem("autoscan_countdown_end", String(endsAt));
    }
    const tick = () => {
      let diff = endsAt - Date.now();
      if (diff <= 0) {
        endsAt = Date.now() + countdownMinutes * 60 * 1000;
        sessionStorage.setItem("autoscan_countdown_end", String(endsAt));
        diff = endsAt - Date.now();
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      countdownEl.textContent =
        String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---------- Quantity controls ----------
  const qtyInput = $("#f-qty");
  $$(".qty__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = btn.dataset.qty === "-1" ? -1 : 1;
      const cur = Math.max(1, Math.min(20, parseInt(qtyInput.value || "1", 10) + delta));
      qtyInput.value = cur;
      updateSummary();
    });
  });

  // ---------- "Order this product" buttons ----------
  document.body.addEventListener("click", (e) => {
    const t = e.target.closest("[data-product]");
    if (!t) return;
    const id = t.dataset.product;
    if (productSel && productById(id)) {
      productSel.value = id;
      updateSummary();
      const orderEl = $("#order");
      if (orderEl) orderEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // ---------- Order summary ----------
  function updateSummary() {
    const id = productSel ? productSel.value : "";
    const product = productById(id);
    const qty = Math.max(1, parseInt(qtyInput ? qtyInput.value : "1", 10) || 1);
    const delivery = (document.querySelector('input[name="delivery"]:checked') || {}).value || "home";
    const dPrice = delivery === "office" ? officePrice : homePrice;

    setText("sum-product", product ? product.name : "—");
    setText("sum-price", product ? fmtDA(product.price) : "— دج");
    setText("sum-qty", qty);
    setText("sum-delivery", fmtDA(dPrice));
    const total = product ? product.price * qty + dPrice : 0;
    setText("sum-total", total ? fmtDA(total) : "— دج");
  }
  if (productSel) productSel.addEventListener("change", updateSummary);
  if (qtyInput) qtyInput.addEventListener("input", updateSummary);
  $$('input[name="delivery"]').forEach((r) => r.addEventListener("change", updateSummary));
  updateSummary();

  // ---------- WhatsApp links ----------
  const waNumber = (cfg.whatsapp && cfg.whatsapp.number) || "";
  const waBaseMsg = (cfg.whatsapp && cfg.whatsapp.defaultMessage) || "السلام عليكم، نحب نطلب من AutoScan DZ:";
  const fab = $("#whatsapp-fab");
  if (fab && waNumber) {
    fab.href = `https://api.whatsapp.com/send/?phone=${waNumber}&text=${encodeURIComponent(waBaseMsg)}`;
  }
  function buildWhatsAppOrderUrl(formData) {
    const product = productById(formData.product);
    const qty = formData.quantity || 1;
    const dPrice = formData.delivery === "office" ? officePrice : homePrice;
    const total = product ? product.price * qty + dPrice : 0;
    // NOTE: keep empty strings for visual blank-line separators between sections.
    // Use a null-only filter so the blank lines survive.
    const lines = [
      waBaseMsg,
      "",
      `🛒 المنتج: ${product ? product.name : formData.product}`,
      product ? `💰 السعر: ${fmtDA(product.price)} × ${qty}` : null,
      `🚚 التوصيل: ${formData.delivery === "office" ? "للمكتب" : "للمنزل"} (${fmtDA(dPrice)})`,
      total ? `💵 المجموع: ${fmtDA(total)}` : null,
      "",
      `👤 الاسم: ${formData.fullName}`,
      `📞 الهاتف: ${formData.phone}`,
      `📍 الولاية: ${formData.wilaya}`,
      `🏘️ البلدية: ${formData.commune}`,
      formData.notes ? `📝 ملاحظات: ${formData.notes}` : null,
    ].filter((line) => line !== null && line !== undefined);
    const msg = lines.join("\n");
    // NOTE: use api.whatsapp.com/send/ directly. wa.me redirects to api.whatsapp.com
    // but mangles 4-byte UTF-8 in the `text` param (emoji bytes become U+FFFD).
    // Calling api.whatsapp.com directly preserves the message verbatim.
    const encoded = encodeURIComponent(msg);
    if (waNumber) {
      return `https://api.whatsapp.com/send/?phone=${waNumber}&text=${encoded}`;
    }
    return `https://api.whatsapp.com/send/?text=${encoded}`;
  }

  // ---------- Form submit ----------
  const form = $("#order-form");
  const status = $("#form-status");
  const submitBtn = $("#submit-btn");

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg || "";
    status.classList.remove("is-success", "is-error");
    if (kind === "success") status.classList.add("is-success");
    if (kind === "error") status.classList.add("is-error");
  }

  function readForm() {
    const fd = new FormData(form);
    return {
      fullName: (fd.get("fullName") || "").toString().trim(),
      phone: (fd.get("phone") || "").toString().trim(),
      wilaya: (fd.get("wilaya") || "").toString().trim(),
      commune: (fd.get("commune") || "").toString().trim(),
      delivery: (fd.get("delivery") || "home").toString(),
      product: (fd.get("product") || "").toString(),
      quantity: parseInt((fd.get("quantity") || "1").toString(), 10) || 1,
      notes: (fd.get("notes") || "").toString().trim(),
    };
  }

  function validate(data) {
    if (!data.fullName || data.fullName.length < 2) return "اكتب اسمك الكامل";
    if (!/^(\+?213|0)?[567]\d{8}$/.test(data.phone.replace(/\s+/g, "")))
      return "رقم الهاتف غير صحيح — مثال: 0555123456";
    if (!data.wilaya) return "اختر الولاية";
    if (!data.commune) return "اكتب اسم البلدية";
    if (!data.product) return "اختر المنتج";
    return null;
  }

  function submitToGoogleForm(data) {
    const gf = cfg.googleForm || {};
    if (!gf.formId) return Promise.resolve("skipped");

    const url = `https://docs.google.com/forms/d/e/${gf.formId}/formResponse`;
    const body = new URLSearchParams();
    const e = gf.entries || {};
    if (e.fullName) body.append(e.fullName, data.fullName);
    if (e.phone) body.append(e.phone, data.phone);
    if (e.wilaya) body.append(e.wilaya, data.wilaya);
    if (e.commune) body.append(e.commune, data.commune);
    if (e.delivery) body.append(e.delivery, data.delivery === "office" ? "للمكتب" : "للمنزل");
    if (e.product) {
      const prod = productById(data.product);
      body.append(e.product, prod ? prod.name : data.product);
    }
    if (e.quantity) body.append(e.quantity, String(data.quantity));
    if (e.notes) body.append(e.notes, data.notes || "");

    // no-cors mode → response is opaque; we CANNOT verify whether the
    // submission was accepted by Google. We only know the request was sent.
    // Returns "sent" if the network request completed, "failed" on network
    // error, or "skipped" if formId is not configured (handled above).
    return fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })
      .then(() => "sent")
      .catch(() => "failed");
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("");
      const data = readForm();
      const err = validate(data);
      if (err) { setStatus(err, "error"); return; }

      submitBtn.disabled = true;
      const oldText = submitBtn.textContent;
      submitBtn.textContent = "⏳ جاري الإرسال…";

      let formStatus = "skipped"; // "sent" | "failed" | "skipped"
      try { formStatus = await submitToGoogleForm(data); } catch (_) { formStatus = "failed"; }

      const waUrl = buildWhatsAppOrderUrl(data);

      submitBtn.disabled = false;
      submitBtn.textContent = oldText;

      // We can't verify Google Forms success in no-cors mode (opaque response),
      // so don't falsely claim "وصلنا". Always rely on WhatsApp as the
      // confirmed delivery channel.
      if (formStatus === "failed") {
        setStatus("⚠️ تعذّر الإرسال التلقائي. اضغط 'إرسال' في واتساب لتأكيد طلبك.", "error");
      } else {
        setStatus("✅ تم تجهيز طلبك. اضغط 'إرسال' في واتساب لتأكيده فوراً مع فريقنا.", "success");
      }

      // Open WhatsApp with order details — safe fallback always works
      window.open(waUrl, "_blank", "noopener");

      try { form.reset(); } catch (_) {}
      updateSummary();
    });
  }

  // ---------- Fake order popup ----------
  const fakeOrderEl = $("#fake-order");
  const fakeUserEl = $("#fake-order-user");
  const fakeTextEl = $("#fake-order-text");
  const fakeTimeEl = $("#fake-order-time");

  const FAKE_NAMES = [
    "أحمد م.", "كريم ب.", "ياسين ع.", "بلال ش.", "سفيان ل.", "محمد ت.",
    "نسيم ق.", "إسلام ز.", "هشام ر.", "وليد ف.", "صابر د.", "أنيس س.",
  ];
  const FAKE_CITIES = [
    "الجزائر", "وهران", "قسنطينة", "عنابة", "البليدة", "سطيف", "تيزي وزو",
    "بجاية", "تلمسان", "ورقلة", "بسكرة", "غرداية", "تيارت", "المسيلة",
  ];

  function showFakeOrder() {
    if (!fakeOrderEl || !cfg.products || !cfg.products.length) return;
    const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
    const city = FAKE_CITIES[Math.floor(Math.random() * FAKE_CITIES.length)];
    const product = cfg.products[Math.floor(Math.random() * cfg.products.length)];
    const minutes = 1 + Math.floor(Math.random() * 12);

    if (fakeUserEl) fakeUserEl.textContent = `${name} — ${city}`;
    if (fakeTextEl) fakeTextEl.innerHTML = `طلب <strong>${product.name}</strong>`;
    if (fakeTimeEl) fakeTimeEl.textContent = `منذ ${minutes} دقيقة`;

    fakeOrderEl.classList.add("is-visible");
    fakeOrderEl.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      fakeOrderEl.classList.remove("is-visible");
      fakeOrderEl.setAttribute("aria-hidden", "true");
    }, 5000);
  }

  // First popup after 7s, then every 18-30s
  setTimeout(function loop() {
    showFakeOrder();
    setTimeout(loop, 18000 + Math.random() * 12000);
  }, 7000);

  // ---------- Smooth-scroll anchor links ----------
  document.body.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // ---------- Hide sticky CTA when order section is in view ----------
  const orderSection = $("#order");
  const stickyCta = $("#sticky-cta");
  if (orderSection && stickyCta && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          stickyCta.style.transform = e.isIntersecting ? "translateY(120%)" : "translateY(0)";
          stickyCta.style.transition = "transform 0.25s ease";
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(orderSection);
  }
})();
