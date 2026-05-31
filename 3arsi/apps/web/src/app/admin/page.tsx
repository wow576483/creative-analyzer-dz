'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDZD, formatDateAr, wilayaLabel } from '@3arsi/core';
import { Logo } from '@/components/brand';
import { apiGet, getToken, setToken } from '@/lib/api';

interface Stats { brides: number; paidBrides: number; orders: number; revenue: number }
interface AdminBride { id: string; bride_name: string; groom_name: string; city: string; wedding_date: string; budget: number; paid: number; email: string }
interface Order { id: string; bride_name: string; amount: number; status: string; created_at: string }

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [brides, setBrides] = useState<AdminBride[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/admin');
      return;
    }
    Promise.all([
      apiGet<Stats>('/api/admin/stats'),
      apiGet<{ brides: AdminBride[] }>('/api/admin/brides'),
      apiGet<{ orders: Order[] }>('/api/admin/orders'),
    ])
      .then(([s, b, o]) => {
        setStats(s);
        setBrides(b.brides);
        setOrders(o.orders);
      })
      .catch((e) => {
        if ((e as { status?: number }).status === 403) setDenied(true);
        else router.replace('/login?next=/admin');
      });
  }, [router]);

  if (denied) return <main className="grid min-h-screen place-items-center text-ink/60">هذه الصفحة مخصّصة للمشرفين.</main>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <button onClick={() => { setToken(null); router.push('/'); }} className="btn-ghost">خروج</button>
      </div>
      <h1 className="mb-6 font-head text-3xl font-bold text-burgundy">لوحة المشرف</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="العرائس" value={stats ? String(stats.brides) : '…'} />
        <Card label="باقات مدفوعة" value={stats ? String(stats.paidBrides) : '…'} />
        <Card label="الطلبات" value={stats ? String(stats.orders) : '…'} />
        <Card label="الإيرادات" value={stats ? formatDZD(stats.revenue) : '…'} accent />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-head text-xl font-bold text-burgundy">العرائس</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/30 text-right text-ink/60">
                <th className="py-2">العروس</th><th>الولاية</th><th>التاريخ</th><th>الميزانية</th><th>الحالة</th><th>الحساب</th>
              </tr>
            </thead>
            <tbody>
              {brides.map((b) => (
                <tr key={b.id} className="border-b border-cream-dark/60">
                  <td className="py-2">{b.bride_name} & {b.groom_name}</td>
                  <td>{wilayaLabel(b.city)}</td>
                  <td>{formatDateAr(b.wedding_date)}</td>
                  <td>{formatDZD(b.budget)}</td>
                  <td>{b.paid ? <span className="chip bg-gold text-ink">مدفوع</span> : <span className="chip text-ink/50">مسودّة</span>}</td>
                  <td className="text-ink/60">{b.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-head text-xl font-bold text-burgundy">الطلبات</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/30 text-right text-ink/60">
                <th className="py-2">العروس</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-cream-dark/60">
                  <td className="py-2">{o.bride_name}</td>
                  <td>{formatDZD(o.amount)}</td>
                  <td>{o.status === 'paid' ? <span className="chip bg-gold text-ink">مدفوع</span> : <span className="chip text-ink/50">{o.status}</span>}</td>
                  <td className="text-ink/60">{o.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card text-center ${accent ? 'bg-burgundy text-cream' : ''}`}>
      <div className="font-head text-3xl font-bold">{value}</div>
      <div className={`mt-1 text-sm ${accent ? 'text-cream/80' : 'text-ink/60'}`}>{label}</div>
    </div>
  );
}
