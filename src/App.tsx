import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { AffiliateLinksModal } from './components/AffiliateLinksModal';
import { CookModeModal } from './components/CookModeModal';
import { CustomFoodModal } from './components/CustomFoodModal';
import { DailyOverviewView } from './components/DailyOverviewView';
import { FoodIndexView } from './components/FoodIndexView';
import { GroceryListView } from './components/GroceryListView';
import { LabInsightsView } from './components/LabInsightsView';
import { LegalComplianceModal } from './components/LegalComplianceModal';
import { MealSwapModal } from './components/MealSwapModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OnboardingBanner } from './components/OnboardingBanner';
import { type ActiveTab, SidebarNav } from './components/SidebarNav';
import { TopBar } from './components/TopBar';
import { WeeklyPrepView, type WeeklySection } from './components/WeeklyPrepView';
import { BATCH_PREP_TASKS, DEFAULT_PROFILE, DEFAULT_WEEK_PLAN, MEAL_LIBRARY } from './data/hyderabadMeals';
import { REGIONS } from './data/regions';
import type {
  AffiliateLinkConfig,
  AiLocalMealPlan,
  AllergenId,
  BiologicalSex,
  ConsumedState,
  DayOfWeek,
  DietPreference,
  HydrationState,
  LabAiInsightReport,
  LocationId,
  MealDifficulty,
  MealSlot,
  NextWeekStrategy,
  PortionMultipliers,
  TextSizeMode,
  UserProfile,
  WeeklyArchiveEntry,
  WeekPlan,
  WholeFood,
} from './types/nutrition';
import { materializeAiPlanToAppState } from './utils/aiMealPlan';
import { computeConsistencyMetrics } from './utils/habits';
import { buildIngredientPurchaseLink } from './utils/links';
import { generateNextWeekPlan } from './utils/nextWeek';
import {
  aggregateWeeklyGrocery,
  ALLERGEN_OPTIONS,
  buildWeekPlanForAllergens,
  buildWeekPlanForDiet,
  buildWeekPlanForDifficulty,
  calculateBiometricTargets,
  calculateHydrationTargetGlasses,
  createInitialConsumedState,
  createInitialHydrationState,
  createInitialPortionMultipliers,
  getCurrentDayOfWeek,
  getLocalizedFoods,
  getLocalizedFoodsById,
  MEALS_BY_ID,
  scalePortionsToTarget,
} from './utils/nutrition';

const STORAGE_KEY = 'hydraprep_state_v1';

interface PersistedState {
  profile: UserProfile;
  weekPlan: WeekPlan;
  nextWeekPlan: WeekPlan;
  multipliers: PortionMultipliers;
  consumed: ConsumedState;
  hydration: HydrationState;
  batchDone: Record<string, boolean>;
  nextWeekPrepDone: Record<string, boolean>;
  pantryChecked: Record<string, boolean>;
  selectedDay: DayOfWeek;
  customFoods: WholeFood[];
  affiliateConfig: AffiliateLinkConfig;
  onboardingComplete: boolean;
  weekHistory: WeeklyArchiveEntry[];
  aiLocalPlan: AiLocalMealPlan | null;
  isAiPlanActive: boolean;
  labReport: LabAiInsightReport | null;
  textSize: TextSizeMode;
}

interface ToastNotification {
  id: number;
  message: string;
  undo?: () => void;
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

const DEFAULT_AMAZON_PARTNER_TAG = 'sid036-21';

const DEFAULT_AFFILIATE_CONFIG: AffiliateLinkConfig = {
  storePlatform: 'amazon_in',
  affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
  customUrls: {},
};

function loadInitialState(): PersistedState {
  const defaultNextWeek = generateNextWeekPlan(
    DEFAULT_WEEK_PLAN,
    DEFAULT_PROFILE.diet ?? 'non-veg',
    DEFAULT_PROFILE.excludedAllergens ?? [],
    MEAL_LIBRARY,
    undefined,
    'rotate'
  );

  const defaults: PersistedState = {
    profile: {
      ...DEFAULT_PROFILE,
      householdServings: DEFAULT_PROFILE.householdServings ?? 1,
      excludedAllergens: DEFAULT_PROFILE.excludedAllergens ?? [],
    },
    weekPlan: DEFAULT_WEEK_PLAN,
    nextWeekPlan: defaultNextWeek,
    multipliers: createInitialPortionMultipliers(),
    consumed: createInitialConsumedState(),
    hydration: createInitialHydrationState(),
    batchDone: {},
    nextWeekPrepDone: {},
    pantryChecked: {},
    selectedDay: getCurrentDayOfWeek(),
    customFoods: [],
    affiliateConfig: DEFAULT_AFFILIATE_CONFIG,
    onboardingComplete: false,
    weekHistory: [],
    aiLocalPlan: null,
    isAiPlanActive: false,
    labReport: null,
    textSize: 'standard',
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const validSex: BiologicalSex =
      parsed.profile?.sex === 'female' ||
      parsed.profile?.sex === 'male' ||
      parsed.profile?.sex === 'neutral'
        ? parsed.profile.sex
        : defaults.profile.sex ?? 'male';
    const validAllergenIds = new Set<AllergenId>(ALLERGEN_OPTIONS.map((o) => o.id));
    const parsedAllergens = Array.isArray(parsed.profile?.excludedAllergens)
      ? parsed.profile.excludedAllergens.filter((id): id is AllergenId =>
          validAllergenIds.has(id as AllergenId)
        )
      : [];
    const parsedServings =
      typeof parsed.profile?.householdServings === 'number' &&
      Number.isFinite(parsed.profile.householdServings)
        ? Math.max(1, Math.min(6, Math.round(parsed.profile.householdServings)))
        : 1;
    const mergedProfile: UserProfile = {
      ...defaults.profile,
      ...(parsed.profile ?? {}),
      sex: validSex,
      diet: parsed.profile?.diet ?? 'non-veg',
      locationId:
        parsed.profile?.locationId && REGIONS[parsed.profile.locationId]
          ? parsed.profile.locationId
          : defaults.profile.locationId,
      excludedAllergens: parsedAllergens,
      householdServings: parsedServings,
    };

    const aiLocalPlan =
      parsed.aiLocalPlan &&
      typeof parsed.aiLocalPlan === 'object' &&
      Array.isArray(parsed.aiLocalPlan.localFoods) &&
      Array.isArray(parsed.aiLocalPlan.meals)
        ? parsed.aiLocalPlan
        : null;

    const parsedLabReport =
      parsed.labReport &&
      typeof parsed.labReport === 'object' &&
      typeof parsed.labReport.summary === 'string' &&
      Array.isArray(parsed.labReport.extractedMarkers)
        ? parsed.labReport
        : null;

    const mergedWeekPlan = { ...defaults.weekPlan, ...(parsed.weekPlan ?? {}) };
    const mergedNextWeekPlan = parsed.nextWeekPlan
      ? { ...defaults.nextWeekPlan, ...parsed.nextWeekPlan }
      : generateNextWeekPlan(
          mergedWeekPlan,
          mergedProfile.diet ?? 'non-veg',
          mergedProfile.excludedAllergens ?? [],
          MEAL_LIBRARY,
          undefined,
          'rotate'
        );

    return {
      profile: mergedProfile,
      weekPlan: mergedWeekPlan,
      nextWeekPlan: mergedNextWeekPlan,
      multipliers: { ...defaults.multipliers, ...(parsed.multipliers ?? {}) },
      consumed: { ...defaults.consumed, ...(parsed.consumed ?? {}) },
      hydration: { ...defaults.hydration, ...(parsed.hydration ?? {}) },
      batchDone: parsed.batchDone ?? {},
      nextWeekPrepDone: parsed.nextWeekPrepDone ?? {},
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
      aiLocalPlan,
      isAiPlanActive: Boolean(parsed.isAiPlanActive && aiLocalPlan),
      labReport: parsedLabReport,
      textSize: parsed.textSize === 'large' ? 'large' : 'standard',
    };
  } catch {
    return defaults;
  }
}

export default function App() {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [weeklySection, setWeeklySection] = useState<WeeklySection>('next_week');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{
    day: DayOfWeek;
    slot: MealSlot;
    targetWeek: 'current' | 'next';
  } | null>(null);
  const [cookTarget, setCookTarget] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const [affiliateFocusFoodId, setAffiliateFocusFoodId] = useState<string | null>(null);
  const [customFoodModalOpen, setCustomFoodModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = useCallback((message: string, undo?: () => void) => {
    setToast({ id: Date.now(), message, undo });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.textSize = state.textSize;
    }
  }, [state.textSize]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in restricted sandboxes
    }
  }, [state]);

  const targets = useMemo(() => calculateBiometricTargets(state.profile), [state.profile]);
  const hydrationTarget = useMemo(
    () => calculateHydrationTargetGlasses(state.profile.weightKg, state.profile.activity),
    [state.profile.weightKg, state.profile.activity]
  );

  const materializedAi = useMemo(
    () => (state.aiLocalPlan ? materializeAiPlanToAppState(state.aiLocalPlan) : null),
    [state.aiLocalPlan]
  );

  const effectiveCustomFoods = useMemo(
    () =>
      state.isAiPlanActive && materializedAi
        ? [...materializedAi.foods, ...state.customFoods]
        : state.customFoods,
    [state.isAiPlanActive, materializedAi, state.customFoods]
  );

  const localizedFoods = useMemo(
    () => getLocalizedFoods(state.profile.locationId, effectiveCustomFoods),
    [state.profile.locationId, effectiveCustomFoods]
  );

  const localizedFoodsById = useMemo(
    () => getLocalizedFoodsById(state.profile.locationId, effectiveCustomFoods),
    [state.profile.locationId, effectiveCustomFoods]
  );

  const activeMealLibrary = useMemo(
    () =>
      state.isAiPlanActive && materializedAi
        ? [...materializedAi.meals, ...MEAL_LIBRARY]
        : MEAL_LIBRARY,
    [state.isAiPlanActive, materializedAi]
  );

  const activeMealsById = useMemo(
    () =>
      state.isAiPlanActive && materializedAi
        ? {
            ...MEALS_BY_ID,
            ...Object.fromEntries(materializedAi.meals.map((m) => [m.id, m])),
          }
        : MEALS_BY_ID,
    [state.isAiPlanActive, materializedAi]
  );

  const activeBatchTasks = useMemo(
    () =>
      state.isAiPlanActive && materializedAi && materializedAi.batchTasks.length > 0
        ? materializedAi.batchTasks
        : BATCH_PREP_TASKS,
    [state.isAiPlanActive, materializedAi]
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

  const handleApplyOnboarding = (next: {
    sex: BiologicalSex;
    age: number;
    weightKg: number;
    locationId: LocationId;
    diet: DietPreference;
  }) => {
    const nextRegion = REGIONS[next.locationId] ?? REGIONS.hyderabad;
    const nextProfile: UserProfile = {
      ...state.profile,
      sex: next.sex,
      age: next.age,
      weightKg: next.weightKg,
      locationId: next.locationId,
      diet: next.diet,
      dailyBudgetInr: nextRegion.defaultDailyBudget,
    };
    const nextTargets = calculateBiometricTargets(nextProfile);
    const nextFoodsById = getLocalizedFoodsById(next.locationId, state.customFoods);
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
        storePlatform: nextRegion.defaultStorePlatform,
        affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
      },
    }));
    showToast(`Plan personalized for ${nextRegion.shortLabel} (${nextTargets.calories} kcal/day)`);
  };

  const handleStartNewWeek = () => {
    const metrics = computeConsistencyMetrics(
      state.weekPlan,
      state.multipliers,
      state.consumed,
      targets,
      localizedFoodsById,
      activeMealsById
    );
    setState((prev) => ({
      ...prev,
      consumed: createInitialConsumedState(),
      hydration: createInitialHydrationState(),
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
    const scaled = scalePortionsToTarget(
      state.weekPlan,
      targets,
      localizedFoodsById,
      activeMealsById
    );
    setState((prev) => ({
      ...prev,
      multipliers: scaled,
    }));
  };

  const handleAdaptWeekDifficulty = (maxDifficulty: MealDifficulty) => {
    const previousPlan = state.weekPlan;
    const previousMultipliers = state.multipliers;
    const diet = state.profile.diet ?? 'non-veg';
    const nextPlan = buildWeekPlanForDifficulty(
      maxDifficulty,
      state.weekPlan,
      diet,
      activeMealLibrary
    );
    const scaled = scalePortionsToTarget(
      nextPlan,
      targets,
      localizedFoodsById,
      activeMealsById
    );
    setState((prev) => ({
      ...prev,
      weekPlan: nextPlan,
      multipliers: scaled,
    }));
    showToast(
      `Adapted week to ${maxDifficulty === 'Easy' ? 'Easy' : '<= Moderate'} meals`,
      () => {
        setState((prev) => ({
          ...prev,
          weekPlan: previousPlan,
          multipliers: previousMultipliers,
        }));
        setToast(null);
      }
    );
  };

  const handleAdjustHydration = (delta: number) => {
    setState((prev) => {
      const current = prev.hydration[prev.selectedDay] ?? 0;
      const nextValue = Math.max(0, Math.min(20, current + delta));
      return {
        ...prev,
        hydration: {
          ...prev.hydration,
          [prev.selectedDay]: nextValue,
        },
      };
    });
  };

  const handleChangeHouseholdServings = (servings: number) => {
    const clamped = Math.max(1, Math.min(6, Math.round(servings)));
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        householdServings: clamped,
      },
    }));
    showToast(`Grocery list scaled for ${clamped} ${clamped === 1 ? 'person' : 'people'}`);
  };

  const handleAdaptWeekAllergens = () => {
    const excluded = state.profile.excludedAllergens ?? [];
    if (excluded.length === 0) return;

    const previousPlan = state.weekPlan;
    const previousMultipliers = state.multipliers;
    const diet = state.profile.diet ?? 'non-veg';
    const nextPlan = buildWeekPlanForAllergens(
      excluded,
      state.weekPlan,
      diet,
      activeMealLibrary,
      localizedFoodsById
    );
    const scaled = scalePortionsToTarget(
      nextPlan,
      targets,
      localizedFoodsById,
      activeMealsById
    );
    setState((prev) => ({
      ...prev,
      weekPlan: nextPlan,
      multipliers: scaled,
    }));

    const excludedLabels = excluded
      .map((id) => ALLERGEN_OPTIONS.find((o) => o.id === id)?.label ?? id)
      .join(', ');
    showToast(`Adapted week to exclude ${excludedLabels}`, () => {
      setState((prev) => ({
        ...prev,
        weekPlan: previousPlan,
        multipliers: previousMultipliers,
      }));
      setToast(null);
    });
  };

  const handleAiPlanGenerated = (plan: AiLocalMealPlan) => {
    setState((prev) => ({
      ...prev,
      aiLocalPlan: plan,
    }));
  };

  const handleApplyAiPlan = (plan: AiLocalMealPlan) => {
    const mat = materializeAiPlanToAppState(plan);
    const mergedFoodsById = getLocalizedFoodsById(state.profile.locationId, [
      ...mat.foods,
      ...state.customFoods,
    ]);
    const mergedMealsById = {
      ...MEALS_BY_ID,
      ...Object.fromEntries(mat.meals.map((m) => [m.id, m])),
    };
    const scaledMults = scalePortionsToTarget(
      mat.weekPlan,
      targets,
      mergedFoodsById,
      mergedMealsById
    );

    setState((prev) => ({
      ...prev,
      aiLocalPlan: plan,
      isAiPlanActive: true,
      weekPlan: mat.weekPlan,
      multipliers: scaledMults,
      batchDone: {},
    }));
  };

  const handleRestoreCuratedPlan = () => {
    const diet = state.profile.diet ?? 'non-veg';
    const nextPlan =
      diet === 'non-veg' ? DEFAULT_WEEK_PLAN : buildWeekPlanForDiet(diet, DEFAULT_WEEK_PLAN);
    const baseFoodsById = getLocalizedFoodsById(state.profile.locationId, state.customFoods);
    const scaledMults = scalePortionsToTarget(nextPlan, targets, baseFoodsById, MEALS_BY_ID);
    setState((prev) => ({
      ...prev,
      isAiPlanActive: false,
      weekPlan: nextPlan,
      multipliers: scaledMults,
      batchDone: {},
    }));
  };

  const handleToggleConsumed = (day: DayOfWeek, slot: MealSlot) => {
    const wasConsumed = state.consumed[day][slot];
    setState((prev) => ({
      ...prev,
      consumed: {
        ...prev.consumed,
        [day]: {
          ...prev.consumed[day],
          [slot]: !wasConsumed,
        },
      },
    }));
    showToast(
      `${wasConsumed ? 'Unchecked' : 'Logged'} ${day} ${SLOT_LABELS[slot]}`,
      () => {
        setState((prev) => ({
          ...prev,
          consumed: {
            ...prev.consumed,
            [day]: {
              ...prev.consumed[day],
              [slot]: wasConsumed,
            },
          },
        }));
        setToast(null);
      }
    );
  };

  const handleMarkAllDayConsumed = (day: DayOfWeek, value: boolean) => {
    const previousDay = state.consumed[day];
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
    showToast(
      value ? `Logged all 4 meals for ${day}` : `Cleared meal logs for ${day}`,
      () => {
        setState((prev) => ({
          ...prev,
          consumed: {
            ...prev.consumed,
            [day]: previousDay,
          },
        }));
        setToast(null);
      }
    );
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
    const { day, slot, targetWeek } = swapTarget;
    if (targetWeek === 'next') {
      const previousMealId = state.nextWeekPlan[day][slot];
      setState((prev) => ({
        ...prev,
        nextWeekPlan: {
          ...prev.nextWeekPlan,
          [day]: {
            ...prev.nextWeekPlan[day],
            [slot]: mealId,
          },
        },
      }));
      showToast(`Updated Next Week ${day} ${SLOT_LABELS[slot]} meal`, () => {
        setState((prev) => ({
          ...prev,
          nextWeekPlan: {
            ...prev.nextWeekPlan,
            [day]: {
              ...prev.nextWeekPlan[day],
              [slot]: previousMealId,
            },
          },
        }));
        setToast(null);
      });
      return;
    }

    const previousMealId = state.weekPlan[day][slot];
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
    showToast(`Updated ${day} ${SLOT_LABELS[slot]} meal`, () => {
      setState((prev) => ({
        ...prev,
        weekPlan: {
          ...prev.weekPlan,
          [day]: {
            ...prev.weekPlan[day],
            [slot]: previousMealId,
          },
        },
      }));
      setToast(null);
    });
  };

  const handleGenerateNextWeek = (strategy: NextWeekStrategy) => {
    const previousNextWeek = state.nextWeekPlan;
    const generated = generateNextWeekPlan(
      state.weekPlan,
      state.profile.diet ?? 'non-veg',
      state.profile.excludedAllergens ?? [],
      activeMealLibrary,
      localizedFoodsById,
      strategy
    );
    setState((prev) => ({
      ...prev,
      nextWeekPlan: generated,
      nextWeekPrepDone: {},
    }));
    const label =
      strategy === 'rotate'
        ? 'Fresh variety rotation'
        : strategy === 'easy'
          ? 'Quick & easy prep'
          : 'Repeated favorites';
    showToast(`Built next week plan (${label})`, () => {
      setState((prev) => ({
        ...prev,
        nextWeekPlan: previousNextWeek,
      }));
      setToast(null);
    });
  };

  const handlePromoteNextWeek = () => {
    const snapshot = state;
    const metrics = computeConsistencyMetrics(
      state.weekPlan,
      state.multipliers,
      state.consumed,
      targets,
      localizedFoodsById,
      activeMealsById
    );
    const promotedPlan = state.nextWeekPlan;
    const freshNextWeek = generateNextWeekPlan(
      promotedPlan,
      state.profile.diet ?? 'non-veg',
      state.profile.excludedAllergens ?? [],
      activeMealLibrary,
      localizedFoodsById,
      'rotate'
    );
    const scaled = scalePortionsToTarget(
      promotedPlan,
      targets,
      localizedFoodsById,
      activeMealsById
    );

    setState((prev) => ({
      ...prev,
      weekPlan: promotedPlan,
      nextWeekPlan: freshNextWeek,
      multipliers: scaled,
      consumed: createInitialConsumedState(),
      hydration: createInitialHydrationState(),
      batchDone: {},
      nextWeekPrepDone: {},
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
    showToast('Next week is now your active schedule (prior week archived)', () => {
      setState(snapshot);
      setToast(null);
    });
  };

  const handleToggleNextWeekPrepTask = (taskId: string) => {
    setState((prev) => ({
      ...prev,
      nextWeekPrepDone: {
        ...prev.nextWeekPrepDone,
        [taskId]: !prev.nextWeekPrepDone[taskId],
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
    const snapshot = state;
    const resetNextWeek = generateNextWeekPlan(
      DEFAULT_WEEK_PLAN,
      DEFAULT_PROFILE.diet ?? 'non-veg',
      [],
      MEAL_LIBRARY,
      undefined,
      'rotate'
    );
    setState((prev) => ({
      profile: {
        ...DEFAULT_PROFILE,
        householdServings: 1,
        excludedAllergens: [],
      },
      weekPlan: DEFAULT_WEEK_PLAN,
      nextWeekPlan: resetNextWeek,
      multipliers: createInitialPortionMultipliers(),
      consumed: createInitialConsumedState(),
      hydration: createInitialHydrationState(),
      batchDone: {},
      nextWeekPrepDone: {},
      pantryChecked: {},
      selectedDay: getCurrentDayOfWeek(),
      customFoods: prev.customFoods,
      onboardingComplete: prev.onboardingComplete,
      weekHistory: prev.weekHistory,
      aiLocalPlan: prev.aiLocalPlan,
      isAiPlanActive: false,
      labReport: prev.labReport,
      textSize: prev.textSize,
      affiliateConfig: {
        ...prev.affiliateConfig,
        storePlatform: REGIONS[DEFAULT_PROFILE.locationId].defaultStorePlatform,
        affiliateTag: DEFAULT_AMAZON_PARTNER_TAG,
      },
    }));
    showToast('Plan reset to default schedule', () => {
      setState(snapshot);
      setToast(null);
    });
  };

  const handleToggleTextSize = () => {
    setState((prev) => {
      const nextMode: TextSizeMode = prev.textSize === 'large' ? 'standard' : 'large';
      showToast(
        nextMode === 'large'
          ? 'Large text comfort mode enabled'
          : 'Switched back to standard text size'
      );
      return { ...prev, textSize: nextMode };
    });
  };

  const handleExportGroceryCsv = () => {
    const region = REGIONS[state.profile.locationId] ?? REGIONS.hyderabad;
    const servings = state.profile.householdServings ?? 1;
    const grocery = aggregateWeeklyGrocery(
      state.weekPlan,
      state.multipliers,
      activeMealsById,
      localizedFoodsById,
      servings
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
    <div id="top" className="min-h-screen flex bg-[#f6f8f7] text-slate-900">
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
          textSize={state.textSize}
          onToggleTextSize={handleToggleTextSize}
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
              mealsById={activeMealsById}
              affiliateConfig={state.affiliateConfig}
              onToggleConsumed={handleToggleConsumed}
              onChangeMultiplier={handleChangeMultiplier}
              onOpenSwapModal={(day, slot) => setSwapTarget({ day, slot, targetWeek: 'current' })}
              onOpenCookMode={(day, slot) => setCookTarget({ day, slot })}
              onMarkAllDayConsumed={handleMarkAllDayConsumed}
              onScaleWeekToTarget={handleScaleWeekToTarget}
              onAdaptWeekDifficulty={handleAdaptWeekDifficulty}
              onAdaptWeekAllergens={handleAdaptWeekAllergens}
              onResetDefaults={handleResetDefaults}
              hydrationGlasses={state.hydration[state.selectedDay] ?? 0}
              hydrationTarget={hydrationTarget}
              onAdjustHydration={handleAdjustHydration}
              weekHistory={state.weekHistory}
              onStartNewWeek={handleStartNewWeek}
              activeAiLocation={state.isAiPlanActive && state.aiLocalPlan ? state.aiLocalPlan.locationName : null}
              onOpenAiPlanner={() => {
                setWeeklySection('ai');
                setActiveTab('weekly');
              }}
              onJumpToNextWeek={() => {
                setWeeklySection('next_week');
                setActiveTab('weekly');
              }}
              onboardingSlot={
                !state.onboardingComplete ? (
                  <OnboardingBanner
                    profile={state.profile}
                    onApplyOnboarding={handleApplyOnboarding}
                    onDismiss={() =>
                      setState((prev) => ({ ...prev, onboardingComplete: true }))
                    }
                  />
                ) : undefined
              }
            />
          )}

          {activeTab === 'weekly' && (
            <WeeklyPrepView
              profile={state.profile}
              weekPlan={state.weekPlan}
              nextWeekPlan={state.nextWeekPlan}
              multipliers={state.multipliers}
              consumed={state.consumed}
              targets={targets}
              locationId={state.profile.locationId}
              householdServings={state.profile.householdServings ?? 1}
              pantryChecked={state.pantryChecked}
              nextWeekPrepDone={state.nextWeekPrepDone}
              foodsById={localizedFoodsById}
              mealsById={activeMealsById}
              batchTasks={activeBatchTasks}
              affiliateConfig={state.affiliateConfig}
              batchDone={state.batchDone}
              savedAiPlan={state.aiLocalPlan}
              isAiPlanActive={state.isAiPlanActive}
              activeSection={weeklySection}
              onChangeSection={setWeeklySection}
              onChangeHouseholdServings={handleChangeHouseholdServings}
              onGenerateNextWeek={handleGenerateNextWeek}
              onOpenSwapNextWeekMeal={(day, slot) =>
                setSwapTarget({ day, slot, targetWeek: 'next' })
              }
              onToggleNextWeekPrepTask={handleToggleNextWeekPrepTask}
              onPromoteNextWeek={handlePromoteNextWeek}
              onJumpToGrocery={() => setActiveTab('grocery')}
              onAiPlanGenerated={handleAiPlanGenerated}
              onApplyAiPlan={handleApplyAiPlan}
              onRestoreCuratedPlan={handleRestoreCuratedPlan}
              onToggleBatchTask={handleToggleBatchTask}
              onJumpToDay={(day) => {
                setState((prev) => ({ ...prev, selectedDay: day }));
                setActiveTab('overview');
              }}
              onOpenSwapModal={(day, slot) => setSwapTarget({ day, slot, targetWeek: 'current' })}
              onAdaptWeekDifficulty={handleAdaptWeekDifficulty}
              onNotify={(msg) => showToast(msg)}
            />
          )}

          {activeTab === 'grocery' && (
            <GroceryListView
              weekPlan={state.weekPlan}
              multipliers={state.multipliers}
              locationId={state.profile.locationId}
              householdServings={state.profile.householdServings ?? 1}
              onChangeHouseholdServings={handleChangeHouseholdServings}
              foodsById={localizedFoodsById}
              mealsById={activeMealsById}
              affiliateConfig={state.affiliateConfig}
              pantryChecked={state.pantryChecked}
              onTogglePantryItem={handleTogglePantryItem}
              onClearPantryChecked={handleClearPantryChecked}
              onOpenAffiliateModal={handleOpenAffiliateModal}
              onOpenLegalModal={() => setLegalModalOpen(true)}
              onJumpToLabs={() => setActiveTab('labs')}
              onNotify={(msg) => showToast(msg)}
            />
          )}

          {activeTab === 'labs' && (
            <LabInsightsView
              profile={state.profile}
              savedReport={state.labReport}
              onReportGenerated={(report) =>
                setState((prev) => ({ ...prev, labReport: report }))
              }
              onJumpToNextWeek={() => {
                setWeeklySection('next_week');
                setActiveTab('weekly');
              }}
              onNotify={(msg) => showToast(msg)}
            />
          )}

          {activeTab === 'foods' && (
            <FoodIndexView
              locationId={state.profile.locationId}
              sex={state.profile.sex}
              foods={localizedFoods}
              affiliateConfig={state.affiliateConfig}
              onOpenAddFoodModal={() => setCustomFoodModalOpen(true)}
              onOpenAffiliateModal={handleOpenAffiliateModal}
              onDeleteCustomFood={handleDeleteCustomFood}
            />
          )}
        </main>
      </div>

      {swapTarget && (
        <MealSwapModal
          isOpen={true}
          day={swapTarget.day}
          slot={swapTarget.slot}
          currentMealId={
            swapTarget.targetWeek === 'next'
              ? state.nextWeekPlan[swapTarget.day][swapTarget.slot]
              : state.weekPlan[swapTarget.day][swapTarget.slot]
          }
          portionMultiplier={state.multipliers[swapTarget.day][swapTarget.slot]}
          locationId={state.profile.locationId}
          diet={state.profile.diet}
          sex={state.profile.sex}
          excludedAllergens={state.profile.excludedAllergens ?? []}
          foodsById={localizedFoodsById}
          mealLibrary={activeMealLibrary}
          onSelectMeal={handleSelectMealForSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}

      {cookTarget && activeMealsById[state.weekPlan[cookTarget.day][cookTarget.slot]] && (
        <CookModeModal
          isOpen={true}
          day={cookTarget.day}
          slot={cookTarget.slot}
          meal={activeMealsById[state.weekPlan[cookTarget.day][cookTarget.slot]]}
          portionMultiplier={state.multipliers[cookTarget.day][cookTarget.slot]}
          isConsumed={state.consumed[cookTarget.day][cookTarget.slot]}
          foodsById={localizedFoodsById}
          onMarkConsumed={() => {
            if (!state.consumed[cookTarget.day][cookTarget.slot]) {
              handleToggleConsumed(cookTarget.day, cookTarget.slot);
            }
          }}
          onClose={() => setCookTarget(null)}
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

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700/80 max-w-md"
        >
          <span className="text-xs sm:text-sm font-medium leading-snug">{toast.message}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {toast.undo && (
              <button
                type="button"
                onClick={toast.undo}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-semibold text-teal-300 hover:text-teal-200 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
