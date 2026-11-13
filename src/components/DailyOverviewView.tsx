import { type ReactNode, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { DAYS_OF_WEEK, MEAL_SLOTS } from '../data/hyderabadMeals';
import { getAgeGroupForAge, getWeightClassForWeight, REGIONS } from '../data/regions';
import type {
  AffiliateLinkConfig,
  ConsumedState,
  DayMealSelection,
  DayOfWeek,
  MacroTargets,
  MealSlot,
  PortionMultipliers,
  UserProfile,
  WeeklyArchiveEntry,
  WholeFood,
} from '../types/nutrition';
import { buildIngredientPurchaseLink } from '../utils/links';
import { computeConsistencyMetrics, getNextUnloggedSlot } from '../utils/habits';
import {
  computeDayTotals,
  computeMealNutrition,
  formatCurrency,
  MEALS_BY_ID,
} from '../utils/nutrition';
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
  affiliateConfig: AffiliateLinkConfig;
  onToggleConsumed: (day: DayOfWeek, slot: MealSlot) => void;
  onChangeMultiplier: (day: DayOfWeek, slot: MealSlot, value: number) => void;
  onOpenSwapModal: (day: DayOfWeek, slot: MealSlot) => void;
  onMarkAllDayConsumed: (day: DayOfWeek, value: boolean) => void;
  onScaleWeekToTarget: () => void;
  onResetDefaults: () => void;
  weekHistory?: WeeklyArchiveEntry[];
  onStartNewWeek?: () => void;
  onboardingSlot?: ReactNode;
}

const PORTION_OPTIONS = [0.75, 1, 1.25];

export function DailyOverviewView({
  profile,
  targets,
  selectedDay,
  onSelectDay,
  weekPlan,
  multipliers,
  consumed,
  foodsById,
  affiliateConfig,
  onToggleConsumed,
  onChangeMultiplier,
  onOpenSwapModal,
  onMarkAllDayConsumed,
  onScaleWeekToTarget,
  onResetDefaults,
  weekHistory = [],
  onStartNewWeek,
  onboardingSlot,
}: DailyOverviewViewProps) {
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  const region = REGIONS[profile.locationId] ?? REGIONS.hyderabad;
  const ageGroup = getAgeGroupForAge(profile.age);
  const weightClass = getWeightClassForWeight(profile.weightKg);

  const daySelection = weekPlan[selectedDay];
  const dayMults = multipliers[selectedDay];
  const dayConsumed = consumed[selectedDay];

  const { planned, consumed: eaten, consumedCount } = computeDayTotals(
    daySelection,
    dayMults,
    dayConsumed,
    MEALS_BY_ID,
    foodsById
  );

  const fatFloorGrams = Math.round(profile.weightKg * 0.9);
  const fatFloorMet = planned.fatG >= fatFloorGrams;
  const budgetMet = planned.costInr <= targets.dailyBudgetInr;
  const calPct = Math.min(100, Math.round((eaten.calories / targets.calories) * 100));
  const plannedCalPct = Math.min(100, Math.round((planned.calories / targets.calories) * 100));
  const calGapRatio = Math.abs(planned.calories - targets.calories) / targets.calories;
  const consistency = computeConsistencyMetrics(weekPlan, multipliers, consumed, targets, foodsById);
  const nextSlot = getNextUnloggedSlot(dayConsumed);

  const toggleExpand = (slot: MealSlot) => {
    setExpandedMeals((prev) => ({ ...prev, [slot]: !prev[slot] }));
  };

  const microGauges = [
    {
      label: 'Zinc',
      subtitle: 'Androgen & sperm motility',
      consumed: eaten.zincMg,
      planned: planned.zincMg,
      target: targets.zincMg,
      unit: 'mg',
    },
    {
      label: 'Magnesium',
      subtitle: 'Free testosterone & sleep',
      consumed: eaten.magnesiumMg,
      planned: planned.magnesiumMg,
      target: targets.magnesiumMg,
      unit: 'mg',
    },
    {
      label: 'Selenium',
      subtitle: 'Thyroid & semen antioxidant',
      consumed: eaten.seleniumMcg,
      planned: planned.seleniumMcg,
      target: targets.seleniumMcg,
      unit: 'mcg',
    },
    {
      label: 'Dietary Nitrates',
      subtitle: 'Nitric oxide & blood flow',
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
          <p className="text-xs text-slate-500">
            {profile.age} yrs ({ageGroup.id}) · {profile.weightKg} kg ({weightClass.rangeLabel}) ·{' '}
            {region.label}
          </p>
          <h2 className="font-display text-xl font-semibold text-slate-900 mt-0.5 text-balance">
            {selectedDay} Hormonal Meal Prep & Macro Log
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
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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

      {/* Primary 4-Column KPI Strip */}
      <section
        aria-label="Daily Macro and Budget Summary"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Energy Intake</span>
            <span className="font-mono tabular-nums text-slate-600">{consumedCount}/4 meals</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {eaten.calories}
            </span>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              / {planned.calories} plan · {targets.calories} target
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

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Protein & Complex Carbs</span>
            <span className="font-mono tabular-nums text-teal-700 font-medium">
              {Math.round((planned.proteinG / targets.proteinG) * 100)}% P goal
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div>
              <span className="block text-[11px] text-slate-500">Protein (Eaten / Plan)</span>
              <span className="font-mono tabular-nums text-lg font-semibold text-slate-900">
                {eaten.proteinG}g
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {' '}
                / {planned.proteinG}g
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">Carbs (Eaten / Plan)</span>
              <span className="font-mono tabular-nums text-lg font-semibold text-slate-900">
                {eaten.carbsG}g
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {' '}
                / {planned.carbsG}g
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
            Target: {targets.proteinG}g P · {targets.carbsG}g C · {planned.fiberG}g fiber
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Steroidogenic Fats</span>
            <span className={`font-medium ${fatFloorMet ? 'text-teal-700' : 'text-amber-700'}`}>
              {fatFloorMet ? 'Floor Met' : 'Below 0.9g/kg'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {eaten.fatG}g
            </span>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              / {planned.fatG}g plan · {targets.fatG}g target
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
            Hormonal minimum: {fatFloorGrams}g/day (eggs, ghee, seeds, fish)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">{region.shortLabel} Daily Cost</span>
            <span className={`font-medium ${budgetMet ? 'text-teal-700' : 'text-red-700'}`}>
              {budgetMet ? 'Within Cap' : 'Over Cap'}
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
          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
            {planned.proteinG > 0
              ? `${formatCurrency((planned.costInr / planned.proteinG) * 100, profile.locationId)} per 100g protein`
              : '—'}
          </p>
        </div>
      </section>

      {/* Hormonal Micronutrient Adequacy Panel */}
      <section
        aria-label="Hormonal Micronutrient Targets"
        className="bg-white border border-slate-200 rounded-xl p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Hormonal & Sexual Health Micronutrients ({ageGroup.id} yrs profile)
            </h3>
            <p className="text-xs text-slate-500">{ageGroup.guidanceNote}</p>
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
                    <span className="text-sm font-medium text-slate-900">{item.label}</span>
                    <span className="block text-[11px] text-slate-500">{item.subtitle}</span>
                  </div>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${statusColor}`}>
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
      </section>

      {/* Weekly Macro Intake Trend Chart */}
      <WeeklyMacroTrendChart
        weekPlan={weekPlan}
        multipliers={multipliers}
        consumed={consumed}
        targets={targets}
        fatFloorGrams={fatFloorGrams}
        selectedDay={selectedDay}
        foodsById={foodsById}
      />

      {/* Behavioral Consistency Momentum & 1-Tap Log Strip */}
      <section
        aria-label="Weekly Consistency Momentum"
        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 text-xs">
            <span className="font-semibold text-slate-900">Weekly Hormone Consistency</span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-teal-700 font-medium">
              {consistency.loggedMealsCount}/{consistency.totalMealsCount} meals ({consistency.adherencePct}%)
            </span>
          </div>
          <p className="text-xs text-slate-600">{consistency.headline}</p>
          {weekHistory.length > 0 && (
            <p className="text-[11px] font-mono tabular-nums text-slate-500">
              Recent weeks:{' '}
              {weekHistory
                .slice(-4)
                .map((w) => `${w.weekLabel} ${w.adherencePct}%`)
                .join(' · ')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {consistency.loggedMealsCount > 0 && onStartNewWeek && (
            <button
              type="button"
              onClick={onStartNewWeek}
              className="px-3 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              Archive & New Week
            </button>
          )}

          {nextSlot ? (
            <button
              type="button"
              onClick={() => onToggleConsumed(selectedDay, nextSlot.slot)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] w-full sm:w-auto text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>Log {selectedDay} {nextSlot.label}</span>
            </button>
          ) : (
            <span className="text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 px-3 py-2 rounded-lg whitespace-nowrap">
              {selectedDay} 4/4 Complete
            </span>
          )}
        </div>
      </section>

      {/* Daily Meal Prep Schedule */}
      <section aria-label={`${selectedDay} Meal Schedule`} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            {selectedDay} Meal Prep Schedule
          </h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Total Planned: {planned.calories} kcal ·{' '}
            {formatCurrency(planned.costInr, profile.locationId)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {MEAL_SLOTS.map((slotMeta) => {
            const mealId = daySelection[slotMeta.id];
            const meal = MEALS_BY_ID[mealId];
            if (!meal) return null;

            const mult = dayMults[slotMeta.id] ?? 1;
            const isConsumed = dayConsumed[slotMeta.id];
            const stats = computeMealNutrition(meal, mult, foodsById);
            const isExpanded = Boolean(expandedMeals[slotMeta.id]);

            return (
              <div key={slotMeta.id} className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleConsumed(selectedDay, slotMeta.id)}
                      aria-pressed={isConsumed}
                      aria-label={`Mark ${slotMeta.label} (${meal.name}) as ${isConsumed ? 'not eaten' : 'eaten'}`}
                      className={`mt-0.5 w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                        isConsumed
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'bg-white border-slate-300 text-slate-400 hover:border-teal-600 hover:text-teal-700'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{slotMeta.label}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{slotMeta.timeWindow}</span>
                        <span aria-hidden="true">·</span>
                        <span>{meal.focusTag}</span>
                        <span aria-hidden="true">·</span>
                        <span>{meal.prepTimeMinutes} min</span>
                      </div>

                      <h4
                        className={`font-display text-base font-semibold ${
                          isConsumed ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {meal.name}
                      </h4>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {meal.hormonalBenefit}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-mono tabular-nums text-slate-700">
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
                            className={`px-2.5 py-1.5 min-h-[34px] text-xs font-mono tabular-nums rounded-md transition-colors whitespace-nowrap shrink-0 ${
                              mult === option
                                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {option}×
                          </button>
                        ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSwapModal(selectedDay, slotMeta.id)}
                      aria-label={`Swap ${slotMeta.label} meal`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Swap</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(slotMeta.id)}
                      aria-expanded={isExpanded}
                      aria-label={`Toggle ingredients and prep for ${slotMeta.label}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
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
                      <h5 className="text-xs font-semibold text-slate-800 mb-2">
                        Whole-Food Ingredients ({mult}× portion)
                      </h5>
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-100">
                          {meal.ingredients.map((ing) => {
                            const food = foodsById[ing.foodId];
                            if (!food) return null;
                            const scaledGrams = Math.round(ing.grams * mult);
                            const scaledCost = (scaledGrams / 100) * food.pricePer100gInr;
                            const link = buildIngredientPurchaseLink(food, affiliateConfig);
                            return (
                              <tr key={ing.foodId}>
                                <td className="py-1.5 pr-2 text-slate-800">
                                  <span className="font-medium">{food.name}</span>
                                  {ing.prepNote && (
                                    <span className="text-slate-500"> · {ing.prepNote}</span>
                                  )}
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                                  {scaledGrams} g
                                </td>
                                <td className="py-1.5 pl-3 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                                  {formatCurrency(scaledCost, profile.locationId)}
                                </td>
                                <td className="py-1.5 pl-3 text-right whitespace-nowrap">
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer sponsored"
                                    aria-label={`Buy ${food.name} (${link.sourceLabel})`}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-900 underline-offset-2 hover:underline"
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
                      <h5 className="text-xs font-semibold text-slate-800 mb-2">
                        Preparation Steps
                      </h5>
                      <ol className="space-y-1.5 text-xs text-slate-600 list-decimal list-inside">
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
          })}
        </div>
      </section>
    </div>
  );
}
