# AutoScan DZ — Landing Page 🚗🔥

صفحة هبوط احترافية لـ **AutoScan DZ**، مصمّمة لتحويل ترافيك TikTok إلى طلبات مباشرة عبر **الدفع عند الاستلام** و**التوصيل لـ 58 ولاية**.

- 🎯 **Mobile-first**, RTL Arabic, خفيفة وسريعة (HTML/CSS/JS فقط — بدون أي build).
- 🎨 ألوان البراند: أسود + أحمر + أخضر (Algerian flag accent).
- 🛒 **Form** مع dropdown 58 ولاية، اختيار التوصيل (منزل/مكتب)، حساب المجموع، وإرسال إلى **Google Forms** + fallback إلى **WhatsApp**.
- ⚡ **Countdown timer**, **Fake order popups**, **Sticky CTA**, **WhatsApp FAB**.
- 🛡️ بدون tracking خارجي افتراضياً.

---

## 🚀 التشغيل المحلي

لا يوجد build step. كل ما تحتاجه هو سيرفر ثابت:

```bash
cd autoscan-landing
python3 -m http.server 8000
# افتح: http://localhost:8000
```

أو استعمل أي static server (`npx serve`, `caddy file-server`, إلخ).

---

## ⚙️ الإعدادات (`assets/config.js`)

كل المحتوى القابل للتعديل في ملف واحد: `assets/config.js`.

### 1) رقم WhatsApp

```js
whatsapp: {
  number: "213555000000", // ← غيّر هذا الرقم (بدون + وبدون مسافات)
}
```

### 2) المنتجات

عدّل مصفوفة `products` لإضافة/حذف منتجات:

```js
products: [
  {
    id: "obd2-pro",
    name: "جهاز فحص السيارة OBD2 Pro",
    shortDesc: "...",
    price: 4900,
    oldPrice: 7500,
    image: "assets/img/product-obd2.svg",
    badges: ["الأكثر مبيعاً 🔥", "Bluetooth"],
    bullets: ["...", "..."],
  },
]
```

> 💡 ضع صور منتجاتك في `assets/img/` ثم اربطها في حقل `image`.

### 3) Google Form (لحفظ الطلبات في Google Sheet)

#### كيف تنشئ Google Form:

1. افتح [forms.google.com](https://forms.google.com) → **+ Blank**.
2. أنشئ هذه الحقول (الترتيب لا يهم):
   - الاسم الكامل (Short answer) — مطلوب
   - رقم الهاتف (Short answer) — مطلوب
   - الولاية (Short answer)
   - البلدية (Short answer)
   - نوع التوصيل (Multiple choice: `للمنزل` / `للمكتب`)
   - المنتج (Short answer)
   - الكمية (Short answer)
   - ملاحظات (Paragraph)
3. اربط الـ Form بـ **Sheet**: في الـ Form → tab **Responses** → أيقونة Sheets الخضراء → **Create new spreadsheet**.

#### كيف تستخرج الـ IDs:

1. في الـ Form، انقر على ⋮ (الثلاث نقاط فوق) → **Get pre-filled link**.
2. عبّ كل الحقول بقيم وهمية مميزة (مثلاً: `NAME_TEST`, `PHONE_TEST`، إلخ) → **Get link** → **Copy link**.
3. الرابط هكذا:
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSe...XYZ/viewform?usp=pp_url&entry.123456=NAME_TEST&entry.789012=PHONE_TEST
   ```
4. استخرج:
   - **`formId`** = الجزء بين `/forms/d/e/` و `/viewform` (مثال: `1FAIpQLSe...XYZ`).
   - كل **`entry.XXXXXXX`** = ID الحقل المقابل (طابقها مع القيم الوهمية اللي حطّيتها).

#### ضع الـ IDs في `config.js`:

```js
googleForm: {
  formId: "1FAIpQLSe...XYZ",
  entries: {
    fullName: "entry.123456",
    phone: "entry.789012",
    wilaya: "entry.111111",
    commune: "entry.222222",
    delivery: "entry.333333",
    product: "entry.444444",
    quantity: "entry.555555",
    notes: "entry.666666",
  },
}
```

> ✅ الطلبات ستُحفظ في الـ Sheet المربوط، **و** تُرسل في نفس الوقت إلى WhatsApp كـ fallback.
>
> 🔒 لو لم تملأ `formId`، الصفحة تشتغل عادي وترسل الطلبات عبر WhatsApp مباشرة.

---

## 📦 النشر (Deployment)

### A) devinapps.com (الأسرع — مجاني)

من سطر الأوامر داخل بيئة Devin:

```
deploy frontend  --dir autoscan-landing
```

### B) أي static host

ارفع محتوى مجلد `autoscan-landing/` كما هو إلى:
- **Vercel / Netlify**: drag & drop المجلد.
- **GitHub Pages**: ادفع المجلد إلى branch `gh-pages`.
- **Cloudflare Pages**, **Firebase Hosting**، إلخ.

> ⚠️ تأكد أن `index.html` في الجذر الذي ينشره الـ host.

---

## 🧱 هيكل الملفات

```
autoscan-landing/
├── index.html                 ← الصفحة الرئيسية
├── assets/
│   ├── config.js              ← المنتجات + WhatsApp + Google Form (عدّل هنا)
│   ├── wilayas.js             ← قائمة 58 ولاية
│   ├── styles.css             ← التصميم
│   ├── script.js              ← المنطق (form, countdown, popups, الخ)
│   └── img/
│       ├── logo.svg           ← لوغو AutoScan DZ
│       ├── product-obd2.svg   ← صورة OBD2 (placeholder)
│       ├── product-paint.svg  ← صورة Paint Tester (placeholder)
│       └── product-pack.svg   ← صورة الـ Pack
└── README.md                  ← هذا الملف
```

---

## 🎨 الألوان والـ Branding

التعديلات الأساسية في `assets/styles.css` ضمن `:root`:

```css
--red: #ff1f3d;
--green: #00c853;
--bg: #0a0a0b;
```

اللوغو SVG في `assets/img/logo.svg`. لو عندك لوغو PNG/JPG حقيقي، استبدله مباشرة (احتفظ بالاسم).

---

## ✅ Checklist قبل الإطلاق

- [ ] حدّثت `whatsapp.number` في `config.js`.
- [ ] حدّثت `googleForm.formId` و `entries.*` في `config.js`.
- [ ] عدّلت/أضفت منتجاتك في مصفوفة `products`.
- [ ] استبدلت الصور placeholders بصور المنتجات الحقيقية.
- [ ] جربت الـ Form من جوال حقيقي وتأكدت أن الطلب يصل في Sheet + WhatsApp.
- [ ] جربت زر WhatsApp العائم.
- [ ] تأكدت من أرقام التوصيل (`delivery.home`, `delivery.office`).

---

## 📲 TikTok Bio Link

استعمل رابط الصفحة بعد النشر مباشرة في `bio` حساب TikTok:
> 👉 الرابط في البايو — اطلب وندفع كي يوصلك 🚗

---

صنع بـ ❤️ في الجزائر — للأسئلة: راسلنا على WhatsApp.
