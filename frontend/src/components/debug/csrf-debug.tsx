"use client";

import csrfService from "@/lib/services/csrfService";
import { useEffect, useState } from "react";

export function CSRFDebug() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const csrfToken = await csrfService.getToken();
        setToken(csrfToken);
      } catch {
        setError("Failed to fetch CSRF token");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null; // Only show in development
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "10px",
        borderRadius: "5px",
        fontSize: "12px",
        maxWidth: "300px",
        zIndex: 9999,
      }}
    >
      <div>
        <strong>CSRF Debug:</strong>
      </div>
      {loading && <div>Loading token...</div>}
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      {token && (
        <div>
          <div>Token: {token.substring(0, 20)}...</div>
          <div style={{ color: "green" }}>✓ CSRF Ready</div>
        </div>
      )}
      {!loading && !token && !error && (
        <div style={{ color: "orange" }}>No token available</div>
      )}
    </div>
  );
}
