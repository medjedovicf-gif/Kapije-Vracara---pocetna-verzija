'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Profile } from '@/lib/types';

export function UserDirectory({ users }: { users: Profile[] }) {
  const [q, setQ] = useState('');
  const shown = users.filter((u) => `${u.name} ${u.unit ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return <div><div className="card mb-4"><input value={q} onChange={(e) => setQ(e.target.value)} className="field-input" placeholder="Pretraži korisnike po imenu ili stanu…" /></div><div className="card"><div className="overflow-x-auto"><table className="min-w-[640px] w-full text-[13px]"><thead><tr className="text-left text-ink-faint font-mono text-[10px] uppercase border-b border-line"><th className="pb-2">Korisnik</th><th className="pb-2">Uloga</th><th className="pb-2">Stan</th><th className="pb-2">Aktivnost</th></tr></thead><tbody>{shown.map((u) => <tr key={u.id} className="border-b border-line last:border-0"><td className="py-3 font-bold">{u.name}</td><td>{u.role}</td><td>{u.unit ?? '—'}</td><td><Link href="/admin/residents" className="text-gold-dark text-xs">Otvori profil →</Link></td></tr>)}{!shown.length && <tr><td colSpan={4} className="py-5 text-center text-ink-faint">Nema korisnika.</td></tr>}</tbody></table></div></div></div>;
}
