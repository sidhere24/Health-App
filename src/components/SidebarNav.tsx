import { useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Leaf,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  AGE_GROUPS,
  getAgeGroupForAge,
  getWeightClassForWeight,
  REGIONS,
  WEIGHT_CLASSES,
} from '../data/regions';
import type {
  ActivityLevel,
  AgeGroupId,
  AllergenId,
  BiologicalSex,
  DietPreference,
  GoalMode,
  LocationId,
  UserProfile,
  WeightClassId,
} from '../types/nutrition';
import { ALLERGEN_OPTIONS } from '../utils/nutrition';

export type ActiveTab = 'overview' | 'weekly' | 'grocery' | 'labs' | 'foods';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
  onChangeLocation: (locationId: LocationId) => void;
  onChangeDiet: (diet: DietPreference) => void;
  onOpenAffiliateModal: () => void;
  onOpenLegalModal: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string; icon: typeof CheckSquare }[] = [
  { id: 'overview', label: 'Daily Tracker', icon: CheckSquare },
  { id: 'weekly', label: 'Next & Weekly', icon: CalendarDays },
  { id: 'grocery', label: 'Grocery List', icon: ShoppingBag },
  { id: 'labs', label: 'Lab Tests AI', icon: FlaskConical },
  { id: 'foods', label: 'Food Index', icon: Leaf },
];

const SEX_OPTIONS: Array<{ id: BiologicalSex; label: string }> = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'neutral', label: 'Neutral' },
];

export function SidebarNav({
  activeTab,
  onSelectTab,
  profile,
  onUpdateProfile,
  onChangeLocation,
  onChangeDiet,
  onOpenAffiliateModal,
  onOpenLegalModal,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const [showAdvancedProfile, setShowAdvancedProfile] = useState(false);

  const region = REGIONS[profile.locationId] ?? REGIONS.hyderabad;
  const activeAgeGroup = getAgeGroupForAge(profile.age);
  const activeWeightClass = getWeightClassForWeight(profile.weightKg);
  const currentSex: BiologicalSex = profile.sex ?? 'male';
  const householdServings = Math.max(1, Math.min(6, profile.householdServings ?? 1));
  const excludedAllergens = profile.excludedAllergens ?? [];

  const handleToggleAllergen = (allergen: AllergenId) => {
    const exists = excludedAllergens.includes(allergen);
    const nextAllergens = exists
      ? excludedAllergens.filter((a) => a !== allergen)
      : [...excludedAllergens, allergen];
    onUpdateProfile({ ...profile, excludedAllergens: nextAllergens });
  };

  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const sexLabel = currentSex === 'female' ? 'Female' : currentSex === 'male' ? 'Male' : 'Neutral';

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200/90 overflow-y-auto">
      <div>
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200/90 shrink-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleSelect('overview');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            HydraPrep
          </a>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Main Navigation" className="p-3 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[46px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 text-left ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 border border-teal-200/90'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Calm Progressive-Disclosure Profile Area */}
      <div className="p-4 border-t border-slate-200/90 bg-slate-50/60 space-y-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <UserRound className="w-3.5 h-3.5 text-teal-700" />
            <span>Your Profile</span>
          </div>
          <p className="text-xs text-slate-600 leading-snug">
            {sexLabel} · {profile.age} yrs · {householdServings}{' '}
            {householdServings === 1 ? 'person' : 'people'} · {region.shortLabel}
          </p>
        </div>

        {/* Physiology / Sex Selector */}
        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1.5">Physiology</span>
          <div
            role="group"
            aria-label="Select biological sex for calorie and mineral targets"
            className="grid grid-cols-3 p-0.5 bg-slate-200/70 rounded-lg"
          >
            {SEX_OPTIONS.map((opt) => {
              const active = currentSex === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onUpdateProfile({ ...profile, sex: opt.id })}
                  className={`py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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

        {/* Essential Everyday Settings */}
        <div className="space-y-2.5">
          <label className="block">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
              <MapPin className="w-3 h-3 text-teal-700" />
              <span>City & Local Markets</span>
            </span>
            <select
              aria-label="Location and Local Markets"
              value={profile.locationId}
              onChange={(e) => onChangeLocation(e.target.value as LocationId)}
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
            <span className="block text-xs font-medium text-slate-600 mb-1">Age Group</span>
            <select
              value={activeAgeGroup.id}
              onChange={(e) => {
                const preset = AGE_GROUPS.find((g) => g.id === (e.target.value as AgeGroupId));
                if (preset) onUpdateProfile({ ...profile, age: preset.defaultAge });
              }}
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
            <span className="block text-xs font-medium text-slate-600 mb-1">Dietary Preference</span>
            <select
              value={profile.diet ?? 'non-veg'}
              onChange={(e) => onChangeDiet(e.target.value as DietPreference)}
              className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
            >
              <option value="non-veg">Non-Veg (All Whole Foods)</option>
              <option value="eggetarian">Eggetarian (Eggs & Veg)</option>
              <option value="vegetarian">Vegetarian (Plant & Dairy)</option>
            </select>
          </label>
        </div>

        {/* Progressive Disclosure: Body Stats, Household, Allergies & Budget */}
        <div className="pt-1 border-t border-slate-200/80">
          <button
            type="button"
            onClick={() => setShowAdvancedProfile((prev) => !prev)}
            aria-expanded={showAdvancedProfile}
            className="w-full flex items-center justify-between py-2 min-h-[40px] text-xs font-semibold text-slate-700 hover:text-teal-800 transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
              <span>
                Household, Allergies & Stats
                {excludedAllergens.length > 0 ? ` (${excludedAllergens.length})` : ''}
              </span>
            </span>
            {showAdvancedProfile ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showAdvancedProfile && (
            <div className="space-y-3 pt-2">
              {/* Household Servings Stepper */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                  <Users className="w-3.5 h-3.5 text-teal-700" />
                  <span>Household Size</span>
                </span>
                <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                  <button
                    type="button"
                    aria-label="Decrease household servings"
                    disabled={householdServings <= 1}
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        householdServings: Math.max(1, householdServings - 1),
                      })
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-mono tabular-nums font-semibold text-slate-900">
                    {householdServings}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase household servings"
                    disabled={householdServings >= 6}
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        householdServings: Math.min(6, householdServings + 1),
                      })
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Allergen Exclusions */}
              <div>
                <span className="block text-xs font-medium text-slate-600 mb-1.5">
                  Exclude Allergens
                </span>
                <div
                  role="group"
                  aria-label="Exclude allergens from meal plan"
                  className="flex flex-wrap gap-1.5"
                >
                  {ALLERGEN_OPTIONS.map((opt) => {
                    const excluded = excludedAllergens.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={excluded}
                        onClick={() => handleToggleAllergen(opt.id)}
                        className={`px-2.5 py-1.5 min-h-[34px] text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                          excluded
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {excluded ? `No ${opt.label}` : opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="block text-xs text-slate-600 mb-1">Weight Class</span>
                <select
                  value={activeWeightClass.id}
                  onChange={(e) => {
                    const preset = WEIGHT_CLASSES.find(
                      (w) => w.id === (e.target.value as WeightClassId)
                    );
                    if (preset) onUpdateProfile({ ...profile, weightKg: preset.defaultWeightKg });
                  }}
                  className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                >
                  {WEIGHT_CLASSES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="block text-[11px] text-slate-600 mb-1">Age</span>
                  <input
                    type="number"
                    min={18}
                    max={85}
                    value={profile.age}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val) && val >= 18 && val <= 85) {
                        onUpdateProfile({ ...profile, age: val });
                      }
                    }}
                    className="w-full px-2 py-2 min-h-[38px] text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-slate-600 mb-1">Wt (kg)</span>
                  <input
                    type="number"
                    min={40}
                    max={160}
                    value={profile.weightKg}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val) && val >= 40 && val <= 160) {
                        onUpdateProfile({ ...profile, weightKg: val });
                      }
                    }}
                    className="w-full px-2 py-2 min-h-[38px] text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-slate-600 mb-1">Ht (cm)</span>
                  <input
                    type="number"
                    min={135}
                    max={220}
                    value={profile.heightCm}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val) && val >= 135 && val <= 220) {
                        onUpdateProfile({ ...profile, heightCm: val });
                      }
                    }}
                    className="w-full px-2 py-2 min-h-[38px] text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-xs text-slate-600 mb-1">Nutrition Goal</span>
                <select
                  value={profile.goal}
                  onChange={(e) => onUpdateProfile({ ...profile, goal: e.target.value as GoalMode })}
                  className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                >
                  <option value="recomp">Tone & Recomp</option>
                  <option value="fat-loss">Steady Fat Loss</option>
                  <option value="lean-gain">Lean Strength Gain</option>
                </select>
              </label>

              <label className="block">
                <span className="block text-xs text-slate-600 mb-1">Weekly Activity</span>
                <select
                  value={profile.activity}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, activity: e.target.value as ActivityLevel })
                  }
                  className="w-full px-3 py-2 min-h-[40px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                >
                  <option value="moderate">Light–Moderate (2–3d/wk)</option>
                  <option value="active">Active (4–5d/wk)</option>
                  <option value="athlete">High Volume (6d/wk)</option>
                </select>
              </label>

              <label className="block">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Daily Budget Cap</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {region.currencySymbol}
                    {profile.dailyBudgetInr}
                  </span>
                </div>
                <input
                  type="range"
                  min={region.minBudget}
                  max={region.maxBudget}
                  step={region.budgetStep}
                  value={profile.dailyBudgetInr}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, dailyBudgetInr: Number(e.target.value) })
                  }
                  className="w-full accent-teal-700 cursor-pointer h-2"
                />
              </label>
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              onOpenAffiliateModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 min-h-[42px] text-xs font-medium text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Store className="w-3.5 h-3.5 text-teal-700" />
            <span>Preferred Grocery Store</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenLegalModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy & Disclosures</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/45"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-80 max-w-[88vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
