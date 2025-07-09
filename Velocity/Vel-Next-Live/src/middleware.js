import { NextResponse } from "next/server";

// Import the Auth utility for token verification
import Auth from "./lib/auth";

// Rate limiting settings
const RATE_LIMIT = 100; // Requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory store for rate limiting (consider using Redis in production)
const rateLimitStore = new Map();

export async function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");

  // Protected routes that require authentication
  const protectedRoutes = [
    "/prompt-box",
    "/profile", // Add profile explicitly
    "/prompt-library",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Handle welcome-to-velocity route
  if (request.nextUrl.pathname === "/welcome-to-velocity") {
    return NextResponse.next();
  }

  // Apply rate limiting for authentication endpoints
  if (request.nextUrl.pathname.startsWith("/api/auth") || isAuthPage) {
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const currentTime = Date.now();

    // Initialize or get rate limit data for this IP
    if (!rateLimitStore.has(clientIp)) {
      rateLimitStore.set(clientIp, {
        count: 0,
        resetAt: currentTime + RATE_WINDOW,
      });
    }

    const rateLimitData = rateLimitStore.get(clientIp);

    // Reset count if window expired
    if (currentTime > rateLimitData.resetAt) {
      rateLimitData.count = 0;
      rateLimitData.resetAt = currentTime + RATE_WINDOW;
    }

    // Increment count
    rateLimitData.count++;

    // Check if rate limit exceeded
    if (rateLimitData.count > RATE_LIMIT) {
      return new NextResponse(
        JSON.stringify({ message: "Rate limit exceeded" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(RATE_LIMIT),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(
              Math.ceil(rateLimitData.resetAt / 1000)
            ),
          },
        }
      );
    }
  }

  // If accessing a protected route, verify token
  if (isProtectedRoute) {
    try {
      // Only proceed if token exists
      if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      // Verify token validity
      const verified = await Auth.verifyToken(token);
      if (!verified) {
        return NextResponse.redirect(
          new URL("/login?reason=invalid_token", request.url)
        );
      }

      // Add rate limiting headers to response
      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
      return response;
    } catch (error) {
      console.error("Middleware auth error:", error);
      return NextResponse.redirect(
        new URL("/login?reason=auth_error", request.url)
      );
    }
  }

  // If accessing auth pages with a valid token, redirect to profile
  if (isAuthPage && token) {
    try {
      const verified = await Auth.verifyToken(token);
      if (verified) {
        return NextResponse.redirect(new URL("/profile", request.url));
      }
    } catch (error) {
      // If token verification fails, continue to auth page
      console.error("Auth page token verification error:", error);
    }
  }

  return NextResponse.next();
}

// Add any paths that should be matched by this middleware
export const config = {
  matcher: [
    "/profile/:path*",
    "/prompt-box/:path*",
    "/prompt-library/:path*",
    "/login",
    "/register",
    "/api/auth/:path*",
    "/welcome-to-velocity", // Add the welcome-to-velocity route
  ],
};
