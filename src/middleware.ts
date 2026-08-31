import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Koja ruta pripada kojoj/kojim ulogama
const ROLE_HOME: Record<string, string> = {
  resident: '/',
  admin: '/admin',
  superadmin: '/super-admin',
};

function roleAllowed(pathname: string, role: string): boolean {
  if (pathname.startsWith('/admin')) return role === 'admin';
  if (pathname.startsWith('/super-admin')) return role === 'superadmin';
  if (pathname.startsWith('/login')) return true;
  // sve ostalo (Pocetna, Placanja, Mobilnost, Servisni centar, Oglasna tabla) je stanarska teritorija
  return role === 'resident';
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/api/public');

  // Nije ulogovan i pokusava da otvori zasticenu stranicu -> login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Ulogovan je i otvara /login -> posalji ga na njegov home
  if (user && pathname.startsWith('/login')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = profile?.role ?? 'resident';
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role] ?? '/';
    return NextResponse.redirect(url);
  }

  // Ulogovan je ali pokusava da otvori tudju sekciju (npr. stanar otvara /admin) -> vrati ga na njegov home
  if (user && !isPublic) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = profile?.role ?? 'resident';
    if (!roleAllowed(pathname, role)) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role] ?? '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
