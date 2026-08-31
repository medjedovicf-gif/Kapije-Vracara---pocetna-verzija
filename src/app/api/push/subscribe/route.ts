import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  const body = await request.json() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) return NextResponse.json({ error: 'Neispravna push pretplata.' }, { status: 400 });
  const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth } as never, { onConflict: 'endpoint' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  const body = await request.json() as { endpoint?: string };
  if (body.endpoint) await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', body.endpoint);
  return NextResponse.json({ success: true });
}
