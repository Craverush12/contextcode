'use client';

import { cookies } from 'next/navigation';

// Session duration in milliseconds (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Auth utility functions
const Auth = {
  // Set authentication data
  setAuth: (token, userId, userEmail, userName) => {
    // Store in cookies
    document.cookie = `token=${token}; path=/; max-age=${SESSION_DURATION / 1000}; SameSite=Strict`;
    document.cookie = `userId=${userId}; path=/; max-age=${SESSION_DURATION / 1000}; SameSite=Strict`;
    
    // Also store in localStorage for client-side access
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('userEmail', userEmail || '');
    localStorage.setItem('userName', userName || '');
    localStorage.setItem('sharedLoginTime', new Date().getTime().toString());
  },

  // Get auth token
  getToken: () => {
    // Try to get from cookies first (for server components)
    if (typeof document !== 'undefined') {
      const tokenCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='));
      
      if (tokenCookie) {
        return tokenCookie.split('=')[1];
      }
    }
    
    // Fallback to localStorage (for client components)
    return typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  },

  // Get user ID
  getUserId: () => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = Auth.getToken();
    return !!token;
  },

  // Logout user
  logout: () => {
    // Clear cookies
    document.cookie = 'token=; path=/; max-age=0';
    document.cookie = 'userId=; path=/; max-age=0';
    
    // Clear localStorage
    const keysToRemove = [
      'token',
      'userId',
      'userEmail',
      'userName',
      'sharedUser',
      'firebaseUser',
      'sharedLoginTime',
      'authMethod'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    return true;
  },

  // Verify token with the backend
  verifyToken: async (token) => {
    if (!token) return false;
    
    try {
      const verifyResponse = await fetch(
        "https://thinkvelocity.in/api/api/users/verify-token",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      return verifyResponse.ok;
    } catch (error) {
      console.error("Token verification failed:", error);
      return false;
    }
  }
};

export default Auth; 