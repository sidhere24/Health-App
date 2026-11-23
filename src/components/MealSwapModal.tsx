import { useEffect, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { MEAL_LIBRARY } from '../data/hyderabadMeals';
import { REGIONS } from '../data/regions';
import type {
  AllergenId,
  BiologicalSex,
  DayOfWeek,
  DietPreference,
  LocationId,
  MealDifficulty,
  MealSlot,
  MealTemplate,
  WholeFood,
} from '../types/nutrition';
import {
  ALLERGEN_OPTIONS,
  computeMealNutrition,
  formatCurrency,
  getInclusivePathwayLabel,
  getMealAllergens,
  getMealDifficulty,
  isMealCompatibleWithDiet,
  isMealSafeForAllergens,
  matchesDifficultyFilter,
  MEAL_DIFFICULTIES,
} from '../utils/nutrition';

interface MealSwapModalProps {
  isOpen: boolean;
  day: DayOfWeek;
  slot: MealSlot;
  currentMealId: string;
  portionMultiplier: number;
  locationId: LocationId;
  diet?: DietPreference;
  sex?: BiologicalSex;
  excludedAllergens?: AllergenId[];
  foodsById: Record<string, WholeFood>;
  mealLibrary?: MealTemplate[];
  onSelectMeal: (mealId: string) => void;
  onClose: () => void;
}

const SLOT_TITLES: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Pre-Training Snack',
  dinner: 'Dinner',
};

const DIFFICULTY_TEXT_STYLE: Record<MealDifficulty, string> = {
  Easy: 'text-teal-700 font-semibold',
  Moderate: 'text-amber-700 font-semibold',
  Pro: 'text-indigo-700 font-semibold',
};

export function MealSwapModal({
  isOpen,
  day,
  slot,
  currentMealId,
  portionMultiplier,
  locationId,
  diet = 'non-veg',
  sex = 'neutral',
  excludedAllergens = [],
  foodsById,
  mealLibrary = MEAL_LIBRARY,
  onSelectMeal,
  onClose,
}: MealSwapModalProps) {
  const [showAllDiets, setShowAllDiets] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<MealDifficulty | 'all'>('all');

  useEffect(() => {
    if (!isOpen) return;
    setShowAllDiets(false);
    setDifficultyFilter('all');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  const allergenLabelsById = Object.fromEntries(ALLERGEN_OPTIONS.map((o) => [o.id, o.label]));
  const allSlotMeals: MealTemplate[] = mealLibrary.filter((m) => m.slot === slot);
  const dietAlternatives: MealTemplate[] = showAllDiets
    ? allSlotMeals
    : allSlotMeals.filter(
        (m) =>
          (m.id.startsWith('ai_meal_') || isMealCompatibleWithDiet(m, diet)) &&
          isMealSafeForAllergens(m, excludedAllergens, foodsById)
      );
  const alternatives: MealTemplate[] = dietAlternatives.filter((m) =>
    matchesDifficultyFilter(m, difficultyFilter)
  );
  const currentMeal = allSlotMeals.find((m) => m.id === currentMealId);
  const currentStats = currentMeal
    ? computeMealNutrition(currentMeal, portionMultiplier, foodsById)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 gap-3">
          <div>
            <p className="text-xs text-slate-500">
              {day} · {SLOT_TITLES[slot]} · Portion {portionMultiplier}× · {region.shortLabel}
            </p>
            <h2 id="swap-modal-title" className="font-display text-base font-semibold text-slate-900">
              Swap Whole-Food Meal
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(diet !== 'non-veg' || excludedAllergens.length > 0) && (
              <button
                type="button"
                onClick={() => setShowAllDiets((prev) => !prev)}
                className="px-2.5 py-1.5 min-h-[34px] text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                {showAllDiets ? 'Apply diet & allergy filters' : 'Show all meals'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close swap meal dialog"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-200">
          <span className="text-xs text-slate-600 font-medium">
            Filter by prep difficulty ({alternatives.length} option{alternatives.length === 1 ? '' : 's'})
          </span>
          <div
            role="group"
            aria-label="Filter swap options by difficulty"
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
                  className={`px-2.5 py-1 min-h-[30px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
        </div>

        <div className="overflow-y-auto divide-y divide-slate-200">
          {alternatives.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-medium text-slate-800">
                No {difficultyFilter} {SLOT_TITLES[slot].toLowerCase()} options match the current filter.
              </p>
              <button
                type="button"
                onClick={() => setDifficultyFilter('all')}
                className="px-3.5 py-2 min-h-[38px] text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-lg transition-colors"
              >
                Show All Difficulties
              </button>
            </div>
          ) : (
            alternatives.map((meal) => {
              const stats = computeMealNutrition(meal, portionMultiplier, foodsById);
              const difficulty = getMealDifficulty(meal);
              const isCurrent = meal.id === currentMealId;
              const costDelta = currentStats
                ? Math.round((stats.costInr - currentStats.costInr) * 100) / 100
                : 0;
              const proteinDelta = currentStats
                ? Math.round((stats.proteinG - currentStats.proteinG) * 10) / 10
                : 0;

              return (
                <div
                  key={meal.id}
                  className={`p-5 transition-colors ${isCurrent ? 'bg-teal-50/50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        <span className={DIFFICULTY_TEXT_STYLE[difficulty]}>{difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{meal.prepTimeMinutes} min</span>
                        <span aria-hidden="true">·</span>
                        <span>{getInclusivePathwayLabel(meal.focusTag, sex)}</span>
                        {meal.batchFriendly && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Batch-friendly</span>
                          </>
                        )}
                        {getMealAllergens(meal, foodsById).length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-500">
                              {getMealAllergens(meal, foodsById)
                                .map((a) => allergenLabelsById[a] ?? a)
                                .join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-display text-sm sm:text-base font-semibold text-slate-900">
                        {meal.name}
                      </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{meal.hormonalBenefit}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-mono tabular-nums text-slate-700">
                      <span>{stats.calories} kcal</span>
                      <span>{stats.proteinG}g P</span>
                      <span>{stats.carbsG}g C</span>
                      <span>{stats.fatG}g F</span>
                      <span>Zn {stats.zincMg}mg</span>
                      <span>NO3 {stats.nitratesMg}mg</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(stats.costInr, locationId)}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    {!isCurrent && currentStats && (
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 text-right">
                        <span className={proteinDelta >= 0 ? 'text-teal-700' : 'text-amber-700'}>
                          {proteinDelta >= 0 ? `+${proteinDelta}` : proteinDelta}g P
                        </span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span className={costDelta <= 0 ? 'text-teal-700' : 'text-amber-700'}>
                          {costDelta >= 0
                            ? `+${formatCurrency(costDelta, locationId)}`
                            : `-${formatCurrency(Math.abs(costDelta), locationId)}`}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onSelectMeal(meal.id);
                        onClose();
                      }}
                      disabled={isCurrent}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-500 cursor-default'
                          : 'bg-teal-700 text-white hover:bg-teal-800'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <>
                          <span>Use Meal</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
}
