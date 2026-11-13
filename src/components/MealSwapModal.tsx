import { useEffect, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { MEAL_LIBRARY } from '../data/hyderabadMeals';
import { REGIONS } from '../data/regions';
import type {
  DayOfWeek,
  DietPreference,
  LocationId,
  MealSlot,
  MealTemplate,
  WholeFood,
} from '../types/nutrition';
import {
  computeMealNutrition,
  formatCurrency,
  isMealCompatibleWithDiet,
} from '../utils/nutrition';

interface MealSwapModalProps {
  isOpen: boolean;
  day: DayOfWeek;
  slot: MealSlot;
  currentMealId: string;
  portionMultiplier: number;
  locationId: LocationId;
  diet?: DietPreference;
  foodsById: Record<string, WholeFood>;
  onSelectMeal: (mealId: string) => void;
  onClose: () => void;
}

const SLOT_TITLES: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Pre-Training Snack',
  dinner: 'Dinner',
};

export function MealSwapModal({
  isOpen,
  day,
  slot,
  currentMealId,
  portionMultiplier,
  locationId,
  diet = 'non-veg',
  foodsById,
  onSelectMeal,
  onClose,
}: MealSwapModalProps) {
  const [showAllDiets, setShowAllDiets] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShowAllDiets(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const region = REGIONS[locationId] ?? REGIONS.hyderabad;
  const allSlotMeals: MealTemplate[] = MEAL_LIBRARY.filter((m) => m.slot === slot);
  const alternatives: MealTemplate[] = showAllDiets
    ? allSlotMeals
    : allSlotMeals.filter((m) => isMealCompatibleWithDiet(m, diet));
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
            {diet !== 'non-veg' && (
              <button
                type="button"
                onClick={() => setShowAllDiets((prev) => !prev)}
                className="px-2.5 py-1.5 min-h-[34px] text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                {showAllDiets ? `Filter: ${diet}` : 'Show all diets'}
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

        <div className="overflow-y-auto divide-y divide-slate-200">
          {alternatives.map((meal) => {
            const stats = computeMealNutrition(meal, portionMultiplier, foodsById);
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
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{meal.focusTag}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{meal.prepTimeMinutes} min</span>
                      {meal.batchFriendly && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Batch-friendly</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-sm font-semibold text-slate-900">
                      {meal.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{meal.hormonalBenefit}</p>

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
          })}
        </div>
      </div>
    </div>
  );
}
