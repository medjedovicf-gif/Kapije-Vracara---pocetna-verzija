import { NextResponse } from 'next/server';

const BASE = 'https://transit.land/api/v2/rest';
const FEED = 'f-sry-cityofbelgradesecretariatforpublictransport';

export async function GET(request: Request) {
  const key = process.env.TRANSITLAND_API_KEY;
  if (!key) return NextResponse.json({ error: 'Transit API nije podešen.', setupRequired: true }, { status: 503 });
  const input = new URL(request.url); const resource = input.searchParams.get('resource'); let path = '';
  if (resource === 'stops') {
    const lat = input.searchParams.get('lat') ?? '44.797'; const lon = input.searchParams.get('lon') ?? '20.475'; const radius = input.searchParams.get('radius') ?? '3500';
    path = `/stops?feed_onestop_id=${FEED}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&radius=${encodeURIComponent(radius)}&include_routes=true&limit=50`;
  } else if (resource === 'routes') path = `/routes?feed_onestop_id=${FEED}&limit=100`;
  else if (resource === 'departures') { const stop = input.searchParams.get('stop'); if (!stop) return NextResponse.json({ error: 'Nedostaje stanica.' }, { status: 400 }); path = `/stops/${encodeURIComponent(stop)}/departures?next=7200&limit=20&include_alerts=true`; }
  else return NextResponse.json({ error: 'Nepoznat transit resource.' }, { status: 400 });
  try {
    const response = await fetch(`${BASE}${path}`, { headers: { apikey: key, accept: 'application/json' }, next: { revalidate: 60 } });
    const body = await response.text();
    return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json', 'cache-control': 's-maxage=60, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ error: 'Transit servis trenutno nije dostupan.' }, { status: 502 });
  }
}
