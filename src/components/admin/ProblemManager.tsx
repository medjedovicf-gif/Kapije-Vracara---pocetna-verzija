'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ChevronDown, MessageSquare, Pencil, Search, SlidersHorizontal, X } from 'lucide-react';
import { addTicketComment, updateTicketDetails } from '@/app/actions/admin-ops';
import type { Profile, Ticket, TicketComment } from '@/lib/types';

import { priorityLabel } from '@/lib/labels';
import { formatDateTime, formatDate } from '@/lib/format';

const statuses = ['Novo', 'Zakazano', 'U toku', 'Rešeno'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];

type Initial = { status: string; priority: string; filter: string; q?: string };

export function ProblemManager({
  tickets,
  residents,
  comments,
  openTicketId = null,
  initial = { status: 'all', priority: 'all', filter: '' },
}: {
  tickets: Ticket[];
  residents: Profile[];
  comments: TicketComment[];
  openTicketId?: number | null;
  initial?: Initial;
}) {
  const [query, setQuery] = useState(initial.q ?? '');
  const [status, setStatus] = useState(initial.status);
  const [priority, setPriority] = useState(initial.priority);
  const [onlyOverdue, setOnlyOverdue] = useState(initial.filter === 'overdue');
  const [onlyCritical, setOnlyCritical] = useState(initial.filter === 'critical');
  const [onlyUnassigned, setOnlyUnassigned] = useState(initial.filter === 'unassigned');
  const now = Date.now();

  const filtered = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.id === openTicketId ||
          ((!query || `${t.title} ${t.unit} ${t.category} #${t.id}`.toLowerCase().includes(query.toLowerCase())) &&
            (status === 'all' || (status === 'active' ? t.status !== 'Rešeno' : t.status === status)) &&
            (priority === 'all' || t.priority === priority) &&
            (!onlyOverdue || (!!t.due_at && new Date(t.due_at).getTime() < now && t.status !== 'Rešeno')) &&
            (!onlyCritical || t.priority === 'Critical') &&
            (!onlyUnassigned || (!t.assigned_to && t.status !== 'Rešeno')))
      ),
    [tickets, query, status, priority, onlyOverdue, onlyCritical, onlyUnassigned, now, openTicketId]
  );

  const anyFilter = !!query || status !== 'all' || priority !== 'all' || onlyOverdue || onlyCritical || onlyUnassigned;
  function clearFilters() {
    setQuery(''); setStatus('all'); setPriority('all'); setOnlyOverdue(false); setOnlyCritical(false); setOnlyUnassigned(false);
  }

  const chip = (active: boolean) => `btn ${active ? 'btn-gold' : 'btn-outline'} !px-3 !py-2 !text-xs`;

  return (
    <div>
      <div className="card mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-3 text-ink-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="field-input pl-9" placeholder="Pretraži probleme, stan, kategoriju…" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input w-auto">
            <option value="all">Svi statusi</option>
            <option value="active">Aktivni (nerešeni)</option>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="field-input w-auto">
            <option value="all">Svi prioriteti</option>
            {priorities.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button onClick={() => setOnlyOverdue(!onlyOverdue)} className={chip(onlyOverdue)}><SlidersHorizontal size={13} />Istekao rok</button>
          <button onClick={() => setOnlyCritical(!onlyCritical)} className={chip(onlyCritical)}>Kritični</button>
          <button onClick={() => setOnlyUnassigned(!onlyUnassigned)} className={chip(onlyUnassigned)}>Nedodeljeni</button>
          {anyFilter && <button onClick={clearFilters} className="text-xs text-ink-soft hover:text-navy-950 inline-flex items-center gap-1 ml-1"><X size={13} />Očisti filtere</button>}
          <span className="text-[11px] text-ink-soft ml-auto">Prikazano {filtered.length} od {tickets.length}</span>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-ink-faint border-b border-line">
              <th className="py-3 pl-4">Problem</th>
              <th className="py-3 hidden sm:table-cell">Stan</th>
              <th className="py-3">Status</th>
              <th className="py-3 hidden md:table-cell">Prioritet</th>
              <th className="py-3 hidden md:table-cell">Rok</th>
              <th className="py-3 hidden lg:table-cell">Dodeljen</th>
              <th className="py-3 pr-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((ticket) => (
              <ProblemRow
                key={ticket.id}
                ticket={ticket}
                residents={residents}
                comments={comments.filter((c) => c.ticket_id === ticket.id)}
                defaultOpen={ticket.id === openTicketId}
              />
            ))}
            {!filtered.length && <tr><td colSpan={7} className="py-8 text-center text-ink-faint">Nema problema za izabrane filtere.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProblemRow({ ticket, residents, comments, defaultOpen }: { ticket: Ticket; residents: Profile[]; comments: TicketComment[]; defaultOpen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Problem otvoren preko linka (?ticket=ID): skroluj do njega.
  useEffect(() => {
    if (defaultOpen) rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [defaultOpen]);

  function save(form: HTMLFormElement) {
    const fd = new FormData(form);
    const values = {
      title: String(fd.get('title') || ''),
      description: String(fd.get('description') || ''),
      category: String(fd.get('category') || ''),
      unit: String(fd.get('unit') || ''),
      status: String(fd.get('status') || ''),
      priority: String(fd.get('priority') || ''),
      due_at: String(fd.get('due_at') || ''),
      assigned_to: String(fd.get('assigned_to') || ''),
      appointment_date: String(fd.get('appointment_date') || ''),
      appointment_start: String(fd.get('appointment_start') || ''),
      appointment_end: String(fd.get('appointment_end') || ''),
      appointment_status: String(fd.get('appointment_status') || ''),
    };
    start(async () => {
      const result = await updateTicketDetails(ticket.id, values);
      if (result?.error) setError(result.error);
      else { setError(''); setOpen(false); router.refresh(); }
    });
  }

  function comment(form: HTMLFormElement) {
    const body = String(new FormData(form).get('body') || '');
    start(async () => {
      const result = await addTicketComment(ticket.id, body);
      if (result?.error) setError(result.error);
      else { form.reset(); setError(''); router.refresh(); }
    });
  }

  const overdue = !!ticket.due_at && new Date(ticket.due_at).getTime() < Date.now() && ticket.status !== 'Rešeno';
  const assignee = residents.find((p) => p.id === ticket.assigned_to)?.name ?? 'Nedodeljen';

  return (
    <>
      <tr
        ref={rowRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`border-b border-line row-link ${open ? 'bg-cream-2' : ''}`}
      >
        <td className="py-3 pl-4 pr-2">
          <div className="font-bold text-[13px] text-navy-950">{ticket.title}</div>
          <div className="text-[10.5px] text-ink-faint mt-0.5">
            #{ticket.id} · {ticket.category}
            <span className="sm:hidden"> · Stan {ticket.unit}</span>
            {ticket.priority === 'Critical' && <span className="md:hidden text-brick font-semibold"> · Kritično</span>}
            {overdue && <span className="md:hidden text-brick font-semibold"> · Rok istekao</span>}
          </div>
        </td>
        <td className="hidden sm:table-cell">{ticket.unit}</td>
        <td><span className={`tag ${ticket.status === 'Rešeno' ? 'tag-sage' : 'tag-gold'}`}>{ticket.status}</span></td>
        <td className="hidden md:table-cell"><span className={`tag ${ticket.priority === 'Critical' ? 'tag-brick' : 'tag-gold'}`}>{priorityLabel(ticket.priority)}</span></td>
        <td className={`hidden md:table-cell ${overdue ? 'text-brick font-semibold' : ''}`}>{ticket.due_at ? formatDate(ticket.due_at) : '—'}</td>
        <td className="hidden lg:table-cell">{assignee}</td>
        <td className="text-right pr-4">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            className="btn btn-outline !px-3 !py-1.5 !text-[11px]"
          >
            {open ? <ChevronDown size={13} className="rotate-180" /> : <Pencil size={12} />}
            {open ? 'Zatvori' : 'Uredi'}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-cream-2 border-b border-line">
          <td colSpan={7} className="p-4">
            <form onSubmit={(e) => { e.preventDefault(); save(e.currentTarget); }} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="sm:col-span-2"><span className="field-label">Naslov</span><input name="title" defaultValue={ticket.title} required className="field-input" /></label>
              <label><span className="field-label">Kategorija</span><input name="category" defaultValue={ticket.category} className="field-input" /></label>
              <label><span className="field-label">Stan</span><input name="unit" defaultValue={ticket.unit} required className="field-input" /></label>
              <label><span className="field-label">Status</span><select name="status" defaultValue={ticket.status} className="field-input">{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><span className="field-label">Prioritet</span><select name="priority" defaultValue={ticket.priority} className="field-input">{priorities.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}</select></label>
              <label><span className="field-label">Dodeljen</span><select name="assigned_to" defaultValue={ticket.assigned_to ?? ''} className="field-input"><option value="">Nedodeljen</option>{residents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label><span className="field-label">Rok</span><input name="due_at" type="date" defaultValue={ticket.due_at ? ticket.due_at.slice(0, 10) : ''} className="field-input" /></label>
              <label className="sm:col-span-2"><span className="field-label">Opis</span><textarea name="description" defaultValue={ticket.description ?? ''} className="field-input" rows={3} /></label>
              <button disabled={pending} className="btn btn-navy sm:col-span-2 justify-center">{pending ? 'Čuvam…' : 'Sačuvaj problem'}</button>
            </form>
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2"><MessageSquare size={15} />Komentari ({comments.length})</div>
              {comments.map((c) => (
                <div key={c.id} className="text-xs bg-white rounded-lg p-2.5 mb-1.5">
                  <div>{c.body}</div>
                  <div className="text-[10px] text-ink-faint mt-1">{formatDateTime(c.created_at)}</div>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); comment(e.currentTarget); }} className="flex gap-2 mt-2">
                <input name="body" required className="field-input flex-1" placeholder="Dodaj komentar…" />
                <button disabled={pending} className="btn btn-outline">Dodaj</button>
              </form>
            </div>
            {error && <p className="text-brick text-xs mt-2">{error}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
