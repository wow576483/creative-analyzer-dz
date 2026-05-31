'use client';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatDZD, formatDateAr, type DashboardData } from '@3arsi/core';
import { Logo } from '@/components/brand';
import { API_URL, apiGet, apiPatch, apiPost, getToken } from '@/lib/api';

interface BrideInfo {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  city: string;
  budget: number;
  paid: boolean;
}

type Tab = 'overview' | 'budget' | 'timeline' | 'tasks' | 'guests';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'budget', label: 'الميزانية' },
  { key: 'timeline', label: 'الجدول الزمني' },
  { key: 'tasks', label: 'المهام' },
  { key: 'guests', label: 'المدعوّون' },
];

export default function WorkspacePage({ params }: { params: Promise<{ brideId: string }> }) {
  const { brideId } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const [bride, setBride] = useState<BrideInfo | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [notFound, setNotFound] = useState(false);
  const [flash, setFlash] = useState('');

  const load = useCallback(() => {
    apiGet<{ bride: BrideInfo; dashboard: DashboardData }>(`/api/workspace/${brideId}`)
      .then((r) => {
        setBride(r.bride);
        setDashboard(r.dashboard);
      })
      .catch((e) => {
        if ((e as { status?: number }).status === 401) router.replace(`/login?next=/workspace/${brideId}`);
        else setNotFound(true);
      });
  }, [brideId, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/workspace/${brideId}`);
      return;
    }
    load();
    if (search.get('paid') === '1') setFlash('تمّ الدفع بنجاح! باقتكِ مفعّلة الآن 🎉');
  }, [brideId, load, router, search]);

  async function pay() {
    try {
      const res = await apiPost<{ checkoutUrl: string }>(`/api/payments/${brideId}/checkout`);
      window.location.href = res.checkoutUrl;
    } catch {
      setFlash('تعذّر بدء الدفع — تأكدي من إعداد Chargily.');
    }
  }

  async function downloadPdf() {
    try {
      const res = await apiPost<{ url: string }>(`/api/pdf/${brideId}/generate`);
      window.open(`${API_URL}${res.url}`, '_blank');
    } catch (e) {
      setFlash((e as { status?: number }).status === 402 ? 'الكتاب الفاخر متاح بعد الدفع.' : 'تعذّر توليد الكتاب.');
    }
  }

  if (notFound) return <Centered>لم يتم العثور على هذه المساحة.</Centered>;
  if (!bride || !dashboard) return <Centered>جارٍ التحميل…</Centered>;

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-burgundy text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo light />
          <Link href="/dashboard" className="text-sm text-cream/80 hover:text-cream">مساحاتي ←</Link>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-8">
          <h1 className="font-head text-3xl font-bold">{bride.brideName} & {bride.groomName}</h1>
          <p className="mt-1 text-cream/80">{formatDateAr(bride.weddingDate)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {bride.paid ? (
              <button onClick={downloadPdf} className="btn-gold">📕 تحميل كتاب العرس PDF</button>
            ) : (
              <button onClick={pay} className="btn-gold">✨ فعّلي باقتكِ — 4900 دج</button>
            )}
          </div>
        </div>
      </header>

      {flash && (
        <div className="mx-auto mt-4 max-w-6xl px-6">
          <p className="rounded-xl bg-gold/20 p-3 text-center text-burgundy">{flash}</p>
        </div>
      )}

      {/* Tabs */}
      <nav className="sticky top-0 z-10 border-b border-gold/30 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === t.key ? 'border-burgundy text-burgundy' : 'border-transparent text-ink/60 hover:text-burgundy'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {tab === 'overview' && <Overview dashboard={dashboard} />}
        {tab === 'budget' && <Budget brideId={brideId} onChange={load} />}
        {tab === 'timeline' && <Timeline brideId={brideId} onChange={load} />}
        {tab === 'tasks' && <Tasks brideId={brideId} />}
        {tab === 'guests' && <Guests brideId={brideId} onChange={load} />}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center text-ink/60">{children}</main>;
}

function Overview({ dashboard }: { dashboard: DashboardData }) {
  const d = dashboard;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="يوم حتى العرس" value={String(d.daysUntilWedding)} accent />
        <StatCard label="نسبة الإنجاز" value={`${d.progressPct}%`} />
        <StatCard label="المدعوّون" value={`${d.guests.confirmed}/${d.guests.total}`} />
        <StatCard label="الطاولات" value={String(d.guests.tables)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-head text-lg font-bold text-burgundy">الميزانية</h3>
          <div className="mb-2 flex justify-between text-sm">
            <span>المخطّط: {formatDZD(d.budget.planned)}</span>
            <span>المصروف: {formatDZD(d.budget.actual)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-cream-dark">
            <div className="h-full bg-gold" style={{ width: `${Math.min(100, d.budget.spentPct)}%` }} />
          </div>
          <p className="mt-2 text-sm text-ink/60">المتبقّي: {formatDZD(d.budget.remaining)}</p>
          <div className="mt-4 space-y-1">
            {d.spendByCategory.slice(0, 6).map((c) => (
              <div key={c.category} className="flex justify-between text-sm">
                <span>{c.category}</span>
                <span className="text-burgundy">{c.share}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 font-head text-lg font-bold text-burgundy">المهام القادمة</h3>
          <ul className="space-y-2">
            {d.upcomingTasks.map((t, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-cream-dark/40 px-3 py-2 text-sm">
                <span>{t.task}</span>
                <span className="text-ink/50">{t.date}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card text-center ${accent ? 'bg-burgundy text-cream' : ''}`}>
      <div className="font-head text-4xl font-bold">{value}</div>
      <div className={`mt-1 text-sm ${accent ? 'text-cream/80' : 'text-ink/60'}`}>{label}</div>
    </div>
  );
}

interface BudgetItem { id: string; category: string; item: string; planned: number; actual: number }
function Budget({ brideId, onChange }: { brideId: string; onChange: () => void }) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  useEffect(() => {
    apiGet<{ items: BudgetItem[] }>(`/api/workspace/${brideId}/budget`).then((r) => setItems(r.items));
  }, [brideId]);

  async function saveActual(id: string, actual: number) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, actual } : it)));
    await apiPatch(`/api/workspace/${brideId}/budget/${id}`, { actual });
    onChange();
  }

  return (
    <div className="card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gold/30 text-right text-ink/60">
            <th className="py-2">البند</th>
            <th>مخطّط</th>
            <th>فعلي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-cream-dark/60">
              <td className="py-2">{it.item}<div className="text-xs text-ink/40">{it.category}</div></td>
              <td>{formatDZD(it.planned)}</td>
              <td>
                <input
                  type="number"
                  defaultValue={it.actual}
                  onBlur={(e) => saveActual(it.id, Number(e.target.value))}
                  className="w-28 rounded-lg border border-gold/40 px-2 py-1"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TimelineEntry { id: string; task: string; date: string; owner: string; status: string; priority: string }
function Timeline({ brideId, onChange }: { brideId: string; onChange: () => void }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  useEffect(() => {
    apiGet<{ entries: TimelineEntry[] }>(`/api/workspace/${brideId}/timeline`).then((r) => setEntries(r.entries));
  }, [brideId]);

  async function cycle(e: TimelineEntry) {
    const next = e.status === 'not_started' ? 'in_progress' : e.status === 'in_progress' ? 'done' : 'not_started';
    setEntries((prev) => prev.map((x) => (x.id === e.id ? { ...x, status: next } : x)));
    await apiPatch(`/api/workspace/${brideId}/timeline/${e.id}`, { status: next });
    onChange();
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id} className="card flex items-center justify-between py-3">
          <div>
            <p className="font-semibold">{e.task}</p>
            <p className="text-xs text-ink/50">{e.date} · {e.owner}</p>
          </div>
          <button onClick={() => cycle(e)} className={`chip ${statusClass(e.status)}`}>{statusLabel(e.status)}</button>
        </div>
      ))}
    </div>
  );
}

interface Task { id: string; title: string; category: string; due_date: string; status: string }
function Tasks({ brideId }: { brideId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    apiGet<{ tasks: Task[] }>(`/api/workspace/${brideId}/tasks`).then((r) => setTasks(r.tasks));
  }, [brideId]);

  async function toggle(t: Task) {
    const next = t.status === 'done' ? 'not_started' : 'done';
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    await apiPatch(`/api/workspace/${brideId}/tasks/${t.id}`, { status: next });
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <label key={t.id} className="card flex cursor-pointer items-center gap-3 py-3">
          <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle(t)} className="h-5 w-5 accent-burgundy" />
          <span className={t.status === 'done' ? 'text-ink/40 line-through' : ''}>{t.title}</span>
          <span className="ml-auto text-xs text-ink/50">{t.due_date}</span>
        </label>
      ))}
    </div>
  );
}

interface Guest { id: string; full_name: string; rsvp: string; table_no: number | null }
function Guests({ brideId, onChange }: { brideId: string; onChange: () => void }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [name, setName] = useState('');

  const reload = useCallback(() => {
    apiGet<{ guests: Guest[] }>(`/api/workspace/${brideId}/guests`).then((r) => setGuests(r.guests));
  }, [brideId]);
  useEffect(reload, [reload]);

  async function add() {
    if (!name.trim()) return;
    await apiPost(`/api/workspace/${brideId}/guests`, { full_name: name });
    setName('');
    reload();
    onChange();
  }

  async function setRsvp(g: Guest, rsvp: string) {
    setGuests((prev) => prev.map((x) => (x.id === g.id ? { ...x, rsvp } : x)));
    await apiPatch(`/api/workspace/${brideId}/guests/${g.id}`, { rsvp });
    onChange();
  }

  return (
    <div className="space-y-4">
      <div className="card flex gap-2">
        <input className="input" placeholder="اسم المدعوّ" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add} className="btn-primary">إضافة</button>
      </div>
      {guests.length === 0 ? (
        <p className="text-center text-ink/50">لا مدعوّين بعد — أضيفي أول اسم.</p>
      ) : (
        guests.map((g) => (
          <div key={g.id} className="card flex items-center justify-between py-3">
            <span>{g.full_name}</span>
            <div className="flex gap-1">
              {['confirmed', 'pending', 'declined'].map((r) => (
                <button key={r} onClick={() => setRsvp(g, r)} className={`chip ${g.rsvp === r ? rsvpClass(r) : 'text-ink/40'}`}>
                  {rsvpLabel(r)}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function statusLabel(s: string) {
  return s === 'done' ? 'منجز' : s === 'in_progress' ? 'جارٍ' : 'لم يبدأ';
}
function statusClass(s: string) {
  return s === 'done' ? 'bg-gold text-ink' : s === 'in_progress' ? 'bg-burgundy text-cream' : 'border-gold/40 text-ink/60';
}
function rsvpLabel(r: string) {
  return r === 'confirmed' ? 'مؤكّد' : r === 'declined' ? 'معتذر' : 'معلّق';
}
function rsvpClass(r: string) {
  return r === 'confirmed' ? 'bg-gold text-ink' : r === 'declined' ? 'bg-burgundy text-cream' : 'bg-cream-dark text-ink';
}
