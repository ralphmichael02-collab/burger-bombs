// frontend/src/utils/roles.js
export const ROLE_LABELS = {
  admin: 'Administrator',
  manager: 'Manager',
  supervisor: 'Supervisor',
  cashier: 'Cashier',
  kitchen: 'Head Chef',
  inventory: 'Inventory Staff',
  rider: 'Rider',
};

const PAGE_ACCESS = {
  '/pos':     ['admin', 'manager', 'supervisor', 'cashier'],
  '/kitchen': ['admin', 'manager', 'supervisor', 'kitchen'],
  '/kiosk':   ['admin', 'manager', 'supervisor', 'cashier'],
  '/admin':   ['admin', 'manager', 'supervisor', 'inventory'],
  '/rider':   ['admin', 'manager', 'supervisor', 'rider'],
};

const ADMIN_TAB_ACCESS = {
  overview:   ['admin', 'manager', 'supervisor'],
  reports:    ['admin', 'manager', 'supervisor'],
  payments:   ['admin', 'manager', 'supervisor'],
  customers:  ['admin', 'manager', 'supervisor'],
  menu:       ['admin', 'manager', 'supervisor'],
  inventory:  ['admin', 'manager', 'supervisor', 'inventory'],
  recipes:    ['admin', 'manager', 'supervisor'],
  categories: ['admin', 'manager', 'supervisor'],
  branches:   ['admin', 'manager'],
  content:    ['admin', 'manager'],
  settings:   ['admin'],
};

export function getDefaultRoute(role) {
  switch (role) {
    case 'cashier': return '/pos';
    case 'kitchen': return '/kitchen';
    case 'inventory': return '/admin';
    case 'rider': return '/rider';
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