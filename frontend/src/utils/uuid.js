// frontend/src/utils/uuid.js
/**
 * crypto.randomUUID() is only available in a secure context (HTTPS or localhost).
 * On a LAN address like http://192.168.x.x:5175 it is undefined → checkout throws.
 * This polyfill always returns a valid v4 UUID.
 */
export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through to polyfill */
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}