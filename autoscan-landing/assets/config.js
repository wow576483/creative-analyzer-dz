/* AutoScan DZ — Landing config
 * Edit this file to plug in your real data.
 *
 * 1) WhatsApp:
 *    - WHATSAPP_NUMBER: international format, no +, no spaces (e.g. "213XXXXXXXXX").
 *
 * 2) Google Form (Sheet integration):
 *    - Create a Google Form with these fields (in this exact order is fine):
 *        * الاسم الكامل (Short answer)
 *        * رقم الهاتف (Short answer)
 *        * الولاية (Short answer or dropdown)
 *        * البلدية (Short answer)
 *        * نوع التوصيل (Multiple choice: للمنزل / للمكتب)
 *        * المنتج (Short answer)
 *        * الكمية (Short answer)
 *        * ملاحظات (Paragraph - optional)
 *    - Open the form's "Get pre-filled link", fill dummy data, click "Get link".
 *    - From the URL, copy:
 *        * the form ID (in /forms/d/e/<FORM_ID>/viewform)
 *        * each field's `entry.XXXXXXXX` ID
 *    - Paste into GOOGLE_FORM below.
 *
 * 3) Products:
 *    - Edit PRODUCTS array. Each product: id, name, price (DA), oldPrice (DA, optional),
 *      shortDesc, image (path or URL), badges (array of strings).
 */

window.AUTOSCAN_CONFIG = {
  brand: {
    name: "AutoScan DZ",
    tagline: "أسرار السيارات اللي ما قالوهالكش 🚗",
    logo: "assets/img/logo.svg",
  },

  whatsapp: {
    number: "213555000000", // ← غيّر هذا الرقم
    defaultMessage: "السلام عليكم، نحب نطلب من AutoScan DZ:",
  },

  // Google Form (leave empty strings to disable Google Form submission;
  // the form will then fall back to opening a pre-filled WhatsApp message).
  googleForm: {
    formId: "", // مثال: "1FAIpQLSeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    entries: {
      fullName: "",   // entry.123456789
      phone: "",      // entry.123456789
      wilaya: "",     // entry.123456789
      commune: "",    // entry.123456789
      delivery: "",   // entry.123456789  (قيم: "للمنزل" / "للمكتب")
      product: "",    // entry.123456789
      quantity: "",   // entry.123456789
      notes: "",      // entry.123456789
    },
  },

  // Countdown — يبدأ من تحميل الصفحة وينتهي بعد X دقيقة (يُعاد التشغيل عند الانتهاء)
  countdownMinutes: 30,

  // أسعار التوصيل بالدينار الجزائري (للعرض فقط، يمكن تعديلها)
  delivery: {
    home: 600,   // التوصيل للمنزل
    office: 400, // التوصيل للمكتب
    freeOver: null, // مثلاً: 8000 لتوصيل مجاني فوق هذا المبلغ، أو null
  },

  // ضع هنا منتجاتك. صور placeholder موجودة افتراضياً.
  products: [
    {
      id: "obd2-pro",
      name: "جهاز فحص السيارة OBD2 Pro",
      shortDesc: "يكشف كل أعطال سيارتك في ثواني — شغّاله مع كل السيارات من 1996 وفوق. يتصل بهاتفك عبر Bluetooth.",
      price: 4900,
      oldPrice: 7500,
      image: "assets/img/product-obd2.svg",
      badges: ["الأكثر مبيعاً 🔥", "Bluetooth", "متوافق مع كل السيارات"],
      bullets: [
        "يكشف عطل المحرك، البطارية، الحرارة، الكسجين، المسرّع…",
        "يمسح ضوء Check Engine بكبسة وحدة",
        "يشتغل مع تطبيقات: Torque / Car Scanner / OBD Auto Doctor",
        "خفيف، يدخل في الجيب، يبقى دائم في السيارة",
      ],
    },
    {
      id: "paint-tester",
      name: "جهاز كشف طلاء السيارة (Paint Tester)",
      shortDesc: "قبل ما تشري سيارة مستعملة — افحصها بنفسك واكشف هل خدمت في الحادث ولا لا.",
      price: 5900,
      oldPrice: 9000,
      image: "assets/img/product-paint.svg",
      badges: ["ضد الغش 🛡️", "نتيجة في 0.5 ثانية", "احترافي"],
      bullets: [
        "يقيس سُمك الطلاء بدقة على كل قطعة من السيارة",
        "يكشف لك المناطق اللي تبدّلت بعد الحادث",
        "شاشة رقمية واضحة + إنذار صوتي",
        "بطارية تدوم أشهر — يخدمك سنين",
      ],
    },
    {
      id: "pack-duo",
      name: "Pack: OBD2 + كاشف الطلاء",
      shortDesc: "العرض الأقوى — احمي راسك من الغش وتوفّر آلاف الدنانير عند الميكانيكي.",
      price: 8900,
      oldPrice: 14400,
      image: "assets/img/product-pack.svg",
      badges: ["وفّر 5500 دج 💸", "هدية", "محدود"],
      bullets: [
        "الجهازين معاً بسعر واحد وفّر فيه 5500 دج",
        "هدية مجانية: حقيبة حماية + كابل احتياطي",
        "ضمان استبدال 7 أيام",
      ],
    },
  ],

  // إثبات اجتماعي افتراضي (يمكنك تبديل التعليقات والأسماء/الأماكن)
  socialProof: {
    rating: 4.9,
    reviewsCount: 1284,
    tiktokComments: [
      { user: "Karim_Alger", city: "الجزائر", text: "والله المنتج خرافي، كشفت عطل سيارتي بنفسي ووفّرت 12 ألف دج عند الميكانيكي 🔥", likes: 2143 },
      { user: "Sofiane.Oran", city: "وهران", text: "شريت جهاز كشف الطلاء قبل ما نشري ڤولف، لقيت 4 قطع مدهونة 😱 نجاني من 80 مليون", likes: 1872 },
      { user: "Yacine.Cstantine", city: "قسنطينة", text: "وصلني في 48 ساعة، الدفع عند الاستلام، خدمة محترمة 👏", likes: 943 },
      { user: "Bilal.DZ", city: "البليدة", text: "أحسن استثمار درته هاد العام، السيارة ولّات تحت السيطرة", likes: 1255 },
      { user: "Mohamed.Setif", city: "سطيف", text: "نصيحة لكل واحد عندو سيارة، خاصة اللي يبيع ويشري — لازم يكون عندك", likes: 877 },
      { user: "Nassim_16", city: "الجزائر", text: "جربتو على 3 سيارات وكل مرة كشف العطل بدقة 🚗💯", likes: 1402 },
    ],
  },
};
