// frontend/src/utils/roles.js
export const ROLE_LABELS = {
  admin: 'Administrator',
  manager: 'Manager',
  supervisor: 'Supervisor',
  cashier: 'Cashier',
  kitchen: 'Head Chef',
  inventory: 'Inventory Staff',
};

// Which route each role can access
const PAGE_ACCESS = {
  '/pos':     ['admin', 'manager', 'supervisor', 'cashier'],
  '/kitchen': ['admin', 'manager', 'supervisor', 'kitchen'],
  '/kiosk':   ['admin', 'manager', 'supervisor', 'cashier'], // (kiosk itself has no login)
  '/admin':   ['admin', 'manager', 'supervisor', 'inventory'],
};

// Which admin tab each role can see
const ADMIN_TAB_ACCESS = {
  overview:   ['admin', 'manager', 'supervisor'],
  reports:    ['admin', 'manager', 'supervisor'],
  payments:   ['admin', 'manager', 'supervisor'],
  customers:  ['admin', 'manager', 'supervisor'],
  menu:       ['admin', 'manager', 'supervisor'],
  inventory:  ['admin', 'manager', 'supervisor', 'inventory'],
  recipes:    ['admin', 'manager', 'supervisor'],
  categories: ['admin', 'manager', 'supervisor'],
  content:    ['admin', 'manager'],
  settings:   ['admin'],
};

// Where does each role land after login?
export function getDefaultRoute(role) {
  switch (role) {
    case 'cashier': return '/pos';
    case 'kitchen': return '/kitchen';
    case 'inventory': return '/admin';
    default: return '/admin';
  }
}

export function canAccessPage(role, path) {
  const allowed = PAGE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function canAccessTab(role, tab) {
  const allowed = ADMIN_TAB_ACCESS[tab];
  if (!allowed) return false;
  return allowed.includes(role);
}