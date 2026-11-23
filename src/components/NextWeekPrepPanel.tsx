import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
  Users,
} from 'lucide-react';
import { DAYS_OF_WEEK, MEAL_SLOTS } from '../data/hyderabadMeals';
import { REGIONS } from '../data/regions';
import type {
  DayOfWeek,
  LocationId,
  MealSlot,
  MealTemplate,
  NextWeekStrategy,
  PortionMultipliers,
  WeekPlan,
  WholeFood,
} from '../types/nutrition';
import { computeNextWeekPrepBrief, formatNextWeekPrepBriefText } from '../utils/nextWeek';
import { formatCurrency, getMealDifficulty, MEALS_BY_ID } from '../utils/nutrition';

interface NextWeekPrepPanelProps {
  nextWeekPlan: WeekPlan;
  multipliers: PortionMultipliers;
  locationId: LocationId;
  householdServings: number;
  pantryChecked: Record<string, boolean>;
  nextWeekPrepDone: Record<string, boolean>;
  foodsById: Record<string, WholeFood>;
  mealsById?: Record<string, MealTemplate>;
  onChangeHouseholdServings: (servings: number) => void;
  onGenerateNextWeek: (strategy: NextWeekStrategy) => void;
  onOpenSwapNextWeekMeal: (day: DayOfWeek, slot: MealSlot) => void;
  onToggleNextWeekPrepTask: (taskId: string) => void;
  onPromoteNextWeek: () => void;
  onJumpToGrocery: () => void;
  onNotify?: (message: string) => void;
}

type NextWeekSubView = 'menu' | 'items' | 'prep';

export function NextWeekPrepPanel({
  nextWeekPlan,
  multipliers,
  locationId,
  householdServings,
  pantryChecked,
  nextWeekPrepDone,
  foodsById,
  mealsById = MEALS_BY_ID,
  onChangeHouseholdServings,
  onGenerateNextWeek,
  onOpenSwapNextWeekMeal,
  onToggleNextWeekPrepTask,
  onPromoteNextWeek,
  onJumpToGrocery,
  onNotify,
}: NextWeekPrepPanelProps) {
  const [subView, setSubView] = useState<NextWeekSubView>('menu');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [itemFilter, setItemFilter] = useState<'to_buy' | 'all'>('to_buy');
  const [copied, setCopied] = useState(false);

  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  const servings = Math.max(1, Math.min(6, Math.round(householdServings || 1)));
  const activeDay = DAYS_OF_WEEK[selectedDayIdx] ?? 'Mon';

  const brief = useMemo(
    () =>
      computeNextWeekPrepBrief(
        nextWeekPlan,
        multipliers,
        pantryChecked,
        mealsById,
        foodsById,
        servings
      ),
    [nextWeekPlan, multipliers, pantryChecked, mealsById, foodsById, servings]
  );

  const handleCopyNextWeekBrief = async () => {
    const text = formatNextWeekPrepBriefText(brief, locationId, servings);
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok && typeof document !== 'undefined') {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      onNotify?.(`Copied next week items & Sunday prep checklist (${servings} ${servings === 1 ? 'person' : 'people'})`);
    } else {
      onNotify?.('Unable to copy automatically — switch to Grocery List to print or export CSV');
    }
  };

  const displayedItems =
    itemFilter === 'to_buy'
      ? brief.toBuyItems
      : [...brief.toBuyItems, ...brief.alreadyStockedItems];

  const completedPrepCount = brief.prepTasks.filter((t) => nextWeekPrepDone[t.id]).length;

  return (
    <section aria-label="Next Week Meal Prep and Required Items" className="space-y-4">
      {/* Compact Header & Strategy Actions */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">
              Upcoming 7-Day Plan · {servings} {servings === 1 ? 'person' : 'people'} ·{' '}
              {brief.sharedStaplesCount}/{brief.totalItemsCount} shared staples ({brief.ingredientReusePct}% low-waste reuse)
            </p>
            <h3 className="font-display text-lg sm:text-xl font-semibold text-slate-900 mt-0.5 text-balance">
              Next Week Meal Prep & Items Required
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onGenerateNextWeek('rotate')}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-700" />
              <span>Rotate Fresh Variety</span>
            </button>
            <button
              type="button"
              onClick={() => onGenerateNextWeek('easy')}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Quick & Easy</span>
            </button>
            <button
              type="button"
              onClick={onPromoteNextWeek}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Start Next Week Now</span>
            </button>
          </div>
        </div>

        {/* Focused 3-Screen Segmented Switcher (Zero Long Scroll!) */}
        <div
          role="tablist"
          aria-label="Next week prep sections"
          className="grid grid-cols-3 p-1 bg-slate-100 border border-slate-200/80 rounded-xl gap-1"
        >
          {[
            { id: 'menu' as const, label: 'Menu (7d)' },
            { id: 'items' as const, label: `Items (${brief.toBuyItems.length})` },
            { id: 'prep' as const, label: `Prep (${completedPrepCount}/${brief.prepTasks.length})` },
          ].map((tab) => {
            const active = subView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubView(tab.id)}
                className={`py-2 px-2 min-h-[40px] text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
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

      {/* Sub-Screen 1: Next Week Menu (Day-by-Day Stepper on Mobile, Clean Grid on Desktop) */}
      {subView === 'menu' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Mobile & Tablet Compact Day Stepper */}
          <div className="lg:hidden space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Previous day in next week"
                onClick={() =>
                  setSelectedDayIdx((prev) => (prev - 1 + DAYS_OF_WEEK.length) % DAYS_OF_WEEK.length)
                }
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 overflow-x-auto">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayIdx(idx)}
                    className={`px-2.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      idx === selectedDayIdx
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="Next day in next week"
                onClick={() => setSelectedDayIdx((prev) => (prev + 1) % DAYS_OF_WEEK.length)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
              {MEAL_SLOTS.map(({ id: slot, label, timeWindow }) => {
                const meal = mealsById[nextWeekPlan[activeDay][slot]];
                if (!meal) return null;
                return (
                  <div
                    key={slot}
                    className="p-3.5 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono tabular-nums">{timeWindow}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-teal-700 font-medium">
                          {getMealDifficulty(meal)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-0.5 leading-snug">
                        {meal.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenSwapNextWeekMeal(activeDay, slot)}
                      aria-label={`Swap next week ${activeDay} ${label}`}
                      className="inline-flex items-center gap-1 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg shrink-0 whitespace-nowrap"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Swap</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop 7-Day Matrix */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-3 w-16">Day</th>
                  <th className="py-2.5 px-3">Breakfast</th>
                  <th className="py-2.5 px-3">Lunch</th>
                  <th className="py-2.5 px-3">Snack</th>
                  <th className="py-2.5 px-3">Dinner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {DAYS_OF_WEEK.map((day) => (
                  <tr key={day} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{day}</td>
                    {(['breakfast', 'lunch', 'snack', 'dinner'] as MealSlot[]).map((slot) => {
                      const meal = mealsById[nextWeekPlan[day][slot]];
                      return (
                        <td key={slot} className="py-2.5 px-3 align-top">
                          <button
                            type="button"
                            onClick={() => onOpenSwapNextWeekMeal(day, slot)}
                            className="text-left group w-full"
                          >
                            <span className="block font-medium text-slate-900 group-hover:text-teal-700 leading-snug">
                              {meal ? meal.name : '—'}
                            </span>
                            {meal && (
                              <span className="block text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                                {getMealDifficulty(meal)} · {meal.prepTimeMinutes}m
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Jump to Next Screen CTA */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              Est. next week: {formatCurrency(brief.totalEstimatedCost, locationId)} total
            </span>
            <button
              type="button"
              onClick={() => setSubView('items')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors whitespace-nowrap"
            >
              <span>Next: Items Required ({brief.toBuyItems.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-Screen 2: Items Required for Next Week */}
      {subView === 'items' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="block text-xs text-slate-500">To Buy Next Week</span>
              <span className="font-mono tabular-nums text-lg font-semibold text-slate-900">
                {formatCurrency(brief.toBuyCost, locationId)}
              </span>
              <span className="block text-[11px] text-slate-500 font-mono tabular-nums">
                {brief.toBuyItems.length} items needed
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="block text-xs text-slate-500">Already Stocked</span>
              <span className="font-mono tabular-nums text-lg font-semibold text-teal-700">
                {brief.alreadyStockedItems.length}
              </span>
              <span className="block text-[11px] text-slate-500">From your pantry</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="block text-xs text-slate-500">Low-Waste Reuse</span>
              <span className="font-mono tabular-nums text-lg font-semibold text-slate-900">
                {brief.ingredientReusePct}%
              </span>
              <span className="block text-[11px] text-slate-500">
                {brief.sharedStaplesCount} staples in 3+ meals
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col justify-between">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Users className="w-3.5 h-3.5 text-teal-700" />
                <span>Servings</span>
              </span>
              <div className="inline-flex items-center justify-between bg-white border border-slate-200 rounded-lg p-0.5 mt-1">
                <button
                  type="button"
                  aria-label="Decrease next week servings"
                  disabled={servings <= 1}
                  onClick={() => onChangeHouseholdServings(Math.max(1, servings - 1))}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                  {servings}
                </span>
                <button
                  type="button"
                  aria-label="Increase next week servings"
                  disabled={servings >= 6}
                  onClick={() => onChangeHouseholdServings(Math.min(6, servings + 1))}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="group"
              aria-label="Filter next week items"
              className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg"
            >
              <button
                type="button"
                aria-pressed={itemFilter === 'to_buy'}
                onClick={() => setItemFilter('to_buy')}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md whitespace-nowrap ${
                  itemFilter === 'to_buy'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Need to Buy ({brief.toBuyItems.length})
              </button>
              <button
                type="button"
                aria-pressed={itemFilter === 'all'}
                onClick={() => setItemFilter('all')}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md whitespace-nowrap ${
                  itemFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Required ({brief.totalItemsCount})
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyNextWeekBrief}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Next Week List' : 'Copy Next Week List'}</span>
            </button>
          </div>

          {displayedItems.length === 0 ? (
            <p className="text-sm text-slate-600 py-4 text-center">
              All items for next week are already checked in your kitchen pantry.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl max-h-[360px] overflow-y-auto">
              {displayedItems.map((item) => {
                const isStocked = Boolean(pantryChecked[item.food.id]);
                return (
                  <div
                    key={item.food.id}
                    className="px-3.5 py-3 flex items-center justify-between gap-3 bg-white"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.food.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {region.marketChannelLabels[item.food.marketChannel]}
                        {isStocked ? ' · Already in pantry' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-xs font-mono tabular-nums font-semibold text-slate-900">
                        {item.practicalQuantityLabel}
                      </span>
                      <span className="block text-xs font-mono tabular-nums text-slate-500">
                        {formatCurrency(item.totalCostInr, locationId)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSubView('menu')}
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Menu</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('prep')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors whitespace-nowrap"
            >
              <span>Next: Sunday Prep ({brief.prepTasks.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-Screen 3: Automated Sunday Batch Prep Checklist */}
      {subView === 'prep' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Sunday Batch Prep Blueprint (Next Week)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-built from next week’s ingredients so weekday meals take under 10 minutes.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-teal-700 font-semibold whitespace-nowrap">
              {completedPrepCount}/{brief.prepTasks.length} done
            </span>
          </div>

          <div className="space-y-2.5">
            {brief.prepTasks.map((task) => {
              const done = Boolean(nextWeekPrepDone[task.id]);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onToggleNextWeekPrepTask(task.id)}
                  className={`w-full text-left p-3.5 min-h-[60px] rounded-xl border flex items-start gap-3 transition-colors ${
                    done
                      ? 'bg-teal-50/60 border-teal-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      done ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {done && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-medium ${
                          done ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                        ~{task.estimatedMinutes}m
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{task.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSubView('items')}
              className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Items</span>
            </button>
            <button
              type="button"
              onClick={onJumpToGrocery}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors whitespace-nowrap"
            >
              <ShoppingBasket className="w-4 h-4" />
              <span>Open Full Grocery Store List</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
