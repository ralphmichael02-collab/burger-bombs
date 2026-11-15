import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const COLOR_LABELS = {
  primary:      'Primary (buttons, accents)',
  primaryHover: 'Primary Hover',
  background:   'Background',
  surface:      'Surface (cards)',
  text:         'Text',
  textMuted:    'Muted Text',
  border:       'Borders',
  success:      'Success',
  danger:       'Danger',
};

export default function Settings() {
  const { theme, updateMode, updateColor, resetTheme } = useTheme();
  const [toast, setToast] = useState('');

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* THEME MODE */}
      <section className="bg-surface rounded-lg shadow p-4 mb-6 border border-border">
        <h2 className="font-bold mb-3">Theme Mode</h2>
        <div className="flex gap-2">
          {['light', 'dark', 'custom'].map((mode) => (
            <button
              key={mode}
              onClick={() => { updateMode(mode); flash('Theme saved'); }}
              className={`px-4 py-2 rounded capitalize font-medium ${
                theme.mode === mode
                  ? 'bg-primary text-white'
                  : 'bg-background text-text border border-border hover:bg-primary-hover hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-sm text-text-muted mt-2">
          Current: <b>{theme.mode}</b>
        </p>
      </section>

      {/* CUSTOM COLORS — only visible in custom mode */}
      {theme.mode === 'custom' && (
        <section className="bg-surface rounded-lg shadow p-4 mb-6 border border-border">
          <h2 className="font-bold mb-3">Custom Colors</h2>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(theme.colors).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => { updateColor(key, e.target.value); flash('Color saved'); }}
                  className="w-12 h-10 rounded cursor-pointer border border-border"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{COLOR_LABELS[key] || key}</div>
                  <div className="text-xs text-text-muted font-mono">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RESET */}
      <button
        onClick={() => { resetTheme(); flash('Reset to default'); }}
        className="w-full bg-danger text-white py-2 rounded font-bold"
      >
        Reset to Default
      </button>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-success text-white px-4 py-2 rounded shadow">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}