import { useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { BATCH_PREP_TASKS, DAYS_OF_WEEK, MEAL_SLOTS } from '../data/hyderabadMeals';
import type {
  AffiliateLinkConfig,
  AiLocalMealPlan,
  BatchTask,
  ConsumedState,
  DayOfWeek,
  LocationId,
  MacroTargets,
  MealDifficulty,
  MealSlot,
  MealTemplate,
  NextWeekStrategy,
  PortionMultipliers,
  UserProfile,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import {
  formatCurrency,
  getMealDifficulty,
  getMealDifficultyRank,
  getWeeklyDaySummaries,
  matchesDifficultyFilter,
  MEAL_DIFFICULTIES,
  MEALS_BY_ID,
} from '../utils/nutrition';
import { AiLocalMealPlanner } from './AiLocalMealPlanner';
import { NextWeekPrepPanel } from './NextWeekPrepPanel';

export type WeeklySection = 'next_week' | 'this_week' | 'ai';

interface WeeklyPrepViewProps {
  profile: UserProfile;
  weekPlan: WeekPlan;
  nextWeekPlan: WeekPlan;
  multipliers: PortionMultipliers;
  consumed: ConsumedState;
  targets: MacroTargets;
  locationId: LocationId;
  householdServings: number;
  pantryChecked: Record<string, boolean>;
  nextWeekPrepDone: Record<string, boolean>;
  foodsById: Record<string, WholeFood>;
  mealsById?: Record<string, MealTemplate>;
  batchTasks?: BatchTask[];
  affiliateConfig: AffiliateLinkConfig;
  batchDone: Record<string, boolean>;
  savedAiPlan: AiLocalMealPlan | null;
  isAiPlanActive: boolean;
  activeSection: WeeklySection;
  onChangeSection: (section: WeeklySection) => void;
  onChangeHouseholdServings: (servings: number) => void;
  onGenerateNextWeek: (strategy: NextWeekStrategy) => void;
  onOpenSwapNextWeekMeal: (day: DayOfWeek, slot: MealSlot) => void;
  onToggleNextWeekPrepTask: (taskId: string) => void;
  onPromoteNextWeek: () => void;
  onJumpToGrocery: () => void;
  onAiPlanGenerated: (plan: AiLocalMealPlan) => void;
  onApplyAiPlan: (plan: AiLocalMealPlan) => void;
  onRestoreCuratedPlan: () => void;
  onToggleBatchTask: (taskId: string) => void;
  onJumpToDay: (day: DayOfWeek) => void;
  onOpenSwapModal: (day: DayOfWeek, slot: MealSlot) => void;
  onAdaptWeekDifficulty?: (maxDifficulty: MealDifficulty) => void;
  onNotify?: (message: string) => void;
}

const DIFFICULTY_TEXT_STYLE: Record<MealDifficulty, string> = {
  Easy: 'text-teal-700 font-semibold',
  Moderate: 'text-amber-700 font-semibold',
  Pro: 'text-indigo-700 font-semibold',
};

export function WeeklyPrepView({
  profile,
  weekPlan,
  nextWeekPlan,
  multipliers,
  consumed,
  targets,
  locationId,
  householdServings,
  pantryChecked,
  nextWeekPrepDone,
  foodsById,
  mealsById = MEALS_BY_ID,
  batchTasks = BATCH_PREP_TASKS,
  affiliateConfig,
  batchDone,
  savedAiPlan,
  isAiPlanActive,
  activeSection,
  onChangeSection,
  onChangeHouseholdServings,
  onGenerateNextWeek,
  onOpenSwapNextWeekMeal,
  onToggleNextWeekPrepTask,
  onPromoteNextWeek,
  onJumpToGrocery,
  onAiPlanGenerated,
  onApplyAiPlan,
  onRestoreCuratedPlan,
  onToggleBatchTask,
  onJumpToDay,
  onOpenSwapModal,
  onAdaptWeekDifficulty,
  onNotify,
}: WeeklyPrepViewProps) {
  const [difficultyFilter, setDifficultyFilter] = useState<MealDifficulty | 'all'>('all');
  const [mobileDayIdx, setMobileDayIdx] = useState(0);
  const [thisWeekSubView, setThisWeekSubView] = useState<'schedule' | 'batch'>('schedule');

  const summaries = getWeeklyDaySummaries(weekPlan, multipliers, consumed, foodsById, mealsById);

  const weeklyAvgCost =
    summaries.reduce((acc, s) => acc + s.planned.costInr, 0) / summaries.length;
  const weeklyAvgProtein = Math.round(
    summaries.reduce((acc, s) => acc + s.planned.proteinG, 0) / summaries.length
  );
  const completedBatchCount = batchTasks.filter((t) => batchDone[t.id]).length;

  const slotsList: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];
  const allScheduledMeals = summaries.flatMap((row) =>
    slotsList.map((slot) => row.meals[slot]).filter((m): m is MealTemplate => Boolean(m))
  );
  const matchingSlotCount = allScheduledMeals.filter((m) =>
    matchesDifficultyFilter(m, difficultyFilter)
  ).length;
  const slotsAboveFilterCount =
    difficultyFilter === 'Easy' || difficultyFilter === 'Moderate'
      ? allScheduledMeals.filter(
          (m) => getMealDifficultyRank(getMealDifficulty(m)) > getMealDifficultyRank(difficultyFilter)
        ).length
      : 0;

  const sessions: Array<'Sunday Batch (75 min)' | 'Wednesday Refresh (45 min)'> = [
    'Sunday Batch (75 min)',
    'Wednesday Refresh (45 min)',
  ];

  const activeMobileSummary = summaries[mobileDayIdx] ?? summaries[0];

  return (
    <div className="space-y-5">
      {/* Screen Switcher — Jump cleanly between Next Week, This Week, and AI Local Plan */}
      <div
        role="tablist"
        aria-label="Weekly planner sections"
        className="grid grid-cols-3 p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'next_week'}
          onClick={() => onChangeSection('next_week')}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeSection === 'next_week'
              ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarPlus className="w-4 h-4 shrink-0" />
          <span className="truncate">Next Week</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'this_week'}
          onClick={() => onChangeSection('this_week')}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeSection === 'this_week'
              ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span className="truncate">This Week</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'ai'}
          onClick={() => onChangeSection('ai')}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeSection === 'ai'
              ? 'bg-white text-teal-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="truncate">AI Local Plan</span>
        </button>
      </div>

      {/* Screen 1: Next Week Meal Prep & Required Items */}
      {activeSection === 'next_week' && (
        <NextWeekPrepPanel
          nextWeekPlan={nextWeekPlan}
          multipliers={multipliers}
          locationId={locationId}
          householdServings={householdServings}
          pantryChecked={pantryChecked}
          nextWeekPrepDone={nextWeekPrepDone}
          foodsById={foodsById}
          mealsById={mealsById}
          onChangeHouseholdServings={onChangeHouseholdServings}
          onGenerateNextWeek={onGenerateNextWeek}
          onOpenSwapNextWeekMeal={onOpenSwapNextWeekMeal}
          onToggleNextWeekPrepTask={onToggleNextWeekPrepTask}
          onPromoteNextWeek={onPromoteNextWeek}
          onJumpToGrocery={onJumpToGrocery}
          onNotify={onNotify}
        />
      )}

      {/* Screen 2: This Week Meal Matrix & Batch Workflow */}
      {activeSection === 'this_week' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                {isAiPlanActive && savedAiPlan
                  ? `Active AI Regional Plan (${savedAiPlan.locationName}) · Two Batch Sessions`
                  : '7-Day Rotation · Two Batch Sessions · Zero Weekday Cooking Bottlenecks'}
              </p>
              <h2 className="font-display text-xl font-semibold text-slate-900 mt-0.5 text-balance">
                This Week Meal Matrix & Batch Workflow
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-slate-600">
              <span>Avg {weeklyAvgProtein}g Protein/day</span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span>Avg {formatCurrency(weeklyAvgCost, locationId)}/day</span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span>
                Batch {completedBatchCount}/{batchTasks.length}
              </span>
            </div>
          </div>

          {/* Mobile sub-screen toggle between Schedule and Batch Tasks */}
          <div
            role="tablist"
            aria-label="This week view mode"
            className="lg:hidden grid grid-cols-2 p-1 bg-white border border-slate-200 rounded-xl gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={thisWeekSubView === 'schedule'}
              onClick={() => setThisWeekSubView('schedule')}
              className={`py-2 min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${
                thisWeekSubView === 'schedule'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7-Day Schedule
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={thisWeekSubView === 'batch'}
              onClick={() => setThisWeekSubView('batch')}
              className={`py-2 min-h-[40px] text-xs font-semibold rounded-lg transition-colors ${
                thisWeekSubView === 'batch'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Batch Tasks ({completedBatchCount}/{batchTasks.length})
            </button>
          </div>

          {/* 7-Day Schedule Section */}
          <section
            aria-label="7-Day Meal Matrix"
            className={`${thisWeekSubView === 'schedule' ? 'block' : 'hidden lg:block'} bg-white border border-slate-200 rounded-xl overflow-hidden`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-slate-700">
                  Filter by prep difficulty
                </span>
                <div
                  role="group"
                  aria-label="Filter weekly meal matrix by difficulty"
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
                        className={`px-2.5 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
                {difficultyFilter !== 'all' && (
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {matchingSlotCount}/{allScheduledMeals.length} {difficultyFilter} meals
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(difficultyFilter === 'Easy' || difficultyFilter === 'Moderate') &&
                  slotsAboveFilterCount > 0 &&
                  onAdaptWeekDifficulty && (
                    <button
                      type="button"
                      onClick={() => onAdaptWeekDifficulty(difficultyFilter)}
                      className="px-3.5 py-2 min-h-[38px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {difficultyFilter === 'Easy'
                        ? 'Adapt Week to Easy'
                        : 'Adapt Week to <= Moderate'}
                    </button>
                  )}

                {(difficultyFilter === 'Easy' || difficultyFilter === 'Moderate') &&
                  slotsAboveFilterCount === 0 && (
                    <span className="text-xs font-medium text-teal-700">
                      {difficultyFilter === 'Easy'
                        ? 'All 28 meals are Easy'
                        : 'All 28 meals are Easy or Moderate'}
                    </span>
                  )}
              </div>
            </div>

            {/* Mobile Compact Day-by-Day Stepper (Zero Long Scroll) */}
            {activeMobileSummary && (
              <div className="lg:hidden p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    aria-label="Previous day"
                    onClick={() =>
                      setMobileDayIdx((i) => (i - 1 + DAYS_OF_WEEK.length) % DAYS_OF_WEEK.length)
                    }
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => onJumpToDay(activeMobileSummary.day)}
                      className="font-display text-sm font-semibold text-teal-700 hover:underline"
                    >
                      {activeMobileSummary.day} · Open in Tracker
                    </button>
                    <p className="text-[11px] font-mono tabular-nums text-slate-500">
                      {activeMobileSummary.planned.calories} kcal ·{' '}
                      {activeMobileSummary.planned.proteinG}g P ·{' '}
                      {formatCurrency(activeMobileSummary.planned.costInr, locationId)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Next day"
                    onClick={() => setMobileDayIdx((i) => (i + 1) % DAYS_OF_WEEK.length)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {MEAL_SLOTS.map((slotMeta) => {
                    const meal = activeMobileSummary.meals[slotMeta.id];
                    const difficulty = meal ? getMealDifficulty(meal) : 'Moderate';
                    const isMatch = meal
                      ? matchesDifficultyFilter(meal, difficultyFilter)
                      : false;
                    return (
                      <div
                        key={slotMeta.id}
                        className={`py-2.5 flex items-center justify-between gap-3 ${
                          difficultyFilter !== 'all' && !isMatch ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-slate-500 block">
                            {slotMeta.label} ·{' '}
                            <span className={DIFFICULTY_TEXT_STYLE[difficulty]}>{difficulty}</span> ·{' '}
                            {meal?.prepTimeMinutes ?? 15}m
                          </span>
                          <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                            {meal?.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenSwapModal(activeMobileSummary.day, slotMeta.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg shrink-0"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Swap</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setThisWeekSubView('batch')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl whitespace-nowrap"
                  >
                    <span>Next: Batch Prep Tasks</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Full 7-Day Matrix Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[920px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-3">Breakfast</th>
                    <th className="py-3 px-3">Lunch</th>
                    <th className="py-3 px-3">Pre-Training Snack</th>
                    <th className="py-3 px-3">Dinner</th>
                    <th className="py-3 px-3 text-right">Energy</th>
                    <th className="py-3 px-3 text-right">Protein</th>
                    <th className="py-3 px-3 text-right">Zinc</th>
                    <th className="py-3 px-3 text-right">Nitrates</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {summaries.map((row) => {
                    const underCap = row.planned.costInr <= targets.dailyBudgetInr;
                    return (
                      <tr key={row.day} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 align-top">
                          <button
                            type="button"
                            onClick={() => onJumpToDay(row.day)}
                            className="font-display font-semibold text-teal-700 hover:text-teal-900 underline-offset-2 hover:underline text-left"
                          >
                            {row.day}
                          </button>
                          <span className="block text-[11px] font-mono tabular-nums text-slate-400">
                            {row.consumedCount}/4 logged
                          </span>
                        </td>

                        {slotsList.map((slot) => {
                          const meal = row.meals[slot];
                          const difficulty = meal ? getMealDifficulty(meal) : 'Moderate';
                          const isMatch = meal
                            ? matchesDifficultyFilter(meal, difficultyFilter)
                            : false;

                          return (
                            <td
                              key={slot}
                              className={`py-3 px-3 align-top max-w-[195px] transition-opacity ${
                                difficultyFilter !== 'all' && !isMatch
                                  ? 'opacity-35 hover:opacity-100'
                                  : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => onOpenSwapModal(row.day, slot)}
                                title="Click to swap meal"
                                className="text-left group block w-full"
                              >
                                <span className="text-slate-800 group-hover:text-teal-700 transition-colors leading-snug line-clamp-2 block">
                                  {meal?.name}
                                </span>
                                {meal && (
                                  <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                                    <span className={DIFFICULTY_TEXT_STYLE[difficulty]}>
                                      {difficulty}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono tabular-nums">
                                      {meal.prepTimeMinutes}m
                                    </span>
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                          {row.planned.calories}
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-900 font-medium whitespace-nowrap">
                          {row.planned.proteinG}g
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {row.planned.zincMg}mg
                        </td>
                        <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {row.planned.nitratesMg}mg
                        </td>
                        <td
                          className={`py-3 px-4 align-top text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                            underCap ? 'text-teal-700' : 'text-amber-700'
                          }`}
                        >
                          {formatCurrency(row.planned.costInr, locationId)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Two-Session Batch Prep Checklists */}
          <section
            aria-label="Batch Prep Checklists"
            className={`${thisWeekSubView === 'batch' ? 'grid' : 'hidden lg:grid'} grid-cols-1 lg:grid-cols-2 gap-6`}
          >
            {sessions.map((sessionName) => {
              const tasks = batchTasks.filter((t) => t.session === sessionName);
              const sessionDone = tasks.filter((t) => batchDone[t.id]).length;

              return (
                <div key={sessionName} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-700" />
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        {sessionName}
                      </h3>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {sessionDone}/{tasks.length} complete
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 mt-1">
                    {tasks.map((task) => {
                      const checked = Boolean(batchDone[task.id]);
                      return (
                        <div key={task.id} className="py-3.5 flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => onToggleBatchTask(task.id)}
                            aria-pressed={checked}
                            aria-label={`Mark batch task "${task.title}" as ${checked ? 'incomplete' : 'complete'}`}
                            className={`mt-0.5 w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                              checked
                                ? 'bg-teal-700 border-teal-700 text-white'
                                : 'bg-white border-slate-300 text-slate-400 hover:border-teal-600'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 text-xs">
                              <span
                                className={`font-medium ${
                                  checked ? 'text-slate-400 line-through' : 'text-slate-900'
                                }`}
                              >
                                {task.title}
                              </span>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-slate-500">{task.storageNote}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{task.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}

      {/* Screen 3: AI Location-Based Meal Prep Planner */}
      {activeSection === 'ai' && (
        <AiLocalMealPlanner
          profile={profile}
          targets={targets}
          affiliateConfig={affiliateConfig}
          savedPlan={savedAiPlan}
          isAiPlanActive={isAiPlanActive}
          onPlanGenerated={onAiPlanGenerated}
          onApplyPlan={onApplyAiPlan}
          onRestoreCuratedPlan={onRestoreCuratedPlan}
        />
      )}
    </div>
  );
}
