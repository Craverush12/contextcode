# Protected Routes Implementation

This document explains how the protected routes have been implemented in the application, focusing on the profile page as an example.

## Implementation Overview

The protection is implemented at two levels:

1. **Server-side protection** using Next.js middleware
2. **Client-side protection** using React hooks and a Higher-Order Component (HOC)

## Server-side Protection with Middleware

The middleware (`src/middleware.js`) intercepts requests to protected routes and verifies authentication before allowing access.

### Key Features:

- Checks for authentication token in cookies
- Redirects unauthenticated users to the login page
- Includes rate limiting for authentication endpoints
- Redirects authenticated users away from login/register pages

### Protected Routes Configuration:

```javascript
// Protected routes that require authentication
const protectedRoutes = [
  '/prompt-box',
  '/profile',  // Profile is explicitly protected
  '/prompt-library'
];

// Middleware matcher configuration
export const config = {
  matcher: [
    '/profile/:path*', 
    '/prompt-box/:path*', 
    '/prompt-library/:path*',
    '/login',
    '/register',
    '/api/auth/:path*'
  ],
};
```

## Client-side Protection

### Direct Implementation (Profile Page)

The profile page (`src/app/profile/page.js`) includes client-side authentication checks:

```javascript
useEffect(() => {
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
  
  // Listen for storage changes (logout in other tabs)
  // ...
}, [router]);
```

### Reusable HOC Implementation

A Higher-Order Component (`src/components/HOC/withAuth.jsx`) provides reusable protection logic:

```javascript
export default function withAuth(Component, options = {}) {
  const { redirectTo = '/login' } = options;
  
  return function ProtectedRoute(props) {
    // Authentication logic
    // ...
    
    return isAuthenticated ? <Component {...props} /> : null;
  };
}
```

An alternative implementation of the profile page using the HOC is available at `src/app/profile/page.hoc.js`.

## Authentication Utility

The `Auth` utility (`src/lib/auth.js`) provides functions for:

- Token management (get, set, verify)
- Authentication status checking
- Logout functionality

## How to Protect a New Route

### 1. Add to Middleware Configuration

```javascript
// In src/middleware.js
const protectedRoutes = [
  // Existing routes
  '/your-new-route'
];

export const config = {
  matcher: [
    // Existing matchers
    '/your-new-route/:path*'
  ],
};
```

### 2. Use the withAuth HOC

```javascript
// In your page component
import withAuth from '@/components/HOC/withAuth';

const YourComponent = () => {
  // Your component logic
};

export default withAuth(YourComponent);
```

### 3. Or Implement Protection Directly

```javascript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Auth from '@/lib/auth';

export default function YourProtectedPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;
  
  return (
    // Your protected content
  );
}
```

## Testing Protected Routes

1. **With Valid Authentication:**
   - Log in and navigate to a protected route
   - The page should load normally

2. **Without Authentication:**
   - Clear cookies and localStorage
   - Try to access a protected route directly
   - Should be redirected to the login page

3. **With Invalid Token:**
   - Modify the token in localStorage/cookies
   - Try to access a protected route
   - Should be redirected to the login page with an error parameter
