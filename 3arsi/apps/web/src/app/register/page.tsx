'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/brand';
import { apiPost, setToken } from '@/lib/api';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/start';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiPost<{ token: string }>('/api/auth/register', { name, email, password });
      setToken(res.token);
      router.push(next);
    } catch (err) {
      const code = (err as { data?: { error?: string } })?.data?.error;
      setError(code === 'email_taken' ? 'هذا البريد مستعمل مسبقاً' : code === 'weak_password' ? 'كلمة المرور قصيرة (6 أحرف على الأقل)' : 'تعذّر إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <form onSubmit={submit} className="card w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-center font-head text-2xl font-bold text-burgundy">أنشئي حسابكِ</h1>
        <p className="mb-6 text-center text-sm text-ink/60">خطوة واحدة تفصلكِ عن باقتكِ</p>
        {error && <p className="mb-4 rounded-lg bg-burgundy/10 p-3 text-center text-sm text-burgundy">{error}</p>}
        <label className="label">الاسم</label>
        <input className="input mb-4" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="label">البريد الإلكتروني</label>
        <input className="input mb-4" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="label">كلمة المرور</label>
        <input className="input mb-6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-primary w-full" disabled={loading}>{loading ? '...' : 'إنشاء الحساب'}</button>
        <p className="mt-4 text-center text-sm text-ink/60">
          لديكِ حساب؟{' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-burgundy">دخول</Link>
        </p>
      </form>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
