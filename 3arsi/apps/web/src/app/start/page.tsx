'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WILAYAS, formatDZD, type WeddingType } from '@3arsi/core';
import { Logo } from '@/components/brand';
import { apiPost, getToken } from '@/lib/api';

const TYPES: { value: WeddingType; label: string; emoji: string }[] = [
  { value: 'traditional', label: 'تقليدي', emoji: '🌙' },
  { value: 'modern', label: 'عصري', emoji: '✨' },
  { value: 'mixed', label: 'مختلط', emoji: '🌗' },
  { value: 'luxury', label: 'فاخر', emoji: '👑' },
];

interface Preview {
  dashboard: { daysUntilWedding: number; guests: { tables: number } };
  budget: { byCategory: { category: string; planned: number; share: number }[] };
  wilayaLabel: string;
  timelineCount: number;
  events: { name: string; date: string; guests: number }[];
}

export default function StartPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({
    brideName: '',
    groomName: '',
    weddingDate: '',
    city: '16',
    guestCount: 300,
    budget: 3_000_000,
    weddingType: 'traditional' as WeddingType,
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/register?next=/start');
    else setReady(true);
  }, [router]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function doPreview() {
    setError('');
    try {
      setPreview(await apiPost<Preview>('/api/intake/preview', form));
    } catch (e) {
      const details = (e as { data?: { details?: string[] } })?.data?.details;
      setError(details?.join(' · ') || 'تعذّرت المعاينة');
    }
  }

  async function create() {
    setError('');
    setBusy(true);
    try {
      const res = await apiPost<{ brideId: string }>('/api/intake', form);
      router.push(`/workspace/${res.brideId}`);
    } catch (e) {
      const details = (e as { data?: { details?: string[] } })?.data?.details;
      setError(details?.join(' · ') || 'تعذّر إنشاء الباقة');
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <span className="chip border-gold text-burgundy">إنشاء باقتكِ</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <div className="card">
          <h1 className="font-head text-2xl font-bold text-burgundy">تفاصيل عرسكِ</h1>
          <p className="mb-6 text-sm text-ink/60">سنبني باقتكِ تلقائياً من هذه المعلومات.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">اسم العروس</label>
              <input className="input" value={form.brideName} onChange={(e) => set('brideName', e.target.value)} />
            </div>
            <div>
              <label className="label">اسم العريس</label>
              <input className="input" value={form.groomName} onChange={(e) => set('groomName', e.target.value)} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="label">تاريخ العرس</label>
              <input className="input" type="date" value={form.weddingDate} onChange={(e) => set('weddingDate', e.target.value)} />
            </div>
            <div>
              <label className="label">الولاية</label>
              <select className="input" value={form.city} onChange={(e) => set('city', e.target.value)}>
                {WILAYAS.map((w) => (
                  <option key={w.code} value={w.code}>{w.code} · {w.ar}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="label">عدد المدعوّين</label>
              <input className="input" type="number" min={10} value={form.guestCount} onChange={(e) => set('guestCount', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">الميزانية (دج)</label>
              <input className="input" type="number" min={100000} step={50000} value={form.budget} onChange={(e) => set('budget', Number(e.target.value))} />
            </div>
          </div>

          <label className="label mt-4">نوع العرس</label>
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('weddingType', t.value)}
                className={`rounded-xl border p-3 text-center text-sm transition ${
                  form.weddingType === t.value ? 'border-burgundy bg-burgundy text-cream' : 'border-gold/40 bg-white text-ink'
                }`}
              >
                <div className="text-xl">{t.emoji}</div>
                {t.label}
              </button>
            ))}
          </div>

          {error && <p className="mt-4 rounded-lg bg-burgundy/10 p-3 text-center text-sm text-burgundy">{error}</p>}

          <div className="mt-6 flex gap-3">
            <button type="button" onClick={doPreview} className="btn-gold flex-1">معاينة الباقة</button>
            <button type="button" onClick={create} disabled={busy} className="btn-primary flex-1">{busy ? '...' : 'أنشئي باقتي'}</button>
          </div>
        </div>

        {/* Preview */}
        <div className="card bg-cream-dark/30">
          <h2 className="font-head text-xl font-bold text-burgundy">معاينة فورية</h2>
          {!preview ? (
            <p className="mt-10 text-center text-ink/50">اضغطي «معاينة الباقة» لرؤية ما سيُولّد ✨</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="يوم متبقّي" value={String(preview.dashboard.daysUntilWedding)} />
                <Stat label="طاولة" value={String(preview.dashboard.guests.tables)} />
                <Stat label="مهمّة" value={String(preview.timelineCount)} />
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-burgundy">توزيع الميزانية</h3>
                <div className="space-y-1">
                  {preview.budget.byCategory.slice(0, 6).map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-sm">
                      <span>{c.category}</span>
                      <span className="font-semibold text-burgundy">{formatDZD(c.planned)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-burgundy">الأحداث</h3>
                <div className="flex flex-wrap gap-2">
                  {preview.events.map((e) => (
                    <span key={e.name} className="chip bg-white text-ink">{e.name} · {e.guests}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="font-head text-2xl font-bold text-burgundy">{value}</div>
      <div className="text-xs text-ink/60">{label}</div>
    </div>
  );
}
