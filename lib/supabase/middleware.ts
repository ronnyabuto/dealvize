import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/pricing',
    '/blog',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/help'
  ]

  // Public API endpoints that don't require authentication
  const publicApiRoutes = [
    '/api/affiliate/health'
  ]

  // Auth routes
  const authRoutes = [
    '/auth/signin',
    '/auth/signin/',
    '/auth/signup',
    '/auth/signup/',
    '/auth/callback',
    '/auth/callback/',
    '/auth/reset-password',
    '/auth/reset-password/',
    '/auth/error',
    '/auth/error/'
  ]

  // Check if current path is public (marketing pages)
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname === route + '/' || pathname.startsWith('/blog/')
  )

  // Check if current path is a public API endpoint
  const isPublicApiRoute = publicApiRoutes.some(route => 
    pathname === route || pathname === route + '/'
  )

  // Check if current path is an auth route
  const isAuthRoute = authRoutes.includes(pathname)

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && isAuthRoute && pathname !== '/auth/callback') {
    // Get the redirectTo parameter if it exists
    const redirectTo = url.searchParams.get('redirectTo')
    if (redirectTo && redirectTo !== '/auth/signin') {
      url.pathname = redirectTo
      url.searchParams.delete('redirectTo')
    } else {
      url.pathname = '/'
    }
    return NextResponse.redirect(url)
  }

  // If user is not authenticated and trying to access protected routes, redirect to signin
  if (!user && !isPublicRoute && !isPublicApiRoute && !isAuthRoute) {
    url.pathname = '/auth/signin'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // If user is authenticated and on the root path, redirect to dashboard
  if (user && pathname === '/') {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Handle old route redirects for backward compatibility
  const routeRedirects: Record<string, string> = {
    '/analytics/': '/analytics'
  }

  if (routeRedirects[pathname]) {
    url.pathname = routeRedirects[pathname]
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}