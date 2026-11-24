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
  BiologicalSex,
  DietPreference,
  LocationId,
  UserProfile,
  WeightClassId,
} from '../types/nutrition';

interface OnboardingBannerProps {
  profile: UserProfile;
  onApplyOnboarding: (next: {
    sex: BiologicalSex;
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

const SEX_OPTIONS: Array<{ id: BiologicalSex; label: string }> = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'neutral', label: 'Neutral' },
];

export function OnboardingBanner({
  profile,
  onApplyOnboarding,
  onDismiss,
}: OnboardingBannerProps) {
  const [sex, setSex] = useState<BiologicalSex>(profile.sex ?? 'male');
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
      sex,
      age: agePreset.defaultAge,
      weightKg: weightPreset.defaultWeightKg,
      locationId,
      diet,
    });
  };

  return (
    <section
      aria-label="Quick Plan Personalization"
      className="bg-white border border-teal-200/90 rounded-xl p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            <span>Quick Setup · 15 Seconds</span>
          </div>
          <h2 className="font-display text-lg font-semibold text-slate-900 text-balance">
            Personalize Portions, Nutrients & Local Prices for You
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            Calibrates daily calories, essential minerals, and affordable whole-food meals for your
            age, physiology, diet, and city.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss quick setup"
          className="p-2 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div>
          <span className="block text-xs font-medium text-slate-700 mb-1.5">Physiology</span>
          <div
            role="group"
            aria-label="Choose physiology for onboarding"
            className="grid grid-cols-3 p-0.5 bg-slate-100 border border-slate-200 rounded-lg min-h-[44px]"
          >
            {SEX_OPTIONS.map((opt) => {
              const active = sex === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSex(opt.id)}
                  className={`text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1.5">Age Group</span>
          <select
            value={ageGroupId}
            onChange={(e) => setAgeGroupId(e.target.value as AgeGroupId)}
            className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {AGE_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1.5">Weight Range</span>
          <select
            value={weightClassId}
            onChange={(e) => setWeightClassId(e.target.value as WeightClassId)}
            className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {WEIGHT_CLASSES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1.5">
            City / Local Markets
          </span>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value as LocationId)}
            className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {Object.values(REGIONS).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-slate-700 mb-1.5">
            Dietary Preference
          </span>
          <select
            value={diet}
            onChange={(e) => setDiet(e.target.value as DietPreference)}
            className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {DIET_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
        >
          Keep Current Defaults
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-5 py-2.5 min-h-[44px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
        >
          Apply & Scale My Plan
        </button>
      </div>
    </section>
  );
}
