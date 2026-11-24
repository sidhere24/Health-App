import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { REGIONS } from '../data/regions';
import type {
  ActivityLevel,
  DietPreference,
  GoalMode,
  LocationId,
  UserProfile,
} from '../types/nutrition';
interface OnboardingWizardProps {
  profile: UserProfile;
  onApplyOnboarding: (next: {
    age: number;
    weightKg: number;
    locationId: LocationId;
    diet: DietPreference;
    goal: GoalMode;
    dailyBudgetInr: number;
  }) => void;
  onSkip: () => void;
}

const GOAL_OPTIONS: Array<{ id: GoalMode; label: string }> = [
  { id: 'recomp', label: 'Hormonal Recomp' },
  { id: 'fat-loss', label: 'Lean Fat Loss' },
  { id: 'lean-gain', label: 'Lean Mass Gain' },
];

const DIET_OPTIONS: Array<{ id: DietPreference; label: string }> = [
  { id: 'non-veg', label: 'Non-Veg (All)' },
  { id: 'eggetarian', label: 'Eggetarian' },
  { id: 'vegetarian', label: 'Vegetarian' },
];

const ACTIVITY_OPTIONS: Array<{ id: ActivityLevel; label: string }> = [
  { id: 'moderate', label: 'Moderate (3d/wk)' },
  { id: 'active', label: 'Active (4–5d/wk)' },
  { id: 'athlete', label: 'High Volume (6d/wk)' },
];

const STEPS = [
  { title: 'Your zone' },
  { title: 'Body basics' },
  { title: 'Goals & preferences' },
];

export function OnboardingWizard({
  profile,
  onApplyOnboarding,
  onSkip,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [locationId, setLocationId] = useState<LocationId>(profile.locationId);
  const [age, setAge] = useState(profile.age);
  const [weightKg, setWeightKg] = useState(profile.weightKg);
  const [heightCm, setHeightCm] = useState(profile.heightCm);
  const [goal, setGoal] = useState<GoalMode>(profile.goal);
  const [diet, setDiet] = useState<DietPreference>(profile.diet ?? 'non-veg');
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity);
  const [budget, setBudget] = useState(profile.dailyBudgetInr);

  const region = useMemo(
    () => REGIONS[locationId] ?? REGIONS.hyderabad,
    [locationId]
  );

  const numField = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    min: number,
    max: number,
    stepNum = 1
  ) => (
    <label className="block">
      <span className="block text-[11px] font-medium text-slate-600 mb-1">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={stepNum}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="w-full px-3 py-2 min-h-[42px] text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
      />
    </label>
  );

  const stepBody =
    step === 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="wizard-step-0">
        <label className="block">
          <span className="block text-[11px] font-medium text-slate-600 mb-1">City / Local Markets</span>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value as LocationId)}
            className="w-full px-3 py-2 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {Object.values(REGIONS).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="block text-[11px] font-medium text-slate-600 mb-1">Daily Budget</span>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-600">{region.currencySymbol}</span>
            <input
              type="range"
              min={region.minBudget}
              max={region.maxBudget}
              step={region.budgetStep}
              value={budget}
              aria-label="Daily Budget"
              onChange={(e) => setBudget(Number(e.target.value))}
              className="flex-1 accent-teal-700 cursor-pointer"
            />
            <span className="font-mono tabular-nums">{profile.dailyBudgetInr}</span>
          </div>
        </div>
      </div>
    ) : step === 1 ? (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="wizard-step-1">
        {numField('Age (yrs)', age, setAge, 18, 85, 1)}
        {numField('Weight (kg)', weightKg, setWeightKg, 45, 160, 0.1)}
        {numField('Height (cm)', heightCm, setHeightCm, 140, 220, 1)}
      </div>
    ) : step === 2 ? (
      <div className="space-y-3" data-testid="wizard-step-2">
        <label className="block">
          <span className="block text-[11px] font-medium text-slate-600 mb-1">Optimization Goal</span>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as GoalMode)}
            className="w-full px-3 py-2 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {GOAL_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium text-slate-600 mb-1">Dietary Preference</span>
          <select
            value={diet}
            onChange={(e) => setDiet(e.target.value as DietPreference)}
            className="w-full px-3 py-2 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {DIET_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium text-slate-600 mb-1">Training Output</span>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            className="w-full px-3 py-2 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {ACTIVITY_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
    ) : null;

  const canApply = step === 2;

  return (
    <section
      aria-label="First-run personalization wizard"
      role="group"
      className="bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-xl divide-y divide-slate-200 dark:divide-slate-700"
    >
      <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-200">
          <Sparkles className="w-3.5 h-3.5 text-teal-700 dark:text-teal-300" />
          <span>Step {step + 1} of {STEPS.length} · {STEPS[step]?.title}</span>
        </div>
        {stepBody}
      </div>

      <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
        >
          Skip for now
        </button>
        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg transition-colors"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="px-4 py-2 min-h-[40px] text-xs font-medium text-teal-800 bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={!canApply}
              onClick={() =>
                onApplyOnboarding({ age: Math.round(age), weightKg: Math.round(weightKg * 10) / 10, locationId, diet, goal, dailyBudgetInr: budget })
              }
              className="px-4 py-2 min-h-[44px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Generate My Plan
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
