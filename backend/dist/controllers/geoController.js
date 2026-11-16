import rateLimit from 'express-rate-limit';
import { AppError } from '../middleware/errorHandler.js';
export const geoRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many location lookups. Please type the address instead.' }
});
// India's bounding box (with a little margin).
const inIndia = (lat, lng) => lat >= 6 && lat <= 37.6 && lng >= 68 && lng <= 97.5;
const cache = new Map();
const CACHE_MS = 24 * 60 * 60 * 1000;
const clean = (parts) => {
    const seen = new Set();
    return parts
        .map((p) => (p || '').trim())
        .filter((p) => {
        const k = p.toLowerCase();
        if (!p || seen.has(k))
            return false;
        seen.add(k);
        return true;
    })
        .join(', ');
};
const pin = (v) => (v || '').replace(/\D/g, '').slice(0, 6);
/* ---- Ola Maps / Google (same "address_components" shape) ---- */
function fromComponents(result, source) {
    if (!result)
        return null;
    const comps = result.address_components || [];
    const get = (...types) => comps.find((c) => types.some((t) => (c.types || []).includes(t)))?.long_name || '';
    const city = get('locality') || get('administrative_area_level_3') || get('administrative_area_level_2');
    return {
        line1: clean([get('premise'), get('street_number'), get('route'), get('sublocality_level_2', 'neighborhood')]),
        line2: clean([get('sublocality_level_1', 'sublocality')].filter((x) => x !== city)),
        city,
        state: get('administrative_area_level_1'),
        postalCode: pin(get('postal_code')),
        source
    };
}
async function viaOla(lat, lng, key) {
    const url = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${encodeURIComponent(key)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok)
        throw new Error(`Ola Maps ${r.status}`);
    const j = await r.json();
    return fromComponents(j.results?.[0], 'ola');
}
async function viaGoogle(lat, lng, key) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&region=in&key=${encodeURIComponent(key)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok)
        throw new Error(`Google ${r.status}`);
    const j = await r.json();
    return fromComponents(j.results?.[0], 'google');
}
/* ---- OpenStreetMap Nominatim (free; one request a second) ---- */
let nominatimQueue = Promise.resolve();
let lastNominatim = 0;
async function viaNominatim(lat, lng) {
    const run = async () => {
        const wait = lastNominatim + 1100 - Date.now();
        if (wait > 0)
            await new Promise((r) => setTimeout(r, wait));
        lastNominatim = Date.now();
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
        const r = await fetch(url, {
            headers: { 'User-Agent': 'LEVIX store checkout (https://thelevix.shop)', Referer: 'https://thelevix.shop/' },
            signal: AbortSignal.timeout(7000)
        });
        if (!r.ok)
            throw new Error(`Nominatim ${r.status}`);
        return r.json();
    };
    const job = nominatimQueue.then(run, run);
    nominatimQueue = job.catch(() => undefined);
    const j = await job;
    const a = j?.address;
    if (!a)
        return null;
    const city = a.city || a.town || a.municipality || a.village || a.city_district || a.county || a.state_district || '';
    const area = a.suburb || a.neighbourhood || a.quarter || a.residential || a.hamlet || '';
    return {
        line1: clean([a.building, a.house_number, a.road, a.neighbourhood !== area ? a.neighbourhood : '']),
        line2: clean([area].filter((x) => x !== city)),
        city,
        state: a.state || a.territory || '',
        postalCode: pin(a.postcode),
        source: 'osm'
    };
}
export async function reverseGeocode(req, res) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
        throw new AppError('Location is missing.', 400);
    if (!inIndia(lat, lng))
        throw new AppError('We deliver only within India. Please type your address.', 422);
    // ~11 m grid, so nearby taps share one lookup.
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) {
        res.json({ address: hit.value });
        return;
    }
    const ola = process.env.OLA_MAPS_API_KEY?.trim();
    const google = process.env.GOOGLE_MAPS_API_KEY?.trim();
    let address = null;
    const tries = [];
    if (ola)
        tries.push(() => viaOla(lat, lng, ola));
    if (google)
        tries.push(() => viaGoogle(lat, lng, google));
    tries.push(() => viaNominatim(lat, lng));
    for (const t of tries) {
        try {
            address = await t();
            if (address && (address.city || address.postalCode))
                break;
        }
        catch (err) {
            console.warn('Reverse geocode failed:', err?.message || err);
        }
    }
    if (!address || !(address.city || address.postalCode)) {
        throw new AppError('Could not find an address for this spot. Please type it in.', 502);
    }
    if (cache.size > 5000)
        cache.clear();
    cache.set(key, { at: Date.now(), value: address });
    res.json({ address });
}
