import {
  CalendarDays,
  CheckSquare,
  Leaf,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
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
  DietPreference,
  GoalMode,
  LocationId,
  UserProfile,
  WeightClassId,
} from '../types/nutrition';

export type ActiveTab = 'overview' | 'weekly' | 'grocery' | 'foods';

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
  { id: 'weekly', label: 'Weekly Prep', icon: CalendarDays },
  { id: 'grocery', label: 'Grocery List', icon: ShoppingBag },
  { id: 'foods', label: 'Food Index', icon: Leaf },
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
  const region = REGIONS[profile.locationId] ?? REGIONS.hyderabad;
  const activeAgeGroup = getAgeGroupForAge(profile.age);
  const activeWeightClass = getWeightClassForWeight(profile.weightKg);

  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 overflow-y-auto">
      <div>
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
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
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Main Navigation" className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-teal-700" />
            <span>Region & Markets</span>
          </div>
        </div>

        <label className="block">
          <span className="sr-only">Location and Local Markets</span>
          <select
            aria-label="Location and Local Markets"
            value={profile.locationId}
            onChange={(e) => onChangeLocation(e.target.value as LocationId)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {Object.values(REGIONS).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 pt-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
          <span>Age Group & Weight Class</span>
        </div>

        <label className="block">
          <span className="block text-[11px] text-slate-500 mb-1">Age Group</span>
          <select
            value={activeAgeGroup.id}
            onChange={(e) => {
              const preset = AGE_GROUPS.find((g) => g.id === (e.target.value as AgeGroupId));
              if (preset) onUpdateProfile({ ...profile, age: preset.defaultAge });
            }}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {AGE_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] text-slate-500 mb-1">Weight Class</span>
          <select
            value={activeWeightClass.id}
            onChange={(e) => {
              const preset = WEIGHT_CLASSES.find((w) => w.id === (e.target.value as WeightClassId));
              if (preset) onUpdateProfile({ ...profile, weightKg: preset.defaultWeightKg });
            }}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
          >
            {WEIGHT_CLASSES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-3 gap-1.5">
          <label className="block">
            <span className="block text-[10px] text-slate-500 mb-1">Age</span>
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
              className="w-full px-2 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] text-slate-500 mb-1">Wt (kg)</span>
            <input
              type="number"
              min={45}
              max={160}
              value={profile.weightKg}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val) && val >= 45 && val <= 160) {
                  onUpdateProfile({ ...profile, weightKg: val });
                }
              }}
              className="w-full px-2 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] text-slate-500 mb-1">Ht (cm)</span>
            <input
              type="number"
              min={140}
              max={220}
              value={profile.heightCm}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val) && val >= 140 && val <= 220) {
                  onUpdateProfile({ ...profile, heightCm: val });
                }
              }}
              className="w-full px-2 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-[11px] text-slate-500 mb-1">Optimization Goal</span>
          <select
            value={profile.goal}
            onChange={(e) => onUpdateProfile({ ...profile, goal: e.target.value as GoalMode })}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
          >
            <option value="recomp">Hormonal Recomp</option>
            <option value="fat-loss">Lean Fat Loss</option>
            <option value="lean-gain">Lean Mass Gain</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] text-slate-500 mb-1">Dietary Preference</span>
          <select
            value={profile.diet ?? 'non-veg'}
            onChange={(e) => onChangeDiet(e.target.value as DietPreference)}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
          >
            <option value="non-veg">Non-Veg (All Whole Foods)</option>
            <option value="eggetarian">Eggetarian (Eggs & Veg)</option>
            <option value="vegetarian">Vegetarian (No Meat/Eggs)</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] text-slate-500 mb-1">Training Output</span>
          <select
            value={profile.activity}
            onChange={(e) =>
              onUpdateProfile({ ...profile, activity: e.target.value as ActivityLevel })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
          >
            <option value="moderate">Moderate (3d/wk)</option>
            <option value="active">Active (4–5d/wk)</option>
            <option value="athlete">High Volume (6d/wk)</option>
          </select>
        </label>

        <label className="block">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Daily Budget Cap</span>
            <span className="font-mono tabular-nums font-medium text-slate-800">
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
            className="w-full accent-teal-700 cursor-pointer"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            onOpenAffiliateModal();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 min-h-[38px] text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Preferred Grocery Store</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenLegalModal();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacy & Disclosures</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-68 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
