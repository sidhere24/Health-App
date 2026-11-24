import type { ConsumedState, PortionMultipliers, WeekPlan } from '../types/nutrition';

export interface SharedPlan {
  weekPlan: WeekPlan;
  multipliers: PortionMultipliers;
  consumed?: ConsumedState;
}

export function encodeShare(data: SharedPlan): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  const chars = Array.from(bytes, (b) => String.fromCharCode(b));
  return btoa(chars.join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(hash: string): SharedPlan | null {
  try {
    const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SharedPlan>;
    if (!data?.weekPlan || !data?.multipliers) return null;
    return {
      weekPlan: data.weekPlan,
      multipliers: data.multipliers,
      consumed: data.consumed,
    };
  } catch {
    return null;
  }
}

export function getShareFromUrl(): SharedPlan | null {
  if (typeof window === 'undefined') return null;
  return decodeShare(window.location.hash.replace(/^#/, ''));
}
