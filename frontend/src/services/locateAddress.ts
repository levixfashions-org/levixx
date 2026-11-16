import { apiClient } from './api';

export interface LocatedAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  lat: number;
  lng: number;
  accuracy: number;
}

const ALIASES: Record<string, string> = {
  'national capital territory of delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'new delhi': 'Delhi',
  orissa: 'Odisha',
  pondicherry: 'Puducherry',
  'jammu & kashmir': 'Jammu and Kashmir',
  'andaman & nicobar islands': 'Andaman and Nicobar Islands',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  uttaranchal: 'Uttarakhand'
};

/** Map the state name a maps service returns onto our dropdown's spelling. */
export function matchState(raw: string, states: string[]): string {
  const k = (raw || '').trim().toLowerCase();
  if (!k) return '';
  if (ALIASES[k]) return ALIASES[k];
  const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
  const n = norm(k);
  return states.find((s) => norm(s) === n) || states.find((s) => n.includes(norm(s)) || norm(s).includes(n)) || '';
}

const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser can’t share location. Please type your address.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        reject(
          new Error(
            isIOS()
              ? 'Location is blocked. Turn it on in Settings → Privacy & Security → Location Services → Safari Websites, or just type your address.'
              : 'Location is blocked for this site. Tap the lock icon next to the web address → Permissions → Location → Allow, or just type your address.'
          )
        );
      } else if (err.code === err.TIMEOUT) {
        reject(new Error('Finding your location took too long. Please try again near a window, or type your address.'));
      } else {
        reject(new Error('Couldn’t get your location. Check that location (GPS) is on, or type your address.'));
      }
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
}

/** Asks the phone for its location and turns it into an address for the form. */
export async function locateAddress(states: string[]): Promise<LocatedAddress> {
  const pos = await position();
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  const res = await apiClient.get<{ address: { line1: string; line2: string; city: string; state: string; postalCode: string } }>('/geo/reverse', {
    lat: lat.toFixed(6),
    lng: lng.toFixed(6)
  });
  const a = (res as any).data?.address || (res as any).address;
  if (!a) throw new Error('Couldn’t find an address for this spot. Please type it in.');
  return {
    line1: a.line1 || '',
    line2: a.line2 || '',
    city: a.city || '',
    state: matchState(a.state, states),
    postalCode: a.postalCode || '',
    lat,
    lng,
    accuracy: Math.round(accuracy || 0)
  };
}
