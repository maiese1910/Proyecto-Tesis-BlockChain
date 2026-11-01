import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE DE AUTENTICACIÓN Y ONBOARDING PROGRESIVO (NEXT.JS 16)
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. Renueva la sesión de Supabase Auth en cookies seguras (httpOnly).
 * 2. Protege rutas privadas (/dashboard, /ocr, /blockchain, etc.).
 * 3. Detecta si el graduando tiene Cédula registrada en `public.perfiles`.
 * 4. Si no tiene Cédula, fuerza la redirección obligatoria a /onboarding.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
      },
    }
  );

  // Validar sesión criptográfica oficial
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isProtectedRoute = pathname.startsWith('/dashboard') ||
                           pathname.startsWith('/ocr') ||
                           pathname.startsWith('/blockchain') ||
                           pathname.startsWith('/pub') ||
                           pathname.startsWith('/admin');

  // Caso 1: Visitante no autenticado intenta entrar a área privada
  if (!user && (isProtectedRoute || isOnboardingRoute)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Caso 2: Usuario autenticado
  if (user) {
    // Si ya está autenticado y va a /login, llevar a /dashboard
    if (isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Consultar el estado del perfil legal del graduando en Supabase
    const { data: profile } = await supabase
      .from('perfiles')
      .select('is_profile_complete, is_cedula_locked, cedula')
      .eq('id', user.id)
      .maybeSingle();

    const hasLegalCedula = profile?.is_profile_complete && profile?.cedula;

    // Si NO ha completado la cédula y no está en onboarding -> FORZAR ONBOARDING
    if (!hasLegalCedula && !isOnboardingRoute) {
      return NextResponse.redirect(new URL('/onboarding/completar-datos', request.url));
    }

    // Si YA completó la cédula pero intenta volver a onboarding -> LLEVAR A DASHBOARD
    if (hasLegalCedula && isOnboardingRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

