import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  AGE_GROUPS,
  getAgeGroupForAge,
  getWeightClassForWeight,
  REGIONS,
  WEIGHT_CLASSES,
} from '../data/regions';
import type {
  AgeGroupId,
  DietPreference,
  LocationId,
  UserProfile,
  WeightClassId,
} from '../types/nutrition';

interface OnboardingBannerProps {
  profile: UserProfile;
  onApplyOnboarding: (next: {
    age: number;
    weightKg: number;
    locationId: LocationId;
    diet: DietPreference;
  }) => void;
  onDismiss: () => void;
}

const DIET_OPTIONS: Array<{ id: DietPreference; label: string }> = [
  { id: 'non-veg', label: 'Non-Veg (All)' },
  { id: 'eggetarian', label: 'Eggetarian' },
  { id: 'vegetarian', label: 'Vegetarian' },
];

export function OnboardingBanner({
  profile,
  onApplyOnboarding,
  onDismiss,
}: OnboardingBannerProps) {
  const [ageGroupId, setAgeGroupId] = useState<AgeGroupId>(getAgeGroupForAge(profile.age).id);
  const [weightClassId, setWeightClassId] = useState<WeightClassId>(
    getWeightClassForWeight(profile.weightKg).id
  );
  const [locationId, setLocationId] = useState<LocationId>(profile.locationId);
  const [diet, setDiet] = useState<DietPreference>(profile.diet ?? 'non-veg');

  const handleApply = () => {
    const agePreset = AGE_GROUPS.find((g) => g.id === ageGroupId) ?? AGE_GROUPS[1];
    const weightPreset =
      WEIGHT_CLASSES.find((w) => w.id === weightClassId) ?? WEIGHT_CLASSES[2];

    onApplyOnboarding({
      age: agePreset.defaultAge,
      weightKg: weightPreset.defaultWeightKg,
      locationId,
      diet,
    });
  };

  return (
    <section
      aria-label="Quick Plan Personalization"
      className="bg-white border border-teal-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            <span>10-Second Plan Setup</span>
          </div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Tailor Meals, Portions & Local Market Prices to You
          </h2>
          <p className="text-xs text-slate-600">
            Automatically matches daily calories, hormonal micronutrient targets, and regional grocery costs.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss quick setup"
          className="p-2 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="block text-[11px] font-medium text-slate-600 mb-1">Age Group</span>
          <select
            value={ageGroupId}
            onChange={(e) => setAgeGroupId(e.target.value as AgeGroupId)}
            className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {AGE_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] font-medium text-slate-600 mb-1">Weight Class</span>
          <select
            value={weightClassId}
            onChange={(e) => setWeightClassId(e.target.value as WeightClassId)}
            className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {WEIGHT_CLASSES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] font-medium text-slate-600 mb-1">
            City / Local Markets
          </span>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value as LocationId)}
            className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {Object.values(REGIONS).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] font-medium text-slate-600 mb-1">
            Dietary Preference
          </span>
          <select
            value={diet}
            onChange={(e) => setDiet(e.target.value as DietPreference)}
            className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {DIET_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDismiss}
          className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
        >
          Keep Current Defaults
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          Apply & Scale My Plan
        </button>
      </div>
    </section>
  );
}
