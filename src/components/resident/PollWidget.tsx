'use client';

import { useState, useTransition } from 'react';
import { castVote } from '@/app/actions/polls';
import type { Poll, PollOption } from '@/lib/types';

export function PollWidget({ poll, options, alreadyVoted }: { poll: Poll; options: PollOption[]; alreadyVoted: boolean }) {
  const [voted, setVoted] = useState(alreadyVoted);
  const [localOptions, setLocalOptions] = useState(options);
  const [isPending, startTransition] = useTransition();

  const total = localOptions.reduce((a, o) => a + o.votes, 0) || 1;

  function vote(optionId: number) {
    if (voted || isPending) return;
    startTransition(async () => {
      const result = await castVote(poll.id, optionId);
      if (!result?.error) {
        setLocalOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)));
        setVoted(true);
      }
    });
  }

  return (
    <div className="rounded-md overflow-hidden bg-white border border-line shadow-card">
      <div className="relative h-[150px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=600&q=60"
          alt="Anketa"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
        <span className="absolute bottom-2.5 left-3.5 text-white font-bold text-sm">{poll.title}</span>
      </div>
      <div className="p-4">
        {poll.description && <p className="text-[12.5px] text-ink-soft mb-3.5">{poll.description}</p>}
        {localOptions.map((o) => {
          const pct = Math.round((o.votes / total) * 100);
          return (
            <button
              key={o.id}
              onClick={() => vote(o.id)}
              disabled={voted}
              className={`relative w-full text-left flex items-center justify-between px-3 py-2.5 border rounded-xl mb-2 overflow-hidden ${
                voted ? 'border-navy-950 cursor-default' : 'border-line hover:border-gold-dark cursor-pointer'
              }`}
            >
              {voted && (
                <div className="absolute inset-0 bg-sage-soft" style={{ width: `${pct}%` }} />
              )}
              <span className="relative flex items-center gap-2 text-[12.5px] font-semibold z-10">
                <span
                  className={`w-4 h-4 rounded-full border-[1.6px] inline-block shrink-0 ${
                    voted ? 'border-navy-950 bg-navy-950' : 'border-ink-faint'
                  }`}
                />
                {o.label}
              </span>
              {voted && <span className="relative text-[12.5px] font-semibold z-10">{pct}%</span>}
            </button>
          );
        })}
        <p className="text-[10.5px] text-ink-faint mt-1.5">
          {voted ? 'Već ste glasali — hvala!' : 'Izaberite opciju da glasate.'}
        </p>
      </div>
    </div>
  );
}
