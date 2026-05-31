import Link from 'next/link';
import { GoldDivider, Logo } from '@/components/brand';

const DELIVERABLES = [
  { icon: '📊', title: 'لوحة تحكم شخصية', desc: 'عدّ تنازلي، نسبة الإنجاز، الميزانية والمهام القادمة في مكان واحد.' },
  { icon: '💰', title: 'مخطّط الميزانية', desc: 'توزيع ذكي لميزانيتك على كل أقسام العرس، مخطّط مقابل فعلي.' },
  { icon: '📅', title: 'جدول زمني كامل', desc: 'أكثر من 35 مهمّة موزّعة على الأشهر حتى يوم العرس.' },
  { icon: '✅', title: 'قائمة مهام ذكية', desc: 'كل ما عليك فعله، مرتّب حسب الأولوية والتاريخ.' },
  { icon: '👥', title: 'إدارة المدعوّين', desc: 'قوائم، تأكيد الحضور، وتنظيم الطاولات بسهولة.' },
  { icon: '🏠', title: 'مخطّط الجهاز', desc: 'قائمة جهاز العروس غرفة بغرفة مع تقديرات الأسعار.' },
  { icon: '📕', title: 'كتاب عرس PDF فاخر', desc: 'كتابك الخاص بعلامة 3ARSI، جاهز للطباعة والمشاركة.' },
  { icon: '✨', title: 'مساحة عمل خاصة', desc: 'workspace مؤمّن خاص بكِ، يعمل كتطبيق PWA على هاتفك.' },
];

const EMOTIONS = ['الراحة', 'الثقة', 'الفخامة', 'التنظيم'];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">دخول</Link>
          <Link href="/start" className="btn-primary">ابدئي الآن</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <span className="chip border-gold text-burgundy">باقة العرس الرقمية رقم 1 في الجزائر</span>
          <h1 className="mt-6 font-head text-4xl font-bold leading-tight text-burgundy md:text-6xl">
            عرسكِ، منظّم بالكامل
            <br />
            <span className="text-gold">في باقة واحدة فاخرة</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/80">
            أدخلي تفاصيل عرسكِ، وسيُنشئ لكِ نظام 3ARSI تلقائياً لوحة تحكم، ميزانية، جدول زمني، قائمة مهام،
            إدارة مدعوّين، وكتاب عرس PDF فاخر — خاص بكِ وحدكِ.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/start" className="btn-primary text-lg">أنشئي باقتي الآن</Link>
            <Link href="#how" className="btn-gold text-lg">كيف يعمل؟</Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {EMOTIONS.map((e) => (
              <span key={e} className="chip bg-white text-burgundy">{e}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6"><GoldDivider /></div>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center font-head text-3xl font-bold text-burgundy">كيف يعمل؟</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ['1', 'أدخلي تفاصيلكِ', 'الاسم، تاريخ العرس، الولاية، عدد المدعوّين، الميزانية ونوع العرس.'],
            ['2', 'نولّد باقتكِ تلقائياً', 'يبني المحرّك الذكي كل أقسام عرسكِ في ثوانٍ.'],
            ['3', 'نظّمي واستمتعي', 'تابعي كل شيء من مساحتكِ الخاصة وحمّلي كتاب العرس الفاخر.'],
          ].map(([n, t, d]) => (
            <div key={n} className="card text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-burgundy font-head text-xl font-bold text-cream">
                {n}
              </div>
              <h3 className="mt-4 font-head text-xl font-bold text-burgundy">{t}</h3>
              <p className="mt-2 text-ink/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deliverables */}
      <section className="bg-cream-dark/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-head text-3xl font-bold text-burgundy">ماذا ستحصلين عليه؟</h2>
          <p className="mt-2 text-center text-ink/70">أكثر من مجرد رابط — تجربة كاملة فاخرة.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DELIVERABLES.map((d) => (
              <div key={d.title} className="card transition hover:shadow-luxe">
                <div className="text-3xl">{d.icon}</div>
                <h3 className="mt-3 font-bold text-burgundy">{d.title}</h3>
                <p className="mt-1 text-sm text-ink/70">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="card border-2 border-gold bg-white">
          <h2 className="font-head text-3xl font-bold text-burgundy">3ARSI Wedding Package</h2>
          <p className="mt-2 text-ink/70">كل ما تحتاجينه لتنظيم عرس أحلامكِ.</p>
          <div className="my-6 flex items-end justify-center gap-2">
            <span className="font-head text-5xl font-bold text-burgundy">4900</span>
            <span className="mb-2 text-xl text-gold">دج</span>
          </div>
          <ul className="mx-auto mb-6 max-w-md space-y-2 text-right text-ink/80">
            {DELIVERABLES.map((d) => (
              <li key={d.title} className="flex items-center gap-2">
                <span className="text-gold">◆</span> {d.title}
              </li>
            ))}
          </ul>
          <Link href="/start" className="btn-primary w-full text-lg">احصلي على باقتكِ الآن</Link>
          <p className="mt-3 text-xs text-ink/50">دفع آمن عبر Chargily Pay · CIB / Edahabia</p>
        </div>
      </section>

      <footer className="bg-burgundy py-10 text-center text-cream/80">
        <Logo light />
        <p className="mt-4 text-sm">صُمّم بحبّ لعرايس الجزائر · 3ARSI © 2025-2026</p>
      </footer>
    </main>
  );
}
