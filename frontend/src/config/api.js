// frontend/src/config/api.js

/**
 * Since Vite is proxying /api and /socket.io, we leave this empty.
 * The browser will just append "/api" to the current URL.
 * E.g., https://burger-bombs-pos.test/api/menu
 */
export const API_BASE = '';

/**
 * Socket.IO needs the explicit origin if we want it to connect properly.
 */
export const SOCKET_URL = window.location.origin;