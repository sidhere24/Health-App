import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Droplets,
  ExternalLink,
  Minus,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { DAYS_OF_WEEK, MEAL_SLOTS } from '../data/hyderabadMeals';
import { getAgeGroupForAge, getAgeGuidanceForSex, getWeightClassForWeight, REGIONS } from '../data/regions';
import type {
  AffiliateLinkConfig,
  AllergenId,
  BiologicalSex,
  ConsumedState,
  DayMealSelection,
  DayOfWeek,
  MacroTargets,
  MealDifficulty,
  MealSlot,
  MealTemplate,
  PortionMultipliers,
  UserProfile,
  WeeklyArchiveEntry,
  WholeFood,
} from '../types/nutrition';
import { buildIngredientPurchaseLink } from '../utils/links';
import { computeConsistencyMetrics, getNextUnloggedSlot } from '../utils/habits';
import {
  ALLERGEN_OPTIONS,
  computeDayTotals,
  computeMealNutrition,
  formatCurrency,
  getInclusivePathwayLabel,
  getMealAllergens,
  getMealDifficulty,
  getMealDifficultyRank,
  getCurrentDayOfWeek,
  getMicroSubtitles,
  isMealSafeForAllergens,
  matchesDifficultyFilter,
  MEAL_DIFFICULTIES,
  MEALS_BY_ID,
} from '../utils/nutrition';
import { WeeklyAdherenceBarChart } from './WeeklyAdherenceBarChart';
import { WeeklyMacroTrendChart } from './WeeklyMacroTrendChart';

interface DailyOverviewViewProps {
  profile: UserProfile;
  targets: MacroTargets;
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
  weekPlan: Record<DayOfWeek, DayMealSelection>;
  multipliers: PortionMultipliers;
  consumed: ConsumedState;
  foodsById: Record<string, WholeFood>;
  mealsById?: Record<string, MealTemplate>;
  affiliateConfig: AffiliateLinkConfig;
  onToggleConsumed: (day: DayOfWeek, slot: MealSlot) => void;
  onChangeMultiplier: (day: DayOfWeek, slot: MealSlot, value: number) => void;
  onOpenSwapModal: (day: DayOfWeek, slot: MealSlot) => void;
  onOpenCookMode?: (day: DayOfWeek, slot: MealSlot) => void;
  onMarkAllDayConsumed: (day: DayOfWeek, value: boolean) => void;
  onScaleWeekToTarget: () => void;
  onAdaptWeekDifficulty?: (maxDifficulty: MealDifficulty) => void;
  onAdaptWeekAllergens?: () => void;
  onResetDefaults: () => void;
  hydrationGlasses?: number;
  hydrationTarget?: number;
  onAdjustHydration?: (delta: number) => void;
  weekHistory?: WeeklyArchiveEntry[];
  onStartNewWeek?: () => void;
  activeAiLocation?: string | null;
  onOpenAiPlanner?: () => void;
  onJumpToNextWeek?: () => void;
  onboardingSlot?: ReactNode;
}

const PORTION_OPTIONS = [0.75, 1, 1.25];

const DIFFICULTY_TEXT_STYLE: Record<MealDifficulty, string> = {
  Easy: 'text-teal-700 font-semibold',
  Moderate: 'text-amber-700 font-semibold',
  Pro: 'text-indigo-700 font-semibold',
};

const SEX_LABELS: Record<BiologicalSex, string> = {
  female: 'Female',
  male: 'Male',
  neutral: 'Neutral',
};

export function DailyOverviewView({
  profile,
  targets,
  selectedDay,
  onSelectDay,
  weekPlan,
  multipliers,
  consumed,
  foodsById,
  mealsById = MEALS_BY_ID,
  affiliateConfig,
  onToggleConsumed,
  onChangeMultiplier,
  onOpenSwapModal,
  onOpenCookMode,
  onMarkAllDayConsumed,
  onScaleWeekToTarget,
  onAdaptWeekDifficulty,
  onAdaptWeekAllergens,
  onResetDefaults,
  hydrationGlasses = 0,
  hydrationTarget = 10,
  onAdjustHydration,
  weekHistory = [],
  onStartNewWeek,
  activeAiLocation = null,
  onOpenAiPlanner,
  onJumpToNextWeek,
  onboardingSlot,
}: DailyOverviewViewProps) {
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [difficultyFilter, setDifficultyFilter] = useState<MealDifficulty | 'all'>('all');
  const [showInsights, setShowInsights] = useState(true);
  const [mobileScreen, setMobileScreen] = useState<'meals' | 'targets' | 'insights'>('meals');

  const region = REGIONS[profile.locationId] ?? REGIONS.hyderabad;
  const sex: BiologicalSex = profile.sex ?? 'male';
  const excludedAllergens: AllergenId[] = profile.excludedAllergens ?? [];
  const ageGroup = getAgeGroupForAge(profile.age);
  const ageGuidance = getAgeGuidanceForSex(profile.age, sex);
  const weightClass = getWeightClassForWeight(profile.weightKg);
  const microSubtitles = getMicroSubtitles(sex);

  const daySelection = weekPlan[selectedDay];
  const dayMults = multipliers[selectedDay];
  const dayConsumed = consumed[selectedDay];

  const { planned, consumed: eaten, consumedCount } = computeDayTotals(
    daySelection,
    dayMults,
    dayConsumed,
    mealsById,
    foodsById
  );

  const fatFloorGrams = Math.round(profile.weightKg * 0.9);
  const fatFloorMet = planned.fatG >= fatFloorGrams;
  const budgetMet = planned.costInr <= targets.dailyBudgetInr;
  const calPct = Math.min(100, Math.round((eaten.calories / targets.calories) * 100));
  const plannedCalPct = Math.min(100, Math.round((planned.calories / targets.calories) * 100));
  const calGapRatio = Math.abs(planned.calories - targets.calories) / targets.calories;
  const consistency = computeConsistencyMetrics(
    weekPlan,
    multipliers,
    consumed,
    targets,
    foodsById,
    mealsById
  );
  const nextSlot = getNextUnloggedSlot(dayConsumed);

  // --- Feature 1: time-based next-meal nudge (ticks every minute) ---
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const timeHint = useMemo(
    () => new Date(nowMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    [nowMs]
  );
  const nudgeSlot = useMemo(() => {
    const now = new Date(nowMs);
    const hm = now.getHours() * 60 + now.getMinutes();
    const range = (s: string): [number, number] => {
      const re = /(\d{1,2}):(\d{2})/g;
      const a = re.exec(s);
      const b = re.exec(s);
      const start = a ? Number(a[1]) * 60 + Number(a[2]) : 0;
      const end = b ? Number(b[1]) * 60 + Number(b[2]) : start + 90;
      return [start, end];
    };
    const candidates: Array<{ meta: (typeof MEAL_SLOTS)[number]; delta: number }> = [];
    for (const meta of MEAL_SLOTS) {
      if (consumed[selectedDay][meta.id]) continue;
      const [start, end] = range(meta.timeWindow);
      if (hm >= start - 15) candidates.push({ meta, delta: hm - start });
      else if (hm >= end + 30) candidates.push({ meta, delta: hm - end - 30 });
    }
    candidates.sort((a, b) => a.delta - b.delta);
    return candidates[0]?.meta ?? null;
  }, [nowMs, consumed, selectedDay]);

  // --- Feature 2: streak of consecutive active days with planned meals (ends today) ---
  const streakDays = useMemo(() => {
    const todayIdx = DAYS_OF_WEEK.indexOf(getCurrentDayOfWeek(new Date()));
    let streak = 0;
    for (let i = todayIdx; i >= 0; i--) {
      const day = DAYS_OF_WEEK[i];
      if (day && Object.values(weekPlan[day]).some(Boolean)) streak += 1;
      else break;
    }
    return streak;
  }, [weekPlan]);
  const nextSlotMeta = nextSlot
    ? MEAL_SLOTS.find((s) => s.id === nextSlot.slot)
    : null;

  const visibleSlots = MEAL_SLOTS.filter((slotMeta) => {
    const meal = mealsById[daySelection[slotMeta.id]];
    if (!meal) return false;
    return matchesDifficultyFilter(meal, difficultyFilter);
  });

  const weekHasMealsAboveFilter =
    difficultyFilter === 'Easy' || difficultyFilter === 'Moderate'
      ? DAYS_OF_WEEK.some((day) =>
          (['breakfast', 'lunch', 'snack', 'dinner'] as MealSlot[]).some((slot) => {
            const meal = mealsById[weekPlan[day][slot]];
            if (!meal) return false;
            return getMealDifficultyRank(getMealDifficulty(meal)) > getMealDifficultyRank(difficultyFilter);
          })
        )
      : false;

  const allergenConflictCount =
    excludedAllergens.length > 0
      ? DAYS_OF_WEEK.reduce((count, day) => {
          return (
            count +
            (['breakfast', 'lunch', 'snack', 'dinner'] as MealSlot[]).filter((slot) => {
              const meal = mealsById[weekPlan[day][slot]];
              return meal ? !isMealSafeForAllergens(meal, excludedAllergens, foodsById) : false;
            }).length
          );
        }, 0)
      : 0;

  const hydrationPct = Math.min(100, Math.round((hydrationGlasses / Math.max(1, hydrationTarget)) * 100));
  const hydrationLiters = (hydrationGlasses * 0.25).toFixed(2);
  const hydrationTargetLiters = (hydrationTarget * 0.25).toFixed(2);
  const allergenLabelsById = Object.fromEntries(ALLERGEN_OPTIONS.map((o) => [o.id, o.label]));

  const toggleExpand = (slot: MealSlot) => {
    setExpandedMeals((prev) => ({ ...prev, [slot]: !prev[slot] }));
  };

  const microGauges = [
    {
      label: 'Zinc',
      subtitle: microSubtitles.zinc,
      consumed: eaten.zincMg,
      planned: planned.zincMg,
      target: targets.zincMg,
      unit: 'mg',
    },
    {
      label: 'Magnesium',
      subtitle: microSubtitles.magnesium,
      consumed: eaten.magnesiumMg,
      planned: planned.magnesiumMg,
      target: targets.magnesiumMg,
      unit: 'mg',
    },
    {
      label: 'Selenium',
      subtitle: microSubtitles.selenium,
      consumed: eaten.seleniumMcg,
      planned: planned.seleniumMcg,
      target: targets.seleniumMcg,
      unit: 'mcg',
    },
    {
      label: 'Dietary Nitrates',
      subtitle: microSubtitles.nitrates,
      consumed: eaten.nitratesMg,
      planned: planned.nitratesMg,
      target: targets.nitratesMg,
      unit: 'mg',
    },
  ];

  return (
    <div className="space-y-6">
      {onboardingSlot}

      {/* Contextual Header & Day Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <p className="text-xs sm:text-sm text-slate-600">
            {SEX_LABELS[sex]} · {profile.age} yrs ({ageGroup.id}) · {profile.weightKg} kg ({weightClass.rangeLabel}) ·{' '}
            {activeAiLocation ? `AI Local Plan: ${activeAiLocation}` : region.label}
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5 text-balance">
            {selectedDay} Nutrition & Meal Plan
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Select day of week"
            className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg overflow-x-auto max-w-full"
          >
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectDay(day)}
                  className={`px-3 py-1.5 min-h-[40px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {calGapRatio > 0.08 && (
            <button
              type="button"
              onClick={onScaleWeekToTarget}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Scale Portions to {targets.calories} kcal</span>
            </button>
          )}

          {onOpenAiPlanner && (
            <button
              type="button"
              onClick={onOpenAiPlanner}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Local Plan</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onMarkAllDayConsumed(selectedDay, consumedCount < 4)}
            className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {consumedCount === 4 ? 'Uncheck All' : 'Mark All Eaten'}
          </button>

          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Plan</span>
          </button>
        </div>
      </div>

      {/* Mobile Screen-by-Screen Switcher (Replaces Long Vertical Scroll on Phones) */}
      <div className="lg:hidden space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs font-mono tabular-nums text-slate-700">
          <span>
            <strong className="text-slate-900">{eaten.calories}</strong>/{planned.calories} kcal
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>
            <strong className="text-slate-900">{eaten.proteinG}g</strong> P
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-sky-700 font-semibold">
            {hydrationGlasses}/{hydrationTarget} water
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Daily screen sections"
          className="grid grid-cols-3 p-1 bg-slate-200/70 rounded-xl gap-1"
        >
          {[
            { id: 'meals' as const, label: `Meals (${consumedCount}/4)` },
            { id: 'targets' as const, label: 'Targets' },
            { id: 'insights' as const, label: 'Insights' },
          ].map((tab) => {
            const active = mobileScreen === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMobileScreen(tab.id)}
                className={`py-2 px-2 min-h-[42px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Immediate 1-Tap Next Meal Focus Strip (Fitts's Law Primary Action) */}
      <section
        aria-label="Next Meal Action and Weekly Progress"
        className={`${mobileScreen === 'meals' ? 'flex' : 'hidden lg:flex'} bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex-col sm:flex-row sm:items-center justify-between gap-4`}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 text-xs sm:text-sm">
            <span className="font-semibold text-slate-900">
              {nextSlot
                ? `Next up: ${nextSlot.label}${nextSlotMeta ? ` · ${nextSlotMeta.timeWindow}` : ''}`
                : `${selectedDay} All 4 Meals Complete`}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-teal-700 font-medium">
              This week: {consistency.loggedMealsCount}/{consistency.totalMealsCount} meals (
              {consistency.adherencePct}%)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {consistency.headline}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            {nudgeSlot && nudgeSlot.id !== nextSlot?.slot && (
              <p role="status" aria-live="polite" className="text-[11px] sm:text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                It’s {timeHint} — {nudgeSlot.label} is overdue.
              </p>
            )}
            {streakDays > 1 && (
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-1 rounded-md">
                {streakDays}-day plan streak
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {consistency.loggedMealsCount > 0 && onStartNewWeek && (
            <button
              type="button"
              onClick={onStartNewWeek}
              className="px-3.5 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              Archive & New Week
            </button>
          )}

          {nextSlot ? (
            <button
              type="button"
              onClick={() => onToggleConsumed(selectedDay, nextSlot.slot)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] w-full sm:w-auto text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>Log {selectedDay} {nextSlot.label}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-teal-800 bg-teal-50 border border-teal-200 px-3.5 py-2.5 min-h-[44px] rounded-lg whitespace-nowrap">
              <Check className="w-4 h-4" />
              <span>{selectedDay} 4/4 Complete</span>
            </span>
          )}
        </div>
      </section>

      {/* Primary 4-Column Summary Strip */}
      <section
        aria-label="Daily Nutrition and Budget Summary"
        className={`${mobileScreen === 'targets' ? 'grid' : 'hidden lg:grid'} grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`}
      >
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Daily Calories</span>
            <span className="font-mono tabular-nums text-slate-600">{consumedCount}/4 meals</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {eaten.calories}
            </span>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              / {planned.calories} plan · {targets.calories} goal
            </span>
          </div>
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-slate-300 rounded-full"
              style={{ width: `${plannedCalPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-teal-700 rounded-full transition-all duration-200"
              style={{ width: `${calPct}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Protein & Carbs</span>
            <span className="font-mono tabular-nums text-teal-700 font-semibold">
              {Math.round((planned.proteinG / targets.proteinG) * 100)}% protein
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div>
              <span className="block text-xs text-slate-500">Protein</span>
              <span className="font-mono tabular-nums text-lg font-semibold text-slate-900">
                {eaten.proteinG}g
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {' '}
                / {planned.proteinG}g
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Carbs</span>
              <span className="font-mono tabular-nums text-lg font-semibold text-slate-900">
                {eaten.carbsG}g
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {' '}
                / {planned.carbsG}g
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            Goal: {targets.proteinG}g P · {targets.carbsG}g C · {planned.fiberG}g fiber
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Essential Healthy Fats</span>
            <span className={`font-semibold ${fatFloorMet ? 'text-teal-700' : 'text-amber-700'}`}>
              {fatFloorMet ? 'Healthy Floor Met' : 'Below 0.9g/kg'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {eaten.fatG}g
            </span>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              / {planned.fatG}g plan · {targets.fatG}g goal
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            Daily minimum: {fatFloorGrams}g (eggs, ghee, seeds, fish)
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="text-slate-600 font-medium truncate">
              {activeAiLocation ? `${activeAiLocation} Food Cost` : `${region.shortLabel} Food Cost`}
            </span>
            <span className={`font-semibold shrink-0 ${budgetMet ? 'text-teal-700' : 'text-red-700'}`}>
              {budgetMet ? 'Within Budget' : 'Over Budget'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {formatCurrency(planned.costInr, profile.locationId)}
            </span>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              / {formatCurrency(targets.dailyBudgetInr, profile.locationId)} cap ·{' '}
              {formatCurrency(eaten.costInr, profile.locationId)} eaten
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            {planned.proteinG > 0
              ? `${formatCurrency((planned.costInr / planned.proteinG) * 100, profile.locationId)} per 100g protein`
              : '—'}
          </p>
        </div>
      </section>

      {/* Integrated Daily Hydration Strip */}
      {onAdjustHydration && (
        <section
          aria-label="Daily Hydration Tracker"
          className={`${mobileScreen === 'targets' ? 'flex' : 'hidden lg:flex'} bg-white border border-slate-200/90 rounded-xl px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex-col sm:flex-row sm:items-center justify-between gap-4`}
        >
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="font-semibold text-slate-900">{selectedDay} Hydration</span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-slate-700 font-medium">
                  {hydrationGlasses} / {hydrationTarget} glasses ({hydrationLiters}L / {hydrationTargetLiters}L)
                </span>
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  hydrationGlasses >= hydrationTarget ? 'text-teal-700' : 'text-slate-500'
                }`}
              >
                {hydrationGlasses >= hydrationTarget ? 'Goal Met' : `${hydrationPct}%`}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all duration-200"
                style={{ width: `${hydrationPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onAdjustHydration(-1)}
              disabled={hydrationGlasses <= 0}
              aria-label={`Remove 1 glass of water for ${selectedDay}`}
              className="w-11 h-11 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onAdjustHydration(1)}
              aria-label={`Add 1 glass of water for ${selectedDay}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-medium text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-sky-700" />
              <span>+1 Glass (250ml)</span>
            </button>
          </div>
        </section>
      )}

      {/* Allergen Guardrail Notice (only appears if active schedule conflicts with user exclusions) */}
      {allergenConflictCount > 0 && onAdaptWeekAllergens && (
        <section
          role="region"
          aria-label="Allergen Guardrail Alert"
          className="bg-amber-50/80 border border-amber-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-950">
              <span className="font-semibold">
                {allergenConflictCount} scheduled meal{allergenConflictCount === 1 ? '' : 's'} contain excluded allergens (
                {excludedAllergens.map((id) => allergenLabelsById[id] ?? id).join(', ')}).
              </span>{' '}
              <span className="text-amber-900">
                Swap them automatically to keep your week allergen-safe.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onAdaptWeekAllergens}
            className="px-4 py-2.5 min-h-[42px] text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Adapt Week to Allergen-Safe
          </button>
        </section>
      )}

      {/* Mobile Jump Bar on Targets Screen */}
      {mobileScreen === 'targets' && (
        <div className="lg:hidden flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setMobileScreen('meals')}
            className="px-3.5 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl"
          >
            Back to Meals
          </button>
          <button
            type="button"
            onClick={() => setMobileScreen('insights')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl whitespace-nowrap"
          >
            <span>Next: Insights & Minerals</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Daily Meal Prep Schedule — Elevated Above Deep Analytics (Meal-First Hierarchy) */}
      <section
        aria-label={`${selectedDay} Meal Schedule`}
        className={`${mobileScreen === 'meals' ? 'block' : 'hidden lg:block'} space-y-3`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-base font-semibold text-slate-900">
              {selectedDay} Meal Prep Schedule
            </h3>
            <span className="text-xs sm:text-sm text-slate-600 font-mono tabular-nums">
              Total Planned: {planned.calories} kcal ·{' '}
              {formatCurrency(planned.costInr, profile.locationId)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter daily meals by difficulty"
              className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg"
            >
              {(['all', ...MEAL_DIFFICULTIES] as const).map((level) => {
                const isSelected = difficultyFilter === level;
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setDifficultyFilter(level)}
                    className={`px-3 py-1.5 min-h-[38px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {level === 'all' ? 'All' : level}
                  </button>
                );
              })}
            </div>

            {weekHasMealsAboveFilter &&
              onAdaptWeekDifficulty &&
              (difficultyFilter === 'Easy' || difficultyFilter === 'Moderate') && (
                <button
                  type="button"
                  onClick={() => onAdaptWeekDifficulty(difficultyFilter)}
                  className="px-3.5 py-2 min-h-[38px] text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {difficultyFilter === 'Easy'
                    ? 'Adapt Week to Easy'
                    : 'Adapt Week to <= Moderate'}
                </button>
              )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl divide-y divide-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {visibleSlots.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm font-medium text-slate-800">
                No {difficultyFilter} meals scheduled for {selectedDay}.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Show all meals to swap individual slots, or adapt your weekly prep plan to match
                your available cooking time and skill.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDifficultyFilter('all')}
                  className="px-4 py-2 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Show All Meals
                </button>
                {(difficultyFilter === 'Easy' || difficultyFilter === 'Moderate') &&
                  onAdaptWeekDifficulty && (
                    <button
                      type="button"
                      onClick={() => onAdaptWeekDifficulty(difficultyFilter)}
                      className="px-4 py-2 min-h-[44px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
                    >
                      {difficultyFilter === 'Easy'
                        ? 'Switch Week to Easy Meals'
                        : 'Switch Week to <= Moderate'}
                    </button>
                  )}
              </div>
            </div>
          ) : (
            visibleSlots.map((slotMeta) => {
              const mealId = daySelection[slotMeta.id];
              const meal = mealsById[mealId];
              if (!meal) return null;

              const mult = dayMults[slotMeta.id] ?? 1;
              const isConsumed = dayConsumed[slotMeta.id];
              const stats = computeMealNutrition(meal, mult, foodsById);
              const difficulty = getMealDifficulty(meal);
              const isExpanded = Boolean(expandedMeals[slotMeta.id]);
              const inclusiveFocus = getInclusivePathwayLabel(meal.focusTag, sex);
              const conflictingAllergens =
                excludedAllergens.length > 0
                  ? getMealAllergens(meal, foodsById).filter((a) => excludedAllergens.includes(a))
                  : [];

              return (
                <div key={slotMeta.id} className="p-5 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleConsumed(selectedDay, slotMeta.id)}
                        aria-pressed={isConsumed}
                        aria-label={`Mark ${slotMeta.label} (${meal.name}) as ${isConsumed ? 'not eaten' : 'eaten'}`}
                        className={`mt-0.5 w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                          isConsumed
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'bg-white border-slate-300 text-slate-400 hover:border-teal-600 hover:text-teal-700'
                        }`}
                      >
                        <Check className="w-5 h-5" />
                      </button>

                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-600">
                          <span className="font-semibold text-slate-800">{slotMeta.label}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{slotMeta.timeWindow}</span>
                          <span aria-hidden="true">·</span>
                          <span className={DIFFICULTY_TEXT_STYLE[difficulty]}>{difficulty}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{meal.prepTimeMinutes} min</span>
                          <span aria-hidden="true">·</span>
                          <span>{inclusiveFocus}</span>
                          {conflictingAllergens.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-amber-700">
                                Contains {conflictingAllergens.map((id) => allergenLabelsById[id] ?? id).join(', ')}
                              </span>
                            </>
                          )}
                        </div>

                        <h4
                          className={`font-display text-base sm:text-lg font-semibold ${
                            isConsumed ? 'text-slate-500 line-through' : 'text-slate-900'
                          }`}
                        >
                          {meal.name}
                        </h4>

                        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                          {meal.hormonalBenefit}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs sm:text-sm font-mono tabular-nums text-slate-700">
                          <span className="font-semibold text-slate-900">{stats.calories} kcal</span>
                          <span>{stats.proteinG}g P</span>
                          <span>{stats.carbsG}g C</span>
                          <span>{stats.fatG}g F</span>
                          <span>Zn {stats.zincMg}mg</span>
                          <span>Mg {stats.magnesiumMg}mg</span>
                          <span>NO3 {stats.nitratesMg}mg</span>
                          <span className="font-semibold text-teal-800">
                            {formatCurrency(stats.costInr, profile.locationId)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meal Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 lg:pl-4">
                      <div
                        role="group"
                        aria-label={`Portion multiplier for ${slotMeta.label}`}
                        className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg"
                      >
                        {Array.from(new Set([...PORTION_OPTIONS, mult]))
                          .sort((a, b) => a - b)
                          .map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => onChangeMultiplier(selectedDay, slotMeta.id, option)}
                              aria-pressed={mult === option}
                              className={`px-2.5 py-1.5 min-h-[38px] text-xs font-mono tabular-nums rounded-md transition-colors whitespace-nowrap shrink-0 ${
                                mult === option
                                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {option}×
                            </button>
                          ))}
                      </div>

                      {onOpenCookMode && (
                        <button
                          type="button"
                          onClick={() => onOpenCookMode(selectedDay, slotMeta.id)}
                          aria-label={`Open step-by-step Cook Mode for ${slotMeta.label}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>Cook</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenSwapModal(selectedDay, slotMeta.id)}
                        aria-label={`Swap ${slotMeta.label} meal`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Swap</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(slotMeta.id)}
                        aria-expanded={isExpanded}
                        aria-label={`Toggle ingredients and prep for ${slotMeta.label}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>Prep</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Ingredients & Prep Steps */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">
                          Whole-Food Ingredients ({mult}× portion)
                        </h5>
                        <table className="w-full text-xs sm:text-sm">
                          <tbody className="divide-y divide-slate-100">
                            {meal.ingredients.map((ing) => {
                              const food = foodsById[ing.foodId];
                              if (!food) return null;
                              const scaledGrams = Math.round(ing.grams * mult);
                              const scaledCost = (scaledGrams / 100) * food.pricePer100gInr;
                              const link = buildIngredientPurchaseLink(food, affiliateConfig);
                              return (
                                <tr key={ing.foodId}>
                                  <td className="py-2 pr-2 text-slate-800">
                                    <span className="font-medium">{food.name}</span>
                                    {ing.prepNote && (
                                      <span className="text-slate-500"> · {ing.prepNote}</span>
                                    )}
                                  </td>
                                  <td className="py-2 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                                    {scaledGrams} g
                                  </td>
                                  <td className="py-2 pl-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                                    {formatCurrency(scaledCost, profile.locationId)}
                                  </td>
                                  <td className="py-2 pl-3 text-right whitespace-nowrap">
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer sponsored"
                                      aria-label={`Buy ${food.name} (${link.sourceLabel})`}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900 underline-offset-2 hover:underline"
                                    >
                                      <span>{link.isCustom ? 'Link' : 'Buy'}</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <h5 className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">
                          Preparation Steps
                        </h5>
                        <ol className="space-y-2 text-xs sm:text-sm text-slate-600 list-decimal list-inside">
                          {meal.prepSteps.map((step, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Mobile jump bar from Meals to Targets */}
        <div className="lg:hidden pt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileScreen('targets')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors whitespace-nowrap"
          >
            <span>Next: Targets & Hydration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {onJumpToNextWeek && (
            <button
              type="button"
              onClick={onJumpToNextWeek}
              className="px-3.5 py-2.5 min-h-[44px] text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Next Week
            </button>
          )}
        </div>
      </section>

      {/* Progressive Disclosure: Nutrition Insights & Weekly Trends */}
      <section
        aria-label="Nutrition Insights and Weekly Progress"
        className={`${mobileScreen === 'insights' ? 'block' : 'hidden lg:block'} space-y-4 pt-2`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Nutrition Insights & Weekly Progress
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Essential mineral targets, 7-day macro balance, and weekly adherence history
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInsights((prev) => !prev)}
            aria-expanded={showInsights}
            className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <span>{showInsights ? 'Hide Insights' : 'Show Insights'}</span>
            {showInsights ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>

        {(showInsights || mobileScreen === 'insights') && (
          <div className="space-y-5">
            {/* Essential Minerals & Vitality Panel */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <h4 className="font-display text-sm sm:text-base font-semibold text-slate-900">
                    Essential Minerals & Vitality ({SEX_LABELS[sex]} · {ageGroup.id} yrs)
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{ageGuidance}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 pt-4">
                {microGauges.map((item) => {
                  const plannedPct = Math.min(100, Math.round((item.planned / item.target) * 100));
                  const consumedPct = Math.min(100, Math.round((item.consumed / item.target) * 100));
                  const statusText =
                    item.planned >= item.target
                      ? 'Target Met'
                      : item.planned >= item.target * 0.8
                        ? 'Near Target'
                        : 'Low';
                  const statusColor =
                    item.planned >= item.target
                      ? 'text-teal-700'
                      : item.planned >= item.target * 0.8
                        ? 'text-amber-700'
                        : 'text-red-700';

                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                          <span className="block text-xs text-slate-600">{item.subtitle}</span>
                        </div>
                        <span className={`text-xs font-semibold whitespace-nowrap ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs font-mono tabular-nums">
                        <span className="font-semibold text-slate-900">
                          {item.consumed} {item.unit}
                        </span>
                        <span className="text-slate-500">
                          {item.planned} / {item.target} {item.unit}
                        </span>
                      </div>

                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-slate-300 rounded-full"
                          style={{ width: `${plannedPct}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-teal-700 rounded-full transition-all duration-200"
                          style={{ width: `${consumedPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Macro Intake Trend Chart */}
            <WeeklyMacroTrendChart
              weekPlan={weekPlan}
              multipliers={multipliers}
              consumed={consumed}
              targets={targets}
              fatFloorGrams={fatFloorGrams}
              selectedDay={selectedDay}
              foodsById={foodsById}
              mealsById={mealsById}
            />

            {/* Weekly Adherence History Bar Chart */}
            <WeeklyAdherenceBarChart
              weekHistory={weekHistory}
              currentAdherencePct={consistency.adherencePct}
              currentLoggedMeals={consistency.loggedMealsCount}
              currentTotalMeals={consistency.totalMealsCount}
            />
          </div>
        )}

        {onJumpToNextWeek && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMobileScreen('targets')}
              className="lg:hidden px-3.5 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl"
            >
              Back to Targets
            </button>
            <button
              type="button"
              onClick={onJumpToNextWeek}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl whitespace-nowrap"
            >
              <span>Jump to Next Week Prep & Items</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
