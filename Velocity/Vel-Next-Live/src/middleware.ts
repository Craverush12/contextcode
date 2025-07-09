import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle the welcome-to-velocity route
  if (request.nextUrl.pathname === '/welcome-to-velocity') {
    return NextResponse.next()
  }
}

export const config = {
  matcher: '/welcome-to-velocity',
} 