import { CSRFManager } from "./apiClient";

/**
 * CSRF Service for managing CSRF tokens across the application
 * This service works with your PHP backend's CSRF implementation
 */
class CSRFService {
  /**
   * Get a fresh CSRF token
   */
  async getToken(): Promise<string | null> {
    return await CSRFManager.getCSRFToken();
  }

  /**
   * Clear the current CSRF token (force refresh on next request)
   */
  clearToken(): void {
    CSRFManager.clearToken();
  }

  /**
   * Set a CSRF token manually (e.g., from error response)
   */
  setToken(token: string): void {
    CSRFManager.setToken(token);
  }

  /**
   * Pre-fetch CSRF token for forms or other use cases
   * This is useful when you need a token before making the actual request
   */
  async prefetchToken(): Promise<string | null> {
    const token = await this.getToken();
    if (token) {
      // Store in a meta tag for forms or other use cases
      this.setMetaTag(token);
    }
    return token;
  }

  /**
   * Set CSRF token in meta tag for traditional forms
   */
  private setMetaTag(token: string): void {
    if (typeof document !== "undefined") {
      let metaTag = document.querySelector(
        'meta[name="csrf-token"]'
      ) as HTMLMetaElement;

      if (!metaTag) {
        metaTag = document.createElement("meta");
        metaTag.name = "csrf-token";
        document.head.appendChild(metaTag);
      }

      metaTag.content = token;
    }
  }

  /**
   * Get CSRF token from meta tag
   */
  getTokenFromMeta(): string | null {
    if (typeof document !== "undefined") {
      const metaTag = document.querySelector(
        'meta[name="csrf-token"]'
      ) as HTMLMetaElement;
      return metaTag?.content || null;
    }
    return null;
  }

  /**
   * Initialize CSRF protection (call this on app startup)
   */
  async initialize(): Promise<void> {
    await this.prefetchToken();
  }
}

const csrfService = new CSRFService();
export default csrfService;
