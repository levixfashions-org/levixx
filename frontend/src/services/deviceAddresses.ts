import { Address } from '../types';

/** Guests (not signed in) can keep delivery addresses on this device so they never have to type them again. */
const KEY = 'levix_saved_addresses_v1';
const MAX = 6;

export type SavedAddress = Address & { id: string };

export function loadDeviceAddresses(): SavedAddress[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((a) => a && a.id && a.line1).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function persist(list: SavedAddress[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage blocked */
  }
}

const same = (a: Address, b: Address) =>
  a.line1.trim().toLowerCase() === b.line1.trim().toLowerCase() && a.postalCode.trim() === b.postalCode.trim() && a.fullName.trim().toLowerCase() === b.fullName.trim().toLowerCase();

/** Adds or updates an address (matched by id, or by same name + line 1 + PIN). Returns the new list and the saved id. */
export function upsertDeviceAddress(addr: Address, id?: string | null, makeDefault = false): { list: SavedAddress[]; id: string } {
  let list = loadDeviceAddresses();
  const existing = list.find((a) => (id && a.id === id) || same(a, addr));
  const savedId = existing?.id || `d_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const entry: SavedAddress = { ...addr, id: savedId, isDefault: makeDefault || existing?.isDefault || list.length === 0 };
  list = [entry, ...list.filter((a) => a.id !== savedId)];
  if (entry.isDefault) list = list.map((a) => (a.id === savedId ? a : { ...a, isDefault: false }));
  persist(list);
  return { list, id: savedId };
}

export function removeDeviceAddress(id: string): SavedAddress[] {
  let list = loadDeviceAddresses().filter((a) => a.id !== id);
  if (list.length && !list.some((a) => a.isDefault)) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
  persist(list);
  return list;
}

export function setDeviceDefault(id: string): SavedAddress[] {
  const list = loadDeviceAddresses().map((a) => ({ ...a, isDefault: a.id === id }));
  persist(list);
  return list;
}
