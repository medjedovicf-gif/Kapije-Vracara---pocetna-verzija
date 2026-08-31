'use client';

import { useState, useTransition } from 'react';
import { saveResidentProfile } from '@/app/actions/user-actions';
import type { Profile } from '@/lib/types';

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [pending, start] = useTransition();
  return <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => { const r = await saveResidentProfile(String(fd.get('name') || ''), String(fd.get('phone') || '')); if (r?.error) setError(r.error); else { setError(''); setMessage('Profil je sačuvan.'); } }); }} className="card"><h2 className="font-display text-lg font-semibold mb-4">Moj profil</h2><label className="field-label">Ime i prezime</label><input name="name" defaultValue={profile.name} required className="field-input mb-3" /><label className="field-label">Telefon</label><input name="phone" className="field-input mb-3" placeholder="Telefon (opciono)" /><label className="field-label">Email</label><div className="field-input bg-cream-2 mb-3">Email se menja preko administratora</div><div className="text-xs text-ink-soft mb-4">{profile.building_id ? `Stan ${profile.unit ?? '—'}` : 'Zgrada nije dodeljena'}</div><button disabled={pending} className="btn btn-navy">Sačuvaj profil</button>{message && <p className="text-sage text-xs mt-3">{message}</p>}{error && <p className="text-brick text-xs mt-3">{error}</p>}</form>;
}
