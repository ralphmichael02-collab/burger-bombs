// frontend/src/config/api.js
const VERCEL_BACKEND_URL = import.meta.env.VITE_API_BASE;

export const API_BASE = VERCEL_BACKEND_URL || '';
export const SOCKET_URL = VERCEL_BACKEND_URL || window.location.origin;