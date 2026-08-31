'use client';

import { useState, useTransition } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { createBuilding, createManagedUser, deleteManagedUser, togglePermission, updateBuilding, updateManagedUser } from '@/app/actions/super-admin';
import type { Building, PermissionRow, Profile } from '@/lib/types';

type User = Profile & { email: string };
const roleLabel = { resident: 'Resident', admin: 'Admin', superadmin: 'Super admin' };

function Result({ error }: { error: string }) { return error ? <p className="text-brick text-xs mt-2">{error}</p> : null; }

export function SuperAdminUserManager({ users, buildings }: { users: User[]; buildings: Building[] }) {
  const [error, setError] = useState(''); const [pending, start] = useTransition();
  function run(action: () => Promise<{ error?: string }>) { setError(''); start(async () => { const result = await action(); if (result?.error) setError(result.error); else window.location.reload(); }); }
  return <div className="space-y-5">
    <div className="card">
      <h2 className="font-display text-lg font-semibold mb-1">Dodaj korisnika</h2>
      <p className="text-xs text-ink-soft mb-4">Kreira se login nalog i profil u jednom koraku.</p>
      <form onSubmit={(e) => { e.preventDefault(); run(() => createManagedUser(new FormData(e.currentTarget))); }} className="grid grid-cols-2 gap-3">
        <input name="name" required className="field-input" placeholder="Ime i prezime" />
        <input name="email" required type="email" className="field-input" placeholder="Email" />
        <input name="password" required minLength={4} type="text" className="field-input" placeholder="Početna lozinka" />
        <select name="role" className="field-input"><option value="resident">Resident</option><option value="admin">Admin</option><option value="superadmin">Super admin</option></select>
        <input name="unit" className="field-input" placeholder="Stan (samo resident)" />
        <select name="building_id" className="field-input"><option value="">Bez zgrade</option>{buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <button disabled={pending} className="btn btn-navy col-span-2 justify-center"><Plus size={15} />{pending ? 'Čuva se…' : 'Dodaj korisnika'}</button>
      </form><Result error={error} />
    </div>
    <div className="card overflow-x-auto"><h2 className="font-display text-lg font-semibold mb-4">Svi korisnici</h2>
      <table className="w-full text-[12.5px]"><thead><tr className="text-left text-ink-soft border-b border-line"><th className="pb-2">Korisnik</th><th className="pb-2">Uloga</th><th className="pb-2">Zgrada / stan</th><th className="pb-2 text-right">Izmena</th></tr></thead><tbody>
      {users.map((u) => <UserRow key={u.id} user={u} buildings={buildings} onRun={run} pending={pending} />)}
      </tbody></table><Result error={error} />
    </div>
  </div>;
}

function UserRow({ user, buildings, onRun, pending }: { user: User; buildings: Building[]; onRun: (a: () => Promise<{ error?: string }>) => void; pending: boolean }) {
  const [editing, setEditing] = useState(false);
  return <>
    <tr className="border-b border-line"><td className="py-3"><div className="font-bold">{user.name}</div><div className="text-ink-soft">{user.email}</div></td><td>{roleLabel[user.role]}</td><td>{buildings.find((b) => b.id === user.building_id)?.name ?? '—'}{user.unit ? ` · ${user.unit}` : ''}</td><td className="text-right"><button onClick={() => setEditing(!editing)} className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 11 }}>{editing ? 'Zatvori' : 'Uredi'}</button></td></tr>
    {editing && <tr className="bg-cream-2"><td colSpan={4} className="py-3"><form onSubmit={(e) => { e.preventDefault(); onRun(() => updateManagedUser(user.id, new FormData(e.currentTarget))); }} className="grid grid-cols-2 gap-2">
      <input name="name" defaultValue={user.name} required className="field-input" /><input name="email" defaultValue={user.email} required type="email" className="field-input" />
      <input name="password" type="text" className="field-input" placeholder="Nova lozinka (opciono)" /><select name="role" defaultValue={user.role} className="field-input"><option value="resident">Resident</option><option value="admin">Admin</option><option value="superadmin">Super admin</option></select>
      <input name="unit" defaultValue={user.unit ?? ''} className="field-input" placeholder="Stan" /><select name="building_id" defaultValue={user.building_id ?? ''} className="field-input"><option value="">Bez zgrade</option>{buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <button disabled={pending} className="btn btn-gold justify-center"><Check size={14} />Sačuvaj izmene</button><button type="button" disabled={pending} onClick={() => { if (confirm(`Obrisati ${user.name}?`)) onRun(() => deleteManagedUser(user.id)); }} className="btn btn-outline justify-center text-brick"><Trash2 size={14} />Obriši korisnika</button>
    </form></td></tr>}
  </>;
}

export function BuildingManager({ buildings }: { buildings: Building[] }) {
  const [error, setError] = useState(''); const [pending, start] = useTransition();
  function run(a: () => Promise<{ error?: string }>) { setError(''); start(async () => { const r = await a(); if (r?.error) setError(r.error); else window.location.reload(); }); }
  return <div className="space-y-5"><div className="card"><h2 className="font-display text-lg font-semibold mb-4">Dodaj zgradu</h2><form onSubmit={(e) => { e.preventDefault(); run(() => createBuilding(new FormData(e.currentTarget))); }} className="flex gap-2"><input name="name" required className="field-input flex-1" placeholder="Naziv zgrade" /><button disabled={pending} className="btn btn-navy"><Plus size={15} />Dodaj</button></form><Result error={error} /></div><div className="card"><h2 className="font-display text-lg font-semibold mb-4">Zgrade i uređivanje</h2>{buildings.map((b) => <form key={b.id} onSubmit={(e) => { e.preventDefault(); run(() => updateBuilding(b.id, new FormData(e.currentTarget).get('name')?.toString() ?? '')); }} className="flex gap-2 mb-2"><input name="name" defaultValue={b.name} className="field-input flex-1" /><button disabled={pending} className="btn btn-outline">Sačuvaj</button></form>)}<Result error={error} /></div></div>;
}

export function PermissionManager({ permissions }: { permissions: PermissionRow[] }) {
  const [pendingKey, setPendingKey] = useState('');
  return <div className="card"><h2 className="font-display text-lg font-semibold mb-1">Dozvole i toggle opcije</h2><p className="text-xs text-ink-soft mb-4">Ove opcije su globalne za platformu i određuju funkcionalnosti admina i stanara.</p>{permissions.map((p) => <div key={p.key} className="flex items-center justify-between py-3 border-b border-line last:border-0"><div><div className="font-semibold text-sm">{p.key}</div><div className="text-[11px] text-ink-soft">{p.key.startsWith('admin_') ? 'Admin funkcija' : 'Resident funkcija'}</div></div><button disabled={pendingKey === p.key} onClick={async () => { setPendingKey(p.key); await togglePermission(p.key, !p.value); setPendingKey(''); window.location.reload(); }} className={`w-12 h-6 rounded-full p-1 transition-colors ${p.value ? 'bg-sage' : 'bg-ink-faint'}`}><span className={`block w-4 h-4 rounded-full bg-white transition-transform ${p.value ? 'translate-x-6' : ''}`} /></button></div>)}</div>;
}
