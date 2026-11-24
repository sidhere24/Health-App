import { useEffect, useMemo, useState } from 'react';
import { AffiliateLinksModal } from './components/AffiliateLinksModal';
import { CustomFoodModal } from './components/CustomFoodModal';
import { DailyOverviewView } from './components/DailyOverviewView';
import { FoodIndexView } from './components/FoodIndexView';
import { GroceryListView } from './components/GroceryListView';
import { LegalComplianceModal } from './components/LegalComplianceModal';
import { MealSwapModal } from './components/MealSwapModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OnboardingWizard } from './components/OnboardingWizard';
import { type ActiveTab, SidebarNav } from './components/SidebarNav';
import { TopBar } from './components/TopBar';
import { WeeklyPrepView } from './components/WeeklyPrepView';
import { DEFAULT_PROFILE, DEFAULT_WEEK_PLAN } from './data/hyderabadMeals';
import { REGIONS } from './data/regions';
import type {
  AffiliateLinkConfig,
  ConsumedState,
  DayOfWeek,
  DietPreference,
  GoalMode,
  LocationId,
  MealTemplate,
  MealSlot,
  PortionMultipliers,
  UserProfile,
  WeeklyArchiveEntry,
  WeekPlan,
  WholeFood,
} from './types/nutrition';
import { findBestMealForFoods, type PhotoIdentifyResult } from './utils/aiPhoto';
import type { VoiceAction } from './utils/aiVoice';
import { getShareFromUrl } from './utils/sharing';
import { computeConsistencyMetrics } from './utils/habits';
import { buildIngredientPurchaseLink } from './utils/links';
import {
  aggregateWeeklyGrocery,
  buildWeekPlanForDiet,
  calculateBiometricTargets,
  createInitialConsumedState,
  createInitialPortionMultipliers,
  getCurrentDayOfWeek,
  getLocalizedFoods,
  getLocalizedFoodsById,
  getMealsById,
  scalePortionsToTarget,
} from './utils/nutrition';

const STORAGE_KEY = 'hydraprep_state_v1';

interface PersistedState {
  profile: UserProfile;
  weekPlan: WeekPlan;
  multipliers: PortionMultipliers;
  consumed: ConsumedState;
  batchDone: Record<string, boolean>;
  pantryChecked: Record<string, boolean>;
  selectedDay: DayOfWeek;
  customFoods: WholeFood[];
  affiliateConfig: AffiliateLinkConfig;
  onboardingComplete: boolean;
  weekHistory: WeeklyArchiveEntry[];
}

const DEFAULT_AMAZON_PARTNER_TAG = 'sid036-21';

const DEFAULT_AFFILIATE_CONFIG: AffiliateLinkConfig = {
  storePlatform: 'amazon_in',
  affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
  customUrls: {},
};

function loadInitialState(): PersistedState {
  const defaults: PersistedState = {
    profile: DEFAULT_PROFILE,
    weekPlan: DEFAULT_WEEK_PLAN,
    multipliers: createInitialPortionMultipliers(),
    consumed: createInitialConsumedState(),
    batchDone: {},
    pantryChecked: {},
    selectedDay: getCurrentDayOfWeek(),
    customFoods: [],
    affiliateConfig: DEFAULT_AFFILIATE_CONFIG,
    onboardingComplete: false,
    weekHistory: [],
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const shared = getShareFromUrl();
    if (shared) {
      return {
        ...defaults,
        weekPlan: shared.weekPlan,
        multipliers: shared.multipliers,
        consumed: shared.consumed ?? defaults.consumed,
      };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const mergedProfile: UserProfile = {
      ...defaults.profile,
      ...(parsed.profile ?? {}),
      diet: parsed.profile?.diet ?? 'non-veg',
      locationId:
        parsed.profile?.locationId && REGIONS[parsed.profile.locationId]
          ? parsed.profile.locationId
          : defaults.profile.locationId,
    };

    return {
      profile: mergedProfile,
      weekPlan: { ...defaults.weekPlan, ...(parsed.weekPlan ?? {}) },
      multipliers: { ...defaults.multipliers, ...(parsed.multipliers ?? {}) },
      consumed: { ...defaults.consumed, ...(parsed.consumed ?? {}) },
      batchDone: parsed.batchDone ?? {},
      pantryChecked: parsed.pantryChecked ?? {},
      selectedDay: parsed.selectedDay ?? defaults.selectedDay,
      customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
      affiliateConfig: {
        storePlatform:
          parsed.affiliateConfig?.storePlatform ??
          REGIONS[mergedProfile.locationId].defaultStorePlatform,
        affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
        customUrls: parsed.affiliateConfig?.customUrls ?? {},
      },
      onboardingComplete: Boolean(parsed.onboardingComplete),
      weekHistory: Array.isArray(parsed.weekHistory) ? parsed.weekHistory : [],
    };
  } catch {
    return defaults;
  }
}

export default function App() {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [regionalFoods, setRegionalFoods] = useState<WholeFood[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const [affiliateFocusFoodId, setAffiliateFocusFoodId] = useState<string | null>(null);
  const [customFoodModalOpen, setCustomFoodModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [skipNote, setSkipNote] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted sandboxes
    }
  }, [state]);

  const targets = useMemo(() => calculateBiometricTargets(state.profile), [state.profile]);

  // Fetch Spoonacular-generated foods for global regions when the server has a
  // key; EMPTY stays as an explicit signal so callers can distinguish.
  useEffect(() => {
    const locationId = state.profile.locationId;
    if (locationId !== 'usa' && locationId !== 'uk') {
      setRegionalFoods([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/regional-foods/${locationId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((foods: unknown) => {
        if (!cancelled && Array.isArray(foods)) setRegionalFoods(foods);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [state.profile.locationId]);

  const localizedFoods = useMemo(
    () => getLocalizedFoods(state.profile.locationId, state.customFoods, regionalFoods),
    [state.profile.locationId, state.customFoods, regionalFoods]
  );

  const localizedFoodsById = useMemo(
    () => getLocalizedFoodsById(state.profile.locationId, state.customFoods, regionalFoods),
    [state.profile.locationId, state.customFoods, regionalFoods]
  );

  const mealsById = useMemo(
    () => getMealsById(state.profile.locationId),
    [state.profile.locationId]
  );

  const handleChangeLocation = (locationId: LocationId) => {
    const nextRegion = REGIONS[locationId] ?? REGIONS.hyderabad;
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        locationId,
        dailyBudgetInr: nextRegion.defaultDailyBudget,
      },
      affiliateConfig: {
        ...prev.affiliateConfig,
        storePlatform: nextRegion.defaultStorePlatform,
        affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
      },
    }));
  };

  const handleChangeDiet = (diet: DietPreference) => {
    setState((prev) => {
      const nextPlan =
        diet === 'non-veg'
          ? DEFAULT_WEEK_PLAN
          : buildWeekPlanForDiet(diet, prev.weekPlan);
      return {
        ...prev,
        profile: { ...prev.profile, diet },
        weekPlan: nextPlan,
      };
    });
  };

  const handleApplyAiPlan = (plan: WeekPlan) => {
    setState((prev) => ({
      ...prev,
      weekPlan: plan,
      multipliers: scalePortionsToTarget(plan, targets, localizedFoodsById),
      consumed: createInitialConsumedState(),
      batchDone: {},
      onboardingComplete: true,
    }));
  };

  const handleAddMealToPlan = (meal: MealTemplate, slot: MealSlot) => {
    setState((prev) => ({
      ...prev,
      weekPlan: {
        ...prev.weekPlan,
        [state.selectedDay]: { ...prev.weekPlan[state.selectedDay], [slot]: meal.id },
      },
    }));
  };

  const handleVoiceLog = (action: VoiceAction) => {
    if (action.action === 'none') return;
    const meal = action.mealId ? mealsById[action.mealId] : null;
    const slot = meal?.slot ?? action.slot;
    if (!slot) return;
    if (action.action === 'plan' && action.mealId) {
      setState((prev) => ({
        ...prev,
        weekPlan: {
          ...prev.weekPlan,
          [state.selectedDay]: { ...prev.weekPlan[state.selectedDay], [slot]: action.mealId },
        },
      }));
    } else {
      setState((prev) => ({
        ...prev,
        consumed: {
          ...prev.consumed,
          [state.selectedDay]: { ...prev.consumed[state.selectedDay], [slot]: true },
        },
      }));
    }
  };

  const handlePhotoLog = (foods: PhotoIdentifyResult) => {
    if (!foods.foods.length) return;
    const match = findBestMealForFoods(foods.foods, mealsById, localizedFoodsById);
    if (!match) return;
    setState((prev) => ({
      ...prev,
      consumed: {
        ...prev.consumed,
        [state.selectedDay]: { ...prev.consumed[state.selectedDay], [match.meal.slot]: true },
      },
    }));
  };

  const handleApplyOnboarding = (next: {
    age: number;
    weightKg: number;
    locationId: LocationId;
    diet: DietPreference;
    goal: GoalMode;
    dailyBudgetInr: number;
  }) => {
    const nextProfile: UserProfile = {
      ...state.profile,
      age: next.age,
      weightKg: next.weightKg,
      locationId: next.locationId,
      diet: next.diet,
      goal: next.goal,
      dailyBudgetInr: next.dailyBudgetInr ?? REGIONS[next.locationId]?.defaultDailyBudget ?? state.profile.dailyBudgetInr,
    };
    const nextTargets = calculateBiometricTargets(nextProfile);
    const nextFoodsById = getLocalizedFoodsById(next.locationId, state.customFoods, []);
    const nextPlan =
      next.diet === 'non-veg'
        ? DEFAULT_WEEK_PLAN
        : buildWeekPlanForDiet(next.diet, DEFAULT_WEEK_PLAN);
    const nextMults = scalePortionsToTarget(nextPlan, nextTargets, nextFoodsById);

    setState((prev) => ({
      ...prev,
      profile: nextProfile,
      weekPlan: nextPlan,
      multipliers: nextMults,
      onboardingComplete: true,
      affiliateConfig: {
        ...prev.affiliateConfig,
        storePlatform: REGIONS[next.locationId]?.defaultStorePlatform ?? 'amazon_in',
        affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
      },
    }));
  };

  const handleStartNewWeek = () => {
    const metrics = computeConsistencyMetrics(
      state.weekPlan,
      state.multipliers,
      state.consumed,
      targets,
      localizedFoodsById
    );
    setState((prev) => ({
      ...prev,
      consumed: createInitialConsumedState(),
      batchDone: {},
      weekHistory: [
        ...prev.weekHistory,
        {
          weekLabel: `W${prev.weekHistory.length + 1}`,
          loggedMeals: metrics.loggedMealsCount,
          totalMeals: metrics.totalMealsCount,
          adherencePct: metrics.adherencePct,
          activeDays: metrics.activeDaysCount,
        },
      ],
    }));
  };

  const handleScaleWeekToTarget = () => {
    const scaled = scalePortionsToTarget(state.weekPlan, targets, localizedFoodsById);
    setState((prev) => ({
      ...prev,
      multipliers: scaled,
    }));
  };

  const handleToggleConsumed = (day: DayOfWeek, slot: MealSlot) => {
    setState((prev) => ({
      ...prev,
      consumed: {
        ...prev.consumed,
        [day]: {
          ...prev.consumed[day],
          [slot]: !prev.consumed[day][slot],
        },
      },
    }));
  };

  const handleMarkAllDayConsumed = (day: DayOfWeek, value: boolean) => {
    setState((prev) => ({
      ...prev,
      consumed: {
        ...prev.consumed,
        [day]: {
          breakfast: value,
          lunch: value,
          snack: value,
          dinner: value,
        },
      },
    }));
  };

  const handleChangeMultiplier = (day: DayOfWeek, slot: MealSlot, value: number) => {
    setState((prev) => ({
      ...prev,
      multipliers: {
        ...prev.multipliers,
        [day]: {
          ...prev.multipliers[day],
          [slot]: value,
        },
      },
    }));
  };

  const handleSelectMealForSwap = (mealId: string) => {
    if (!swapTarget) return;
    const { day, slot } = swapTarget;
    setState((prev) => ({
      ...prev,
      weekPlan: {
        ...prev.weekPlan,
        [day]: {
          ...prev.weekPlan[day],
          [slot]: mealId,
        },
      },
    }));
  };

  const handleToggleBatchTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      batchDone: {
        ...prev.batchDone,
        [taskId]: !prev.batchDone[taskId],
      },
    }));
  };

  const handleTogglePantryItem = (foodId: string) => {
    setState((prev) => ({
      ...prev,
      pantryChecked: {
        ...prev.pantryChecked,
        [foodId]: !prev.pantryChecked[foodId],
      },
    }));
  };

  const handleClearPantryChecked = () => {
    setState((prev) => ({ ...prev, pantryChecked: {} }));
  };

  const handleOpenAffiliateModal = (focusFoodId?: string) => {
    setAffiliateFocusFoodId(focusFoodId ?? null);
    setAffiliateModalOpen(true);
  };

  const handleAddCustomFood = (food: WholeFood, customUrl?: string) => {
    setState((prev) => ({
      ...prev,
      customFoods: [food, ...prev.customFoods],
      affiliateConfig: customUrl
        ? {
            ...prev.affiliateConfig,
            customUrls: {
              ...prev.affiliateConfig.customUrls,
              [food.id]: customUrl,
            },
          }
        : prev.affiliateConfig,
    }));
  };

  const handleDeleteCustomFood = (foodId: string) => {
    setState((prev) => {
      const nextUrls = { ...prev.affiliateConfig.customUrls };
      delete nextUrls[foodId];
      return {
        ...prev,
        customFoods: prev.customFoods.filter((f) => f.id !== foodId),
        affiliateConfig: {
          ...prev.affiliateConfig,
          customUrls: nextUrls,
        },
      };
    });
  };

  const handleResetDefaults = () => {
    setState((prev) => ({
      profile: DEFAULT_PROFILE,
      weekPlan: DEFAULT_WEEK_PLAN,
      multipliers: createInitialPortionMultipliers(),
      consumed: createInitialConsumedState(),
      batchDone: {},
      pantryChecked: {},
      selectedDay: getCurrentDayOfWeek(),
      customFoods: prev.customFoods,
      onboardingComplete: prev.onboardingComplete,
      weekHistory: prev.weekHistory,
      affiliateConfig: {
        ...prev.affiliateConfig,
        storePlatform: REGIONS[DEFAULT_PROFILE.locationId].defaultStorePlatform,
        affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
      },
    }));
  };

  const handleExportGroceryCsv = () => {
    const region = REGIONS[state.profile.locationId] ?? REGIONS.hyderabad;
    const grocery = aggregateWeeklyGrocery(
      state.weekPlan,
      state.multipliers,
      mealsById,
      localizedFoodsById,
      state.profile.locationId
    );
    const header = [
      'Ingredient',
      'Local Name',
      `${region.shortLabel} Market Channel`,
      'Weekly Quantity',
      'Total Grams',
      `Estimated Cost (${region.currencyCode})`,
      'Primary Hormonal Pathway',
      'Store / Affiliate Link',
    ];
    const rows = grocery.items.map((item) => {
      const link = buildIngredientPurchaseLink(item.food, state.affiliateConfig);
      return [
        `"${item.food.name.replace(/"/g, '""')}"`,
        `"${item.food.localName.replace(/"/g, '""')}"`,
        `"${region.marketChannelLabels[item.food.marketChannel].replace(/"/g, '""')}"`,
        `"${item.practicalQuantityLabel}"`,
        String(item.totalGrams),
        String(item.totalCostInr),
        `"${item.food.primaryPathway}"`,
        `"${link.url.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hydraprep-${state.profile.locationId}-grocery-${state.profile.weightKg}kg.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-60 focus:px-3 focus:py-2 focus:bg-teal-700 focus:text-white focus:rounded focus:text-sm"
      >
        Skip to main content
      </a>
      <div id="top" className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        profile={state.profile}
        onUpdateProfile={(next) => setState((prev) => ({ ...prev, profile: next }))}
        onChangeLocation={handleChangeLocation}
        onChangeDiet={handleChangeDiet}
        onOpenAffiliateModal={() => handleOpenAffiliateModal()}
        onOpenLegalModal={() => setLegalModalOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onExportGroceryCsv={handleExportGroceryCsv}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-5 pb-24 lg:py-6 max-w-[1240px] w-full mx-auto">
          {activeTab === 'overview' && (
            <DailyOverviewView
              profile={state.profile}
              targets={targets}
              selectedDay={state.selectedDay}
              onSelectDay={(day) => setState((prev) => ({ ...prev, selectedDay: day }))}
              weekPlan={state.weekPlan}
              multipliers={state.multipliers}
              consumed={state.consumed}
              foodsById={localizedFoodsById}
              affiliateConfig={state.affiliateConfig}
              onToggleConsumed={handleToggleConsumed}
              onChangeMultiplier={handleChangeMultiplier}
              onOpenSwapModal={(day, slot) => setSwapTarget({ day, slot })}
              onMarkAllDayConsumed={handleMarkAllDayConsumed}
              onScaleWeekToTarget={handleScaleWeekToTarget}
              onResetDefaults={handleResetDefaults}
              onApplyAiPlan={handleApplyAiPlan}
              onVoiceLog={handleVoiceLog}
              onPhotoLog={handlePhotoLog}
              weekHistory={state.weekHistory}
              onStartNewWeek={handleStartNewWeek}
              onGoToFoods={() => setActiveTab('foods')}
              onboardingSlot={
                !state.onboardingComplete ? (
                  <OnboardingWizard
                    profile={state.profile}
                    onApplyOnboarding={handleApplyOnboarding}
                    onSkip={() => {
                      setState((prev) => ({ ...prev, onboardingComplete: true }));
                      const symbol = REGIONS[state.profile.locationId]?.currencySymbol ?? '₹';
                      setSkipNote(
                        `Using default targets (${symbol}${state.profile.dailyBudgetInr}/day) — customize anytime in your Profile.`
                      );
                      setTimeout(() => setSkipNote(''), 5000);
                    }}
                  />
                ) : skipNote ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mb-4 rounded-xl border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/40 px-4 sm:px-5 py-3 text-xs text-teal-800 dark:text-teal-100"
                  >
                    {skipNote}
                  </div>
                ) : undefined
              }
            />
          )}

          {activeTab === 'weekly' && (
            <WeeklyPrepView
              weekPlan={state.weekPlan}
              multipliers={state.multipliers}
              consumed={state.consumed}
              targets={targets}
              locationId={state.profile.locationId}
              foodsById={localizedFoodsById}
              batchDone={state.batchDone}
              onToggleBatchTask={handleToggleBatchTask}
              onJumpToDay={(day) => {
                setState((prev) => ({ ...prev, selectedDay: day }));
                setActiveTab('overview');
              }}
              onOpenSwapModal={(day, slot) => setSwapTarget({ day, slot })}
            />
          )}

          {activeTab === 'grocery' && (
            <GroceryListView
              weekPlan={state.weekPlan}
              multipliers={state.multipliers}
              locationId={state.profile.locationId}
              foodsById={localizedFoodsById}
              affiliateConfig={state.affiliateConfig}
              pantryChecked={state.pantryChecked}
              onTogglePantryItem={handleTogglePantryItem}
              onClearPantryChecked={handleClearPantryChecked}
              onOpenAffiliateModal={handleOpenAffiliateModal}
              onOpenLegalModal={() => setLegalModalOpen(true)}
            />
          )}

          {activeTab === 'foods' && (
            <FoodIndexView
              locationId={state.profile.locationId}
              foods={localizedFoods}
              affiliateConfig={state.affiliateConfig}
              onOpenAddFoodModal={() => setCustomFoodModalOpen(true)}
              onOpenAffiliateModal={handleOpenAffiliateModal}
              onDeleteCustomFood={handleDeleteCustomFood}
            onAddMealToPlan={handleAddMealToPlan}
            />
          )}
        </main>
      </div>

      {swapTarget && (
        <MealSwapModal
          isOpen={true}
          day={swapTarget.day}
          slot={swapTarget.slot}
          currentMealId={state.weekPlan[swapTarget.day][swapTarget.slot]}
          portionMultiplier={state.multipliers[swapTarget.day][swapTarget.slot]}
          locationId={state.profile.locationId}
          diet={state.profile.diet}
          foodsById={localizedFoodsById}
          onSelectMeal={handleSelectMealForSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}

      <AffiliateLinksModal
        isOpen={affiliateModalOpen}
        foods={localizedFoods}
        config={state.affiliateConfig}
        initialFocusFoodId={affiliateFocusFoodId}
        onUpdateConfig={(next) =>
          setState((prev) => ({
            ...prev,
            affiliateConfig: {
              ...next,
              affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
            },
          }))
        }
        onClose={() => {
          setAffiliateModalOpen(false);
          setAffiliateFocusFoodId(null);
        }}
      />

      <CustomFoodModal
        isOpen={customFoodModalOpen}
        locationId={state.profile.locationId}
        onAddFood={handleAddCustomFood}
        onClose={() => setCustomFoodModalOpen(false)}
      />

      <LegalComplianceModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
      />

      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfileDrawer={() => setMobileMenuOpen(true)}
      />

      <OfflineIndicator />
      </div>
    </>
  );
}
