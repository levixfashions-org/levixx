import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { disablePush, enablePush, isPushOn, pushState, type PushState } from '../utils/push';

/** On/off switch for notifications on this device (account page). */
export const PushToggle: React.FC = () => {
  const [state, setState] = useState<PushState>('default');
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(pushState());
    isPushOn().then(setOn);
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
      } else {
        const st = await enablePush();
        setState(st);
        setOn(st === 'granted');
      }
    } finally {
      setBusy(false);
    }
  };

  const note =
    state === 'needs-install'
      ? 'On iPhone, add LEVIX to your Home Screen first (Share → Add to Home Screen), then open it from there to turn this on.'
      : state === 'denied'
        ? 'Notifications are blocked for this site. Allow them in your browser or phone settings for thelevix.shop, then come back.'
        : state === 'unsupported'
          ? "This browser doesn't support notifications. Try Chrome, or install the LEVIX app."
          : on
            ? "You'll get new drops, offers and order updates on this device."
            : 'Get new drops, offers and order updates on this device.';

  const canToggle = state === 'default' || state === 'granted';

  return (
    <div className="p-5 bg-white border border-black/10 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {on ? <Bell className="w-5 h-5 text-[#FF5400]" /> : <BellOff className="w-5 h-5 text-neutral-400" />}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-black">Notifications</h4>
            <p className="text-[11px] text-neutral-500">{on ? 'On for this device' : 'Off'}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Notifications"
          disabled={!canToggle || busy}
          onClick={toggle}
          className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-[#FF5400]' : 'bg-neutral-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      <p className="text-[11px] text-neutral-600 leading-relaxed">{note}</p>
    </div>
  );
};
