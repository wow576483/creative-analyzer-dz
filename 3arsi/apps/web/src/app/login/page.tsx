'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/brand';
import { apiPost, setToken } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiPost<{ token: string; user: { role: string } }>('/api/auth/login', { email, password });
      setToken(res.token);
      router.push(res.user.role === 'admin' ? '/admin' : next);
    } catch {
      setError('بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <form onSubmit={submit} className="card w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-center font-head text-2xl font-bold text-burgundy">أهلاً بعودتكِ</h1>
        <p className="mb-6 text-center text-sm text-ink/60">ادخلي إلى مساحتكِ الخاصة</p>
        {error && <p className="mb-4 rounded-lg bg-burgundy/10 p-3 text-center text-sm text-burgundy">{error}</p>}
        <label className="label">البريد الإلكتروني</label>
        <input className="input mb-4" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="label">كلمة المرور</label>
        <input className="input mb-6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-primary w-full" disabled={loading}>{loading ? '...' : 'دخول'}</button>
        <p className="mt-4 text-center text-sm text-ink/60">
          ليس لديكِ حساب؟{' '}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-burgundy">أنشئي حساباً</Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
