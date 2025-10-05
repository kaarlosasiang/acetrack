import axios, { AxiosError, AxiosInstance } from "axios";
import { toast } from "sonner";
import APPConfig from "../config";

// CSRF Token Management
class CSRFManager {
  private static token: string | null = null;
  private static lastFetched: number = 0;
  private static readonly TOKEN_LIFETIME = 1000 * 60 * 30; // 30 minutes

  static async getCSRFToken(): Promise<string | null> {
    const now = Date.now();

    // Return cached token if it's still valid
    if (this.token && now - this.lastFetched < this.TOKEN_LIFETIME) {
      return this.token;
    }

    try {
      // Fetch new CSRF token from your backend
      const response = await axios.get(`${APPConfig.API_URL}/api/csrf-token`, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (response.data.success && response.data.csrf_token) {
        this.token = response.data.csrf_token;
        this.lastFetched = now;
        return this.token;
      }
    } catch {
      // Silently handle CSRF token fetch errors
      return null;
    }

    return null;
  }

  static clearToken(): void {
    this.token = null;
    this.lastFetched = 0;
  }

  static setToken(token: string): void {
    this.token = token;
    this.lastFetched = Date.now();
  }
}

const createAPIService = (url = "") => {
  // Set the default API URL properly
  const baseURL = url && url.length > 0 ? url : APPConfig.API_URL;
  const instance: AxiosInstance = axios.create({
    withCredentials: true,
    baseURL,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Add a request interceptor
  instance.interceptors.request.use(async config => {
    // Get the access token
    const access_token = localStorage.getItem("access_token");

    // Add API key header if configured
    if (APPConfig.API_KEY && APPConfig.API_KEY.length > 0) {
      config.headers["x-api-key"] = APPConfig.API_KEY;
    }

    // Add authorization header if token exists
    if (
      access_token &&
      access_token.length > 0 &&
      access_token !== "undefined"
    ) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }

    // Add CSRF token for state-changing operations
    if (
      config.method &&
      ["post", "put", "patch", "delete"].includes(config.method.toLowerCase())
    ) {
      // Skip CSRF for login and register endpoints (they don't require it according to your backend)
      const skipCSRFRoutes = ["/auth/login", "/auth/register", "/scan/"];
      const shouldSkipCSRF = skipCSRFRoutes.some(
        route => config.url?.includes(route) || config.baseURL?.includes(route)
      );

      if (!shouldSkipCSRF) {
        const csrfToken = await CSRFManager.getCSRFToken();
        if (csrfToken) {
          config.headers["X-CSRF-TOKEN"] = csrfToken;
        }
      }
    }

    return config;
  });

  // Add common response error handler
  instance.interceptors.response.use(
    response => {
      // Do something with the response data
      return response;
    },
    async (error: AxiosError & { response: { data: any } }) => {
      if (error?.code === "ERR_NETWORK") {
        toast("Network error. Please check your connection.", {
          action: {
            label: "Dismiss",
            onClick: () => {
              return;
            },
          },
        });
        return Promise.reject(error);
      }

      const originalRequest = error.config as typeof error.config & {
        _retry: boolean;
      };

      // Handle CSRF token errors (403 with CSRF error)
      if (
        error?.response?.status === 403 &&
        error?.response?.data?.error === "CSRF token validation failed"
      ) {
        // Clear current CSRF token
        CSRFManager.clearToken();

        // Set new CSRF token if provided
        if (error.response.data.csrf_token) {
          CSRFManager.setToken(error.response.data.csrf_token);
        }

        // Retry the request with new CSRF token
        if (!originalRequest._retry) {
          originalRequest._retry = true;
          return instance(originalRequest);
        }
      }

      // Handle rate limiting (429)
      if (error?.response?.status === 429) {
        const retryAfter = error.response.headers["retry-after"];
        const resetTime = error.response.data?.rate_limit?.reset_time;

        toast.error(
          `Rate limit exceeded. ${retryAfter ? `Try again in ${retryAfter} seconds.` : resetTime ? `Reset at ${resetTime}` : "Please try again later."}`
        );
        return Promise.reject(error);
      }

      // If the error is a 401 Unauthorized and it's not a retry attempt
      // Also check if it's not a refresh token request to avoid infinite loops
      if (
        error?.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/api/auth/refresh")
      ) {
        originalRequest._retry = true;

        try {
          // Get refresh token
          const refresh_token = localStorage.getItem("refresh_token");

          if (!refresh_token) {
            throw new Error("No refresh token available");
          }

          // Attempt to refresh the access token using your backend's endpoint
          const { data } = await axios.post(
            `${baseURL}/api/auth/refresh`,
            { refresh_token },
            {
              withCredentials: true,
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(APPConfig.API_KEY && { "x-api-key": APPConfig.API_KEY }),
              },
            }
          );

          // Check if the response is successful based on your backend format
          if (data.success && data.data?.access_token) {
            localStorage.setItem("access_token", data.data.access_token);

            // Retry the original request with the new access token
            originalRequest.headers["Authorization"] =
              `Bearer ${data.data.access_token}`;
            return instance(originalRequest);
          } else {
            throw new Error("Failed to refresh token");
          }
        } catch (refreshError: any) {
          // Handle refresh token error - remove tokens and redirect
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");

          // Call logout endpoint to clean up server-side session
          try {
            await axios.post(
              `${baseURL}/api/auth/logout`,
              {},
              {
                withCredentials: true,
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  ...(APPConfig.API_KEY && { "x-api-key": APPConfig.API_KEY }),
                },
              }
            );
          } catch {
            // Logout failed, but continue with redirect
          }

          // Store the session expired message in localStorage
          localStorage.setItem(
            "session_expired_toast",
            "Your session has expired. Please log in again."
          );

          // Redirect to login only if not already there
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }

          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  const buildURL = (method: string): string => {
    // Remove leading slash if present to avoid double slashes
    const cleanMethod = method.startsWith("/") ? method.slice(1) : method;
    return `${baseURL}/${cleanMethod}`;
  };

  const get = async (method: string) => {
    const response = await instance.get(buildURL(method));
    return response;
  };

  const post = async (data: any, method: string) => {
    const response = await instance.post(buildURL(method), data);
    return response;
  };

  const put = async (data: any, method: string) => {
    const response = await instance.put(buildURL(method), data);
    return response;
  };

  const patch = async (data: any, method: string) => {
    const response = await instance.patch(buildURL(method), data);
    return response;
  };

  const remove = async (method: string) => {
    const response = await instance.delete(buildURL(method));
    return response;
  };

  return {
    get,
    post,
    put,
    patch,
    remove,
    instance, // Expose instance for direct use if needed
    csrf: CSRFManager, // Expose CSRF manager for manual token management
  };
};

export default createAPIService;
export { CSRFManager };
