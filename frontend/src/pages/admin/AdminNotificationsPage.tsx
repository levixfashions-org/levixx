import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Send, Smartphone, Monitor, Apple, Users, CheckCircle2, AlertTriangle, FlaskConical } from 'lucide-react';
import { AdminNav } from '../../components/admin/AdminNav';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { apiClient } from '../../services/api';
import { enablePush, isPushOn, pushState } from '../../utils/push';

interface Campaign {
  id: string;
  title: string;
  body: string;
  url: string;
  imageUrl?: string | null;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}
interface Overview {
  subscribers: { total: number; android: number; ios: number; desktop: number; signedIn: number };
  campaigns: Campaign[];
}
interface LinkOption {
  label: string;
  value: string;
  group: string;
}

const TEMPLATES = [
  { title: '🔥 New drop is LIVE', body: 'Fresh LEVIX tees just landed. Tap to shop before your size sells out.' },
  { title: '⚡ Limited stock alert', body: 'Only a few pieces left in some sizes. Grab yours now — free delivery on every order.' },
  { title: '🎉 Special offer', body: 'Every tee now ₹549 (MRP ₹799). Free delivery across India. Today only!' }
];

export const AdminNotificationsPage: React.FC = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [custom, setCustom] = useState('');
  const [image, setImage] = useState('');
  const [links, setLinks] = useState<LinkOption[]>([]);
  const [busy, setBusy] = useState<'test' | 'send' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [myDeviceOn, setMyDeviceOn] = useState(false);

  const load = async () => {
    const res = await apiClient.get<Overview>('/admin/push');
    setData(res.data);
  };

  useEffect(() => {
    load().catch((e) => setMsg({ ok: false, text: e.message }));
    isPushOn().then(setMyDeviceOn);
    // Pages a notification can open.
    Promise.all([apiClient.get('/store/home').catch(() => null), apiClient.get('/products', { limit: 100 }).catch(() => null)]).then(([home, prods]) => {
      const opts: LinkOption[] = [
        { label: 'Home page', value: '/', group: 'Pages' },
        { label: 'New in (all products)', value: '/collections/new-in', group: 'Pages' },
        { label: 'Men', value: '/collections/men', group: 'Pages' },
        { label: 'Women', value: '/collections/women', group: 'Pages' },
        { label: 'My orders', value: '/account/orders', group: 'Pages' }
      ];
      (home?.data?.menu?.collections || []).forEach((c: any) => opts.push({ label: c.name, value: `/collections/${c.slug}`, group: 'Collections' }));
      (home?.data?.menu?.categories || []).forEach((c: any) => opts.push({ label: c.name, value: `/collections/${c.slug}`, group: 'Categories' }));
      (prods?.data?.products || []).forEach((p: any) => opts.push({ label: p.name, value: `/products/${p.slug}`, group: 'Products' }));
      setLinks(opts);
    });
  }, []);

  const link = url === '__custom' ? custom.trim() : url;
  const valid = title.trim().length >= 2 && body.trim().length >= 2 && (link.startsWith('/') || link.startsWith('https://'));
  const payload = { title: title.trim(), body: body.trim(), url: link || '/', imageUrl: image || null };
  const groups = useMemo(() => [...new Set(links.map((l) => l.group))], [links]);

  const sendTest = async () => {
    setBusy('test');
    setMsg(null);
    try {
      if (!myDeviceOn) {
        const st = await enablePush();
        if (st !== 'granted') {
          setMsg({
            ok: false,
            text:
              st === 'needs-install'
                ? 'On iPhone, open the installed LEVIX app (Home Screen) to receive notifications.'
                : 'Allow notifications on this device first (browser asked or blocked it).'
          });
          return;
        }
        setMyDeviceOn(true);
      }
      const res = await apiClient.post('/admin/push/test', payload);
      setMsg({ ok: true, text: `Test sent to ${res.data.sent} of your device(s). Check your phone/computer.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(null);
    }
  };

  const sendAll = async () => {
    const n = data?.subscribers.total || 0;
    if (!window.confirm(`Send this notification to ${n} subscriber${n === 1 ? '' : 's'} now? This can't be undone.`)) return;
    setBusy('send');
    setMsg(null);
    try {
      const res = await apiClient.post('/admin/push/send', payload);
      const c = res.data.campaign as Campaign;
      setMsg({ ok: true, text: `Sent to ${c.sentCount} of ${c.targetCount} devices${c.failedCount ? ` (${c.failedCount} could not be reached)` : ''}.` });
      setTitle('');
      setBody('');
      setImage('');
      await load();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(null);
    }
  };

  const s = data?.subscribers;
  const input = 'w-full bg-white border border-black/20 p-2.5 text-sm focus:border-black focus:outline-none';
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1';

  return (
    <div className="min-h-screen bg-[#EFEFEF] pb-24">
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[#FF5400]" />
          <div>
            <h1 className="font-display font-black text-2xl uppercase tracking-tight">Notifications</h1>
            <p className="text-xs text-neutral-600">Send a message straight to the phones and computers of customers who turned on drop alerts.</p>
          </div>
        </div>

        {/* Subscriber stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: Users, label: 'Subscribers', value: s?.total },
            { icon: Smartphone, label: 'Android', value: s?.android },
            { icon: Apple, label: 'iPhone (app)', value: s?.ios },
            { icon: Monitor, label: 'Computer', value: s?.desktop },
            { icon: CheckCircle2, label: 'Signed-in customers', value: s?.signedIn }
          ].map((x) => (
            <div key={x.label} className="bg-white border border-black/10 p-4">
              <x.icon className="w-4 h-4 text-neutral-500" />
              <p className="font-display font-black text-2xl mt-1">{x.value ?? '–'}</p>
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">{x.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Compose */}
          <div className="lg:col-span-3 bg-white border border-black/10 p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 self-center mr-1">Quick start:</span>
              {TEMPLATES.map((t) => (
                <button key={t.title} type="button" onClick={() => { setTitle(t.title); setBody(t.body); }} className="px-2.5 py-1 text-[11px] border border-black/15 hover:border-black rounded-full">
                  {t.title}
                </button>
              ))}
            </div>
            <div>
              <label className={label}>Title <span className="font-normal text-neutral-400">({title.length}/60 best)</span></label>
              <input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="🔥 Drop 2 is LIVE" className={input} />
            </div>
            <div>
              <label className={label}>Message <span className="font-normal text-neutral-400">({body.length}/240)</span></label>
              <textarea maxLength={240} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Krishna Waffle Tee now ₹549 — free delivery. Tap to shop." className={input} />
            </div>
            <div>
              <label className={label}>When they tap it, open</label>
              <select value={url} onChange={(e) => setUrl(e.target.value)} className={input}>
                {groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {links.filter((l) => l.group === g).map((l) => (
                      <option key={g + l.value} value={l.value}>{l.label}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="__custom">Custom link…</option>
              </select>
              {url === '__custom' && <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="/collections/first-drop or https://…" className={`${input} mt-2 font-mono text-xs`} />}
            </div>
            <div>
              <label className={label}>Big picture (optional — shows on Android & computers)</label>
              <ImageUploader single compact value={image ? [image] : []} onChange={(urls) => setImage(urls[0] || '')} hint="Wide photo works best (2:1). iPhone shows the LEVIX icon only." />
            </div>

            {msg && (
              <div className={`p-3 text-xs flex items-start gap-2 ${msg.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={sendTest} disabled={!valid || !!busy} className="px-4 py-2.5 border border-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-40">
                <FlaskConical className="w-4 h-4" /> {busy === 'test' ? 'Sending…' : 'Send test to me'}
              </button>
              <button type="button" onClick={sendAll} disabled={!valid || !!busy || !s?.total} className="px-5 py-2.5 bg-[#FF5400] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-40">
                <Send className="w-4 h-4" /> {busy === 'send' ? 'Sending…' : `Send to all ${s?.total ?? 0}`}
              </button>
            </div>
            <p className="text-[10.5px] text-neutral-500">
              Tip: send a test first. "Send test to me" goes only to devices where you're signed in as admin with notifications on
              {pushState() === 'granted' && myDeviceOn ? ' (this device is ready ✓)' : ''}.
            </p>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2 space-y-3">
            <p className={label}>Preview</p>
            <div className="rounded-[28px] bg-gradient-to-b from-neutral-800 to-neutral-900 p-4 shadow-xl">
              <p className="text-center text-white/70 text-[11px] font-semibold mb-3">12:30</p>
              <div className="rounded-2xl bg-white/90 backdrop-blur p-3 shadow">
                <div className="flex items-center gap-2 mb-1.5">
                  <img src="/icons/icon-192.png" alt="" className="w-5 h-5 rounded-md" />
                  <span className="text-[10.5px] font-semibold text-neutral-600 uppercase tracking-wide">LEVIX · thelevix.shop</span>
                  <span className="ml-auto text-[10px] text-neutral-500">now</span>
                </div>
                <p className="text-[13px] font-bold text-black leading-snug">{title || 'Your title'}</p>
                <p className="text-[12px] text-neutral-700 leading-snug mt-0.5 line-clamp-3">{body || 'Your message shows here.'}</p>
                {image && <img src={image.split('#')[0]} alt="" className="mt-2 w-full aspect-[2/1] object-cover rounded-lg" />}
              </div>
            </div>
            <p className="text-[10.5px] text-neutral-500">Opens: <span className="font-mono">{link || '/'}</span></p>
          </div>
        </div>

        {/* History */}
        <div className="bg-white border border-black/10">
          <div className="px-5 py-3 border-b border-black/10 font-bold text-xs uppercase tracking-wider">Sent notifications</div>
          {!data?.campaigns.length ? (
            <p className="px-5 py-8 text-center text-xs text-neutral-500">Nothing sent yet.</p>
          ) : (
            <div className="divide-y divide-black/5">
              {data.campaigns.map((c) => (
                <div key={c.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs">
                  <span className="text-neutral-500 font-mono w-36 flex-shrink-0">{new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span className="flex-1">
                    <b>{c.title}</b> — <span className="text-neutral-600">{c.body}</span>
                  </span>
                  <span className="font-mono text-[11px] whitespace-nowrap">
                    ✓ {c.sentCount}/{c.targetCount}
                    {c.failedCount ? <span className="text-red-600"> · {c.failedCount} failed</span> : null}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
