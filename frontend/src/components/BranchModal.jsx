// frontend/src/components/BranchModal.jsx
import { useState } from 'react';
import { X, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import AddressPicker from './AddressPicker';
import { API_BASE } from '../config/api';

export default function BranchModal({ branch, onSave, onClose }) {
  const isEdit = !!branch?.id;

  const [form, setForm] = useState({
    name: branch?.name || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
    hours: branch?.hours || '',
    lat: branch?.lat ?? 12.4989,
    lng: branch?.lng ?? 124.6377,
    delivery_radius_km: branch?.delivery_radius_km ?? 5.0,
    is_active: branch?.is_active ?? true,
    is_main: branch?.is_main ?? false,
  });

  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handlePickLocation = (addressText, lat, lng) => {
    setShowPicker(false);
    setForm((prev) => ({
      ...prev,
      lat,
      lng,
      // Only auto-fill address if empty
      address: prev.address?.trim() ? prev.address : addressText,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Branch name is required');
    setSaving(true);
    setError(null);
    try {
      const url = isEdit
        ? `${API_BASE}/api/branches/${branch.id}`
        : `${API_BASE}/api/branches`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          delivery_radius_km: parseFloat(form.delivery_radius_km),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSave(data.branch);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden max-h-[92vh] flex flex-col">
          <div className="p-4 border-b border-border bg-background flex justify-between items-center shrink-0">
            <h3 className="text-lg font-bold text-text flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              {isEdit ? 'Edit Branch' : 'Add New Branch'}
            </h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-text-muted">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            <div>
              <label className="text-xs font-bold text-text-muted uppercase">Branch Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Catarman Downtown"
                className="w-full border border-border p-2.5 rounded-lg mt-1 bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted uppercase">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g. Rizal St, Catarman"
                className="w-full border border-border p-2.5 rounded-lg mt-1 bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-text-muted uppercase">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+63 912 000 0000"
                  className="w-full border border-border p-2.5 rounded-lg mt-1 bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-muted uppercase">Hours</label>
                <input
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  placeholder="10AM-10PM"
                  className="w-full border border-border p-2.5 rounded-lg mt-1 bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-muted uppercase">Delivery Radius (km)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={form.delivery_radius_km}
                onChange={(e) => setForm({ ...form, delivery_radius_km: e.target.value })}
                className="w-full border border-border p-2.5 rounded-lg mt-1 bg-background text-text text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="bg-background border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-sm text-text">Location</p>
                  <p className="text-xs text-text-muted font-mono">
                    {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
                  </p>
                </div>
                <button
                  onClick={() => setShowPicker(true)}
                  className="bg-primary text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-primary-hover transition"
                >
                  Pick on Map
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-bold text-text">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_main}
                  onChange={(e) => setForm({ ...form, is_main: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-bold text-text">Main Branch</span>
              </label>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger p-2 rounded-lg text-sm font-bold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-surface flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-background border border-border text-text-muted font-bold rounded-lg hover:bg-gray-100 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {saving ? 'Saving…' : <><CheckCircle size={16} /> Save</>}
            </button>
          </div>
        </div>
      </div>

      {showPicker && (
        <AddressPicker
          initialPosition={{ lat: Number(form.lat), lng: Number(form.lng) }}
          title="Pick Branch Location"
          enableSearch={true}
          onConfirm={handlePickLocation}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}