import { NextResponse, type NextRequest } from 'next/server';
import { getMyProfile } from '@/lib/session';
import { buildReport, EXPORTS, exportCsv, type ExportKind } from '@/lib/finance-report';
import { loadReportData, rangeFromParams } from '../data';

export const dynamic = 'force-dynamic';

/** Izvoz zbirnih tabela u CSV (otvara se u Excelu / Google Sheets). */
export async function GET(req: NextRequest) {
  const me = await getMyProfile();
  if (!me || me.role !== 'admin' || !me.building_id) return NextResponse.json({ error: 'Nemate ovlašćenje.' }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const kind = sp.get('type') as ExportKind;
  if (!kind || !(kind in EXPORTS)) return NextResponse.json({ error: 'Nepoznata tabela.' }, { status: 400 });

  const range = rangeFromParams({ period: sp.get('period') ?? undefined, from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined });
  const report = buildReport(await loadReportData(me.building_id), range);
  const csv = exportCsv(kind, report);
  const fileName = `${EXPORTS[kind]} ${range.from} - ${range.to}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="izvestaj.csv"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
    },
  });
}
