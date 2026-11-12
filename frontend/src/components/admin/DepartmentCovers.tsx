import React, { useEffect, useState } from 'react';
import { Save, Users } from 'lucide-react';
import { apiClient } from '../../services/api';
import { useSettingsStore } from '../../store/settingsStore';
import { ImageUploader } from './ImageUploader';
import { ImageFramer } from './ImageFramer';

const COLLECTION_SHAPES = [
  { label: 'Banner / slideshow', aspect: '2 / 1' },
  { label: 'Collections tile', aspect: '4 / 3' },
  { label: 'Story', aspect: '1 / 1', round: true }
];

const SHAPES = [
  { label: 'Home tile', aspect: '4 / 5' },
  { label: 'Desktop tile', aspect: '16 / 11' },
  { label: 'Story', aspect: '1 / 1', round: true }
];

type Col = { id: string; name: string; bannerImageUrl?: string | null };

/** Cover photos for Men, Women and every collection (1st Drop…), with upload + zoom & position, all in one place. */
export const DepartmentCovers: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const [men, setMen] = useState('');
  const [women, setWomen] = useState('');
  const [cols, setCols] = useState<Col[]>([]);
  const [colImg, setColImg] = useState<Record<string, string>>({});
  const [changedCols, setChangedCols] = useState<Set<string>>(new Set());
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
    apiClient
      .get('/admin/collections')
      .then((r) => {
        const list: Col[] = r.data.collections || [];
        setCols(list);
        setColImg(Object.fromEntries(list.map((c) => [c.id, c.bannerImageUrl || ''])));
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
      for (const id of changedCols) {
        await apiClient.put(`/admin/collections/${id}`, { bannerImageUrl: (colImg[id] || '').trim() });
      }
      setChangedCols(new Set());
      setDirty(false);
      onSaved?.();
      setMsg('✓ Saved — the shop updates instantly.');
    } catch (err: any) {
      setMsg(err.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const block = (title: string, value: string, set: (v: string) => void, kind: 'dept' | 'col' = 'dept') => (
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
        hint={
          kind === 'dept'
            ? `Cover for the ${title} tile on the homepage. Leave empty to use a ${title.toLowerCase()} product photo automatically.`
            : `Banner for the "${title}" collection: collection page, Collections tile, story bubble and the homepage slideshow (if switched on).`
        }
      />
      {value && (
        <ImageFramer
          value={value}
          shapes={kind === 'dept' ? SHAPES : COLLECTION_SHAPES}
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
          <h2 className="font-bold uppercase tracking-wider text-sm">Cover photos — Men, Women & collections</h2>
        </div>
        <button type="button" onClick={save} disabled={!dirty || busy} className="px-4 py-2 bg-black text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-30">
          <Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : dirty ? 'Save covers' : 'Saved'}
        </button>
      </div>
      {msg && <p className="text-[11px] p-2 bg-neutral-100">{msg}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {block('Men', men, setMen)}
        {block('Women', women, setWomen)}
        {cols.map((c) =>
          <React.Fragment key={c.id}>
            {block(
              c.name,
              colImg[c.id] || '',
              (v) => {
                setColImg((m) => ({ ...m, [c.id]: v }));
                setChangedCols((s) => new Set(s).add(c.id));
              },
              'col'
            )}
          </React.Fragment>
        )}
      </div>
      {dirty && (
        <div className="sticky bottom-3 flex justify-end">
          <button type="button" onClick={save} disabled={busy} className="px-5 py-3 bg-[#FF5400] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'Save covers'}
          </button>
        </div>
      )}
    </div>
  );
};
