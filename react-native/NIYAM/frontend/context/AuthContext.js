import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { authStorage } from '../services/authStorage';

const AuthContext = createContext(null);

/**
 * Authentication Provider component.
 * Manages JWT session state, profile fetching, login, registration, and logout flows.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session on app launch
  const restoreSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedToken = await authStorage.getToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }

      setToken(storedToken);

      // Verify token with backend /api/auth/me
      try {
        const currentUser = await authService.getMe();
        setUser(currentUser);
      } catch (err) {
        console.warn('Session restoration failed; token may be expired:', err.message);
        // Token is invalid or expired — purge it
        await authStorage.removeToken();
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.warn('Error during session restoration:', error);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /**
   * Login handler
   */
  const login = async (email, password) => {
    const result = await authService.login({ email, password });
    setUser(result.user);
    setToken(result.token);
    return result;
  };

  /**
   * Register handler
   */
  const register = async (name, email, password) => {
    const result = await authService.register({ name, email, password });
    setUser(result.user);
    setToken(result.token);
    return result;
  };

  /**
   * Logout handler
   */
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  /**
   * Refresh authenticated user profile
   */
  const refreshProfile = async () => {
    try {
      const refreshedUser = await authService.getMe();
      setUser(refreshedUser);
      return refreshedUser;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err.message);
      return null;
    }
  };

  /**
   * Update authenticated user profile (name, avatar)
   */
  const updateProfile = async (updates) => {
    const updatedUser = await authService.updateProfile(updates);
    setUser(updatedUser);
    return updatedUser;
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    refreshProfile,
    updateProfile,
    restoreSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to consume AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
