import React, { useEffect, useState } from 'react';
import { Save, Users } from 'lucide-react';
import { apiClient } from '../../services/api';
import { useSettingsStore } from '../../store/settingsStore';
import { ImageUploader } from './ImageUploader';
import { ImageFramer } from './ImageFramer';

const SHAPES = [
  { label: 'Home tile', aspect: '4 / 5' },
  { label: 'Desktop tile', aspect: '16 / 11' },
  { label: 'Story', aspect: '1 / 1', round: true }
];

/** Cover photos for the Men and Women departments (homepage tiles + story bubbles), with zoom & position. */
export const DepartmentCovers: React.FC = () => {
  const [men, setMen] = useState('');
  const [women, setWomen] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/admin/settings')
      .then((r) => {
        const s = r.data.settings || r.data;
        setMen(s.menCoverImage || '');
        setWomen(s.womenCoverImage || '');
      })
      .catch(() => undefined);
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiClient.put('/admin/settings', { menCoverImage: men.trim(), womenCoverImage: women.trim() });
      const s = r.data.settings || r.data;
      if (s && s.announcementText !== undefined) useSettingsStore.getState().setSettings({ ...useSettingsStore.getState().settings, ...s });
      setDirty(false);
      setMsg('✓ Saved — the shop updates instantly.');
    } catch (err: any) {
      setMsg(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const block = (title: string, value: string, set: (v: string) => void) => (
    <div className="space-y-2">
      <p className="text-[12px] font-black uppercase tracking-wider">{title}</p>
      <ImageUploader
        single
        compact
        value={value ? [value] : []}
        onChange={(urls) => {
          set(urls[0] || '');
          setDirty(true);
        }}
        hint={`Cover for the ${title} tile on the homepage. Leave empty to use a ${title.toLowerCase()} product photo automatically.`}
      />
      {value && (
        <ImageFramer
          value={value}
          shapes={SHAPES}
          onChange={(u) => {
            set(u);
            setDirty(true);
          }}
        />
      )}
    </div>
  );

  return (
    <div className="bg-white border border-black/10 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#FF5400]" />
          <h2 className="font-bold uppercase tracking-wider text-sm">Men & Women covers</h2>
        </div>
        <button type="button" onClick={save} disabled={!dirty || busy} className="px-4 py-2 bg-black text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-30">
          <Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'Save covers'}
        </button>
      </div>
      {msg && <p className="text-[11px] p-2 bg-neutral-100">{msg}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {block('Men', men, setMen)}
        {block('Women', women, setWomen)}
      </div>
    </div>
  );
};
