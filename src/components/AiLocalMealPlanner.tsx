import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DAYS_OF_WEEK } from '../data/hyderabadMeals';
import { REGIONS } from '../data/regions';
import type {
  AffiliateLinkConfig,
  AiLocalMealPlan,
  MacroTargets,
  UserProfile,
} from '../types/nutrition';
import { getLocalFoodSuggestionsForRegion, materializeAiPlanToAppState } from '../utils/aiMealPlan';
import { buildIngredientPurchaseLink } from '../utils/links';
import { formatCurrency } from '../utils/nutrition';

interface AiLocalMealPlannerProps {
  profile: UserProfile;
  targets: MacroTargets;
  affiliateConfig: AffiliateLinkConfig;
  savedPlan: AiLocalMealPlan | null;
  isAiPlanActive: boolean;
  onPlanGenerated: (plan: AiLocalMealPlan) => void;
  onApplyPlan: (plan: AiLocalMealPlan) => void;
  onRestoreCuratedPlan: () => void;
}

export function AiLocalMealPlanner({
  profile,
  targets,
  affiliateConfig,
  savedPlan,
  isAiPlanActive,
  onPlanGenerated,
  onApplyPlan,
  onRestoreCuratedPlan,
}: AiLocalMealPlannerProps) {
  const region = REGIONS[profile.locationId] ?? REGIONS.hyderabad;
  const suggestions = getLocalFoodSuggestionsForRegion(profile.locationId);

  const [locationQuery, setLocationQuery] = useState(savedPlan?.locationName ?? region.label);
  const [locationEdited, setLocationEdited] = useState(Boolean(savedPlan));
  const [foodsInput, setFoodsInput] = useState(
    savedPlan?.availableFoodsUsed?.join(', ') ?? suggestions.slice(0, 4).join(', ')
  );
  const [kitchenNote, setKitchenNote] = useState('');
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [showAllStaples, setShowAllStaples] = useState(false);

  // Sync default location when user changes sidebar region unless they manually typed a custom city
  useEffect(() => {
    if (!locationEdited) {
      setLocationQuery(region.label);
      setFoodsInput(getLocalFoodSuggestionsForRegion(profile.locationId).slice(0, 4).join(', '));
    }
  }, [profile.locationId, region.label, locationEdited]);

  const parsedFoodsList = foodsInput
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const handleToggleSuggestion = (item: string) => {
    const lowerTarget = item.toLowerCase();
    const exists = parsedFoodsList.some((f) => f.toLowerCase() === lowerTarget);
    const next = exists
      ? parsedFoodsList.filter((f) => f.toLowerCase() !== lowerTarget)
      : [...parsedFoodsList, item];
    setFoodsInput(next.join(', '));
  };

  const handleDetectLocation = () => {
    setError(null);
    setStatusNote(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatusNote('Browser geolocation is unavailable here — type your city or neighborhood directly.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          if (resp.ok) {
            const data = (await resp.json()) as {
              address?: { city?: string; town?: string; suburb?: string; state?: string; country?: string };
            };
            const addr = data.address ?? {};
            const place = [addr.suburb, addr.city ?? addr.town, addr.state, addr.country]
              .filter(Boolean)
              .slice(0, 3)
              .join(', ');
            if (place) {
              setLocationQuery(place);
              setLocationEdited(true);
              setStatusNote(`Detected area: ${place}`);
              setLocating(false);
              return;
            }
          }
          const coordsLabel = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          setLocationQuery(coordsLabel);
          setLocationEdited(true);
          setStatusNote('Coordinates detected — feel free to replace with your city name.');
        } catch {
          setStatusNote('Could not look up city name automatically — type your city directly.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setStatusNote('Location permission was declined — enter your city or region manually.');
      },
      { timeout: 8000 }
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusNote(null);

    const trimmedLocation = locationQuery.trim();
    if (trimmedLocation.length < 2) {
      setError('Please enter your city, neighborhood, or region before generating a plan.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/local-meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationQuery: trimmedLocation,
          availableFoods: parsedFoodsList,
          kitchenNote: kitchenNote.trim() || undefined,
          locationId: profile.locationId,
          currencyCode: region.currencyCode,
          currencySymbol: region.currencySymbol,
          sex: profile.sex ?? 'neutral',
          age: profile.age,
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          goal: profile.goal,
          activity: profile.activity,
          diet: profile.diet ?? 'non-veg',
          excludedAllergens: profile.excludedAllergens ?? [],
          dailyBudget: profile.dailyBudgetInr,
          targets,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        plan?: AiLocalMealPlan;
        error?: string;
      };

      if (!response.ok || !payload.plan) {
        setError(
          payload.error ??
            `Unable to generate local meal plan (HTTP ${response.status}). Please try again.`
        );
        return;
      }

      onPlanGenerated(payload.plan);
      setStatusNote(
        `Generated 7-day plan for ${payload.plan.locationName} (${payload.plan.localFoods.length} local foods, ${payload.plan.meals.length} regional meals). Click "Apply to Active Plan" to load it into your tracker & grocery list.`
      );
    } catch {
      setError('Network error while contacting the AI planner. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const materializedPreview = savedPlan ? materializeAiPlanToAppState(savedPlan) : null;
  const previewMealsByKey = savedPlan
    ? Object.fromEntries(savedPlan.meals.map((m) => [m.key, m]))
    : {};
  const visibleStaples = materializedPreview
    ? showAllStaples
      ? materializedPreview.foods
      : materializedPreview.foods.slice(0, 6)
    : [];

  return (
    <section
      id="ai-local-planner"
      aria-label="AI Location-Based Meal Prep Planner"
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-teal-800">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>AI Regional Meal Prep Studio</span>
            </span>
            {isAiPlanActive && savedPlan && (
              <>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="text-teal-700 font-semibold">
                  Active: {savedPlan.locationName}
                </span>
              </>
            )}
          </div>
          <h3 className="font-display text-base font-semibold text-slate-900">
            Generate a 7-Day Prep Plan From Your Local Markets &amp; Foods
          </h3>
          <p className="text-xs text-slate-500">
            Adapts to any city or neighborhood using seasonal produce and proteins available near you,
            calibrated to{' '}
            <span className="font-mono tabular-nums text-slate-700">
              {targets.calories} kcal · {targets.proteinG}g P · {profile.diet ?? 'non-veg'}
              {profile.excludedAllergens && profile.excludedAllergens.length > 0
                ? ` · No ${profile.excludedAllergens.join('/')}`
                : ''}{' '}
              · {formatCurrency(profile.dailyBudgetInr, profile.locationId)}/day
            </span>
            .
          </p>
        </div>

        {isAiPlanActive && (
          <button
            type="button"
            onClick={onRestoreCuratedPlan}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap self-start lg:self-auto shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Curated Plan</span>
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="ai-location-input" className="text-xs font-medium text-slate-700">
                Your City, Town, or Neighborhood
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating || loading}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-900 disabled:opacity-50"
              >
                <LocateFixed className="w-3 h-3" />
                <span>{locating ? 'Locating…' : 'Use My Area'}</span>
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="ai-location-input"
                type="text"
                value={locationQuery}
                onChange={(e) => {
                  setLocationQuery(e.target.value);
                  setLocationEdited(true);
                }}
                placeholder="e.g., Vijayawada, Kochi, Pune, Austin TX, London"
                className="w-full pl-9 pr-3 py-2.5 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-kitchen-note" className="block text-xs font-medium text-slate-700">
              Kitchen Setup &amp; Cooking Preference (Optional)
            </label>
            <input
              id="ai-kitchen-note"
              type="text"
              value={kitchenNote}
              onChange={(e) => setKitchenNote(e.target.value)}
              placeholder="e.g., Pressure cooker + tawa, 20-min weekday limit, low spice"
              className="w-full px-3 py-2.5 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="ai-available-foods" className="block text-xs font-medium text-slate-700">
            Locally Available Foods &amp; Market Staples (Comma-Separated)
          </label>
          <input
            id="ai-available-foods"
            type="text"
            value={foodsInput}
            onChange={(e) => setFoodsInput(e.target.value)}
            placeholder="e.g., Fresh sardines, Gongura leaves, Ragi flour, Country eggs, Peanuts"
            className="w-full px-3 py-2.5 min-h-[42px] text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
          />

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-slate-500 mr-1">Quick add ({region.shortLabel}):</span>
            {suggestions.map((item) => {
              const selected = parsedFoodsList.some(
                (f) => f.toLowerCase() === item.toLowerCase()
              );
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleToggleSuggestion(item)}
                  aria-pressed={selected}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                    selected
                      ? 'bg-teal-50 border-teal-300 text-teal-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {selected ? `✓ ${item}` : `+ ${item}`}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="ai-planner-error"
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {statusNote && !error && (
          <div
            role="status"
            className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900"
          >
            <Check className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span>{statusNote}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500">
            Generates local food prices, 10–12 regional recipes, 7-day rotation, and Sunday/Wednesday
            batch checklists.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Local Plan…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{savedPlan ? 'Regenerate Local Prep Plan' : 'Generate Local Prep Plan'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Local Plan Preview */}
      {savedPlan && materializedPreview && (
        <div
          data-testid="ai-plan-preview"
          className="pt-4 border-t border-slate-200 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-display font-semibold text-slate-900">
                  {savedPlan.locationName} — AI Regional Prep Plan
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums text-slate-600">
                  {savedPlan.localFoods.length} local foods · {savedPlan.meals.length} recipes ·{' '}
                  {savedPlan.batchTasks.length} batch tasks
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{savedPlan.regionalOverview}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onApplyPlan(savedPlan);
                  setStatusNote(
                    `Applied ${savedPlan.locationName} plan to your Daily Tracker, Weekly Matrix, Batch Checklists, and Grocery List.`
                  );
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isAiPlanActive ? 'Re-Apply & Rescale Plan' : 'Apply to Active Plan'}</span>
              </button>
            </div>
          </div>

          {/* Local Staples Sourced + Affiliate Buy Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display text-xs font-semibold text-slate-900">
                Local Whole Foods Sourced for {savedPlan.locationName}
              </h4>
              {materializedPreview.foods.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllStaples((prev) => !prev)}
                  className="text-xs font-medium text-teal-700 hover:text-teal-900"
                >
                  {showAllStaples
                    ? 'Show fewer'
                    : `Show all ${materializedPreview.foods.length} foods`}
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-3">Local Food</th>
                    <th className="py-2.5 px-3">Where to Source</th>
                    <th className="py-2.5 px-3 text-right">Per 100g</th>
                    <th className="py-2.5 px-3 text-right">Est. Cost / 100g</th>
                    <th className="py-2.5 px-3 text-right">Store Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleStaples.map((food) => {
                    const link = buildIngredientPurchaseLink(food, affiliateConfig);
                    return (
                      <tr key={food.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 align-top">
                          <span className="font-medium text-slate-900">{food.name}</span>
                          <span className="block text-[11px] text-slate-500">{food.localName}</span>
                        </td>
                        <td className="py-2.5 px-3 align-top text-slate-600">
                          {food.hyderabadSourceNote}
                        </td>
                        <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {food.per100g.calories} kcal · {food.per100g.proteinG}g P
                        </td>
                        <td className="py-2.5 px-3 align-top text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                          {formatCurrency(food.pricePer100gInr, profile.locationId)}
                        </td>
                        <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            aria-label={`Buy ${food.name} on ${link.sourceLabel}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-900 underline-offset-2 hover:underline"
                          >
                            <span>Buy</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact 7-Day Rotation Preview */}
          <div className="space-y-2">
            <h4 className="font-display text-xs font-semibold text-slate-900">
              7-Day Regional Rotation Preview
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {DAYS_OF_WEEK.slice(0, 4).map((day) => {
                const sched = savedPlan.weekSchedule[day];
                return (
                  <div
                    key={day}
                    className="border border-slate-200 rounded-lg p-3 bg-white space-y-1.5 text-xs"
                  >
                    <div className="font-display font-semibold text-teal-800">{day}</div>
                    <p className="text-[11px] text-slate-700 truncate">
                      <span className="text-slate-400">BF:</span>{' '}
                      {previewMealsByKey[sched.breakfast]?.name}
                    </p>
                    <p className="text-[11px] text-slate-700 truncate">
                      <span className="text-slate-400">LN:</span>{' '}
                      {previewMealsByKey[sched.lunch]?.name}
                    </p>
                    <p className="text-[11px] text-slate-700 truncate">
                      <span className="text-slate-400">SN:</span>{' '}
                      {previewMealsByKey[sched.snack]?.name}
                    </p>
                    <p className="text-[11px] text-slate-700 truncate">
                      <span className="text-slate-400">DN:</span>{' '}
                      {previewMealsByKey[sched.dinner]?.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
