import type { LocationId } from '../types/nutrition';
import { REGIONS } from '../data/regions';

export function isImperialRegion(locationId: LocationId): boolean {
  return REGIONS[locationId]?.weightSystem === 'imperial';
}

export function formatWeight(grams: number, locationId: LocationId): string {
  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  if (region.weightSystem === 'imperial') {
    const oz = grams / 28.3495;
    if (oz >= 16) return `${(grams / 453.592).toFixed(2)} lb`;
    return `${Math.round(oz)} oz`;
  }
  const kg = grams / 1000;
  if (kg >= 1) return `${Math.round(kg * 10) / 10} kg`;
  return `${Math.round(grams)} g`;
}
