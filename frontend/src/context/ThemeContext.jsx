import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const DEFAULT_THEME = {
  mode: 'light',
  colors: {
    primary:       '#EA580C',
    primaryHover:  '#C2410C',
    background:    '#FDFBF7',
    surface:       '#FFFFFF',
    text:          '#1A1C23',
    textMuted:     '#6B7280',
    border:        '#E5E7EB',
    success:       '#45C65A',
    danger:        '#EA001E',
  },
};

export const PRESET_THEMES = [
  { 
    name: 'Enterprise Orange', 
    colors: { primary: '#EA580C', primaryHover: '#C2410C', background: '#FDFBF7', surface: '#FFFFFF', text: '#1A1C23', textMuted: '#6B7280', border: '#E5E7EB', success: '#45C65A', danger: '#EA001E' }
  },
  { 
    name: 'Midnight Slate', 
    colors: { primary: '#3b82f6', primaryHover: '#2563eb', background: '#0f172a', surface: '#1e293b', text: '#f8fafc', textMuted: '#94a3b8', border: '#334155', success: '#22C55E', danger: '#EF4444' }
  },
  { 
    name: 'Fresh Bistro', 
    colors: { primary: '#10b981', primaryHover: '#059669', background: '#f0fdf4', surface: '#ffffff', text: '#064e3b', textMuted: '#4b5563', border: '#d1fae5', success: '#16A34A', danger: '#DC2626' }
  },
  { 
    name: 'Ocean Breeze', 
    colors: { primary: '#0ea5e9', primaryHover: '#0284c7', background: '#f0f9ff', surface: '#ffffff', text: '#0f172a', textMuted: '#64748b', border: '#e0f2fe', success: '#10b981', danger: '#ef4444' }
  },
  { 
    name: 'Berry Smoothie', 
    colors: { primary: '#d946ef', primaryHover: '#c026d3', background: '#fdf4ff', surface: '#ffffff', text: '#4a044e', textMuted: '#86198f', border: '#fae8ff', success: '#10b981', danger: '#e11d48' }
  },
  { 
    name: 'Golden Bakery', 
    colors: { primary: '#eab308', primaryHover: '#ca8a04', background: '#fefce8', surface: '#ffffff', text: '#422006', textMuted: '#854d0e', border: '#fef08a', success: '#22c55e', danger: '#ef4444' }
  },
  { 
    name: 'Forest Retreat', 
    colors: { primary: '#15803d', primaryHover: '#166534', background: '#f0fdf4', surface: '#ffffff', text: '#14532d', textMuted: '#4b5563', border: '#bbf7d0', success: '#22c55e', danger: '#ef4444' }
  },
  { 
    name: 'Crimson Luxe', 
    colors: { primary: '#be123c', primaryHover: '#9f1239', background: '#fff1f2', surface: '#ffffff', text: '#4c0519', textMuted: '#9f1239', border: '#fecdd3', success: '#10b981', danger: '#e11d48' }
  }
];

const STORAGE_KEY = 'burger-bombs-theme-v1';
const toKebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_THEME;
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode || 'light',
        colors: { ...DEFAULT_THEME.colors, ...(parsed.colors || {}) },
      };
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
      console.warn('[theme] could not save', e);
    }
    applyTheme(theme);
  }, [theme]);

  const updateMode = (mode) => {
    setTheme((p) => {
      if (mode !== 'custom') return { ...p, mode };
      return { ...p, mode: 'custom', colors: { ...p.colors } };
    });
  };

  const updateColor = (key, value) =>
    setTheme((p) => ({
      ...p,
      mode: 'custom',
      colors: { ...p.colors, [key]: value },
    }));

  const applyPreset = (colors) => 
    setTheme((p) => ({ ...p, mode: 'custom', colors: { ...colors } }));

  const resetTheme = () => setTheme(DEFAULT_THEME);

  return (
    <ThemeContext.Provider value={{ theme, updateMode, updateColor, applyPreset, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme.mode === 'light' || theme.mode === 'dark') {
    root.setAttribute('data-theme', theme.mode);
  } else {
    root.removeAttribute('data-theme');
  }
  Object.keys(DEFAULT_THEME.colors).forEach((k) => {
    root.style.removeProperty(`--color-${toKebab(k)}`);
  });
  if (theme.mode === 'custom') {
    Object.entries(theme.colors).forEach(([k, v]) => {
      root.style.setProperty(`--color-${toKebab(k)}`, v);
    });
  }
}