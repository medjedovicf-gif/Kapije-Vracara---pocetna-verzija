'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function AdminModal({ title, onClose, children, width = 'sm:w-[620px]' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[300] sm:p-5" onClick={onClose}>
      <div
        className={`bg-cream rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full ${width} max-w-full max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overscroll-contain pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-soft`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-[19px] font-semibold text-navy-950">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Zatvori" className="w-8 h-8 rounded-full border border-line bg-white flex items-center justify-center">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
