/**
 * App configuration
 */
const APPConfig = {
  /**
   * api url endpoint
   * sample: http://localhost:4000/api
   */
  API_URL: process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "",
  API_KEY: process.env.NEXT_PUBLIC_API_KEY
    ? process.env.NEXT_PUBLIC_API_KEY
    : "",
  COOKIE_TIMEOUT: 60 * 60 * 24,
};

export default APPConfig;
