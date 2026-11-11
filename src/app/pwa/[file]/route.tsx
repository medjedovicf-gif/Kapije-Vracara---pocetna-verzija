import { ImageResponse } from 'next/og';

// PNG ikonice za instalaciju aplikacije (PWA) i iOS početni ekran.
// Putanje se završavaju na .png pa ih middleware preskače (rade bez prijave).
const FILES: Record<string, { size: number; maskable: boolean }> = {
  'icon-192.png': { size: 192, maskable: false },
  'icon-512.png': { size: 512, maskable: false },
  'maskable-512.png': { size: 512, maskable: true },
  'apple-icon-180.png': { size: 180, maskable: true },
};

export const dynamic = 'force-static';

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const spec = FILES[file];
  if (!spec) return new Response('Not found', { status: 404 });

  const { size, maskable } = spec;
  // Maskable/iOS: pun kvadrat, znak manji (sistem sam seče ivice). Obična ikonica: zaobljeni kvadrat.
  const mark = Math.round(size * (maskable ? 0.52 : 0.62));
  const radius = maskable ? 0 : Math.round(size * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #1E2748 0%, #10152A 100%)',
          borderRadius: radius,
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 64 64">
          <path d="M12 54 L12 26 Q12 12 32 12 Q52 12 52 26 L52 54" fill="none" stroke="#F6F1E6" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M12 54 L52 54" fill="none" stroke="#F6F1E6" strokeWidth="4.4" strokeLinecap="round" />
          <rect x="27" y="34" width="10" height="20" rx="2" fill="#E4B23C" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
