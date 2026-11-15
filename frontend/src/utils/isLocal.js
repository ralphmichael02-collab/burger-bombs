// frontend/src/utils/isLocal.js
export function isLocalEnvironment() {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;

  // 1. Explicit local hostnames
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  // 2. EnvKit local TLDs
  if (hostname.endsWith('.test') || hostname.endsWith('.local')) return true;

  // 3. Private network IPs (Wi-Fi tablets, kiosks, cashier PCs)
  if (hostname.startsWith('192.168.')) return true;  // Home/office network
  if (hostname.startsWith('10.')) return true;       // Corporate network

  // 4. 172.16.0.0 – 172.31.255.255 (private range)
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return true;

  return false;
}

// Alias for convenience
export const isLocal = isLocalEnvironment;