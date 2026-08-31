'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { sendInvoice } from '@/app/actions/invoices';

export function SendInvoiceButton({ unit, buildingId, amount }: { unit: string; buildingId: string; amount: number }) {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await sendInvoice(unit, buildingId, amount);
      if (!result?.error) {
        setSent(true);
        setTimeout(() => setSent(false), 2500);
      }
    });
  }

  return (
    <button onClick={handle} disabled={isPending} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: 12 }}>
      <Send size={13} />
      {isPending ? 'Šalje se…' : sent ? 'Poslato!' : 'Pošalji fakturu'}
    </button>
  );
}
