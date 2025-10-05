"use client";

import csrfService from "@/lib/services/csrfService";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook for managing CSRF tokens in React components
 * Useful for forms and manual API requests
 */
export function useCSRF() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch CSRF token
  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const newToken = await csrfService.getToken();
      setToken(newToken);
    } catch {
      setError("Failed to fetch CSRF token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh token manually
  const refreshToken = useCallback(async () => {
    csrfService.clearToken();
    await fetchToken();
  }, [fetchToken]);

  // Initialize on mount
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return {
    token,
    loading,
    error,
    refreshToken,
    setToken: (newToken: string) => {
      csrfService.setToken(newToken);
      setToken(newToken);
    },
  };
}

/**
 * Hook for form CSRF protection
 * Returns a hidden input component and token
 */
export function useCSRFForm() {
  const { token, loading, error, refreshToken } = useCSRF();

  const CSRFInput = () =>
    token ? <input type="hidden" name="_csrf_token" value={token} /> : null;

  return {
    token,
    loading,
    error,
    refreshToken,
    CSRFInput,
  };
}
