# Todo: Implementing Protected Routes for Profile Page

This document outlines the steps to ensure the `/profile` route is protected and redirects unauthenticated users to the login page.

## Current Implementation Analysis

The project already has:
- A middleware implementation in `src/middleware.js`
- Authentication utilities in `src/lib/auth.js`
- Login functionality that stores tokens in localStorage and cookies

However, the `/profile` route is not fully protected in the middleware configuration.

## Implementation Steps

### 1. Update Middleware Configuration

The middleware already has a configuration for protected routes, but we need to ensure `/profile` is included.

```javascript
// src/middleware.js
export const config = {
  matcher: [
    '/profile/:path*',  // This is already included, but verify
    '/prompt-box/:path*', 
    '/prompt-library/:path*',
    '/login',
    '/register',
    '/api/auth/:path*'
  ],
};
```

### 2. Enhance Auth Verification in Middleware

Update the middleware function to properly protect the profile route:

```javascript
// src/middleware.js
export async function middleware(request) {
  const token = request.cookies.get('token')?.value;
  const isAuthPage = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/register');
    
  // Protected routes that require authentication
  const protectedRoutes = [
    '/prompt-box',
    '/profile',  // Add profile explicitly
    '/prompt-library'
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // If accessing a protected route, verify token
  if (isProtectedRoute) {
    // Only proceed if token exists
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      // Verify token validity
      const verified = await Auth.verifyToken(token);
      if (!verified) {
        return NextResponse.redirect(new URL('/login?reason=invalid_token', request.url));
      }
      
      // Add rate limiting headers to response
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT));
      return response;
    } catch (error) {
      console.error('Middleware auth error:', error);
      return NextResponse.redirect(new URL('/login?reason=auth_error', request.url));
    }
  }

  // Rest of the middleware function...
}
```

### 3. Add Client-Side Protection to Profile Page

For an extra layer of protection, update the Profile page component:

```javascript
// src/app/profile/page.js
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import ProfilePage from '@/components/Pages/ProfilePage';
import Auth from '@/lib/auth';

export default function Profile() {
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    // Check authentication status
    const checkAuth = () => {
      const isAuth = Auth.isAuthenticated();
      setIsAuthenticated(isAuth);
      setIsLoading(false);
      
      if (!isAuth) {
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);
  
  if (!isClient || isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <ProfilePage />
    </Suspense>
  );
}
```

### 4. Implement Token Verification in Auth Utility

Ensure the Auth utility has a proper token verification method:

```javascript
// src/lib/auth.js
// Add this function if it doesn't exist

// Verify token validity
verifyToken: async (token) => {
  if (!token) return false;
  
  try {
    // For JWT tokens, you might want to verify the token structure and expiration
    // This is a simple check - in production, you'd want more robust verification
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return false;
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
},
```

### 5. Add a Higher-Order Component for Route Protection (Optional)

For reusable protection across multiple routes:

```javascript
// src/components/HOC/withAuth.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Auth from '@/lib/auth';

export default function withAuth(Component) {
  return function ProtectedRoute(props) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const checkAuth = () => {
        const isAuth = Auth.isAuthenticated();
        setIsAuthenticated(isAuth);
        setIsLoading(false);
        
        if (!isAuth) {
          router.push('/login');
        }
      };
      
      checkAuth();
    }, [router]);

    if (isLoading) {
      return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return isAuthenticated ? <Component {...props} /> : null;
  };
}
```

Then use it like this:

```javascript
// src/app/profile/page.js
'use client';

import { Suspense } from 'react';
import ProfilePage from '@/components/Pages/ProfilePage';
import withAuth from '@/components/HOC/withAuth';

const ProtectedProfilePage = withAuth(() => (
  <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
    <ProfilePage />
  </Suspense>
));

export default ProtectedProfilePage;
```

## Testing the Implementation

1. Test with a valid authentication token:
   - Log in and navigate to `/profile`
   - The profile page should load normally

2. Test without authentication:
   - Clear cookies and localStorage
   - Try to access `/profile` directly
   - Should be redirected to `/login`

3. Test with an expired/invalid token:
   - Modify the token in localStorage/cookies to be invalid
   - Try to access `/profile`
   - Should be redirected to `/login?reason=invalid_token`

## Additional Considerations

1. **Error Handling**: Add proper error messages on the login page to explain why the user was redirected
2. **Session Management**: Consider implementing session timeout and refresh token functionality
3. **Security**: Ensure tokens are stored securely and transmitted over HTTPS
4. **User Experience**: Add loading states during authentication checks
