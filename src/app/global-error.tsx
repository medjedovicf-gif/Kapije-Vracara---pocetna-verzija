'use client';

// Poslednja linija odbrane: greška u samom root layout-u. Mora da ima svoj <html>/<body>
// i ne oslanja se na Tailwind/fontove, jer oni možda nisu učitani.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="sr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F6F1E6', color: '#1B1F2A' }}>
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: 'center', background: '#fff', borderRadius: 16, padding: '36px 24px', border: '1px solid #E7E0D2' }}>
            <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Nešto nije u redu</h1>
            <p style={{ fontSize: 14, color: '#6B7080', margin: '0 0 20px' }}>Aplikacija trenutno ne može da se učita. Pokušaj ponovo za par trenutaka.</p>
            <button onClick={reset} style={{ background: '#E4B23C', color: '#10152A', border: 0, borderRadius: 999, padding: '12px 20px', fontWeight: 700, fontSize: 14 }}>
              Pokušaj ponovo
            </button>
            {error?.digest && <p style={{ fontSize: 11, color: '#9A9DA8', marginTop: 18, fontFamily: 'monospace' }}>Kod greške: {error.digest}</p>}
          </div>
        </div>
      </body>
    </html>
  );
}
