'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDZD, formatDateAr, wilayaLabel } from '@3arsi/core';
import { Logo } from '@/components/brand';
import { apiGet, getToken, setToken } from '@/lib/api';

interface BrideRow {
  id: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  city: string;
  budget: number;
  status: string;
  paid: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [brides, setBrides] = useState<BrideRow[] | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/dashboard');
      return;
    }
    apiGet<{ brides: BrideRow[] }>('/api/brides')
      .then((r) => setBrides(r.brides))
      .catch(() => router.replace('/login?next=/dashboard'));
  }, [router]);

  function logout() {
    setToken(null);
    router.push('/');
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <button onClick={logout} className="btn-ghost">خروج</button>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-head text-3xl font-bold text-burgundy">مساحاتكِ</h1>
        <Link href="/start" className="btn-primary">+ باقة جديدة</Link>
      </div>

      {!brides ? (
        <p className="text-ink/50">جارٍ التحميل…</p>
      ) : brides.length === 0 ? (
        <div className="card text-center">
          <p className="text-ink/70">لا توجد باقات بعد.</p>
          <Link href="/start" className="btn-primary mt-4 inline-flex">أنشئي باقتكِ الأولى</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {brides.map((b) => (
            <Link key={b.id} href={`/workspace/${b.id}`} className="card transition hover:shadow-luxe">
              <div className="flex items-center justify-between">
                <h2 className="font-head text-xl font-bold text-burgundy">{b.bride_name} & {b.groom_name}</h2>
                <span className={`chip ${b.paid ? 'bg-gold text-ink' : 'border-gold/50 text-ink/60'}`}>
                  {b.paid ? 'مدفوع' : 'مسودّة'}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink/70">{wilayaLabel(b.city)} · {formatDateAr(b.wedding_date)}</p>
              <p className="mt-1 text-sm text-ink/60">الميزانية: {formatDZD(b.budget)}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
