'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Auth from '@/lib/auth';

/**
 * Higher-Order Component for protecting routes
 * Redirects to login page if user is not authenticated
 * 
 * @param {React.Component} Component - The component to be protected
 * @param {Object} options - Configuration options
 * @param {string} options.redirectTo - Path to redirect to if not authenticated (default: '/login')
 * @returns {React.Component} Protected component
 */
export default function withAuth(Component, options = {}) {
  const { redirectTo = '/login' } = options;
  
  return function ProtectedRoute(props) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Get token
          const token = Auth.getToken();
          
          if (!token) {
            router.push(redirectTo);
            return;
          }
          
          // Verify token validity
          const isValid = await Auth.verifyToken(token);
          
          setIsAuthenticated(isValid);
          
          if (!isValid) {
            router.push(`${redirectTo}?reason=invalid_token`);
          }
        } catch (error) {
          console.error('Authentication check error:', error);
          router.push(`${redirectTo}?reason=auth_error`);
        } finally {
          setIsLoading(false);
        }
      };
      
      checkAuth();
      
      // Add event listener for storage changes (in case of logout in another tab)
      const handleStorageChange = (e) => {
        if (e.key === 'token' && !e.newValue) {
          router.push(redirectTo);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }, [router, redirectTo]);

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="text-lg font-medium">Verifying authentication...</div>
            <div className="mt-2 text-sm text-gray-500">Please wait</div>
          </div>
        </div>
      );
    }

    return isAuthenticated ? <Component {...props} /> : null;
  };
}
