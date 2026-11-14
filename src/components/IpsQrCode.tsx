'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** IPS QR kod (NBS) za plaćanje skeniranjem u m-banking aplikaciji. */
export function IpsQrCode({ payload, size = 168 }: { payload: string; size?: number }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#10152A', light: '#FFFFFF' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => { alive = false; };
  }, [payload]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        role="img"
        aria-label="IPS QR kod za plaćanje"
        className="bg-white rounded-[10px] border border-line p-1.5 [&>svg]:w-full [&>svg]:h-full"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="text-[10px] font-mono uppercase tracking-wide text-ink-faint">IPS Skeniraj</span>
    </div>
  );
}
