// frontend/src/config/api.js

// Grab the Render URL from Vercel environment variables (if it exists)
const VERCEL_BACKEND_URL = import.meta.env.VITE_API_BASE;

/**
 * API_BASE handles standard HTTP requests.
 * On Vercel: Uses the Render URL.
 * On Local: Uses relative paths (Vite proxies to port 5174).
 */
export const API_BASE = VERCEL_BACKEND_URL || '';

/**
 * SOCKET_URL handles WebSocket connections.
 * On Vercel: Uses the Render URL (wss://).
 * On Local: Connects directly to port 5174 (bypasses Vite).
 */
export const SOCKET_URL = VERCEL_BACKEND_URL || `http://${window.location.hostname}:5174`;

/**
 * safeFetch prevents the app from crashing if the backend returns HTML 
 * (e.g., a 404 page, a 500 error, or Render's "waking up" page).
 * It ensures the response is actually JSON before parsing it.
 */
export async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    
    // Check if the response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Backend is offline or restarting. Please refresh the page.');
    }
    
    return res;
  } catch (err) {
    throw err;
  }
}