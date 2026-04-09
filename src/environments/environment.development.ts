export const environment = {
  /** Local API can be slow on first request (JIT, DB); avoid false timeouts. */
  refreshTokenRequestTimeoutMs: 120_000,
  /** Second attempt when cold-start refresh hits TimeoutError (e.g. first .NET request). */
  coldStartRefreshTimeoutMs: 90_000,
  BACKEND_URL: 'http://localhost:5000/api',
  SIGNALR_URL:
    'https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/hubs',
  API_KEY: 'ef306472fbed4ca9835115255241412',
  Google_API: 'AIzaSyB-P9jCEF1RgXzlpslnqI5LQM-3AXmNeVM',
  GOOGLE_CLIENT_ID:
    '830495328853-9jp3r5b2o53124kpu10ais3pq0lljcoj.apps.googleusercontent.com',
  production: true,
};
