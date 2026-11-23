import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ChefHat, Clock, X } from 'lucide-react';
import type { DayOfWeek, MealSlot, MealTemplate, WholeFood } from '../types/nutrition';
import { computeMealNutrition, getMealDifficulty } from '../utils/nutrition';

interface CookModeModalProps {
  isOpen: boolean;
  day: DayOfWeek;
  slot: MealSlot;
  meal: MealTemplate;
  portionMultiplier: number;
  isConsumed: boolean;
  foodsById: Record<string, WholeFood>;
  onMarkConsumed: () => void;
  onClose: () => void;
}

const SLOT_TITLES: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Pre-Training Snack',
  dinner: 'Dinner',
};

export function CookModeModal({
  isOpen,
  day,
  slot,
  meal,
  portionMultiplier,
  isConsumed,
  foodsById,
  onMarkConsumed,
  onClose,
}: CookModeModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
    setCheckedIngredients({});
  }, [isOpen, meal.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const summary = computeMealNutrition(meal, portionMultiplier, foodsById);
  const difficulty = getMealDifficulty(meal);
  // Step 0 = Ingredient Mise-en-place Checklist, Steps 1..N = Prep Steps
  const totalSteps = 1 + meal.prepSteps.length;
  const isFinalStep = stepIndex === totalSteps - 1;
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  const handleFinish = () => {
    if (!isConsumed) {
      onMarkConsumed();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cook-mode-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Mobile grab affordance */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Compact Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <ChefHat className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="font-semibold text-slate-700">Cook Mode</span>
              <span aria-hidden="true">·</span>
              <span>
                {day} {SLOT_TITLES[slot]}
              </span>
              <span aria-hidden="true">·</span>
              <span>{difficulty}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Clock className="w-3 h-3" />
                {meal.prepTimeMinutes}m
              </span>
            </div>
            <h2
              id="cook-mode-title"
              className="font-display text-lg font-semibold text-slate-900 mt-1 leading-snug"
            >
              {meal.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cook mode"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Strip */}
        <div className="px-5 pt-3 pb-2 bg-slate-50/70 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              {stepIndex === 0
                ? 'Step 1: Gather & Weigh Ingredients'
                : `Step ${stepIndex + 1} of ${totalSteps}: Cooking Instruction`}
            </span>
            <span className="font-mono tabular-nums text-slate-600">
              {summary.calories} kcal · {summary.proteinG}g P ({portionMultiplier}×)
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-700 rounded-full transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Focused Single-Screen Step Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {stepIndex === 0 ? (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-500 mb-3">
                Tap each ingredient as you prep it on your counter ({portionMultiplier}× portion).
              </p>
              {meal.ingredients.map((ing) => {
                const food = foodsById[ing.foodId];
                const grams = Math.round(ing.grams * portionMultiplier);
                const checked = Boolean(checkedIngredients[ing.foodId]);
                return (
                  <button
                    key={ing.foodId}
                    type="button"
                    onClick={() =>
                      setCheckedIngredients((prev) => ({
                        ...prev,
                        [ing.foodId]: !prev[ing.foodId],
                      }))
                    }
                    className={`w-full text-left px-4 py-3 min-h-[52px] rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      checked
                        ? 'bg-teal-50/60 border-teal-200 text-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          checked
                            ? 'bg-teal-700 border-teal-700 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <span
                          className={`block text-sm font-medium ${
                            checked ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {food ? food.name : ing.foodId}
                        </span>
                        {ing.prepNote && (
                          <span className="block text-xs text-slate-500 truncate">
                            {ing.prepNote}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 shrink-0">
                      {grams}g
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="text-xs font-mono tabular-nums text-teal-700 font-semibold">
                Instruction {stepIndex} of {meal.prepSteps.length}
              </div>
              <p className="text-lg sm:text-xl font-medium text-slate-900 leading-relaxed">
                {meal.prepSteps[stepIndex - 1]}
              </p>
              {isFinalStep && (
                <div className="pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Why this meal works: </strong>
                  {meal.hormonalBenefit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thumb-Zone Bottom Controls */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[46px] text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl disabled:opacity-40 whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {!isFinalStep ? (
            <button
              type="button"
              onClick={() => setStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[46px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors whitespace-nowrap"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[46px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>{isConsumed ? 'Done Cooking' : 'Done & Mark Eaten'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
